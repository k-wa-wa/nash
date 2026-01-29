package main

import (
	"crypto/rand"
	"embed"
	"encoding/base64"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"nash/internal/ai"
	"nash/internal/session"
	"nash/internal/ssh"
	"nash/internal/ws"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/skip2/go-qrcode"

	"github.com/gorilla/websocket"
)

//go:embed all:dist
var assets embed.FS

var (
	BuildTime  = "unknown"
	CommitHash = "unknown"
)

var configPath string

// Global session manager
var sessionManager *session.Manager

	CheckOrigin: func(r *http.Request) bool {
		return true // Allow CORS for dev, and local usage
	},
}

const (
	cookieName   = "nash-token"
	cookieMaxAge = 60 * 60 * 24 * 365 * 10 // 10 years
)

func getOrSetOwnerToken(w http.ResponseWriter, r *http.Request) string {
	c, err := r.Cookie(cookieName)
	if err == nil && c.Value != "" {
		return c.Value
	}

	// Generate new token
	// Or just generate here locally if session.GenerateID isn't exported?
	// session.generateID is unexported. Let's make it exported or duplicate.
	// We'll duplicate simple random string logic here to avoid changing session pkg too much unexpectedly.
	// Actually better to export session.GenerateID from session pkg?
	// Let's implement simple random here.
	b := make([]byte, 32)
	rand.Read(b)
	token = base64.URLEncoding.EncodeToString(b)

	http.SetCookie(w, &http.Cookie{
		Name:     cookieName,
		Value:    token,
		Path:     "/",
		MaxAge:   cookieMaxAge,
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
		Secure:   false, // Set true logic later, but for now follow handleResume logic
	})
	return token
}

func handleHosts(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Content-Type", "application/json")

	if r.Method == http.MethodOptions {
		return
	}

	hosts, err := ssh.ParseConfig(configPath)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	log.Printf("DEBUG: Serving %d hosts", len(hosts))
	for _, h := range hosts {
		log.Printf("DEBUG: Host: %+v", h)
	}
	// simple echo
	//nolint:errchkjson // simple echo
	_ = json.NewEncoder(w).Encode(hosts)
}

func handleSessions(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Content-Type", "application/json")

	if r.Method == http.MethodOptions {
		return
	}

	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	ownerToken := getOrSetOwnerToken(w, r)
	sessions := sessionManager.List(ownerToken)
	//nolint:errchkjson // simple response
	_ = json.NewEncoder(w).Encode(sessions)
}

func handleSummarize(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req ai.SummarizeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Text == "" {
		http.Error(w, "Empty text", http.StatusBadRequest)
		return
	}

	summary, err := ai.Summarize(r.Context(), req.Text)
	if err != nil {
		log.Printf("AI Summary Error: %v", err)
		http.Error(w, fmt.Sprintf("AI Summary Error: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	// simple response
	//nolint:errchkjson // simple response
	_ = json.NewEncoder(w).Encode(map[string]string{"summary": summary})
}

func handleInfo(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	info := map[string]string{
		"buildTime":  BuildTime,
		"commitHash": CommitHash,
	}
	//nolint:errchkjson // simple response
	_ = json.NewEncoder(w).Encode(info)
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Failed to upgrade connection: %v", err)
		return
	}
	defer conn.Close()

	// 1. Try to resume existing session
	sess := tryResumeSession(r)

	// 2. Identify user
	// Note: WS handshake cookies are in `r`
	token := getOrSetOwnerToken(w, r)

	// 2a. If resuming, verify ownership
	if sess != nil {
		if sess.OwnerToken != token {
			log.Printf("Security alert: Token mismatch for session %s (expected %s, got %s)", sess.ID, sess.OwnerToken, token)
			// Proceed to fail or just drop session ref to force re-auth?
			// If we return here, we might break the connection hard.
			// Let's drop `sess` so it forces a standard auth or error.
			sess = nil
			// But wait, if they have the ID but wrong token, they shouldn't be able to resume.
			// Currently `tryResumeSession` returns a session by ID.
			// We effectively blocked it by setting sess=nil.
		}
	}

	// 2b. If no session, authenticate and create one
	if sess == nil {
		var err error
		sess, err = createNewSession(conn, r, token)
		if err != nil {
			// Error is already logged/sent to client in createNewSession
			return
		}
	}

	// 3. Send Session ID for re-cookie
	msg := map[string]string{
		"type":      "SESSION_ID",
		"sessionId": sess.ID,
	}
	_ = conn.WriteJSON(msg)

	// Attach & Loop
	attachAndLoop(conn, sess)
}

func tryResumeSession(r *http.Request) *session.Session {
	cookie, err := r.Cookie("nash-session")
	if err == nil && cookie.Value != "" {
		if s, ok := sessionManager.Get(cookie.Value); ok {
			log.Printf("Resuming session: %s", s.ID)
			return s
		}
	}
	return nil
}

func createNewSession(conn *websocket.Conn, r *http.Request, ownerToken string) (*session.Session, error) {
	// Get connection params from Query
	query := r.URL.Query()
	host := query.Get("host")
	portStr := query.Get("port")
	user := query.Get("user")
	pass := query.Get("pass")
	identityFile := query.Get("identity_file")
	identityKey := query.Get("identity_key")

	log.Printf("DEBUG: WS Query params - host: '%s', port: '%s', user: '%s', identity_file: '%s'", host, portStr, user, identityFile)

	if host == "" || user == "" {
		_ = conn.WriteMessage(websocket.TextMessage, []byte("Error: Missing host or user parameters"))
		return nil, errors.New("missing params")
	}

	port, err := strconv.Atoi(portStr)
	if err != nil {
		port = 22
	}

	challengeHandler := makeChallengeHandler(conn)

	log.Printf("Connecting to %s@%s:%d", user, host, port)

	sshClient := ssh.NewClient(host, port, user, pass, identityFile, identityKey, challengeHandler)
	if err := sshClient.Connect(); err != nil {
		log.Printf("Failed to connect to SSH: %v", err)
		if strings.Contains(err.Error(), "unable to authenticate") ||
			strings.Contains(err.Error(), "handshake failed") ||
			strings.Contains(err.Error(), "unexpected message type 51") {
			_ = conn.WriteMessage(websocket.TextMessage, []byte("AUTH_REQUIRED"))
		} else {
			_ = conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("Error: Failed to connect to SSH: %v", err)))
		}
		return nil, err
	}

	sess := session.NewSession(sshClient, host, user, port, ownerToken)
	sessionManager.Add(sess)
	log.Printf("Created new session: %s", sess.ID)

	// Start background runner
	go func() {
		err := sess.Run()
		if err != nil {
			log.Printf("Session %s ended with error: %v", sess.ID, err)
		} else {
			log.Printf("Session %s ended normally", sess.ID)
		}
		sessionManager.Remove(sess.ID)
	}()

	return sess, nil
}

func makeChallengeHandler(conn *websocket.Conn) ssh.ChallengeHandler {
	type AuthMessage struct {
		Type    string          `json:"type"`
		Payload json.RawMessage `json:"payload"`
	}
	type ChallengePayload struct {
		Instruction string   `json:"instruction"`
		Questions   []string `json:"questions"`
		Echos       []bool   `json:"echos"`
	}
	type AuthResponsePayload struct {
		Answers []string `json:"answers"`
	}

	return func(instruction string, questions []string, echos []bool) ([]string, error) {
		payload := ChallengePayload{
			Instruction: instruction,
			Questions:   questions,
			Echos:       echos,
		}
		payloadBytes, _ := json.Marshal(payload)
		msg := AuthMessage{
			Type:    "AUTH_CHALLENGE",
			Payload: payloadBytes,
		}

		if err := conn.WriteJSON(msg); err != nil {
			return nil, err
		}

		// Wait for response, ignoring other message types (like resize or data)
		for {
			var res AuthMessage
			if err := conn.ReadJSON(&res); err != nil {
				return nil, err
			}

			if res.Type == "AUTH_RESPONSE" {
				var resPayload AuthResponsePayload
				if err := json.Unmarshal(res.Payload, &resPayload); err != nil {
					return nil, err
				}
				return resPayload.Answers, nil
			}

			// Ignore other message types during auth handshake
			log.Printf("DEBUG: Ignored message type during auth: %s", res.Type)
		}
	}
}

func attachAndLoop(conn *websocket.Conn, sess *session.Session) {
	// Attach WS to session output
	wsWriter := ws.NewWriter(conn)
	wsReader := ws.NewReader(conn)

	// Resize handler
	wsReader.SetResizeHandler(sess)

	sess.Attach(wsWriter)
	defer sess.Detach()

	// If session is new, we might want to fetch history?
	// Existing code:
	// Go routine to fetch history.
	go func() {
		history, err := sess.SSHClient.GetHistory()
		if err != nil {
			log.Printf("Failed to get history: %v", err)
		} else {
			msg := map[string]interface{}{
				"type":    "HISTORY_DATA",
				"payload": history,
			}
			_ = conn.WriteJSON(msg)
		}
	}()

	buffer := make([]byte, 1024)
	for {
		n, err := wsReader.Read(buffer)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WS error: %v", err)
			} else {
				log.Println("WS connection closed normally")
			}
			break
		}
		if n > 0 {
			_, wErr := sess.WriteInput(buffer[:n])
			if wErr != nil {
				log.Printf("Failed to write to session (closed?): %v", wErr)
				_ = conn.WriteMessage(websocket.TextMessage, []byte("\r\nSession closed.\r\n"))
				break
			}
		}
	}
}

func main() {
	flag.StringVar(&configPath, "config", "", "Path to additional SSH config file")
	flag.Parse()

	// Initialize Session Manager
	sessionManager = session.NewManager()

	// Serve static files from embedded FS
	// The dist folder is at "dist" inside the embed
	fsys, err := fs.Sub(assets, "dist")
	if err != nil {
		log.Fatal(err)
	}

	http.Handle("/", http.FileServer(http.FS(fsys)))
	http.HandleFunc("/api/hosts", handleHosts)
	http.HandleFunc("/api/sessions", handleSessions)
	http.HandleFunc("/api/summarize", handleSummarize)
	http.HandleFunc("/api/info", handleInfo)
	http.HandleFunc("/ws", handleWebSocket)

	port := 8080
	addr := fmt.Sprintf(":%d", port)

	// Find and print local IP
	localIP := getLocalIP()
	if localIP != "" {
		// If DEV_MODE is true, point QR code to Frontend Dev Server (5173)
		// Otherwise point to Backend (8080)
		targetPort := port
		if os.Getenv("DEV_MODE") == "true" {
			targetPort = 5173
		}
		url := "http://" + net.JoinHostPort(localIP, strconv.Itoa(targetPort))
		fmt.Printf("\nTarget URL: %s\n", url)

		// Generate QR code
		q, err := qrcode.New(url, qrcode.High)
		if err == nil {
			// Try to make it smaller
			fmt.Println(q.ToSmallString(false))
		}
	} else {
		fmt.Printf("Server starting on http://localhost:%d\n", port)
	}

	server := &http.Server{
		Addr:              addr,
		ReadHeaderTimeout: 3 * time.Second,
	}
	if err := server.ListenAndServe(); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}

func getLocalIP() string {
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return ""
	}
	for _, address := range addrs {
		if ipnet, ok := address.(*net.IPNet); ok && !ipnet.IP.IsLoopback() {
			if ipnet.IP.To4() != nil {
				return ipnet.IP.String()
			}
		}
	}
	return ""
}

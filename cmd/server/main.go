package main

import (
	"embed"
	"encoding/json"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"nash/internal/ai"
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

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow CORS for dev, and local usage
	},
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
	_ = json.NewEncoder(w).Encode(info)
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Failed to upgrade connection: %v", err)
		return
	}
	defer conn.Close()

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
		return
	}

	port, err := strconv.Atoi(portStr)
	if err != nil {
		port = 22
	}

	// Auth types
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

	challengeHandler := func(instruction string, questions []string, echos []bool) ([]string, error) {
		payload := ChallengePayload{
			Instruction: instruction,
			Questions:   questions,
			Echos:       echos,
		}
		payloadBytes, _ := json.Marshal(payload) //nolint:errchkjson // struct is safe
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
		return
	}
	defer sshClient.Close()

	// WebSocket Reader/Writer
	wsReader := ws.NewReader(conn)
	wsWriter := ws.NewWriter(conn)

	// Set Resize Handler
	wsReader.SetResizeHandler(sshClient)

	// Fetch History
	go func() {
		history, err := sshClient.GetHistory()
		if err != nil {
			log.Printf("Failed to get history: %v", err)
		} else {
			// Send history to frontend
			msg := map[string]interface{}{
				"type":    "HISTORY_DATA",
				"payload": history,
			}
			if err := conn.WriteJSON(msg); err != nil {
				log.Printf("Failed to send history: %v", err)
			}
		}
	}()

	// Start Shell
	log.Println("Starting Shell...")
	errChan := make(chan error, 1)
	go func() {
		err := sshClient.StartShell(wsReader, wsWriter, wsWriter)
		log.Printf("StartShell returned: %v", err)
		errChan <- err
	}()

	select {
	case err := <-errChan:
		if err != nil {
			log.Printf("SSH session ended with error: %v", err)
			_ = conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("\r\nSSH session ended with error: %v", err)))
		} else {
			log.Println("SSH session ended normally")
			_ = conn.WriteMessage(websocket.TextMessage, []byte("\r\nSSH session ended normally\r\n"))
		}
	case <-time.After(60 * time.Minute): // Timeout 1 hour
		log.Println("SSH session timed out.")
		_ = conn.WriteMessage(websocket.TextMessage, []byte("\r\nSSH session timed out."))
	}
}

func main() {
	flag.StringVar(&configPath, "config", "", "Path to additional SSH config file")
	flag.Parse()

	// Serve static files from embedded FS
	// The dist folder is at "dist" inside the embed
	fsys, err := fs.Sub(assets, "dist")
	if err != nil {
		log.Fatal(err)
	}

	http.Handle("/", http.FileServer(http.FS(fsys)))
	http.HandleFunc("/api/hosts", handleHosts)
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

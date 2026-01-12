package main

import (
	"embed"
	"encoding/json"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/skip2/go-qrcode"

	"nash/internal/ssh"
	"nash/internal/ws"

	"github.com/gorilla/websocket"
)

//go:embed all:dist
var assets embed.FS

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
	w.Header().Set("Content-Type", "application/json")

	hosts, err := ssh.ParseConfig(configPath)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	log.Printf("DEBUG: Serving %d hosts", len(hosts))
	for _, h := range hosts {
		log.Printf("DEBUG: Host: %+v", h)
	}
	json.NewEncoder(w).Encode(hosts)
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

	log.Printf("DEBUG: WS Query params - host: '%s', port: '%s', user: '%s', identity_file: '%s'", host, portStr, user, identityFile)

	if host == "" || user == "" {
		conn.WriteMessage(websocket.TextMessage, []byte("Error: Missing host or user parameters"))
		return
	}

	port, err := strconv.Atoi(portStr)
	if err != nil {
		port = 22
	}

	log.Printf("Connecting to %s@%s:%d", user, host, port)

	sshClient := ssh.NewClient(host, port, user, pass, identityFile)
	if err := sshClient.Connect(); err != nil {
		log.Printf("Failed to connect to SSH: %v", err)
		if strings.Contains(err.Error(), "unable to authenticate") {
			conn.WriteMessage(websocket.TextMessage, []byte("AUTH_REQUIRED"))
		} else {
			conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("Error: Failed to connect to SSH: %v", err)))
		}
		return
	}
	defer sshClient.Close()

	// WebSocket Reader/Writer
	wsReader := ws.NewReader(conn)
	wsWriter := ws.NewWriter(conn)

	// Set Resize Handler
	wsReader.SetResizeHandler(sshClient)

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
			conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("\r\nSSH session ended with error: %v", err)))
		} else {
			log.Println("SSH session ended normally")
			conn.WriteMessage(websocket.TextMessage, []byte("\r\nSSH session ended normally\r\n"))
		}
	case <-time.After(60 * time.Minute): // Timeout 1 hour
		log.Println("SSH session timed out.")
		conn.WriteMessage(websocket.TextMessage, []byte("\r\nSSH session timed out."))
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
		url := fmt.Sprintf("http://%s:%d", localIP, targetPort)
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

	if err := http.ListenAndServe(addr, nil); err != nil {
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

package e2e

import (
	"fmt"
	"net/url"
	"os"
	"os/exec"
	"testing"
	"time"

	"strings"

	"github.com/gorilla/websocket"
)

var (
	nashCmd *exec.Cmd
)

func TestMain(m *testing.M) {
	// 1. Start Docker Compose
	// Ensure keys are generated (pre-check or just assume task done)
	// Build keys if not exists? we assumed run_command beforehand.

	fmt.Println("Starting Docker Compose...")
	cmd := exec.Command("docker", "compose", "up", "-d", "--build")
	cmd.Dir = "."
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		fmt.Printf("Failed to start docker-compose: %v\n", err)
		os.Exit(1)
	}

	// Teardown function
	teardown := func() {
		if nashCmd != nil && nashCmd.Process != nil {
			nashCmd.Process.Kill()
		}
		exec.Command("docker", "compose", "down").Run()
	}
	defer teardown()

	// Wait for SSH server
	fmt.Println("Waiting for SSH server...")
	time.Sleep(10 * time.Second)

	// 2. Build and Start Nash
	rootPath := "../"
	// Build first to ensure latest binary? 'go run' is easier but 'exec ./nash' tests binary
	// Let's assume binary exists or build it?
	// The original test assumed ./nash exists.
	// Let's build it to be safe.
	buildCmd := exec.Command("go", "build", "-o", "nash", "./cmd/server")
	buildCmd.Dir = rootPath
	if output, err := buildCmd.CombinedOutput(); err != nil {
		fmt.Printf("Failed to build nash: %v\n%s\n", err, output)
		teardown()
		os.Exit(1)
	}

	nashCmd = exec.Command("./nash")
	nashCmd.Dir = rootPath
	nashCmd.Stdout = os.Stdout // Enable logs for debugging
	nashCmd.Stderr = os.Stderr
	if err := nashCmd.Start(); err != nil {
		fmt.Printf("Failed to start nash: %v\n", err)
		teardown()
		os.Exit(1)
	}

	fmt.Println("Waiting for Nash to start...")
	time.Sleep(2 * time.Second)

	// Run Tests
	code := m.Run()

	teardown()
	os.Exit(code)
}

func waitForPrompt(t *testing.T, conn *websocket.Conn) {
	conn.SetReadDeadline(time.Now().Add(5 * time.Second))
	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			t.Fatalf("Read error while waiting for prompt: %v", err)
		}
		// t.Logf("Received: %s", string(msg))
		if strings.Contains(string(msg), "~$") || strings.Contains(string(msg), "#") {
			break
		}
	}
}

func sendCommandAndVerify(t *testing.T, conn *websocket.Conn, cmd, expectedOutput string) {
	if err := conn.WriteMessage(websocket.TextMessage, []byte(cmd+"\n")); err != nil {
		t.Fatalf("Write error: %v", err)
	}

	found := false
	timeout := time.After(5 * time.Second)
	conn.SetReadDeadline(time.Now().Add(5 * time.Second))

loop:
	for {
		select {
		case <-timeout:
			t.Fatal("Timeout waiting for response")
		default:
			_, msg, err := conn.ReadMessage()
			if err != nil {
				// retry or fail? ReadMessage blocks/errors on deadline
				// If deadline exceeded, we brake loop
				break loop
			}
			output := string(msg)
			// t.Logf("Output: %q", output)
			if strings.Contains(output, expectedOutput) {
				found = true
				break loop
			}
		}
	}

	if !found {
		t.Fatalf("Did not find expected output '%s'", expectedOutput)
	}
}

func dialWebSocket(t *testing.T, user, password, identityFile string) *websocket.Conn {
	u := url.URL{Scheme: "ws", Host: "localhost:8080", Path: "/ws"}
	q := u.Query()
	q.Set("host", "localhost")
	q.Set("port", "2222") // Docker mapped port
	q.Set("user", user)
	if password != "" {
		q.Set("pass", password)
	}
	if identityFile != "" {
		q.Set("identity_file", identityFile)
	}
	u.RawQuery = q.Encode()

	t.Logf("Connecting to %s", u.String())

	conn, _, err := websocket.DefaultDialer.Dial(u.String(), nil)
	if err != nil {
		t.Fatalf("WebSocket connection failed: %v", err)
	}
	return conn
}

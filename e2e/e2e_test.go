package e2e

import (
	"net/url"
	"os"
	"os/exec"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
)

func TestE2E(t *testing.T) {
	// 1. Start Docker Compose
	cmd := exec.Command("docker", "compose", "up", "-d", "--build")
	cmd.Dir = "."
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		t.Fatalf("Failed to start docker-compose: %v", err)
	}
	defer func() {
		exec.Command("docker", "compose", "down").Run()
	}()

	// Wait for SSH server to be ready
	t.Log("Waiting for SSH server...")
	time.Sleep(10 * time.Second) // Simple wait

	// 2. Build and Start Nash
	// We assume nash binary is built in root
	rootPath := "../"
	nashCmd := exec.Command("./nash")
	nashCmd.Dir = rootPath
	if err := nashCmd.Start(); err != nil {
		t.Fatalf("Failed to start nash: %v", err)
	}
	defer func() {
		nashCmd.Process.Kill()
	}()

	t.Log("Waiting for Nash to start...")
	time.Sleep(2 * time.Second)

	// 3. Connect via WebSocket
	// Docker maps 2222 -> 22
	// Nash connects to localhost:2222
	u := url.URL{Scheme: "ws", Host: "localhost:8080", Path: "/ws"}
	q := u.Query()
	q.Set("host", "localhost")
	q.Set("port", "2222")
	q.Set("user", "testuser")
	q.Set("pass", "testpass")
	u.RawQuery = q.Encode()

	t.Logf("Connecting to %s", u.String())

	conn, _, err := websocket.DefaultDialer.Dial(u.String(), nil)
	if err != nil {
		t.Fatalf("WebSocket connection failed: %v", err)
	}
	defer conn.Close()

	// 4. Verify Interaction
	// Read initial output
	conn.SetReadDeadline(time.Now().Add(5 * time.Second))
	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			t.Fatalf("Read error: %v", err)
		}
		t.Logf("Received: %s", string(msg))
		if string(msg) == "\r\nConnected to server...\r\n" {
			break
		}
	}

	// Send command
	cmdStr := "echo hello_nash\n"
	if err := conn.WriteMessage(websocket.TextMessage, []byte(cmdStr)); err != nil {
		t.Fatalf("Write error: %v", err)
	}

	// Read response
	found := false
	timeout := time.After(5 * time.Second)
loop:
	for {
		select {
		case <-timeout:
			t.Fatal("Timeout waiting for response")
		default:
			_, msg, err := conn.ReadMessage()
			if err != nil {
				// might be timeout
				continue
			}
			output := string(msg)
			t.Logf("Output: %q", output)
			if contains(output, "hello_nash") {
				found = true
				break loop
			}
		}
	}

	if !found {
		t.Fatal("Did not find expected output 'hello_nash'")
	}
}

func contains(s, substr string) bool {
	return strings.Contains(s, substr)
}

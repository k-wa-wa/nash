package e2e

import (
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/gorilla/websocket"
)

func TestRepeatedInvalidConnections(t *testing.T) {
	serverURL := "ws://localhost:8080/ws" // Missing params

	for i := 0; i < 5; i++ {
		t.Logf("Attempt %d", i)
		dialer := websocket.Dialer{
			HandshakeTimeout: 5 * time.Second,
		}
		conn, _, err := dialer.Dial(serverURL, nil)
		if err != nil {
			t.Fatalf("Failed to dial on attempt %d: %v", i, err)
		}

		// Expect error message
		_, msg, err := conn.ReadMessage()
		if err != nil {
			t.Logf("Read error on attempt %d (expected close?): %v", i, err)
		} else {
			t.Logf("Received: %s", string(msg))
			if !strings.Contains(string(msg), "Error: Missing") {
				t.Errorf("Unexpected message: %s", string(msg))
			}
		}
		conn.Close()
		time.Sleep(100 * time.Millisecond)
	}
}

func TestConcurrentValidConnections(t *testing.T) {
	// This assumes the e2e-sshd container is running and exposed on 2222
	// AND the nash server is running on 8080
	serverURL := "ws://localhost:8080/ws?host=localhost&port=2222&user=testuser&pass=testpass"

	var wg sync.WaitGroup
	count := 5
	wg.Add(count)

	for i := 0; i < count; i++ {
		go func(id int) {
			defer wg.Done()
			dialer := websocket.Dialer{
				HandshakeTimeout: 5 * time.Second,
			}
			conn, _, err := dialer.Dial(serverURL, nil)
			if err != nil {
				t.Errorf("Client %d failed to dial: %v", id, err)
				return
			}
			defer conn.Close()

			// Read hello
			conn.SetReadDeadline(time.Now().Add(5 * time.Second))
			_, msg, err := conn.ReadMessage()
			if err != nil {
				t.Errorf("Client %d failed read: %v", id, err)
				return
			}
			t.Logf("Client %d got: %s", id, string(msg))
		}(i)
	}
	wg.Wait()
}

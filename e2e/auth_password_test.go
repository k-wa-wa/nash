package e2e

import (
	"testing"
	"time"
)

func TestAuthPassword_Success(t *testing.T) {
	conn := dialWebSocket(t, "testuser", "password", "")
	defer conn.Close()

	waitForPrompt(t, conn)
	sendCommandAndVerify(t, conn, "echo hello_pass", "hello_pass")
}

func TestAuthPassword_Required(t *testing.T) {
	conn := dialWebSocket(t, "testuser", "", "") // No password
	defer conn.Close()

	// Expect AUTH_REQUIRED
	conn.SetReadDeadline(time.Now().Add(5 * time.Second))
	foundAuthReq := false
	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			t.Logf("Read Loop ended: %v", err)
			break
		}
		if string(msg) == "AUTH_REQUIRED" {
			foundAuthReq = true
			break
		}
	}

	if !foundAuthReq {
		t.Fatal("Did not receive AUTH_REQUIRED message")
	}
}

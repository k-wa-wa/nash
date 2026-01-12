package e2e

import (
	"os"
	"path/filepath"
	"testing"
)

func TestAuthKey_Success(t *testing.T) {
	// e2e/keys/id_rsa should exist
	pwd, _ := os.Getwd()
	keyPath := filepath.Join(pwd, "keys", "id_rsa")

	// Ensure permissions are strict (SSH often requires strict permissions on key files)
	// Although here we are passing path to Go SSHlib, it might check? Go SSH lib treats file as just data usually.

	conn := dialWebSocket(t, "keyuser", "", keyPath)
	defer conn.Close()

	waitForPrompt(t, conn)
	sendCommandAndVerify(t, conn, "echo hello_key", "hello_key")
}

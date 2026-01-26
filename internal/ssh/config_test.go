package ssh

import (
	"os"
	"path/filepath"
	"reflect"
	"testing"
)

func TestParseConfig(t *testing.T) {
	// Create a temporary directory for the test config
	tmpDir, err := os.MkdirTemp("", "nash_ssh_test")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	configPath := filepath.Join(tmpDir, "config")
	content := `
Host example
    HostName example.com
    User testuser
    Port 2222
    IdentityFile ~/.ssh/id_rsa

Host keyonly
    HostName 192.168.1.100
    IdentityFile /path/to/key

Host wildcard*
    HostName wildcard.com
`
	if err := os.WriteFile(configPath, []byte(content), 0644); err != nil {
		t.Fatalf("Failed to write config file: %v", err)
	}

	// Mock user home for ~ expansion test if needed,
	// but currently ParseConfig uses os.UserHomeDir directly.
	// For the test, we can check if it replaces "~/" with *something*.
	// Or we can just check if IdentityFile is populated.

	hosts, err := ParseConfig(configPath)
	if err != nil {
		t.Fatalf("ParseConfig failed: %v", err)
	}

	expectedCount := 2 // "wildcard*" should be skipped by logic
	if len(hosts) != expectedCount {
		t.Errorf("Expected %d hosts, got %d", expectedCount, len(hosts))
	}

	// Verify 'example' host
	var exampleHost *HostEntry
	for i := range hosts {
		if hosts[i].Host == "example" {
			exampleHost = &hosts[i]
			break
		}
	}

	if exampleHost == nil {
		t.Fatal("Host 'example' not found")
	}

	if exampleHost.HostName != "example.com" {
		t.Errorf("Expected HostName example.com, got %s", exampleHost.HostName)
	}
	if exampleHost.User != "testuser" {
		t.Errorf("Expected User testuser, got %s", exampleHost.User)
	}
	if exampleHost.Port != "2222" {
		t.Errorf("Expected Port 2222, got %s", exampleHost.Port)
	}
	// Check IdentityFile ~ expansion
	// Since we can't easily mock UserHomeDir without injection,
	// we just check it is NOT "~/.ssh/id_rsa" anymore (it should be absolute path)
	if exampleHost.IdentityFile == "~/.ssh/id_rsa" {
		t.Error("IdentityFile was not expanded")
	}
	if exampleHost.IdentityFile == "" {
		t.Error("IdentityFile is empty")
	}

	// Verify 'keyonly' host
	var keyonlyHost *HostEntry
	for i := range hosts {
		if hosts[i].Host == "keyonly" {
			keyonlyHost = &hosts[i]
			break
		}
	}
	if keyonlyHost == nil {
		t.Fatal("Host 'keyonly' not found")
	}
	if keyonlyHost.IdentityFile != "/path/to/key" {
		t.Errorf("Expected IdentityFile /path/to/key, got %s", keyonlyHost.IdentityFile)
	}
}

func TestParseConfig_NoFile(t *testing.T) {
	hosts, err := ParseConfig("/non/existent/path/config")
	if err != nil {
		t.Fatalf("ParseConfig should not error on missing file: %v", err)
	}
	if len(hosts) != 0 {
		t.Errorf("Expected 0 hosts, got %d", len(hosts))
	}
	if hosts == nil {
		t.Error("Expected empty slice, got nil")
	}
}

func TestParseConfig_EmptyContent(t *testing.T) {
	// Create a temporary directory for the test config
	tmpDir, err := os.MkdirTemp("", "nash_ssh_test_empty")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	configPath := filepath.Join(tmpDir, "config")
	// Write empty content (or just comments)
	if err := os.WriteFile(configPath, []byte("# Just a comment"), 0644); err != nil {
		t.Fatalf("Failed to write config file: %v", err)
	}

	hosts, err := ParseConfig(configPath)
	if err != nil {
		t.Fatalf("ParseConfig failed: %v", err)
	}

	if len(hosts) != 0 {
		t.Errorf("Expected 0 hosts, got %d", len(hosts))
	}
	if hosts == nil {
		t.Error("Expected empty slice, got nil")
	}
}

func TestHostEntry_JSON(t *testing.T) {
	// Verify struct tags just in case
	entry := HostEntry{
		Host:         "alias",
		HostName:     "real.host",
		IdentityFile: "/tmp/key",
	}

	// Just a compile-time check that fields exist is implicitly done by assignment above.
	// Runtime check via reflect.
	val := reflect.ValueOf(entry)
	typ := val.Type()

	field, ok := typ.FieldByName("IdentityFile")
	if !ok {
		t.Fatal("IdentityFile field missing")
	}
	if tag := field.Tag.Get("json"); tag != "IdentityFile,omitempty" {
		t.Errorf("Expected json tag 'IdentityFile,omitempty', got '%s'", tag)
	}
}

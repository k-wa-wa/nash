package session

import (
	"bytes"
	"testing"
	"time"
)

func TestManager(t *testing.T) {
	m := NewManager()

	// Mock session (without SSH client for simplicity in this test, or use dummy)
	// Since NewSession requires *ssh.Client, we'll manually create struct or mock.
	// We'll stick to Manager logic test which relies on ID.
	
	s := &Session{
		ID:         "sess-1",
		CreatedAt:  time.Now(),
		LastActive: time.Now(),
		output:     &SwitchableWriter{},
	}

	m.Add(s)

	got, ok := m.Get("sess-1")
	if !ok {
		t.Errorf("Get failed")
	}
	if got != s {
		t.Errorf("Got wrong session")
	}

	m.Remove("sess-1")
	_, ok = m.Get("sess-1")
	if ok {
		t.Errorf("Remove failed, session still exists")
	}
}

func TestSwitchableWriter(t *testing.T) {
	sw := &SwitchableWriter{}

	// Case 1: No target
	n, err := sw.Write([]byte("hello"))
	if err != nil {
		t.Errorf("Write error on nil target: %v", err)
	}
	if n != 5 {
		t.Errorf("Write short count on nil target: %d", n)
	}

	// Case 2: With target
	buf := new(bytes.Buffer)
	sw.SetTarget(buf)

	n, err = sw.Write([]byte("world"))
	if err != nil {
		t.Errorf("Write error: %v", err)
	}
	if n != 5 {
		t.Errorf("Write short count: %d", n)
	}
	if buf.String() != "world" {
		t.Errorf("Result mismatch: %s", buf.String())
	}

	// Case 3: Switch/Detach
	sw.SetTarget(nil)
	sw.Write([]byte("ignore"))
	if buf.String() != "world" {
		t.Errorf("Buffer should not change after detach")
	}
}

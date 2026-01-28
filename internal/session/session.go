package session

import (
	"crypto/rand"
	"encoding/base64"
	"io"
	"log"
	"nash/internal/ssh"
	"sync"
	"time"
)

// SwitchableWriter implements io.Writer and allows hot-swapping the target writer.
// Thread-safe.
type SwitchableWriter struct {
	mu     sync.Mutex
	target io.Writer
}

func (w *SwitchableWriter) Write(p []byte) (n int, err error) {
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.target != nil {
		return w.target.Write(p)
	}
	// If no target, we drop the output but return success to avoid breaking the helper
	return len(p), nil
}

// SetTarget updates the underlying writer. Pass nil to detach.
func (w *SwitchableWriter) SetTarget(t io.Writer) {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.target = t
}

// Session represents a persistent SSH session.
type Session struct {
	ID         string
	SSHClient  *ssh.Client
	CreatedAt  time.Time
	LastActive time.Time
	mu         sync.Mutex

	stdinPw *io.PipeWriter
	output  *SwitchableWriter

	doneCh chan struct{}
	closed bool
}

// NewSession creates a new session (generating ID) but does not start it yet.
func NewSession(client *ssh.Client) *Session {
	id := generateID()
	return &Session{
		ID:         id,
		SSHClient:  client,
		output:     &SwitchableWriter{},
		doneCh:     make(chan struct{}),
		CreatedAt:  time.Now(),
		LastActive: time.Now(),
	}
}

// Run starts the SSH shell. This blocks until the shell exits.
// It should be run in a goroutine.
func (s *Session) Run() error {
	defer close(s.doneCh)
	r, w := io.Pipe()
	s.mu.Lock()
	s.stdinPw = w
	s.mu.Unlock()

	// SSHClient.StartShell blocks until session ends
	err := s.SSHClient.StartShell(r, s.output, s.output)

	s.Close()
	return err
}

// Wait blocks until the session ends.
func (s *Session) Wait() {
	<-s.doneCh
}

// WriteInput writes data to the SSH stdin.
func (s *Session) WriteInput(p []byte) (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.LastActive = time.Now()
	if s.closed || s.stdinPw == nil {
		return 0, io.ErrClosedPipe
	}
	return s.stdinPw.Write(p)
}

// Attach connects a writer (e.g. websocket) to the session output.
func (s *Session) Attach(w io.Writer) {
	s.output.SetTarget(w)
	s.UpdateActivity()
}

// Detach disconnects the current output writer.
func (s *Session) Detach() {
	s.output.SetTarget(nil)
}

// UpdateActivity updates the LastActive timestamp.
func (s *Session) UpdateActivity() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.LastActive = time.Now()
}

// Resize handles window resize events
func (s *Session) Resize(rows, cols int) {
	s.SSHClient.Resize(rows, cols)
	s.UpdateActivity()
}

// Close terminates the session and SSH connection.
func (s *Session) Close() {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.closed {
		return
	}
	s.closed = true
	if s.stdinPw != nil {
		_ = s.stdinPw.Close()
	}
	// Close actual SSH client
	if s.SSHClient != nil {
		s.SSHClient.Close()
	}
	log.Printf("Session %s closed", s.ID)
}

// IsClosed checks if session is closed
func (s *Session) IsClosed() bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.closed
}

// Manager manages active sessions.
type Manager struct {
	mu       sync.RWMutex
	sessions map[string]*Session
}

func NewManager() *Manager {
	m := &Manager{
		sessions: make(map[string]*Session),
	}
	// Start cleanup loop
	go m.cleanupLoop()
	return m
}

func (m *Manager) Add(s *Session) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.sessions[s.ID] = s
}

func (m *Manager) Get(id string) (*Session, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	s, ok := m.sessions[id]
	return s, ok
}

func (m *Manager) Remove(id string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if s, ok := m.sessions[id]; ok {
		s.Close()
		delete(m.sessions, id)
	}
}

func (m *Manager) cleanupLoop() {
	ticker := time.NewTicker(1 * time.Minute)
	for range ticker.C {
		m.mu.Lock()
		for id, s := range m.sessions {
			s.mu.Lock()
			// 30 minutes timeout
			if time.Since(s.LastActive) > 30*time.Minute {
				s.mu.Unlock()
				log.Printf("Session %s timed out, cleaning up", id)
				s.Close()
				delete(m.sessions, id)
				continue
			}
			s.mu.Unlock()

			// Also cleanup if closed externally
			if s.IsClosed() {
				delete(m.sessions, id)
			}
		}
		m.mu.Unlock()
	}
}

func generateID() string {
	b := make([]byte, 32)
	_, _ = rand.Read(b)
	return base64.URLEncoding.EncodeToString(b)
}

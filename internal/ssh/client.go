package ssh

import (
	"fmt"
	"io"
	"log"
	"time"

	"golang.org/x/crypto/ssh"
)

// Client represents an SSH client connection.
type Client struct {
	*ssh.Client
	Host    string
	Port    int
	User    string
	Pass    string
	session *ssh.Session
}

// NewClient creates a new SSH client.
func NewClient(host string, port int, user, pass string) *Client {
	return &Client{
		Host: host,
		Port: port,
		User: user,
		Pass: pass,
	}
}

// Connect establishes an SSH connection.
func (c *Client) Connect() error {
	config := &ssh.ClientConfig{
		User: c.User,
		Auth: []ssh.AuthMethod{
			ssh.Password(c.Pass),
		},
		HostKeyCallback: ssh.InsecureIgnoreHostKey(), // 開発中はホストキーチェックを無効化
		Timeout:         5 * time.Second,
	}

	addr := fmt.Sprintf("%s:%d", c.Host, c.Port)
	conn, err := ssh.Dial("tcp", addr, config)
	if err != nil {
		return fmt.Errorf("failed to dial: %w", err)
	}
	c.Client = conn
	log.Printf("SSH connection established to %s", addr)
	return nil
}

// StartShell starts an interactive shell session over SSH.
func (c *Client) StartShell(stdin io.Reader, stdout, stderr io.Writer) error {
	session, err := c.NewSession()
	if err != nil {
		return fmt.Errorf("failed to create session: %w", err)
	}
	defer session.Close()
	c.session = session

	session.Stdin = stdin
	session.Stdout = stdout
	session.Stderr = stderr

	modes := ssh.TerminalModes{
		ssh.ECHO:          1,
		ssh.TTY_OP_ISPEED: 14400, // 入力速度
		ssh.TTY_OP_OSPEED: 14400, // 出力速度
	}

	if err := session.RequestPty("xterm", 80, 40, modes); err != nil {
		return fmt.Errorf("failed to request pty: %w", err)
	}

	if err := session.Shell(); err != nil {
		return fmt.Errorf("failed to start shell: %w", err)
	}

	return session.Wait()
}

// Resize resizes the pty.
func (c *Client) Resize(rows, cols int) {
	if c.session != nil {
		if err := c.session.WindowChange(rows, cols); err != nil {
			log.Printf("Failed to resize pty: %v", err)
		}
	}
}

// Close closes the SSH client connection.
func (c *Client) Close() {
	if c.Client != nil {
		c.Client.Close()
		log.Printf("SSH connection to %s:%d closed.", c.Host, c.Port)
	}
}

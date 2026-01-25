package ssh

import (
	"fmt"
	"io"
	"log"
	"os"
	"time"

	"golang.org/x/crypto/ssh"
)

// ChallengeHandler is a function that handles keyboard interactive challenges.
type ChallengeHandler func(instruction string, questions []string, echos []bool) ([]string, error)

// Client represents an SSH client connection.
type Client struct {
	*ssh.Client
	Host             string
	Port             int
	User             string
	Pass             string
	IdentityFile     string
	IdentityKey      string
	ChallengeHandler ChallengeHandler
	session          *ssh.Session
}

// NewClient creates a new SSH client.
func NewClient(host string, port int, user, pass, identityFile, identityKey string, handler ChallengeHandler) *Client {
	return &Client{
		Host:             host,
		Port:             port,
		User:             user,
		Pass:             pass,
		IdentityFile:     identityFile,
		IdentityKey:      identityKey,
		ChallengeHandler: handler,
	}
}

// Connect establishes an SSH connection.
func (c *Client) Connect() error {
	var authMethods []ssh.AuthMethod

	if c.IdentityKey != "" {
		signer, err := ssh.ParsePrivateKey([]byte(c.IdentityKey))
		if err == nil {
			authMethods = append(authMethods, ssh.PublicKeys(signer))
		} else {
			log.Printf("Failed to parse private key content: %v", err)
		}
	} else if c.IdentityFile != "" {
		key, err := os.ReadFile(c.IdentityFile)
		if err == nil {
			signer, err := ssh.ParsePrivateKey(key)
			if err == nil {
				authMethods = append(authMethods, ssh.PublicKeys(signer))
			} else {
				log.Printf("Failed to parse private key %s: %v", c.IdentityFile, err)
			}
		} else {
			log.Printf("Failed to read identity file %s: %v", c.IdentityFile, err)
		}
	}

	if c.Pass != "" {
		authMethods = append(authMethods, ssh.Password(c.Pass))
	}

	if c.ChallengeHandler != nil {
		authMethods = append(authMethods, ssh.KeyboardInteractive(func(user, instruction string, questions []string, echos []bool) (answers []string, err error) {
			return c.ChallengeHandler(instruction, questions, echos)
		}))
	}

	config := &ssh.ClientConfig{
		User:            c.User,
		Auth:            authMethods,
		HostKeyCallback: ssh.InsecureIgnoreHostKey(), // 開発中はホストキーチェックを無効化
		Timeout:         30 * time.Second,            // インタラクティブ認証のためにタイムアウトを延長
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

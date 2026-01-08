package ws

import (
	"encoding/json"
	"log"
	"sync"

	"github.com/gorilla/websocket"
)

// ResizeHandler handles terminal resize events.
type ResizeHandler interface {
	Resize(rows, cols int)
}

// Reader implements io.Reader for a websocket connection.
type Reader struct {
	conn          *websocket.Conn
	mu            sync.Mutex
	buf           []byte
	resizeHandler ResizeHandler
}

type message struct {
	Type    string `json:"type"`
	Payload string `json:"payload"`
	Rows    int    `json:"rows"`
	Cols    int    `json:"cols"`
}

// NewReader creates a new Reader for the given websocket connection.
func NewReader(conn *websocket.Conn) *Reader {
	return &Reader{
		conn: conn,
	}
}

// SetResizeHandler sets the handler for resize events.
func (r *Reader) SetResizeHandler(h ResizeHandler) {
	r.resizeHandler = h
}

// Read reads data from the websocket connection.
func (r *Reader) Read(p []byte) (n int, err error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	for len(r.buf) == 0 {
		_, rawMsg, err := r.conn.ReadMessage()
		if err != nil {
			return 0, err
		}

		// Try to parse as JSON
		var msg message
		if jsonErr := json.Unmarshal(rawMsg, &msg); jsonErr == nil && msg.Type != "" {
			switch msg.Type {
			case "resize":
				if r.resizeHandler != nil {
					r.resizeHandler.Resize(msg.Rows, msg.Cols)
				}
				continue // Skip returning anything, read next message
			case "data":
				r.buf = []byte(msg.Payload)
			default:
				log.Printf("Unknown message type: %s", msg.Type)
			}
		} else {
			// Fallback to raw bytes if not JSON or if it fails (backward compatibility mostly, or if simple string)
			// But since we are changing the protocol, we can enforce JSON or try both.
			// Ideally the frontend ONLY sends JSON now.
			// But for now, let's treat it as raw data if it doesn't look like our JSON
			r.buf = rawMsg
		}
	}

	n = copy(p, r.buf)
	r.buf = r.buf[n:]
	return n, nil
}

package ws

import (
	"sync"

	"github.com/gorilla/websocket"
)

// Reader implements io.Reader for a websocket connection.
type Reader struct {
	conn *websocket.Conn
	mu   sync.Mutex
	buf  []byte
}

// NewReader creates a new Reader for the given websocket connection.
func NewReader(conn *websocket.Conn) *Reader {
	return &Reader{
		conn: conn,
	}
}

// Read reads data from the websocket connection.
func (r *Reader) Read(p []byte) (n int, err error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	for len(r.buf) == 0 {
		_, message, err := r.conn.ReadMessage()
		if err != nil {
			return 0, err
		}
		r.buf = message
	}

	n = copy(p, r.buf)
	r.buf = r.buf[n:]
	return n, nil
}

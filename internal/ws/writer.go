package ws

import (
	"github.com/gorilla/websocket"
)

// Writer implements io.Writer for a websocket connection.
type Writer struct {
	conn *websocket.Conn
}

// NewWriter creates a new Writer for the given websocket connection.
func NewWriter(conn *websocket.Conn) *Writer {
	return &Writer{
		conn: conn,
	}
}

// Write writes data to the websocket connection.
func (w *Writer) Write(p []byte) (n int, err error) {
	err = w.conn.WriteMessage(websocket.TextMessage, p)
	if err != nil {
		return 0, err
	}
	return len(p), nil
}

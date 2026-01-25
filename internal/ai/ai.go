package ai

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

// Config holds AI service configuration
type Config struct {
	Endpoint string
	APIKey   string
	Model    string
}

// GetConfig retrieves AI configuration from environment variables
func GetConfig() Config {
	endpoint := os.Getenv("AI_ENDPOINT")
	apiKey := os.Getenv("AI_API_KEY")
	model := os.Getenv("AI_MODEL")

	return Config{
		Endpoint: endpoint,
		APIKey:   apiKey,
		Model:    model,
	}
}

// SummarizeRequest represents the request body for summarization
type SummarizeRequest struct {
	Text string `json:"text"`
}

// OpenAIRequest represents the OpenAI-compatible API request
type OpenAIRequest struct {
	Model    string    `json:"model"`
	Messages []Message `json:"messages"`
}

// Message represents a chat message
type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// OpenAIResponse represents the OpenAI-compatible API response
type OpenAIResponse struct {
	Choices []struct {
		Message Message `json:"message"`
	} `json:"choices"`
}

// Summarize sends terminal output to AI and returns a summary
func Summarize(text string) (string, error) {
	config := GetConfig()

	reqBody := OpenAIRequest{
		Model: config.Model,
		Messages: []Message{
			{
				Role:    "system",
				Content: "あなたは優秀なエンジニアです。提供されたターミナル出力を技術的に正確かつ簡潔に日本語で要約してください。5行程度にまとめてください。",
			},
			{
				Role:    "user",
				Content: text,
			},
		},
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}

	url := fmt.Sprintf("%s/chat/completions", config.Endpoint)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")
	if config.APIKey != "" {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", config.APIKey))
	}

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("AI API error (status %d): %s", resp.StatusCode, string(body))
	}

	var openAIResp OpenAIResponse
	if err := json.Unmarshal(body, &openAIResp); err != nil {
		return "", err
	}

	if len(openAIResp.Choices) > 0 {
		return openAIResp.Choices[0].Message.Content, nil
	}

	return "", fmt.Errorf("no response from AI")
}

package ssh

import (
	"bufio"
	"os"
	"path/filepath"
	"strings"
)

type HostEntry struct {
	Host         string `json:"Host"`
	HostName     string `json:"HostName"`
	User         string `json:"User,omitempty"`
	Port         string `json:"Port,omitempty"`
	IdentityFile string `json:"IdentityFile,omitempty"`
}

func ParseConfig(customPath string) ([]HostEntry, error) {
	var path string
	if customPath != "" {
		path = customPath
	} else {
		home, err := os.UserHomeDir()
		if err != nil {
			return nil, err
		}
		path = filepath.Join(home, ".ssh", "config")
	}

	f, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			return []HostEntry{}, nil
		}
		return nil, err
	}
	defer f.Close()

	var hosts []HostEntry
	var current *HostEntry

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		parts := strings.Fields(line)
		if len(parts) < 2 {
			continue
		}

		key := strings.ToLower(parts[0])
		value := parts[1]

		if key == "host" {
			// Wildcards are often used in config (e.g. Host *), skip them for this list or handle?
			// For simple UI, we might want to list concrete hosts.
			// Let's list all for now, but UI might filter.
			if current != nil {
				hosts = append(hosts, *current)
				current = nil // Reset current so we don't append it again later if we skip
			}

			if strings.Contains(value, "*") || strings.Contains(value, "?") {
				continue
			}

			current = &HostEntry{Host: value}
		} else if current != nil {
			switch key {
			case "hostname":
				current.HostName = value
			case "user":
				current.User = value
			case "port":
				current.Port = value
			case "identityfile":
				// Handle ~ expansion
				if strings.HasPrefix(value, "~/") {
					home, _ := os.UserHomeDir()
					value = filepath.Join(home, value[2:])
				}
				current.IdentityFile = value
			}
		}
	}

	if current != nil {
		hosts = append(hosts, *current)
	}

	return hosts, nil
}

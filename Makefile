BINARY_NAME=nash

.PHONY: build build-frontend build-backend clean clean-frontend lint format test-e2e storybook

build: build-frontend build-backend

storybook:
	cd frontend && npm run storybook

build-storybook:
	cd frontend && npm run build-storybook

test-all: export CI=true
test-all: format lint test build-storybook test-e2e

lint:
	cd frontend && npm run lint
	cd frontend && npm run typecheck
	go vet ./...

format:
	cd frontend && npm run format
	go fmt ./...

test-e2e:
	cd e2e && npm test

mock-up:
	@if [ ! -f e2e/ssh_server/keys/id_rsa ]; then \
		echo "Generating SSH keys..."; \
		mkdir -p e2e/ssh_server/keys; \
		ssh-keygen -t rsa -b 4096 -f e2e/ssh_server/keys/id_rsa -N "" -C "test@example.com"; \
	fi
	cd e2e/ssh_server && docker compose up -d --build
	@echo "SSH Server started on localhost:2222"
	@echo "  User: testuser, Pass: password"
	@echo "  User: keyuser, Key: e2e/ssh_server/keys/id_rsa"
	@echo "Mock config created at e2e/ssh_server/ssh_config"

mock-down:
	cd e2e/ssh_server && docker compose down

test: unit-test-frontend unit-test-backend

unit-test-frontend:
	cd frontend && npm run test:unit

unit-test-backend:
	go list ./... | xargs go test -v

build-frontend:
	cd frontend && npm run build

build-backend:
	go build -o $(BINARY_NAME) ./cmd/server

run: mock-up
	@echo "Starting dev environment (Frontend on :5173, Backend on :8080)..."
	@trap 'kill 0' EXIT; \
	(cd frontend && npm run dev -- --host) & \
	DEV_MODE=true air -- -config e2e/ssh_server/ssh_config

clean:
	rm -rf cmd/server/dist
	rm -f $(BINARY_NAME)
	# Optional: make clean-frontend to remove node_modules/dist in frontend

BINARY_NAME=nash

.PHONY: build build-frontend build-backend clean clean-frontend lint format test-e2e storybook

build: build-frontend build-backend

storybook:
	cd frontend && npm run storybook

build-storybook:
	cd frontend && npm run build-storybook

test-all: export CI=true
test-all: mock-up
	@if ! lsof -i :8080 > /dev/null; then \
		echo "Starting backend for tests..."; \
		DEV_MODE=true go run cmd/server/main.go -config e2e/ssh_server/ssh_config > backend.test.log 2>&1 & \
		echo $$! > .backend.pid; \
		sleep 5; \
	fi
	@if ! lsof -i :5173 > /dev/null; then \
		echo "Starting frontend for tests..."; \
		(cd frontend && npm run dev -- --host) > frontend.test.log 2>&1 & \
		echo $$! > .frontend.pid; \
		sleep 5; \
	fi
	$(MAKE) format lint test build-storybook test-e2e
	@if [ -f .backend.pid ]; then \
		echo "Stopping background backend..."; \
		kill $$(cat .backend.pid) && rm .backend.pid; \
	fi
	@if [ -f .frontend.pid ]; then \
		echo "Stopping background frontend..."; \
		kill $$(cat .frontend.pid) && rm .frontend.pid; \
	fi

lint:
	cd frontend && npm run lint
	cd frontend && npm run typecheck
	golangci-lint run ./...

format:
	cd frontend && npm run format
	golangci-lint run --fix ./...

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
	CGO_ENABLED=0 go build -ldflags "-X main.BuildTime=$(shell date -u +%Y-%m-%dT%H:%M:%SZ) -X main.CommitHash=$(shell git rev-parse --short HEAD)" -o $(BINARY_NAME) ./cmd/server

run: mock-up
	@echo "Starting dev environment (Frontend on :5173, Backend on :8080)..."
	@trap 'kill 0' EXIT; \
	(cd frontend && npm run dev -- --host) & \
	DEV_MODE=true air -- -config e2e/ssh_server/ssh_config

clean:
	rm -rf cmd/server/dist
	rm -f $(BINARY_NAME)
	# Optional: make clean-frontend to remove node_modules/dist in frontend

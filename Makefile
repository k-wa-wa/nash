BINARY_NAME=nash

.PHONY: build build-frontend build-backend clean clean-frontend lint format test-e2e storybook

build: build-frontend build-backend

storybook:
	cd frontend && npm run storybook

build-storybook:
	cd frontend && npm run build-storybook

test-all: format lint test build-storybook test-e2e

lint:
	cd frontend && npm run lint
	cd frontend && npm run typecheck
	go vet ./...

format:
	cd frontend && npm run format
	go fmt ./...

test-e2e:
	cd e2e && go test -v .

mock-up:
	cd e2e && docker compose up -d --build
	@echo "SSH Server started on localhost:2222"
	@echo "  User: testuser, Pass: password"
	@echo "  User: keyuser, Key: e2e/keys/id_rsa"
	@echo "Mock config created at e2e/ssh_config"

mock-down:
	cd e2e && docker compose down

test: unit-test-frontend unit-test-backend

unit-test-frontend:
	cd frontend && npm run test:unit

unit-test-backend:
	go list ./... | grep -v /e2e | xargs go test -v

build-frontend:
	cd frontend && npm run build

build-backend:
	go build -o $(BINARY_NAME) ./cmd/server

run:
	@echo "Starting dev environment (Frontend on :5173, Backend on :8080)..."
	@trap 'kill 0' EXIT; \
	(cd frontend && npm run dev -- --host) & \
	DEV_MODE=true air -- -config e2e/ssh_config

clean:
	rm -rf cmd/server/dist
	rm -f $(BINARY_NAME)
	# Optional: make clean-frontend to remove node_modules/dist in frontend

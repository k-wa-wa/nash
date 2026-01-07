BINARY_NAME=nash

.PHONY: all build build-frontend build-backend clean clean-frontend lint format test-e2e

all: build-frontend build-backend

build: all

lint:
	cd frontend && npm run lint
	go vet ./...

format:
	cd frontend && npm run format
	go fmt ./...

test-e2e:
	cd e2e && go test -v e2e_test.go

build-frontend:
	cd frontend && npm install && npm run build
	mkdir -p cmd/server/dist
	cp -R frontend/dist/* cmd/server/dist/

build-backend:
	go build -o $(BINARY_NAME) ./cmd/server

run:
	@echo "Starting dev environment (Hot Reload on :8080)..."
	@trap 'kill 0' EXIT; \
	(cd frontend && npm run watch) & \
	air

clean:
	rm -rf cmd/server/dist
	rm -f $(BINARY_NAME)
	# Optional: make clean-frontend to remove node_modules/dist in frontend

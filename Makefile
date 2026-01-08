BINARY_NAME=nash

.PHONY: build build-frontend build-backend clean clean-frontend lint format test-e2e storybook

build: build-frontend build-backend

storybook:
	cd frontend && npm run storybook

lint:
	cd frontend && npm run lint
	go vet ./...

format:
	cd frontend && npm run format
	go fmt ./...

test-e2e:
	cd e2e && go test -v e2e_test.go

test: unit-test-frontend unit-test-backend

unit-test-frontend:
	cd frontend && npm run test:unit

unit-test-backend:
	go list ./... | grep -v /e2e | xargs go test -v

build-frontend:
	cd frontend && npm install --legacy-peer-deps && npm run build
	mkdir -p cmd/server/dist
	cp -R frontend/dist/* cmd/server/dist/

build-backend:
	go build -o $(BINARY_NAME) ./cmd/server

run:
	@echo "Starting dev environment (Frontend on :5173, Backend on :8080)..."
	@trap 'kill 0' EXIT; \
	(cd frontend && npm run dev -- --host) & \
	DEV_MODE=true air

clean:
	rm -rf cmd/server/dist
	rm -f $(BINARY_NAME)
	# Optional: make clean-frontend to remove node_modules/dist in frontend

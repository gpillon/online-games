.PHONY: help install build dev dev-backend dev-frontend dev-db clean docker-build docker-up docker-down lint shared

SHELL := /bin/bash

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ──────────────────────────────────────────────
# Development
# ──────────────────────────────────────────────

install: ## Install all dependencies
	cd shared && npm install
	cd backend && npm install
	cd frontend && npm install

shared: ## Build shared types package
	cd shared && npm run build

build: shared ## Build everything
	cd backend && npx nest build
	cd frontend && npm run build

dev-db: ## Start PostgreSQL in Docker
	docker compose up -d postgres
	@echo "Waiting for PostgreSQL..."
	@until docker compose exec postgres pg_isready -U postgres > /dev/null 2>&1; do sleep 1; done
	@echo "PostgreSQL is ready!"

dev-backend: shared ## Start backend in dev mode
	cd backend && rm -rf dist tsconfig.build.tsbuildinfo && npx nest build && npm run start:dev

dev-frontend: ## Start frontend in dev mode
	cd frontend && npm run dev

dev: dev-db ## Start full dev environment (DB + backend + frontend)
	@echo "Starting backend and frontend..."
	$(MAKE) -j2 dev-backend dev-frontend

# ──────────────────────────────────────────────
# Docker
# ──────────────────────────────────────────────

docker-build: ## Build Docker images
	docker compose build

docker-up: ## Start all services via Docker Compose
	docker compose up -d
	@echo "Frontend: http://localhost:8080"
	@echo "Backend:  http://localhost:3001"

docker-down: ## Stop all Docker services
	docker compose down

docker-logs: ## Tail Docker Compose logs
	docker compose logs -f

# ──────────────────────────────────────────────
# Quality
# ──────────────────────────────────────────────

lint: ## Run linters
	cd backend && npx nest build
	cd frontend && npx tsc --noEmit

typecheck: shared ## TypeScript check without emit
	cd backend && npx tsc --noEmit -p tsconfig.json
	cd frontend && npx tsc --noEmit

# ──────────────────────────────────────────────
# Helm
# ──────────────────────────────────────────────

helm-lint: ## Lint Helm chart
	helm lint helm/online-games

helm-template: ## Render Helm templates locally
	helm template online-games helm/online-games

helm-package: ## Package Helm chart
	helm package helm/online-games -d helm-packages

# ──────────────────────────────────────────────
# Cleanup
# ──────────────────────────────────────────────

clean: ## Clean build artifacts and node_modules
	rm -rf shared/dist backend/dist frontend/dist
	rm -rf shared/node_modules backend/node_modules frontend/node_modules
	rm -rf helm-packages

reset: clean docker-down ## Full reset: clean + stop Docker
	docker compose down -v

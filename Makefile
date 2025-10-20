# SunFixer & OVM Backend Makefile
# Common development tasks automation

.PHONY: help install setup secrets db-create db-migrate db-seed db-reset dev start test clean docker-build docker-run

# Default target
help: ## Show this help message
	@echo "🎵 SunFixer & OVM Backend - Available Commands:"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "\033[36m\033[0m\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)
	@echo ""

##@ Setup
install: ## Install Node.js dependencies
	@echo "📦 Installing dependencies..."
	npm install

setup: install secrets ## Full setup (install + generate secrets)
	@echo "✅ Setup completed!"

secrets: ## Generate all required security secrets
	@echo "🔐 Generating security secrets..."
	@node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
	@node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
	@node -e "console.log('ADMIN_COOKIE_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
	@node -e "console.log('ADMIN_SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
	@echo ""
	@echo "⬆️  Copy these values to your .env file"

##@ Database
db-create: ## Create PostgreSQL database
	@echo "🗄️  Creating database..."
	createdb -U postgres sunfixer_ovm || echo "Database may already exist"

db-migrate: ## Run database migrations
	@echo "📊 Running migrations..."
	npm run db:migrate

db-seed: ## Seed database with sample data
	@echo "🌱 Seeding database..."
	npm run db:seed

db-reset: ## Reset database (migrate + seed)
	@echo "🔄 Resetting database..."
	npm run db:migrate
	npm run db:seed

##@ Development
dev: ## Start development server with hot reload
	@echo "🚀 Starting development server..."
	npm run dev

start: ## Start production server
	@echo "🎯 Starting production server..."
	npm start

test: ## Run tests
	@echo "🧪 Running tests..."
	npm test

lint: ## Run linter
	@echo "🔍 Running linter..."
	npm run lint

lint-fix: ## Fix linting issues
	@echo "🔧 Fixing linting issues..."
	npm run lint:fix

##@ Maintenance
clean: ## Clean node_modules and reinstall
	@echo "🧹 Cleaning..."
	rm -rf node_modules package-lock.json
	npm install

logs: ## View application logs
	@echo "📋 Recent logs:"
	@tail -f src/logs/combined.log 2>/dev/null || echo "No logs found. Start the server first."

##@ Docker
docker-build: ## Build Docker image
	@echo "🐳 Building Docker image..."
	docker build -t sunfixer-ovm-backend .

docker-run: ## Run Docker container
	@echo "🐳 Running Docker container..."
	docker run -d \
		-p 3000:3000 \
		-e DB_HOST=host.docker.internal \
		-e DB_NAME=sunfixer_ovm \
		-e DB_USER=postgres \
		-e DB_PASSWORD=$${DB_PASSWORD} \
		-e JWT_SECRET=$${JWT_SECRET} \
		-e JWT_REFRESH_SECRET=$${JWT_REFRESH_SECRET} \
		-e ADMIN_COOKIE_SECRET=$${ADMIN_COOKIE_SECRET} \
		-e ADMIN_SESSION_SECRET=$${ADMIN_SESSION_SECRET} \
		--name sunfixer-backend \
		sunfixer-ovm-backend

docker-stop: ## Stop Docker container
	@echo "🛑 Stopping Docker container..."
	docker stop sunfixer-backend || true
	docker rm sunfixer-backend || true

##@ Info
status: ## Show service status
	@echo "📊 SunFixer & OVM Backend Status:"
	@echo "Node.js: $$(node --version 2>/dev/null || echo 'Not found')"
	@echo "npm: v$$(npm --version 2>/dev/null || echo 'Not found')"
	@echo "PostgreSQL: $$(psql --version 2>/dev/null || echo 'Not found')"
	@echo ""
	@echo "🌐 URLs (when running):"
	@echo "  API: http://localhost:3000"
	@echo "  Admin: http://localhost:3000/admin"
	@echo "  Health: http://localhost:3000/health"

check-env: ## Check .env file configuration
	@echo "🔍 Checking .env configuration..."
	@if [ -f .env ]; then \
		echo "✅ .env file exists"; \
		grep -q "JWT_SECRET=" .env && echo "✅ JWT_SECRET found" || echo "❌ JWT_SECRET missing"; \
		grep -q "JWT_REFRESH_SECRET=" .env && echo "✅ JWT_REFRESH_SECRET found" || echo "❌ JWT_REFRESH_SECRET missing"; \
		grep -q "ADMIN_COOKIE_SECRET=" .env && echo "✅ ADMIN_COOKIE_SECRET found" || echo "❌ ADMIN_COOKIE_SECRET missing"; \
		grep -q "ADMIN_SESSION_SECRET=" .env && echo "✅ ADMIN_SESSION_SECRET found" || echo "❌ ADMIN_SESSION_SECRET missing"; \
		grep -q "DB_PASSWORD=" .env && echo "✅ DB_PASSWORD found" || echo "❌ DB_PASSWORD missing"; \
	else \
		echo "❌ .env file not found"; \
	fi

##@ Quick Start
quick-start: ## Quick start for first time setup
	@echo "🚀 SunFixer & OVM Backend Quick Start"
	@echo "======================================"
	@make install
	@echo ""
	@echo "📝 Please copy .env.example to .env and fill in your values:"
	@echo "   cp .env.example .env"
	@echo ""
	@echo "🔐 Generate secrets and add to .env:"
	@make secrets
	@echo ""
	@echo "🗄️  Create database and run setup:"
	@echo "   make db-create"
	@echo "   make db-migrate"
	@echo "   make db-seed"
	@echo ""
	@echo "🎵 Then start the server:"
	@echo "   make dev"

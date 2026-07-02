.PHONY: install install-backend install-frontend lint lint-backend lint-frontend test test-backend test-frontend dev dev-backend dev-frontend build docker-up docker-down clean

# ─── Установка зависимостей ────────────────────────────────────────────────

install: install-backend install-frontend

install-backend:
	cd Backend && pip install -r requirements-dev.txt

install-frontend:
	cd Frontend && npm install

# ─── Линтинг ───────────────────────────────────────────────────────────────

lint: lint-backend lint-frontend

lint-backend:
	cd Backend && ruff check .

lint-frontend:
	cd Frontend && npm run lint

# ─── Тесты ─────────────────────────────────────────────────────────────────

test: test-backend test-frontend

test-backend:
	cd Backend && python -m pytest -v --cov=app --cov-report=term-missing

test-frontend:
	cd Frontend && npm test

# ─── Локальный запуск ──────────────────────────────────────────────────────

dev: dev-backend dev-frontend

dev-backend:
	cd Backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend:
	cd Frontend && npm run dev

# ─── Сборка ────────────────────────────────────────────────────────────────

build:
	cd Frontend && npm run build

# ─── Docker ────────────────────────────────────────────────────────────────

docker-up:
	docker compose up --build -d

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f

# ─── Очистка ───────────────────────────────────────────────────────────────

clean:
	cd Backend && find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	cd Backend && find . -type f -name "*.pyc" -delete
	cd Frontend && rm -rf dist
	cd Frontend && rm -rf node_modules/.cache
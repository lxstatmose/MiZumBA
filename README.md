# MiZumBA

**MiZumBA** — это современный мессенджер с открытым исходным кодом, построенный на архитектуре микросервисов. Проект поддерживает текстовые и аудиосообщения, каналы, чаты, уведомления и многое другое.

## Возможности

- Личные и групповые чаты
- Каналы с подпиской
- Аудиосообщения с расшифровкой (Whisper)
- Загрузка файлов и аватарок
- Уведомления в реальном времени
- Темная/светлая тема
- Многоязычность (RU/EN)
- Безопасность (JWT, OAuth2, rate limiting)
- Адаптивный интерфейс (мобильные + десктоп)

## Технологический стек

### Бэкенд
- **FastAPI** — асинхронный веб-фреймворк
- **SQLModel** — ORM для работы с PostgreSQL
- **PostgreSQL 17** — основная база данных
- **Redis 8** — кэширование и сессии
- **Alembic** — миграции базы данных
- **WebSockets** — real-time коммуникация
- **JWT** — аутентификация
- **OpenAI Whisper** — расшифровка аудио (опционально)
- **Boto3/Cloudinary** — хранилище файлов

### Фронтенд
- **React 19** — UI библиотека
- **TypeScript** — типизация
- **Vite** — сборщик
- **Tailwind CSS 4** — стилизация
- **Zustand** — управление состоянием
- **Lucide React** — иконки

### Инфраструктура
- **Docker & Docker Compose** — контейнеризация
- **GitHub Actions** — CI/CD
- **pytest** — тестирование бэкенда
- **ESLint + TypeScript** — линтинг фронтенда

## Предварительные требования

- **Docker** и **Docker Compose** (рекомендуемый способ)
- ИЛИ:
  - **Python 3.11+**
  - **Node.js 20+**
  - **PostgreSQL 17**
  - **Redis 8**

## Локальный запуск

### Вариант 1: Docker Compose (рекомендуется)

1. Клонируйте репозиторий:
   ```bash
   git clone https://github.com/YrLuck/mizumba.git
   cd mizumba
   ```

2. Запустите все сервисы:
   ```bash
   docker-compose up --build
   ```

3. Примените миграции базы данных:
   ```bash
   docker-compose exec backend alembic upgrade head
   ```

4. Доступ к приложению:
   - Фронтенд: http://localhost:3000
   - Бэкенд API: http://localhost:8000
   - API документация: http://localhost:8000/docs

### Вариант 2: Локальная разработка

#### Бэкенд

1. Создайте виртуальное окружение:
   ```bash
   cd Backend
   python3 -m venv .venv
   source .venv/bin/activate  # Linux/Mac
   # ИЛИ .venv\Scripts\activate  # Windows
   ```

2. Установите зависимости:
   ```bash
   pip install -r requirements-dev.txt
   ```

3. Настройте переменные окружения:
   ```bash
   cp .env.example .env
   # Отредактируйте .env файл под ваши нужды
   ```

4. Запустите PostgreSQL и Redis:
   ```bash
   docker-compose up postgres redis -d
   ```

5. Примените миграции:
   ```bash
   alembic upgrade head
   ```

6. Запустите сервер разработки:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

#### Фронтенд

1. Установите зависимости:
   ```bash
   cd Frontend
   npm install
   ```

2. Запустите dev-сервер:
   ```bash
   npm run dev
   ```

3. Откройте браузер:
   ```
   http://localhost:5173
   ```

## Тестирование

### Бэкенд

```bash
cd Backend

# Установка зависимостей для тестов
pip install -r requirements-dev.txt

# Запуск всех тестов с покрытием
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/mizumba_test \
REDIS_URL=redis://localhost:6379/0 \
JWT_SECRET_KEY=test-secret-key-for-ci \
python -m pytest -v --cov=app --cov-report=term-missing

# Линтинг
ruff check .
ruff format --check .
```

### Фронтенд

```bash
cd Frontend

# Линтинг
npm run lint

# TypeScript проверка
npx tsc --noEmit

# Сборка
npm run build
```

## Конфигурация

Основные переменные окружения (`.env`):

```env
# База данных
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/mizumba

# Redis
REDIS_URL=redis://localhost:6379/0

# JWT
JWT_SECRET_KEY=your-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=30

# Файлы
UPLOAD_DIR=uploads
MAX_UPLOAD_SIZE_MB=10
STORAGE_PROVIDER=local  # local | s3 | cloudinary

# Whisper (опционально)
ENABLE_WHISPER_TRANSCRIPTION=true
WHISPER_MODEL_NAME=base

# OAuth (опционально)
GOOGLE_CLIENT_ID=
APPLE_CLIENT_ID=
```

## Структура проекта

```
MiZumBA/
├── Backend/
│   ├── app/
│   │   ├── audio/          # Аудио и расшифровка
│   │   ├── auth/           # Аутентификация и авторизация
│   │   ├── channels/       # Каналы
│   │   ├── chats/          # Чаты
│   │   ├── files/          # Загрузка файлов
│   │   ├── geo/            # Геолокация и страны
│   │   ├── messages/       # Сообщения
│   │   ├── notifications/  # Уведомления
│   │   ├── privacy/        # Приватность
│   │   ├── search/         # Поиск
│   │   ├── users/          # Пользователи
│   │   └── websocket/      # WebSocket
│   ├── tests/              # Тесты
│   ├── alembic/            # Миграции БД
│   └── requirements*.txt   # Зависимости
├── Frontend/
│   ├── src/
│   │   ├── api/            # API клиенты
│   │   ├── components/     # React компоненты
│   │   ├── pages/          # Страницы
│   │   ├── store/          # Zustand stores
│   │   └── i18n/           # Локализация
│   └── package.json
├── docker-compose.yml
└── README.md
```
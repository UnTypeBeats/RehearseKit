# Local Development Guide

This guide covers setting up RehearseKit for local development on Mac M1 and WSL (Windows 10).

## Prerequisites

### Mac M1
- Docker Desktop for Mac (latest)
- Node.js 20+ (via nvm recommended)
- Python 3.11+
- Git

### WSL (Windows 10)
- WSL2 installed
- Docker Desktop for Windows with WSL2 backend
- Node.js 20+ (via nvm)
- Python 3.11+
- Git

## Quick Start

```bash
# Clone repository
git clone https://github.com/yourusername/RehearseKit.git
cd RehearseKit

# Start all services with Docker Compose
docker-compose up
```

Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- WebSocket: http://localhost:8001

## Detailed Setup

### 1. Environment Configuration

The project uses environment variables for configuration. For local development with Docker Compose, most variables are pre-configured in `docker-compose.yml`.

#### Optional: Authentication Setup

To enable Google OAuth authentication (optional for development):

1. **Create `.env` files** (see `config/.env.example` for reference):
   ```bash
   # Backend: backend/.env
   JWT_SECRET_KEY=dev-secret-key-at-least-32-chars-long
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   ADMIN_EMAIL=your@email.com
   
   # Frontend: frontend/.env.local
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   ```

2. **Set up Google OAuth**:
   - See [Authentication Guide](authentication.md) for detailed setup
   - Or skip this step - authentication is optional for development

**Note**: The app works without authentication configured. Users can create jobs anonymously.

### 2. Frontend Development

#### Running Locally (Outside Docker)

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at http://localhost:3000 with hot-reload enabled.

#### Building

```bash
npm run build
npm start  # Production build
```

### 3. Backend Development

#### Running Locally (Outside Docker)

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Mac/WSL
# or
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Start PostgreSQL and Redis (via Docker)
docker-compose up postgres redis

# Run database migrations
alembic upgrade head

# Start FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Starting Celery Worker

```bash
cd backend
source venv/bin/activate

celery -A app.celery_app worker --loglevel=info
```

### 4. Database Management

#### Running Migrations

```bash
cd backend

# Create a new migration
alembic revision --autogenerate -m "Description of changes"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1
```

#### Accessing PostgreSQL

```bash
# Via Docker
docker-compose exec postgres psql -U rehearsekit -d rehearsekit

# Or connect locally
psql postgresql://rehearsekit:dev-password@localhost:5432/rehearsekit
```

### 5. Redis Management

```bash
# Access Redis CLI
docker-compose exec redis redis-cli

# Common commands
PING  # Test connection
KEYS *  # List all keys
FLUSHALL  # Clear all data (use with caution!)
```

## Project Structure

```
RehearseKit/
├── frontend/              # Next.js application
│   ├── app/              # App router pages
│   ├── components/       # React components
│   ├── lib/              # Utilities and API client
│   └── public/           # Static assets
│
├── backend/              # FastAPI application
│   ├── app/
│   │   ├── api/          # API routes
│   │   ├── models/       # Database models
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── services/     # Business logic
│   │   ├── tasks/        # Celery tasks
│   │   └── core/         # Config, database
│   └── alembic/          # Database migrations
│
├── websocket/            # WebSocket service
│   └── app/
│       └── main.py
│
├── infrastructure/       # Terraform IaC
│   └── gcp/
│
└── docker-compose.yml    # Local development setup
```

## Development Workflow

### Making Changes

1. **Frontend changes**: Edit files in `frontend/`, hot-reload is enabled
2. **Backend changes**: Edit files in `backend/`, uvicorn auto-reloads
3. **Database changes**: Create migration, apply, test

### Testing

```bash
# Frontend tests
cd frontend
npm test

# Backend tests
cd backend
pytest

# Run specific test file
pytest tests/test_jobs.py

# Run with coverage
pytest --cov=app
```

### Code Quality

```bash
# Frontend
cd frontend
npm run lint
npm run type-check

# Backend
cd backend
black .  # Format code
flake8  # Lint
mypy app  # Type checking
```

## Common Tasks

### Resetting the Database

```bash
# Stop services
docker-compose down

# Remove database volume
docker volume rm rehearsekit_postgres_data

# Restart and run migrations
docker-compose up -d postgres
cd backend
alembic upgrade head
```

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f worker

# Last 100 lines
docker-compose logs --tail=100 frontend
```

### Clearing Storage

```bash
# Clear local storage directory
rm -rf tmp/storage/*

# Recreate structure
mkdir -p tmp/storage/uploads
mkdir -p tmp/storage/stems
mkdir -p tmp/storage/packages
```

## Platform-Specific Notes

### Mac M1

The project uses multi-architecture Docker images compatible with ARM64:

- `python:3.11-slim` supports arm64
- `node:20-alpine` supports arm64
- `postgres:16-alpine` supports arm64
- `redis:7-alpine` supports arm64

If you encounter platform issues:

```bash
# Force platform specification
docker-compose build --build-arg PLATFORM=linux/arm64
```

### WSL (Windows 10)

1. **File Performance**: Keep project files in WSL filesystem (`/home/user/`), not Windows (`/mnt/c/`)
2. **Docker Resources**: Allocate sufficient memory in Docker Desktop settings (4GB minimum)
3. **Line Endings**: Configure git:
   ```bash
   git config --global core.autocrlf input
   ```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :3000  # Mac/WSL
netstat -ano | findstr :3000  # Windows

# Stop Docker services
docker-compose down
```

### Docker Build Failures

```bash
# Clean build (removes cache)
docker-compose build --no-cache

# Remove all containers and images
docker-compose down --rmi all --volumes
```

### Database Connection Errors

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Restart database
docker-compose restart postgres

# Check logs
docker-compose logs postgres
```

### Celery Worker Not Processing

```bash
# Check Redis connection
docker-compose logs redis

# Restart worker
docker-compose restart worker

# Check worker logs
docker-compose logs -f worker
```

## Performance Tips

1. **Use Docker BuildKit**: Set `DOCKER_BUILDKIT=1` environment variable
2. **Layer Caching**: Don't change `package.json` or `requirements.txt` unnecessarily
3. **Volume Mounts**: Use delegated mode on Mac for better performance
4. **Resource Allocation**: Give Docker Desktop sufficient RAM and CPU

## IDE Setup

### VS Code

Install recommended extensions:
- ESLint
- Prettier
- Python
- Docker
- Tailwind CSS IntelliSense

Workspace settings (`.vscode/settings.json`):

```json
{
  "editor.formatOnSave": true,
  "python.linting.enabled": true,
  "python.formatting.provider": "black",
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

## Next Steps

- Read [API Documentation](./api.md)
- Review [Architecture Overview](./architecture.md)
- Check [Deployment Guide](./deployment.md)
- Contribute via [Contributing Guidelines](../CONTRIBUTING.md)


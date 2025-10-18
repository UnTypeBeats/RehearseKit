# RehearseKit

**Your Complete Rehearsal Toolkit**

Transform any audio source into a ready-to-use rehearsal project in minutes. RehearseKit automatically separates stems, detects tempo, and generates Cubase project files—so you can focus on making music.

---

## Features

- 🎵 **Audio Input**: Upload FLAC files or paste YouTube URLs
- 🎼 **Stem Separation**: AI-powered isolation of vocals, drums, bass, guitars, keys, and more
- ⏱️ **Tempo Detection**: Automatic BPM analysis with manual override option
- 🎹 **DAW Integration**: Auto-generated Cubase project files with stems pre-loaded
- 📦 **Download Packages**: Get all stems + project file in one ZIP
- 🚀 **Cloud-Powered**: Deployed on Google Cloud Platform for reliability and scale

---

## Architecture

### Cloud Services (GCP)
- **Frontend**: Next.js 14 on Cloud Run
- **Backend API**: FastAPI on Cloud Run
- **Worker**: Celery workers on Cloud Run
- **WebSocket**: Real-time progress updates via dedicated Cloud Run service
- **Database**: Cloud SQL (PostgreSQL 16)
- **Cache/Queue**: Memorystore for Redis
- **Storage**: Cloud Storage for audio files and stems

### Local Development
All services run via Docker Compose for easy local development on Mac M1 and WSL.

---

## Quick Start

### Prerequisites
- Docker Desktop (Mac) or Docker Engine (WSL)
- Node.js 20+ (for local frontend development)
- Python 3.11+ (for local backend development)

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/UnTypeBeats/RehearseKit.git
   cd RehearseKit
   ```

2. **Start all services**
   ```bash
   docker-compose up
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Project Structure

```
RehearseKit/
├── frontend/              # Next.js 14 application
├── backend/               # FastAPI application
├── websocket/             # WebSocket service
├── worker/                # Celery worker
├── infrastructure/        # Terraform IaC
├── docs/                  # Documentation
├── docker-compose.yml     # Local development
└── README.md
```

---

## Deployment

RehearseKit is designed to deploy to Google Cloud Platform via GitHub Actions.

See [docs/deployment.md](docs/deployment.md) for detailed deployment instructions.

---

## Technology Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS, Shadcn/ui
- **Backend**: FastAPI, Python 3.11, SQLAlchemy, Celery
- **Processing**: Demucs (stem separation), Librosa (tempo detection), FFmpeg
- **Infrastructure**: Docker, GCP Cloud Run, Cloud SQL, Memorystore, Cloud Storage

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

[MIT License](LICENSE)

---

## Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/UnTypeBeats/RehearseKit/issues)
- **Domain**: [rehearsekit.uk](https://rehearsekit.uk)

---

Built with ❤️ for musicians who want to spend less time on setup and more time making music.


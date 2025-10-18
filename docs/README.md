# RehearseKit Documentation

Welcome to the RehearseKit documentation. This directory contains comprehensive guides for using, developing, and deploying RehearseKit.

## Quick Links

- **[Local Development Guide](./local-development.md)** - Set up RehearseKit on your Mac M1 or WSL environment
- **[Deployment Guide](./deployment.md)** - Deploy RehearseKit to Google Cloud Platform
- **[API Documentation](./api.md)** - Complete API reference with examples

## What is RehearseKit?

RehearseKit is a cloud-based audio processing application that:
- Accepts FLAC uploads or YouTube URLs
- Separates audio into individual stems (vocals, drums, bass, guitar, keys, other)
- Detects tempo automatically
- Generates Cubase project files
- Packages everything for easy download

## Getting Started

### For Development

1. Clone the repository
2. Follow the [Local Development Guide](./local-development.md)
3. Run `docker-compose up` to start all services
4. Access the frontend at http://localhost:3000

### For Deployment

1. Set up your GCP project
2. Follow the [Deployment Guide](./deployment.md)
3. Configure Terraform variables
4. Deploy infrastructure with `terraform apply`
5. Push to GitHub main branch to trigger CI/CD

## Architecture

RehearseKit uses a modern cloud-native architecture:

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ├─────────────────┐
       │                 │
       v                 v
┌─────────────┐   ┌─────────────┐
│  Next.js    │   │  WebSocket  │
│  Frontend   │   │  Service    │
│ (Cloud Run) │   │ (Cloud Run) │
└──────┬──────┘   └──────┬──────┘
       │                 │
       v                 v
┌─────────────┐   ┌─────────────┐
│   FastAPI   │   │    Redis    │
│   Backend   │◄──┤(Memorystore)│
│ (Cloud Run) │   └─────────────┘
└──────┬──────┘
       │
       ├─────────┬─────────┐
       v         v         v
┌─────────┐ ┌────────┐ ┌────────┐
│ Celery  │ │Cloud   │ │Cloud   │
│ Worker  │ │SQL     │ │Storage │
│(Cloud   │ │(Postgre│ │Buckets │
│ Run)    │ │SQL)    │ │        │
└─────────┘ └────────┘ └────────┘
```

### Components

1. **Frontend (Next.js 14)**
   - Server-side rendered React application
   - Tailwind CSS with RehearseKit brand colors
   - Real-time progress updates via WebSocket
   - Responsive design for mobile and desktop

2. **Backend API (FastAPI)**
   - RESTful API for job management
   - PostgreSQL for persistent storage
   - Google Cloud Storage integration
   - Automatic API documentation

3. **Worker Service (Celery)**
   - Processes audio jobs asynchronously
   - Uses Demucs for AI-powered stem separation
   - Librosa for tempo detection
   - FFmpeg for audio conversion

4. **WebSocket Service**
   - Real-time job progress updates
   - Redis pub/sub for message distribution
   - Persistent connections for active jobs

## Key Features

### Audio Processing Pipeline

1. **Input**: FLAC file upload or YouTube URL
2. **Conversion**: Convert to 24-bit/48kHz WAV
3. **Analysis**: Detect tempo/BPM
4. **Separation**: AI-powered stem isolation
   - Vocals
   - Drums
   - Bass
   - Guitar
   - Keys
   - Other
5. **Metadata**: Embed tempo information
6. **Project Generation**: Create Cubase .cpr file
7. **Packaging**: ZIP with all stems + project

### Quality Modes

- **Fast Mode**: ~2x real-time processing
- **High Quality Mode**: ~5x real-time processing (better separation quality)

## Technology Stack

### Frontend
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Shadcn/ui components
- React Query (TanStack Query)
- Zustand (state management)
- Framer Motion (animations)

### Backend
- FastAPI (Python 3.11)
- SQLAlchemy (async)
- Alembic (migrations)
- Celery (task queue)
- Redis (broker/cache)
- PostgreSQL 16

### Audio Processing
- Demucs (stem separation)
- Librosa (tempo detection)
- FFmpeg (conversion)
- yt-dlp (YouTube download)
- Mutagen (metadata)

### Infrastructure
- Google Cloud Platform
- Cloud Run (serverless containers)
- Cloud SQL (managed PostgreSQL)
- Memorystore (managed Redis)
- Cloud Storage (object storage)
- Cloud Load Balancing
- Terraform (IaC)
- GitHub Actions (CI/CD)

## Development Workflow

1. **Local Development**: Docker Compose with hot-reload
2. **Git Workflow**: Feature branches → PR → Main
3. **CI/CD**: GitHub Actions auto-deploys on merge
4. **Monitoring**: Cloud Monitoring dashboards
5. **Logs**: Centralized logging in Cloud Logging

## Cost Estimates

### MVP (Low Traffic)
- Cloud Run: ~$10-20/month
- Cloud SQL: ~$10/month
- Memorystore: ~$30/month
- Cloud Storage: ~$1-5/month
- **Total: ~$50-65/month**

### Production (Higher Traffic)
- Scale up Cloud Run instances
- Upgrade Cloud SQL tier
- Increase Memorystore capacity
- Expected: $100-300/month

## Security

- HTTPS everywhere with managed SSL certificates
- VPC for private networking
- IAM with least-privilege principles
- Secrets management via GitHub Secrets
- SQL injection prevention via ORM
- CORS configured for specific origins

## Performance

- CDN caching for frontend assets
- Cloud Run auto-scaling (0-10 instances)
- Database connection pooling
- Redis caching for frequently accessed data
- Optimized Docker images

## Support & Contributing

- **Issues**: [GitHub Issues](https://github.com/yourusername/RehearseKit/issues)
- **Contributing**: See [CONTRIBUTING.md](../CONTRIBUTING.md)
- **License**: MIT

## Roadmap

### Future Enhancements
- User authentication and accounts
- Project history and favorites
- Additional DAW support (Logic Pro, Ableton)
- More stem separation models
- Batch processing
- API rate limiting
- Payment integration for premium features

## Documentation Index

1. [Local Development Guide](./local-development.md)
   - Mac M1 and WSL setup
   - Docker Compose configuration
   - Database management
   - Troubleshooting

2. [Deployment Guide](./deployment.md)
   - GCP infrastructure setup
   - Terraform configuration
   - GitHub Actions CI/CD
   - DNS configuration
   - Monitoring and alerts

3. [API Documentation](./api.md)
   - REST API reference
   - WebSocket API
   - Authentication (future)
   - Rate limiting (future)
   - Examples in multiple languages

## Troubleshooting

For common issues and solutions, see:
- [Local Development Troubleshooting](./local-development.md#troubleshooting)
- [Deployment Troubleshooting](./deployment.md#troubleshooting)

## Contact

- **Website**: https://rehearsekit.uk
- **Email**: admin@rehearsekit.uk
- **GitHub**: https://github.com/yourusername/RehearseKit


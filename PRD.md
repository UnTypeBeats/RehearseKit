# Product Requirements Document (PRD)
## RehearseKit - Your Complete Rehearsal Toolkit

**Domain**: rehearsekit.uk  
**Version**: 1.0 MVP  
**Last Updated**: January 2025

---

## 1. Executive Summary

### Product Vision
**RehearseKit** is a self-hosted web application that transforms audio files or YouTube music videos into professionally separated stems with embedded tempo information, automatically generating Cubase project files for musicians and producers to use in rehearsals and production workflows.

### Brand Story

**The Problem**: Musicians spend hours manually preparing backing tracks, isolating instruments, and setting up DAW projects before they can even start rehearsing. This tedious process kills creative momentum and wastes valuable practice time.

**The Solution**: RehearseKit is your complete toolkit for rehearsal preparation. Just as a craftsperson wouldn't start work without the right tools laid out and ready, musicians shouldn't start rehearsal without properly prepared tracks. RehearseKit does the heavy lifting—separating stems, detecting tempo, and creating ready-to-use DAW projects—so you can focus on what matters: making music.

**The Philosophy**: We believe rehearsal preparation should be measured in minutes, not hours. RehearseKit empowers musicians to spend less time on technical setup and more time perfecting their craft.

### Target Audience
- **Primary**: Musicians, band members, and audio engineers preparing for rehearsals
- **Secondary**: Music producers, educators, and hobbyists working on covers or learning songs
- **Geographic**: Initially UK-focused, expanding globally
- **Technical Profile**: Users comfortable with self-hosting via Docker, basic understanding of DAW workflows

### Value Proposition
Transform any audio source into a ready-to-use rehearsal project in minutes, eliminating manual stem separation, tempo detection, and DAW project setup tasks.

---

## 2. Brand Identity

### Brand Name
**RehearseKit**

### Tagline Options
- **Primary**: "Your Complete Rehearsal Toolkit"
- **Alternative 1**: "From Track to Practice in Minutes"
- **Alternative 2**: "Craft Your Perfect Rehearsal"

### Brand Personality
- **Professional**: Reliable, precise, production-quality
- **Empowering**: Puts powerful tools in musicians' hands
- **Efficient**: Saves time, streamlines workflows
- **Approachable**: Not intimidating, developer-friendly
- **Craftsmanship**: Attention to detail, quality-focused

### Visual Identity

#### Color Palette

**Primary Colors**:
- **Kit Blue** (Primary): `#2563EB` (rgb: 37, 99, 235)
  - Professional, trustworthy, tech-forward
  - Use for: Primary buttons, links, active states
  
- **Deep Navy** (Primary Dark): `#1E293B` (rgb: 30, 41, 59)
  - Sophisticated, professional
  - Use for: Headers, text, dark mode backgrounds

**Secondary Colors**:
- **Rehearsal Purple** (Accent): `#7C3AED` (rgb: 124, 58, 237)
  - Creative, musical, energetic
  - Use for: Highlights, progress indicators, audio waveforms

- **Success Green**: `#10B981` (rgb: 16, 185, 129)
  - Use for: Completed jobs, success messages

- **Warning Amber**: `#F59E0B` (rgb: 245, 158, 11)
  - Use for: Processing status, warnings

- **Error Red**: `#EF4444` (rgb: 239, 68, 68)
  - Use for: Errors, failed jobs

**Neutral Colors**:
- **Slate Gray** (Text): `#64748B` (rgb: 100, 116, 139)
- **Light Gray** (Backgrounds): `#F8FAFC` (rgb: 248, 250, 252)
- **White**: `#FFFFFF`
- **Black**: `#0F172A` (rgb: 15, 23, 42)

#### Tailwind CSS Configuration
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        'kit': {
          blue: '#2563EB',
          navy: '#1E293B',
          purple: '#7C3AED',
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
        },
        'rehearse': {
          50: '#F0F4FF',
          100: '#E0EAFF',
          200: '#C7D7FE',
          300: '#A5B8FC',
          400: '#818CF8',
          500: '#2563EB',  // Primary
          600: '#1D4ED8',
          700: '#1E3A8A',
          800: '#1E293B',  // Navy
          900: '#0F172A',
        }
      }
    }
  }
}
```

#### Typography
- **Headings**: Inter (Bold, 600-700 weight)
- **Body**: Inter (Regular, 400-500 weight)
- **Monospace/Code**: JetBrains Mono or Fira Code

#### Logo Concept
**Icon**: Stylized toolkit box with audio waveform emerging from it
- Box represents the "kit" concept
- Waveform represents audio processing
- Can work as standalone icon or with wordmark

**Variations**:
1. Full logo (icon + wordmark)
2. Icon only (for favicon, mobile)
3. Wordmark only (for tight spaces)

#### UI Design Principles
- **Clean & Modern**: Minimal clutter, generous whitespace
- **Functional**: Every element serves a purpose
- **Responsive**: Mobile-first design approach
- **Accessible**: WCAG 2.1 AA compliance minimum
- **Progressive Disclosure**: Show complexity only when needed

---

## 3. Product Overview

### What is RehearseKit?

**RehearseKit** is a self-hosted audio processing web application that:

1. **Accepts audio sources**: FLAC files or YouTube music video URLs
2. **Processes audio**: Converts to professional-grade WAV (24-bit/48kHz)
3. **Analyzes music**: Detects tempo with precision
4. **Separates stems**: Isolates vocals, drums, bass, guitars, keys, and other instruments
5. **Embeds metadata**: Ensures all stems contain tempo information
6. **Generates DAW projects**: Creates Cubase-compatible project files with stems pre-loaded

### Core Features

#### Feature 1: Audio Input & Conversion
- **Upload FLAC files** via drag-and-drop or file browser
- **YouTube URL input** with automatic audio extraction
- **Automatic conversion** to 24-bit/48kHz WAV format
- **Input validation** (file size limits, format verification)
- **Progress tracking** with real-time status updates

#### Feature 2: Audio Analysis & Processing
- **Tempo Detection**: BPM analysis with confidence scoring
- **Stem Separation**: AI-powered source separation into 6 tracks:
  - Vocals
  - Drums
  - Bass
  - Guitars
  - Keys
  - Other (ambient, synths, misc instruments)
- **Quality Options**: Fast vs. High-Quality processing modes
- **Metadata Embedding**: Tempo info written to each stem file

#### Feature 3: DAW Project Generation
- **Cubase Project Creation**: .cpr file generation with:
  - All stems pre-loaded and named
  - Tempo track configured
  - Basic mixer setup (volume levels, panning)
  - Track colors and organization
- **Project Settings**: Matching sample rate and bit depth
- **Download Package**: ZIP containing all stems + project file

#### Feature 4: Job Management
- **Processing Queue**: Handle multiple jobs concurrently
- **Job History**: View past conversions with metadata
- **Re-download**: Access previously processed projects
- **Job Cleanup**: Automatic deletion after configurable retention period

---

## 4. How Do I Use RehearseKit?

### User Journey

```
1. Visit rehearsekit.uk
   ↓
2. Choose Input Method
   ├─→ Upload FLAC file
   └─→ Paste YouTube URL
   ↓
3. Configure Processing Options
   ├─→ Quality setting (Fast/High)
   ├─→ Project name
   └─→ Optional: Manual BPM override
   ↓
4. Submit Job
   ↓
5. Monitor Progress
   ├─→ Real-time status updates
   ├─→ Processing stages displayed
   └─→ Estimated time remaining
   ↓
6. Review Results
   ├─→ Detected BPM displayed
   ├─→ Preview stems (inline player)
   └─→ See file sizes/durations
   ↓
7. Download Package
   ├─→ Individual stems available
   └─→ Complete ZIP with Cubase project
   ↓
8. Import to Cubase
   └─→ Open .cpr file and start rehearsing
```

### Primary Use Cases

**Use Case 1: Band Rehearsal Preparation**
- **Actor**: Band member preparing for practice
- **Goal**: Create backing tracks with isolated instruments
- **Flow**: Upload song → Process → Download → Import to Cubase → Practice with band

**Use Case 2: Cover Song Production**
- **Actor**: Producer creating a cover version
- **Goal**: Analyze original arrangement and recreate parts
- **Flow**: YouTube URL → Separate stems → Study individual parts → Record cover

**Use Case 3: Music Learning**
- **Actor**: Musician learning complex parts
- **Goal**: Isolate specific instruments to learn technique
- **Flow**: Upload audio → Extract guitar/bass/keys → Loop and practice

---

## 5. Technical Architecture & Patterns

### Architectural Patterns

#### **Pattern 1: Backend-for-Frontend (BFF)**
- Next.js handles UI and light business logic
- Backend API (FastAPI) handles heavy audio processing
- Clear separation of concerns, optimal for resource-intensive tasks

#### **Pattern 2: Job Queue Pattern**
- Asynchronous processing with Celery + Redis
- Non-blocking UI while processing occurs
- Horizontal scalability for multiple concurrent jobs

#### **Pattern 3: Container Orchestration**
- Docker Compose for local development
- Production-ready for TrueNAS Scale deployment
- Isolated services: Frontend, Backend API, Worker, Redis, PostgreSQL

#### **Pattern 4: Event-Driven Architecture**
- WebSocket connections for real-time progress updates
- SSE (Server-Sent Events) as fallback
- Reactive UI updates without polling

### Technology Stack

#### **Frontend: Next.js 14+ with App Router**
**Rationale**:
- Server-side rendering for better performance
- API routes for backend communication
- Built-in optimization (image, font, code splitting)
- TypeScript support for type safety
- Excellent developer experience

**Libraries**:
- **Tailwind CSS**: Utility-first styling with RehearseKit theme
- **Shadcn/ui**: Accessible, customizable component library
- **React Query (TanStack Query)**: Server state management, caching
- **Zustand**: Client state management (lightweight)
- **Framer Motion**: Smooth animations for progress indicators
- **Howler.js**: Audio preview player
- **Lucide React**: Icon library (consistent with brand)

#### **Backend: FastAPI**
**Rationale**:
- Automatic API documentation (Swagger/OpenAPI)
- Type safety with Pydantic models
- Native async/await for better concurrency
- Performance advantages for I/O-bound operations
- Modern Python 3.11+ features
- Built-in WebSocket support

**Backend Libraries**:
- **Celery**: Distributed task queue for async processing
- **Redis**: Message broker + caching
- **SQLAlchemy**: Database ORM
- **Alembic**: Database migrations
- **Pydantic**: Data validation
- **yt-dlp**: YouTube audio extraction
- **librosa**: Audio analysis (tempo detection)
- **Demucs**: AI stem separation (Meta's open-source model)
- **pydub**: Audio file manipulation
- **FFmpeg**: Audio conversion
- **mutagen**: Audio metadata handling
- **python-multipart**: File upload handling

#### **Database: PostgreSQL**
**Rationale**:
- Job tracking and history
- User preferences (if auth added later)
- Reliable and feature-rich
- Good Docker support

### Container Architecture

```yaml
# docker-compose.yml structure
services:
  frontend:
    # Next.js app
    image: rehearsekit-frontend:latest
    ports: 
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8000
      - NEXT_PUBLIC_APP_NAME=RehearseKit
    
  backend:
    # FastAPI application
    image: rehearsekit-backend:latest
    ports: 
      - "8000:8000"
    depends_on:
      - postgres
      - redis
    
  worker:
    # Celery worker for processing
    image: rehearsekit-worker:latest
    depends_on:
      - backend
      - redis
    
  redis:
    # Message broker + cache
    image: redis:7-alpine
    
  postgres:
    # Database
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=rehearsekit
      - POSTGRES_USER=rehearsekit
    
  nginx:
    # Reverse proxy (production only)
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
```

### Processing Pipeline

```python
# High-level processing flow
1. Input Reception (FastAPI endpoint)
   └─→ POST /api/jobs/create
   ↓
2. Job Creation (Postgres record)
   └─→ Status: PENDING
   ↓
3. Queue Task (Celery)
   └─→ Task: process_audio_job
   ↓
4. Audio Acquisition
   ├─→ File upload: Save to /tmp/uploads/
   └─→ YouTube: yt-dlp download to /tmp/downloads/
   ↓
5. Audio Conversion
   └─→ FFmpeg: Convert to 24-bit/48kHz WAV
   └─→ Status: CONVERTING
   ↓
6. Tempo Detection
   └─→ Librosa: BPM analysis + beat tracking
   └─→ Status: ANALYZING
   ↓
7. Stem Separation
   └─→ Demucs: AI-powered source separation
   └─→ Status: SEPARATING (30-70% of total time)
   ↓
8. Metadata Embedding
   └─→ Mutagen: Write tempo to each WAV file
   └─→ Status: FINALIZING
   ↓
9. Cubase Project Generation
   └─→ XML generation: Create .cpr file
   ↓
10. Package Creation
    └─→ ZIP: Bundle stems + project file
    └─→ Status: PACKAGING
    ↓
11. Cleanup & Notification
    └─→ Temp file deletion
    └─→ Status: COMPLETED
    └─→ WebSocket notification to frontend
```

---

## 6. Making RehearseKit Most Useful

### User Experience Principles

#### **1. Transparency**
- **Real-time progress**: Visual feedback for each processing stage with Kit Purple progress bars
- **Error handling**: Clear error messages with recovery suggestions
- **Processing time estimates**: Based on audio duration and quality setting
- **System status**: Health indicator in header (green dot = all systems operational)

#### **2. Flexibility**
- **Quality vs. Speed**: Toggle between Fast and High-Quality modes
- **Manual overrides**: Option to manually set BPM if auto-detection is incorrect
- **Partial downloads**: Download individual stems before complete processing
- **Re-processing**: Re-run with different settings without re-uploading

#### **3. Reliability**
- **Resume capability**: Jobs survive server restarts
- **Retry logic**: Automatic retry for transient failures (3 attempts)
- **Storage management**: Automatic cleanup with 7-day default retention
- **Health checks**: `/api/health` endpoint for monitoring

#### **4. Accessibility**
- **Keyboard navigation**: Full keyboard support with visible focus indicators
- **Screen reader support**: Proper ARIA labels and semantic HTML
- **Mobile responsive**: Works on tablets for remote server access
- **Dark mode**: Reduce eye strain during long sessions (Kit Navy backgrounds)
- **Color contrast**: All text meets WCAG AA standards (4.5:1 minimum)

### UI Components & Branding

#### **Header/Navigation**
```
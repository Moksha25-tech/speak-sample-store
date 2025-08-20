# Survey — Voice Recording Application

A production-ready web application for recording voice clips of food item names. Users can record, play back, and upload short audio clips for pronunciation data collection.

![Survey App Preview](https://via.placeholder.com/800x400/4A90E2/FFFFFF?text=Survey+Voice+Recording+App)

## 🚀 Features

- **Voice Recording**: Record up to 30-second audio clips using MediaRecorder API
- **Real-time Playback**: Play back recordings before uploading
- **Smart Upload**: Upload recordings with metadata to backend storage
- **Search & Filter**: Find items quickly with live search
- **Responsive Design**: Works seamlessly on desktop and tablet
- **Accessibility**: Full keyboard navigation and screen reader support
- **API Management**: Complete REST API for recording management

## 🛠 Tech Stack

### Frontend
- **Vite** + **React** + **TypeScript**
- **TailwindCSS** + **shadcn/ui** for beautiful, consistent UI
- **MediaRecorder API** for audio recording
- **UUID** for session tracking

### Backend
- **Node.js** + **Express** for robust API server
- **Multer** for file upload handling
- **Pino** for structured logging
- **Helmet** + **CORS** for security
- **Rate limiting** for API protection

## 📋 Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** or **yarn**
- **Modern browser** with MediaRecorder API support
- **HTTPS or localhost** (required for microphone access)

## 🏃‍♂️ Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd survey-voice-recording

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 2. Environment Setup

```bash
# Frontend environment
cp .env.example .env
# Edit .env to match your backend URL

# Backend environment
cp backend/.env.example backend/.env
# Edit backend/.env for your configuration
```

### 3. Start Development Servers

```bash
# Terminal 1: Start backend (from project root)
cd backend
npm run dev

# Terminal 2: Start frontend (from project root)
npm run dev
```

### 4. Open Application

- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:4000
- **Health Check**: http://localhost:4000/api/health

## 🎤 How to Use

1. **Grant Microphone Permission**: Allow microphone access when prompted
2. **Select an Item**: Click on any food item from the list
3. **Record**: Press "Record" and speak the item name clearly
4. **Review**: Use "Play" to listen to your recording
5. **Upload or Retake**: Upload if satisfied, or retake if needed
6. **Track Progress**: See your session count in the controls bar

### Keyboard Shortcuts

- **Space**: Toggle recording for active item
- **Enter**: Upload ready recording
- **Escape**: Clear active item

## 📁 Project Structure

```
survey-voice-recording/
├── src/                     # Frontend source code
│   ├── components/          # React components
│   │   ├── Header.tsx       # App header with settings
│   │   ├── ControlsBar.tsx  # Search, sort, and stats
│   │   └── ItemRow.tsx      # Individual item recorder
│   ├── hooks/               # Custom React hooks
│   │   └── useRecorder.ts   # MediaRecorder wrapper
│   ├── lib/                 # Utilities
│   │   └── api.ts           # API client functions
│   ├── data/                # Static data
│   │   └── items.json       # Food items list
│   └── pages/               # Page components
│       └── Index.tsx        # Main application page
├── backend/                 # Backend server
│   ├── routes/              # API route handlers
│   │   └── recordings.js    # Recording CRUD operations
│   ├── middleware/          # Express middleware
│   │   └── upload.js        # File upload handling
│   ├── utils/               # Backend utilities
│   │   ├── logger.js        # Structured logging
│   │   └── ensureDirs.js    # Directory initialization
│   ├── recordings/          # Uploaded audio files
│   ├── logs/                # Daily JSON logs
│   └── server.js            # Express app setup
└── docs/                    # Documentation
```

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Server health check |
| `POST` | `/api/upload-recording` | Upload audio file + metadata |
| `GET` | `/api/recordings` | List all recordings (with filters) |
| `GET` | `/api/recording-logs?date=YYYY-MM-DD` | Get daily logs |
| `GET` | `/api/download/:filename` | Download specific recording |
| `DELETE` | `/api/recordings/:filename` | Delete recording and log entry |

### Example API Calls

#### Upload Recording (cURL)
```bash
curl -X POST http://localhost:4000/api/upload-recording \\
  -F "file=@recording.webm" \\
  -F 'meta={"itemName":"Idli","timestamp":"2025-08-20T10:30:00.000Z","durationMs":2500,"locale":"en-IN","sessionId":"uuid-here","deviceInfo":{"userAgent":"Mozilla/5.0..."},"appVersion":"survey-1.0.0"}'
```

#### List Recordings (cURL)
```bash
# All recordings
curl http://localhost:4000/api/recordings

# Filter by item
curl "http://localhost:4000/api/recordings?item=idli"

# Filter by date
curl "http://localhost:4000/api/recordings?date=2025-08-20"
```

#### Download Recording (cURL)
```bash
curl -O http://localhost:4000/api/download/survey_idli_2025-08-20T10-30-00-000Z_abc12345.webm
```

#### Delete Recording (cURL)
```bash
curl -X DELETE http://localhost:4000/api/recordings/survey_idli_2025-08-20T10-30-00-000Z_abc12345.webm
```

## 🧪 Testing with Postman

Import the included **Postman collection** for easy API testing:

1. Open Postman
2. Import `backend/postman-collection.json`
3. Set the `baseUrl` variable to your backend URL
4. Test all endpoints with sample data

## 🚀 Production Deployment

### Backend Deployment

**Option 1: Render/Railway/Fly.io**
```bash
# Set environment variables in your platform
PORT=4000
NODE_ENV=production
CORS_ORIGIN=https://your-frontend-domain.com
```

**Option 2: VPS/EC2**
```bash
# Install PM2 for process management
npm install -g pm2

# Start backend
cd backend
pm2 start server.js --name survey-backend
pm2 startup
pm2 save
```

### Frontend Deployment

**Option 1: Netlify/Vercel**
```bash
# Build the frontend
npm run build

# Deploy dist/ folder
# Set VITE_API_BASE_URL to your backend URL
```

**Option 2: Static hosting (GitHub Pages, etc.)**
```bash
npm run build
# Upload dist/ contents to your host
```

### Environment Variables

**Frontend (.env)**
```bash
VITE_API_BASE_URL=https://your-backend-domain.com
```

**Backend (.env)**
```bash
PORT=4000
NODE_ENV=production
CORS_ORIGIN=https://your-frontend-domain.com,https://additional-domain.com
RECORDINGS_DIR=./recordings
LOGS_DIR=./logs
MAX_DURATION_SEC=30
MAX_FILE_MB=10
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=20
```

## 🔒 Security Features

- **Rate Limiting**: 20 requests per minute per IP
- **File Validation**: Only accepts audio/webm files
- **Size Limits**: Max 10MB files, 30-second duration
- **Path Traversal Protection**: Validates all filenames
- **CORS Protection**: Configurable origin allowlist
- **Helmet Security**: Standard security headers
- **Input Sanitization**: Validates all metadata

## 📊 File Storage & Logging

### Audio Files
- **Location**: `backend/recordings/`
- **Format**: `survey_{item}_{timestamp}_{uuid}.webm`
- **Example**: `survey_idli_2025-08-20T10-30-00-000Z_abc12345.webm`

### Daily Logs
- **Location**: `backend/logs/`
- **Format**: `recording_log_YYYY-MM-DD.json`
- **Contents**: Full metadata, IP, user agent, file size

## 🐛 Troubleshooting

### Common Issues

**Microphone Permission Denied**
- Ensure HTTPS or localhost
- Check browser permissions
- Try hard refresh (Ctrl+F5)

**Upload Failures**
- Check file size (<10MB)
- Verify audio format (webm)
- Check network connectivity
- Review backend logs

**CORS Errors**
- Verify CORS_ORIGIN in backend .env
- Ensure frontend URL is whitelisted
- Check for trailing slashes in URLs

### Debug Mode

```bash
# Backend verbose logging
NODE_ENV=development npm run dev

# Frontend with network inspection
# Open browser DevTools > Network tab
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **shadcn/ui** for beautiful, accessible components
- **MediaRecorder API** for seamless audio recording
- **Pino** for excellent structured logging
- **Express** ecosystem for robust backend foundation

---

**Built with ❤️ for pronunciation research and data collection**
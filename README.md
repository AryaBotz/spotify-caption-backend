## Spotify Caption Backend

Fast, reliable audio transcription backend for the Spotify Caption system. Converts PCM audio from ESP32 to text using Groq's Whisper API.

### Features

✅ **Reliable** - Handles errors, timeouts, cleanup gracefully  
✅ **Secure** - No command injection, validates input  
✅ **Efficient** - Minimal memory footprint, proper resource cleanup  
✅ **Observable** - Structured logging for debugging  
✅ **Production-Ready** - Graceful shutdown, health checks  

### Architecture

```
ESP32 (PCM Audio)
    ↓ (HTTP POST)
Backend (Node.js)
    ↓ (ffmpeg)
WAV File
    ↓ (form-data)
Groq Whisper API
    ↓ (JSON response)
ESP32 (Transcription Text)
```

### Endpoints

#### Health Check
```http
GET /api/status
```

**Response (200 OK):**
```json
{
  "status": "healthy",
  "service": "spotify-caption-backend",
  "version": "1.1.0",
  "environment": {
    "groqApiKeyConfigured": true,
    "tmpDirWritable": true,
    "tmpDir": "/tmp"
  },
  "system": {
    "uptime": 3600,
    "memoryUsagePercent": 45,
    "nodeVersion": "v18.0.0"
  },
  "timestamp": "2026-06-16T12:00:00.000Z"
}
```

#### Transcribe Audio
```http
POST /api/transcribe
Content-Type: application/octet-stream

[raw PCM binary data]
```

**Request Parameters:**
- Body: Raw PCM audio (16-bit signed LE, 44.1 kHz, mono or stereo)
- Size: 8KB - 5MB (roughly 0.1 sec - 60 sec)

**Response (200 OK):**
```json
{
  "text": "hello world this is a test",
  "audioSize": 176400,
  "timestamp": "2026-06-16T12:00:00.000Z"
}
```

**Error Responses:**

| Status | Error | Cause |
|--------|-------|-------|
| 400 | Invalid request | Body missing or not binary |
| 400 | Audio too short | < 8KB |
| 413 | Audio too large | > 5MB |
| 408 | Request timeout | Processing > 45 seconds |
| 429 | API rate limited | Groq quota exceeded |
| 503 | Service misconfiguration | GROQ_API_KEY not set |
| 500 | Transcription failed | ffmpeg or other error |

### Setup

#### 1. Install Dependencies

```bash
npm install
```

#### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and set GROQ_API_KEY
```

Get your Groq API key from [console.groq.com](https://console.groq.com)

#### 3. Install ffmpeg (Required)

**macOS:**
```bash
brew install ffmpeg
```

**Linux (Ubuntu/Debian):**
```bash
apt-get install ffmpeg
```

**Railway:**
Railway's Node.js environment already includes ffmpeg. No additional setup needed.

#### 4. Run Locally

```bash
npm start
```

Server will listen on `http://localhost:3000`

### Deployment on Railway

1. Push to GitHub
2. Connect repository to Railway
3. Set environment variables:
   - `GROQ_API_KEY` = your key
   - `NODE_ENV` = production
   - `PORT` = 8000 (Railway default)
4. Railway automatically installs ffmpeg in the build environment

### Performance Tuning

#### For lower latency:

```env
LOG_LEVEL=warn           # Less logging overhead
NODE_ENV=production      # Optimizations enabled
```

#### For debugging:

```env
LOG_LEVEL=debug          # See all operations
NODE_ENV=development     # Better error messages
```

#### Audio buffering on ESP32:

- Minimum buffer: 0.5 seconds (8-9 KB)
- Recommended: 2-3 seconds (35-53 KB)
- Maximum practical: 5 seconds (88 KB)

### Testing

#### Health Check

```bash
curl http://localhost:3000/api/status
```

#### Transcribe (with test audio)

```bash
# Generate 2-second mono PCM test audio at 44.1kHz
ffmpeg -f lavfi -i "sine=f=440:d=2" -f s16le -ar 44100 -ac 1 test_audio.raw

# Send to backend
curl -X POST \
  -H "Content-Type: application/octet-stream" \
  --data-binary @test_audio.raw \
  http://localhost:3000/api/transcribe
```

### Architecture Decisions

#### Why Whisper (Groq)?
- Fast (< 10 seconds for 60-sec audio)
- Accurate for music/speech
- No local GPU needed
- Handles multiple languages

#### Why ffmpeg?
- Standard format conversion
- Handles various input formats
- Already in Railway environment
- Battle-tested reliability

#### Why temp files?
- Groq API expects file upload
- Atomic cleanup after use
- Prevents accumulation

#### Why unique file IDs?
- Prevents race conditions from concurrent requests
- Each request gets isolated temp files
- Safe for multi-instance deployments

### Production Checklist

- [x] GROQ_API_KEY configured
- [x] CORS origins restricted (if needed)
- [x] LOG_LEVEL set appropriately
- [x] Node.js >= 18
- [x] ffmpeg available in environment
- [x] /tmp directory writable and monitored
- [x] Request timeout configured
- [x] Error handling covers edge cases
- [x] Monitoring/alerts set up for failed transcriptions

### Troubleshooting

#### "GROQ_API_KEY not set in environment"
```bash
# Check .env file exists and has the key
cat .env | grep GROQ_API_KEY
```

#### "ffmpeg: command not found"
```bash
# Install ffmpeg or check PATH
which ffmpeg
brew install ffmpeg  # or apt-get install ffmpeg
```

#### Slow transcriptions (> 20 seconds)
- Check Groq API status at [status.groq.com](https://status.groq.com)
- Verify network latency to API endpoint
- Reduce audio file size
- Check Railway CPU usage

#### Out of disk space
- Check `/tmp` directory: `df -h /tmp`
- Railway instances reset daily (ephemeral filesystem)
- Temp files are auto-deleted after each request
- If issue persists, check for hanging processes: `lsof /tmp`

### License

MIT

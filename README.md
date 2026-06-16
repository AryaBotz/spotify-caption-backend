# Spotify Caption Backend

Backend untuk menerima audio dari ESP32 dan melakukan transkripsi menggunakan STT (Whisper).

## Endpoint

### Health check
GET /api/status

Response:
{
  "status": "ok"
}

### Transcribe audio
POST /api/transcribe

Body:
- raw PCM 16-bit audio (binary)

Response:
{
  "text": "hasil transkripsi"
}

## Cara run lokal

```bash
npm install
npm start

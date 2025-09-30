# Image Processor Web App

A production-ready, full-stack image processing application built with React, Express, TypeScript, and Sharp. Upload images up to 50MB and perform operations like resize, crop, compress, and format conversion.

## 🚀 Features

- **Image Upload**: Drag & drop interface with client-side validation (max 50MB)
- **Image Processing**: Resize, crop, compress, and convert between formats (JPEG, PNG, WebP)
- **Security**: File signature validation, MIME type checking, rate limiting, security headers
- **Storage**: Local disk storage with configurable cleanup
- **Production-Ready**: Docker support, health checks, graceful shutdown, logging
- **TypeScript**: Full type safety across frontend and backend
- **Modern Stack**: React + Vite, Express, Tailwind CSS, Sharp

## 📋 Tech Stack

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS
- React Dropzone
- Axios

### Backend
- Node.js 20+ + TypeScript
- Express
- Sharp (image processing)
- Multer (file uploads)
- Winston (logging)
- Helmet (security)
- Express Rate Limit

### Infrastructure
- Docker + Docker Compose
- Nginx (reverse proxy)
- Jest + Supertest (testing)
- GitHub Actions (CI/CD)

## 📁 Project Structure

```
image-app/
├── backend/
│   ├── src/
│   │   ├── controllers/      # Image processing logic
│   │   ├── routes/            # API routes
│   │   ├── middleware/        # Express middleware
│   │   ├── services/          # Storage & metadata services
│   │   ├── utils/             # Utilities & config
│   │   ├── types/             # TypeScript types
│   │   └── server.ts          # Express app entry point
│   ├── tests/                 # Unit & integration tests
│   ├── uploads/               # Upload directory
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── App.tsx            # Main app component
│   │   └── types.ts           # TypeScript types
│   ├── Dockerfile
│   └── package.json
├── nginx/
│   └── nginx.conf             # Production nginx config
├── .github/
│   └── workflows/
│       └── ci.yml             # GitHub Actions workflow
├── docker-compose.yml
├── .env.example
└── README.md
```

## 🛠️ Setup & Installation

### Prerequisites

- Node.js 20+
- npm or yarn
- Docker & Docker Compose (optional, for containerized deployment)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd image-app
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp ../.env.example .env
   # Edit .env with your configuration
   npm run dev
   ```

3. **Frontend Setup** (in a new terminal)
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001
   - Health check: http://localhost:3001/health

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Server Configuration
NODE_ENV=development
PORT=3001
HOST=0.0.0.0

# CORS Configuration
CORS_ORIGIN=http://localhost:5173

# Upload Configuration
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=52428800              # 50MB
ALLOWED_MIME_TYPES=image/jpeg,image/png,image/webp,image/gif

# Cleanup Configuration
CLEANUP_TTL_HOURS=24                # Delete files older than 24 hours
CLEANUP_INTERVAL_HOURS=6            # Run cleanup every 6 hours

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000         # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# Disk Quota
MAX_DISK_QUOTA=10737418240          # 10GB
```

## 🧪 Testing

### Backend Tests

```bash
cd backend
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm test -- --coverage   # Generate coverage report
```

### Frontend Linting & Type Checking

```bash
cd frontend
npm run lint             # Run ESLint
npm run typecheck        # TypeScript type checking
```

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

1. **Build and start all services**
   ```bash
   docker-compose up -d
   ```

2. **Access the application**
   - Frontend: http://localhost
   - Backend API: http://localhost:3001

3. **View logs**
   ```bash
   docker-compose logs -f
   ```

4. **Stop services**
   ```bash
   docker-compose down
   ```

5. **Clean up volumes**
   ```bash
   docker-compose down -v
   ```

### Building Individual Images

```bash
# Backend
docker build -t image-processor-backend ./backend

# Frontend
docker build -t image-processor-frontend ./frontend
```

## 📡 API Reference

### Upload Image

```bash
curl -X POST http://localhost:3001/api/upload \
  -F "image=@/path/to/image.jpg"
```

**Response:**
```json
{
  "fileId": "550e8400-e29b-41d4-a716-446655440000",
  "originalName": "image.jpg",
  "size": 1024000,
  "previewUrl": "/api/images/raw/550e8400-e29b-41d4-a716-446655440000.jpg"
}
```

### Process Image

```bash
curl -X POST http://localhost:3001/api/process \
  -H "Content-Type: application/json" \
  -d '{
    "fileId": "550e8400-e29b-41d4-a716-446655440000",
    "operations": [
      {
        "type": "resize",
        "params": {
          "width": 800,
          "height": 600,
          "fit": "cover"
        }
      },
      {
        "type": "convert",
        "params": {
          "format": "webp"
        }
      },
      {
        "type": "quality",
        "params": {
          "quality": 80
        }
      }
    ]
  }'
```

**Response:**
```json
{
  "fileId": "550e8400-e29b-41d4-a716-446655440000",
  "downloadUrl": "/api/images/processed/660e8400-e29b-41d4-a716-446655440001.webp",
  "processedSize": 512000
}
```

### Download Processed Image

```bash
curl -O http://localhost:3001/api/images/processed/660e8400-e29b-41d4-a716-446655440001.webp
```

### Delete Image

```bash
curl -X DELETE http://localhost:3001/api/images/550e8400-e29b-41d4-a716-446655440000
```

### List All Images (Admin)

```bash
curl http://localhost:3001/api/images
```

## 🔒 Security Features

- **File Validation**: Magic byte signature verification in addition to MIME type checking
- **Rate Limiting**: Per-IP rate limits for uploads and processing
- **Security Headers**: Helmet.js for HTTP security headers
- **CORS**: Configurable CORS policy
- **File Re-encoding**: Sharp re-encodes all images, stripping metadata and potential threats
- **Disk Quota**: Configurable storage limits with automatic cleanup
- **UUID Filenames**: Prevents path traversal and filename collision
- **Non-root User**: Docker containers run as non-root user

## 🚀 Production Deployment

### Prerequisites

- Linux server (Ubuntu 20.04+ recommended)
- Docker & Docker Compose
- Domain name (for SSL)
- Nginx (optional, for reverse proxy)

### Deployment Steps

1. **Clone repository on server**
   ```bash
   git clone <repository-url>
   cd image-app
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with production values
   # Set NODE_ENV=production
   # Set CORS_ORIGIN to your domain
   ```

3. **Start with Docker Compose**
   ```bash
   docker-compose up -d
   ```

4. **Setup SSL with Let's Encrypt** (optional)
   ```bash
   # Install certbot
   sudo apt install certbot python3-certbot-nginx

   # Obtain certificate
   sudo certbot --nginx -d your-domain.com

   # Update nginx/nginx.conf with your domain
   # Uncomment nginx service in docker-compose.yml
   docker-compose up -d nginx
   ```

5. **Setup systemd service** (alternative to docker-compose)

   Create `/etc/systemd/system/image-processor.service`:
   ```ini
   [Unit]
   Description=Image Processor Service
   After=docker.service
   Requires=docker.service

   [Service]
   Type=oneshot
   RemainAfterExit=yes
   WorkingDirectory=/path/to/image-app
   ExecStart=/usr/local/bin/docker-compose up -d
   ExecStop=/usr/local/bin/docker-compose down
   TimeoutStartSec=0

   [Install]
   WantedBy=multi-user.target
   ```

   Enable and start:
   ```bash
   sudo systemctl enable image-processor
   sudo systemctl start image-processor
   ```

6. **Setup monitoring & logging**
   - Configure log rotation for Docker logs
   - Monitor disk usage for uploads directory
   - Setup Sentry for error tracking (optional)

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure proper CORS origin
- [ ] Setup SSL/TLS certificates
- [ ] Configure firewall (allow 80, 443)
- [ ] Setup log rotation
- [ ] Configure backup for uploads volume
- [ ] Setup monitoring (Prometheus, Grafana, etc.)
- [ ] Configure rate limits appropriately
- [ ] Test backup and restore procedures
- [ ] Setup domain DNS records

## 🔧 Maintenance

### Backup Uploads

```bash
# Create backup
docker run --rm -v image-app_uploads_data:/data -v $(pwd):/backup ubuntu tar czf /backup/uploads-backup.tar.gz /data

# Restore backup
docker run --rm -v image-app_uploads_data:/data -v $(pwd):/backup ubuntu tar xzf /backup/uploads-backup.tar.gz -C /
```

### Manual Cleanup

```bash
# Enter backend container
docker exec -it image-processor-backend sh

# Run cleanup manually (from backend directory)
node -e "const {StorageService} = require('./dist/services/storage'); const s = new StorageService(); s.cleanupOldFiles(24);"
```

### Monitor Disk Usage

```bash
# Check volume size
docker system df -v

# Check uploads directory
docker exec image-processor-backend du -sh /app/uploads
```

## 🐛 Troubleshooting

### Common Issues

**Port already in use**
```bash
# Find process using port
lsof -i :3001
# Kill process
kill -9 <PID>
```

**Docker build fails**
```bash
# Clear Docker cache
docker builder prune -a
```

**File upload fails with 413**
- Increase `MAX_FILE_SIZE` in `.env`
- Check nginx `client_max_body_size` if using reverse proxy

**Out of disk space**
- Reduce `CLEANUP_TTL_HOURS`
- Reduce `MAX_DISK_QUOTA`
- Run manual cleanup

## 📝 License

MIT

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📧 Support

For issues and questions, please open a GitHub issue.

---

**Built with ❤️ using TypeScript, React, Express, and Sharp**

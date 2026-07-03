# Deployment Guide

## Option 1: Systemd (Linux)

### 1. Build và copy files

```bash
npm run build
sudo mkdir -p /opt/auction-cron-job
sudo cp -r dist node_modules package*.json /opt/auction-cron-job/
sudo cp .env /opt/auction-cron-job/
```

### 2. Setup systemd service

```bash
sudo cp auction-cron-job.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable auction-cron-job
sudo systemctl start auction-cron-job
```

### 3. Kiểm tra status

```bash
sudo systemctl status auction-cron-job
sudo journalctl -u auction-cron-job -f
```

---

## Option 2: Docker

### 1. Build image

```bash
docker build -t auction-cron-job:latest .
```

### 2. Run với docker-compose

```bash
# Tạo network nếu chưa có
docker network create auction-network

# Start service
docker-compose up -d

# Xem logs
docker-compose logs -f
```

### 3. Stop/restart

```bash
docker-compose down
docker-compose up -d
```

---

## Option 3: PM2 (Node.js process manager)

### 1. Cài PM2

```bash
npm install -g pm2
```

### 2. Chạy service

```bash
pm2 start dist/main.js --name auction-cron-job
pm2 save
pm2 startup
```

### 3. Monitoring

```bash
pm2 logs auction-cron-job
pm2 monit
```

---

## Khuyến nghị production

- **Systemd** nếu chạy trên Linux server độc lập
- **Docker** nếu có Kubernetes/Docker Swarm
- **PM2** nếu chạy cùng server với các Node.js service khác

## Health check

Service expose port 3000 (configurable via `PORT` env).  
Có thể thêm endpoint `/health` nếu cần monitoring.

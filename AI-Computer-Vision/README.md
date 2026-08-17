# InvoiceQu AI Computer Vision

Backend FastAPI untuk KYC selfie-only dan login dengan face recognition. Service ini dipanggil oleh Cloudflare Worker `workers/monolith-api`.

Engine vision memakai beberapa layer:

- InsightFace untuk face detection dan face embedding.
- YOLO untuk deteksi objek/fraud scene seperti HP, layar, atau objek mencurigakan.
- TensorFlow/Keras untuk model anti-spoofing/liveness custom.
- OpenCV tetap tersedia sebagai fallback ringan jika model tambahan belum siap.

## Database

Service ini langsung memakai Neon Postgres. Ambil connection string dari dashboard Neon akun `invoicequee@gmail.com`, lalu set:

```bash
COMPUTER_VISION_DB_URL="postgresql://USER:PASSWORD@HOST.neon.tech/DB?sslmode=require"
```

Tabel akan dibuat otomatis saat service start:

- `face_enrollments`
- `kyc_records`

Migrasi SQL yang sama tersedia di `migrations/001_create_vision_tables.sql` jika ingin dijalankan manual dengan `psql`.

## Jalankan Lokal

```bash
cd AI-Computer-Vision
python -m venv .venv
. .venv/bin/activate
pip install -r requirements-lite.txt
cp .env.example .env
uvicorn app.main:app --env-file .env --host 0.0.0.0 --port 8010
```

Gunakan `requirements-lite.txt` untuk AWS Free Tier atau mesin kecil. Gunakan `requirements-full.txt` hanya jika server cukup kuat untuk InsightFace, YOLO, dan TensorFlow.

Jika `python -m venv` atau `pip` belum tersedia di Ubuntu/Debian, pasang paket sistemnya dulu:

```bash
sudo apt install python3.12-venv python3-pip
```

Import `psycopg.rows` berasal dari dependency `psycopg[binary,pool]` di `requirements.txt`.

## Model AI

Semua model dikonfigurasi lewat environment variable, bukan disimpan langsung di repo.

```bash
INSIGHTFACE_ENABLED=false
INSIGHTFACE_MODEL_NAME="buffalo_l"

YOLO_ENABLED=false
YOLO_MODEL_PATH="/app/model_weights/fraud_scene.pt"

ANTI_SPOOF_ENABLED=false
ANTI_SPOOF_MODEL_PATH="/app/model_weights/anti_spoof.keras"
```

Jika `YOLO_MODEL_PATH` atau `ANTI_SPOOF_MODEL_PATH` kosong, service tetap jalan dan menandai provider tersebut sebagai unavailable di `/health`. InsightFace akan dipakai jika dependency dan modelnya tersedia; OpenCV fallback tetap aktif.

Catatan lisensi:

- Ultralytics YOLO memakai AGPL untuk open-source use case; aplikasi proprietary/production biasanya perlu Enterprise License.
- InsightFace code MIT, tetapi pretrained model InsightFace umumnya untuk non-commercial research dan perlu lisensi model untuk production/commercial use.

## Worker Env

Set URL service dan secret yang sama dengan service CV:

```bash
wrangler secret put COMPUTER_VISION_API_KEY
wrangler secret put AUTH_DB_URL
```

Set `COMPUTER_VISION_URL` di `workers/monolith-api/wrangler.toml` ke URL deploy service ini.

## Deploy AWS Free Tier Lite

Untuk AWS Free Tier, pakai mode lite dulu. Full TensorFlow, YOLO, dan InsightFace biasanya terlalu berat untuk instance free kecil.

Rekomendasi awal:

```text
Service: EC2
OS: Ubuntu 24.04 LTS x64
Instance: pilih yang bertanda Free tier eligible di console
Region: Singapore jika tersedia
Security Group: buka 22 dari My IP dan 80 dari Anywhere
Storage: default 8-10 GB
```

Hindari NAT Gateway, Load Balancer, RDS, dan Elastic IP idle agar tidak memicu biaya. Database tetap Neon.

Setup di EC2:

```bash
sudo apt update
sudo apt install -y python3.12-venv python3-pip git nginx

git clone https://github.com/fahmibae/invoiceque-ecosystem.git
cd invoiceque-ecosystem/AI-Computer-Vision

python3 -m venv .venv
. .venv/bin/activate
pip install --upgrade pip setuptools wheel
pip install -r requirements-lite.txt
cp .env.example .env
```

Isi `.env` dengan Neon URL dan secret Worker:

```bash
COMPUTER_VISION_DB_URL="postgresql://USER:PASSWORD@HOST.neon.tech/DB?sslmode=require"
COMPUTER_VISION_API_KEY="secret-yang-sama-dengan-worker"
INSIGHTFACE_ENABLED=false
YOLO_ENABLED=false
ANTI_SPOOF_ENABLED=false
```

Tes service:

```bash
uvicorn app.main:app --env-file .env --host 127.0.0.1 --port 8010
```

Nginx reverse proxy ke FastAPI:

```nginx
server {
    listen 80;
    server_name cv.invoicequ.my.id;

    location / {
        proxy_pass http://127.0.0.1:8010;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Di Cloudflare DNS, arahkan `cv.invoicequ.my.id` ke public IPv4 EC2 dan aktifkan proxy Cloudflare. Worker sudah bisa memakai:

```toml
COMPUTER_VISION_URL = "https://cv.invoicequ.my.id"
```

## Deploy DigitalOcean Droplet Lite

DigitalOcean App Platform free hanya cocok untuk static site, bukan backend FastAPI. Untuk service ini, pakai Droplet dan mode lite dulu. Full TensorFlow, YOLO, dan InsightFace biasanya terlalu berat untuk Droplet kecil.

Rekomendasi awal:

```text
Service: Droplet
OS: Ubuntu 24.04 LTS
Region: Singapore
Size: minimal 1GB RAM, lebih aman 2GB RAM
Firewall: buka 22 dan 80 saja
```

Database tetap Neon, jadi tidak perlu DigitalOcean Managed Database dulu.

Setup di Droplet:

```bash
sudo apt update
sudo apt install -y python3.12-venv python3-pip git nginx

git clone https://github.com/fahmibae/invoiceque-ecosystem.git
cd invoiceque-ecosystem/AI-Computer-Vision

python3 -m venv .venv
. .venv/bin/activate
pip install --upgrade pip setuptools wheel
pip install -r requirements-lite.txt
```

Set environment:

```bash
export COMPUTER_VISION_DB_URL="postgresql://USER:PASSWORD@HOST.neon.tech/DB?sslmode=require"
export COMPUTER_VISION_API_KEY="secret-yang-sama-dengan-worker"
export INSIGHTFACE_ENABLED=false
export YOLO_ENABLED=false
export ANTI_SPOOF_ENABLED=false
```

Jalankan service:

```bash
uvicorn app.main:app --host 127.0.0.1 --port 8010
```

Nginx reverse proxy ke FastAPI:

```nginx
server {
    listen 80;
    server_name cv.invoicequ.my.id;

    location / {
        proxy_pass http://127.0.0.1:8010;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Di Cloudflare DNS, arahkan `cv.invoicequ.my.id` ke public IP Droplet dan aktifkan proxy Cloudflare. Worker sudah bisa memakai:

```toml
COMPUTER_VISION_URL = "https://cv.invoicequ.my.id"
```

Catatan biaya: DigitalOcean biasanya butuh payment method. Jika ada trial credit, Droplet bisa tertutup credit sementara; setelah credit habis, Droplet tetap billed per jam sampai dimatikan/dihapus.

## Gratis Tanpa Credit Card: Cloudflare Tunnel

Jika tidak punya credit card, jalur gratis yang paling realistis adalah menjalankan service ini di komputer/server lokal lalu expose dengan Cloudflare Tunnel.

Jalankan backend lokal:

```bash
cd AI-Computer-Vision
. .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8010
```

Untuk tes cepat tanpa domain permanen:

```bash
cloudflared tunnel --url http://localhost:8010
```

Perintah itu menghasilkan URL acak `https://...trycloudflare.com`. URL ini bisa dipakai sementara untuk `COMPUTER_VISION_URL`.

Untuk hostname stabil, buat Cloudflare Tunnel di dashboard Cloudflare:

```text
Public hostname: cv.invoicequ.my.id
Service URL: http://localhost:8010
```

Lalu set Worker:

```toml
COMPUTER_VISION_URL = "https://cv.invoicequ.my.id"
```

Environment backend tetap disimpan lokal di `.env` atau environment service:

```bash
COMPUTER_VISION_DB_URL="postgresql://USER:PASSWORD@HOST.neon.tech/DB?sslmode=require"
COMPUTER_VISION_API_KEY="secret-yang-sama-dengan-worker"
```

Set secret yang sama di Worker:

```bash
cd workers/monolith-api
wrangler secret put COMPUTER_VISION_API_KEY
```

Catatan: komputer/server lokal harus tetap menyala agar endpoint KYC dan face login bisa dipakai. Untuk production sungguhan, pindahkan service ini ke VPS/VM permanen ketika sudah ada budget.

Opsional jika model weight tersedia:

```bash
YOLO_MODEL_PATH="./model_weights/fraud_scene.pt"
ANTI_SPOOF_MODEL_PATH="./model_weights/anti_spoof.keras"
```

## Endpoint Internal

- `POST /v1/face/enroll`
- `POST /v1/face/verify`
- `GET /v1/face/status/{user_id}`
- `POST /v1/kyc/verify` memakai `selfie_image`, tanpa upload dokumen
- `GET /v1/kyc/status/{user_id}`

Semua endpoint `/v1/*` menerima header `X-Computer-Vision-Key` jika `COMPUTER_VISION_API_KEY` diisi.

#!/bin/bash
# =============================================================================
# AGC ENGINE - Layer Domain Setup Script
# Ubuntu 24.04 | Apache (Event MPM) | Node.js | PM2 | Let's Encrypt
#
# KONSEP LAYER DOMAIN:
#   - Satu proses Node.js (port 3000) melayani SEMUA domain
#   - Apache menangkap semua domain → forward ke Node.js
#   - Node.js membaca req.headers.host untuk routing per domain
#   - Tambah domain baru = jalankan add-domain.sh saja (tanpa restart)
#
# ── STRUKTUR & KEGUNAAN FILE ────────────────────────────────────────────────
#   📂 server.js            : Entry point utama. Inisialisasi cache & server Express.
#   📂 config.js            : Pengaturan pusat (Port, Ads, SEO, Bot-Blocker, dsb).
#   📂 routes/
#       ├─ home.js        : Logika Beranda (Tampilkan artikel acak/dinamis).
#       ├─ article.js     : Logika Halaman Artikel (Pemuatan konten & gambar).
#       ├─ category.js    : Logika Halaman Kategori (Navigasi per folder).
#       ├─ search.js      : Logika Fitur Cari (Crawling & live indexing).
#       └─ robots.js      : Logika robots.txt (Dinamis per domain otomatis).
#   📂 lib/
#       ├─ keyword-index.js: "Otak" Indexing (Wajib ada untuk baca 90k+ data).
#       ├─ content-reader.js: Pemroses konten JSON → HTML + LRU Cache.
#       └─ bot-blocker.js  : Security Middleware (Blokir 40+ bot rakus).
#   📂 public/              : Aset statis (CSS, JS, Favicon baru).
#   📂 views/               : Template tampilan (EJS) — Live Edit (No Restart).
#   📂 apalah/              : Folder Database artikel Anda (Wajib ikut di ZIP).
# ────────────────────────────────────────────────────────────────────────────
#
# CARA PAKAI:
#   sudo chmod +x setup-agc.sh
#   sudo ./setup-agc.sh
# =============================================================================

set -e

# ── CONFIG - EDIT SEBELUM DIJALANKAN ────────────────────────────────────────
APP_DIR="/var/www/html"            # Direktori instalasi aplikasi
APP_PORT=3000                     # Port internal Node.js
NODE_VERSION="20"                 # Node.js LTS version
SSL_EMAIL="rejekilancarterus@gmail.com"       # Email untuk Let's Encrypt (wajib diisi!)
# ────────────────────────────────────────────────────────────────────────────

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }

echo ""
echo "======================================================"
echo "   AGC ENGINE - Layer Domain Installer"
echo "   Server : $(hostname -I | awk '{print $1}')"
echo "   Port   : $APP_PORT (internal)"
echo "======================================================"
echo ""
sleep 1

# ── [1/8] SYSTEM UPDATE ──────────────────────────────────────────────────────
log "Updating system..."
apt-get update -qq
apt-get upgrade -y -qq
apt-get autoremove -y -qq && apt-get autoclean -qq

# ── [2/8] INSTALL NODE.JS ────────────────────────────────────────────────────
log "Installing Node.js $NODE_VERSION LTS..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - > /dev/null 2>&1
    apt-get install -y -qq nodejs
fi
log "Node.js $(node --version) ready"

# ── [3/8] INSTALL PM2 ───────────────────────────────────────────────────────
log "Installing PM2..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2 --quiet
fi

# ── [4/8] SETUP APLIKASI ────────────────────────────────────────────────────
log "Setting up application at $APP_DIR..."
mkdir -p $APP_DIR
mkdir -p $APP_DIR/apalah
mkdir -p $APP_DIR/keyw
mkdir -p /var/log/pm2

# Salin file dari direktori yang sama dengan skrip ini (jika berbeda lokasi)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ "$SCRIPT_DIR" != "$APP_DIR" ] && [ -f "$SCRIPT_DIR/package.json" ]; then
    log "Copying app files from $SCRIPT_DIR to $APP_DIR..."
    rsync -a --exclude='node_modules' --exclude='.git' "$SCRIPT_DIR/" "$APP_DIR/"
fi

# Pastikan package.json ada sebelum lanjut
if [ ! -f "$APP_DIR/package.json" ]; then
    warn "============================================================"
    warn "  PERHATIAN: package.json tidak ditemukan di $APP_DIR"
    warn "  Upload file aplikasi terlebih dahulu, contoh:"
    warn "    scp -r /lokal/* root@IP_SERVER:/var/www/html/"
    warn "  Lalu jalankan ulang skrip ini."
    warn "============================================================"
    exit 1
fi

# Install dependencies (hanya jika node_modules belum ada)
if [ ! -d "$APP_DIR/node_modules" ]; then
    log "Installing npm dependencies..."
    cd "$APP_DIR" && npm install --production --quiet
    log "Dependencies installed"
else
    log "node_modules exists, skipping npm install"
fi

# Set permission
chown -R www-data:www-data "$APP_DIR"
chmod -R 755 "$APP_DIR"

# ── PM2 Ecosystem Config ─────────────────────────────────────────────────────
cat > "$APP_DIR/ecosystem.config.js" << EOF
module.exports = {
  apps: [{
    name: 'agc-engine',
    script: './server.js',
    cwd: '/var/www/html',

    // Satu proses melayani semua domain (layer domain)
    instances: 1,
    exec_mode: 'fork',

    // Restart otomatis jika RAM > 256MB
    max_memory_restart: '256M',
    autorestart: true,
    watch: false,
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 3000,

    env: {
      NODE_ENV: 'production',
      PORT: $APP_PORT
    },

    // Log management
    error_file: '/var/log/pm2/agc-error.log',
    out_file: '/var/log/pm2/agc-out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',

    // Rotasi log otomatis
    log_file: '/var/log/pm2/agc-combined.log',
  }]
};
EOF

chown -R www-data:www-data /var/log/pm2

# Start aplikasi via PM2
log "Starting AGC Engine via PM2..."
cd "$APP_DIR"
pm2 delete agc-engine > /dev/null 2>&1 || true   # hapus jika sudah ada (re-run safe)
pm2 start ecosystem.config.js
pm2 save
# Aktifkan PM2 startup agar hidup otomatis setelah reboot
pm2 startup systemd -u root --hp /root 2>/dev/null | tail -1 | bash > /dev/null 2>&1 || true
log "PM2 started & configured (auto-start on reboot enabled)"

# ── [5/8] KONFIGURASI APACHE LAYER DOMAIN ───────────────────────────────────
log "Configuring Apache for Layer Domain..."

# Aktifkan modul yang diperlukan
a2enmod proxy        > /dev/null 2>&1
a2enmod proxy_http   > /dev/null 2>&1
a2enmod headers      > /dev/null 2>&1
a2enmod rewrite      > /dev/null 2>&1
a2enmod deflate      > /dev/null 2>&1
a2enmod ssl          > /dev/null 2>&1

# Nonaktifkan PHP (tidak diperlukan untuk Node.js)
for phpmod in php7.4 php8.0 php8.1 php8.2 php8.3; do
    a2dismod $phpmod > /dev/null 2>&1 || true
done

# Pastikan Event MPM aktif (sudah ada di server Anda)
a2dismod mpm_prefork > /dev/null 2>&1 || true
a2dismod mpm_worker  > /dev/null 2>&1 || true
a2enmod  mpm_event   > /dev/null 2>&1 || true

# ── Optimasi Event MPM untuk Layer Domain ───────────────────────────────────
cat > /etc/apache2/mods-available/mpm_event.conf << 'EOF'
<IfModule mpm_event_module>
    # Minimal proses, hemat RAM untuk banyak domain
    ServerLimit              4
    StartServers             1
    MinSpareThreads          25
    MaxSpareThreads          75
    ThreadsPerChild          50
    MaxRequestWorkers        200
    MaxConnectionsPerChild   5000
    AsyncRequestWorkerFactor 2
</IfModule>
EOF

# ── Optimasi Global Apache ───────────────────────────────────────────────────
cat > /etc/apache2/conf-available/agc-perf.conf << 'EOF'
# Sembunyikan versi server
ServerTokens Prod
ServerSignature Off
TraceEnable Off

# Matikan DNS reverse lookup (hemat CPU)
HostnameLookups Off

# Timeout singkat untuk hemat koneksi idle
Timeout 30
KeepAlive On
MaxKeepAliveRequests 100
KeepAliveTimeout 5

# Kompres response untuk hemat bandwidth
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/css \
        application/javascript application/json text/xml
    DeflateCompressionLevel 5
</IfModule>

# Cache header statis
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/css          "access plus 7 days"
    ExpiresByType application/javascript "access plus 7 days"
    ExpiresByType image/webp        "access plus 30 days"
    ExpiresByType image/png         "access plus 30 days"
    ExpiresByType image/jpg         "access plus 30 days"
</IfModule>
EOF

a2enmod expires > /dev/null 2>&1 || true
a2enconf agc-perf > /dev/null 2>&1

# ── LAYER DOMAIN: VirtualHost Catch-All HTTP ─────────────────────────────────
# Satu config menangkap SEMUA domain → forward ke Node.js
# Tidak perlu edit per domain — Node.js yang menangani routing
cat > /etc/apache2/sites-available/000-catchall.conf << EOF
# =====================================================================
# LAYER DOMAIN - CATCH-ALL HTTP
# Semua domain yang diarahkan ke server ini akan masuk ke Node.js
# Tambah domain baru: jalankan add-domain.sh (tidak perlu edit file ini)
# =====================================================================

<VirtualHost *:80>
    ServerName _default_

    # Forward semua request ke Node.js
    ProxyPreserveHost On
    ProxyRequests Off

    # Node.js membaca Host header untuk tahu domain mana yang diakses
    ProxyPass        / http://127.0.0.1:$APP_PORT/
    ProxyPassReverse / http://127.0.0.1:$APP_PORT/

    # Header keamanan & Protokol
    RequestHeader set X-Forwarded-Proto "https"
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always unset X-Powered-By

    # Timeout proxy singkat
    ProxyTimeout 30
    Timeout 30

    # Akses log ringkas (matikan jika banyak domain agar hemat I/O)
    LogLevel warn
    ErrorLog /var/log/apache2/agc-error.log
    # CustomLog /dev/null combined  # ← Uncomment ini untuk matikan access log
</VirtualHost>
EOF

# ── LAYER DOMAIN: VirtualHost Catch-All HTTPS ────────────────────────────────
# Template HTTPS akan diisi otomatis oleh Certbot per domain
cat > /etc/apache2/sites-available/001-catchall-ssl.conf << EOF
# =====================================================================
# LAYER DOMAIN - CATCH-ALL HTTPS (Template)
# Certbot akan menambah SSL config per domain di bawah ini
# Atau gunakan add-domain.sh untuk SSL otomatis per domain
# =====================================================================

<IfModule mod_ssl.c>
<VirtualHost *:443>
    ServerName _default_

    # SSL Placeholder - akan diganti Certbot per domain
    # SSLCertificateFile    /etc/letsencrypt/live/DOMAIN/fullchain.pem
    # SSLCertificateKeyFile /etc/letsencrypt/live/DOMAIN/privkey.pem

    ProxyPreserveHost On
    ProxyRequests Off
    ProxyPass        / http://127.0.0.1:$APP_PORT/
    ProxyPassReverse / http://127.0.0.1:$APP_PORT/

    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
    Header always unset X-Powered-By
    RequestHeader set X-Forwarded-Proto "https"

    SSLEngine on
    ProxyTimeout 30

    LogLevel warn
    ErrorLog /var/log/apache2/agc-ssl-error.log
</VirtualHost>
</IfModule>
EOF

# Nonaktifkan default Apache, aktifkan catch-all
a2dissite 000-default.conf        > /dev/null 2>&1 || true
a2dissite default-ssl.conf        > /dev/null 2>&1 || true
a2ensite  000-catchall.conf       > /dev/null 2>&1
# 001-catchall-ssl belum diaktifkan (aktif setelah ada domain SSL)

systemctl restart apache2
log "Apache configured (Layer Domain catch-all active)"

# ── [6/8] INSTALL CERTBOT ───────────────────────────────────────────────────
log "Installing Certbot..."
apt-get install -y -qq certbot python3-certbot-apache
log "Certbot installed (jalankan add-domain.sh untuk setup SSL per domain)"

# ── [7/8] SWAP + FIREWALL + KERNEL TUNING ───────────────────────────────────
log "Configuring SWAP, firewall & kernel..."

# ── SWAP 2GB (backup RAM agar tidak OOM di server 1GB) ───────────────────────
SWAPFILE="/swapfile"
SWAPSIZE="2G"

if [ ! -f "$SWAPFILE" ]; then
    log "Creating SWAP $SWAPSIZE..."
    fallocate -l $SWAPSIZE $SWAPFILE
    chmod 600 $SWAPFILE
    mkswap $SWAPFILE   > /dev/null
    swapon $SWAPFILE
    # Buat permanen setelah reboot
    echo "$SWAPFILE none swap sw 0 0" >> /etc/fstab
    # Tuning: gunakan swap hanya jika RAM hampir penuh (hemat disk I/O)
    echo "vm.swappiness=10"          >> /etc/sysctl.d/99-agc.conf
    echo "vm.vfs_cache_pressure=50"  >> /etc/sysctl.d/99-agc.conf
    log "SWAP $SWAPSIZE created & activated (swappiness=10)"
else
    log "SWAP already exists, skipping"
fi

if command -v ufw &> /dev/null; then
    ufw --force enable               > /dev/null 2>&1
    ufw allow  22/tcp                > /dev/null 2>&1  # SSH
    ufw allow  80/tcp                > /dev/null 2>&1  # HTTP
    ufw allow  443/tcp               > /dev/null 2>&1  # HTTPS
    ufw deny   $APP_PORT/tcp         > /dev/null 2>&1  # Blokir port Node.js dari luar
    log "Firewall: port $APP_PORT blocked from public, 80/443 open"
fi

# Kernel tuning untuk banyak koneksi (layer domain)
cat > /etc/sysctl.d/99-agc.conf << 'EOF'
# ── Optimasi koneksi TCP untuk Layer Domain ──
# Bebaskan koneksi idle lebih cepat
net.ipv4.tcp_fin_timeout = 15
net.ipv4.tcp_keepalive_time = 300
net.ipv4.tcp_keepalive_probes = 5
net.ipv4.tcp_keepalive_intvl = 15
net.ipv4.tcp_tw_reuse = 1

# Antrian koneksi masuk
net.core.somaxconn = 2048
net.ipv4.tcp_max_syn_backlog = 2048

# File descriptor (penting untuk banyak domain)
fs.file-max = 100000
EOF

sysctl -p /etc/sysctl.d/99-agc.conf -q

# ── [8/8] LOGO ROTASI & PEMBERSIHAN ─────────────────────────────────────────
log "Configuring log rotation & cleanup..."

# Rotasi log PM2 otomatis
pm2 install pm2-logrotate > /dev/null 2>&1 || true
pm2 set pm2-logrotate:max_size 10M  > /dev/null 2>&1 || true
pm2 set pm2-logrotate:retain 3      > /dev/null 2>&1 || true
pm2 set pm2-logrotate:compress true > /dev/null 2>&1 || true

# Rotasi log Apache
cat > /etc/logrotate.d/apache2-agc << 'EOF'
/var/log/apache2/*.log {
    daily
    missingok
    rotate 3
    compress
    delaycompress
    notifempty
    sharedscripts
    postrotate
        /usr/bin/systemctl reload apache2 > /dev/null 2>&1 || true
    endscript
}
EOF

log "Log rotation configured (3 days, compressed)"
# Buat skrip add-domain.sh untuk menambah domain dengan mudah
cat > /usr/local/bin/add-domain.sh << 'ADDEOF'
#!/bin/bash
# =============================================================
# add-domain.sh — Tambah domain baru ke server Layer Domain
# CARA PAKAI: sudo add-domain.sh domain.com
# =============================================================

if [ -z "$1" ]; then
    echo "Usage: sudo add-domain.sh domain.com"
    exit 1
fi

DOMAIN="$1"
SSL_EMAIL="${2:-admin@$DOMAIN}"
APP_PORT=3000

echo "Adding domain: $DOMAIN"

# Buat VirtualHost khusus untuk domain ini (HTTP)
cat > /etc/apache2/sites-available/${DOMAIN}.conf << EOF
<VirtualHost *:80>
    ServerName $DOMAIN
    ServerAlias www.$DOMAIN

    ProxyPreserveHost On
    ProxyRequests Off
    ProxyPass        / http://127.0.0.1:${APP_PORT}/
    ProxyPassReverse / http://127.0.0.1:${APP_PORT}/

    Header always set X-Frame-Options "SAMEORIGIN"
    Header always unset X-Powered-By

    LogLevel warn
    ErrorLog /var/log/apache2/${DOMAIN}-error.log
</VirtualHost>
EOF

a2ensite ${DOMAIN}.conf > /dev/null 2>&1
systemctl reload apache2

# Install SSL via Certbot
echo "Getting SSL certificate for $DOMAIN..."
certbot --apache \
    -d "$DOMAIN" \
    -d "www.$DOMAIN" \
    --non-interactive \
    --agree-tos \
    --email "$SSL_EMAIL" \
    --redirect \
    --quiet

echo "✓ Domain $DOMAIN added with SSL!"
echo "  → Test: https://$DOMAIN"
ADDEOF

chmod +x /usr/local/bin/add-domain.sh

# ── SUMMARY ─────────────────────────────────────────────────────────────────
SERVER_IP=$(hostname -I | awk '{print $1}')

echo ""
echo "======================================================"
echo -e "  ${GREEN}✅ SETUP COMPLETE - Layer Domain Ready!${NC}"
echo "======================================================"
echo ""
echo "  Server IP  : $SERVER_IP"
echo "  App Dir    : $APP_DIR"
echo "  Node Port  : $APP_PORT (internal, tidak bisa diakses dari luar)"
echo ""
echo "  📌 CARA TAMBAH DOMAIN BARU:"
echo "     1. Arahkan DNS domain ke IP: $SERVER_IP"
echo "     2. Jalankan: sudo add-domain.sh domain.com email@domain.com"
echo "     3. Selesai! Domain langsung aktif dengan SSL"
echo ""
echo "  🔧 PERINTAH BERGUNA:"
echo "     ── Menjalankan Server ──────────────────────────────"
echo "     pm2 start ecosystem.config.js → START server pertama kali"
echo "     pm2 start agc-engine          → START jika sudah pernah didaftarkan"
echo "     pm2 stop agc-engine           → STOP server"
echo "     pm2 restart agc-engine        → RESTART tanpa downtime"
echo "     pm2 reload agc-engine         → RELOAD graceful (0 downtime)"
echo "     ── Monitoring ──────────────────────────────────────"
echo "     pm2 status                    → Status semua aplikasi"
echo "     pm2 logs agc-engine           → Log real-time"
echo "     pm2 monit                     → Monitor RAM & CPU live"
echo "     free -h                       → Cek penggunaan RAM & SWAP"
echo "     ── Apache ──────────────────────────────────────────"
echo "     systemctl status apache2      → Status Apache"
echo "     systemctl reload apache2      → Reload config Apache"
echo "     apache2ctl -S                 → Lihat semua VirtualHost aktif"
echo "     ── Domain ──────────────────────────────────────────"
echo "     add-domain.sh domain.com      → Tambah domain baru + SSL"
echo ""
echo "  ⚠️  CATATAN:"
echo "     Aplikasi Node.js membaca req.headers.host untuk"
echo "     mengetahui domain mana yang sedang diakses."
echo "     Tidak perlu restart apapun saat tambah domain baru."
echo "======================================================"

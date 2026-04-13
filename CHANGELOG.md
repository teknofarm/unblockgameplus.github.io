# AGC Engine v2.6.0 - Smart Linking & SEO Stability Edition

Peningkatan logika tautan internal, stabilitas SEO, dan pengayaan struktur data:

## 1. Smart Link Redirects (Centralized)
- **Logika Konfigurasi Baru**: Implementasi pengaturan `specialRedirects` di `config.js` untuk mengaktifkan/menonaktifkan pengalihan kata kunci tertentu secara global.
- **Keyword Override**: Kata kunci spesifik (seperti "unblock game") kini secara otomatis mengarah ke URL eksternal yang ditentukan melalui fungsi `getRedirectUrl` yang terpusat.

## 2. SEO Snippet & Privacy Optimization
- **Date Removal**: Menghapus seluruh meta tag tanggal (`published_time`, `modified_time`) dan parameter Schema (`datePublished`, `dateModified`) untuk mencegah Google menampilkan tanggal pada snippet hasil pencarian.
- **Clean Summary Text**: Menghapus jejak tanggal dari teks ringkasan artikel di template `generated-article.ejs`.

## 3. Enhanced Internal Linking System
- **Bug Fix Injection**: Memperbaiki masalah URL `undefined` pada sistem injeksi tautan otomatis dalam badan artikel.
- **Contextual Matching**: Menggunakan `matchedKeyword` untuk memastikan teks jangkar (anchor text) yang disisipkan jauh lebih relevan dengan isi paragraf.

## 4. Metadata & Schema Enrichment
- **Dynamic OG Image**: Meta image (`og:image` & `twitter:image`) kini secara dinamis menggunakan *Image Proxy* internal untuk menyajikan gambar unik berbasis judul artikel.
- **WordCount Schema**: Menambahkan informasi jumlah kata (`wordCount`) secara otomatis ke setiap Schema Article untuk memperkuat sinyal kualitas konten di mata Google.

---

# AGC Engine v2.5.0 - Image SEO Proxy Edition

Optimasi besar-besaran untuk indeksasi gambar agar muncul di Google Image Search:

## 1. Internal Image Proxy
- **Local Media Route**: Implementasi rute `/media/:slug.jpg` di `server.js` untuk menyajikan gambar langsung dari domain sendiri.
- **Bing Integration**: Mengambil thumbnail berkualitas dari Bing secara asinkron di sisi server.
- **Aggressive Caching**: Penambahan header `Cache-Control` selama 1 tahun untuk performa LCP maksimal.

## 2. SEO & Indexing Mastery
- **Image XML Sitemap**: Setiap URL di sitemap kini menyertakan metadata `<image:image>` dan `<image:loc>` untuk mempercepat discovery oleh Google.
- **SEO-Friendly Slugs**: Mengonversi keyword gambar menjadi URL slug yang bersih dan mengandung kata kunci.
- **Template Update**: Pembaruan menyeluruh pada Homepage v3 dan Article page untuk menggunakan sistem Proxy Image baru.

---

# AGC Engine v2.4.1 - Stability & Design Polish

Penyempurnaan estetika global, stabilitas iklan, dan pembersihan log sistem:

## 1. Global UI & Aesthetic
- **Link Underline Removal**: Menghilangkan garis bawah pada tautan saat di-hover di seluruh website untuk tampilan yang lebih modern dan premium.
- **Mobile Responsive v3**: Penambahan media queries khusus pada Homepage v3 untuk memastikan tata letak yang sempurna di layar smartphone.

## 2. Advanced Ad Integration
- **Sticky Footer Ad**: Penambahan slot iklan melayang (*floating*) di bagian bawah layar dengan tombol "Close" yang responsif.
- **Homepage Ad Layout**: Mengatur ulang posisi iklan di homepage agar tidak bertabrakan secara visual (iklan tengah geser setelah artikel ke-3).
- **Format Sidebar Fix**: Menggunakan format 300x250 untuk sidebar agar tidak terjadi *layout overflow*.
- **Height-Clamping**: Memaksa tinggi iklan melayang di 90px untuk mencegah pergeseran tata letak (*layout shift*).

## 3. Server Logic & Maintenance
- **404 Fallback Filter**: Menambahkan daftar pengecualian pada logika "404 to Search" untuk mengabaikan file sistem (`.well-known`, `.json`, `favicon`, dll) agar log tetap bersih.

---

# AGC Engine v2.3 - PageSpeed Ultra Edition

Optimasi tingkat lanjut untuk performa maksimal dan kebersihan audit:

## 1. Smart Ad Loader (Phase 3)
- **Lazy Load Iklan**: Iklan hanya dimuat setelah interaksi user (scroll/klik) atau timeout 3.5 detik.
- **Fix Error 500**: Menghilangkan error console "Internal Server Error" dari domain Adsterra di laporan PageSpeed.
- **Improved TBT**: Membebaskan main-thread saat awal pemuatan halaman.

## 2. Font Optimization (Non-blocking)
- **Eliminate Render-Blocking**: Google Fonts dimuat menggunakan teknik asinkron (`preload` + `onload`).
- **Preconnect Strategy**: Menambahkan domain `fonts.gstatic.com` ke daftar preconnect untuk mengurangi latensi DNS/TCP.

---

# AGC Engine v2.2 - PageSpeed Phase 2

Pembaruan untuk mengejar skor sempurna (100/100) di Google PageSpeed Insights:

## 1. Performa Ekstrim (LCP & TBT)
- **Google GA Delay**: Menunda GTAG selama 2 detik untuk mengurangi Total Blocking Time.
- **Improved Caching**: High-performance caching untuk aset statis.

## 2. Keamanan & Best Practices (Skor 100)
- **Security Headers Implementation**: Header HSTS, NoSniff, dan FrameOptions.

## 3. Aksesibilitas & SEO
- **Crawlable Footer**: Mengganti link JavaScript dengan elemen yang ramah bot.
- **Contrast Correction**: Perbaikan warna teks agar mencapai standar WCAG AA.
- **Heading Hierarchy**: Menata ulang urutan H1, H2, H3 agar logis bagi Google.

---

# AGC Engine v2.0 - Mass Indexing & Performance Edition

Daftar pembaruan fitur utama:
- **Dynamic Permalinks**: URL diacak setiap refresh.
- **Self-Referencing Canonical**: Mendukung indexing ribuan URL unik.
- **Model Permalink 'c'**: Folder shuffling (f1/f2 atau f2/f1).

---
*Update terakhir: 13 April 2026*

# Photobox SMK Muhada

Photobox berbasis web untuk acara sekolah: kamera depan, 4 foto otomatis, strip berframe, QR untuk unduh di HP.

## Cara kerja

1. Kiosk (`public/index.html`) menjepret 4 foto, menggabungkannya dengan frame menjadi strip 1200 x 3600 px (JPEG).
2. Strip diunggah ke `/api/upload` (Cloudflare Pages Function) dan disimpan di bucket R2.
3. Kiosk menampilkan QR berisi `https://DOMAIN/d/ID`. Tamu scan, halaman unduh terbuka di HP.
4. Foto otomatis kedaluwarsa setelah 7 hari (ID acak 10 karakter, tidak bisa ditebak).

## Rasio tetap di semua perangkat

- **Tampilan**: seluruh aplikasi digambar pada kanvas tetap **16:9 (1920 x 1080)** lalu diskalakan seragam
  ke layar apa pun. Di layar dengan rasio lain (misalnya iPad 4:3) muncul pita biru tua di tepi, isinya tidak
  berubah bentuk. Jika perangkat berdiri tegak (potret), muncul pesan agar diputar ke mode lanskap.
- **Foto**: apa pun rasio kameranya (4:3, 16:9, dll.), bagian tengah selalu dipotong ke rasio jendela foto
  **3:2 (540:355)**. Yang terlihat di preview sama persis dengan hasil jepretan.
- **Hasil**: strip selalu 1200 x 3600 px (1:3).

## Warna

Palet mengikuti brand Muhada Berdaya: **Biru Tua `#1B2E6E`** (warna dasar), **Biru Terang `#1A6FE8`** (sorot latar),
dan **Oranye `#F28C00`** (aksen tombol, garis, judul). Nilainya ada di bagian `:root` CSS dalam `public/index.html`
(dan di `functions/d/[id].js` untuk halaman unduh).

## Isi proyek

```
public/            situs statis (kiosk, ikon, pustaka QR); ini yang dipublikasikan
functions/         backend (upload, tampil foto, halaman unduh)
template/          frame-template.png untuk bahan desain di Canva (tidak dipublikasikan)
wrangler.toml      konfigurasi Cloudflare (binding R2 bernama PHOTOS)
package.json       skrip `npm run dev` dan `npm run deploy` (tanpa dependensi)
```

## Deploy lewat GitHub + Cloudflare Pages

**1. Buat bucket R2 dulu** (sekali saja, sebelum deploy pertama). Di dashboard Cloudflare:
R2 Object Storage > Create bucket > nama `photobox-muhada`. (Jika R2 belum aktif, aktifkan dulu; paket gratis cukup.)

**2. Push ke GitHub.** Ekstrak zip, buka terminal di folder `photobox`, lalu:

```
git init
git add .
git commit -m "Photobox SMK Muhada"
git branch -M main
git remote add origin https://github.com/USERNAME/photobox-muhada.git
git push -u origin main
```

(Buat repository kosong `photobox-muhada` di GitHub terlebih dahulu.)

**3. Hubungkan ke Cloudflare Pages.** Workers & Pages > Create > Pages > Connect to Git > pilih repository.
Isi pengaturan build:

| Pengaturan | Isi |
|---|---|
| Production branch | `main` |
| Framework preset | None |
| Build command | *(kosongkan)* |
| Build output directory | `public` |
| Root directory | *(kosongkan, akar repository)* |

Klik Save and Deploy. Folder `functions/` otomatis menjadi backend, dan `wrangler.toml` memasang binding R2
`PHOTOS` ke bucket `photobox-muhada` serta `RETENTION_DAYS = 7`. Jika deploy gagal dengan pesan bucket tidak ditemukan,
periksa langkah 1 dan nama bucketnya, lalu Retry deployment.

Setelah itu, setiap `git push` ke `main` otomatis men-deploy versi baru (termasuk saat Anda mengganti `public/frame.png`).

**4. Aturan hapus otomatis di R2.** R2 > `photobox-muhada` > Settings > Object lifecycle rules > Add rule:
"Delete objects after 7 days", prefix `strips/`. Ini penghapusan permanen di sisi penyimpanan
(server juga menolak menampilkan foto yang lebih tua dari 7 hari).

**5. (Opsional) Domain sendiri**, misalnya `photobox.smkmuhada.sch.id`: Pages > Custom domains. QR otomatis memakai
domain yang dipakai kiosk. Untuk memaksa domain tertentu, tambahkan variabel `PUBLIC_BASE_URL` di
`wrangler.toml` bagian `[vars]`.

Karena `wrangler.toml` dipakai, binding dan variabel diatur lewat file itu, bukan lewat dashboard.
Untuk mengubah masa simpan, ubah `RETENTION_DAYS` di `wrangler.toml` dan `retentionDays` di `public/index.html`
(yang kedua hanya teks pemberitahuan di layar awal).

Alternatif tanpa GitHub: `npm run deploy` (perlu `npx wrangler login` sekali).

## Uji di laptop

```
npm run dev
```

Buka `http://localhost:8788`. Kamera diizinkan di `localhost`; R2 disimulasikan secara lokal.
Untuk mengetes dari HP, pakai URL hasil deploy (HTTPS wajib untuk kamera).

## Membuat frame sendiri (Canva)

Ukuran kanvas: **1200 x 3600 px** (rasio 1:3). Ada 4 jendela foto, masing-masing 1080 x 710 px:

| Foto | X  | Y    | Lebar | Tinggi |
|------|----|------|-------|--------|
| 1    | 60 | 340  | 1080  | 710    |
| 2    | 60 | 1090 | 1080  | 710    |
| 3    | 60 | 1840 | 1080  | 710    |
| 4    | 60 | 2590 | 1080  | 710    |

Dua cara membuat jendelanya:

- **Tanpa Canva Pro (disarankan):** unggah `template/frame-template.png` ke Canva sebagai gambar latar
  (kotak magenta = jendela foto). Desain di area biru, tapi **jangan menutupi kotak magenta**.
  Ekspor PNG biasa. Aplikasi otomatis mengubah warna magenta murni `#FF00FF` menjadi transparan.
- **Dengan Canva Pro:** ekspor PNG dengan opsi "Latar belakang transparan", area jendela dibiarkan kosong.

Simpan hasilnya sebagai `public/frame.png` lalu deploy ulang. Jika `frame.png` tidak ada,
aplikasi memakai frame contoh bawaan (biru tua dengan aksen oranye, teks SMK Muhammadiyah Todanan).

Teks pada frame bawaan bisa diubah di bagian `CONFIG.brand` dalam `public/index.html`.

## Pengaturan lain (`CONFIG` di `public/index.html`)

- `countdownFirst` / `countdownNext`: lama hitung mundur (detik)
- `gapMs`: jeda antar foto
- `scale`: 2 = 1200 x 3600 px; ubah ke 1 jika koneksi lambat
- `resultIdleSeconds`: layar hasil kembali ke awal otomatis

## Catatan untuk hari acara

- Buka URL di tablet/laptop, ketuk **Layar penuh**, dan izinkan kamera. Di iPad/Android, "Tambahkan ke layar utama" membuatnya tampil tanpa address bar.
- Nonaktifkan mode tidur layar dan sambungkan ke charger.
- Jika unggahan gagal, tombol **Simpan di sini** tetap menyimpan strip langsung dari layar kiosk.
- Alamat kiosk bersifat publik. Sebarkan hanya ke panitia; untuk pembatasan lebih ketat, Cloudflare Access atau aturan rate limiting bisa dipasang pada `/api/upload`.
- Siapkan pemberitahuan di lokasi bahwa foto diunggah dan dihapus otomatis setelah 7 hari (peserta banyak yang pelajar).

---

## Desain strip (latar / frame) & halaman admin

Buka `https://<domain-anda>/admin` untuk mengunggah gambar desain. Gambar disimpan di R2 (`backgrounds/`) dan otomatis muncul sebagai pilihan di layar awal kiosk.

**Sandi admin** (wajib, sekali saja):

```
npx wrangler pages secret put ADMIN_PASSWORD --project-name photobox-muhada
```

(Karena ada `wrangler.toml`, Variables/Secrets di dashboard hanya-baca, jadi gunakan perintah di atas.) Uji lokal: salin `.dev.vars.example` menjadi `.dev.vars`, lalu `npm run dev`.

**Jenis desain**
- **Latar**: gambar di belakang foto (menutupi seluruh strip).
- **Frame**: gambar di atas foto; area foto transparan atau diisi magenta murni `#FF00FF`.
- Ukuran ideal **1200 x 3600 px** (rasio 1:3), PNG/JPG/WebP maks. 8 MB.
- **Tampilkan teks**: jika mati (bawaan), judul/footer tidak digambar sehingga strip 100% dari gambar. Frame bawaan tetap bertuliskan.
- Opsi "Sembunyikan frame bawaan" ada di admin.

**Tombol Batalkan**: di layar pemotretan; jika sudah ada foto akan meminta konfirmasi. Tombol Esc juga membatalkan.

Lifecycle rule R2 (hapus 7 hari) hanya untuk prefix `strips/`, jangan seluruh bucket, agar desain tidak ikut terhapus.

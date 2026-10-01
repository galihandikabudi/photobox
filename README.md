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
"Delete objects after 90 days" (batas atas pengaman), prefix `strips/`. Masa simpan sebenarnya diatur
per acara di admin (server menolak menampilkan foto yang sudah lewat masa simpannya, dan tombol
"Hapus kedaluwarsa" di galeri menghapusnya permanen). Jangan pasang aturan yang lebih pendek dari masa simpan
acara terlama Anda.

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

Lifecycle rule R2 hanya untuk prefix `strips/`, jangan seluruh bucket, agar desain tidak ikut terhapus.

**Catatan:** sandi admin saat ini tertulis di `wrangler.toml` (`ADMIN_PASSWORD = "smkbisa"`), jadi repo GitHub sebaiknya **private**. Untuk mengganti sandi, ubah nilai itu lalu push ulang. Jika ingin menyembunyikannya, hapus baris itu dan pakai `wrangler pages secret put ADMIN_PASSWORD`.

## Galeri foto tamu & cetak

- **Galeri:** di `/admin`, bagian "Galeri foto tamu" menampilkan semua strip yang tersimpan (terbaru dulu). Centang foto lalu tekan "Hapus terpilih", atau "Pilih semua". Foto juga otomatis terhapus setelah `RETENTION_DAYS` hari.
- **Cetak:** layar hasil punya tombol **Cetak**. Bawaan `CONFIG.print.sheet = '2up'` mencetak 2 strip pada kertas foto 4x6 inci (dipotong menjadi dua 2x6). Ubah ke `'single'` untuk kertas 2x6 inci, atau `enabled: false` untuk menyembunyikan tombol.
- **Cetak tanpa dialog:** jalankan Chrome kiosk dengan `--kiosk-printing` dan atur printer foto sebagai printer bawaan, lalu di pengaturan printer pilih ukuran kertas 4x6 dan skala 100% (tanpa margin).

## Template frame siap pakai

Folder `template/frames/` berisi frame bertema ceria (Konfeti Pesta, Retro Film, Pastel Ceria, Neon Malam, Doodle Sekolah, Pop Sunburst). `sekolah-strip4/` memuat teks SMK Muhada di gambar (unggah dengan **Tampilkan teks: mati**). Sub-folder `strip4/ strip3/ strip2/ grid4/ grid6/` adalah versi **polos tanpa teks** untuk tiap tata letak; unggah dengan **Tampilkan teks: aktif** agar judul dan footer mengikuti teks acara. Jendela foto berwarna magenta `#FF00FF` dan otomatis dibuat transparan.

## Mode acara (untuk jasa sewa photobox)

Di `/admin` tab **Acara**:
1. **Buat acara**: nama, teks sambutan (tampil di layar awal), masa simpan foto (hari), desain yang tersedia, dan apakah frame bawaan disembunyikan.
2. **Aktifkan** acara sebelum acara dimulai. Kiosk menampilkan nama acara, memakai desain acara itu, dan setiap foto baru otomatis masuk ke acara tersebut dengan masa simpannya sendiri.
3. **Tautan album** (`/a/<kode-rahasia>`): berikan hanya ke penyelenggara. Isinya semua foto acara dan tombol **Unduh semua (zip)**. Tamu hanya menerima fotonya sendiri lewat QR. Tombol "Ganti tautan album" mematikan tautan lama.
4. Di tab **Galeri foto** ada filter per acara, unduh zip per acara, dan **Hapus kedaluwarsa**.

Tanpa acara aktif, aplikasi berjalan seperti biasa (masa simpan `RETENTION_DAYS`, foto tidak masuk album mana pun).
Zip dibuat di browser (tanpa kompresi); untuk acara dengan ribuan foto, unduh dari komputer, bukan HP.

### Teks layar awal per acara

Di Admin → Acara → "Teks layar awal dan strip" (saat membuat atau mengedit acara) kamu bisa mengganti:
judul besar, tulisan kecil di atas judul, label acara, sapaan, serta teks pada strip (baris 1, judul, footer 1 & 2).
Kolom kosong = memakai teks bawaan; label acara kosong = memakai nama acara.
Catatan: frame bawaan dan template `sekolah-strip4` sudah memuat teks di gambarnya, jadi tidak ikut berubah. Template polos (`strip4/ strip3/ ...`) memakai teks acara.
Teks strip yang terlalu panjang otomatis dikecilkan agar muat.

### Geser untuk ganti frame

Di layar awal kiosk, tamu bisa menggeser (swipe) kiri/kanan di layar sentuh untuk berganti frame. Ada juga tombol panah dan nama frame di bawah strip (hanya muncul jika ada lebih dari 1 desain). Di PC bisa dengan tombol panah keyboard.

## Pilihan tata letak

Kiosk mendukung lima tata letak. Tiap desain yang diunggah punya satu tata letak (dipilih saat unggah, bisa diubah di daftar desain).

| Tata letak | Ukuran gambar frame | Jendela foto (satuan dasar) |
|---|---|---|
| Strip 4 foto | 1200 x 3600 | 4 jendela 540 x 355, mulai x=30, y=170, jarak 20 |
| Strip 3 foto | 1200 x 3600 | 3 jendela 540 x 480, x=30, y=170, jarak 20 |
| Strip 2 foto | 1200 x 3600 | 2 jendela 540 x 730, x=30, y=170, jarak 20 |
| Kartu 4 foto (2x2) | 2400 x 3600 | 4 jendela 560 x 730, x=30 dan 610, y=170, jarak 20 |
| Kartu 6 foto (2x3) | 2400 x 3600 | 6 jendela 560 x 480, x=30 dan 610, y=170, jarak 20 |

Satuan dasar: lebar strip 600 / kartu 1200, tinggi 1800; gambar akhir 2x lebih besar. Judul di atas 170, footer 150 di bawah. Jendela diisi magenta #FF00FF (atau dibuat transparan) pada frame.

- Kiosk menampilkan tombol pilihan tata letak di layar awal bila lebih dari satu tersedia. Geser (swipe) hanya berganti frame di dalam tata letak yang dipilih.
- Tanpa acara aktif: Strip 4 foto + tata letak dari desain yang diunggah. Dengan acara aktif: bisa dibatasi lewat "Tata letak yang ditawarkan" pada acara (kosong = aturan tanpa acara).
- Frame bawaan (digambar aplikasi) tersedia untuk semua tata letak; `frame.png` hanya untuk Strip 4 foto.
- Kartu dicetak satu per lembar 4x6 inci; strip dicetak 2 per lembar 4x6 (atau 1 per lembar 2x6 jika `print.sheet: 'single'`).

### Unggah template sekaligus

30 template polos (6 tema x 5 tata letak) bisa diunggah dengan satu perintah dari folder proyek:

```
tools/upload-templates.sh https://photobox-muhada.pages.dev smkbisa            # semua
tools/upload-templates.sh https://photobox-muhada.pages.dev smkbisa strip4 grid6  # hanya tata letak tertentu
```

Lalu atur desain mana yang dipakai per acara di Admin → Acara.

Ikon desain di pojok kanan atas membuka menu pilih desain layar penuh (kartu besar, mudah disentuh); ketuk desain untuk memilih, atau X untuk menutup.

Catatan desain: antarmuka kiosk dioptimalkan untuk layar sentuh (target sentuh besar, daftar desain satu baris yang digeser menyamping, geser kiri/kanan untuk ganti frame).

## Edit teks layar depan (WYSIWYG) dan font

Di kiosk, aktifkan sebuah acara lalu ketuk ikon pensil di pojok kanan atas layar depan (diminta kata sandi admin; tersimpan selama tab terbuka). Teks layar depan jadi bisa diedit langsung:

- Ketuk teks (baris kecil, nama acara, judul PHOTOBOX, keterangan) lalu ketik.
- Bilah di bawah layar: pilih font (11 pilihan, tiap nama tampil dengan fontnya), perbesar/perkecil (A− A+), tebal (B), miring (I), warna (palet + pemilih warna), Reset gaya, Batal, Simpan.
- Perubahan disimpan ke acara yang sedang aktif (kolom judul, baris kecil, label acara, sapaan, dan gaya). Teks yang dikosongkan atau sama dengan bawaan kembali memakai teks bawaan.
- Font teks pada strip dipilih per acara di Admin → Acara → Teks layar awal dan strip → Font (juga bisa mengatur font teks layar depan dari sana). Berlaku untuk frame bawaan dan desain unggahan yang menyalakan "Tampilkan teks".

Font (Plus Jakarta Sans, Poppins, Montserrat, Playfair Display, Lobster, Pacifico, Bebas Neue, Oswald, Dancing Script, Fredoka, Caveat; lisensi SIL OFL) di-host sendiri di folder `public/fonts`, jadi kiosk tetap tampil tanpa internet.

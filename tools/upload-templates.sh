#!/usr/bin/env bash
# Unggah semua template frame ke kiosk sekaligus.
# Pemakaian:  tools/upload-templates.sh https://photobox-muhada.pages.dev SANDI_ADMIN [tata-letak ...]
# Contoh:     tools/upload-templates.sh https://photobox-muhada.pages.dev smkbisa strip4 grid6
# Tanpa tata letak = semua (strip4 strip3 strip2 grid4 grid6). Frame diunggah sebagai Jenis: Frame, teks judul/footer AKTIF
# (teks acara diisi dari pengaturan acara). Jalankan dari folder proyek.
set -euo pipefail
URL="${1:?alamat situs}"; PW="${2:?sandi admin}"; shift 2
LAYS=("$@"); [ ${#LAYS[@]} -eq 0 ] && LAYS=(strip4 strip3 strip2 grid4 grid6)
label() { case "$1" in strip4) echo "Strip 4";; strip3) echo "Strip 3";; strip2) echo "Strip 2";; grid4) echo "Kartu 4";; grid6) echo "Kartu 6";; esac; }
for L in "${LAYS[@]}"; do
  for f in template/frames/"$L"/*.png; do
    [ -f "$f" ] || continue
    base=$(basename "$f" .png); base="${base#[0-9][0-9]-}"; base="${base//-/ }"
    name="$(label "$L") - ${base^}"
    q="name=${name// /%20}&type=frame&text=1&layout=$L"
    code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$URL/api/admin/backgrounds?$q" \
      -H "Authorization: Bearer $PW" -H 'Content-Type: image/png' --data-binary "@$f")
    echo "$code  $name"
  done
done

# Instagram Backcheck - Mobile (PWA) Ready

Cara menjalankan aplikasi ini di HP (dengan dukungan PWA):

1. Letakkan semua file berikut di satu folder pada server atau komputer yang bisa diakses dari HP:
   - `index.html`
   - `style.css`
   - `script.js`
   - `manifest.json`
   - `sw.js`
   - `icon.svg`

2. Cara mudah (di komputer lokal) untuk menyajikan folder ini lewat HTTP:

```bash
# Python 3
python -m http.server 8000

# atau menggunakan Node.js serve (jika terpasang)
# npm install -g serve
serve -l 8000
```

3. Dapatkan alamat IP komputer Anda (mis. `192.168.1.10`) dan buka dari HP browser:

```
http://192.168.1.10:8000/
```

4. Setelah halaman terbuka di mobile, browser akan menampilkan opsi "Add to Home Screen" (atau install prompt). Jika tidak muncul:
- Android (Chrome): tekan menu → "Add to Home screen" atau tunggu prompt.
- iOS (Safari): tekan ikon Share → "Add to Home Screen".

5. Catatan:
- PWA install biasanya memerlukan akses lewat HTTP/HTTPS (bukan `file://`).
- Jika service worker tidak terdaftar, pastikan `sw.js` tersedia di root folder.

Enjoy! Jika mau, saya bisa bantu mengemas ke APK menggunakan TWA atau menyediakan langkah hosting gratis (GitHub Pages).
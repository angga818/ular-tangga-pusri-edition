# Audio Lokal (Background Music)

Folder ini menyimpan seluruh audio game. Tidak ada audio yang diambil dari YouTube atau
sumber berhak cipta pihak lain tanpa izin.

## File bawaan

- `background-music.wav` — loop 30 detik, **original dan dibuat dari nol** oleh
  `scripts/generate_bgm.py` (Python standard library, tanpa sample eksternal).
  Regenerasi dengan: `python scripts/generate_bgm.py`.

## Manifest

`manifest.json` memberi tahu aplikasi file mana yang dipakai:

```json
{
  "default": {
    "label": "BGM Utama",
    "src": ["/assets/audio/background-music.wav"],
    "loop": true,
    "volume": 0.32
  },
  "themes": {
    "industrial_world": {
      "label": "BGM Industrial",
      "src": ["/assets/audio/themes/industrial.mp3"],
      "loop": true,
      "volume": 0.3
    }
  }
}
```

- `src` boleh berisi beberapa format sebagai **fallback berurutan**
  (misalnya `["/assets/audio/musik.mp3", "/assets/audio/musik.ogg", "/assets/audio/musik.wav"]`).
  Aplikasi mencoba satu per satu sampai ada file yang berhasil dimuat.
- `themes` memetakan `map_id` dari `src/data/mapsAndChars.ts` ke track khusus.
  Kalau `map_id` tidak ada di `themes`, aplikasi memakai track `default`.
- `volume` adalah level default track (0–1). Level yang disimpan pengguna di browser
  tetap menjadi control utama.

## Menambahkan musik berlisensi sendiri

1. Simpan file (`.mp3`, `.ogg`, atau `.wav`) di folder ini atau subfolder `themes/`.
2. Ubah `manifest.json` agar menunjuk file tersebut.
3. Muat ulang aplikasi. Tidak perlu rebuild kode.

Selalu gunakan musik yang berlisensi (bebas royalti,Creative Commons, atau milik sendiri)
sebelum aplikasi ini dipublikasikan.

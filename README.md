# Ular Tangga Edukasi — PUSRI Edition

Prototype aplikasi web **Snakes & Ladders multiplayer real-time** bertema PT Pupuk Sriwidjaja Palembang (PUSRI), dibangun sesuai PRD versi 1.1 di folder ini.

## Tech Stack

| Layer | Teknologi |
|---|---|
| UI | React 19 + TypeScript |
| Build | Vite 8 |
| Styling | Tailwind CSS 4 |
| Animasi | Phaser 3 (papan & karakter), Framer Motion 11 + canvas-confetti |
| Audio | Howler.js (backsound looping, volume control, mute) + Web Audio API (efek suara) |
| State | Zustand |
| Database | alasql (SQL engine di browser, persisted ke localStorage) |
| Real-time | BroadcastChannel + storage events (simulasi WebSocket/REST) |
| Aset | 5 gambar peta & 3 sheet karakter yang disediakan (tidak diubah desain utamanya) |

## Menjalankan

```bash
npm install
npm run dev
```

Buka `http://localhost:5173`.

Build produksi:

```bash
npm run build
npm run preview
```

## Fitur Utama

- **Room & Lobby**: Host membuat room → PIN 6 digit → player gabung dengan nickname + karakter → status Siap → host mulai.
- **Multiplayer lintas tab**: Buka beberapa tab browser; BroadcastChannel menyinkronkan room, pemain, giliran, dan skor secara real-time. Mode bot tersedia untuk latihan sendiri.
- **Papan Phaser 3 interaktif**: Jalur 1–100 dirender di canvas dengan ular berundulasi, tangga berkedip, partikel ambient, tooltip kotak saat hover, serta highlight dinamis untuk giliran dan karakter lokal.
- **Karakter 2.5D penuh**: Sprite full-body hasil ekstraksi desain asli diberi shadow, silhouette, highlight, podium cahaya, idle bob, dan animasi jalan/naik tangga/turun ular. Tidak lagi hanya foto profil.
- **Dadu 3D + kuis**: Dadu menentukan langkah sekaligus tingkat kesulitan soal (1–6). Jawaban benar → maju; salah/timeout → tetap.
- **Server otoritatif (disimulasi)**: Dadu, pemilihan soal, validasi jawaban, perhitungan skor, dan pergerakan ditentukan oleh `gameServer`, bukan frontend. Kunci jawaban tidak dikirim ke klien sebelum jawaban masuk.
- **Skor & Leaderboard**: `points = round(1000 × time_factor × difficulty_multiplier)` dengan tie-breaker sesuai PRD.
- **5 tema peta**: Industrial, Agricultural, Laboratory, Distribution, Green Environment — masing-masing dengan identitas visual dari aset yang ada.
- **7 karakter**: Dipetakan dari 3 sheet karakter yang disediakan (`desain karakter 1–3.jpeg`), diekstrak menjadi sprite + avatar tanpa mengubah desain aslinya.
- **Bank Soal & SQL Inspector**: CRUD pertanyaan, question set, filter, ekspor JSON, dan query `SELECT` langsung ke tabel SQL (`maps`, `characters`, `questions`, `question_sets`, `rooms`, `players`, `game_results`).
- **Rekap hasil**: Pemenang, podium, leaderboard lengkap, jumlah jawaban benar, posisi akhir, dan tombol main lagi.
- **Suara & animasi**: Efek suara sintetis (Web Audio API), dadu 3D CSS, animasi Phaser untuk karakter/ular/tangga, efek ledakan partikel saat tiba di kotak, dan konfeti kemenangan. Tekan `Alt+M` untuk mute.
- **Backsound Howler.js**: Musik latar looping dari file lokal (`public/assets/audio/`), dengan panel kontrol play/pause, mute/unmute, slider volume, equalizer animasi, dan dukungan track per tema map melalui `manifest.json`. Tekan `Alt+B` untuk play/pause.

## Catatan Implementasi

- Backend sungguhan (Go + PostgreSQL + WebSocket) tidak disertakan sesuai ruang lingkup prototype. Peran server disimulasikan oleh `src/engine/gameServer.ts` yang memakai alasql sebagai penyimpanan berorientasi SQL dan BroadcastChannel untuk sinkronisasi lintas tab.
- Desain dasar karakter dan peta tetap memakai aset yang disediakan. Efek kedalaman 2.5D, bayangan, heroic frame, dan animasi dibuat secara prosedural di Phaser/CSS tanpa mengubah identitas visual karakter.
- Audio tidak diambil dari YouTube atau sumber berhak cipta lain. Track bawaan `background-music.wav` dibuat original dari nol oleh `scripts/generate_bgm.py`; file musik berlisensi milik sendiri bisa dipasang lewat `public/assets/audio/manifest.json`. Detailnya ada di `public/assets/audio/README.md`.
- Informasi PUSRI pada bank soal disusun dari fakta publik yang dapat diverifikasi.

## Struktur Singkat

```
src/
  components/     UI reusable, papan, dadu 3D
  data/           tema peta, karakter, bank soal awal
  db/             skema & query alasql
  engine/         "server" otoritatif + event WebSocket
  phaser/         BoardScene: papan interaktif, ular, tangga, animasi token
  screens/        menu, create/join, lobby, game, result, bank soal, panduan
  store/          zustand store + wiring event
  types/          tipe domain
public/assets/    maps/ (map1–5.jpg), characters/ (sprite & avatar hasil ekstraksi), audio/ (BGM lokal + manifest)
scripts/          generate_bgm.py — pembuat loop BGM original (Python stdlib)
```

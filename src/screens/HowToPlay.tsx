import { motion } from 'framer-motion';
import {
  ArrowRight,
  BookOpenCheck,
  CircleHelp,
  Dices,
  Layers3,
  Leaf,
  MousePointerClick,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
} from 'lucide-react';
import { CHARACTERS, MAP_THEMES } from '../data/mapsAndChars';
import { CharacterFigure, ScreenHeader } from '../components/ui';
import { useGameStore } from '../store/gameStore';

export function HowToPlay() {
  const setScreen = useGameStore((s) => s.setScreen);

  return (
    <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6">
      <ScreenHeader
        eyebrow="Panduan / How to Play"
        title="Cara Bermain"
        subtitle="Panduan lengkap mekanisme Ular Tangga PUSRI Edition — dari membuat room hingga menuju kotak 100."
        onBack={() => setScreen('menu')}
      />

      <section className="board-card mb-6 rounded-2xl p-5 sm:p-7">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <Target size={20} className="text-amber-700" />
          <h2 className="font-display text-xl font-bold text-slate-900">Tujuan Permainan</h2>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">
          Jadilah pemain pertama yang tiba tepat di <strong>kotak 100</strong>. Setiap giliran, kamu melempar dadu lalu
          menjawab pertanyaan sesuai tingkat kesulitan angka dadu. Hanya jawaban benar yang membuat karaktermu bergerak.
          Di sepanjang jalan, kamu bisa menemukan <strong className="text-emerald-700">tangga</strong> yang membantu
          melonjak naik atau <strong className="text-rose-700">ular</strong> yang membuatmu turun ke kotak sebelumnya.
        </p>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        {[
          {
            icon: Users,
            title: '1. Buat atau Gabung Room',
            tone: 'text-sky-600',
            body: 'Host membuat room dan mendapat kode PIN 6 digit. Player memasukkan PIN, mengisi nickname, memilih karakter, lalu menekan tombol Siap. Minimal 2 pemain dibutuhkan untuk memulai.',
          },
          {
            icon: Dices,
            title: '2. Lempar Dadu & Jawab Kuis',
            tone: 'text-amber-600',
            body: 'Saat giliranmu, lempar dadu. Angka 1–6 menentukan jumlah langkah sekaligus tingkat kesulitan soal (1 = sangat mudah hingga 6 = sangat sulit). Jawab dalam waktu yang telah ditentukan host.',
          },
          {
            icon: Layers3,
            title: '3. Ular, Tangga, dan Gerakan',
            tone: 'text-emerald-600',
            body: 'Jawaban benar memindahkan karakter mengikuti jalur kotak. Jika berhenti di kepala tangga, kamu naik ke kotak tujuan. Jika berhenti di kepala ular, kamu turun ke ekor ular. Jawaban salah atau waktu habis membuat karakter tetap di posisi semula.',
          },
          {
            icon: Trophy,
            title: '4. Skor & Kemenangan',
            tone: 'text-violet-600',
            body: 'Poin dihitung server: 1000 × faktor kecepatan × multiplier kesulitan. Pemain pertama yang tiba tepat di kotak 100 menang. Jika angka dadu melewati 100, posisi tidak berubah. Pemenang dan leaderboard ditampilkan di layar hasil.',
          },
        ].map((step, idx) => (
          <motion.section
            key={step.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
            className="board-card rounded-2xl p-5"
          >
            <div className="mb-3 flex items-center gap-3">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 ${step.tone}`}>
                <step.icon size={20} />
              </span>
              <h3 className="font-display text-base font-bold text-slate-900">{step.title}</h3>
            </div>
            <p className="text-xs leading-relaxed text-slate-600">{step.body}</p>
          </motion.section>
        ))}
      </div>

      {/* Difficulty table */}
      <section className="board-card mt-6 overflow-hidden rounded-2xl">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-display text-lg font-bold text-slate-900">Hubungan Dadu, Kesulitan & Poin</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                {['Dadu', 'Tingkat Kesulitan', 'Langkah', 'Multiplier Poin'].map((h) => (
                  <th key={h} className="px-4 py-2.5 font-extrabold uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                [1, 'Sangat Mudah', 1, '1.0×'],
                [2, 'Mudah', 2, '1.2×'],
                [3, 'Menengah', 3, '1.4×'],
                [4, 'Menengah Sulit', 4, '1.6×'],
                [5, 'Sulit', 5, '1.8×'],
                [6, 'Sangat Sulit', 6, '2.0×'],
              ].map(([dice, label, steps, mult]) => (
                <tr key={dice} className="hover:bg-slate-50">
                  <td className="font-mono-num px-4 py-2.5 font-bold text-slate-900">{dice}</td>
                  <td className="px-4 py-2.5 text-slate-700">{label}</td>
                  <td className="px-4 py-2.5 text-slate-700">{steps} kotak</td>
                  <td className="font-mono-num px-4 py-2.5 font-bold text-amber-700">{mult}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-slate-50 px-5 py-3 text-[10px] leading-relaxed text-slate-500">
          Rumus skor: <span className="font-mono-num">points = round(1000 × (1 − waktu_jawab/batas_waktu) × multiplier)</span>.
          Faktor waktu dibatasi 0–1. Jawaban salah atau tidak dijawab mendapat 0 poin.
        </div>
      </section>

      {/* Themes & characters */}
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles size={18} className="text-amber-300" />
            <h2 className="font-display text-base font-bold text-white">Lima Tema Peta</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {MAP_THEMES.map((m) => (
              <div key={m.id} className="overflow-hidden rounded-lg border border-white/10 bg-slate-800">
                <img src={m.image_url} alt={m.name} className="h-16 w-full object-cover object-center" />
                <div className="px-2 py-1.5">
                  <div className="text-[10px] font-bold text-white">{m.titleId}</div>
                  <div className="text-[8px] text-slate-400">{m.ladders.length} tangga · {m.snakes.length} ular</div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-slate-400">
            Semua tema menggunakan aturan yang sama. Hanya identitas visual, dekorasi, dan konfigurasi ular tangga yang
            berbeda.
          </p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-300" />
            <h2 className="font-display text-base font-bold text-white">Tujuh Karakter</h2>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {CHARACTERS.map((c) => (
              <div key={c.id} className="text-center">
                <div className="mx-auto flex h-16 items-end justify-center rounded-t-lg bg-gradient-to-t from-slate-800/80 to-slate-700/20">
                  <CharacterFigure characterId={c.id} height={60} />
                </div>
                <div className="mt-1 truncate text-[8px] font-bold text-slate-300">{c.name.split(' ')[0]}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-slate-400">
            Asset karakter seluruhnya menggunakan desain yang telah disediakan. Kamu bebas memilih karakter mana pun
            saat bergabung ke room.
          </p>
        </section>
      </div>

      {/* FAQ */}
      <section className="board-card mt-6 rounded-2xl p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <CircleHelp size={20} className="text-violet-700" />
          <h2 className="font-display text-lg font-bold text-slate-900">Pertanyaan Umum</h2>
        </div>
        <div className="space-y-3 text-xs">
          {[
            ['Apakah bisa dimainkan sendiri?', 'Ya. Host dapat menambahkan rekan bot di lobby agar permainan langsung berjalan tanpa menunggu pemain lain.'],
            ['Apakah jawaban benar terlihat sebelum menjawab?', 'Tidak. Kunci jawaban hanya ada di database/server dan baru dikirim setelah pemain menjawab atau waktu habis.'],
            ['Apakah tema peta mengubah aturan?', 'Tidak. Tema hanya mengubah tampilan papan, dekorasi, dan posisi ular tangga. Mekanisme permainan identik di semua peta.'],
            ['Bagaimana jika koneksi terputus?', 'Posisi, skor, dan state permainan tetap tersimpan di database. Sistem akan menyinkronkan kembali tampilan saat aplikasi dibuka ulang.'],
          ].map(([q, a]) => (
            <details key={q} className="group rounded-xl border border-slate-200 bg-slate-50 p-3">
              <summary className="flex cursor-pointer list-none items-center gap-2 font-bold text-slate-800">
                <BookOpenCheck size={15} className="text-amber-600" /> {q}
                <ArrowRight size={14} className="ml-auto transition group-open:rotate-90" />
              </summary>
              <p className="mt-2 pl-6 leading-relaxed text-slate-600">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <div className="mt-7 flex justify-center">
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setScreen('create_room')}
          className="board-btn-primary inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-amber-400 to-orange-500 px-6 py-3 text-sm font-extrabold text-slate-900"
        >
          <MousePointerClick size={17} /> Siap Bermain? Buat Room Sekarang
        </motion.button>
      </div>

      <p className="mt-6 flex items-center justify-center gap-2 text-center text-[10px] text-slate-500">
        <Leaf size={12} /> Dibuat sebagai prototype edukasi interaktif bertema PT Pupuk Sriwidjaja Palembang.
      </p>
    </div>
  );
}

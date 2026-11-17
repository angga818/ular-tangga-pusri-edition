import { motion } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  Boxes,
  CircleHelp,
  Database,
  DoorOpen,
  Layers3,
  Play,
  ShieldCheck,
  Sparkles,
  Swords,
  Trophy,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { CHARACTERS, MAP_THEMES } from '../data/mapsAndChars';
import { sqlGetRecentRooms } from '../db/sqlDatabase';
import { Screen, useGameStore } from '../store/gameStore';
import { CharacterFigure, ConnectionDot } from '../components/ui';

export function MainMenu() {
  const setScreen = useGameStore((s) => s.setScreen);
  const [hoveredMap, setHoveredMap] = useState<string>(MAP_THEMES[0].id);
  const recentRooms = sqlGetRecentRooms().filter((r) => r.status === 'LOBBY').slice(0, 3);
  const activeMap = MAP_THEMES.find((m) => m.id === hoveredMap) || MAP_THEMES[0];

  const go = (screen: Screen) => setScreen(screen);

  const menuItems = [
    {
      key: 'create_room' as Screen,
      icon: DoorOpen,
      label: 'Buat Room Baru',
      desc: 'Atur peta, mode soal, dan undang teman lewat kode PIN.',
      color: 'from-amber-400 to-orange-500',
      ring: 'border-amber-300',
    },
    {
      key: 'join_room' as Screen,
      icon: Users,
      label: 'Gabung Room',
      desc: 'Masukkan kode PIN 6 digit dan pilih karakter favoritmu.',
      color: 'from-sky-400 to-blue-600',
      ring: 'border-sky-300',
    },
    {
      key: 'question_bank' as Screen,
      icon: Database,
      label: 'Bank Soal & SQL',
      desc: 'Kelola pertanyaan PUSRI, paket soal, dan jelajahi data SQL.',
      color: 'from-emerald-400 to-teal-600',
      ring: 'border-emerald-300',
    },
    {
      key: 'how_to_play' as Screen,
      icon: CircleHelp,
      label: 'Cara Bermain',
      desc: 'Pelajari aturan dadu, ular tangga, dan sistem skor.',
      color: 'from-violet-400 to-purple-600',
      ring: 'border-violet-300',
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-10">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative mb-8 overflow-hidden rounded-3xl border border-white/15 bg-slate-900/70 p-6 shadow-2xl backdrop-blur sm:p-9"
      >
        <div className="absolute inset-0 opacity-25">
          <img src={activeMap.image_url} alt="" className="h-full w-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-transparent" />
        </div>
        <div className="relative z-10 grid gap-7 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-amber-400/15 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-amber-200">
                <Sparkles size={12} /> Edukasi Interaktif
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-emerald-200">
                <ShieldCheck size={12} /> PUSRI Edition v1.1
              </span>
            </div>
            <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Ular Tangga{" "}
              <span className="bg-gradient-to-r from-amber-300 via-orange-300 to-amber-200 bg-clip-text text-transparent">
                PUSRI Edition
              </span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
              Permainan edukasi multiplayer real-time yang memadukan strategi ular tangga klasik dengan pengetahuan seputar
              PT Pupuk Sriwidjaja Palembang, pertanian, keselamatan kerja, dan keberlanjutan. Lempar dadu, jawab kuis, dan
              lawan temanmu menuju kotak 100.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => go('create_room')}
                className="board-btn-primary inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 px-5 py-3 text-sm font-extrabold text-slate-900"
              >
                <Play size={18} fill="currentColor" /> Mulai Permainan
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => go('join_room')}
                className="board-btn-navy inline-flex items-center gap-2 rounded-xl border border-white/20 bg-slate-800 px-5 py-3 text-sm font-extrabold text-white"
              >
                <Swords size={18} /> Gabung Teman
              </motion.button>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-4 text-[11px] font-semibold text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <Users size={13} /> 2–8 Pemain
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Layers3 size={13} /> 5 Tema Peta
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Boxes size={13} /> 7 Karakter
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BookOpen size={13} /> Bank Soal SQL
              </span>
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="relative mx-auto w-full max-w-md rotate-[3deg] rounded-2xl border-4 border-amber-900/60 bg-amber-100 p-3 shadow-2xl">
              <img src={activeMap.image_url} alt={`Tema ${activeMap.name}`} className="w-full rounded-lg" />
              <motion.div
                key={activeMap.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute -bottom-5 left-1/2 w-[92%] -translate-x-1/2 rounded-xl border border-amber-300 bg-slate-900 px-4 py-3 text-center shadow-xl"
              >
                <div className="font-display text-base font-bold text-white">{activeMap.titleId}</div>
                <div className="text-[11px] text-amber-200">{activeMap.subtitle}</div>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Menu grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {menuItems.map((item, idx) => (
          <motion.button
            key={item.key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 * idx }}
            whileHover={{ y: -5 }}
            onClick={() => go(item.key)}
            className={`group relative overflow-hidden rounded-2xl border bg-white p-5 text-left shadow-lg transition ${item.ring} hover:shadow-xl`}
          >
            <div
              className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${item.color} text-white shadow-md`}
            >
              <item.icon size={22} />
            </div>
            <h2 className="font-display text-lg font-bold text-slate-900">{item.label}</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{item.desc}</p>
            <div className="mt-4 flex items-center gap-1 text-xs font-bold text-slate-700">
              Buka menu <ArrowRight size={14} className="transition group-hover:translate-x-1" />
            </div>
            <div className={`absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-gradient-to-br ${item.color} opacity-10`} />
          </motion.button>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        {/* Map gallery */}
        <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 backdrop-blur">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-bold text-white">Jelajahi 5 Tema Peta</h2>
              <p className="text-xs text-slate-400">Mekanisme sama, identitas visual berbeda. Aset peta asli dari exercises folder.</p>
            </div>
            <Layers3 className="text-amber-300" size={22} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {MAP_THEMES.map((m) => (
              <button
                key={m.id}
                onMouseEnter={() => setHoveredMap(m.id)}
                onFocus={() => setHoveredMap(m.id)}
                onClick={() => setHoveredMap(m.id)}
                className={`overflow-hidden rounded-xl border-2 text-left transition ${
                  hoveredMap === m.id ? 'border-amber-400 shadow-lg' : 'border-white/10 hover:border-white/30'
                }`}
              >
                <div className="relative h-24 overflow-hidden">
                  <img src={m.image_url} alt={m.name} className="h-full w-full object-cover object-center" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 to-transparent" />
                  <span className="absolute bottom-1.5 left-2 font-display text-xs font-bold text-white">{m.titleId}</span>
                </div>
                <div className="bg-slate-800 px-2.5 py-2">
                  <div className="text-[10px] font-bold text-slate-200">{m.name}</div>
                  <div className="mt-0.5 text-[9px] text-slate-400">{m.ladders.length} tangga · {m.snakes.length} ular</div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Character showcase + room list */}
        <section className="space-y-5">
          <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 backdrop-blur">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-white">Karakter Pemain</h2>
              <span className="text-[10px] font-bold text-amber-300">7 PILIHAN</span>
            </div>
            <div className="flex items-end justify-between gap-1.5 overflow-hidden">
              {CHARACTERS.map((c) => (
                <div key={c.id} className="group relative flex-1">
                  <div className="flex h-16 items-end justify-center rounded-t-lg bg-gradient-to-t from-slate-800/80 to-slate-700/20">
                    <CharacterFigure characterId={c.id} height={60} />
                  </div>
                  <div className="mt-1 truncate text-center text-[8px] font-bold text-slate-300">{c.name.split(' ')[0]}</div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-slate-400">
              Seluruh aset karakter menggunakan desain yang telah disediakan. Tidak ada karakter yang dibuat ulang.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 backdrop-blur">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-white">Room Terbaru</h2>
              <Trophy size={18} className="text-amber-300" />
            </div>
            {recentRooms.length === 0 ? (
              <p className="text-xs text-slate-400">Belum ada room aktif. Jadilah host pertama!</p>
            ) : (
              <div className="space-y-2">
                {recentRooms.map((r) => (
                  <button
                    key={r.code}
                    onClick={() => {
                      useGameStore.setState({ screen: 'join_room' });
                    }}
                    className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-slate-800/70 px-3 py-2 text-left hover:border-amber-400/50"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{r.name}</div>
                      <div className="text-[10px] text-slate-400">PIN {r.code}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono-num text-sm font-bold text-amber-300">
                        {r.player_count}/{r.max_players}
                      </div>
                      <div className="text-[9px] text-emerald-400">Lobi terbuka</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <div className="mt-4 border-t border-white/10 pt-3">
              <ConnectionDot status={useGameStore.getState().connectionStatus} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

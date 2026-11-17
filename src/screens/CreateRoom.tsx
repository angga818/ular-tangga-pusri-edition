import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, ChevronDown, Layers3, Settings2, Sparkles, Users } from 'lucide-react';
import { useState } from 'react';
import { ScreenHeader } from '../components/ui';
import { MAP_THEMES } from '../data/mapsAndChars';
import { sqlGetQuestionSets } from '../db/sqlDatabase';
import { gameServer } from '../engine/gameServer';
import { QuestionCategory, QuestionMode } from '../types/game';
import { Screen, useGameStore } from '../store/gameStore';
import {
  staggerContainer,
  staggerItem,
  cardVariants,
  cardTransition,
  gridStaggerVariants,
  gridItemVariants,
  pageVariants,
  pageTransition,
} from '../utils/animations';

const CATEGORIES: QuestionCategory[] = [
  'PUSRI',
  'PERTANIAN',
  'INDUSTRI',
  'LABORATORIUM',
  'DISTRIBUSI',
  'K3',
  'LINGKUNGAN',
];

export function CreateRoom() {
  const setScreen = useGameStore((s) => s.setScreen);
  const setAuth = useGameStore((s) => s.setAuth);
  const pushToast = useGameStore((s) => s.pushToast);
  const refreshRoom = useGameStore((s) => s.refreshRoom);

  const [roomName, setRoomName] = useState('PUSRI Challenge');
  const [hostNickname, setHostNickname] = useState('Host');
  const [mapId, setMapId] = useState(MAP_THEMES[0].id);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [mode, setMode] = useState<QuestionMode>('RANDOM');
  const [questionSetId, setQuestionSetId] = useState('');
  const [categories, setCategories] = useState<QuestionCategory[]>(['PUSRI', 'PERTANIAN']);
  const [timeLimit, setTimeLimit] = useState(20);
  const [submitting, setSubmitting] = useState(false);

  const sets = sqlGetQuestionSets();
  const selectedMap = MAP_THEMES.find((m) => m.id === mapId) || MAP_THEMES[0];

  function toggleCategory(cat: QuestionCategory) {
    setCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  }

  function handleCreate() {
    setSubmitting(true);
    try {
      const { room, hostSpectator } = gameServer.createRoom({
        room_name: roomName,
        host_nickname: hostNickname,
        map_id: mapId,
        max_players: maxPlayers,
        question_mode: mode,
        question_set_id: mode === 'CUSTOM' ? questionSetId || sets[0]?.id || null : null,
        categories,
        turn_time_limit_sec: timeLimit,
      });
      setAuth({
        role: 'host',
        room_code: room.code,
        token: room.host_token,
        player_id: hostSpectator.id,
        nickname: hostSpectator.nickname,
      });
      refreshRoom();
      pushToast(`Room berhasil dibuat! Kode PIN: ${room.code}`, 'success');
      setScreen('lobby' as Screen);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Gagal membuat room.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      transition={pageTransition}
      className="mx-auto max-w-6xl px-4 py-7 sm:px-6"
    >
      <ScreenHeader
        eyebrow="Host / Room Setup"
        title="Buat Room Permainan"
        subtitle="Konfigurasikan room sebelum membagikan kode PIN kepada teman-temanmu."
        onBack={() => setScreen('menu')}
      />

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]"
      >
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="space-y-5"
        >
          {/* Basic settings */}
          <motion.section
            variants={cardVariants}
            initial="initial"
            animate="animate"
            transition={cardTransition}
            className="board-card rounded-2xl p-5 sm:p-6"
          >
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="mb-5 flex items-center gap-2 border-b border-slate-200 pb-3"
            >
              <motion.span whileHover={{ scale: 1.1, rotate: 3 }} transition={{ duration: 0.3 }}><Settings2 size={19} className="text-amber-700" /></motion.span>
              <h2 className="font-display text-lg font-bold text-slate-900">Pengaturan Dasar</h2>
            </motion.div>

            <motion.div
              variants={gridStaggerVariants}
              initial="initial"
              animate="animate"
              className="grid gap-5 sm:grid-cols-2"
            >
              <motion.label
                variants={staggerItem}
                className="block"
              >
                <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-slate-600">
                  Nama Room
                </span>
                <motion.input
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  maxLength={32}
                  whileFocus={{ scale: 1.01 }}
                  className="w-full rounded-xl border-2 border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-amber-500"
                  placeholder="Contoh: PUSRI Challenge"
                />
              </motion.label>

              <motion.label
                variants={staggerItem}
                className="block"
              >
                <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-slate-600">
                  Nickname Kamu (Host)
                </span>
                <motion.input
                  value={hostNickname}
                  onChange={(e) => setHostNickname(e.target.value.slice(0, 20))}
                  maxLength={20}
                  whileFocus={{ scale: 1.01 }}
                  className="w-full rounded-xl border-2 border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-amber-500"
                  placeholder="Nama panggilanmu di game"
                />
              </motion.label>
            </motion.div>

            <motion.div
              variants={gridStaggerVariants}
              initial="initial"
              animate="animate"
              className="mt-5 grid gap-5 sm:grid-cols-2"
            >
              <motion.div variants={staggerItem}>
                <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-slate-600">
                  Maksimal Pemain
                </span>
                <motion.div whileFocus={{ scale: 1.01 }} className="relative">
                  <select
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(Number(e.target.value))}
                    className="w-full appearance-none rounded-xl border-2 border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-amber-500"
                  >
                    {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <option key={n} value={n}>
                        {n} pemain
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="pointer-events-none absolute right-3 top-3.5 text-slate-500" />
                </motion.div>
              </motion.div>
              <motion.div variants={staggerItem}>
                <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-slate-600">
                  Durasi Menjawab per Pertanyaan
                </span>
                <motion.div whileFocus={{ scale: 1.01 }} className="relative">
                  <select
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(Number(e.target.value))}
                    className="w-full appearance-none rounded-xl border-2 border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-amber-500"
                  >
                    {[10, 15, 20, 25, 30, 45, 60].map((sec) => (
                      <option key={sec} value={sec}>
                        {sec} detik
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="pointer-events-none absolute right-3 top-3.5 text-slate-500" />
                </motion.div>
              </motion.div>
            </motion.div>
          </motion.section>

          {/* Map selection */}
          <motion.section
            variants={cardVariants}
            initial="initial"
            animate="animate"
            transition={cardTransition}
            className="board-card rounded-2xl p-5 sm:p-6"
          >
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="mb-4 flex items-center gap-2 border-b border-slate-200 pb-3"
            >
              <motion.span whileHover={{ scale: 1.1, rotate: 3 }} transition={{ duration: 0.3 }}><Layers3 size={19} className="text-emerald-700" /></motion.span>
              <h2 className="font-display text-lg font-bold text-slate-900">Pilih Tema Peta</h2>
            </motion.div>
            <motion.div
              variants={gridStaggerVariants}
              initial="initial"
              animate="animate"
              className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
            >
              {MAP_THEMES.map((m) => (
                <motion.button
                  key={m.id}
                  variants={gridItemVariants}
                  whileHover={{ y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setMapId(m.id)}
                  className={`relative overflow-hidden rounded-xl border-2 text-left transition ${
                    mapId === m.id ? 'border-amber-500 ring-2 ring-amber-300' : 'border-slate-300 hover:border-slate-400'
                  }`}
                >
                  <motion.img
                    src={m.image_url}
                    alt={m.name}
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                    className="h-28 w-full object-cover object-center"
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.3 }}
                    className="bg-white p-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-xs font-bold text-slate-900">{m.titleId}</span>
                      {mapId === m.id && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                          className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white"
                        >
                          <Check size={12} strokeWidth={3} />
                        </motion.span>
                      )}
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-500">{m.subtitle}</div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {m.features.slice(0, 2).map((f) => (
                        <motion.span
                          key={f}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.15, type: 'spring', stiffness: 500, damping: 20 }}
                          className="rounded bg-slate-100 px-1.5 py-0.5 text-[8px] font-bold text-slate-600"
                        >
                          {f}
                        </motion.span>
                      ))}
                    </div>
                  </motion.div>
                </motion.button>
              ))}
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="mt-3 text-[11px] leading-relaxed text-slate-500"
            >
              <strong>Catatan:</strong> tema hanya mengubah visual. Aturan main, ular, dan tangga tetap mengikuti konfigurasi
              yang telah ditentukan untuk tiap peta.
            </motion.p>
          </motion.section>

          {/* Question source */}
          <motion.section
            variants={cardVariants}
            initial="initial"
            animate="animate"
            transition={cardTransition}
            className="board-card rounded-2xl p-5 sm:p-6"
          >
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="mb-4 flex items-center gap-2 border-b border-slate-200 pb-3"
            >
              <motion.span whileHover={{ scale: 1.1, rotate: 3 }} transition={{ duration: 0.3 }}><Sparkles size={19} className="text-violet-700" /></motion.span>
              <h2 className="font-display text-lg font-bold text-slate-900">Sumber Pertanyaan</h2>
            </motion.div>
            <motion.div
              variants={gridStaggerVariants}
              initial="initial"
              animate="animate"
              className="grid gap-3 sm:grid-cols-2"
            >
              <motion.button
                variants={staggerItem}
                onClick={() => setMode('RANDOM')}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                className={`rounded-xl border-2 p-4 text-left transition ${
                  mode === 'RANDOM' ? 'border-violet-500 bg-violet-50' : 'border-slate-300 hover:border-slate-400'
                }`}
              >
                <div className="font-display text-sm font-bold text-slate-900">🎲 Pertanyaan Acak</div>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                  Ambil otomatis dari bank soal aktif sesuai tingkat kesulitan dadu.
                </p>
              </motion.button>
              <motion.button
                variants={staggerItem}
                onClick={() => setMode('CUSTOM')}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                className={`rounded-xl border-2 p-4 text-left transition ${
                  mode === 'CUSTOM' ? 'border-violet-500 bg-violet-50' : 'border-slate-300 hover:border-slate-400'
                }`}
              >
                <div className="font-display text-sm font-bold text-slate-900">📚 Pertanyaan Custom</div>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                  Gunakan kumpulan soal tertentu yang dibuat di Bank Soal.
                </p>
              </motion.button>
            </motion.div>

            <AnimatePresence mode="wait">
              {mode === 'CUSTOM' ? (
                <motion.div
                  key="custom"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-4"
                >
                  <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-slate-600">
                    Pilih Question Set
                  </label>
                  <motion.select
                    value={questionSetId || sets[0]?.id || ''}
                    onChange={(e) => setQuestionSetId(e.target.value)}
                    whileFocus={{ scale: 1.01 }}
                    className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-violet-500"
                  >
                    {sets.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.question_ids.length} soal)
                      </option>
                    ))}
                  </motion.select>
                </motion.div>
              ) : (
                <motion.div
                  key="random"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-4"
                >
                  <span className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-slate-600">
                    Kategori yang Diizinkan
                  </span>
                  <motion.div
                    variants={gridStaggerVariants}
                    initial="initial"
                    animate="animate"
                    className="flex flex-wrap gap-2"
                  >
                    {CATEGORIES.map((cat) => (
                      <motion.button
                        key={cat}
                        variants={staggerItem}
                        onClick={() => toggleCategory(cat)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`rounded-lg border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide transition ${
                          categories.includes(cat)
                            ? 'border-violet-500 bg-violet-500 text-white'
                            : 'border-slate-300 bg-white text-slate-600 hover:border-violet-300'
                        }`}
                      >
                        <AnimatePresence mode="wait">
                          {categories.includes(cat) && (
                            <motion.span
                              key="check"
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0 }}
                              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                              className="mr-1 inline"
                            >
                              <Check size={10} />
                            </motion.span>
                          )}
                        </AnimatePresence>
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={cat}
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 5 }}
                          >
                            {cat}
                          </motion.span>
                        </AnimatePresence>
                      </motion.button>
                    ))}
                  </motion.div>
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                    className="mt-2 text-[10px] text-slate-500"
                  >
                    Kosongkan semua kategori untuk mengambil dari seluruh bank soal aktif.
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>
        </motion.div>

        {/* Sticky summary */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="lg:sticky lg:top-5 lg:self-start"
        >
          <motion.section
            variants={cardVariants}
            initial="initial"
            animate="animate"
            transition={cardTransition}
            className="board-card overflow-hidden rounded-2xl"
          >
            <motion.div
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="relative h-40 overflow-hidden"
            >
              <img src={selectedMap.image_url} alt={selectedMap.name} className="h-full w-full object-cover object-center" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 to-transparent" />
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className="absolute bottom-3 left-4 right-4"
              >
                <div className="font-display text-lg font-bold text-white">{selectedMap.titleId}</div>
                <div className="text-[11px] text-amber-200">{selectedMap.subtitle}</div>
              </motion.div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="p-5"
            >
              <h3 className="mb-3 font-display text-base font-bold text-slate-900">Ringkasan Room</h3>
              <motion.dl
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="space-y-2.5 text-xs"
              >
                {[
                  ['Nama Room', roomName || '-'],
                  ['Peta', selectedMap.name],
                  ['Pemain Maks.', `${maxPlayers} orang`],
                  ['Mode Soal', mode === 'RANDOM' ? 'Pertanyaan Acak' : 'Pertanyaan Custom'],
                  [
                    mode === 'CUSTOM' ? 'Question Set' : 'Kategori',
                    mode === 'CUSTOM'
                      ? sets.find((s) => s.id === (questionSetId || sets[0]?.id))?.name || '-'
                      : categories.length
                      ? categories.join(', ')
                      : 'Semua kategori',
                  ],
                  ['Durasi Jawab', `${timeLimit} detik`],
                ].map(([label, val]) => (
                  <motion.div
                    key={label}
                    variants={staggerItem}
                    className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2"
                  >
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="max-w-[60%] text-right font-bold text-slate-800">{val}</dd>
                  </motion.div>
                ))}
              </motion.dl>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.3 }}
                className="mt-4 flex items-start gap-2 rounded-xl bg-slate-100 p-3"
              >
                <Users size={16} className="mt-0.5 shrink-0 text-slate-500" />
                <p className="text-[10px] leading-relaxed text-slate-600">
                  Setelah room dibuat, kamu akan mendapat kode PIN 6 digit. Bagikan PIN ini agar teman dapat bergabung.
                  Permainan dimulai oleh host ketika semua pemain sudah siap.
                </p>
              </motion.div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={submitting || !roomName.trim()}
                onClick={handleCreate}
                className="board-btn-primary mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 py-3 text-sm font-extrabold text-slate-900 disabled:opacity-50"
              >
                {submitting ? 'Membuat room...' : 'Buat Room & Dapatkan PIN'}
                <motion.span whileHover={{ x: 4 }}><ArrowRight size={17} /></motion.span>
              </motion.button>
            </motion.div>
          </motion.section>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

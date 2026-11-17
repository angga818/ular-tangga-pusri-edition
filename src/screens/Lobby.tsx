import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Check, CheckCircle2, Copy, Crown, Eye, Play, Plus, ShieldCheck, Users, Wifi } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { CharacterAvatar, ConnectionDot, CopyPinButton, getMap, Pill, ScreenHeader } from '../components/ui';
import { gameServer } from '../engine/gameServer';
import { useGameStore } from '../store/gameStore';

export function Lobby() {
  const { room, players, auth, connectionStatus, refreshRoom, pushToast, setScreen } = useGameStore();

  useEffect(() => {
    if (auth) {
      refreshRoom();
      gameServer.reconcileRoomIfNeeded(auth.room_code);
      const r = useGameStore.getState().room;
      if (r && r.status !== 'LOBBY') {
        setScreen(r.status === 'GAME_OVER' ? 'result' : 'game');
      }
    }
    const timer = window.setInterval(() => refreshRoom(), 2500);
    return () => window.clearInterval(timer);
  }, [auth, refreshRoom, setScreen]);

  if (!auth || !room) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-white">
        Room tidak ditemukan. Kembali ke menu utama.
      </div>
    );
  }

  const isHost = auth.role === 'host';
  const map = getMap(room.map_id);
  
  // Filter: only non-spectator players are actual game players
  const gamePlayers = useMemo(() => players.filter(p => !p.is_spectator), [players]);
  const spectators = useMemo(() => players.filter(p => p.is_spectator), [players]);
  const allReady = gamePlayers.length >= 2 && gamePlayers.every((p) => p.is_ready);
  const myPlayer = gamePlayers.find((p) => p.id === auth.player_id);
  const isSpectator = auth.role === 'host' || spectators.some(s => s.id === auth.player_id);

  function toggleReady() {
    if (!myPlayer) return;
    try {
      gameServer.setPlayerReady(room!.code, myPlayer.id, !myPlayer.is_ready);
      refreshRoom();
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Gagal mengubah status.', 'error');
    }
  }

  function handleStart() {
    try {
      gameServer.startGame(room!.code, room!.host_token);
      refreshRoom();
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Gagal memulai permainan.', 'error');
    }
  }

  function handleAddBot() {
    try {
      const bot = gameServer.addBotPlayer(room!.code);
      pushToast(`${bot.nickname} ditambahkan ke room.`, 'success');
      refreshRoom();
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Gagal menambahkan bot.', 'error');
    }
  }

  function handleChangeMap(mapId: string) {
    if (!isHost) return;
    gameServer.changeRoomMap(room!.code, mapId);
    refreshRoom();
    pushToast('Tema peta berhasil diubah.', 'success');
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6">
      <ScreenHeader
        eyebrow="Lobby / Menunggu Pemain"
        title={room.name}
        subtitle={isHost 
          ? 'Kamu sebagai Host (Pengamat). Bagikan kode PIN, atur peta, dan mulai permainan saat semua pemain siap.'
          : 'Bagikan kode PIN kepada teman. Pastikan semua pemain berstatus Siap sebelum host memulai permainan.'}
        onBack={() => {
          useGameStore.getState().resetSession();
        }}
        right={<ConnectionDot status={connectionStatus} />}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
        <div className="space-y-5">
          {/* PIN Card */}
          <motion.section
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-center shadow-2xl"
          >
            <div className="absolute inset-0 opacity-10">
              <img src={map.image_url} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="relative z-10">
              <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.25em] text-amber-300">Kode PIN Room</div>
              <div className="font-mono-num text-5xl font-bold tracking-[0.25em] text-white sm:text-6xl">{room.code}</div>
              <div className="mt-4 flex items-center justify-center gap-2">
                <CopyPinButton code={room.code} />
                <span className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-white">
                  <Wifi size={13} /> Live & tersinkronisasi
                </span>
              </div>
            </div>
          </motion.section>

          {/* Player list - Game Players */}
          <section className="board-card rounded-2xl p-5">
            <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Users size={19} className="text-sky-700" />
                <h2 className="font-display text-lg font-bold text-slate-900">Pemain ({gamePlayers.length}/{room.max_players})</h2>
              </div>
              <Pill tone="sky">
                {gamePlayers.length}/{room.max_players} Pemain
              </Pill>
            </div>

            <div className="space-y-2.5">
              <AnimatePresence>
                {gamePlayers.map((p, idx) => {
                  const char = getCharSafe(p.character_id);
                  return (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 12 }}
                      className={`flex items-center gap-3 rounded-xl border-2 p-2.5 ${
                        p.id === auth.player_id
                          ? 'border-amber-400 bg-amber-50'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="relative">
                        <CharacterAvatar characterId={p.character_id} size="lg" />
                        {idx === 0 && (
                          <span className="absolute -left-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white shadow">
                            <Crown size={11} fill="currentColor" />
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-extrabold text-slate-900">{p.nickname}</span>
                          {p.id === auth.player_id && (
                            <span className="rounded bg-amber-200 px-1.5 py-0.5 text-[9px] font-bold text-amber-900">KAMU</span>
                          )}
                          {p.is_bot && (
                            <span className="inline-flex items-center gap-0.5 rounded bg-slate-200 px-1.5 py-0.5 text-[9px] font-bold text-slate-700">
                              <Bot size={9} /> BOT
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">{char}</div>
                      </div>
                      <div
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${
                          p.is_ready ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {p.is_ready ? <CheckCircle2 size={12} /> : <span className="h-2 w-2 rounded-full bg-slate-400" />}
                        {p.is_ready ? 'Siap' : 'Menunggu'}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {gamePlayers.length < room.max_players && (
              <button
                onClick={handleAddBot}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-2.5 text-xs font-bold text-slate-600 hover:border-amber-400 hover:text-amber-700"
              >
                <Plus size={15} /> Tambahkan Rekan Bot (untuk latihan)
              </button>
            )}
          </section>

          {/* Spectators list (Host + other observers) */}
          {spectators.length > 0 && (
            <section className="board-card rounded-2xl p-5">
              <div className="mb-4 flex items-center gap-2 border-b border-slate-200 pb-3">
                <Eye size={19} className="text-amber-600" />
                <h2 className="font-display text-lg font-bold text-slate-900">Pengamat ({spectators.length})</h2>
              </div>
              <div className="space-y-2">
                <AnimatePresence>
                  {spectators.map((p) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 12 }}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-amber-50/50 p-2"
                    >
                      <div className="relative">
                        <CharacterAvatar characterId={p.character_id} size="md" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-extrabold text-slate-900">{p.nickname}</span>
                          {p.id === auth.player_id && (
                            <span className="rounded bg-amber-200 px-1.5 py-0.5 text-[9px] font-bold text-amber-900">KAMU (Host)</span>
                          )}
                          <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
                            <Eye size={9} /> PENGAMAT
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">{getCharSafe(p.character_id)}</div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}
        </div>

        <div className="space-y-5">
          {/* Host controls / Player ready */}
          <section className="board-card rounded-2xl p-5">
            <div className="mb-4 flex items-center gap-2 border-b border-slate-200 pb-3">
              {isHost ? <Crown size={19} className="text-amber-600" /> : <ShieldCheck size={19} className="text-slate-600" />}
              <h2 className="font-display text-lg font-bold text-slate-900">
                {isHost ? 'Kontrol Host' : isSpectator ? 'Mode Pengamat' : 'Status Kesiapan'}
              </h2>
            </div>

            {isHost ? (
              <>
                <div className="rounded-xl bg-slate-100 p-3">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Syarat Memulai</div>
                  <ul className="mt-2 space-y-1.5 text-xs">
                    <li className={`flex items-center gap-2 ${gamePlayers.length >= 2 ? 'text-emerald-700' : 'text-slate-500'}`}>
                      {gamePlayers.length >= 2 ? <Check size={14} /> : <span className="h-3.5 w-3.5 rounded-full border-2 border-slate-300" />}
                      Minimal 2 pemain bergabung ({gamePlayers.length}/2+)
                    </li>
                    <li className={`flex items-center gap-2 ${allReady && gamePlayers.length >= 2 ? 'text-emerald-700' : 'text-slate-500'}`}>
                      {allReady && gamePlayers.length >= 2 ? (
                        <Check size={14} />
                      ) : (
                        <span className="h-3.5 w-3.5 rounded-full border-2 border-slate-300" />
                      )}
                      Semua pemain berstatus Siap
                    </li>
                  </ul>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={!allReady}
                  onClick={handleStart}
                  className="board-btn-primary mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 py-3 text-sm font-extrabold text-white disabled:opacity-45"
                >
                  <Play size={18} fill="currentColor" /> Mulai Permainan
                </motion.button>
              </>
            ) : isSpectator ? (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-center">
                <div className="flex items-center justify-center gap-2 text-amber-800 mb-2">
                  <Eye size={20} />
                  <span className="font-bold">Mode Pengamat Aktif</span>
                </div>
                <p className="text-sm text-slate-700">
                  Kamu mengamati permainan ini. Host akan memulai saat semua pemain siap.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-3 rounded-xl bg-slate-100 p-3 text-xs leading-relaxed text-slate-600">
                  {myPlayer?.is_ready
                    ? 'Kamu sudah berstatus Siap. Tunggu host memulai permainan.'
                    : 'Tekan tombol di bawah untuk menandakan bahwa kamu sudah siap bermain.'}
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={toggleReady}
                  className={`board-btn-primary flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-extrabold ${
                    myPlayer?.is_ready
                      ? 'bg-slate-200 text-slate-700'
                      : 'bg-gradient-to-b from-emerald-400 to-emerald-600 text-white'
                  }`}
                >
                  <CheckCircle2 size={18} />
                  {myPlayer?.is_ready ? 'Batalkan Status Siap' : 'Saya Siap Bermain'}
                </motion.button>
              </>
            )}
          </section>

          {/* Map info / selector */}
          <section className="board-card overflow-hidden rounded-2xl">
            <div className="h-36 overflow-hidden">
              <img src={map.image_url} alt={map.name} className="h-full w-full object-cover object-center" />
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-display text-lg font-bold text-slate-900">{map.titleId}</div>
                  <div className="text-xs text-slate-500">{map.subtitle}</div>
                </div>
                <Pill tone="amber">{map.name}</Pill>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-slate-600">{map.description}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {map.features.map((f) => (
                  <span key={f} className="rounded bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-600">
                    {f}
                  </span>
                ))}
              </div>

              {isHost && (
                <div className="mt-4 border-t border-slate-200 pt-4">
                  <label className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-slate-600">
                    Ganti Tema Peta
                  </label>
                  <select
                    value={room.map_id}
                    onChange={(e) => handleChangeMap(e.target.value)}
                    className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500"
                  >
                    {['industrial_world', 'agricultural_world', 'laboratory_world', 'distribution_world', 'green_environment_world'].map(
                      (id) => (
                        <option key={id} value={id}>
                          {getMap(id).name}
                        </option>
                      )
                    )}
                  </select>
                </div>
              )}
            </div>
          </section>

          <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 text-[11px] leading-relaxed text-slate-300 backdrop-blur">
            <div className="mb-1 flex items-center gap-2 font-bold text-amber-300">
              <Copy size={13} /> Tips Lobby
            </div>
            Kode PIN dapat disalin dan dibagikan ke teman. Jika teman belum memiliki aplikasi, buka tab baru dan gunakan
            menu <strong>Gabung Room</strong>. Semua perubahan pemain dan status siap tersinkronisasi secara real-time.
          </div>
        </div>
      </div>
    </div>
  );
}

function getCharSafe(id: string): string {
  const map: Record<string, string> = {
    character_01: 'Raka (Karyawan)',
    character_02: 'Nadia (Karyawati)',
    character_03: 'Bagas (Petani Muda)',
    character_04: 'Sari (Petani Kebun)',
    character_05: 'Pak Darman (Petani Senior)',
    character_06: 'Dimas (Sekuriti Pria)',
    character_07: 'Citra (Sekuriti Wanita)',
  };
  return map[id] || 'Karakter';
}

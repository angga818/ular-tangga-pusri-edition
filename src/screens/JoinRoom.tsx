import { motion } from 'framer-motion';
import { ArrowRight, Check, Keyboard, LockKeyhole, UserRound, Users } from 'lucide-react';
import { useState } from 'react';
import { CharacterFigure, ScreenHeader } from '../components/ui';
import { CHARACTERS } from '../data/mapsAndChars';
import { gameServer } from '../engine/gameServer';
import { Screen, useGameStore } from '../store/gameStore';

export function JoinRoom() {
  const setScreen = useGameStore((s) => s.setScreen);
  const setAuth = useGameStore((s) => s.setAuth);
  const refreshRoom = useGameStore((s) => s.refreshRoom);
  const pushToast = useGameStore((s) => s.pushToast);

  const [code, setCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [characterId, setCharacterId] = useState(CHARACTERS[0].id);
  const [loading, setLoading] = useState(false);

  const selectedChar = CHARACTERS.find((c) => c.id === characterId) || CHARACTERS[0];

  function handleJoin() {
    setLoading(true);
    try {
      const { player } = gameServer.joinRoom({
        room_code: code,
        nickname,
        character_id: characterId,
      });
      setAuth({
        role: 'player',
        room_code: player.room_code,
        token: player.player_token,
        player_id: player.id,
        nickname: player.nickname,
      });
      refreshRoom();
      pushToast(`Berhasil bergabung sebagai ${player.nickname}!`, 'success');
      setScreen('lobby' as Screen);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Gagal bergabung ke room.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6">
      <ScreenHeader
        eyebrow="Player / Join Room"
        title="Gabung ke Room"
        subtitle="Masukkan kode PIN 6 digit dari host, isi nickname, lalu pilih karakter favoritmu."
        onBack={() => setScreen('menu')}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-5">
          <section className="board-card rounded-2xl p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-2 border-b border-slate-200 pb-3">
              <LockKeyhole size={19} className="text-sky-700" />
              <h2 className="font-display text-lg font-bold text-slate-900">Kode Room</h2>
            </div>
            <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-slate-600">Kode PIN (6 Digit)</label>
            <div className="relative">
              <Keyboard size={18} className="absolute left-3.5 top-4 text-slate-400" />
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="font-mono-num w-full rounded-xl border-2 border-slate-300 bg-white py-3 pl-11 pr-4 text-center text-2xl font-bold tracking-[0.35em] text-slate-900 outline-none focus:border-sky-500"
              />
            </div>
            <p className="mt-2 text-[11px] text-slate-500">Tanyakan kode PIN kepada host room.</p>

            <div className="mt-5">
              <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-slate-600">Nickname</label>
              <div className="relative">
                <UserRound size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value.slice(0, 20))}
                  placeholder="Nama panggilanmu"
                  className="w-full rounded-xl border-2 border-slate-300 bg-white py-2.5 pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none focus:border-sky-500"
                />
              </div>
              <div className="mt-1 text-right text-[10px] text-slate-400">{nickname.length}/20 karakter</div>
            </div>
          </section>

          <section className="board-card rounded-2xl p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2 border-b border-slate-200 pb-3">
              <Users size={19} className="text-emerald-700" />
              <h2 className="font-display text-lg font-bold text-slate-900">Pilih Karakter</h2>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
              {CHARACTERS.map((c) => (
                <motion.button
                  key={c.id}
                  whileHover={{ y: -2 }}
                  onClick={() => setCharacterId(c.id)}
                  className={`relative overflow-hidden rounded-xl border-2 bg-slate-50 p-2 text-center transition ${
                    characterId === c.id ? 'border-emerald-500 ring-2 ring-emerald-300' : 'border-slate-200 hover:border-slate-350'
                  }`}
                >
                  {characterId === c.id && (
                    <span className="absolute right-1.5 top-1.5 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white">
                      <Check size={10} strokeWidth={3} />
                    </span>
                  )}
                  <div className="mx-auto flex h-20 w-full items-end justify-center overflow-hidden rounded-lg bg-gradient-to-t from-slate-200 to-slate-50">
                    <CharacterFigure characterId={c.id} height={76} />
                  </div>
                  <div className="mt-1.5 truncate text-[10px] font-bold text-slate-800">{c.name}</div>
                  <div className="truncate text-[8px] text-slate-500">{c.group}</div>
                </motion.button>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-100 p-3">
              <CharacterFigure characterId={selectedChar.id} height={64} />
              <div>
                <div className="font-display text-sm font-bold text-slate-900">{selectedChar.name}</div>
                <div className="text-[11px] text-slate-600">{selectedChar.role}</div>
                <div className="mt-0.5 text-[10px] italic text-slate-500">"{selectedChar.tagline}"</div>
              </div>
            </div>
          </section>
        </div>

        <div className="lg:sticky lg:top-5 lg:self-start">
          <section className="board-card overflow-hidden rounded-2xl p-5 sm:p-6">
            <div className="mb-5 flex h-44 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-slate-800 to-slate-950">
              <div className="text-center">
                <div className="font-mono-num text-5xl font-bold tracking-[0.18em] text-amber-300">
                  {code || '------'}
                </div>
                <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.25em] text-slate-400">Room PIN</div>
              </div>
            </div>

            <div className="mt-5 space-y-2 text-xs">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Nickname</span>
                <span className="font-bold text-slate-800">{nickname || '-'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Karakter</span>
                <span className="font-bold text-slate-800">{selectedChar.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status</span>
                <span className="font-bold text-slate-800">Menunggu host memulai</span>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={loading || code.length !== 6 || !nickname.trim()}
              onClick={handleJoin}
              className="board-btn-navy mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 py-3 text-sm font-extrabold text-white disabled:opacity-45"
            >
              {loading ? 'Menghubungkan...' : 'Gabung Sekarang'}
              <ArrowRight size={17} />
            </motion.button>

            <div className="mt-4 rounded-xl bg-sky-50 p-3 text-[10px] leading-relaxed text-sky-900">
              Setelah bergabung, kamu akan masuk ke lobby. Tekan tombol <strong>Siap</strong>, lalu tunggu host memulai
              permainan. Kamu juga bisa menambahkan rekan bot agar permainan langsung berjalan.
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

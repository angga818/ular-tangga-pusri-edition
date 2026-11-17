import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  Check,
  ChevronDown,
  Code2,
  Database,
  Download,
  FileJson,
  Filter,
  Layers3,
  Pencil,
  Play,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { DifficultyBadge, Pill, ScreenHeader } from '../components/ui';
import {
  sqlCreateQuestion,
  sqlCreateQuestionSet,
  sqlDeleteQuestion,
  sqlGetQuestionSets,
  sqlGetQuestions,
  sqlRunReadQuery,
  sqlUpdateQuestion,
} from '../db/sqlDatabase';
import { Question, QuestionCategory, QuestionOption } from '../types/game';
import { useGameStore } from '../store/gameStore';

type Tab = 'questions' | 'sets' | 'sql';
const CATEGORIES: QuestionCategory[] = [
  'PUSRI',
  'PERTANIAN',
  'INDUSTRI',
  'LABORATORIUM',
  'DISTRIBUSI',
  'K3',
  'LINGKUNGAN',
];

const emptyQuestion = (): Omit<Question, 'id' | 'created_at'> => ({
  question_text: '',
  category: 'PUSRI',
  difficulty: 1,
  time_limit_sec: 20,
  options: [
    { id: 'opt_01', text: '' },
    { id: 'opt_02', text: '' },
    { id: 'opt_03', text: '' },
    { id: 'opt_04', text: '' },
  ],
  correct_option_id: 'opt_01',
  explanation: '',
  is_active: true,
});

export function QuestionBank() {
  const setScreen = useGameStore((s) => s.setScreen);
  const pushToast = useGameStore((s) => s.pushToast);
  const [tab, setTab] = useState<Tab>('questions');
  const [version, setVersion] = useState(0);
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [editing, setEditing] = useState<Question | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [form, setForm] = useState<Omit<Question, 'id' | 'created_at'>>(emptyQuestion);

  const [setName, setSetName] = useState('');
  const [setDesc, setSetDesc] = useState('');
  const [setSelected, setSetSelected] = useState<string[]>([]);

  const [sqlQuery, setSqlQuery] = useState('SELECT id, question_text, category, difficulty FROM questions ORDER BY difficulty, id LIMIT 8');
  const [sqlResult, setSqlResult] = useState<unknown>(null);
  const [sqlError, setSqlError] = useState('');

  // Force re-read on version bump
  const questions = useMemo(
    () => sqlGetQuestions({ search, difficulty: difficultyFilter || undefined, category: categoryFilter }),
    [version, search, difficultyFilter, categoryFilter]
  );
  const sets = useMemo(() => sqlGetQuestionSets(), [version]);

  function bump() {
    setVersion((v) => v + 1);
  }

  function openNew() {
    setForm(emptyQuestion());
    setEditing(null);
    setShowEditor(true);
  }

  function openEdit(q: Question) {
    setForm({
      question_text: q.question_text,
      category: q.category,
      difficulty: q.difficulty,
      time_limit_sec: q.time_limit_sec,
      options: q.options.map((o) => ({ ...o })),
      correct_option_id: q.correct_option_id,
      explanation: q.explanation,
      is_active: q.is_active,
    });
    setEditing(q);
    setShowEditor(true);
  }

  function saveQuestion() {
    try {
      if (editing) {
        sqlUpdateQuestion(editing.id, form);
        pushToast('Pertanyaan berhasil diperbarui.', 'success');
      } else {
        sqlCreateQuestion(form);
        pushToast('Pertanyaan baru berhasil ditambahkan.', 'success');
      }
      setShowEditor(false);
      bump();
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Gagal menyimpan pertanyaan.', 'error');
    }
  }

  function deleteQuestion(q: Question) {
    if (!window.confirm(`Hapus pertanyaan "${q.question_text.slice(0, 60)}..."?`)) return;
    sqlDeleteQuestion(q.id);
    pushToast('Pertanyaan dihapus.', 'success');
    bump();
  }

  function createSet() {
    try {
      sqlCreateQuestionSet(setName, setDesc, setSelected);
      setSetName('');
      setSetDesc('');
      setSetSelected([]);
      bump();
      pushToast('Question set berhasil dibuat.', 'success');
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Gagal membuat question set.', 'error');
    }
  }

  function runSql() {
    try {
      setSqlResult(sqlRunReadQuery(sqlQuery));
      setSqlError('');
    } catch (err) {
      setSqlResult(null);
      setSqlError(err instanceof Error ? err.message : 'Query gagal dijalankan.');
    }
  }

  function exportQuestions() {
    const data = JSON.stringify(sqlGetQuestions(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pusri-question-bank.json';
    a.click();
    URL.revokeObjectURL(url);
    pushToast('Bank soal diekspor ke JSON.', 'success');
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6">
      <ScreenHeader
        eyebrow="Admin / Question Bank"
        title="Bank Soal & Database SQL"
        subtitle="Kelola pertanyaan edukasi PUSRI, susun question set, dan jelajahi data melalui query SQL. Seluruh data tersimpan di database SQL lokal (alasql)."
        onBack={() => setScreen('menu')}
        right={
          <button
            onClick={exportQuestions}
            className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-slate-800 px-3 py-2 text-xs font-bold text-white hover:bg-slate-700"
          >
            <Download size={14} /> Ekspor JSON
          </button>
        }
      />

      {/* Tabs */}
      <div className="mb-5 flex flex-wrap gap-2">
        {[
          { key: 'questions' as Tab, icon: BookOpen, label: `Daftar Pertanyaan (${questions.length})` },
          { key: 'sets' as Tab, icon: Layers3, label: `Question Set (${sets.length})` },
          { key: 'sql' as Tab, icon: Code2, label: 'SQL Inspector' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2 text-xs font-extrabold transition ${
              tab === t.key
                ? 'border-amber-500 bg-amber-400 text-slate-900'
                : 'border-white/15 bg-slate-800/70 text-slate-300 hover:border-white/30'
            }`}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'questions' && (
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <section className="board-card rounded-2xl p-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[200px] flex-1">
                  <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari pertanyaan atau penjelasan..."
                    className="w-full rounded-xl border-2 border-slate-300 bg-white py-2.5 pl-9 pr-3 text-xs font-medium outline-none focus:border-amber-500"
                  />
                </div>
                <div className="relative">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="appearance-none rounded-xl border-2 border-slate-300 bg-white px-3 py-2.5 pr-8 text-xs font-bold outline-none focus:border-amber-500"
                  >
                    <option value="ALL">Semua kategori</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-3 text-slate-500" />
                </div>
                <div className="relative">
                  <select
                    value={difficultyFilter || ''}
                    onChange={(e) => setDifficultyFilter(e.target.value ? Number(e.target.value) : null)}
                    className="appearance-none rounded-xl border-2 border-slate-300 bg-white px-3 py-2.5 pr-8 text-xs font-bold outline-none focus:border-amber-500"
                  >
                    <option value="">Semua tingkat</option>
                    {[1, 2, 3, 4, 5, 6].map((d) => (
                      <option key={d} value={d}>
                        Tingkat {d}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-3 text-slate-500" />
                </div>
                <button
                  onClick={openNew}
                  className="board-btn-primary inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white"
                >
                  <Plus size={15} /> Tambah Soal
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500">
                <Filter size={12} /> Menampilkan {questions.length} pertanyaan aktif.
              </div>
            </section>

            <div className="space-y-2.5">
              <AnimatePresence>
                {questions.map((q) => (
                  <motion.div
                    key={q.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="board-card rounded-xl p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <DifficultyBadge difficulty={q.difficulty} />
                        <Pill tone="slate">{q.category}</Pill>
                        <span className="text-[10px] text-slate-400">⏱ {q.time_limit_sec} detik</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEdit(q)}
                          className="rounded-lg border border-slate-300 bg-white p-1.5 text-slate-600 hover:border-sky-400 hover:text-sky-700"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => deleteQuestion(q)}
                          className="rounded-lg border border-slate-300 bg-white p-1.5 text-slate-600 hover:border-rose-400 hover:text-rose-700"
                          title="Hapus"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <p className="mt-2 text-sm font-bold leading-snug text-slate-900">{q.question_text}</p>
                    <div className="mt-2 grid gap-1 sm:grid-cols-2">
                      {q.options.map((o) => (
                        <div
                          key={o.id}
                          className={`flex items-center gap-2 rounded-lg px-2 py-1 text-[11px] ${
                            o.id === q.correct_option_id
                              ? 'bg-emerald-50 font-bold text-emerald-800'
                              : 'bg-slate-50 text-slate-600'
                          }`}
                        >
                          <span className="font-mono-num text-[9px]">{o.id.replace('opt_', '')}</span>
                          <span>{o.text}</span>
                          {o.id === q.correct_option_id && <Check size={12} className="ml-auto shrink-0" />}
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 border-t border-slate-100 pt-2 text-[10px] italic leading-relaxed text-slate-500">
                      💡 {q.explanation}
                    </p>
                  </motion.div>
                ))}
              </AnimatePresence>
              {questions.length === 0 && (
                <div className="board-card rounded-xl p-8 text-center text-sm text-slate-500">
                  Tidak ada pertanyaan yang cocok dengan filter.
                </div>
              )}
            </div>
          </div>

          {/* Stats card */}
          <div className="space-y-4 lg:sticky lg:top-5 lg:self-start">
            <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur">
              <div className="mb-3 flex items-center gap-2">
                <Database size={18} className="text-amber-300" />
                <h3 className="font-display text-base font-bold text-white">Statistik Bank Soal</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {CATEGORIES.map((cat) => {
                  const count = sqlGetQuestions().filter((q) => q.category === cat).length;
                  return (
                    <div key={cat} className="rounded-lg border border-white/10 bg-slate-800/60 p-2.5">
                      <div className="font-mono-num text-lg font-bold text-amber-300">{count}</div>
                      <div className="text-[9px] font-bold text-slate-400">{cat}</div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 rounded-lg bg-slate-800/60 p-3 text-[10px] leading-relaxed text-slate-300">
                <ShieldCheck size={13} className="mb-1 text-emerald-400" />
                Informasi PUSRI dalam bank soal disusun dari fakta publik yang dapat diverifikasi dan tidak dibuat
                berdasarkan asumsi.
              </div>
            </section>
          </div>
        </div>
      )}

      {tab === 'sets' && (
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <section className="board-card rounded-2xl p-5">
            <h2 className="mb-4 font-display text-lg font-bold text-slate-900">Daftar Question Set</h2>
            <div className="space-y-3">
              {sets.map((s) => (
                <div key={s.id} className="rounded-xl border-2 border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-display text-sm font-bold text-slate-900">{s.name}</div>
                      <div className="text-[11px] text-slate-500">{s.description}</div>
                    </div>
                    <Pill tone="violet">{s.question_ids.length} soal</Pill>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {s.question_ids.slice(0, 8).map((id) => (
                      <span key={id} className="font-mono-num rounded bg-white px-1.5 py-0.5 text-[9px] text-slate-500">
                        {id}
                      </span>
                    ))}
                    {s.question_ids.length > 8 && (
                      <span className="text-[9px] text-slate-400">+{s.question_ids.length - 8} lainnya</span>
                    )}
                  </div>
                </div>
              ))}
              {sets.length === 0 && <p className="text-sm text-slate-500">Belum ada question set.</p>}
            </div>
          </section>

          <section className="board-card rounded-2xl p-5">
            <h2 className="mb-4 font-display text-lg font-bold text-slate-900">Buat Question Set</h2>
            <label className="mb-3 block">
              <span className="mb-1 block text-[11px] font-bold uppercase text-slate-600">Nama Set</span>
              <input
                value={setName}
                onChange={(e) => setSetName(e.target.value)}
                placeholder="Contoh: PUSRI Quiz Mingguan"
                className="w-full rounded-lg border-2 border-slate-300 px-3 py-2 text-xs font-semibold outline-none focus:border-violet-500"
              />
            </label>
            <label className="mb-3 block">
              <span className="mb-1 block text-[11px] font-bold uppercase text-slate-600">Deskripsi</span>
              <textarea
                value={setDesc}
                onChange={(e) => setSetDesc(e.target.value)}
                rows={2}
                className="w-full rounded-lg border-2 border-slate-300 px-3 py-2 text-xs font-semibold outline-none focus:border-violet-500"
              />
            </label>
            <div className="mb-2 text-[11px] font-bold uppercase text-slate-600">Pilih Pertanyaan</div>
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
              {sqlGetQuestions().map((q) => (
                <label key={q.id} className="flex items-start gap-2 rounded p-1.5 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={setSelected.includes(q.id)}
                    onChange={(e) =>
                      setSetSelected((prev) =>
                        e.target.checked ? [...prev, q.id] : prev.filter((id) => id !== q.id)
                      )
                    }
                    className="mt-0.5 accent-violet-600"
                  />
                  <span className="text-[10px] leading-snug text-slate-700">
                    <span className="font-mono-num text-slate-400">[{q.difficulty}]</span> {q.question_text}
                  </span>
                </label>
              ))}
            </div>
            <button
              onClick={createSet}
              className="board-btn-navy mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 py-2.5 text-xs font-extrabold text-white"
            >
              <Plus size={14} /> Simpan Question Set ({setSelected.length})
            </button>
          </section>
        </div>
      )}

      {tab === 'sql' && (
        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <section className="overflow-hidden rounded-2xl border border-white/15 bg-slate-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 bg-slate-900 px-4 py-3">
              <div className="flex items-center gap-2">
                <Code2 size={17} className="text-emerald-400" />
                <span className="font-mono-num text-xs font-bold text-slate-200">alasql · SQL Inspector</span>
              </div>
              <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold text-emerald-400">READ-ONLY</span>
            </div>
            <div className="p-4">
              <textarea
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                rows={5}
                spellCheck={false}
                className="font-mono-num w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-xs leading-relaxed text-emerald-300 outline-none focus:border-emerald-500"
              />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  onClick={runSql}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500"
                >
                  <Play size={14} fill="currentColor" /> Jalankan Query
                </button>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'SELECT * FROM maps',
                    'SELECT * FROM characters',
                    'SELECT category, COUNT(*) AS n FROM questions GROUP BY category',
                    'SELECT difficulty, COUNT(*) AS n FROM questions GROUP BY difficulty ORDER BY difficulty',
                    'SELECT id, name, question_ids_json FROM question_sets',
                    'SELECT code, name, status FROM rooms',
                    'SELECT nickname, position, score FROM players ORDER BY score DESC',
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => setSqlQuery(q)}
                      className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[9px] text-slate-300 hover:border-emerald-500 hover:text-emerald-300"
                    >
                      {q.length > 34 ? `${q.slice(0, 32)}…` : q}
                    </button>
                  ))}
                </div>
              </div>
              {sqlError && (
                <div className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
                  ❌ {sqlError}
                </div>
              )}
              <div className="mt-4 overflow-x-auto rounded-lg border border-slate-800 bg-slate-900">
                {sqlResult === null ? (
                  <p className="p-4 text-xs text-slate-500">Jalankan query SELECT untuk melihat hasil.</p>
                ) : (
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-800 text-slate-300">
                      <tr>
                        {(Array.isArray(sqlResult) && sqlResult.length > 0
                          ? Object.keys(sqlResult[0] as Record<string, unknown>)
                          : []
                        ).map((col) => (
                          <th key={col} className="whitespace-nowrap px-3 py-2 font-bold">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="font-mono-num text-slate-300">
                      {(Array.isArray(sqlResult) ? sqlResult : [sqlResult]).map((row, idx) => (
                        <tr key={idx} className="border-t border-slate-800 hover:bg-slate-800/50">
                          {Object.values(row as Record<string, unknown>).map((val, vidx) => (
                            <td key={vidx} className="max-w-[280px] truncate px-3 py-1.5">
                              {typeof val === 'object' ? JSON.stringify(val) : String(val ?? 'NULL')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </section>

          <section className="board-card rounded-2xl p-5">
            <h3 className="mb-3 flex items-center gap-2 font-display text-base font-bold text-slate-900">
              <FileJson size={17} className="text-violet-600" /> Tabel Database
            </h3>
            <div className="space-y-2 text-[11px]">
              {[
                ['maps', '5 tema peta + konfigurasi ular tangga'],
                ['characters', '7 karakter dari aset yang disediakan'],
                ['questions', 'Bank pertanyaan lengkap dengan kunci jawaban'],
                ['question_sets', 'Paket soal untuk mode CUSTOM'],
                ['rooms', 'Room beserta state turn-by-turn'],
                ['players', 'Posisi, skor, dan status pemain'],
                ['game_results', 'Rekap hasil permainan'],
              ].map(([table, desc]) => (
                <div key={table} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                  <div className="font-mono-num text-xs font-bold text-slate-800">{table}</div>
                  <div className="text-[10px] text-slate-500">{desc}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg bg-amber-50 p-3 text-[10px] leading-relaxed text-amber-900">
              <strong>Keamanan soal:</strong> kunci jawaban hanya disimpan di database (server-side). Frontend menerima
              pertanyaan tanpa informasi jawaban benar hingga pemain mengirim jawaban atau waktu habis.
            </div>
          </section>
        </div>
      )}

      {/* Question editor modal */}
      <AnimatePresence>
        {showEditor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 10 }}
              className="board-card max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-2xl p-5 sm:p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-slate-900">
                  {editing ? 'Edit Pertanyaan' : 'Tambah Pertanyaan Baru'}
                </h2>
                <button onClick={() => setShowEditor(false)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
                  <X size={20} />
                </button>
              </div>

              <label className="mb-3 block">
                <span className="mb-1 block text-[11px] font-bold uppercase text-slate-600">Teks Pertanyaan</span>
                <textarea
                  value={form.question_text}
                  onChange={(e) => setForm({ ...form, question_text: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border-2 border-slate-300 px-3 py-2 text-sm font-semibold outline-none focus:border-amber-500"
                />
              </label>

              <div className="mb-3 grid gap-3 sm:grid-cols-3">
                <label>
                  <span className="mb-1 block text-[11px] font-bold uppercase text-slate-600">Kategori</span>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as QuestionCategory })}
                    className="w-full rounded-lg border-2 border-slate-300 px-2 py-2 text-xs font-bold outline-none focus:border-amber-500"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="mb-1 block text-[11px] font-bold uppercase text-slate-600">Kesulitan (1–6)</span>
                  <select
                    value={form.difficulty}
                    onChange={(e) => setForm({ ...form, difficulty: Number(e.target.value) as Question['difficulty'] })}
                    className="w-full rounded-lg border-2 border-slate-300 px-2 py-2 text-xs font-bold outline-none focus:border-amber-500"
                  >
                    {[1, 2, 3, 4, 5, 6].map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="mb-1 block text-[11px] font-bold uppercase text-slate-600">Waktu (detik)</span>
                  <input
                    type="number"
                    min={5}
                    max={60}
                    value={form.time_limit_sec}
                    onChange={(e) => setForm({ ...form, time_limit_sec: Number(e.target.value) })}
                    className="w-full rounded-lg border-2 border-slate-300 px-2 py-2 text-xs font-bold outline-none focus:border-amber-500"
                  />
                </label>
              </div>

              <div className="mb-3">
                <span className="mb-1 block text-[11px] font-bold uppercase text-slate-600">
                  Opsi Jawaban (pilih satu yang benar)
                </span>
                <div className="space-y-2">
                  {form.options.map((opt, idx) => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correct"
                        checked={form.correct_option_id === opt.id}
                        onChange={() => setForm({ ...form, correct_option_id: opt.id })}
                        className="h-4 w-4 accent-emerald-600"
                        title="Tandai sebagai jawaban benar"
                      />
                      <span className="font-mono-num w-5 text-[10px] text-slate-400">{String.fromCharCode(65 + idx)}</span>
                      <input
                        value={opt.text}
                        onChange={(e) => {
                          const newOptions: QuestionOption[] = form.options.map((o) =>
                            o.id === opt.id ? { ...o, text: e.target.value } : o
                          );
                          setForm({ ...form, options: newOptions });
                        }}
                        placeholder={`Opsi ${String.fromCharCode(65 + idx)}`}
                        className="flex-1 rounded-lg border-2 border-slate-300 px-3 py-1.5 text-xs font-semibold outline-none focus:border-amber-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <label className="mb-4 block">
                <span className="mb-1 block text-[11px] font-bold uppercase text-slate-600">Penjelasan Jawaban</span>
                <textarea
                  value={form.explanation}
                  onChange={(e) => setForm({ ...form, explanation: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border-2 border-slate-300 px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500"
                />
              </label>

              <div className="flex gap-3">
                <button
                  onClick={saveQuestion}
                  className="board-btn-primary flex-1 rounded-xl bg-gradient-to-b from-amber-400 to-orange-500 py-2.5 text-sm font-extrabold text-slate-900"
                >
                  {editing ? 'Simpan Perubahan' : 'Tambah Pertanyaan'}
                </button>
                <button
                  onClick={() => setShowEditor(false)}
                  className="rounded-xl border-2 border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700"
                >
                  Batal
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

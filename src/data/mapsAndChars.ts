import { CharacterAsset, MapTheme } from '../types/game';

export const MAP_THEMES: MapTheme[] = [
  {
    id: 'industrial_world',
    name: 'Industrial World',
    titleId: 'Dunia Pabrik PUSRI',
    subtitle: 'Zona Produksi Amonia & Urea',
    description:
      'Lingkungan pabrik pupuk PUSRI lengkap dengan tangki amonia, prilling tower, jaringan pipa, dan jalur conveyor pengantongan.',
    image_url: '/assets/maps/map1.webp',
    accent_color: '#f59e0b',
    badge_bg: 'bg-amber-500',
    features: ['Tangki Amonia', 'Menara Prilling', 'Conveyor Pupuk', 'Rambu K3 Pabrik'],
    ladders: [
      { id: 'ind_l1', from: 12, to: 23, label: 'Jalur Tangga Operasi' },
      { id: 'ind_l2', from: 19, to: 38, label: 'Lift Menara Produksi' },
      { id: 'ind_l3', from: 52, to: 71, label: 'Akses Kontrol Panel' },
      { id: 'ind_l4', from: 60, to: 69, label: 'Escalator Gudang Urea' },
      { id: 'ind_l5', from: 67, to: 78, label: 'Tangga Prilling Tower' },
    ],
    snakes: [
      { id: 'ind_s1', from: 26, to: 14, label: 'Inspeksi Pipa Bocor' },
      { id: 'ind_s2', from: 33, to: 22, label: 'Alarm Tekanan Tinggi' },
      { id: 'ind_s3', from: 48, to: 37, label: 'Kalibrasi Ulang Katup' },
      { id: 'ind_s4', from: 87, to: 76, label: 'Maintenance Tangki' },
      { id: 'ind_s5', from: 98, to: 77, label: 'Stop Darurat K3' },
    ],
    is_active: true,
  },
  {
    id: 'agricultural_world',
    name: 'Agricultural World',
    titleId: 'Dunia Pertanian',
    subtitle: 'Mitra Tani & Ketahanan Pangan',
    description:
      'Hamparan sawah terasering, kincir air irigasi, traktor pertanian, rumah kaca, dan lumbung pupuk PUSRI untuk negeri.',
    image_url: '/assets/maps/map2.webp',
    accent_color: '#16a34a',
    badge_bg: 'bg-emerald-600',
    features: ['Terasering Sawah', 'Irigasi Kincir Air', 'Greenhouse', 'Gudang Tani'],
    ladders: [
      { id: 'agr_l1', from: 12, to: 23, label: 'Irigasi Lancar' },
      { id: 'agr_l2', from: 19, to: 38, label: 'Pemupukan Berimbang' },
      { id: 'agr_l3', from: 52, to: 71, label: 'Panen Raya Padi' },
      { id: 'agr_l4', from: 60, to: 69, label: 'Teknologi Greenhouse' },
      { id: 'agr_l5', from: 67, to: 78, label: 'Distribusi Mitra Tani' },
      { id: 'agr_l6', from: 74, to: 95, label: 'Swasembada Pangan' },
    ],
    snakes: [
      { id: 'agr_s1', from: 26, to: 14, label: 'Hama Wereng' },
      { id: 'agr_s2', from: 33, to: 22, label: 'Musim Kemarau Panjang' },
      { id: 'agr_s3', from: 58, to: 47, label: 'Kekurangan Unsur Hara' },
      { id: 'agr_s4', from: 64, to: 34, label: 'Dosis Pupuk Tidak Tepat' },
      { id: 'agr_s5', from: 98, to: 77, label: 'Gagal Panen Musiman' },
    ],
    is_active: true,
  },
  {
    id: 'laboratory_world',
    name: 'Laboratory World',
    titleId: 'Dunia Laboratorium',
    subtitle: 'Riset, Inovasi & Uji Kualitas',
    description:
      'Pusat penelitian & pengembangan PUSRI dengan mikroskop digital, bioreaktor tanaman, robotik lab, dan analisis kimia terpadu.',
    image_url: '/assets/maps/map3.webp',
    accent_color: '#0284c7',
    badge_bg: 'bg-sky-600',
    features: ['Mikroskop Analisis', 'Bioreaktor Hayati', 'Robotik Pengujian', 'Quality Control'],
    ladders: [
      { id: 'lab_l1', from: 12, to: 23, label: 'Sampel Lolos Uji' },
      { id: 'lab_l2', from: 19, to: 38, label: 'Formulasi NPK Unggul' },
      { id: 'lab_l3', from: 52, to: 71, label: 'Sertifikasi Mutu SNI' },
      { id: 'lab_l4', from: 60, to: 69, label: 'Otomasi Laboratorium' },
      { id: 'lab_l5', from: 67, to: 78, label: 'Inovasi Pupuk Hayati' },
      { id: 'lab_l6', from: 74, to: 95, label: 'Paten Riset Nasional' },
    ],
    snakes: [
      { id: 'lab_s1', from: 26, to: 14, label: 'Kontaminasi Sampel' },
      { id: 'lab_s2', from: 33, to: 22, label: 'Alat Belum Dikalibrasi' },
      { id: 'lab_s3', from: 58, to: 47, label: 'Salah Takaran Reagen' },
      { id: 'lab_s4', from: 64, to: 34, label: 'Uji Ulang Stabilitas' },
      { id: 'lab_s5', from: 98, to: 77, label: 'Revisi Protokol Lab' },
    ],
    is_active: true,
  },
  {
    id: 'distribution_world',
    name: 'Distribution World',
    titleId: 'Dunia Distribusi',
    subtitle: 'Logistik Pelabuhan & Armada',
    description:
      'Jaringan distribusi pupuk ke seluruh Nusantara melalui kapal kargo Sungai Musi, kereta peti kemas, truk ekspedisi, dan gudang regional.',
    image_url: '/assets/maps/map4.webp',
    accent_color: '#ea580c',
    badge_bg: 'bg-orange-600',
    features: ['Kapal Kargo PUSRI', 'Pelabuhan Kontainer', 'Kereta Logistik', 'Gudang Pupuk'],
    ladders: [
      { id: 'dst_l1', from: 12, to: 23, label: 'Bongkar Muat Cepat' },
      { id: 'dst_l2', from: 19, to: 38, label: 'Jalur Tol Laut Pupuk' },
      { id: 'dst_l3', from: 52, to: 71, label: 'Kereta Kargo Ekspres' },
      { id: 'dst_l4', from: 60, to: 69, label: 'Gudang Lini III Siap' },
      { id: 'dst_l5', from: 67, to: 78, label: 'Pelacakan Armada Real-Time' },
      { id: 'dst_l6', from: 74, to: 95, label: 'Distribusi Tepat Waktu' },
    ],
    snakes: [
      { id: 'dst_s1', from: 26, to: 14, label: 'Antrean Dermaga Padat' },
      { id: 'dst_s2', from: 33, to: 22, label: 'Cuaca Buruk Pelayaran' },
      { id: 'dst_s3', from: 58, to: 47, label: 'Kemacetan Jalur Darat' },
      { id: 'dst_s4', from: 64, to: 34, label: 'Jadwal Kargo Tertunda' },
      { id: 'dst_s5', from: 98, to: 77, label: 'Rute Dialihkan' },
    ],
    is_active: true,
  },
  {
    id: 'green_environment_world',
    name: 'Green Environment World',
    titleId: 'Dunia Lingkungan & K3',
    subtitle: 'Keberlanjutan & Keselamatan Kerja',
    description:
      'Kawasan hijau berkelanjutan dengan energi surya, turbin angin, pengelolaan limbah terpadu, pos P3K, dan budaya Safety First.',
    image_url: '/assets/maps/map5.webp',
    accent_color: '#059669',
    badge_bg: 'bg-teal-600',
    features: ['Panel Surya & Angin', 'Pengolahan Limbah B3', 'Pos P3K & APAR', 'Safety First K3'],
    ladders: [
      { id: 'grn_l1', from: 12, to: 23, label: 'Patuh Gunakan APD' },
      { id: 'grn_l2', from: 19, to: 38, label: 'Program Penghijauan' },
      { id: 'grn_l3', from: 52, to: 71, label: 'Energi Bersih Surya' },
      { id: 'grn_l4', from: 60, to: 69, label: 'Zero Accident Award' },
      { id: 'grn_l5', from: 67, to: 78, label: 'Daur Ulang Limbah' },
      { id: 'grn_l6', from: 74, to: 95, label: 'PROPER Hijau Berkelanjutan' },
    ],
    snakes: [
      { id: 'grn_s1', from: 26, to: 14, label: 'Lupa Memakai Helm K3' },
      { id: 'grn_s2', from: 33, to: 22, label: 'Limbah Tidak Terpilah' },
      { id: 'grn_s3', from: 58, to: 47, label: 'Area Licin Tanpa Rambu' },
      { id: 'grn_s4', from: 64, to: 34, label: 'Pelanggaran Prosedur Safety' },
      { id: 'grn_s5', from: 98, to: 77, label: 'Audit Ulang Lingkungan' },
    ],
    is_active: true,
  },
];

export const CHARACTERS: CharacterAsset[] = [
  {
    id: 'character_01',
    name: 'Raka (Karyawan)',
    role: 'Staf Operasional PUSRI',
    group: 'Karyawan',
    tagline: 'Teliti, sigap, dan siap mengawal proses produksi.',
    image_url: '/assets/characters/karyawan_pria.webp',
    avatar_url: '/assets/characters/karyawan_pria_avatar.webp',
    sheet_url: '/assets/characters/char1.jpeg',
    accent_color: '#2563eb',
  },
  {
    id: 'character_02',
    name: 'Nadia (Karyawati)',
    role: 'Analis Mutu & Riset',
    group: 'Karyawan',
    tagline: 'Cermat dalam setiap uji kualitas dan data lapangan.',
    image_url: '/assets/characters/karyawan_wanita.webp',
    avatar_url: '/assets/characters/karyawan_wanita_avatar.webp',
    sheet_url: '/assets/characters/char1.jpeg',
    accent_color: '#7c3aed',
  },
  {
    id: 'character_03',
    name: 'Bagas (Petani Muda)',
    role: 'Mitra Tani Modern',
    group: 'Petani',
    tagline: 'Semangat bertani cerdas demi panen berlimpah.',
    image_url: '/assets/characters/petani_pria.webp',
    avatar_url: '/assets/characters/petani_pria_avatar.webp',
    sheet_url: '/assets/characters/char2.jpeg',
    accent_color: '#16a34a',
  },
  {
    id: 'character_04',
    name: 'Sari (Petani Kebun)',
    role: 'Penggiat Agro Lestari',
    group: 'Petani',
    tagline: 'Merawat tanaman subur bersama pupuk berkualitas.',
    image_url: '/assets/characters/petani_wanita.webp',
    avatar_url: '/assets/characters/petani_wanita_avatar.webp',
    sheet_url: '/assets/characters/char2.jpeg',
    accent_color: '#0d9488',
  },
  {
    id: 'character_05',
    name: 'Pak Darman (Petani Senior)',
    role: 'Sesepuh Kelompok Tani',
    group: 'Petani',
    tagline: 'Kaya pengalaman menjaga kesuburan lahan nusantara.',
    image_url: '/assets/characters/petani_senior.webp',
    avatar_url: '/assets/characters/petani_senior_avatar.webp',
    sheet_url: '/assets/characters/char2.jpeg',
    accent_color: '#ca8a04',
  },
  {
    id: 'character_06',
    name: 'Dimas (Sekuriti Pria)',
    role: 'Petugas Keamanan & K3',
    group: 'Sekuriti',
    tagline: 'Menjaga keamanan kawasan pabrik dan keselamatan kerja.',
    image_url: '/assets/characters/sekuriti_pria.webp',
    avatar_url: '/assets/characters/sekuriti_pria_avatar.webp',
    sheet_url: '/assets/characters/char3.jpeg',
    accent_color: '#dc2626',
  },
  {
    id: 'character_07',
    name: 'Citra (Sekuriti Wanita)',
    role: 'Koordinator Safety Patrol',
    group: 'Sekuriti',
    tagline: 'Disiplin prosedur K3 untuk operasional tanpa celaka.',
    image_url: '/assets/characters/sekuriti_wanita.webp',
    avatar_url: '/assets/characters/sekuriti_wanita_avatar.webp',
    sheet_url: '/assets/characters/char3.jpeg',
    accent_color: '#ea580c',
  },
];

/**
 * Computes the exact (x%, y%) center of tile `tileNumber` (1..100)
 * matched to the 2.5D perspective grid drawn on map1.jpg .. map5.jpg.
 * Notice on all 5 map images, tiles run left-to-right on every row:
 * Row 0 (bottom): 1..10, Row 1: 11..20, ..., Row 9 (top): 91..100.
 */
export function getTilePercentPosition(tileNumber: number): { x: number; y: number } {
  const clamped = Math.max(1, Math.min(100, Math.round(tileNumber)));
  const col = (clamped - 1) % 10; // 0..9 left to right
  const rowFromBottom = Math.floor((clamped - 1) / 10); // 0..9 bottom to top
  const rowFromTop = 9 - rowFromBottom;

  const u = (col + 0.5) / 10;
  const v = (rowFromTop + 0.5) / 10;

  // Calibrated 4-corner trapezoid of the 10x10 grid across the 2400x1792 map assets
  const xLeftTop = 21.6;
  const xRightTop = 78.4;
  const xLeftBottom = 18.4;
  const xRightBottom = 81.6;

  const yTop = 28.0;
  const yBottom = 87.2;

  // Subtle foreshortening curve in vertical depth
  const vCurve = 0.93 * v + 0.07 * v * v;
  const xLeft = xLeftTop + (xLeftBottom - xLeftTop) * vCurve;
  const xRight = xRightTop + (xRightBottom - xRightTop) * vCurve;

  const x = xLeft + u * (xRight - xLeft);
  const y = yTop + vCurve * (yBottom - yTop);

  return { x, y };
}

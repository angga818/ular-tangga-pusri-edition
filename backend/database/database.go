package database

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"
	"ular-tangga-pusri-backend/config"
)

var Pool *pgxpool.Pool

func Connect(cfg *config.Config) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	poolConfig, err := pgxpool.ParseConfig(cfg.DatabaseURL())
	if err != nil {
		return fmt.Errorf("parse database config: %w", err)
	}

	poolConfig.MaxConns = 20
	poolConfig.MinConns = 5
	poolConfig.MaxConnLifetime = time.Hour
	poolConfig.MaxConnIdleTime = 30 * time.Minute
	poolConfig.HealthCheckPeriod = 1 * time.Minute

	Pool, err = pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		return fmt.Errorf("create connection pool: %w", err)
	}

	if err := Pool.Ping(ctx); err != nil {
		return fmt.Errorf("ping database: %w", err)
	}

	log.Info().Str("host", cfg.Database.Host).Str("db", cfg.Database.Name).Msg("Database connected")
	return nil
}

func Close() {
	if Pool != nil {
		Pool.Close()
		log.Info().Msg("Database connection closed")
	}
}

func RunMigrations() error {
	ctx := context.Background()
	migrations := []string{
		// 0. generator UUID (gen_random_uuid())
		`CREATE EXTENSION IF NOT EXISTS pgcrypto;`,

		// Maps & Characters (dipakai handler saat create/join room)
		`CREATE TABLE IF NOT EXISTS maps (
			id VARCHAR(50) PRIMARY KEY,
			name VARCHAR(100) NOT NULL,
			title_id VARCHAR(100),
			subtitle VARCHAR(150),
			description TEXT,
			image_url TEXT NOT NULL,
			accent_color VARCHAR(20),
			badge_bg VARCHAR(40),
			features JSONB NOT NULL DEFAULT '[]',
			snakes JSONB NOT NULL DEFAULT '[]',
			ladders JSONB NOT NULL DEFAULT '[]',
			is_active BOOLEAN NOT NULL DEFAULT TRUE
		);`,
		`CREATE TABLE IF NOT EXISTS characters (
			id VARCHAR(50) PRIMARY KEY,
			name VARCHAR(100) NOT NULL,
			role VARCHAR(100),
			tagline TEXT,
			image_url TEXT NOT NULL,
			avatar_url TEXT NOT NULL,
			accent_color VARCHAR(20),
			is_active BOOLEAN NOT NULL DEFAULT TRUE
		);`,

		// 1. Rooms table
		`CREATE TABLE IF NOT EXISTS rooms (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			code VARCHAR(6) UNIQUE NOT NULL,
			name VARCHAR(100) NOT NULL,
			host_token VARCHAR(64) NOT NULL,
			map_id VARCHAR(50) NOT NULL,
			status VARCHAR(20) NOT NULL DEFAULT 'LOBBY',
			max_players INT NOT NULL DEFAULT 4,
			question_mode VARCHAR(10) NOT NULL DEFAULT 'RANDOM',
			question_set_id UUID,
			categories TEXT[] DEFAULT '{}',
			turn_time_limit_sec INT NOT NULL DEFAULT 20,
			current_turn INT NOT NULL DEFAULT 0,
			current_player_id UUID,
			turn_state JSONB NOT NULL DEFAULT '{}',
			spectator_ids UUID[] DEFAULT '{}',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);`,

		// 2. Players table
		`CREATE TABLE IF NOT EXISTS players (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
			player_token VARCHAR(64) NOT NULL,
			nickname VARCHAR(20) NOT NULL,
			character_id VARCHAR(50) NOT NULL,
			position INT NOT NULL DEFAULT 1,
			score BIGINT NOT NULL DEFAULT 0,
			correct_answers INT NOT NULL DEFAULT 0,
			total_answer_time_ms BIGINT NOT NULL DEFAULT 0,
			is_ready BOOLEAN NOT NULL DEFAULT FALSE,
			is_connected BOOLEAN NOT NULL DEFAULT TRUE,
			is_bot BOOLEAN NOT NULL DEFAULT FALSE,
			is_spectator BOOLEAN NOT NULL DEFAULT FALSE,
			joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);`,

		// 3. Questions table
		`CREATE TABLE IF NOT EXISTS questions (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			question_text TEXT NOT NULL,
			category VARCHAR(30) NOT NULL,
			difficulty INT NOT NULL CHECK (difficulty BETWEEN 1 AND 6),
			time_limit_sec INT NOT NULL DEFAULT 20,
			options JSONB NOT NULL,
			correct_option_id VARCHAR(64) NOT NULL,
			explanation TEXT,
			is_active BOOLEAN NOT NULL DEFAULT TRUE,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);`,

		// 4. Question sets table
		`CREATE TABLE IF NOT EXISTS question_sets (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			name VARCHAR(100) NOT NULL,
			description TEXT,
			question_ids UUID[] NOT NULL DEFAULT '{}',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);`,

		// 5. Game results table
		`CREATE TABLE IF NOT EXISTS game_results (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
			room_name VARCHAR(100) NOT NULL,
			map_id VARCHAR(50) NOT NULL,
			winner_id UUID,
			leaderboard JSONB NOT NULL,
			total_turns INT NOT NULL DEFAULT 0,
			ended_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);`,

		// Indexes
		`CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);`,
		`CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);`,
		`CREATE INDEX IF NOT EXISTS idx_players_room ON players(room_id);`,
		`CREATE INDEX IF NOT EXISTS idx_players_token ON players(player_token);`,
		`CREATE INDEX IF NOT EXISTS idx_questions_active ON questions(is_active, category, difficulty);`,
		`CREATE INDEX IF NOT EXISTS idx_game_results_room ON game_results(room_id);`,

		// Updated_at trigger function
		`CREATE OR REPLACE FUNCTION update_updated_at_column()
		RETURNS TRIGGER AS $$
		BEGIN
			NEW.updated_at = NOW();
			RETURN NEW;
		END;
		$$ language 'plpgsql';`,

		// Trigger for rooms
		`DROP TRIGGER IF EXISTS update_rooms_updated_at ON rooms;
		CREATE TRIGGER update_rooms_updated_at
			BEFORE UPDATE ON rooms
			FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`,
	}

	for i, migration := range migrations {
		if _, err := Pool.Exec(ctx, migration); err != nil {
			return fmt.Errorf("migration %d failed: %w", i+1, err)
		}
	}

	log.Info().Int("count", len(migrations)).Msg("Migrations completed")
	return nil
}

func SeedQuestions() error {
	ctx := context.Background()

	// Check if questions already exist
	var count int
	err := Pool.QueryRow(ctx, "SELECT COUNT(*) FROM questions").Scan(&count)
	if err != nil {
		return fmt.Errorf("count questions: %w", err)
	}
	if count > 0 {
		log.Info().Int("count", count).Msg("Questions already seeded")
		return nil
	}

	// Sample questions for PUSRI Edition
	questions := []struct {
		Text       string
		Category   string
		Difficulty int
		TimeLimit  int
		Options    []struct {
			ID     string
			Text   string
			IsCorrect bool
		}
		CorrectID string
		Explanation string
	}{
		{
			Text: "Apa singkatan dari PUSRI?",
			Category: "PUSRI",
			Difficulty: 1,
			TimeLimit: 15,
			Options: []struct{ID string; Text string; IsCorrect bool}{
				{"a", "Pupuk Sriwidjaja", true},
				{"b", "Pupuk Srigunting", false},
				{"c", "Perusahaan Umum Sriwidjaja", false},
				{"d", "Pusat Riset Industri", false},
			},
			CorrectID: "a",
			Explanation: "PUSRI adalah singkatan dari Pupuk Sriwidjaja, perusahaan pupuk milik negara di Palembang.",
		},
		{
			Text: "Pabrik PUSRI berlokasi di kota mana?",
			Category: "PUSRI",
			Difficulty: 1,
			TimeLimit: 15,
			Options: []struct{ID string; Text string; IsCorrect bool}{
				{"a", "Jakarta", false},
				{"b", "Surabaya", false},
				{"c", "Palembang", true},
				{"d", "Medan", false},
			},
			CorrectID: "c",
			Explanation: "Pabrik PUSRI berlokasi di Plaju, Palembang, Sumatera Selatan.",
		},
		{
			Text: "Produk utama PUSRI adalah?",
			Category: "PUSRI",
			Difficulty: 1,
			TimeLimit: 15,
			Options: []struct{ID string; Text string; IsCorrect bool}{
				{"a", "Urea", true},
				{"b", "SP-36", false},
				{"c", "ZK", false},
				{"d", "NPK", false},
			},
			CorrectID: "a",
			Explanation: "Produk utama PUSRI adalah pupuk Urea dengan merk 'PUSRI Urea'.",
		},
		{
			Text: "Unsur hara utama dalam pupuk Urea adalah?",
			Category: "PERTANIAN",
			Difficulty: 2,
			TimeLimit: 20,
			Options: []struct{ID string; Text string; IsCorrect bool}{
				{"a", "Fosfor (P)", false},
				{"b", "Kalium (K)", false},
				{"c", "Nitrogen (N)", true},
				{"d", "Sulfur (S)", false},
			},
			CorrectID: "c",
			Explanation: "Urea mengandung 46% Nitrogen, paling tinggi di antara pupuk nitrogen solid.",
		},
		{
			Text: "Kapan PUSRI didirikan?",
			Category: "PUSRI",
			Difficulty: 2,
			TimeLimit: 20,
			Options: []struct{ID string; Text string; IsCorrect bool}{
				{"a", "1959", false},
				{"b", "1962", false},
				{"c", "1965", false},
				{"d", "1956", true},
			},
			CorrectID: "d",
			Explanation: "PUSRI didirikan pada tahun 1956 sebagai Pupuk Sriwidjaja.",
		},
		{
			Text: "Apa fungsi pupuk SP-36?",
			Category: "PERTANIAN",
			Difficulty: 2,
			TimeLimit: 20,
			Options: []struct{ID string; Text string; IsCorrect bool}{
				{"a", "Menyuplai Nitrogen", false},
				{"b", "Menyuplai Fosfor", true},
				{"c", "Menyuplai Kalium", false},
				{"d", "Menyuplai Magnesium", false},
			},
			CorrectID: "b",
			Explanation: "SP-36 (Super Phosphate 36%) adalah pupuk Fosfor dengan kandungan P2O5 36%.",
		},
		{
			Text: "Proses produksi Urea menggunakan bahan baku?",
			Category: "INDUSTRI",
			Difficulty: 3,
			TimeLimit: 30,
			Options: []struct{ID string; Text string; IsCorrect bool}{
				{"a", "Ammonia + CO2", true},
				{"b", "Ammonia + H2S", false},
				{"c", "N2 + H2", false},
				{"d", "CO2 + H2", false},
			},
			CorrectID: "a",
			Explanation: "Urea diproduksi dari reaksi Ammonia (NH3) dengan Karbon Dioksida (CO2) pada tekanan dan suhu tinggi.",
		},
		{
			Text: "Apa itu K3 di lingkungan industri?",
			Category: "K3",
			Difficulty: 2,
			TimeLimit: 20,
			Options: []struct{ID string; Text string; IsCorrect bool}{
				{"a", "Kesehatan, Keselamatan, Keamanan", false},
				{"b", "Keselamatan, Kesehatan, Kerja", true},
				{"c", "Kebersihan, Kesehatan, Keselamatan", false},
				{"d", "Kelistrikan, Kesehatan, Keselamatan", false},
			},
			CorrectID: "b",
			Explanation: "K3 = Keselamatan dan Kesehatan Kerja. Di Indonesia diatur dalam UU No. 1 Tahun 1970.",
		},
		{
			Text: "Alat pelindung diri (APD) untuk menangani amoniak bocor meliputi?",
			Category: "K3",
			Difficulty: 3,
			TimeLimit: 30,
			Options: []struct{ID string; Text string; IsCorrect bool}{
				{"a", "Masker kain biasa", false},
				{"b", "Respirator dengan tabung udara (SCBA), pakaian tahan kimia, sarung tangan, kacamata", true},
				{"c", "Helm safety saja", false},
				{"d", "Sepatu boot saja", false},
			},
			CorrectID: "b",
			Explanation: "Amoniak berbahaya bila terhirup. Penanganan kebocoran memerlukan SCBA dan pakaian pelindung lengkap.",
		},
		{
			Text: "Apa tujuan pengelolaan limbah B3?",
			Category: "LINGKUNGAN",
			Difficulty: 2,
			TimeLimit: 20,
			Options: []struct{ID string; Text string; IsCorrect bool}{
				{"a", "Membuang ke sungai terdekat", false},
				{"b", "Mengurangi risiko bagi kesehatan manusia dan lingkungan", true},
				{"c", "Menghemat biaya produksi", false},
				{"d", "Meningkatkan kecepatan produksi", false},
			},
			CorrectID: "b",
			Explanation: "Pengelolaan B3 (Bahan Berbahaya dan Beracun) bertujuan melindungi lingkungan dan kesehatan masyarakat.",
		},
		{
			Text: "Distribusi pupuk PUSRI ke petani dilakukan melalui?",
			Category: "DISTRIBUSI",
			Difficulty: 2,
			TimeLimit: 20,
			Options: []struct{ID string; Text string; IsCorrect bool}{
				{"a", "Langsung dari pabrik ke petani", false},
				{"b", "Jaringan agen/distributor resmi & kios pertanian", true},
				{"c", "Toko bahan bangunan", false},
				{"d", "Pasar tradisional umum", false},
			},
			CorrectID: "b",
			Explanation: "PUSRI mendistribusikan pupuk melalui jaringan distributor resmi dan kios pertanian di seluruh Indonesia.",
		},
		{
			Text: "Laboratorium PUSRI berfungsi untuk?",
			Category: "LABORATORIUM",
			Difficulty: 2,
			TimeLimit: 20,
			Options: []struct{ID string; Text string; IsCorrect bool}{
				{"a", "Mengujikan kualitas air minum", false},
				{"b", "Analisis kualitas pupuk, bahan baku, dan limbah", true},
				{"c", "Riset obat-obatan", false},
				{"d", "Pengujian makanan", false},
			},
			CorrectID: "b",
			Explanation: "Lab PUSRI melakukan analisis mutu pupuk (kadar N, kelembaban, ukuran butir), bahan baku, dan limbah produksi.",
		},
	}

	for _, q := range questions {
		// Build options JSON dengan encoder (aman untuk tanda kutip & unicode).
		type seedOption struct {
			ID   string `json:"id"`
			Text string `json:"text"`
		}
		opts := make([]seedOption, 0, len(q.Options))
		for _, opt := range q.Options {
			opts = append(opts, seedOption{ID: opt.ID, Text: opt.Text})
		}
		optionsBytes, err := json.Marshal(opts)
		if err != nil {
			log.Error().Err(err).Str("question", q.Text).Msg("Failed to encode options")
			continue
		}

		_, err = Pool.Exec(ctx, `
			INSERT INTO questions (question_text, category, difficulty, time_limit_sec, options, correct_option_id, explanation, is_active)
			VALUES ($1, $2, $3, $4, $5, $6, $7, true)
		`, q.Text, q.Category, q.Difficulty, q.TimeLimit, string(optionsBytes), q.CorrectID, q.Explanation)
		if err != nil {
			log.Error().Err(err).Str("question", q.Text).Msg("Failed to seed question")
			continue
		}
	}

	log.Info().Int("count", len(questions)).Msg("Questions seeded")
	return nil
}

// SeedMapsAndCharacters mengisi tabel referensi yang divalidasi handler saat
// membuat room dan memilih karakter. Aman dijalankan berulang kali.
func SeedMapsAndCharacters() error {
	ctx := context.Background()

	maps := []struct {
		ID, Name, TitleID, Subtitle, Accent, Badge, Image string
	}{
		{"industrial_world", "Industrial World", "Dunia Pabrik PUSRI", "Zona Produksi Amonia & Urea", "#f59e0b", "bg-amber-500", "/assets/maps/map1.webp"},
		{"agricultural_world", "Agricultural World", "Dunia Pertanian", "Mitra Tani & Ketahanan Pangan", "#22c55e", "bg-emerald-500", "/assets/maps/map2.webp"},
		{"laboratory_world", "Laboratory World", "Dunia Laboratorium", "Riset, Inovasi & Uji Kualitas", "#8b5cf6", "bg-violet-500", "/assets/maps/map3.webp"},
		{"distribution_world", "Distribution World", "Dunia Distribusi", "Logistik Pelabuhan & Armada", "#0ea5e9", "bg-sky-500", "/assets/maps/map4.webp"},
		{"green_environment_world", "Green Environment World", "Dunia Lingkungan & K3", "Keberlanjutan & Keselamatan Kerja", "#10b981", "bg-teal-500", "/assets/maps/map5.webp"},
	}
	for _, m := range maps {
		_, err := Pool.Exec(ctx, `
			INSERT INTO maps (id, name, title_id, subtitle, description, image_url, accent_color, badge_bg, features, snakes, ladders, is_active)
			VALUES ($1, $2, $3, $4, '', $5, $6, $7, '[]', '[]', '[]', true)
			ON CONFLICT (id) DO NOTHING
		`, m.ID, m.Name, m.TitleID, m.Subtitle, m.Image, m.Accent, m.Badge)
		if err != nil {
			return fmt.Errorf("seed map %s: %w", m.ID, err)
		}
	}

	characters := []struct {
		ID, Name, Role, Tagline, Image, Avatar, Accent string
	}{
		{"character_01", "Raka (Karyawan)", "Staf Operasional PUSRI", "Teliti, sigap, dan siap mengawal proses produksi.", "/assets/characters/karyawan_pria.webp", "/assets/characters/karyawan_pria_avatar.webp", "#2563eb"},
		{"character_02", "Nadia (Karyawati)", "Analis Mutu & Riset", "Cermat dalam setiap uji kualitas dan data lapangan.", "/assets/characters/karyawan_wanita.webp", "/assets/characters/karyawan_wanita_avatar.webp", "#7c3aed"},
		{"character_03", "Bagas (Petani Muda)", "Mitra Tani Modern", "Semangat bertani cerdas demi panen berlimpah.", "/assets/characters/petani_pria.webp", "/assets/characters/petani_pria_avatar.webp", "#16a34a"},
		{"character_04", "Sari (Petani Kebun)", "Penggiat Agro Lestari", "Merawat tanaman subur bersama pupuk berkualitas.", "/assets/characters/petani_wanita.webp", "/assets/characters/petani_wanita_avatar.webp", "#0d9488"},
		{"character_05", "Pak Darman (Petani Senior)", "Sesepuh Kelompok Tani", "Kaya pengalaman menjaga kesuburan lahan nusantara.", "/assets/characters/petani_senior.webp", "/assets/characters/petani_senior_avatar.webp", "#ca8a04"},
		{"character_06", "Dimas (Sekuriti Pria)", "Petugas Keamanan & K3", "Menjaga keamanan kawasan pabrik dan keselamatan kerja.", "/assets/characters/sekuriti_pria.webp", "/assets/characters/sekuriti_pria_avatar.webp", "#dc2626"},
		{"character_07", "Citra (Sekuriti Wanita)", "Koordinator Safety Patrol", "Disiplin prosedur K3 untuk operasional tanpa celaka.", "/assets/characters/sekuriti_wanita.webp", "/assets/characters/sekuriti_wanita_avatar.webp", "#ea580c"},
	}
	for _, c := range characters {
		_, err := Pool.Exec(ctx, `
			INSERT INTO characters (id, name, role, tagline, image_url, avatar_url, accent_color, is_active)
			VALUES ($1, $2, $3, $4, $5, $6, $7, true)
			ON CONFLICT (id) DO NOTHING
		`, c.ID, c.Name, c.Role, c.Tagline, c.Image, c.Avatar, c.Accent)
		if err != nil {
			return fmt.Errorf("seed character %s: %w", c.ID, err)
		}
	}

	log.Info().Int("maps", len(maps)).Int("characters", len(characters)).Msg("Maps and characters seeded")
	return nil
}
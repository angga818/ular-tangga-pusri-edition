package config

import (
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	WS       WSConfig
	Game     GameConfig
}

type ServerConfig struct {
	Host string
	Port string
}

type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	Name     string
	SSLMode  string
}

type WSConfig struct {
	ReadBufferSize  int
	WriteBufferSize int
	PingInterval    time.Duration
	PongWait        time.Duration
	WriteWait       time.Duration
	MaxMessageSize  int64
}

type GameConfig struct {
	TurnTimeLimitSec    int
	MaxPlayersPerRoom   int
	MinPlayersToStart   int
	DiceRollAnimationMs int
	QuestionFeedbackMs  int
	MoveAnimationMs     int
	LadderAnimationMs   int
	SnakeAnimationMs    int
	TurnChangeDelayMs   int
	BotThinkMinMs       int
	BotThinkMaxMs       int
	BotCorrectRateBase  float64
	BotCorrectRatePerD  float64
}

func Load() *Config {
	_ = godotenv.Load()

	return &Config{
		Server: ServerConfig{
			Host: getEnv("SERVER_HOST", "0.0.0.0"),
			Port: getEnv("SERVER_PORT", "8080"),
		},
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnv("DB_PORT", "5432"),
			User:     getEnv("DB_USER", "postgres"),
			Password: getEnv("DB_PASSWORD", "postgres"),
			Name:     getEnv("DB_NAME", "ular_tangga"),
			SSLMode:  getEnv("DB_SSL_MODE", "disable"),
		},
		WS: WSConfig{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
			PingInterval:    30 * time.Second,
			PongWait:        60 * time.Second,
			WriteWait:       10 * time.Second,
			MaxMessageSize:  512 * 1024, // 512KB
		},
		Game: GameConfig{
			TurnTimeLimitSec:    20,
			MaxPlayersPerRoom:   8,
			MinPlayersToStart:   2,
			DiceRollAnimationMs: 1450,
			QuestionFeedbackMs:  1450,
			MoveAnimationMs:     700,
			LadderAnimationMs:   1200,
			SnakeAnimationMs:    1200,
			TurnChangeDelayMs:   450,
			BotThinkMinMs:       1200,
			BotThinkMaxMs:       4200,
			BotCorrectRateBase:  0.85,
			BotCorrectRatePerD:  0.06,
		},
	}
}

func (c *Config) DatabaseURL() string {
	return "postgres://" + c.Database.User + ":" + c.Database.Password + "@" +
		c.Database.Host + ":" + c.Database.Port + "/" + c.Database.Name +
		"?sslmode=" + c.Database.SSLMode
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if value, ok := os.LookupEnv(key); ok {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return fallback
}

func getEnvDuration(key string, fallback time.Duration) time.Duration {
	if value, ok := os.LookupEnv(key); ok {
		if dur, err := time.ParseDuration(value); err == nil {
			return dur
		}
	}
	return fallback
}
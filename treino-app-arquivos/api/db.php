<?php
/** db.php — conexao PDO + criacao automatica das tabelas. */

declare(strict_types=1);

function tr_config(): array
{
    static $cfg = null;
    if ($cfg === null) {
        $path = __DIR__ . '/config.php';
        if (!is_file($path)) {
            throw new RuntimeException(
                'api/config.php nao encontrado. Copie api/config.example.php para '
                . 'api/config.php e preencha as credenciais do banco.'
            );
        }
        $cfg = require $path;
        if (!is_array($cfg)) {
            throw new RuntimeException('api/config.php precisa retornar um array.');
        }
    }
    return $cfg;
}

function tr_db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $c = tr_config();
    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=%s',
        $c['db_host'],
        $c['db_name'],
        $c['db_charset'] ?? 'utf8mb4'
    );

    try {
        $pdo = new PDO($dsn, $c['db_user'], $c['db_pass'], [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    } catch (PDOException $e) {
        throw new RuntimeException('Nao foi possivel conectar ao banco. Verifique api/config.php.');
    }

    if (!empty($c['auto_migrate'])) {
        tr_migrate($pdo);
    }

    return $pdo;
}

function tr_migrate(PDO $pdo): void
{
    $pdo->exec(<<<SQL
CREATE TABLE IF NOT EXISTS treino_entries (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_key      VARCHAR(64)  NOT NULL,
  entry_date    DATE         NOT NULL,
  workout_id    VARCHAR(64)  NOT NULL,
  kind          VARCHAR(16)  NOT NULL DEFAULT 'strength',
  status        VARCHAR(16)  NOT NULL DEFAULT 'pending',
  intensity     TINYINT      NULL,
  feeling       TINYINT      NULL,
  notes         TEXT         NULL,
  distance_km   DECIMAL(7,2) NULL,
  duration_min  INT          NULL,
  pace_sec      INT          NULL,
  variant       VARCHAR(24)  NULL,
  completed_at  VARCHAR(32)  NULL,
  updated_at    VARCHAR(32)  NOT NULL,
  server_at     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                             ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_entry (user_key, entry_date, workout_id),
  KEY idx_server_at (user_key, server_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);

    $pdo->exec(<<<SQL
CREATE TABLE IF NOT EXISTS treino_exercises (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_key     VARCHAR(64)  NOT NULL,
  entry_date   DATE         NOT NULL,
  workout_id   VARCHAR(64)  NOT NULL,
  exercise_id  VARCHAR(64)  NOT NULL,
  done         TINYINT(1)   NOT NULL DEFAULT 0,
  load_kg      DECIMAL(6,2) NULL,
  updated_at   VARCHAR(32)  NOT NULL,
  server_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                            ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_ex (user_key, entry_date, workout_id, exercise_id),
  KEY idx_server_at (user_key, server_at),
  KEY idx_exercise (user_key, exercise_id, entry_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
}

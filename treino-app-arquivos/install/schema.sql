-- ---------------------------------------------------------------------------
-- Treino — estrutura do banco (MySQL / MariaDB)
--
-- Opcional: a API cria as tabelas sozinha na primeira chamada
-- (config.php -> 'auto_migrate' => true). Use este arquivo se preferir
-- criar manualmente pelo phpMyAdmin da Hostinger.
--
-- Como usar: hPanel -> Bancos de dados -> phpMyAdmin -> aba "SQL" -> colar -> Executar.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS treino_entries (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_key      VARCHAR(64)  NOT NULL,
  entry_date    DATE         NOT NULL,
  workout_id    VARCHAR(64)  NOT NULL,
  kind          VARCHAR(16)  NOT NULL DEFAULT 'strength',  -- strength | run | swim
  status        VARCHAR(16)  NOT NULL DEFAULT 'pending',   -- pending | done
  intensity     TINYINT      NULL,                          -- 1..5
  feeling       TINYINT      NULL,                          -- 1..5
  notes         TEXT         NULL,
  distance_km   DECIMAL(7,2) NULL,
  duration_min  INT          NULL,
  pace_sec      INT          NULL,                          -- segundos por km
  variant       VARCHAR(24)  NULL,                          -- longao | prova
  completed_at  VARCHAR(32)  NULL,                          -- ISO8601 do cliente
  updated_at    VARCHAR(32)  NOT NULL,                      -- ISO8601 do cliente
  server_at     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                             ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_entry (user_key, entry_date, workout_id),
  KEY idx_server_at (user_key, server_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Consulta util: evolucao de carga de um exercicio
-- SELECT entry_date, load_kg FROM treino_exercises
--  WHERE user_key = 'rodrigo' AND exercise_id = 'supino_reto' AND load_kg IS NOT NULL
--  ORDER BY entry_date DESC LIMIT 20;

<?php
/**
 * index.php — API de sincronizacao do app Treino.
 *
 * Acoes:
 *   GET  ?action=ping                 -> testa conexao com o banco
 *   GET  ?action=pull&since=<token>   -> registros alterados desde o token
 *   POST ?action=push                 -> envia registros locais (upsert)
 *
 * Autenticacao: header  X-App-Key: <app_key do config.php>
 */

declare(strict_types=1);

require __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function tr_fail(int $code, string $msg): never
{
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

function tr_ok(array $data = []): never
{
    echo json_encode(['ok' => true] + $data, JSON_UNESCAPED_UNICODE);
    exit;
}

/* ----------------------------- auth ----------------------------- */

try {
    $cfg = tr_config();
} catch (Throwable $e) {
    tr_fail(500, $e->getMessage());
}

$expected = (string) ($cfg['app_key'] ?? '');

if ($expected === '' || str_starts_with($expected, 'troque-esta-chave')) {
    tr_fail(500, 'Defina uma app_key propria em api/config.php.');
}

$sent = $_SERVER['HTTP_X_APP_KEY'] ?? '';
if (!is_string($sent) || !hash_equals($expected, $sent)) {
    tr_fail(401, 'Chave de acesso invalida.');
}

$userKey = (string) ($cfg['user_key'] ?? 'default');
$action  = $_GET['action'] ?? '';

/* --------------------------- helpers ---------------------------- */

function tr_date(?string $v): ?string
{
    if (!is_string($v) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $v)) return null;
    return $v;
}

function tr_str($v, int $max = 64): ?string
{
    if (!is_string($v)) return null;
    $v = trim($v);
    if ($v === '') return null;
    return mb_substr($v, 0, $max);
}

function tr_int($v, int $min, int $max): ?int
{
    if ($v === null || $v === '' || !is_numeric($v)) return null;
    $n = (int) round((float) $v);
    if ($n < $min || $n > $max) return null;
    return $n;
}

function tr_dec($v, float $min, float $max): ?float
{
    if ($v === null || $v === '' || !is_numeric($v)) return null;
    $n = (float) $v;
    if ($n < $min || $n > $max) return null;
    return round($n, 2);
}

/** Agora, em UTC, com milissegundos (gmdate nao tem precisao sub-segundo). */
function tr_now(string $fmt = 'Y-m-d H:i:s.v'): string
{
    return (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format($fmt);
}

function tr_stamp($v): string
{
    $s = is_string($v) ? trim($v) : '';
    if ($s === '' || strlen($s) > 32) {
        return tr_now('Y-m-d\TH:i:s.v\Z');
    }
    return $s;
}

function tr_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') return [];
    if (strlen($raw) > 4 * 1024 * 1024) {
        tr_fail(413, 'Payload muito grande.');
    }
    $j = json_decode($raw, true);
    return is_array($j) ? $j : [];
}

/* ----------------------------- rotas ---------------------------- */

try {
    $pdo = tr_db();
    $pdo->exec("SET time_zone = '+00:00'");

    if ($action === 'ping') {
        $n1 = (int) $pdo->query('SELECT COUNT(*) c FROM treino_entries')->fetch()['c'];
        $n2 = (int) $pdo->query('SELECT COUNT(*) c FROM treino_exercises')->fetch()['c'];
        tr_ok([
            'db'         => $cfg['db_name'],
            'entries'    => $n1,
            'exercises'  => $n2,
            'serverTime' => tr_now(),
            'php'        => PHP_VERSION,
        ]);
    }

    /* ------------------------- PULL ------------------------- */
    if ($action === 'pull') {
        $since = $_GET['since'] ?? '';
        $hasSince = is_string($since)
            && preg_match('/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z?$/', $since);
        $sinceVal = $hasSince ? str_replace(['T', 'Z'], [' ', ''], $since) : null;

        $serverTime = tr_now();

        $whereE = 'user_key = ?';
        $argsE  = [$userKey];
        if ($sinceVal !== null) { $whereE .= ' AND server_at > ?'; $argsE[] = $sinceVal; }

        $st = $pdo->prepare(
            "SELECT entry_date AS `date`, workout_id, kind, status, intensity, feeling, notes,
                    distance_km, duration_min, pace_sec, variant, completed_at, updated_at
             FROM treino_entries WHERE $whereE ORDER BY entry_date DESC LIMIT 5000"
        );
        $st->execute($argsE);
        $entries = array_map(static function (array $r): array {
            $r['intensity']    = $r['intensity'] !== null ? (int) $r['intensity'] : null;
            $r['feeling']      = $r['feeling'] !== null ? (int) $r['feeling'] : null;
            $r['distance_km']  = $r['distance_km'] !== null ? (float) $r['distance_km'] : null;
            $r['duration_min'] = $r['duration_min'] !== null ? (int) $r['duration_min'] : null;
            $r['pace_sec']     = $r['pace_sec'] !== null ? (int) $r['pace_sec'] : null;
            return $r;
        }, $st->fetchAll());

        $st2 = $pdo->prepare(
            "SELECT entry_date AS `date`, workout_id, exercise_id, done, load_kg, updated_at
             FROM treino_exercises WHERE $whereE ORDER BY entry_date DESC LIMIT 20000"
        );
        $st2->execute($argsE);
        $exercises = array_map(static function (array $r): array {
            $r['done']    = (bool) $r['done'];
            $r['load_kg'] = $r['load_kg'] !== null ? (float) $r['load_kg'] : null;
            return $r;
        }, $st2->fetchAll());

        tr_ok([
            'entries'    => $entries,
            'exercises'  => $exercises,
            'serverTime' => $serverTime,
        ]);
    }

    /* ------------------------- PUSH ------------------------- */
    if ($action === 'push') {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            tr_fail(405, 'Use POST para push.');
        }

        $body      = tr_body();
        $entries   = is_array($body['entries'] ?? null) ? $body['entries'] : [];
        $exercises = is_array($body['exercises'] ?? null) ? $body['exercises'] : [];

        if (count($entries) > 5000 || count($exercises) > 20000) {
            tr_fail(413, 'Muitos registros de uma vez.');
        }

        $sqlE = <<<SQL
INSERT INTO treino_entries
  (user_key, entry_date, workout_id, kind, status, intensity, feeling, notes,
   distance_km, duration_min, pace_sec, variant, completed_at, updated_at)
VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
ON DUPLICATE KEY UPDATE
  kind         = IF(VALUES(updated_at) >= updated_at, VALUES(kind), kind),
  status       = IF(VALUES(updated_at) >= updated_at, VALUES(status), status),
  intensity    = IF(VALUES(updated_at) >= updated_at, VALUES(intensity), intensity),
  feeling      = IF(VALUES(updated_at) >= updated_at, VALUES(feeling), feeling),
  notes        = IF(VALUES(updated_at) >= updated_at, VALUES(notes), notes),
  distance_km  = IF(VALUES(updated_at) >= updated_at, VALUES(distance_km), distance_km),
  duration_min = IF(VALUES(updated_at) >= updated_at, VALUES(duration_min), duration_min),
  pace_sec     = IF(VALUES(updated_at) >= updated_at, VALUES(pace_sec), pace_sec),
  variant      = IF(VALUES(updated_at) >= updated_at, VALUES(variant), variant),
  completed_at = IF(VALUES(updated_at) >= updated_at, VALUES(completed_at), completed_at),
  updated_at   = IF(VALUES(updated_at) >= updated_at, VALUES(updated_at), updated_at)
SQL;

        $sqlX = <<<SQL
INSERT INTO treino_exercises
  (user_key, entry_date, workout_id, exercise_id, done, load_kg, updated_at)
VALUES (?,?,?,?,?,?,?)
ON DUPLICATE KEY UPDATE
  done       = IF(VALUES(updated_at) >= updated_at, VALUES(done), done),
  load_kg    = IF(VALUES(updated_at) >= updated_at, VALUES(load_kg), load_kg),
  updated_at = IF(VALUES(updated_at) >= updated_at, VALUES(updated_at), updated_at)
SQL;

        $stE = $pdo->prepare($sqlE);
        $stX = $pdo->prepare($sqlX);

        $savedE = 0;
        $savedX = 0;

        $pdo->beginTransaction();
        try {
            foreach ($entries as $e) {
                if (!is_array($e)) continue;
                $date = tr_date($e['date'] ?? null);
                $wid  = tr_str($e['workout_id'] ?? null, 64);
                if ($date === null || $wid === null) continue;

                $stE->execute([
                    $userKey,
                    $date,
                    $wid,
                    tr_str($e['kind'] ?? 'strength', 16) ?? 'strength',
                    (($e['status'] ?? '') === 'done') ? 'done' : 'pending',
                    tr_int($e['intensity'] ?? null, 1, 5),
                    tr_int($e['feeling'] ?? null, 1, 5),
                    tr_str($e['notes'] ?? null, 1000),
                    tr_dec($e['distance_km'] ?? null, 0, 1000),
                    tr_int($e['duration_min'] ?? null, 0, 100000),
                    tr_int($e['pace_sec'] ?? null, 0, 100000),
                    tr_str($e['variant'] ?? null, 24),
                    tr_str($e['completed_at'] ?? null, 32),
                    tr_stamp($e['updated_at'] ?? null),
                ]);
                $savedE++;
            }

            foreach ($exercises as $x) {
                if (!is_array($x)) continue;
                $date = tr_date($x['date'] ?? null);
                $wid  = tr_str($x['workout_id'] ?? null, 64);
                $exid = tr_str($x['exercise_id'] ?? null, 64);
                if ($date === null || $wid === null || $exid === null) continue;

                $stX->execute([
                    $userKey,
                    $date,
                    $wid,
                    $exid,
                    !empty($x['done']) ? 1 : 0,
                    tr_dec($x['load_kg'] ?? null, 0, 2000),
                    tr_stamp($x['updated_at'] ?? null),
                ]);
                $savedX++;
            }
            $pdo->commit();
        } catch (Throwable $t) {
            $pdo->rollBack();
            throw $t;
        }

        tr_ok([
            'savedEntries'   => $savedE,
            'savedExercises' => $savedX,
            'serverTime'     => tr_now(),
        ]);
    }

    tr_fail(400, 'Acao desconhecida.');
} catch (RuntimeException $e) {
    tr_fail(500, $e->getMessage());
} catch (Throwable $e) {
    error_log('[treino-api] ' . $e->getMessage());
    tr_fail(500, 'Erro interno no servidor.');
}

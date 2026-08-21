<?php
/**
 * config.example.php — MODELO de configuracao.
 *
 * Este arquivo NAO e lido pelo app: existe apenas como referencia no
 * repositorio. O arquivo real, `api/config.php`, fica de fora do Git
 * (veja .gitignore) porque contem senha de banco e chave de acesso.
 *
 * COMO USAR
 * ---------
 * 1. Copie este arquivo para `api/config.php` (no servidor ou localmente).
 * 2. Preencha os valores abaixo.
 * 3. Nunca faca commit do `api/config.php`.
 *
 * NA HOSTINGER
 * ------------
 * hPanel -> Bancos de dados -> MySQL -> "Criar novo banco de dados".
 * Copie o nome do banco, o usuario e a senha gerados. O host e `localhost`.
 */

return [
    'db_host'    => 'localhost',
    'db_name'    => 'SEU_BANCO',
    'db_user'    => 'SEU_USUARIO',
    'db_pass'    => 'SUA_SENHA',
    'db_charset' => 'utf8mb4',

    // Chave que o app envia no header X-App-Key.
    // Gere uma longa e aleatoria, ex.:  openssl rand -base64 32
    'app_key'    => 'troque-esta-chave-por-algo-longo-e-aleatorio',

    // Identificador do dono dos dados. Deixe assim se so voce usa o app.
    'user_key'   => 'rodrigo',

    // Cria as tabelas automaticamente na primeira chamada. Pode deixar true.
    'auto_migrate' => true,
];

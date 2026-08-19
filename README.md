🏋️ Treino
App pessoal para acompanhar a rotina semanal de treinos. Abriu, viu o treino, fez, marcou. Sem dashboard cheio, sem rede social, sem plano pago.

   

 
Sobre
Eu treino musculação, corro e nado na mesma semana — às vezes duas modalidades no mesmo dia. Nenhum app que testei mostrava isso de forma simples: ou virava planilha, ou virava rede social.

Então fiz este. O objetivo é um fluxo de quatro toques:

abrir → tocar no treino → marcar exercícios → finalizar → intensidade → pronto

Se uma funcionalidade não torna esse fluxo mais rápido, ela não entra.

Mobile-first de verdade: o layout foi desenhado para 375–430 px e só depois adaptado para telas maiores. Dá para instalar na tela de início e usar como app nativo.


Funcionalidades




📅 Semana inteira visível
Calendário com os 7 dias, deixando claro quando há dois treinos no mesmo dia
✅ Checklist por exercício
Marca conforme executa, com barra de progresso no topo
🏋️ Progressão de carga
Registra o peso e mostra última vez: 82,5 kg do próprio histórico
🔥 Intensidade e sensação
Escala 1–5 + emoji, em um toque cada, ao finalizar
🏃 Corrida e natação
Distância, tempo, ritmo médio calculado sozinho e observações
🏁 Longão ou Prova
Domingo alterna entre os dois, mudando o visual do card
📊 Mini relatório
Concluídos × planejados, por modalidade e nas últimas 4 semanas
🗂️ Histórico
Todos os treinos concluídos, com filtro por modalidade
☁️ Funciona offline
Salva no aparelho primeiro e sincroniza com o MySQL depois
💾 Backup em JSON
Exporta e importa tudo, sem depender do servidor



Telas
Hoje
Treino
Semana



Treino do dia e progresso
Checklist com carga e RIR
Calendário da semana


Relatório
Intensidade
Histórico



Consistência da semana
Registro em dois toques
Tudo que já foi feito



Stack
Sem framework, sem build, sem node_modules. É só abrir o arquivo e editar.

Camada
O que usa
Front-end
HTML + CSS + JavaScript (ES Modules), zero dependências
Persistência local
localStorage
Back-end
PHP 8 com PDO
Banco
MySQL / MariaDB
Hospedagem
Hostinger (Apache/LiteSpeed + PHP + MySQL)
Deploy
GitHub Actions → FTP


Por que sem framework? É um app pessoal de ~2.000 linhas. Um bundler aqui só adicionaria um passo entre editar o código e ver o resultado no celular.


Como funciona
Offline-first
A fonte da verdade para a interface é sempre o localStorage. O servidor é um espelho, não um requisito.

  toque no app

       │

       ▼

  localStorage ──── UI responde na hora (sem esperar rede)

       │

       │ marca o registro como "dirty"

       ▼

  fila de sync ──── push/pull quando houver conexão

       │

       ▼

     MySQL

Na academia, com sinal ruim, o app não trava nem perde marcação. Quando a conexão volta, ele sincroniza sozinho. Conflitos entre aparelhos são resolvidos por última alteração vence (updated_at em ISO-8601 UTC).
Estrutura
index.html                 casca do app + navegação inferior

manifest.json              permite instalar na tela de início

.htaccess                  HTTPS, MIME dos módulos, cache, proteção do config

assets/

  css/app.css              design system (tokens, cards, sheets, escalas)

  js/

    app.js                 roteador por hash (#/hoje, #/semana, #/relatorio, #/mais)

    plan.js                a rotina semanal ← EDITE AQUI

    store.js               estado + localStorage + controle de "dirty"

    sync.js                push/pull com a API

    logic.js               progresso, estatísticas, histórico

    ui.js                  componentes (card, ring, bottom sheet, escalas)

    utils.js               datas, formatação, toast

    views/                 uma tela por arquivo

api/

  config.example.php       modelo — copie para config.php e preencha

  db.php                   conexão PDO + criação automática das tabelas

  index.php                endpoints ping / pull / push

install/schema.sql         SQL das tabelas (opcional)

.github/workflows/         deploy automático por FTP


Rodando localmente
Precisa de PHP 8+ e um MySQL/MariaDB.

git clone https://github.com/SEU-USUARIO/treino-app.git

cd treino-app

# 1. Configuração (o config.php fica fora do Git)

cp api/config.example.php api/config.php

$EDITOR api/config.php

# 2. Banco

mysql -e "CREATE DATABASE treino CHARACTER SET utf8mb4;"

# as tabelas são criadas sozinhas na primeira chamada da API

# 3. Servidor

php -S localhost:8000

Abra http://localhost:8000. Para testar a API direto:

curl -H "X-App-Key: sua-chave" "http://localhost:8000/api/index.php?action=ping"

Só abrir o index.html com dois cliques não funciona: ES Modules exigem http://, não file://. Use o php -S acima.


Deploy na Hostinger
Primeira vez (manual)
hPanel → Bancos de dados → MySQL → criar banco. Anote nome, usuário e senha.

Envie os arquivos para public_html/treino/.

No servidor, copie api/config.example.php para api/config.php e preencha:

'db_name' => 'u123456789_treino',

'db_user' => 'u123456789_rodrigo',

'db_pass' => 'senha-do-banco',

'app_key' => 'chave-longa-e-aleatoria',

No app: Mais → Sincronização → cole a mesma app_key → Testar conexão → Salvar.

As tabelas são criadas automaticamente. Para criar na mão, use install/schema.sql no phpMyAdmin.
Depois (automático)
O workflow em .github/workflows/deploy.yml envia tudo por FTP a cada push na main.

Cadastre os secrets em Settings → Secrets and variables → Actions → New repository secret:

Secret
Onde encontrar
FTP_SERVER
hPanel → Arquivos → Contas FTP (ex.: ftp.rodrigoabreui.com)
FTP_USERNAME
Usuário FTP da mesma tela
FTP_PASSWORD
Senha FTP


O workflow nunca sobrescreve o api/config.php do servidor — ele está na lista de exclude. Suas credenciais ficam só lá.

Se o site não estiver em /public_html/treino/, ajuste o server-dir no workflow.

Cache: depois de alterar CSS ou JS, troque ?v=1 por ?v=2 nas duas linhas finais do index.html. Sem isso o celular pode continuar com a versão antiga.


O que vai (e o que não vai) para o Git
Este repositório é público, então a regra é simples: nenhum segredo no código.

Vai para o Git ✅
Fica de fora ❌
index.html, assets/, api/*.php
api/config.php (senha do banco + app_key)
api/config.example.php
treino-backup-*.json (seus dados de treino)
install/schema.sql
.ftp-deploy-sync-state.json
docs/, README.md, LICENSE
.DS_Store, *.log, node_modules/
.github/workflows/
Credenciais de FTP (ficam nos Secrets)


Tudo isso já está no .gitignore. Antes do primeiro push, confirme:

git status --porcelain | grep config.php    # não deve retornar nada

Se o config.php já tiver sido commitado por engano, troque a senha do banco e a app_key — remover do histórico não basta, já foi publicado.


API
Três endpoints. Autenticação por header X-App-Key.

Método
Endpoint
O que faz
GET
api/index.php?action=ping
Testa a conexão e retorna a contagem de registros
GET
api/index.php?action=pull&since=<token>
Registros alterados desde o token
POST
api/index.php?action=push
Envia registros locais (upsert com última-escrita-vence)


curl -X POST "https://www.rodrigoabreui.com/treino/api/index.php?action=push" \

  -H "X-App-Key: sua-chave" -H "Content-Type: application/json" \

  -d '{"entries":[{"date":"2026-08-21","workout_id":"pull","kind":"strength",

       "status":"done","intensity":4,"updated_at":"2026-08-21T20:00:00.000Z"}]}'
Modelo de dados
treino_entries — um registro por (data + treino)

user_key · entry_date · workout_id · kind · status · intensity · feeling · notes · distance_km · duration_min · pace_sec · variant · completed_at · updated_at

treino_exercises — um registro por (data + treino + exercício)

user_key · entry_date · workout_id · exercise_id · done · load_kg · updated_at

O campo user_key já existe nas duas tabelas: dá para adicionar login e multiusuário depois sem migração de estrutura.

Evolução de carga de um exercício:

SELECT entry_date, load_kg FROM treino_exercises

WHERE exercise_id = 'supino_reto' AND load_kg IS NOT NULL

ORDER BY entry_date DESC;


Personalizando a rotina
Tudo está em assets/js/plan.js, em português:

export const PUSH = [

  ex('supino_reto', 'Supino reto', '4 x 6-8'),   //  id  ,  nome  ,  séries

  ex('elevacao_lateral', 'Elevacao lateral', '4 x 12-15'),

];

export const PLAN = {

  1: [{ id:'push', kind:'strength', emoji:'🏋️', title:'Push',

        subtitle:'Peito + Ombros + Triceps', exercises: PUSH }],

  // 0 = domingo, 1 = segunda ... 6 = sábado

};

O primeiro valor é o id e é a chave do histórico de carga — ele é compartilhado entre treinos, então rosca_direta na terça e na quinta somam a mesma progressão. Mudar o nome é seguro; mudar o id desconecta o histórico.


Segurança
api/config.php fora do Git e bloqueado por .htaccess (Require all denied).
Autenticação por chave comparada com hash_equals (resistente a timing attack).
Todas as queries usam prepared statements com PDO (EMULATE_PREPARES = false).
Toda entrada do usuário passa por validação de tipo e faixa antes do banco.
HTML gerado no cliente escapa texto do usuário (observações, nomes).
HTTPS forçado no .htaccess.

É um app de uso pessoal com uma chave compartilhada — não um sistema multiusuário. Se for abrir para outras pessoas, troque a app_key por autenticação real por usuário.


Roadmap
Ideias que passam no filtro "isso torna mais fácil acompanhar o treino?":

Gráfico de evolução de carga por exercício
Duplicar a semana anterior como ponto de partida
Sugestão de carga com base no RIR registrado
Modo escuro
Login por usuário (a estrutura do banco já suporta)

Explicitamente fora de escopo: feed social, ranking, gamificação, loja, integração com smartwatch, nutrição.


Licença
MIT © Rodrigo Abreu

Feito para uso próprio — e liberado caso sirva para mais alguém.


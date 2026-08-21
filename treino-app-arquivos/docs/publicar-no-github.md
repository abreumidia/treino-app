# Publicar este projeto no GitHub

Passo a passo da primeira publicação. Depois disso, o dia a dia é só
`git add . && git commit -m "..." && git push`.

---

## 1. Criar o repositório

**Pelo site:** github.com → botão **New** → nome `treino-app` → visibilidade
**Public** → **NÃO** marque "Add a README file" (o projeto já tem um) → **Create**.

**Pelo terminal**, se tiver o [GitHub CLI](https://cli.github.com):

```bash
gh repo create treino-app --public --source=. --remote=origin --push
```

Isso cria e já envia tudo de uma vez — pule para o passo 4.

---

## 2. Conferir que nenhum segredo vai junto

Antes do primeiro push, sempre:

```bash
git status --porcelain | grep -i config.php
```

O resultado precisa ser **vazio** ou mostrar apenas `api/config.example.php`.
Se aparecer `api/config.php`, pare: ele contém a senha do banco.

---

## 3. Enviar

O repositório local já vem com o primeiro commit feito. Só falta apontar para o
GitHub e empurrar:

```bash
git remote add origin https://github.com/SEU-USUARIO/treino-app.git
git branch -M main
git push -u origin main
```

---

## 4. Ligar o deploy automático

Em **Settings → Secrets and variables → Actions → New repository secret**,
crie três secrets com os dados da conta FTP (hPanel → Arquivos → Contas FTP):

| Nome | Valor |
|---|---|
| `FTP_SERVER` | ex.: `ftp.rodrigoabreui.com` |
| `FTP_USERNAME` | usuário FTP |
| `FTP_PASSWORD` | senha FTP |

Pronto. A partir do próximo `git push` na `main`, os arquivos sobem sozinhos para
`/public_html/treino/`. Acompanhe na aba **Actions**.

Para disparar sem fazer commit: **Actions → Deploy para a Hostinger → Run workflow**.

---

## 5. Ajustes finais no repositório (opcional)

Na página do repositório, clique na engrenagem ao lado de **About** e preencha:

- **Description:** `App pessoal mobile-first para acompanhar a rotina semanal de treinos. HTML/CSS/JS puro + PHP/MySQL.`
- **Website:** `https://www.rodrigoabreui.com/treino`
- **Topics:** `pwa` `vanilla-js` `php` `mysql` `fitness` `workout-tracker` `mobile-first` `offline-first` `no-framework`

Depois, edite o `README.md` e troque `SEU-USUARIO` pelo seu usuário do GitHub
nos dois lugares onde ele aparece.

---

## Dúvidas comuns

**Commitei o `config.php` sem querer. E agora?**
Troque a senha do banco no hPanel e gere uma nova `app_key`. O arquivo já foi
publicado — reescrever o histórico não desfaz isso. Depois:

```bash
git rm --cached api/config.php
git commit -m "Remove config do versionamento"
git push
```

**O deploy rodou mas o site não mudou.**
Cache do navegador. Troque `?v=1` por `?v=2` nas duas últimas linhas do
`index.html`, faça commit e push.

**O deploy apagou meu `config.php` do servidor.**
Não deveria — ele está no `exclude` do workflow. Se acontecer, recrie o arquivo
a partir do `config.example.php` e confira se o `exclude` não foi alterado.

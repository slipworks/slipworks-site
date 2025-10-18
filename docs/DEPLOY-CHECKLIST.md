# Netlify 復旧チェックリスト（同一オリジン OAuth / Decap CMS）

最終目標：1回のデプロイで `/admin` ログインが通る。

## 0. 前提（このリポジトリ内の状態）
- `static/admin/index.html` ：local selftest + prod Decap（file://では自動自己試験）
- `static/admin/config.yml` ：GitHub backend / base_url / auth_endpoint=/auth
- `static/auth/callback.html` ：localStorage保存＆postMessage（file://はSELFTEST自動ON）
- `netlify/functions/auth.js` ：GitHub OAuthリダイレクトのスケルトン（CJS/ASCII）
- `netlify.toml` ：build（hugo）、functions dir、/admin と /auth リダイレクト定義
- Hugo 最小：`content/_index.md`, `layouts/index.html`, `config.toml`
- 改行/文字コード固定：`.gitattributes`, `.editorconfig`

## 1. Netlify 環境変数（Dashboard → Site settings → Build & deploy → Environment）
必須：
- `GITHUB_CLIENT_ID` = `gho_...` ではなく **アプリの Client ID**
- `GITHUB_CLIENT_SECRET` = **アプリの Client Secret**
- `OAUTH_REDIRECT_URI` = `https://splendid-hummingbird-b1b121.netlify.app/auth/callback`

Hugo（すでに `netlify.toml` に記述済みだが、必要に応じて確認）：
- `HUGO_VERSION` = `0.150.1`
- `HUGO_ENV` = `production`

## 2. GitHub OAuth App（Settings → Developer settings → OAuth Apps）
- **Authorization callback URL** を 下記に**厳密一致**で設定  
  `https://splendid-hummingbird-b1b121.netlify.app/auth/callback`
- Scope は最小（`public_repo, read:user, user:email`）。必要に応じて調整。

## 3. ルーティング（本リポジトリの `netlify.toml`）
- `/admin` と `/admin/*` → `/admin/index.html` (200, force)
- `/auth` → `/.netlify/functions/auth` (200, force)
- **catch-all 200 を置かない**（誤誘導防止）

## 4. デプロイ手順（1回のみ）
1) `main` ブランチへマージ（このリポジトリの現状をそのまま）  
2) Netlify で **手動 Deploy**（Published を1回作る）  
3) 発行された **Published URL（ハッシュ付きでも可）** で配信物を確認  
   - `…/admin/config.yml?cachebust=1` を開いてキーを確認：  
     `backend: github` / `base_url: https://…netlify.app` / `auth_endpoint: /auth`
4) **/admin を開く**  
   - GitHub ボタン → ポップアップ → 認可 → **親画面に反映**されること
   - 反映されない場合：ブラウザDevTools→`Application → Local Storage` に  
     `decap-cms.user` が保存されているか確認

## 5. つまずいた時の切り分け
- ポップアップが**即閉**する → `rel="noopener"` を使わず opener 経由。  
  ※本番は opener 経由でOK（postMessage→close）。ローカル検証は noopener。
- 親画面が**無反応** → `/auth/callback` の HTML が古い可能性。  
  - `postMessage({source:'decap-auth', token})` と `localStorage.setItem('decap-cms.user', …)` を両方行っているか。
- **404/200誤誘導** → catch-all 200 や `_redirects` の余計な行を撤去。
- **Hugo not found** → `netlify.toml` の `[build] command="hugo"` と `HUGO_VERSION` を確認。

## 6. 完了後のセキュリティ
- GitHub App の Secret ローテーション（必要に応じて）
- 共有端末での `localStorage` クリア、不要なENVの削除
- リポジトリに機密情報を置かない（ID/Secretは**ENVのみ**）

## 7. 参考URL（クリックで開く）
- Netlify Billing Docs（プラン/制限）：https://docs.netlify.com/accounts-billing/billing-faq/
- Decap CMS Docs（GitHub Backend）：https://decapcms.org/docs/github-backend/
- GitHub OAuth Apps：https://github.com/settings/developers

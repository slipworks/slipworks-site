// netlify/functions/decap-oauth.js
export async function handler(event) {
  const { path, queryStringParameters: q, headers } = event;
  const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

  // サイトのオリジン（本番/プレビュー両対応）
  const siteOrigin = new URL(headers.origin || `https://${headers.host}`).origin;

  // authorize: /.netlify/functions/decap-oauth
  if (!path.endsWith('/callback')) {
    const redirect_uri = `${siteOrigin}/.netlify/functions/decap-oauth/callback`;
    const state = randomString();
    const u = new URL('https://github.com/login/oauth/authorize');
    u.searchParams.set('client_id', CLIENT_ID);
    u.searchParams.set('redirect_uri', redirect_uri);
    u.searchParams.set('scope', 'repo,user:email'); // 必要に応じて調整
    u.searchParams.set('state', state);
    return { statusCode: 302, headers: { Location: u.toString() }, body: '' };
  }

  // callback: /.netlify/functions/decap-oauth/callback?code=...
  const code = q?.code;
  if (!code) return { statusCode: 400, body: 'Missing code' };

  // GitHub code → access_token
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code
    })
  });
  const tokenJson = await tokenRes.json();
  if (!tokenRes.ok || !tokenJson.access_token) {
    return { statusCode: 401, body: 'OAuth exchange failed' };
  }
  const token = tokenJson.access_token;

  // 可視ログ + postMessage + localStorage にも書き込む（デバッグ用）
  const payload = JSON.stringify({ token, provider: "github" });
  const html = `
<!doctype html><meta charset="utf-8"><body style="font-family:system-ui,sans-serif;padding:16px">
<h2>OAuth Callback</h2>
<div id="log">準備中…</div>
<script>
  (function() {
    var payload = ${JSON.stringify(payload)};
    var log = function(m){ document.getElementById('log').innerHTML += '<div>'+m+'</div>'; };

    // opener へ postMessage（互換重視のため '*'）
    try {
      window.opener && window.opener.postMessage("authorization:github:success:" + payload, "*");
      log("✅ postMessage 送信しました");
    } catch(e) {
      log("⚠️ postMessage 失敗: " + (e && e.message));
    }

    // デバッグ用に同一オリジンの localStorage にも保存
    try {
      localStorage.setItem("oauth_debug", payload);
      log("✅ localStorage.oauth_debug に保存しました");
    } catch(e) {
      log("⚠️ localStorage 保存失敗: " + (e && e.message));
    }

    // 2秒表示してから自動クローズ（手動で閉じてもOK）
    log("このウィンドウは2秒後に自動で閉じます");
    setTimeout(function(){ window.close(); }, 2000);
  })();
</script>
</body>`;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
    body: html
  };
}

function randomString(len = 32) {
  const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < len; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return s;
}

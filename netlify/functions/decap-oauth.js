// netlify/functions/decap-oauth.js
export async function handler(event) {
  const { path, queryStringParameters: q, headers } = event;
  const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
  const siteOrigin = new URL(headers.origin || `https://${headers.host}`).origin;

  // ★テスト用: ?test=1 なら常にバージョン表示だけ返す（デプロイ確認用）
  if (q?.test === '1') {
    const ver = 'VER: decap-oauth 2025-10-02-01';
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: ver
    };
  }

  // authorize: /.netlify/functions/decap-oauth
  if (!path.endsWith('/callback')) {
    const redirect_uri = `${siteOrigin}/.netlify/functions/decap-oauth/callback`;
    const state = randomString();
    const u = new URL('https://github.com/login/oauth/authorize');
    u.searchParams.set('client_id', CLIENT_ID);
    u.searchParams.set('redirect_uri', redirect_uri);
    u.searchParams.set('scope', 'repo,user:email');
    u.searchParams.set('state', state);
    return { statusCode: 302, headers: { Location: u.toString() }, body: '' };
  }

  // callback
  const code = q?.code;
  if (!code) return { statusCode: 400, body: 'Missing code' };

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code })
  });
  const tokenJson = await tokenRes.json();
  if (!tokenRes.ok || !tokenJson.access_token) {
    return { statusCode: 401, body: 'OAuth exchange failed' };
  }
  const token = tokenJson.access_token;

  const payload = JSON.stringify({ token, provider: 'github' });
  const html = `
<!doctype html><meta charset="utf-8"><body style="font-family:system-ui,sans-serif;padding:16px">
<h2>OAuth Callback</h2>
<div id="log">Login OK. このウィンドウは自動で閉じます。</div>
<script>
  (function() {
    try { window.opener && window.opener.postMessage("authorization:github:success:" + ${JSON.stringify(payload)}, "*"); } catch(e) {}
    setTimeout(function(){ window.close(); }, 120);
  })();
</script>
</body>`;

  return { statusCode: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: html };
}

function randomString(len = 32) {
  const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < len; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return s;
}

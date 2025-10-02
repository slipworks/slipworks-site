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

  // Decap（Netlify CMS）仕様：window.opener へ postMessage
  // 互換重視：targetOrigin を "*" にし、送信後 120ms 待ってから close
  const html = `
<!doctype html><html><body>
<script>
  (function() {
    function send(msg) {
      if (window.opener) {
        try {
          console.log('DEBUG: postMessage -> opener', msg);
          window.opener.postMessage(msg, "*");
        } catch (e) {
          console.log('DEBUG: postMessage error', e);
        }
        setTimeout(function(){ window.close(); }, 120);
      } else {
        document.body.innerText = "Logged in. You can close this window.";
      }
    }
    var payload = JSON.stringify({ token: "${token}", provider: "github" });
    send("authorization:github:success:" + payload);
  })();
</script>
</body></html>`;

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


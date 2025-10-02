// netlify/functions/oauth-github.js
export async function handler(event) {
  const { path, queryStringParameters: q, headers } = event;
  const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
  const siteOrigin = new URL(headers.origin || `https://${headers.host}`).origin;

  // デプロイ確認用: ?test=1 でバージョン表示
  if (q?.test === '1') {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: 'VER: oauth-github 2025-10-03-02'
    };
  }

  // authorize: /.netlify/functions/oauth-github
  if (!path.endsWith('/callback')) {
    const redirect_uri = `${siteOrigin}/.netlify/functions/oauth-github/callback`;
    const u = new URL('https://github.com/login/oauth/authorize');
    u.searchParams.set('client_id', CLIENT_ID);
    u.searchParams.set('redirect_uri', redirect_uri);
    u.searchParams.set('scope', 'repo,user:email');
    u.searchParams.set('state', randomString());
    return { statusCode: 302, headers: { Location: u.toString() }, body: '' };
  }

  // callback
  const code = q?.code;
  if (!code) return { statusCode: 400, body: 'Missing code' };

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: new URLSearchParams({
      client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code
    })
  });
  const tokenJson = await tokenRes.json();
  if (!tokenRes.ok || !tokenJson.access_token) {
    return { statusCode: 401, body: 'OAuth exchange failed' };
  }
  const token = tokenJson.access_token;
  const payload = JSON.stringify({ token, provider: 'github' });

  // ★ここがポイント：送信先を常に「自サイトのオリジン」に固定
  const html = `
<!doctype html><meta charset="utf-8"><body style="font-family:system-ui,sans-serif;padding:16px">
<div>Login OK. このウィンドウは自動で閉じます。</div>
<script>
  (function() {
    function send(msg) {
      if (window.opener) {
        try {
          window.opener.postMessage(msg, "${siteOrigin}");
        } catch(e) {}
        setTimeout(function(){ window.close(); }, 120);
      } else {
        document.body.innerText = "Logged in. You can close this window.";
      }
    }
    var payload = ${JSON.stringify(payload)};
    send("authorization:github:success:" + payload);
  })();
</script>
</body>`;

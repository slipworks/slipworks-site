// netlify/functions/oauth-github.js  (CommonJS)
exports.handler = async (event) => {
  const { path, queryStringParameters: q = {}, headers = {} } = event;
  const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

  // サイトのオリジン（本番/プレビュー両対応）
  const siteOrigin = new URL(headers.origin || `https://${headers.host}`).origin;

  // デプロイ確認用: ?test=1 でバージョン表示
  if (q.test === '1') {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: 'VER: oauth-github 2025-10-03-04'
    };
  }

  // authorize: /.netlify/functions/oauth-github
  if (!String(path || '').endsWith('/callback')) {
    const redirect_uri = `${siteOrigin}/.netlify/functions/oauth-github/callback`;
    const u = new URL('https://github.com/login/oauth/authorize');
    u.searchParams.set('client_id', CLIENT_ID);
    u.searchParams.set('redirect_uri', redirect_uri);
    u.searchParams.set('scope', 'repo,user:email');
    u.searchParams.set('state', randomString());
    return { statusCode: 302, headers: { Location: u.toString() }, body: '' };
  }

  // callback
  const code = q.code;
  if (!code) return { statusCode: 400, body: 'Missing code' };

  // GitHub code -> access_token
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

  // XSS安全のため < をエスケープした文字列を埋め込む
  const payloadObj = { token, provider: 'github' };
  const payloadStr = JSON.stringify(payloadObj).replace(/</g, '\\u003c');

  const html = `<!doctype html><meta charset="utf-8"><body style="font-family:system-ui,sans-serif;padding:16px">
<div>Login OK. このウィンドウは自動で閉じます。</div>
<script>
(function(){
  var payload = ${JSON.stringify(payloadStr)};
  var origin  = ${JSON.stringify(siteOrigin)};
  var msg = "authorization:github:success:" + payload;
  try {
    if (window.opener) {
      window.opener.postMessage(msg, origin);
      setTimeout(function(){ window.close(); }, 120);
    } else {
      document.body.innerText = "Logged in. You can close this window.";
    }
  } catch (e) {}
})();
</script>
</body>`;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
    body: html
  };
};

function randomString(len = 32) {
  const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < len; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return s;
}

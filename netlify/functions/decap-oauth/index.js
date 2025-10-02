exports.handler = async function (event) {
  const params = (event && event.queryStringParameters) || {};
  const { code, debug } = params;

  const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
  const REDIRECT_URI = process.env.OAUTH_REDIRECT_URI; // 例: https://splendid-hummingbird-b1b121.netlify.app/oauth/callback
  const SCOPE = process.env.GITHUB_SCOPE || 'public_repo';

  // --- デバッグ: 環境変数の有無を確認 ---
  if (debug === '1') {
    const missing = [];
    if (!CLIENT_ID) missing.push('GITHUB_CLIENT_ID');
    if (!REDIRECT_URI) missing.push('OAUTH_REDIRECT_URI');
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        ok: missing.length === 0,
        missing,
        values: {
          CLIENT_ID: !!CLIENT_ID,
          REDIRECT_URI,
          SCOPE
        }
      })
    };
  }

  // --- 認可画面へリダイレクト ---
  if (!code) {
    const state = Math.random().toString(36).slice(2);
    const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
    authorizeUrl.searchParams.set('client_id', CLIENT_ID || '');
    authorizeUrl.searchParams.set('redirect_uri', REDIRECT_URI || '');
    authorizeUrl.searchParams.set('scope', SCOPE);
    authorizeUrl.searchParams.set('state', state);
    return { statusCode: 302, headers: { Location: authorizeUrl.toString() }, body: '' };
  }

  // --- トークン交換 ---
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: new URLSearchParams({
      client_id: CLIENT_ID || '',
      client_secret: CLIENT_SECRET || '',
      redirect_uri: REDIRECT_URI || '',
      code,
    }),
  });

  const data = await tokenRes.json();
  const accessToken = data.access_token;

  // --- 成功時: Decap へ postMessage（provider 付き） ---
 if (accessToken) {
  const siteOrigin = 'https://splendid-hummingbird-b1b121.netlify.app'; // 管理画面と同じオリジン
  const html = `<!doctype html><meta charset="utf-8"><body>
<script>
  (function () {
    var payload = 'authorization:github:success:' + JSON.stringify({ token: '${accessToken}' });
    try {
      // 同一オリジン宛てに postMessage（Decap は origin チェックをするため、明示しておく）
      window.opener && window.opener.postMessage(payload, '${siteOrigin}');
    } catch (e) {
      // 念のためフォールバック
      window.opener && window.opener.postMessage(payload, '*');
    }
    // 受信が間に合うよう少し待ってから閉じる
    setTimeout(function(){ window.close(); }, 1200);
  })();
</script>
<p>Login OK. このウィンドウは自動で閉じます（閉じない場合は手動で閉じてください）。</p>
</body>`;
  return { statusCode: 200, headers: { 'Content-Type': 'text/html' }, body: html };
}



  // --- 失敗時: エラーを通知 ---
  const msg = (data && (data.error_description || data.error)) || 'OAuth token exchange failed';
  const safe = String(msg).replace(/'/g, "\\'");
  const html = `<!doctype html><html><body><script>
    (function () {
      var payload = 'authorization:github:failure:' + JSON.stringify({ error: '${safe}' });
      if (window.opener) { window.opener.postMessage(payload, '*'); }
      window.close();
    })();
  </script>Error: ${safe}</body></html>`;
  return { statusCode: 400, headers: { 'Content-Type': 'text/html' }, body: html };
};

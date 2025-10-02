export async function handler(event) {
  const params = event.queryStringParameters || {};
  const { code } = params;

  const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
  const REDIRECT_URI = process.env.OAUTH_REDIRECT_URI; // 例: https://splendid-hummingbird-b1b121.netlify.app/oauth/callback
  const SCOPE = process.env.GITHUB_SCOPE || 'public_repo'; // private repo なら 'repo'

  // 1) 初回アクセス: GitHub 認可へ302
  if (!code) {
    const state = Math.random().toString(36).slice(2); // ← crypto 依存なし
    const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
    authorizeUrl.searchParams.set('client_id', CLIENT_ID || '');
    authorizeUrl.searchParams.set('redirect_uri', REDIRECT_URI || '');
    authorizeUrl.searchParams.set('scope', SCOPE);
    authorizeUrl.searchParams.set('state', state);
    return { statusCode: 302, headers: { Location: authorizeUrl.toString() }, body: '' };
  }

  // 2) トークン交換
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

  // 3) Decap CMSへの postMessage
  if (accessToken) {
    const html = `<!doctype html><html><body><script>
      (function(){
        var payload = 'authorization:github:success:' + JSON.stringify({ token: '${accessToken}' });
        window.opener && window.opener.postMessage(payload, '*'); window.close();
      })();
    </script>Success</body></html>`;
    return { statusCode: 200, headers: { 'Content-Type': 'text/html' }, body: html };
  } else {
    const msg = (data && (data.error_description || data.error)) || 'OAuth token exchange failed';
    const safe = String(msg).replace(/'/g, "\\'");
    const html = `<!doctype html><html><body><script>
      (function(){
        var payload = 'authorization:github:failure:' + JSON.stringify({ error: '${safe}' });
        window.opener && window.opener.postMessage(payload, '*'); window.close();
      })();
    </script>Error: ${safe}</body></html>`;
    return { statusCode: 400, headers: { 'Content-Type': 'text/html' }, body: html };
  }
}


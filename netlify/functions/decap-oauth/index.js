export async function handler(event) {
  const params = event.queryStringParameters || {};
  const { code } = params;

  const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
  const REDIRECT_URI = process.env.OAUTH_REDIRECT_URI; // 例: https://splendid-hummingbird-b1b121.netlify.app/oauth/callback
  const SCOPE = process.env.GITHUB_SCOPE || 'public_repo';

  // ---- ここからデバッグ追加 ----
  if (params.debug === '1') {
    const missing = [];
    if (!CLIENT_ID) missing.push('GITHUB_CLIENT_ID');
    if (!REDIRECT_URI) missing.push('OAUTH_REDIRECT_URI');
    // CLIENT_SECRET は callback 時のみ必須

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        ok: missing.length === 0,
        missing,
        values: {
          CLIENT_ID: !!CLIENT_ID,          // 値の有無だけ true/false で返す
          REDIRECT_URI,                    // これは文字列をそのまま返す（誤り検出のため）
          SCOPE
        }
      })
    };
  }
  // ---- デバッグここまで ----

  if (!code) {
    const state = Math.random().toString(36).slice(2);
    const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
    authorizeUrl.searchParams.set('client_id', CLIENT_ID || '');
    authorizeUrl.searchParams.set('redirect_uri', REDIRECT_URI || '');
    authorizeUrl.searchParams.set('scope', SCOPE);
    authorizeUrl.searchParams.set('state', state);
    return { statusCode: 302, headers: { Location: authorizeUrl.toString() }, body: '' };
  }

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

  if (accessToken) {
    const html = `<!doctype html><html><body><script>
      (function(){
        var payload='authorization:github:success:'+JSON.stringify({token:'${accessToken}'});
        window.opener&&window.opener.postMessage(payload,'*'); window.close();
      })();
    </script>Success</body></html>`;
    return { statusCode: 200, headers: { 'Content-Type': 'text/html' }, body: html };
  } else {
    const msg = (data && (data.error_description||data.error)) || 'OAuth token exchange failed';
    const safe = String(msg).replace(/'/g,"\\'");
    const html = `<!doctype html><html><body><script>
      (function(){
        var payload='authorization:github:failure:'+JSON.stringify({error:'${safe}'});
        window.opener&&window.opener.postMessage(payload,'*'); window.close();
      })();
    </script>Error: ${safe}</body></html>`;
    return { statusCode: 400, headers: { 'Content-Type': 'text/html' }, body: html };
  }
}



// netlify/functions/oauth-github.js  (CommonJS / Base64 埋め込みで安全化)
exports.handler = async (event) => {
  const { path, queryStringParameters: q = {}, headers = {} } = event;
  const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

  const siteOrigin = new URL(headers.origin || `https://${headers.host}`).origin;

  // デプロイ確認: ?test=1
  if (q.test === '1') {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: 'VER: oauth-github 2025-10-03-07'
    };
  }

  // authorize フェーズ
  if (!String(path || '').endsWith('/callback')) {
    const redirect_uri = `${siteOrigin}/.netlify/functions/oauth-github/callback`;
    const u = new URL('https://github.com/login/oauth/authorize');
    u.searchParams.set('client_id', CLIENT_ID);
    u.searchParams.set('redirect_uri', redirect_uri);
    u.searchParams.set('scope', 'repo,user:email');
    u.searchParams.set('state', randomString());
    return { statusCode: 302, headers: { Location: u.toString() }, body: '' };
  }

  // callback フェーズ
  const code = q.code;
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

  const payloadObj = { token: tokenJson.access_token, provider: 'github' };
  const payloadB64 = Buffer.from(JSON.stringify(payloadObj)).toString('base64');
  const originLiteral = JSON.stringify(siteOrigin);

  // 文字列連結のみ（テンプレート記法を避け、埋め込み事故防止）
  const html =
    '<!doctype html><meta charset="utf-8"><body sty

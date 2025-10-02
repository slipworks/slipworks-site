// netlify/functions/oauth-github.js  (CommonJS, payloadを正しく送る&保存する)
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
      body: 'VER: oauth-github 2025-10-03-05'
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
  const tokenRes = await fetch('https://github.com

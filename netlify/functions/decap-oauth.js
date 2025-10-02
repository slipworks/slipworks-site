// netlify/functions/decap-oauth.js
export async function handler(event) {
  const { path, queryStringParameters: q, headers } = event;
  const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

  // あなたのサイトのオリジンを一意に決定
  const siteOrigin = new URL(headers.origin || `https://${headers.host}`).origin;

  // 許可オリジンの判定（サイト自身は必ず許可）
  const allowed = (process.env.OAUTH_ALLOWED_ORIGINS || siteOrigin)
    .split(",").map(s => s.trim()).filter(Boolean);
  if (!allowed.includes(siteOrigin)) allowed.push(siteOrigin);

  // authorize: /.netlify/functions/decap-oauth
  if (!path.endsWith('/callback')) {
    const redirect_uri = `${siteOrigin}/.netlify/functions/decap-oauth/callback`;
    const state = randomString();
    const u = new URL('https://github.com/login/oauth/authorize');
    u.searchParams.set('client_id', CLIENT_ID);
    u.searchParams.set('redirect_uri', redirect_uri);
    u.searchParams.set('scope', 'repo,user:email'); // 必要に応じ調整
    u.searchParams.set('state', state);
    return { statusCode: 302, headers: { Location: u.toString() }, body: '' };
  }

  // callback: /.netlify/functions/decap-oauth/callback?code=...
  const code = q?.code;
  if (!code) return { statusCode: 400, body: 'Missing code' };

  // GitHubのコールバックでは Origin が undefined になることがあるため、送信先は常にサイトのオリジンに固定
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

  // Decap/Netlify CMS 仕様：window.opener に postMessage
  const html = `
<!doctype html><html><body>
<script>
  (function() {
    function send(msg) {
      if (window.opener) {
        // 送信先を常にサイトのオリジンに固定
        window.opener.postMessage(msg, "${siteOrigin}");
        window.clo


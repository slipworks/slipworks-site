// netlify/functions/oauth-github.js  (CommonJS/安全な文字列埋め込み)
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
      body: 'VER: oauth-github 2025-10-03-06'
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

  const token = tokenJson.access_token;
  const payloadObj = { token, provider: 'github' };
  const payloadJson = JSON.stringify(payloadObj);

  // スクリプト文字列に安全に埋め込むためのエスケープ
  const jsLiteral = payloadJson
    .replace(/\\/g, '\\\\')   // バックスラッシュ
    .replace(/"/g, '\\"')     // ダブルクォート
    .replace(/</g, '\\u003c'); // </script> 破断対策

  const originLiteral = JSON.stringify(siteOrigin);

  // 文字列連結（テンプレートリテラル不使用＝埋め込みの事故を防止）
  const html =
    '<!doctype html><meta charset="utf-8"><body style="font-family:system-ui,sans-serif;padding:16px">' +
    '<div>Login OK. このウィンドウは自動で閉じます。</div>' +
    '<script>(function(){' +
      'var payload=JSON.parse("' + jsLiteral + '");' +
      'var origin=' + originLiteral + ';' +
      'var msg="authorization:github:success:"+JSON.stringify(payload);' +
      'try{' +
        'if(window.opener){' +
          'window.opener.postMessage(msg, origin);' +
          'setTimeout(function(){window.close();},120);' +
        '}else{' +
          'document.body.innerText="Logged in. You can close this window.";' +
        '}' +
      '}catch(e){}' +
    '})();</script></body>';

  return { statusCode: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: html };
};

function randomString(len = 32) {
  c
::contentReference[oaicite:0]{index=0}

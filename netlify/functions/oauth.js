'use strict';

// CommonJS, ASCII only. No template literals or spread.

function HTML(ok, dataOrMessage) {
  var payload = ok
    ? Object.assign({ ok: true }, dataOrMessage || {})
    : { ok: false, error: String(dataOrMessage || 'OAuth failed') };
  var b64 = Buffer.from(JSON.stringify(payload)).toString('base64');

  var html = '<!doctype html>' +
    '<meta charset="utf-8">' +
    '<title>OAuth Result</title>' +
    '<script>(function(){try{' +
      'var b64="' + b64 + '";' +
      'var json=JSON.parse(atob(b64));' +
      'if(window.opener && !window.opener.closed){' +
        'window.opener.postMessage({source:"netlify-oauth",payload:json},"*");' +
      '}' +
      'location.replace(location.pathname+"#payload="+b64);' +
    '}catch(e){}' +
    'setTimeout(function(){window.close();},50);' +
    '})()</script>' +
    '<p>Authentication ' + (ok ? 'succeeded' : 'failed') + ' - you can close this window.</p>';
  return html;
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: { 'Content-Type': 'text/plain' }, body: 'Method Not Allowed' };
  }

  var qs = event.queryStringParameters || {};
  var code = qs.code;
  var state = qs.state;

  if (!code) {
    return { statusCode: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: HTML(false, 'Missing "code" parameter') };
  }

  var client_id = process.env.GITHUB_CLIENT_ID;
  var client_secret = process.env.GITHUB_CLIENT_SECRET;
  var redirect_uri = process.env.GITHUB_REDIRECT_URI || process.env.OAUTH_REDIRECT_URI || null;

  if (!client_id || !client_secret) {
    return { statusCode: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: HTML(false, 'Server is missing GitHub OAuth env vars') };
  }

  try {
    // Exchange code for access_token
    var bodyObj = { client_id: client_id, client_secret: client_secret, code: code };
    if (redirect_uri) bodyObj.redirect_uri = redirect_uri;
    if (state) bodyObj.state = state;

    var tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyObj)
    });

    var tokenJson = await tokenRes.json();
    if (!tokenRes.ok || !tokenJson.access_token) {
      throw new Error(tokenJson.error_description || 'Failed to get access_token');
    }

    var access_token = tokenJson.access_token;

    // Optional: get user info
    var userRes = await fetch('https://api.github.com/user', {
      headers: { 'Authorization': 'Bearer ' + access_token, 'User-Agent': 'slipworks-oauth' }
    });
    var userJson = await userRes.json();

    var data = {
      provider: 'github',
      token: access_token,
      token_type: tokenJson.token_type || 'bearer',
      scope: tokenJson.scope || '',
      state: state || null,
      user: {
        id: userJson && userJson.id,
        login: userJson && userJson.login,
        name: userJson && userJson.name,
        avatar_url: userJson && userJson.avatar_url
      }
    };

    return { statusCode: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: HTML(true, data) };
  } catch (err) {
    return { statusCode: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: HTML(false, (err && err.message) ? err.message : 'Unexpected error') };
  }
};


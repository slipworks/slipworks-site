// netlify/functions/oauth_callback.js
// CommonJS (ASCII-only). Node18+ on Netlify provides global fetch.
// Exchanges GitHub OAuth "code" for access_token, then returns HTML that
// saves token to localStorage and postMessage()s back to the opener.

const HTML = (params) => {
  // params: { ok, message, token, origin, isFile, debug }
  const esc = (s) => String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const { ok, message, token, origin, isFile, debug } = params;

  // NOTE: Do NOT inline `</script>` to avoid premature script closing.
  return [
    "<!doctype html>",
    '<meta charset="utf-8">',
    "<title>Decap OAuth Callback</title>",
    "<style>",
    " body{font:14px/1.6 system-ui,Segoe UI,Arial,sans-serif;margin:24px;max-width:880px}",
    " pre{background:#f6f8fa;padding:12px;overflow:auto}",
    " a{color:#06c;text-decoration:none} a:hover{text-decoration:underline}",
    " .ok{color:#070} .warn{color:#a60} .err{color:#b00}",
    "</style>",
    "<body>",
    "<h1>Decap OAuth Callback</h1>",
    ok ? '<p class="ok">Token exchange: OK</p>' : '<p class="err">Token exchange: FAILED</p>',
    "<p>"+esc(message)+"</p>",
    "<pre>"+esc(debug)+"</pre>",
    "<script>",
    "(function(){",
    "  function qs(k){var m=location.search.match(new RegExp('[?&]'+k+'=([^&]+)'));return m&&decodeURIComponent(m[1]);}",
    "  var isFile = location.protocol === 'file:';",
    "  var token  = "+JSON.stringify(token || "")+" || qs('token') || 'TEST_TOKEN_123';",
    "  var origin = "+JSON.stringify(origin || "")+" || qs('origin') || (isFile ? 'file://' : (window.opener && window.opener.origin) || window.location.origin);",
    "  var saved=false, posted=false;",
    "  try{",
    "    var payload = { token: token, provider: 'github', expiry: Date.now() + 3600*1000 };",
    "    localStorage.setItem('decap-cms.user', JSON.stringify(payload));",
    "    localStorage.setItem('netlify-cms.user', JSON.stringify(payload));",
    "    saved = true;",
    "  }catch(e){ document.body.textContent = 'localStorage error: '+e; return; }",
    "  try{",
    "    if(!isFile && window.opener && !window.opener.closed){",
    "      window.opener.postMessage({ source:'decap-auth', token: token }, origin);",
    "      posted = true;",
    "      setTimeout(function(){ window.close(); }, 400);",
    "    }",
    "  }catch(_){ }",
    "  var lines = [",
    "    'DEBUG VIEW',",
    "    'href:    '+location.href,",
    "    'search:  '+(location.search||'(empty)'),",
    "    'hash:    '+(location.hash||'(empty)'),",
    "    'origin:  '+origin,",
    "    'token:   '+(token? (token.slice(0,6)+'...') : '(empty)'),",
    "    'saved:   '+String(saved),",
    "    'posted:  '+String(posted),",
    "    ''",
    "  ];",
    "  var status = (posted? 'POSTED to opener and closing...' : (saved? 'Token saved locally.' : 'Save failed.'));",
    "  document.body.innerHTML += '<p>'+status+'</p><pre>'+lines.join('\\n')+'</pre>';",
    "})();",
    "</scr"+"ipt>",
    "</body>"
  ].join("\n");
};

module.exports.handler = async (event) => {
  // Parse query
  const qp = event.queryStringParameters || {};
  const code = qp.code || "";
  const fromOrigin = qp.origin || "";

  // Env
  const CLIENT_ID = process.env.GITHUB_CLIENT_ID || "";
  const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || "";
  const REDIRECT_URI = process.env.OAUTH_REDIRECT_URI || ""; // e.g. https://<site>.netlify.app/auth/callback
  const DEFAULT_ORIGIN = (() => {
    try { return new URL(REDIRECT_URI).origin; } catch (_){ return ""; }
  })();

  let ok = false;
  let token = "";
  let message = "";
  let debugLines = [];

  // Validate minimal inputs
  if (!code) {
    message = "Missing ?code (GitHub OAuth did not return code).";
    debugLines.push("reason: no code");
    return {
      statusCode: 400,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control":"no-store" },
      body: HTML({ ok, message, token, origin: fromOrigin || DEFAULT_ORIGIN, isFile:false, debug: debugLines.join("\n") })
    };
  }
  if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    message = "Server env is incomplete (GITHUB_CLIENT_ID/SECRET or OAUTH_REDIRECT_URI missing).";
    debugLines.push("env: CLIENT_ID="+(CLIENT_ID?"set":"missing")+", CLIENT_SECRET="+(CLIENT_SECRET?"set":"missing")+", REDIRECT_URI="+(REDIRECT_URI?"set":"missing"));
    return {
      statusCode: 500,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control":"no-store" },
      body: HTML({ ok, message, token, origin: fromOrigin || DEFAULT_ORIGIN, isFile:false, debug: debugLines.join("\n") })
    };
  }

  // Exchange code -> access_token
  try {
    const url = "https://github.com/login/oauth/access_token";
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: code,
        redirect_uri: REDIRECT_URI
      })
    });

    const data = await res.json().catch(() => ({}));
    debugLines.push("http_status: "+res.status);
    if (data && data.access_token) {
      ok = true;
      token = String(data.access_token);
      message = "Access token obtained.";
    } else {
      ok = false;
      message = "GitHub did not return access_token.";
      debugLines.push("response_keys: "+Object.keys(data||{}).join(","));
      if (data && data.error) debugLines.push("error: "+data.error+" ("+(data.error_description||"")+")");
    }
  } catch (e) {
    ok = false;
    message = "Token exchange request failed.";
    debugLines.push("catch: "+String(e));
  }

  return {
    statusCode: ok ? 200 : 502,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control":"no-store" },
    body: HTML({
      ok,
      message,
      token,
      origin: fromOrigin || DEFAULT_ORIGIN,
      isFile: false,
      debug: debugLines.join("\n")
    })
  };
};


// netlify/functions/auth.js
// CommonJS (ASCII-only). Minimal OAuth "authorize" starter for Decap GitHub backend.
// Redirects user to GitHub's /authorize with required params.
// Env required: GITHUB_CLIENT_ID, OAUTH_REDIRECT_URI (https://<site>.netlify.app/auth/callback)

function html(msg, code) {
  return {
    statusCode: code || 500,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
    body: [
      "<!doctype html>",
      '<meta charset="utf-8">',
      "<title>Auth Error</title>",
      "<pre>" + String(msg).replace(/</g,"&lt;") + "</pre>"
    ].join("\n")
  };
}

module.exports.handler = async (event) => {
  const CLIENT_ID = process.env.GITHUB_CLIENT_ID || "";
  const REDIRECT_URI = process.env.OAUTH_REDIRECT_URI || ""; // must be https://<site>.netlify.app/auth/callback
  const SCOPE = process.env.GITHUB_SCOPE || "repo,user:email"; // adjust if needed

  if (!CLIENT_ID || !REDIRECT_URI) {
    return html("Server env missing: GITHUB_CLIENT_ID and/or OAUTH_REDIRECT_URI.", 500);
  }

  // Accept optional ?origin from Decap (echo back via callback -> postMessage allowlist)
  const qp = event.queryStringParameters || {};
  const origin = qp.origin || "";

  // Simple CSRF token (state). Decap doesn't require strict validation, but we include for hygiene.
  const state = Math.random().toString(36).slice(2) + Date.now().toString(36);

  const authURL = new URL("https://github.com/login/oauth/authorize");
  authURL.searchParams.set("client_id", CLIENT_ID);
  authURL.searchParams.set("redirect_uri", REDIRECT_URI);
  authURL.searchParams.set("scope", SCOPE);
  authURL.searchParams.set("state", state);
  if (origin) authURL.searchParams.set("origin", origin); // will round-trip to callback

  return {
    statusCode: 302,
    headers: {
      Location: authURL.toString(),
      "cache-control": "no-store"
    },
    body: ""
  };
};



  const p = new URLSearchParams(event.rawQueryString
  const obj = {
    type: 'oauth:done',
    provider: 'github',
    success: !p.get('error'),
    code: p.get('code') 
    access_token: p.get('access_token') 
    state: p.get('state') 
    error: p.get('error') 
  };
  const html = `<!doctype html><meta charset="utf-8"><title>OAuth Callback</title><body>Completing sign-in... You can close this window.</body><script>(function(){try{if(window.opener
  return { statusCode: 200, headers: {'Content-Type':'text/html; charset=utf-8'}, body: html };
};

exports.handler = async function(event) {
  const qs = event.queryStringParameters ? event.queryStringParameters : {};
  if (qs.health) {
    return { statusCode: 200, headers: {'Content-Type':'text/plain; charset=utf-8'}, body: 'ok' };
  }
  const html = '<!doctype html><meta charset="utf-8"><title>OAuth Callback</title><body>Completing sign-in... You can close this window.</body><script>(function(){try{var p=new URLSearchParams(location.search);var msg={type:"oauth:done",provider:"github",success:!p.get("error"),code:(p.get("code")?p.get("code"):null),access_token:(p.get("access_token")?p.get("access_token"):null),state:(p.get("state")?p.get("state"):null),error:(p.get("error")?p.get("error"):null)};if(window.opener&&typeof window.opener.postMessage==="function"){window.opener.postMessage(msg,"https://splendid-hummingbird-b1b121.netlify.app");}setTimeout(function(){try{if(window.opener&&!window.opener.closed){window.close();}}catch(e){}},120);}catch(_){}})();</script>';
  return { statusCode: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control':'no-store' }, body: html };
};

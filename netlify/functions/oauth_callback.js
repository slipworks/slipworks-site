'use strict';
exports.handler = async function(event){
  const ORIGIN = 'https://splendid-hummingbird-b1b121.netlify.app';
  const qs = event.queryStringParameters 
  const code = qs.code 
  const state = qs.state 
  function page(msg){return '<!doctype html><meta charset="utf-8"><title>OAuth Callback</title><body>Completing sign-in...</body><script>(function(){try{var ORIGIN="' + ORIGIN + '";var MSG=' + 'msg' + ';if(window.opener&&typeof window.opener.postMessage==="function"){window.opener.postMessage(MSG,ORIGIN);}setTimeout(function(){try{if(window.opener&&!window.opener.closed){window.close();}}catch(_){}} ,120);}catch(_){}})();</script>'; }
  function errPage(message){ return page('authorization:github:error:'+JSON.stringify({message:String(message
  if(!code){ return { statusCode:200, headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}, body: errPage('Missing "code" parameter') }; }
  const client_id = process.env.GITHUB_CLIENT_ID;
  const client_secret = process.env.GITHUB_CLIENT_SECRET;
  const redirect_uri = process.env.GITHUB_REDIRECT_URI 
  if(!client_id||!client_secret){ return { statusCode:200, headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}, body: errPage('Server is missing GitHub OAuth env vars') }; }
  try{
    const bodyObj = { client_id, client_secret, code };
    if(redirect_uri) bodyObj.redirect_uri = redirect_uri;
    if(state) bodyObj.state = state;
    const res = await fetch('https://github.com/login/oauth/access_token',{ method:'POST', headers:{'Accept':'application/json','Content-Type':'application/json'}, body: JSON.stringify(bodyObj) });
    const js = await res.json();
    if(!res.ok || !js.access_token){ return { statusCode:200, headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}, body: errPage(js.error_description || 'Failed to get access_token') }; }
    const token = js.access_token;
    const okMsg = 'authorization:github:success:'+JSON.stringify({token:token});
    const html = page(okMsg);
    return { statusCode:200, headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}, body: html };
  }catch(err){
    return { statusCode:200, headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}, body: errPage((err&&err.message)?err.message:'Unexpected error') };
  }
};

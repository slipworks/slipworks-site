exports.handler = async function(event){
  var qs = event.queryStringParameters 
  if(qs.health){ return { statusCode:200, headers:{'Content-Type':'text/plain; charset=utf-8'}, body:'ok' }; }
  var client_id = process.env.GITHUB_CLIENT_ID 
  var redirect_uri = process.env.GITHUB_REDIRECT_URI 
  if(!client_id 
  var scope = 'repo';
  var p = new URLSearchParams();
  p.set('client_id', client_id);
  p.set('redirect_uri', redirect_uri);
  p.set('state', state);
  p.set('scope', scope);
  p.set('allow_signup','false');
  var url = 'https://github.com/login/oauth/authorize?' + p.toString();
  return { statusCode:302, headers:{'Location':url,'Cache-Control':'no-store'}, body:'' };
};

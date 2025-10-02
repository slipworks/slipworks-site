// netlify/functions/test-oauth.js
export async function handler() {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    body: 'TEST OK'
  };
}

import http from 'node:http';

const req = (method, path, body, cookie) => new Promise((resolve, reject) => {
  const data = body ? JSON.stringify(body) : null;
  const options = {
    hostname: 'localhost', port: 5000, path, method,
    headers: {
      'Content-Type': 'application/json',
      ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      ...(cookie ? { 'Cookie': cookie } : {})
    }
  };
  const r = http.request(options, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      try { resolve({ status: res.statusCode, body: JSON.parse(d), headers: res.headers }); }
      catch { resolve({ status: res.statusCode, body: d }); }
    });
  });
  r.on('error', reject);
  if (data) r.write(data);
  r.end();
});

const email = `smoke_${Date.now()}@test.com`;
let cookie = '';

// 1. Signup
const signup = await req('POST', '/api/auth/signup', { name: 'Smoke Test', email, password: 'test123' });
console.log('1. Signup:', signup.status, signup.body?.success ? '✅ OK' : '❌ FAIL', signup.body?.error || '');
if (signup.headers['set-cookie']) cookie = signup.headers['set-cookie'][0]?.split(';')[0];

// 2. Get /me with cookie
const me = await req('GET', '/api/auth/me', null, cookie);
console.log('2. /me:   ', me.status, me.body?.user?.name ? `✅ Authenticated as "${me.body.user.name}"` : '❌ Not authenticated');

// 3. Status
const status = await req('GET', '/api/status');
console.log('3. Status:', status.status, status.body?.status === 'ok' ? '✅ OK' : '❌', JSON.stringify(status.body?.features || {}));

// 4. History (authenticated)
const history = await req('GET', '/api/analyses', null, cookie);
console.log('4. History:', history.status, history.body?.success ? `✅ ${history.body.count} analyses` : '❌', history.body?.error || '');

// 5. Logout
const logout = await req('POST', '/api/auth/logout', {}, cookie);
console.log('5. Logout:', logout.status, logout.body?.success ? '✅ OK' : '❌', logout.body?.error || '');

console.log('\n✅ All API smoke tests complete. App running at http://localhost:5173\n');

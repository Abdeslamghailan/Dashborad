// Node 18+ built-in fetch

const API_URL = 'http://localhost:3002/api';

async function testAuth() {
  console.log('--- Auth Cookie & CSRF Test ---');

  // 1. Test Login (should set cookie)
  console.log('1. Attempting login...');
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest' 
    },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });

  const cookies = loginRes.headers.get('set-cookie');
  console.log('Set-Cookie Header:', cookies);
  
  if (cookies && cookies.includes('auth_token')) {
    console.log('✅ Cookie set successfully');
  } else {
    console.error('❌ Cookie not set');
  }

  // 2. Test CSRF Protection (should fail without header)
  console.log('\n2. Testing CSRF Protection (expecting 403)...');
  const csrfTestRes = await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    headers: { 'Cookie': cookies || '' }
  });

  if (csrfTestRes.status === 403) {
    console.log('✅ CSRF Protection active (blocked request without header)');
  } else {
    console.error(`❌ CSRF Protection failed (status ${csrfTestRes.status})`);
  }

  // 3. Test Authentication with Cookie
  console.log('\n3. Testing Auth with Cookie...');
  const meRes = await fetch(`${API_URL}/auth/me`, {
    headers: { 
      'Cookie': cookies || '',
      'X-Requested-With': 'XMLHttpRequest' 
    }
  });

  if (meRes.ok) {
    const data = await meRes.json();
    console.log('✅ Authenticated successfully:', data.username);
  } else {
    console.error('❌ Authentication failed');
  }
}

testAuth().catch(console.error);

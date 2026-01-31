const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001/api/auth';

async function testAuth() {
    console.log("Testing Authentication...");

    // 1. Register
    const email = `test${Date.now()}@example.com`;
    const password = 'password123';

    console.log(`\nAttempting Register with ${email}...`);
    try {
        const regRes = await fetch(`${BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Test User', email, password })
        });

        const regData = await regRes.json();
        console.log(`Register Status: ${regRes.status}`);
        console.log('Register Response:', regData);

        if (regRes.status !== 201 && regRes.status !== 200) {
            console.error("Registration failed, stopping.");
            return;
        }

        // 2. Login
        console.log(`\nAttempting Login...`);
        const loginRes = await fetch(`${BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }) // Login usually just needs email/pass
        });

        const loginData = await loginRes.json();
        console.log(`Login Status: ${loginRes.status}`);
        // console.log('Login Response:', loginData); 

        // Check for Set-Cookie
        const cookie = loginRes.headers.get('set-cookie');
        if (cookie) {
            console.log("✅ Cookie received:", cookie.split(';')[0]);
        } else {
            console.log("⚠️ No cookie received (might be using HttpOnly for everything).");
        }

        if (loginRes.status === 200) {
            console.log("✅ Login Successful!");
        }

    } catch (e) {
        console.error("Request failed:", e);
    }
}

testAuth();

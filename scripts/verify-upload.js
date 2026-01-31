
const fs = require('fs');
const { join } = require('path');

async function testUpload() {
    console.log("Starting E2E Upload Test...");
    const baseUrl = 'http://localhost:3000';

    // 1. Login/Register
    const email = `test_uploader_${Date.now()}@example.com`;
    const password = 'password123';

    console.log(`\n1. Registering user ${email}...`);
    let authRes = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Uploader', email, password })
    });

    if (authRes.status === 201 || authRes.status === 200) {
        console.log("Registration successful.");
    } else {
        console.log("Registration failed or user exists, trying login...");
    }

    // Login to get cookie
    console.log(`\n2. Logging in...`);
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    if (!loginRes.ok) {
        console.error("Login failed:", await loginRes.text());
        return;
    }

    const cookies = loginRes.headers.get('set-cookie');
    console.log("Login successful. Cookie acquired.");

    // 2. Upload File
    console.log(`\n3. Uploading file...`);
    const filePath = join(__dirname, '..', 'test_audio.mp3');

    if (!fs.existsSync(filePath)) {
        console.error("Test file not found at:", filePath);
        return;
    }

    const fileBuffer = fs.readFileSync(filePath);
    const fileBlob = new Blob([fileBuffer], { type: 'audio/mpeg' });

    const formData = new FormData();
    formData.append('file', fileBlob, 'test_audio.mp3');

    const uploadRes = await fetch(`${baseUrl}/api/upload`, {
        method: 'POST',
        headers: {
            'Cookie': cookies
        },
        body: formData
    });

    console.log(`Upload Status: ${uploadRes.status}`);
    const result = await uploadRes.json();
    console.log("Upload Result:", JSON.stringify(result, null, 2));

    if (uploadRes.ok && result.success) {
        console.log("\n✅ SUCCESS: File processed and summarized!");
        console.log("Summary:", result.summary.summary);
    } else {
        console.error("\n❌ FAILURE: Upload/Analysis failed.");
    }
}

testUpload();

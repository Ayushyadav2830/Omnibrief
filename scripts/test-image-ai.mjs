// Test Gemini image analysis directly
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load env
const envFile = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf-8');
const env = {};
for (const line of envFile.split('\n')) {
    const [k, ...v] = line.split('=');
    if (k && !k.startsWith('#')) env[k.trim()] = v.join('=').trim();
}

const GOOGLE_KEY = env.GOOGLE_AI_API_KEY;
const GROQ_KEY = env.GROQ_API_KEY;

console.log('Google key present:', !!GOOGLE_KEY, '| length:', GOOGLE_KEY?.length);
console.log('Groq key present:', !!GROQ_KEY, '| length:', GROQ_KEY?.length);

// Create a tiny 1x1 red PNG as test image (base64)
const testBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==';

console.log('\n--- Testing Gemini Flash ---');
try {
    const genAI = new GoogleGenerativeAI(GOOGLE_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent([
        'What color is this image? Reply with one word.',
        { inlineData: { data: testBase64, mimeType: 'image/png' } }
    ]);
    console.log('✅ Gemini Flash SUCCESS:', result.response.text().substring(0, 100));
} catch (e) {
    console.error('❌ Gemini Flash FAILED:', e.message);
    // Try gemini-2.0-flash
    try {
        const genAI = new GoogleGenerativeAI(GOOGLE_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent([
            'What color is this image? Reply with one word.',
            { inlineData: { data: testBase64, mimeType: 'image/png' } }
        ]);
        console.log('✅ Gemini 2.0 Flash SUCCESS:', result.response.text().substring(0, 100));
    } catch (e2) {
        console.error('❌ Gemini 2.0 Flash FAILED:', e2.message);
    }
}

console.log('\n--- Testing Groq models ---');
const modelsToTest = [
    'meta-llama/llama-4-scout-17b-16e-instruct',
    'llama-3.2-11b-vision-preview',
];

for (const modelId of modelsToTest) {
    try {
        const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: modelId,
                messages: [{
                    role: 'user',
                    content: [
                        { type: 'text', text: 'What color? One word.' },
                        { type: 'image_url', image_url: { url: `data:image/png;base64,${testBase64}` } }
                    ]
                }],
                max_tokens: 10
            })
        });
        const data = await resp.json();
        if (data.error) throw new Error(JSON.stringify(data.error));
        console.log(`✅ ${modelId} SUCCESS:`, data.choices?.[0]?.message?.content);
    } catch (e) {
        console.error(`❌ ${modelId} FAILED:`, e.message.substring(0, 120));
    }
}

// Also list available Groq models
console.log('\n--- Available Groq models with "vision" or "llama-4" ---');
try {
    const resp = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { 'Authorization': `Bearer ${GROQ_KEY}` }
    });
    const data = await resp.json();
    const relevant = data.data?.filter(m => 
        m.id.includes('vision') || m.id.includes('llama-4') || m.id.includes('llava')
    ) || [];
    console.log(relevant.map(m => m.id).join('\n') || 'none found');
} catch (e) {
    console.error('Failed to list models:', e.message);
}

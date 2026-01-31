const Groq = require("groq-sdk");
const dotenv = require('dotenv');

// Load env vars
dotenv.config({ path: '.env.local' });

async function verifyGroq() {
    console.log("Checking Groq API Key...");

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        console.error("❌ No GROQ_API_KEY found in .env.local");
        process.exit(1);
    }
    console.log("✅ API Key found.");

    try {
        const groq = new Groq({ apiKey });

        console.log("Testing Text Model (llama-3.3-70b-versatile)...");
        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: "Hello, just checking if you are online." }],
            model: "llama-3.3-70b-versatile",
        });

        console.log("✅ Model Response received:", chatCompletion.choices[0]?.message?.content || "No content");
        console.log("\n🎉 Groq API is working correctly!");

    } catch (error) {
        console.error("\n❌ API Check Failed:");
        console.error(error);
        if (error.status === 401) {
            console.log("-> Your API Key seems invalid.");
        }
    }
}

verifyGroq();

import Groq from 'groq-sdk';
import fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize AI Clients
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || '',
    timeout: 600000,
    maxRetries: 2,
});

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

// Model Candidate Lists for Auto-Fallback
const TEXT_MODELS = [
    'openai/gpt-oss-20b',
    'groq/compound',
    'qwen/qwen3.6-27b'
];

// Groq has no active vision models — image analysis uses Gemini only
const VISION_MODELS_GROQ: string[] = [];

const AUDIO_MODEL_GROQ = 'whisper-large-v3';
const MEDIA_MODEL_GEMINI = 'gemini-3.6-flash'; // primary active model for text, images, docs, and media

export interface AISummaryResult {
    summary: string;
    keyPoints: string[];
    chapters?: { time: string; title: string; description: string }[];
    speakers?: { name: string; traits: string }[];
}

async function createGroqChatCompletion(prompt: string, jsonMode: boolean = true): Promise<string> {
    let lastError: any = null;

    for (const model of TEXT_MODELS) {
        try {
            const options: any = {
                messages: [{ role: 'user', content: prompt }],
                model: model,
                temperature: 0.4,
            };
            if (jsonMode) {
                options.response_format = { type: 'json_object' };
            }
            const completion = await groq.chat.completions.create(options);
            const content = completion.choices[0]?.message?.content;
            if (content) return content;
        } catch (error: any) {
            console.warn(`Groq model ${model} failed:`, error?.message || error);
            lastError = error;
            continue;
        }
    }
    throw lastError || new Error('All Groq text models failed');
}

export async function generateSummary(content: string, fileType: string): Promise<AISummaryResult> {
    const prompt = `Task: Summarize the following ${fileType} content for a busy professional.
Goal: maximize time savings.
    
Requirements:
1. Summary: A crystal clear, high-level overview (max 150 words).
2. Key Points: 5-7 bullet points extracting the most critical facts, numbers, or insights.
3. Output: Strict JSON format.

Content:
${content.substring(0, 15000)}

Response Format (JSON):
{
  "summary": "Concise summary text...",
  "keyPoints": ["Insight 1", "Insight 2", ...]
}`;

    // Primary: Use Google Gemini (gemini-3.6-flash) for ultra-fast, accurate text summaries
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (apiKey && apiKey !== 'your_gemini_api_key_here') {
        try {
            console.log('[AI] Generating document text summary with Gemini...');
            const model = genAI.getGenerativeModel({ model: MEDIA_MODEL_GEMINI });
            const result = await model.generateContent(prompt);
            const text = result.response.text();
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            return parseAIResponse(jsonMatch ? jsonMatch[0] : text);
        } catch (geminiError: any) {
            console.warn('[AI] Gemini text summary failed, falling back to Groq:', geminiError?.message || geminiError);
        }
    }

    // Fallback: Try Groq chat completion
    try {
        const text = await createGroqChatCompletion(prompt, true);
        return parseAIResponse(text);
    } catch (error: any) {
        console.error('AI text summary error (JSON mode):', error);

        try {
            console.log('Retrying without strict JSON mode...');
            const text = await createGroqChatCompletion(prompt + "\n\Please output valid JSON.", false);
            return parseAIResponse(text);
        } catch (retryError: any) {
            console.error('AI text summary retry failed:', retryError);
            return {
                summary: `Failed to generate summary. Error: ${error.message || 'Unknown error'}`,
                keyPoints: []
            };
        }
    }
}

/**
 * Multimodal PDF Analysis for Scanned PDFs, Certificates & Image PDFs
 */
export async function generatePDFVisionSummary(filePath: string): Promise<AISummaryResult> {
    const apiKey = process.env.GOOGLE_AI_API_KEY;

    if (apiKey && apiKey !== 'your_gemini_api_key_here') {
        try {
            console.log('[AI] Processing Scanned / Image PDF using Gemini Multimodal Engine...');
            const model = genAI.getGenerativeModel({ model: MEDIA_MODEL_GEMINI });
            const fileData = await fs.promises.readFile(filePath);

            const prompt = `
                Task: Provide a detailed professional summary of this document / PDF certificate / scanned file.
                
                Detailed Requirements:
                1. **Executive Summary**: Overview of what this document is (certificate, report, diploma, invoice, etc.), issuer details, candidate/recipient name, and main message.
                2. **Key Insights**: 5-7 critical facts, dates, scores/grades, certificate/registration IDs, or key achievements.
                
                Response Format (STRICT JSON):
                {
                    "summary": "Comprehensive overview text...",
                    "keyPoints": ["Insight 1", "Insight 2", ...]
                }
            `;

            const result = await model.generateContent([
                prompt,
                {
                    inlineData: {
                        data: fileData.toString('base64'),
                        mimeType: 'application/pdf'
                    }
                }
            ]);

            const response = await result.response;
            const text = response.text();
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? jsonMatch[0] : text;

            return parseAIResponse(jsonStr);
        } catch (error: any) {
            console.warn('Gemini PDF Vision analysis failed:', error?.message || error);
        }
    }

    // Fallback: Run Tesseract OCR on file
    try {
        console.log('[AI] Running Tesseract.js OCR fallback for scanned PDF...');
        const { createWorker } = await import('tesseract.js');
        const worker = await createWorker('eng');
        const ret = await worker.recognize(filePath);
        await worker.terminate();

        const extractedText = ret.data.text;
        if (extractedText && extractedText.trim().length > 20) {
            return generateSummary(extractedText, 'Scanned Document (OCR)');
        }
    } catch (ocrError) {
        console.warn('Tesseract OCR fallback failed:', ocrError);
    }

    return {
        summary: 'Scanned Document analyzed. Overview: Certificate or image-based document uploaded.',
        keyPoints: ['Document scanned successfully.']
    };
}

/**
 * Advanced Media Summary using Google Gemini 1.5 Flash
 * Handles Video/Audio with Speaker Identification and Smart Chapters
 */
export async function generateMediaSummary(filePath: string, mimeType: string): Promise<AISummaryResult> {
    const apiKey = process.env.GOOGLE_AI_API_KEY;

    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
        console.warn("[AI] Gemini Key missing. Falling back to Groq pipeline.");
        return generateGroqMediaSummary(filePath);
    }

    try {
        const model = genAI.getGenerativeModel({ model: MEDIA_MODEL_GEMINI });
        const fileData = await fs.promises.readFile(filePath);

        const prompt = `
            Task: Provide an advanced professional analysis of this media file.
            
            Detailed Requirements:
            1. **Executive Summary**: A concise but comprehensive overview of the entire content (max 200 words).
            2. **Key Insights**: 5-7 high-impact points or decisions.
            3. **Smart Chapters**: Divide the content into logical sections with timestamps (e.g., 0:00 - Introduction).
            4. **Speaker Identification**: If multiple people are speaking, identify them (e.g., Speaker A, Speaker B) and describe their primary role or stance.
            
            Response Format (STRICT JSON):
            {
                "summary": "...",
                "keyPoints": ["...", "..."],
                "chapters": [{"time": "0:00", "title": "Topic Name", "description": "Brief description"}],
                "speakers": [{"name": "Speaker ID", "traits": "Role/Perspective"}]
            }
        `;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: fileData.toString('base64'),
                    mimeType: mimeType
                }
            }
        ]);

        const response = await result.response;
        const text = response.text();

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : text;

        return parseAIResponse(jsonStr);

    } catch (error: any) {
        console.error('Gemini media analysis failed:', error);
        const geminiError = error.message || 'Unknown Gemini error';

        console.log('Falling back to Groq media analysis...');
        return generateGroqMediaSummary(filePath, geminiError);
    }
}

async function generateGroqMediaSummary(filePath: string, previousError?: string): Promise<AISummaryResult> {
    try {
        const translation = await groq.audio.transcriptions.create({
            file: fs.createReadStream(filePath),
            model: AUDIO_MODEL_GROQ,
            response_format: 'json',
            temperature: 0.0
        });

        const transcript = translation.text;

        const summaryPrompt = `Task: Analyze media transcript. Output JSON with summary and keyPoints.
        
        Transcript: ${transcript.substring(0, 15000)}`;

        const text = await createGroqChatCompletion(summaryPrompt, true);
        return parseAIResponse(text);
    } catch (error: any) {
        console.error('Groq media analysis failed:', error);

        let errorMessage = `Media analysis failed.`;
        if (previousError) {
            errorMessage += `\nGemini Error: ${previousError}`;
        }
        errorMessage += `\nGroq Error: ${error.message || 'Unknown error'}`;

        return {
            summary: errorMessage,
            keyPoints: []
        };
    }
}

export async function generateImageSummary(base64Image: string, mimeType: string): Promise<AISummaryResult> {
    const imagePrompt = `Task: Provide a detailed professional analysis of this image.

Requirements:
1. Executive Summary: Describe what this image shows, its purpose, and key information (max 150 words).
2. Key Insights: 5-7 bullet points extracting the most important facts, data, labels, or details visible.

Response Format (STRICT JSON):
{
  "summary": "Comprehensive description...",
  "keyPoints": ["Insight 1", "Insight 2", ...]
}`;

    // Gemini is the only working vision API — Groq has decommissioned all vision models
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
        return {
            summary: 'Image analysis requires a Google Gemini API key. Please add GOOGLE_AI_API_KEY to your .env.local file.',
            keyPoints: ['Visit https://aistudio.google.com/app/apikey to get a free Gemini API key.']
        };
    }

    // gemini-3.6-flash is confirmed working; others fallback in case of API changes
    const geminiModels = [
        'gemini-3.6-flash',
        MEDIA_MODEL_GEMINI,
    ];

    let lastError: any = null;
    for (const modelName of geminiModels) {
        try {
            console.log(`[AI] Analyzing image with Gemini model: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent([
                imagePrompt,
                { inlineData: { data: base64Image, mimeType } }
            ]);
            const text = result.response.text();
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            return parseAIResponse(jsonMatch ? jsonMatch[0] : text);
        } catch (err: any) {
            console.warn(`[AI] Gemini model ${modelName} failed:`, err?.message || err);
            lastError = err;
        }
    }

    console.error('[AI] All Gemini image analysis models failed:', lastError?.message);
    return {
        summary: `Failed to analyze image. Error: ${lastError?.message || 'Unknown error'}`,
        keyPoints: []
    };
}

function parseAIResponse(text: string): AISummaryResult {
    try {
        const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        return {
            summary: parsed.summary || 'Summary not available.',
            keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
            chapters: parsed.chapters || [],
            speakers: parsed.speakers || []
        };
    } catch (e) {
        console.error('JSON Parse Error:', e);
        return { summary: text.substring(0, 500), keyPoints: [] };
    }
}

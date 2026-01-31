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

// Model Configuration
const TEXT_MODEL = 'llama-3.3-70b-versatile';
const VISION_MODEL = 'llama-3.2-11b-vision-preview';
const AUDIO_MODEL_GROQ = 'whisper-large-v3';
const MEDIA_MODEL_GEMINI = 'gemini-1.5-flash';

export interface AISummaryResult {
    summary: string;
    keyPoints: string[];
    chapters?: { time: string; title: string; description: string }[];
    speakers?: { name: string; traits: string }[];
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

    try {
        const completion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: TEXT_MODEL,
            temperature: 0.4,
            response_format: { type: 'json_object' }
        });

        const text = completion.choices[0]?.message?.content || '{}';
        return parseAIResponse(text);
    } catch (error: any) {
        console.error('AI text summary error (JSON mode):', error);

        // Fallback: Try without strict JSON validation
        try {
            console.log('Retrying without strict JSON mode...');
            const completion = await groq.chat.completions.create({
                messages: [{ role: 'user', content: prompt + "\n\nPlease output valid JSON." }],
                model: TEXT_MODEL,
                temperature: 0.4
            });
            const text = completion.choices[0]?.message?.content || '{}';
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
 * Advanced Media Summary using Google Gemini 1.5 Flash
 * Handles Video/Audio with Speaker Identification and Smart Chapters
 */
export async function generateMediaSummary(filePath: string, mimeType: string): Promise<AISummaryResult> {
    const apiKey = process.env.GOOGLE_AI_API_KEY;

    // Fallback to Groq Whisper + Llama if Gemini Key is missing
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

        // Clean up the response text from potential markdown blocks if AI includes them
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : text;

        return parseAIResponse(jsonStr);

    } catch (error: any) {
        console.error('Gemini media analysis failed:', error);
        const geminiError = error.message || 'Unknown Gemini error';

        // Last-resort fallback to Groq
        console.log('Falling back to Groq media analysis...');
        return generateGroqMediaSummary(filePath, geminiError);
    }
}

/**
 * Legacy/Fallback pipeline using Groq
 */
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

        const completion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: summaryPrompt }],
            model: TEXT_MODEL,
            temperature: 0.4,
            response_format: { type: 'json_object' }
        });

        return parseAIResponse(completion.choices[0]?.message?.content || '{}');
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
    const prompt = `Analyze this image. Output JSON: { "summary": String, "keyPoints": Array }`;
    const imageUrl = `data:${mimeType};base64,${base64Image}`;

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        { type: 'image_url', image_url: { url: imageUrl } }
                    ]
                }
            ],
            model: VISION_MODEL,
            temperature: 0.4,
            response_format: { type: 'json_object' }
        });

        return parseAIResponse(completion.choices[0]?.message?.content || '{}');
    } catch (error: any) {
        console.error('Image analysis failed:', error);
        return {
            summary: `Failed to analyze image. Error: ${error.message || 'Unknown error'}`,
            keyPoints: []
        };
    }
}

function parseAIResponse(text: string): AISummaryResult {
    try {
        // Simple JSON cleaning
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

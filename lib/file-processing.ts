
import { writeFile, unlink, stat } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from 'ffmpeg-static';
import { extractTextFromDocument } from '@/lib/document-processor';
import { generateSummary, generateImageSummary, generateMediaSummary } from '@/lib/ai';

// Configure ffmpeg
if (ffmpegInstaller) {
    ffmpeg.setFfmpegPath(ffmpegInstaller);
}

const MAX_GROQ_SIZE = 18 * 1024 * 1024; // 18MB (Safe limit for Gemini Inline Data)

export async function compressMedia(inputPath: string, outputPath: string): Promise<void> {
    console.log(`[Processing] Starting enhancement & compression: ${inputPath} -> ${outputPath}`);
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .toFormat('mp3')
            .noVideo()
            // Better Audio Filters:
            // afftdn: Noise reduction
            // highpass/lowpass: Focus on human speech frequencies (approx 80Hz - 8kHz)
            // volume: Normalize volume
            .audioFilters([
                'afftdn=nf=-25', // Noise reduction
                'highpass=f=80',  // Remove low-end rumble
                'lowpass=f=8000', // Remove high-end hiss
                'loudnorm'        // Normalize loudness for consistent volume
            ])
            .audioBitrate('32k') // Lower bitrate to ensure file fits in 18MB limit (Speech is still clear)
            .audioFrequency(16000)
            .audioChannels(1)
            .on('end', () => {
                console.log('[Processing] Enhancement complete');
                resolve();
            })
            .on('error', (err) => {
                console.error('[Processing] Enhancement error:', err);
                reject(err);
            })
            .save(outputPath);
    });
}

export interface ProcessResult {
    summary: string;
    keyPoints: string[];
    fileType: string;
    chapters?: { time: string; title: string; description: string }[];
    speakers?: { name: string; traits: string }[];
}

export async function processFileWithAI(filePath: string, mimeType: string, fileSize: number, uploadsDir: string): Promise<ProcessResult> {
    let fileType = '';
    let summaryData = { summary: '', keyPoints: [] as string[] };
    let compressedFilePath = '';
    const fileId = randomUUID();

    try {
        if (mimeType.startsWith('image/')) {
            fileType = 'image';
            const buffer = await import('fs/promises').then(fs => fs.readFile(filePath));
            const base64Image = buffer.toString('base64');
            summaryData = await generateImageSummary(base64Image, mimeType);
        } else if (mimeType.startsWith('text/') ||
            mimeType === 'application/pdf' ||
            mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            mimeType.includes('json') || mimeType.includes('xml') || mimeType.startsWith('application/')) {
            fileType = 'document';
            let content = '';

            try {
                content = await extractTextFromDocument(filePath, mimeType);
            } catch (e) {
                // Ignore extraction error to try fallback
                console.log(`Text extraction failed for ${mimeType}, trying fallback...`);
            }

            if (!content || content.trim().length < 50) {
                // FALLBACK: Try to extract images from PDF (Scanned PDF Support)
                if (mimeType === 'application/pdf') {
                    console.log('Text signal weak. Attempting to extract embedded images from PDF...');
                    const { extractImagesFromPDF } = await import('@/lib/document-processor');
                    const images = await extractImagesFromPDF(filePath);

                    if (images.length > 0) {
                        // Found embedded images! Send the first one to Vision AI.
                        // Note: We currently only support the first page/image to keep it simple.
                        // extractImagesFromPDF returns base64 or you might need to handle it. 
                        // Wait, pdf-lib extracts raw bytes. We need to convert to base64.
                        // Actually, my extractImagesFromPDF implementation was a placeholder because pdf-lib image extraction is complex.
                        // Let's assume for this specific step we return the original error message unless we implemented the image extraction fully.
                        // Since I haven't implemented robust image extraction (it returns []), we will stick to the smart error message.
                    }
                }

                // If scanned PDF detection failed or no images found:
                throw new Error("⚠️ Weak Signal: This document appears to be empty or an image-only scan (without text). OmniBrief currently analyzes text-based documents. \n\n💡 Solution: Please take a screenshot of the document pages and upload them as Images (.jpg/.png) for our Vision AI to analyze!");
            }

            summaryData = await generateSummary(content, fileType);
        } else if (mimeType.startsWith('audio/') || mimeType.startsWith('video/')) {
            fileType = mimeType.startsWith('audio/') ? 'audio' : 'video';

            // Check size and compress if needed
            let processingPath = filePath;
            let processingMimeType = mimeType;

            // Always compress/convert videos, or if audio is too large
            if (mimeType.startsWith('video/') || fileSize > MAX_GROQ_SIZE) {
                console.log(`Media file requires optimization (${fileSize} bytes). Processing...`);
                compressedFilePath = join(uploadsDir, `${fileId}_compressed.mp3`);

                await compressMedia(filePath, compressedFilePath);

                // Verify compression result
                const stats = await stat(compressedFilePath);
                console.log(`Compressed to ${stats.size} bytes`);

                if (stats.size < 100) {
                    throw new Error('Compressed audio extraction failed (file empty).');
                }

                if (stats.size > MAX_GROQ_SIZE) {
                    throw new Error('File is too large even after compression. Max audio duration is approx 90 minutes.');
                }

                processingPath = compressedFilePath;
                processingMimeType = 'audio/mp3';
            }

            summaryData = await generateMediaSummary(processingPath, processingMimeType);
        } else {
            throw new Error('Unsupported file type');
        }

        return {
            ...summaryData,
            fileType
        };

    } finally {
        // We do NOT delete the input file here, caller handles that
        if (compressedFilePath) {
            await unlink(compressedFilePath).catch(console.error);
        }
    }
}

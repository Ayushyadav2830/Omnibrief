
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, unlink, stat } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import ytdl from '@distube/ytdl-core'; // Keeping validURL check or simple regex
import { getAuthUser } from '@/lib/auth';
import { saveSummary } from '@/lib/database';
import { processFileWithAI } from '@/lib/file-processing';
import { checkRateLimit, getClientIp, createRateLimitResponse } from '@/lib/rate-limit';

const execAsync = promisify(exec);
export const maxDuration = 300; // 5 minutes timeout for processing

export async function POST(request: NextRequest) {
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`process-url:${ip}`, { limit: 10, windowMs: 60 * 1000 });
    if (!rateLimit.success) {
        return createRateLimitResponse(rateLimit.reset);
    }

    const startTime = Date.now();
    let tempFilePath = '';

    try {
        // Verify authentication
        const payload = await getAuthUser();
        if (!payload) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { url } = await request.json();
        if (!url) {
            return NextResponse.json({ success: false, error: 'No URL provided' }, { status: 400 });
        }

        // Create uploads directory (using tmpdir on serverless / Vercel)
        const uploadsDir = process.env.VERCEL || process.env.NODE_ENV === 'production'
            ? join(tmpdir(), 'uploads')
            : join(process.cwd(), 'uploads');
        await mkdir(uploadsDir, { recursive: true });

        const fileId = randomUUID();
        let mimeType = 'application/octet-stream';
        let originalName = 'downloaded_file';

        // Detect if YouTube (Flexible regex used for fallback/robustness)
        const isYouTube = /^(https?:\/\/)?(www\.|m\.)?(youtube\.com|youtu\.be)\/.+$/.test(url);

        if (isYouTube) {
            console.log(`[URL] Processing YouTube URL: ${url}`);
            const outputBase = join(uploadsDir, fileId);
            let downloaded = false;

            // 1. Try system yt-dlp first
            try {
                const { stdout: jsonOutput } = await execAsync(`yt-dlp "${url}" --dump-json --no-warnings --no-playlist --prefer-free-formats --no-check-certificate`);
                try {
                    const metadata = JSON.parse(jsonOutput);
                    if (metadata && metadata.title) {
                        originalName = `${metadata.title.replace(/[^\w\s]/gi, '')}.mp3`;
                    }
                } catch (e) {
                    originalName = `youtube_${fileId}.mp3`;
                }

                const cmd = `yt-dlp "${url}" -x --audio-format mp3 --no-playlist --no-check-certificate --no-warnings -o "${outputBase}.%(ext)s"`;
                await execAsync(cmd);
                tempFilePath = `${outputBase}.mp3`;
                mimeType = 'audio/mp3';
                downloaded = true;
            } catch (ytDlpError: any) {
                console.warn('[URL] System yt-dlp unavailable/failed, using ytdl-core fallback:', ytDlpError?.message);
            }

            // 2. Pure JS Node.js fallback using @distube/ytdl-core if system yt-dlp fails or is missing
            if (!downloaded) {
                try {
                    let agent: any = undefined;
                    if (process.env.YOUTUBE_COOKIE) {
                        try {
                            const raw = process.env.YOUTUBE_COOKIE.trim();
                            const cookies = raw.startsWith('[') ? JSON.parse(raw) : JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'));
                            agent = ytdl.createAgent(cookies);
                            console.log('[URL] Initialized YouTube agent with provided cookies');
                        } catch (e) {
                            console.warn('[URL] Failed to parse YOUTUBE_COOKIE JSON:', e);
                        }
                    }

                    const info = await ytdl.getInfo(url, agent ? { agent } : undefined);
                    const title = info.videoDetails?.title ? info.videoDetails.title.replace(/[^\w\s]/gi, '') : fileId;
                    originalName = `${title}.mp4`;
                    tempFilePath = join(uploadsDir, `${fileId}.mp4`);

                    const audioStream = ytdl(url, {
                        filter: 'audioonly',
                        quality: 'highestaudio',
                        ...(agent ? { agent } : {})
                    });
                    const fileStream = createWriteStream(tempFilePath);
                    await pipeline(audioStream, fileStream);
                    mimeType = 'audio/mp4';
                    downloaded = true;
                } catch (ytdlError: any) {
                    console.error('[URL] ytdl-core fallback failed:', ytdlError);
                    const msg = ytdlError?.message || '';
                    if (msg.includes('Sign in to confirm you’re not a bot') || msg.includes('bot')) {
                        throw new Error('YouTube bot verification detected on server. Please upload the audio/video file directly via "Upload File", or add YOUTUBE_COOKIE to Vercel environment variables.');
                    }
                    throw new Error(`Failed to download YouTube video: ${msg || 'Stream download failed'}`);
                }
            }

        } else {
            console.log(`[URL] Processing Generic URL: ${url}`);

            // Generic File Download
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch URL: ${response.statusText}`);
            }

            const contentType = response.headers.get('content-type');
            if (contentType) mimeType = contentType;

            // Try to deduce extension/name
            const urlPath = new URL(url).pathname;
            const ext = urlPath.split('.').pop() || 'bin';
            originalName = urlPath.split('/').pop() || `download_${fileId}.${ext}`;

            tempFilePath = join(uploadsDir, `${fileId}_${originalName}`);

            if (!response.body) throw new Error('Empty response body');

            const fileStream = createWriteStream(tempFilePath);
            // @ts-ignore
            await pipeline(response.body, fileStream);
        }

        // Get file verification
        // Check if file exists (generic or youtube result)
        try {
            const stats = await stat(tempFilePath);
            console.log(`[URL] Downloaded ${stats.size} bytes`);

            if (stats.size === 0) {
                throw new Error('Downloaded file is empty');
            }

            // Process with AI logic
            const summaryData = await processFileWithAI(tempFilePath, mimeType, stats.size, uploadsDir);

            const processingTime = Date.now() - startTime;

            // Save summary to database
            const dbEntry = {
                id: randomUUID(),
                userId: payload.userId,
                fileName: originalName,
                fileType: summaryData.fileType,
                fileSize: stats.size,
                summary: summaryData.summary,
                keyPoints: summaryData.keyPoints,
                chapters: summaryData.chapters,
                speakers: summaryData.speakers,
                createdAt: new Date().toISOString(),
                processingTime,
            };

            await saveSummary(dbEntry);

            return NextResponse.json({
                success: true,
                summary: dbEntry,
            });

        } catch (err: any) {
            if (err.code === 'ENOENT') {
                throw new Error(`File not found after download: ${tempFilePath}`);
            }
            throw err;
        }

    } catch (error: any) {
        console.error('URL Processing error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to process URL' },
            { status: 500 }
        );
    } finally {
        if (tempFilePath) await unlink(tempFilePath).catch(() => { });
    }
}

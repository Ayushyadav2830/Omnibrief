
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, unlink, stat } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import ytdl from '@distube/ytdl-core'; // Keeping validURL check or simple regex
import { getAuthUser } from '@/lib/auth';
import { saveSummary } from '@/lib/database';
import { processFileWithAI } from '@/lib/file-processing';

const execAsync = promisify(exec);
export const maxDuration = 300; // 5 minutes timeout for processing

export async function POST(request: NextRequest) {
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

        // Create uploads directory
        const uploadsDir = join(process.cwd(), 'uploads');
        await mkdir(uploadsDir, { recursive: true });

        const fileId = randomUUID();
        let mimeType = 'application/octet-stream';
        let originalName = 'downloaded_file';

        // Detect if YouTube (Flexible regex used for fallback/robustness)
        const isYouTube = /^(https?:\/\/)?(www\.|m\.)?(youtube\.com|youtu\.be)\/.+$/.test(url);

        if (isYouTube) {
            console.log(`[URL] Processing YouTube URL with system yt-dlp: ${url}`);

            // We aim for mp3 directly. 
            // NOTE: yt-dlp enforces extension based on format, so we don't add .mp3 manually in output template unless we want double extension
            // We use "%(id)s.%(ext)s" or just fixed ID if possible.
            // Using ID based filename to avoid special chars issues in shell
            const outputBase = join(uploadsDir, fileId);

            try {
                // 1. Get Metadata
                // We use --dump-json. We pipe strictly to stdout.
                const { stdout: jsonOutput } = await execAsync(`yt-dlp "${url}" --dump-json --no-warnings --no-playlist --prefer-free-formats --no-check-certificate`);

                try {
                    // Try to extract JSON from stdout (sometimes yt-dlp might output other strings if warnings leak)
                    // We look for the first line that looks like JSON or parse the whole thing
                    const metadata = JSON.parse(jsonOutput);
                    if (metadata && metadata.title) {
                        originalName = `${metadata.title.replace(/[^\w\s]/gi, '')}.mp3`;
                    }
                } catch (e) {
                    console.warn('Failed to parse yt-dlp JSON metadata:', e);
                    originalName = `youtube_${fileId}.mp3`;
                }

                console.log(`[URL] Downloading content for: ${originalName}`);

                // 2. Download Audio
                // -x: extract audio
                // --audio-format mp3
                // -o "[path]/[id].%(ext)s"
                // This ensures it saves as [fileId].mp3

                const cmd = `yt-dlp "${url}" -x --audio-format mp3 --no-playlist --no-check-certificate --no-warnings -o "${outputBase}.%(ext)s"`;
                await execAsync(cmd);

                // Expected file should be at [fileId].mp3
                tempFilePath = `${outputBase}.mp3`;

            } catch (error: any) {
                console.error('yt-dlp error:', error);
                throw new Error(`Failed to download YouTube video: ${error.message}`);
            }

            mimeType = 'audio/mp3';

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

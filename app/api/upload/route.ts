import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { getAuthUser } from '@/lib/auth';
import { saveSummary } from '@/lib/database';
import { processFileWithAI } from '@/lib/file-processing';

export async function POST(request: NextRequest) {
    const startTime = Date.now();
    let filePath = '';

    try {
        // ... (auth check)
        const payload = await getAuthUser();
        if (!payload) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create uploads directory
        const uploadsDir = join(process.cwd(), 'uploads');
        await mkdir(uploadsDir, { recursive: true });

        // Save file
        const fileId = randomUUID();
        const fileExtension = file.name.split('.').pop() || '';
        const fileName = `${fileId}.${fileExtension}`;
        filePath = join(uploadsDir, fileName);
        await writeFile(filePath, buffer);

        let summaryData;
        try {
            summaryData = await processFileWithAI(filePath, file.type, file.size, uploadsDir);
        } finally {
            // Cleanup original file
            if (filePath) await unlink(filePath).catch(console.error);
        }

        const processingTime = Date.now() - startTime;

        // Save summary to database
        const dbEntry = {
            id: randomUUID(),
            userId: payload.userId,
            fileName: file.name,
            fileType: summaryData.fileType,
            fileSize: file.size,
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
    } catch (error: any) {
        // Cleanup if error occurred before inner try/catch
        if (filePath) await unlink(filePath).catch(() => { });

        console.error('Upload error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to process file' },
            { status: 500 }
        );
    }
}

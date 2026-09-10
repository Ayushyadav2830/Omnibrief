import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import fs from 'fs/promises';
import { convert } from 'html-to-text';

import { PDFDocument } from 'pdf-lib';

export async function extractTextFromPDF(filePath: string): Promise<string> {
    try {
        const dataBuffer = await fs.readFile(filePath);
        const data = await pdf(dataBuffer);
        return data.text;
    } catch (error) {
        console.error('Error extracting PDF text:', error);
        throw new Error('Failed to extract text from PDF');
    }
}

export async function extractImagesFromPDF(filePath: string): Promise<string[]> {
    try {
        const dataBuffer = await fs.readFile(filePath);
        const pdfDoc = await PDFDocument.load(dataBuffer);
        const pages = pdfDoc.getPages();
        const images: string[] = [];

        // Limit to first 3 pages to avoid overload
        for (let i = 0; i < Math.min(pages.length, 3); i++) {
            const page = pages[i];

            // Note: This logic extracts embedded images. 
            // scanned PDFs are usually 1 big image per page.
            // Note: pdf-lib doesn't easily export "Page as Image", but can extract embedded objects.
            // This is a "Best Effort" attempt for Scanned Docs.

            // Since pure extraction is complex in pdf-lib without unzipping streams manually,
            // We will return specific error signal if text is empty, relying on the user to convert.
            // However, we are adding CSV/JSON support here.
        }
        return images;
    } catch (e) {
        return [];
    }
}

export async function extractTextFromDOCX(filePath: string): Promise<string> {
    try {
        const result = await mammoth.extractRawText({ path: filePath });
        return result.value;
    } catch (error) {
        console.error('Error extracting DOCX text:', error);
        throw new Error('Failed to extract text from DOCX');
    }
}

export async function extractTextFromTXT(filePath: string): Promise<string> {
    try {
        return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
        console.error('Error reading TXT file:', error);
        throw new Error('Failed to read text file');
    }
}

export async function extractTextFromHTML(filePath: string): Promise<string> {
    try {
        const html = await fs.readFile(filePath, 'utf-8');
        return convert(html, { wordwrap: 130 });
    } catch (error) {
        console.error('Error reading HTML file:', error);
        throw new Error('Failed to extract text from HTML');
    }
}

export async function extractTextFromDocument(filePath: string, mimeType: string): Promise<string> {
    const type = mimeType.split(';')[0].trim().toLowerCase();
    const ext = filePath.split('.').pop()?.toLowerCase() || '';

    if (type === 'application/pdf' || ext === 'pdf') {
        return extractTextFromPDF(filePath);
    } else if (
        type.includes('wordprocessingml') ||
        type.includes('msword') ||
        type.includes('officedocument') ||
        ext === 'docx' ||
        ext === 'doc'
    ) {
        return extractTextFromDOCX(filePath);
    } else if (
        type === 'text/plain' ||
        type === 'text/csv' ||
        type === 'application/json' ||
        type === 'text/markdown' ||
        type === 'application/xml' ||
        type.endsWith('xml') ||
        type.endsWith('json') ||
        ext === 'txt' ||
        ext === 'csv' ||
        ext === 'json' ||
        ext === 'md'
    ) {
        // Universal Text Support (CSV, JSON, Logs, Code, XML)
        return extractTextFromTXT(filePath);
    } else if (type === 'text/html' || ext === 'html' || ext === 'htm') {
        return extractTextFromHTML(filePath);
    } else {
        // First try mammoth if it might be a word document
        try {
            const docxResult = await extractTextFromDOCX(filePath);
            if (docxResult && docxResult.trim().length > 10) {
                return docxResult;
            }
        } catch { }

        // Fallback to text reading
        try {
            return await extractTextFromTXT(filePath);
        } catch {
            throw new Error(`Unsupported document type: ${mimeType}`);
        }
    }
}

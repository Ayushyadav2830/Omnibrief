export interface User {
    id: string;
    email: string;
    name: string;
    password: string;
    createdAt: string;
}

export interface Summary {
    id: string;
    userId: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    summary: string;
    keyPoints: string[];
    chapters?: { time: string; title: string; description: string }[];
    speakers?: { name: string; traits: string }[];
    createdAt: string;
    processingTime: number;
}

export interface UploadResponse {
    success: boolean;
    summary?: Summary;
    error?: string;
}

export interface AuthResponse {
    success: boolean;
    token?: string;
    user?: Omit<User, 'password'>;
    error?: string;
}

export type FileType = 'document' | 'audio' | 'video';

export interface ProcessingStatus {
    status: 'processing' | 'completed' | 'failed';
    progress: number;
    message: string;
}

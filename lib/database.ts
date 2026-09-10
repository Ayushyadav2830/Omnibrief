import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { User, Summary } from '@/types';

let inMemoryUsers: User[] = [];
let inMemorySummaries: Summary[] = [];
let isInMemoryFallback = false;

function getDataDir(): string {
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
        return path.join(os.tmpdir(), 'omnibrief-data');
    }
    return path.join(process.cwd(), 'data');
}

function getUsersFile() {
    return path.join(getDataDir(), 'users.json');
}

function getSummariesFile() {
    return path.join(getDataDir(), 'summaries.json');
}

async function ensureDataDir() {
    const dir = getDataDir();
    try {
        await fs.access(dir);
    } catch {
        try {
            await fs.mkdir(dir, { recursive: true });
        } catch {
            isInMemoryFallback = true;
        }
    }
}

// User operations
export async function getUsers(): Promise<User[]> {
    if (isInMemoryFallback) return inMemoryUsers;
    await ensureDataDir();
    try {
        const usersFile = getUsersFile();
        const data = await fs.readFile(usersFile, 'utf-8');
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
            inMemoryUsers = parsed;
            return parsed;
        }
        return inMemoryUsers;
    } catch {
        try {
            const localFile = path.join(process.cwd(), 'data', 'users.json');
            const localData = await fs.readFile(localFile, 'utf-8');
            inMemoryUsers = JSON.parse(localData);
            return inMemoryUsers;
        } catch {
            return inMemoryUsers;
        }
    }
}

export async function saveUser(user: User): Promise<void> {
    const users = await getUsers();
    users.push(user);
    inMemoryUsers = users;
    await ensureDataDir();
    try {
        await fs.writeFile(getUsersFile(), JSON.stringify(users, null, 2));
    } catch (e) {
        console.warn('Failed writing user to filesystem, using in-memory store:', e);
        isInMemoryFallback = true;
    }
}

export async function findUserByEmail(email: string): Promise<User | null> {
    const users = await getUsers();
    return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

export async function findUserById(id: string): Promise<User | null> {
    const users = await getUsers();
    return users.find(u => u.id === id) || null;
}

// Summary operations
export async function getSummaries(): Promise<Summary[]> {
    if (isInMemoryFallback) return inMemorySummaries;
    await ensureDataDir();
    try {
        const data = await fs.readFile(getSummariesFile(), 'utf-8');
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
            inMemorySummaries = parsed;
            return parsed;
        }
        return inMemorySummaries;
    } catch {
        try {
            const localFile = path.join(process.cwd(), 'data', 'summaries.json');
            const localData = await fs.readFile(localFile, 'utf-8');
            inMemorySummaries = JSON.parse(localData);
            return inMemorySummaries;
        } catch {
            return inMemorySummaries;
        }
    }
}

export async function saveSummary(summary: Summary): Promise<void> {
    const summaries = await getSummaries();
    summaries.push(summary);
    inMemorySummaries = summaries;
    await ensureDataDir();
    try {
        await fs.writeFile(getSummariesFile(), JSON.stringify(summaries, null, 2));
    } catch (e) {
        console.warn('Failed writing summary to filesystem, using in-memory store:', e);
        isInMemoryFallback = true;
    }
}

export async function getUserSummaries(userId: string): Promise<Summary[]> {
    const summaries = await getSummaries();
    return summaries.filter(s => s.userId === userId).sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

export async function getSummaryById(id: string): Promise<Summary | null> {
    const summaries = await getSummaries();
    return summaries.find(s => s.id === id) || null;
}

export async function deleteSummary(id: string, userId: string): Promise<boolean> {
    const summaries = await getSummaries();
    const index = summaries.findIndex(s => s.id === id && s.userId === userId);

    if (index === -1) return false;

    summaries.splice(index, 1);
    inMemorySummaries = summaries;
    try {
        await fs.writeFile(getSummariesFile(), JSON.stringify(summaries, null, 2));
    } catch (e) {
        isInMemoryFallback = true;
    }
    return true;
}

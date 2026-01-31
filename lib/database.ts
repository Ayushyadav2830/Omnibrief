import fs from 'fs/promises';
import path from 'path';
import { User, Summary } from '@/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SUMMARIES_FILE = path.join(DATA_DIR, 'summaries.json');

// Ensure data directory exists
async function ensureDataDir() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
}

// User operations
export async function getUsers(): Promise<User[]> {
    await ensureDataDir();
    try {
        const data = await fs.readFile(USERS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

export async function saveUser(user: User): Promise<void> {
    const users = await getUsers();
    users.push(user);
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

export async function findUserByEmail(email: string): Promise<User | null> {
    const users = await getUsers();
    return users.find(u => u.email === email) || null;
}

export async function findUserById(id: string): Promise<User | null> {
    const users = await getUsers();
    return users.find(u => u.id === id) || null;
}

// Summary operations
export async function getSummaries(): Promise<Summary[]> {
    await ensureDataDir();
    try {
        const data = await fs.readFile(SUMMARIES_FILE, 'utf-8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

export async function saveSummary(summary: Summary): Promise<void> {
    const summaries = await getSummaries();
    summaries.push(summary);
    await fs.writeFile(SUMMARIES_FILE, JSON.stringify(summaries, null, 2));
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
    await fs.writeFile(SUMMARIES_FILE, JSON.stringify(summaries, null, 2));
    return true;
}

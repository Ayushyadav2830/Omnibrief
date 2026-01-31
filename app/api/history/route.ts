import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getUserSummaries } from '@/lib/database';

export async function GET() {
    try {
        // Verify authentication
        const payload = await getAuthUser();

        if (!payload) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Get user's summaries
        const summaries = await getUserSummaries(payload.userId);

        return NextResponse.json({
            success: true,
            summaries,
        });
    } catch (error) {
        console.error('History error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch history' },
            { status: 500 }
        );
    }
}

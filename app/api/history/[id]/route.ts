import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { deleteSummary } from '@/lib/database';

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> } // Updated for Next.js 15
) {
    try {
        const { id } = await context.params;

        // Verify authentication
        const payload = await getAuthUser();
        if (!payload) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const success = await deleteSummary(id, payload.userId);

        if (!success) {
            return NextResponse.json(
                { success: false, error: 'Summary not found or unauthorized' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete summary error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete summary' },
            { status: 500 }
        );
    }
}

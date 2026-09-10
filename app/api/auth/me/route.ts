import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { findUserById } from '@/lib/database';

export async function GET() {
    try {
        const payload = await getAuthUser();

        if (!payload) {
            const res = NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
            res.cookies.delete('token');
            return res;
        }

        const user = await findUserById(payload.userId);

        if (!user) {
            const res = NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
            res.cookies.delete('token');
            return res;
        }

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

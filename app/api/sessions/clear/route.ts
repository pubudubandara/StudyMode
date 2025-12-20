import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Session from '@/models/Session';
import { requireAuth } from '@/lib/auth-middleware';

// DELETE all sessions for user
async function deleteHandler(request: NextRequest, userId: string) {
  try {
    await dbConnect();

    const result = await Session.deleteMany({ userId });

    return NextResponse.json({
      success: true,
      message: `Deleted ${result.deletedCount} sessions`,
      deletedCount: result.deletedCount,
    });
  } catch (error: any) {
    console.error('Clear sessions error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to clear sessions' },
      { status: 500 }
    );
  }
}

export const DELETE = requireAuth(deleteHandler);

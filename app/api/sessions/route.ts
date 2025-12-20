import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Session from '@/models/Session';
import { requireAuth } from '@/lib/auth-middleware';

// GET all sessions for user
async function getHandler(request: NextRequest, userId: string) {
  try {
    await dbConnect();

    const sessions = await Session.find({ userId })
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();

    // Ensure dates are properly serialized as ISO strings
    const serializedSessions = sessions.map(session => ({
      ...session,
      _id: session._id.toString(),
      date: session.date instanceof Date ? session.date.toISOString() : session.date,
    }));

    return NextResponse.json({ success: true, sessions: serializedSessions });
  } catch (error: any) {
    console.error('Get sessions error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

// POST create or update session
async function postHandler(request: NextRequest, userId: string) {
  try {
    await dbConnect();

    const { sessionId, duration, target, date, timestamp } = await request.json();

    // Validation
    if (!sessionId || duration === undefined || target === undefined || !date || !timestamp) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if session exists
    const existingSession = await Session.findOne({ userId, sessionId });

    if (existingSession) {
      // Update existing session
      existingSession.duration = duration;
      existingSession.target = target;
      existingSession.date = new Date(date);
      existingSession.timestamp = timestamp;
      await existingSession.save();

      return NextResponse.json({
        success: true,
        session: existingSession,
        updated: true,
      });
    } else {
      // Create new session
      const newSession = await Session.create({
        userId,
        sessionId,
        duration,
        target,
        date: new Date(date),
        timestamp,
      });

      return NextResponse.json({
        success: true,
        session: newSession,
        updated: false,
      }, { status: 201 });
    }
  } catch (error: any) {
    console.error('Save session error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save session' },
      { status: 500 }
    );
  }
}

// DELETE session
async function deleteHandler(request: NextRequest, userId: string) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const result = await Session.deleteOne({
      userId,
      sessionId: parseInt(sessionId),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Session deleted',
    });
  } catch (error: any) {
    console.error('Delete session error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete session' },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler);
export const POST = requireAuth(postHandler);
export const DELETE = requireAuth(deleteHandler);

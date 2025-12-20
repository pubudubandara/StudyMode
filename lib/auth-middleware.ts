import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';

export function authMiddleware(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  
  return payload;
}

export function requireAuth(handler: (request: NextRequest, userId: string) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    const payload = authMiddleware(request);
    
    if (!payload) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return handler(request, payload.userId);
  };
}

import { NextResponse } from 'next/server';

export async function GET() {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  
  // Debug logging
  console.log('API /config called');
  console.log('NEXT_PUBLIC_GOOGLE_CLIENT_ID:', googleClientId);
  console.log('All NEXT_PUBLIC vars:', Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC')));
  
  return NextResponse.json({
    googleClientId,
    debug: {
      hasEnvVar: !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      envVarValue: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    }
  });
}

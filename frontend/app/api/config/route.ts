import { NextResponse } from 'next/server';

export async function GET() {
  // Use GOOGLE_CLIENT_ID (without NEXT_PUBLIC_ prefix) for server-side runtime access
  const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  
  // Debug logging
  console.log('API /config called');
  console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID);
  console.log('NEXT_PUBLIC_GOOGLE_CLIENT_ID:', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
  console.log('Returning:', googleClientId);
  
  return NextResponse.json({
    googleClientId,
  });
}

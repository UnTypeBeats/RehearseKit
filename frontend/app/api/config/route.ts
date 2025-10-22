import { NextResponse } from 'next/server';

export async function GET() {
  console.log('API /config called');
  console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID);
  console.log('NEXT_PUBLIC_GOOGLE_CLIENT_ID:', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
  
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  console.log('Returning:', googleClientId);
  
  return NextResponse.json({
    googleClientId,
  });
}

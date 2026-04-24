import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function buildSecurityTxt() {
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);

  return [
    'Contact: mailto:support@alignedu.net',
    'Contact: https://www.alignedu.net/security',
    'Policy: https://www.alignedu.net/security',
    'Canonical: https://www.alignedu.net/.well-known/security.txt',
    'Preferred-Languages: en',
    `Expires: ${expires.toISOString()}`,
  ].join('\n');
}

export function GET() {
  return new NextResponse(buildSecurityTxt(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

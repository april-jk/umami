import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const waitlistSchema = z.object({
  email: z.string().trim().email().max(254),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = waitlistSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  const dataDir = join(process.cwd(), 'data');
  const record = {
    email: result.data.email.toLowerCase(),
    source: 'landingpage',
    createdAt: new Date().toISOString(),
  };

  await mkdir(dataDir, { recursive: true });
  await appendFile(join(dataDir, 'waitlist.jsonl'), `${JSON.stringify(record)}\n`, 'utf8');

  return NextResponse.json({ ok: true });
}

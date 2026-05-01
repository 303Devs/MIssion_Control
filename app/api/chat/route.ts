import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'No message provided' }, { status: 400 });
    }

    // Use execFile with array args to prevent shell injection
    const { stderr } = await execFileAsync(
      'openclaw',
      ['system', 'event', '--text', `[Mission Control] ${message}`, '--mode', 'now'],
      { timeout: 10000 }
    );

    if (stderr && !stderr.includes('Doctor warnings')) {
      return NextResponse.json({ reply: `Error: ${stderr}` }, { status: 500 });
    }

    return NextResponse.json({
      reply: `Got it. I'll process that on my next turn — check Discord or come back here.`,
    });
  } catch (error) {
    return NextResponse.json(
      { reply: `Failed to reach Bob: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

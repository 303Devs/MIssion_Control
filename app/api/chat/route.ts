import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'No message provided' }, { status: 400 });
    }

    // Use the openclaw CLI to send a system event
    const escapedMessage = message.replace(/'/g, "'\\''");
    const { stdout, stderr } = await execAsync(
      `openclaw system event --text '[Mission Control] ${escapedMessage}' --mode now`,
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

// app/api/ollama/route.ts
import { NextRequest, NextResponse } from 'next/server';

type ChatMessage = { role: 'system' | 'user'; content: string };

interface OllamaRequest {
  model: 'llama3.2';
  messages: ChatMessage[];
}
interface OllamaResponse {
  choices: { message: ChatMessage }[];
}

export async function POST(req: NextRequest) {
  console.log('kk[Ollama] Request received:', req.method, req.url);

  let messages: ChatMessage[];
  try {
    ({ messages } = (await req.json()) as { messages: ChatMessage[] });
  } catch (err) {
    console.error('[Ollama] Invalid JSON body:', err);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const resp = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'llama3.2', messages } as OllamaRequest),
    });

    if (!resp.ok) {
      // Read raw text for better error info
      const errText = await resp.text();
      console.error(`[Ollama] Error ${resp.status}:`, errText);
      return NextResponse.json(
        { error: `Ollama ${resp.status}: ${errText}` },
        { status: 502 }
      );
    }

    const text = await resp.text();
    const lines = text.trim().split('\n');
    let content = '';
    const parsed = lines.map((line) => JSON.parse(line));
    for (const obj of parsed) {
      if (obj.message?.content) content += obj.message.content;
    }
    const last = parsed[parsed.length - 1];
    return NextResponse.json({
      model: last.model,
      created_at: last.created_at,
      message: { role: last.message.role, content },
      done: last.done,
      done_reason: last.done_reason,
      total_duration: last.total_duration,
      load_duration: last.load_duration,
      prompt_eval_count: last.prompt_eval_count,
      prompt_eval_duration: last.prompt_eval_duration,
      eval_count: last.eval_count,
      eval_duration: last.eval_duration,
    });
  } catch (err: any) {
    console.error('[Ollama] Fetch failed:', err);
    return NextResponse.json(
      { error: `Fetch failed: ${err.message}` },
      { status: 500 }
    );
  }
}

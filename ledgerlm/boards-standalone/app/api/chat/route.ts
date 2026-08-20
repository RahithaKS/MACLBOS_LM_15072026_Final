import { NextResponse } from "next/server";
import { generate, ConfigError } from "@/lib/llm";
import { computeMetricsBlock, addCompositePeriod } from "@/lib/metrics";
import { compactSourceForPrompt } from "@/lib/promptData";
import type { ChatMessage, DataSource } from "@/lib/types";

export const maxDuration = 300;

interface ChatRequest {
  boardName: string;
  systemPrompt: string;
  cube: Pick<DataSource, "name" | "description" | "records"> | null;
  messages: ChatMessage[];
}

export async function POST(request: Request) {
  let body: ChatRequest;
  try {
    body = (await request.json()) as ChatRequest;
  } catch {
    return NextResponse.json(
      { error: "The request payload could not be processed — it is likely too large." },
      { status: 413 },
    );
  }
  if (!body.messages?.length) {
    return NextResponse.json({ error: "No messages" }, { status: 400 });
  }

  if (body.cube) {
    body.cube = { ...body.cube, records: addCompositePeriod(body.cube.records) };
  }
  const compacted = body.cube ? compactSourceForPrompt(body.cube) : null;
  const cubeBlock = body.cube
    ? `Connected data cube: ${body.cube.name} (${body.cube.description})
${compacted?.note ? `\n${compacted.note}\n` : ""}
Raw data:
\`\`\`json
${JSON.stringify(compacted!.records)}
\`\`\`

${computeMetricsBlock(body.cube)}

When a question involves a derived figure (total, margin, ratio, growth), copy the pre-computed
value verbatim — never do your own arithmetic. If a figure is not derivable from the data above,
say so instead of estimating.`
    : "No data cube is connected to this board. Answer from general finance knowledge and say when a question would need connected data.";

  const transcript = body.messages
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.text}`)
    .join("\n\n");

  const prompt = `You are the analysis assistant behind LedgerLM, an AI-first financial intelligence
platform for CFOs. You are chatting inside the board "${body.boardName}".

Board configuration (from the board owner):
${body.systemPrompt || "(none provided)"}

${cubeBlock}

Conversation so far:

${transcript}

Reply to the last user message. Be concise, specific, and quantified where the data allows.
Respond with plain text only — no JSON, no markdown headers.`;

  try {
    const reply = await generate(prompt);
    return NextResponse.json({ reply: reply.trim() });
  } catch (error) {
    if (error instanceof ConfigError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof Error && error.name === "TimeoutError") {
      return NextResponse.json(
        { error: "The model took too long to respond. Please retry." },
        { status: 504 },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chat failed unexpectedly." },
      { status: 502 },
    );
  }
}

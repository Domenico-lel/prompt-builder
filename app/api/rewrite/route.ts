import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { parseRequest, parseResult, SYSTEM } from "@/lib/builder";
export const runtime = "nodejs";
export async function POST(req: Request) {
  let input;
  try {
    if (new TextEncoder().encode(await req.clone().text()).length > 64000)
      return NextResponse.json(
        { error: "Richiesta troppo lunga." },
        { status: 413 },
      );
    input = parseRequest(await req.json());
  } catch {
    return NextResponse.json(
      { error: "Compila l’obiettivo e rispetta i limiti dei campi." },
      { status: 400 },
    );
  }
  if (!process.env.GROQ_API_KEY)
    return NextResponse.json(
      {
        error:
          "Il servizio AI non è configurato. Aggiungi GROQ_API_KEY sul server.",
      },
      { status: 503 },
    );
  try {
    const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
      timeout: 45000,
      maxRetries: 0,
    });
    const completion = await groq.chat.completions.create({
      model,
      temperature: 0.3,
      max_tokens: 6000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: JSON.stringify(input) },
      ],
    });
    if (completion.choices[0]?.finish_reason !== "stop")
      throw new Error("Incomplete response");
    const result = parseResult(
      JSON.parse(completion.choices[0]?.message.content || "{}"),
      input.action,
    );
    return NextResponse.json({ ...result, result: result.prompt, model });
  } catch (error: unknown) {
    const status = error instanceof Groq.APIError ? error.status : undefined;
    return NextResponse.json(
      {
        error:
          status === 429
            ? "Il servizio AI è occupato. Attendi un momento e riprova."
            : "Non è stato possibile completare la richiesta AI. Il tuo lavoro è conservato: riprova.",
      },
      { status: status === 429 ? 429 : 502 },
    );
  }
}

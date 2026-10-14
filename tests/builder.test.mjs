import { readFile } from "node:fs/promises";
import test from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
const compile = (source) =>
  ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
const moduleUrl = (source) =>
  "data:text/javascript;base64," + Buffer.from(source).toString("base64");
const builderUrl = moduleUrl(
  compile(
    await readFile(new URL("../lib/builder.ts", import.meta.url), "utf8"),
  ),
);
const { parseRequest, parseResult, EMPTY_BRIEF } = await import(builderUrl);
const brief = { ...EMPTY_BRIEF, goal: "Preparare un piano di studio" };
const result = {
  title: "Piano di studio",
  prompt: "**Obiettivo**\nPrepara un piano per {{materia}}.",
  questions: [],
  assumptions: [],
  checks: ["Ogni settimana contiene una verifica."],
};

test("normalizes the brief and preserves the legacy prompt input", () => {
  assert.equal(
    parseRequest({ brief: { ...brief, goal: "  Studiare  " } }).brief.goal,
    "Studiare",
  );
  assert.equal(
    parseRequest({ prompt: "Scrivere una mail", mode: "frontend" }).brief.goal,
    "Scrivere una mail",
  );
});
test("rejects missing goals, oversized fields, malformed answers and invalid actions", () => {
  for (const input of [
    { brief: EMPTY_BRIEF },
    { brief: { ...brief, context: "x".repeat(10001) } },
    { brief, answers: [{}] },
    { brief, action: ["build"] },
    { brief, action: "execute" },
    { brief, answers: Array(6).fill({ question: "Q", answer: "A" }) },
  ])
    assert.throws(() => parseRequest(input));
});
test("refinement requires both edited prompt and revision instruction", () => {
  assert.throws(() =>
    parseRequest({ brief, action: "refine", previous: "Edited" }),
  );
  const request = parseRequest({
    brief,
    action: "refine",
    previous: "My manual edit",
    instruction: "Make it shorter",
    answers: [{ question: "Materia?", answer: "Storia" }],
  });
  assert.equal(request.previous, "My manual edit");
  assert.equal(request.answers[0].answer, "Storia");
});
test("rejects unusable or malformed provider output", () => {
  for (const value of [
    {},
    { ...result, prompt: "" },
    { ...result, checks: [42] },
    { ...result, questions: Array(6).fill("Q") },
  ])
    assert.throws(() => parseResult(value, "build"));
  assert.deepEqual(parseResult(result, "build"), result);
  assert.equal(
    parseResult({ ...result, prompt: "", questions: ["Materia?"] }, "analyze")
      .questions[0],
    "Materia?",
  );
});

// Replace only framework and provider boundaries: exercise the actual route handler
// without credentials, network costs, or a dependency on nondeterministic AI output.
const providerUrl =
  moduleUrl(`export const state = { calls: [], response: null, error: null };
class APIError extends Error { constructor(status) { super('secret provider detail'); this.status = status; } }
export default class Groq { static APIError = APIError; constructor() { this.chat = { completions: { create: async input => { state.calls.push(input); if (state.error) throw state.error; return state.response; } } }; } }`);
const frameworkUrl = moduleUrl("export const NextResponse = Response;");
const source = compile(
  await readFile(
    new URL("../app/api/rewrite/route.ts", import.meta.url),
    "utf8",
  ),
)
  .replace('"next/server"', JSON.stringify(frameworkUrl))
  .replace('"groq-sdk"', JSON.stringify(providerUrl))
  .replace('"@/lib/builder"', JSON.stringify(builderUrl));
const { POST } = await import(moduleUrl(source));
const { default: MockGroq, state } = await import(providerUrl);
const request = (input) =>
  new Request("http://localhost/api/rewrite", {
    method: "POST",
    body: JSON.stringify(input),
  });
test("API validates before calling the provider", async () => {
  state.calls = [];
  assert.equal((await POST(request({ brief: EMPTY_BRIEF }))).status, 400);
  assert.equal(
    (
      await POST(
        new Request("http://localhost/api/rewrite", {
          method: "POST",
          body: "{broken",
        }),
      )
    ).status,
    400,
  );
  assert.equal(
    (await POST(request({ prompt: "x".repeat(64001) }))).status,
    413,
  );
  assert.equal(state.calls.length, 0);
});
test("API configuration, analyze/build/refine, truncation and errors", async () => {
  const oldKey = process.env.GROQ_API_KEY;
  const oldModel = process.env.GROQ_MODEL;
  try {
    delete process.env.GROQ_API_KEY;
    assert.equal((await POST(request({ brief }))).status, 503);
    process.env.GROQ_API_KEY = "test-key-never-transmitted";
    process.env.GROQ_MODEL = "test-configurable-model";
    for (const action of ["analyze", "build", "refine"]) {
      state.response = {
        choices: [
          {
            finish_reason: "stop",
            message: {
              content: JSON.stringify(
                action === "analyze"
                  ? { ...result, prompt: "", questions: ["Materia?"] }
                  : result,
              ),
            },
          },
        ],
      };
      const response = await POST(
        request({
          brief,
          action,
          previous: "Manual edit",
          instruction: "Shorter",
          answers: [{ question: "Materia?", answer: "Storia" }],
        }),
      );
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.model, "test-configurable-model");
      assert.equal(data.result, data.prompt);
      assert.equal(state.calls.at(-1).response_format.type, "json_object");
      assert.equal(
        JSON.parse(state.calls.at(-1).messages[1].content).answers[0].answer,
        "Storia",
      );
    }
    state.response.choices[0].finish_reason = "length";
    assert.equal((await POST(request({ brief }))).status, 502);
    state.error = new MockGroq.APIError(429);
    const limited = await POST(request({ brief }));
    assert.equal(limited.status, 429);
    assert.ok(
      !JSON.stringify(await limited.json()).includes("secret provider detail"),
    );
    state.error = new Error("private error");
    assert.equal((await POST(request({ brief }))).status, 502);
  } finally {
    state.error = null;
    if (oldKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = oldKey;
    if (oldModel === undefined) delete process.env.GROQ_MODEL;
    else process.env.GROQ_MODEL = oldModel;
  }
});

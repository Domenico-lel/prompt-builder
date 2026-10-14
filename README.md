# Prompt Builder Workspace

A general-purpose prompt builder in Italian, built with Next.js and Groq.

## Run locally

Use Node.js 20 or later. Run `npm ci`, copy `.env.local.example` to `.env.local`, set `GROQ_API_KEY`, then run `npm run dev`.
Never commit `.env.local`. `GROQ_MODEL` is optional (default `openai/gpt-oss-120b`); choose a Groq model with JSON Object Mode support. Provider credentials and model selection stay on the server.

## Workflow

1. Write a goal and optional context, audience, constraints, format and tone. Templates are starting points, not specialized generation modes.
2. Optionally choose **Chiarisci con l’AI** for up to five targeted questions, then fill in the answers.
3. Build a prompt. Missing information should become `{{named_placeholders}}`; assumptions and proposed evaluation criteria appear separately.
4. Edit the prompt directly or request a revision. Revisions send the current editor content, brief and clarification answers to the AI.
5. Copy, export Markdown, or manually save the project in the browser library. Up to 20 projects and the most recent 20 AI versions are kept. Selecting another version replaces unsaved editor changes. Saving retains the current editor draft; original AI versions remain unchanged.

The application builds instructions; it does not execute the resulting prompt. Evaluation criteria are AI suggestions, not measured quality scores. Editing a brief invalidates previous clarification questions and answers. Loading a saved project restores its brief, versions and draft; clarification answers are not separately persisted.

## Validation

`npm test` checks request/output contracts and the actual API handler with a mocked provider, including clarify/build/refine, missing configuration, oversized input, truncation, and rate limits. `npm run build` validates the production build. Tests do not establish live model quality or account access.

## Deployment and limitations

Set `GROQ_API_KEY` and optionally `GROQ_MODEL` in the server environment. Each clarify, build or refine action makes one provider call. No database or account is required; saved projects are local to the browser and can be lost when browser storage is cleared. Only explicit saves persist data. The brief, current prompt and answers for an action are transmitted to Groq for generation.

Before a broad public launch, add deployment-level rate limiting or authenticated quotas: the current API has no user accounts or per-user billing limits. Input/output validation, a 45-second provider timeout and a bounded token budget are present. Cancelling in the UI cancels the client request; a provider call already started can still incur usage.

## Next increments

- Compare models on a fixed set of Italian writing, learning, research, analysis and planning briefs. Measure intent preservation, useful clarifications, invented details, latency and cost. Switch provider only after this comparison.
- Add a provider adapter for OpenAI or another provider, with a shared result contract and validated structured output.
- Add a test workspace to run prompts on sample inputs, compare versions and record evaluation results.
- Introduce reusable variables, import/export of whole projects, and optional account-based sync.

"use client";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Action,
  Brief,
  BuilderResult,
  EMPTY_BRIEF,
  parseRequest,
  parseResult,
} from "@/lib/builder";

const EXAMPLES = [
  "Mi serve un piano per studiare storia in un mese",
  "Voglio scrivere un’email per proporre una collaborazione",
  "Aiutami a confrontare due idee per un progetto",
];
type Version = BuilderResult & { id: string; model: string; createdAt: string };
type Project = { id: string; brief: Brief; versions: Version[]; draft: string };
const STORAGE = "prompt-builder:library:v1";

export default function Home() {
  const [brief, setBrief] = useState<Brief>({ ...EMPTY_BRIEF });
  const [analysis, setAnalysis] = useState<BuilderResult | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [versions, setVersions] = useState<Version[]>([]);
  const [active, setActive] = useState<string>("");
  const [draft, setDraft] = useState("");
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState<Action | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState(false);
  const [library, setLibrary] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const request = useRef<AbortController | null>(null);
  const result = versions.find((version) => version.id === active);
  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(STORAGE) || "[]");
      if (!Array.isArray(stored)) throw new Error();
      const valid = stored.slice(0, 20).filter((item): item is Project => {
        try {
          if (
            !item ||
            typeof item.id !== "string" ||
            typeof item.draft !== "string" ||
            item.draft.length > 16000 ||
            !Array.isArray(item.versions) ||
            item.versions.length > 20
          )
            return false;
          parseRequest({ brief: item.brief });
          return item.versions.every(
            (version: Version) =>
              typeof version.id === "string" &&
              typeof version.model === "string" &&
              typeof version.createdAt === "string" &&
              !!parseResult(version, "build"),
          );
        } catch {
          return false;
        }
      });
      setLibrary(valid);
    } catch {
      setError("La libreria locale non è disponibile in questo browser.");
    }
    return () => request.current?.abort();
  }, []);

  function changeIdea(value: string) {
    setBrief({ ...EMPTY_BRIEF, goal: value });
    setAnalysis(null);
    setAnswers({});
    setNotice("");
  }
  async function generate(action: Action) {
    if (loading || !brief.goal.trim()) return;
    setLoading(action);
    setError("");
    setNotice("");
    const controller = new AbortController();
    request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 55000);
    try {
      const response = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          action,
          brief,
          previous: action === "refine" ? draft : "",
          instruction: action === "refine" ? instruction : "",
          answers: Object.entries(answers).map(([question, answer]) => ({
            question,
            answer,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Il servizio AI non ha risposto.");
      const parsed = parseResult(data, action);
      if (
        parsed.questions.length > 0 &&
        (action === "start" || action === "analyze")
      ) {
        setAnalysis(parsed);
        setAnswers({});
      } else {
        setAnalysis(null);
        const version = {
          ...parsed,
          id: crypto.randomUUID(),
          model: String(data.model),
          createdAt: new Date().toISOString(),
        };
        setVersions((current) => [...current, version].slice(-20));
        setActive(version.id);
        setDraft(parsed.prompt);
        setInstruction("");
        setPreview(true);
      }
    } catch (err) {
      setError(
        controller.signal.aborted
          ? "Richiesta annullata o tempo scaduto. Puoi riprovare."
          : err instanceof Error
            ? err.message
            : "Errore di rete. Riprova.",
      );
    } finally {
      clearTimeout(timeout);
      request.current = null;
      setLoading(null);
    }
  }
  function save() {
    if (!draft.trim() || !result) return;
    const id = projectId || crypto.randomUUID();
    const project = { id, brief, versions, draft };
    const next = [project, ...library.filter((item) => item.id !== id)].slice(
      0,
      20,
    );
    try {
      localStorage.setItem(STORAGE, JSON.stringify(next));
      setLibrary(next);
      setProjectId(id);
      setNotice("Progetto salvato in questo browser.");
    } catch {
      setError("Impossibile salvare: memoria locale non disponibile o piena.");
    }
  }
  function remove(id: string) {
    const next = library.filter((item) => item.id !== id);
    try {
      localStorage.setItem(STORAGE, JSON.stringify(next));
      setLibrary(next);
      if (projectId === id) setProjectId("");
    } catch {
      setError("Impossibile aggiornare la libreria.");
    }
  }
  function reset() {
    setBrief({ ...EMPTY_BRIEF });
    setVersions([]);
    setActive("");
    setDraft("");
    setAnalysis(null);
    setAnswers({});
    setInstruction("");
    setProjectId("");
    setError("");
    setNotice("");
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([draft], { type: "text/markdown;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "prompt.md";
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <main className="workspace">
      <header className="topbar">
        <a href="/" className="brand">
          <span className="brand-icon">✦</span> Prompt Builder{" "}
          <span className="badge">DALL’IDEA AL PROMPT</span>
        </a>
        <button disabled={!!loading} onClick={reset}>
          Nuovo progetto
        </button>
      </header>
      <section className="intro mini-intro">
        <p className="eyebrow">TU HAI L’IDEA. AI DETTAGLI PENSA L’AI.</p>
        <h1>
          Scrivi poco.
          <br />
          Ottieni un prompt fatto bene.
        </h1>
        <p>
          Racconta in poche parole cosa ti serve. Se manca qualcosa di
          importante, ti faccio qualche domanda. Poi preparo il prompt completo.
        </p>
      </section>
      <div className="conversation-workspace">
        <section className="panel idea-panel" aria-labelledby="idea-title">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              generate("start");
            }}
          >
            <label id="idea-title" htmlFor="mini-prompt">
              Di cosa hai bisogno?
            </label>
            <textarea
              id="mini-prompt"
              className="mini-prompt"
              disabled={!!loading}
              rows={4}
              maxLength={4000}
              value={brief.goal}
              onChange={(e) => changeIdea(e.target.value)}
              placeholder="Es. Mi serve un prompt per creare un piano di allenamento a casa, ho poco tempo e voglio rimettermi in forma…"
              required
            />
            <div className="mini-submit">
              <span>Bastano un paio di frasi, anche scritte al volo.</span>
              <button
                type="submit"
                className="primary"
                disabled={!!loading || !brief.goal.trim()}
              >
                {loading === "start" ? "Ci penso…" : "Invia la tua idea ↗"}
              </button>
            </div>
          </form>
          {!result && !analysis && (
            <div className="idea-examples">
              <p>Oppure parti da un esempio</p>
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  disabled={!!loading}
                  onClick={() => {
                    changeIdea(example);
                    document.getElementById("mini-prompt")?.focus();
                  }}
                >
                  {example}
                  <span aria-hidden="true">↗</span>
                </button>
              ))}
            </div>
          )}
        </section>
        {analysis && (
          <section
            className="panel questions-panel"
            aria-labelledby="questions-title"
          >
            <div className="assistant-heading">
              <span className="assistant-icon" aria-hidden="true">
                ✦
              </span>
              <div>
                <h2 id="questions-title">Mi servono solo questi dettagli</h2>
                <p>Rispondi come preferisci, anche in poche parole.</p>
              </div>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                generate("build");
              }}
            >
              <fieldset disabled={!!loading} className="question-fields">
                {analysis.questions.map((question, index) => (
                  <label key={question}>
                    <span className="question-number">{index + 1}</span>
                    {question}
                    <textarea
                      rows={2}
                      maxLength={2000}
                      value={answers[question] || ""}
                      onChange={(e) =>
                        setAnswers((current) => ({
                          ...current,
                          [question]: e.target.value,
                        }))
                      }
                      placeholder="La tua risposta…"
                    />
                  </label>
                ))}
              </fieldset>
              <div className="actions">
                <button type="submit" className="primary" disabled={!!loading}>
                  Crea il prompt completo ↗
                </button>
              </div>
              <p className="footnote">
                Puoi lasciare una risposta in bianco: userò un segnaposto solo
                dove è indispensabile.
              </p>
            </form>
          </section>
        )}
        {result && !analysis && (
          <section
            className="panel output-panel"
            aria-labelledby="output-title"
          >
            <div className="section-heading">
              <span className="assistant-icon" aria-hidden="true">
                ✦
              </span>
              <div>
                <h2 id="output-title">Il tuo prompt</h2>
                <p>
                  Pronto da copiare nella tua AI. Puoi anche modificarlo o
                  chiedere una revisione.
                </p>
              </div>
            </div>
            {result && (
              <>
                <div className="output-heading">
                  <h3>{result.title}</h3>
                  <label className="version-picker">
                    Versione
                    <select
                      disabled={!!loading}
                      value={active}
                      onChange={(e) => {
                        const version = versions.find(
                          (item) => item.id === e.target.value,
                        )!;
                        setActive(version.id);
                        setDraft(version.prompt);
                        setPreview(false);
                        setNotice("");
                      }}
                    >
                      {versions.map((version, index) => (
                        <option value={version.id} key={version.id}>
                          {index + 1} · {version.title}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="editor-tabs">
                  <button
                    aria-pressed={!preview}
                    onClick={() => setPreview(false)}
                  >
                    Modifica
                  </button>
                  <button
                    aria-pressed={preview}
                    onClick={() => setPreview(true)}
                  >
                    Anteprima
                  </button>
                  <span>{draft.length.toLocaleString("it-IT")} caratteri</span>
                </div>
                {preview ? (
                  <div className="md prompt-preview">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {draft}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <textarea
                    className="prompt-editor"
                    aria-label="Prompt modificabile"
                    disabled={!!loading}
                    maxLength={16000}
                    value={draft}
                    onChange={(e) => {
                      setDraft(e.target.value);
                      setNotice("");
                    }}
                  />
                )}
                <div className="actions output-actions">
                  <button
                    disabled={!draft.trim()}
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(draft);
                        setNotice("Prompt copiato.");
                      } catch {
                        setError(
                          "Copia non disponibile. Seleziona il testo nell’editor.",
                        );
                      }
                    }}
                  >
                    Copia
                  </button>
                  <button disabled={!draft.trim()} onClick={download}>
                    Esporta .md
                  </button>
                  <button disabled={!!loading || !draft.trim()} onClick={save}>
                    Salva in libreria
                  </button>
                </div>
                <div className="refinement">
                  <label>
                    Come vuoi migliorarlo?
                    <textarea
                      disabled={!!loading}
                      rows={2}
                      maxLength={4000}
                      value={instruction}
                      onChange={(e) => setInstruction(e.target.value)}
                      placeholder="Es. rendilo più sintetico, aggiungi un esempio, cambia il destinatario…"
                    />
                  </label>
                  <button
                    className="primary"
                    disabled={!!loading || !instruction.trim() || !draft.trim()}
                    onClick={() => generate("refine")}
                  >
                    Crea una revisione
                  </button>
                </div>
                {result.assumptions.length > 0 && (
                  <div className="notes">
                    <h3>Assunzioni da verificare</h3>
                    <ul>
                      {result.assumptions.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.checks.length > 0 && (
                  <div className="notes">
                    <h3>Criteri per valutare il risultato</h3>
                    <p className="footnote">
                      Suggeriti dall’AI; il prompt non è stato eseguito o
                      validato.
                    </p>
                    <ul>
                      {result.checks.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="footnote">
                  Generato con {result.model}. Le revisioni usano il testo
                  presente nell’editor. Se cambi versione, le modifiche manuali
                  non salvate vengono sostituite.
                </p>
              </>
            )}
          </section>
        )}
      </div>
      <div className="feedback" aria-live="polite">
        {loading && (
          <p>
            {" "}
            {loading === "analyze" || loading === "start"
              ? "Leggo la tua idea e scelgo come aiutarti…"
              : loading === "refine"
                ? "Preparo la revisione…"
                : "Costruisco il prompt…"}{" "}
            <button onClick={() => request.current?.abort()}>Annulla</button>
          </p>
        )}
        {notice && <p>{notice}</p>}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <section className="library" aria-labelledby="library-title">
        <div className="section-heading">
          <div>
            <h2 id="library-title">La tua libreria</h2>
            <p>
              Salvataggio manuale, solo in questo browser. Fino a 20 progetti e
              20 versioni per progetto.
            </p>
          </div>
        </div>
        {library.length ? (
          <div className="library-grid">
            {library.map((project) => (
              <article key={project.id}>
                <h3>{project.versions.at(-1)?.title || project.brief.goal}</h3>
                <p>{project.brief.goal}</p>
                <div className="actions">
                  <button
                    disabled={!!loading}
                    onClick={() => {
                      setBrief(project.brief);
                      setVersions(project.versions);
                      setActive(project.versions.at(-1)?.id || "");
                      setDraft(project.draft);
                      setProjectId(project.id);
                      setAnalysis(null);
                      setAnswers({});
                      setInstruction("");
                      setError("");
                      setNotice("Progetto aperto.");
                      setPreview(false);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    Apri
                  </button>
                  <button
                    disabled={!!loading}
                    onClick={() => remove(project.id)}
                  >
                    Elimina
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="footnote">Salva il primo prompt per ritrovarlo qui.</p>
        )}
      </section>
      <footer>
        Progettato per scrittura, studio, ricerca, analisi e lavoro. Il builder
        crea istruzioni: il risultato finale si ottiene nell’AI in cui le
        userai.
      </footer>
    </main>
  );
}

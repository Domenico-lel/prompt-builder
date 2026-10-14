"use client";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Action,
  Brief,
  BuilderResult,
  EMPTY_BRIEF,
  FIELDS,
  parseRequest,
  parseResult,
} from "@/lib/builder";

const LABELS: Record<keyof Brief, string> = {
  goal: "Cosa vuoi ottenere?",
  context: "Contesto e informazioni disponibili",
  audience: "A chi è destinato il risultato?",
  constraints: "Requisiti e limiti",
  format: "Formato del risultato",
  tone: "Tono e stile",
};
const HINTS: Record<keyof Brief, string> = {
  goal: "Descrivi il risultato che vuoi ottenere dall’AI…",
  context:
    "Situazione, materiali, dati o informazioni che l’AI dovrà conoscere…",
  audience: "Es. clienti di una piccola impresa, studenti principianti…",
  constraints: "Es. massimo 500 parole, budget noto, cose da evitare…",
  format: "Es. tabella comparativa, email, piano settimanale…",
  tone: "Es. chiaro, professionale, semplice e diretto…",
};
const TEMPLATES = [
  {
    name: "Scrittura",
    goal: "Scrivere un’email di follow-up dopo una proposta commerciale",
    format: "Email con oggetto e una call to action",
    tone: "Professionale e cordiale",
  },
  {
    name: "Studio",
    goal: "Costruire un piano di studio per imparare una materia",
    format: "Piano settimanale con esercizi e verifiche",
    tone: "Chiaro e incoraggiante",
  },
  {
    name: "Ricerca",
    goal: "Confrontare le alternative per prendere una decisione informata",
    format: "Tabella comparativa e raccomandazione motivata",
    tone: "Analitico",
  },
  {
    name: "Analisi",
    goal: "Analizzare un insieme di dati e individuare tendenze e anomalie",
    format: "Sintesi, evidenze e limiti dell’analisi",
    tone: "Preciso",
  },
  {
    name: "Lavoro",
    goal: "Preparare una riunione con obiettivi, agenda e decisioni da prendere",
    format: "Agenda con tempi e risultati attesi",
    tone: "Pratico",
  },
  {
    name: "Pianificazione",
    goal: "Trasformare un obiettivo in un piano di azioni realizzabili",
    format: "Fasi, priorità, dipendenze e criteri di completamento",
    tone: "Concreto",
  },
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

  function changeBrief(key: keyof Brief, value: string) {
    setBrief((current) => ({ ...current, [key]: value }));
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
      if (action === "analyze") {
        setAnalysis(parsed);
        setAnswers({});
      } else {
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
        setPreview(false);
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
          <span className="badge">WORKSPACE</span>
        </a>
        <button disabled={!!loading} onClick={reset}>
          Nuovo progetto
        </button>
      </header>
      <section className="intro">
        <p className="eyebrow">DALL’IDEA ALLE ISTRUZIONI</p>
        <h1>
          Un buon risultato inizia
          <br />
          da un prompt chiaro.
        </h1>
        <p>
          Definisci ciò che vuoi ottenere. Chiarisci i dettagli. Costruisci e
          perfeziona le istruzioni per la tua AI.
        </p>
      </section>
      <div className="workspace-grid">
        <section className="panel brief-panel" aria-labelledby="brief-title">
          <div className="section-heading">
            <span className="step">01</span>
            <div>
              <h2 id="brief-title">Definisci il brief</h2>
              <p>Parti da zero o scegli un punto di partenza.</p>
            </div>
          </div>
          <div className="templates">
            {TEMPLATES.map((template) => (
              <button
                key={template.name}
                disabled={!!loading}
                onClick={() => {
                  setBrief({
                    ...EMPTY_BRIEF,
                    goal: template.goal,
                    format: template.format,
                    tone: template.tone,
                  });
                  setAnalysis(null);
                  setAnswers({});
                  setNotice("");
                }}
              >
                {template.name}
              </button>
            ))}
          </div>
          <fieldset disabled={!!loading} className="brief-fields">
            {FIELDS.map((key) => (
              <label
                key={key}
                className={
                  key === "goal" ||
                  key === "context" ||
                  key === "audience" ||
                  key === "constraints"
                    ? "full"
                    : ""
                }
              >
                {LABELS[key]}
                {key === "goal" ? (
                  <span className="required"> *</span>
                ) : (
                  <span className="optional"> · facoltativo</span>
                )}
                <textarea
                  rows={key === "goal" || key === "context" ? 3 : 2}
                  maxLength={key === "context" ? 10000 : 4000}
                  value={brief[key]}
                  onChange={(e) => changeBrief(key, e.target.value)}
                  placeholder={HINTS[key]}
                  required={key === "goal"}
                />
              </label>
            ))}
          </fieldset>
          <div className="actions">
            <button
              disabled={!!loading || !brief.goal.trim()}
              onClick={() => generate("analyze")}
            >
              Chiarisci con l’AI
            </button>
            <button
              className="primary"
              disabled={!!loading || !brief.goal.trim()}
              onClick={() => generate("build")}
            >
              Costruisci prompt ↗
            </button>
          </div>
          <p className="footnote">
            Puoi generare subito: i dettagli mancanti diventano segnaposto da
            completare.
          </p>
          {analysis && (
            <section className="clarifications">
              <h3>Mettiamo a fuoco i dettagli</h3>
              {analysis.questions.length === 0 ? (
                <p>Il brief è sufficiente per costruire il prompt.</p>
              ) : (
                analysis.questions.map((question) => (
                  <label key={question}>
                    {question}
                    <textarea
                      disabled={!!loading}
                      rows={2}
                      maxLength={2000}
                      value={answers[question] || ""}
                      onChange={(e) =>
                        setAnswers((current) => ({
                          ...current,
                          [question]: e.target.value,
                        }))
                      }
                      placeholder="Rispondi oppure lascia un segnaposto…"
                    />
                  </label>
                ))
              )}
              <p className="footnote">
                Le risposte saranno incluse nella prossima generazione.
              </p>
            </section>
          )}
        </section>
        <section className="panel output-panel" aria-labelledby="output-title">
          <div className="section-heading">
            <span className="step">02</span>
            <div>
              <h2 id="output-title">Il tuo prompt</h2>
              <p>Un documento da usare, modificare e migliorare.</p>
            </div>
          </div>
          {result ? (
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
                <button aria-pressed={preview} onClick={() => setPreview(true)}>
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
          ) : (
            <div className="empty-output">
              <span>↗</span>
              <h3>Le tue idee, ben organizzate.</h3>
              <p>
                Qui troverai un prompt con istruzioni, vincoli e formato adatti
                al tuo obiettivo.
              </p>
              <div className="empty-tags">
                <span>Obiettivo</span>
                <span>Contesto</span>
                <span>Istruzioni</span>
                <span>Risultato atteso</span>
              </div>
            </div>
          )}
        </section>
      </div>
      <div className="feedback" aria-live="polite">
        {loading && (
          <p>
            {" "}
            {loading === "analyze"
              ? "Analizzo il brief…"
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
          <span className="step">03</span>
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

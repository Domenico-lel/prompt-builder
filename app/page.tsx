"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Mode = "general" | "frontend" | "image";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode?: Mode;
};

const MODES: { id: Mode; label: string; icon: string }[] = [
  { id: "general", label: "Generale", icon: "✦" },
  { id: "frontend", label: "Frontend", icon: "▲" },
  { id: "image", label: "Immagine", icon: "◐" },
];

const EXAMPLES: Record<Mode, string[]> = {
  general: [
    "Email professionale di follow-up",
    "Piano di studio per imparare React",
    "Idea per un'app di fitness",
  ],
  frontend: [
    "Landing page per un SaaS di analytics",
    "Sidebar animata mobile-first",
    "Dashboard con bento grid dark mode",
  ],
  image: [
    "Logo minimal per uno studio di architettura",
    "Ritratto cinematografico stile Blade Runner",
    "Illustrazione isometrica di una città futuristica",
  ],
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<Mode>("frontend");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  // Fix iOS/PWA: ancora l'app alla Visual Viewport. Il documento è bloccato
  // (vedi globals.css), quindi la tastiera non trascina più la pagina: qui
  // adeguiamo altezza e offset dell'app all'area realmente visibile.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement.style;
    const sync = () => {
      root.setProperty("--vh", `${vv.height}px`);
      // Se iOS applica comunque un offset alla viewport visiva, lo
      // compensiamo traslando l'app per tenerla incollata al visibile.
      root.setProperty("--vv-offset", `${vv.offsetTop}px`);
    };
    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    window.addEventListener("orientationchange", sync);
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
      window.removeEventListener("orientationchange", sync);
    };
  }, []);

  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [input]);

  async function send(text?: string) {
    const value = (text ?? input).trim();
    if (!value || loading) return;
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: value,
      mode,
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: value, mode }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.result ?? data.error ?? "Errore sconosciuto.",
          mode,
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Errore di rete. Riprova.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500);
    } catch {}
  }

  function reset() {
    setMessages([]);
    setInput("");
  }

  const currentModeLabel = MODES.find((m) => m.id === mode)?.label ?? "";

  return (
    <main
      className="flex flex-col mx-auto max-w-2xl w-full min-w-0 safe-x"
      style={{
        height: "var(--vh, 100dvh)",
        transform: "translateY(var(--vv-offset, 0px))",
      }}
    >
      {/* Header */}
      <header
        className="px-4 py-3 border-b border-border flex items-center justify-between backdrop-blur-md bg-bg/60 sticky top-0 z-10"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent to-accent2 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-accent/20">
            ✦
          </div>
          <div className="leading-tight">
            <h1 className="text-sm font-semibold">Prompt Builder</h1>
            <p className="text-[11px] text-white/50">
              modalità: {currentModeLabel}
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={reset}
            className="text-xs text-white/50 hover:text-white/90 transition"
          >
            Nuovo
          </button>
        )}
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="mt-8 px-4 animate-fadeIn">
            <div className="text-center mb-6">
              <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-accent2 items-center justify-center text-2xl mb-3 shadow-xl shadow-accent/30">
                ✦
              </div>
              <h2 className="text-lg font-semibold mb-1">Trasforma le tue idee</h2>
              <p className="text-sm text-white/60 max-w-sm mx-auto">
                Scegli una modalità e scrivi un&apos;idea. Ti restituisco un
                prompt potente, pronto per qualsiasi AI.
              </p>
            </div>

            <div className="mt-6">
              <p className="text-xs text-white/40 uppercase tracking-wider mb-2 text-center">
                Prova con · {currentModeLabel}
              </p>
              <div className="grid gap-2">
                {EXAMPLES[mode].map((ex) => (
                  <button
                    key={ex}
                    onClick={() => send(ex)}
                    className="text-left text-sm bg-panel hover:bg-panel2 border border-border rounded-xl px-4 py-3 transition"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex animate-fadeIn ${
              m.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm ${
                m.role === "user"
                  ? "bg-gradient-to-br from-accent to-accent2 text-white rounded-br-md shadow-lg shadow-accent/20"
                  : "bg-panel text-white/90 rounded-bl-md border border-border"
              }`}
            >
              {m.role === "user" ? (
                <p className="whitespace-pre-wrap">{m.content}</p>
              ) : (
                <>
                  {m.mode && (
                    <div className="mb-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-white/40 bg-white/5 border border-white/5 rounded-full px-2 py-0.5">
                      {MODES.find((x) => x.id === m.mode)?.icon}
                      <span>{MODES.find((x) => x.id === m.mode)?.label}</span>
                    </div>
                  )}
                  <div className="md">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {m.content}
                    </ReactMarkdown>
                  </div>
                  <div className="mt-2 pt-2 border-t border-white/5 flex justify-end">
                    <button
                      onClick={() => copyToClipboard(m.id, m.content)}
                      className="text-xs text-white/50 hover:text-white transition flex items-center gap-1.5"
                    >
                      {copiedId === m.id ? (
                        <>
                          <span className="text-green-400">✓</span> Copiato
                        </>
                      ) : (
                        <>📋 Copia prompt</>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start animate-fadeIn">
            <div className="bg-panel border border-border rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-white/60 animate-bounceDot" />
              <span
                className="w-2 h-2 rounded-full bg-white/60 animate-bounceDot"
                style={{ animationDelay: "0.15s" }}
              />
              <span
                className="w-2 h-2 rounded-full bg-white/60 animate-bounceDot"
                style={{ animationDelay: "0.3s" }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div
        className="p-3 border-t border-border bg-bg/80 backdrop-blur-md"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        {/* Mode selector */}
        <div className="flex gap-1.5 mb-2 overflow-x-auto scrollbar-none">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition border ${
                mode === m.id
                  ? "bg-gradient-to-br from-accent to-accent2 text-white border-transparent shadow-md shadow-accent/20"
                  : "bg-panel text-white/60 border-border hover:text-white hover:border-white/20"
              }`}
            >
              <span>{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <div className="flex items-end gap-1.5 bg-panel border border-border rounded-2xl focus-within:border-accent/70 transition p-1.5 min-w-0">
            {/* Niente classe text-sm sulla textarea: su iOS un font < 16px
                provoca l'auto-zoom al focus (e rompe il layout). La
                dimensione è gestita in globals.css: 16px su mobile, 14px
                da >=640px. */}
            <textarea
              ref={taRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder={
                mode === "frontend"
                  ? "Descrivi il componente / la pagina…"
                  : mode === "image"
                    ? "Descrivi l'immagine…"
                    : "Scrivi la tua idea…"
              }
              className="flex-1 min-w-0 resize-none bg-transparent px-2.5 py-2 outline-none placeholder-white/40"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Invia"
              className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-accent2 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition active:scale-95 shadow-lg shadow-accent/20"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 12h14M13 6l6 6-6 6"
                  stroke="white"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </form>
        <p className="text-[10px] text-white/30 text-center mt-2">
          Powered by Groq · gpt-oss-120b · reasoning high
        </p>
      </div>
    </main>
  );
}

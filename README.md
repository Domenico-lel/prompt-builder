<p align="center">
  <img src="./public/logo.png" width="88" height="88" alt="Logo Prompt Builder: fumetto viola con stella rosa" />
</p>

<h1 align="center">Prompt Builder</h1>

<p align="center">Dall’idea a un prompt chiaro, strutturato e riutilizzabile.</p>

Prompt Builder è un’app in italiano per costruire istruzioni da usare con un’AI. Parti da un miniprompt di una o due frasi: l’AI sviluppa i dettagli, fa domande mirate solo quando servono e prepara un prompt completo. Puoi poi modificarlo e perfezionarlo attraverso revisioni successive.

## Cosa puoi fare

- Descrivere brevemente qualsiasi esigenza in un’unica casella, senza compilare un modulo.
- Ricevere direttamente un prompt completo quando l’idea è sufficientemente chiara.
- Rispondere a un massimo di tre domande mirate quando servono informazioni importanti.
- Ottenere istruzioni operative, struttura, formato e criteri di qualità sviluppati dall’AI.
- Modificare il prompt in un editor Markdown e visualizzarne l’anteprima.
- Richiedere revisioni che tengono conto del testo modificato manualmente.
- Copiare, esportare in Markdown e salvare i progetti nella libreria locale.
- Consultare fino a 20 versioni AI per progetto e conservare fino a 20 progetti nel browser.

L’app costruisce prompt: il compito finale viene eseguito nell’AI in cui li utilizzi. I criteri di valutazione sono suggerimenti generati dal modello, non risultati di test eseguiti.

## Avvio sul PC

Prerequisito: Node.js 20 o successivo e una chiave API Groq.

```bash
git clone https://github.com/Domenico-lel/prompt-builder.git
cd prompt-builder
npm ci
```

Copia `.env.local.example` in `.env.local`. Su Windows, da PowerShell:

```powershell
Copy-Item .env.local.example .env.local
notepad .env.local
```

Crea una chiave nella [console Groq](https://console.groq.com/keys) e inseriscila nel file:

```env
GROQ_API_KEY=la_tua_chiave_groq
GROQ_MODEL=openai/gpt-oss-120b
```

Salva e avvia:

```bash
npm run dev
```

Apri [localhost:3000](http://localhost:3000). Dopo una modifica alle variabili d’ambiente, riavvia il server.

## Prova sul cellulare

Collega PC e cellulare alla stessa rete Wi-Fi e avvia:

```bash
npm run dev -- --hostname 0.0.0.0
```

Trova l’indirizzo IPv4 del PC con `ipconfig` e apri sul telefono `http://INDIRIZZO_IP_DEL_PC:3000`. Se Windows chiede accesso alla rete, consenti il server sulla rete privata di casa.

Questo indirizzo è accessibile sulla rete locale; per condividere l’app via Internet serve pubblicarla su un servizio di hosting.

## Come si usa

1. Scrivi in poche parole cosa ti serve e premi **Invia la tua idea**. Per esempio: «Mi serve un prompt per preparare un piano di studio di storia in un mese».
2. L’AI sceglie se generare subito oppure chiederti da uno a tre dettagli importanti. Non devi compilare campi per tono, destinatario e formato prima dell’invio.
3. Se compaiono domande, rispondi liberamente e premi **Crea il prompt completo**. Puoi lasciare in bianco ciò che non sai: solo le informazioni indispensabili mancanti diventano segnaposto.
4. Leggi il prompt nell’anteprima, copialo oppure passa a **Modifica** per intervenire sul testo.
5. Per perfezionarlo, descrivi cosa cambiare e premi **Crea una revisione**.
6. Esporta il prompt in `.md` o premi **Salva in libreria** per ritrovarlo nel browser.

Il salvataggio è manuale e locale al browser: non c’è sincronizzazione tra PC e cellulare. Cancellando i dati del browser puoi perdere i progetti salvati. Il salvataggio conserva brief, versioni AI e testo corrente dell’editor; le risposte ai chiarimenti non sono archiviate separatamente.

Se modifichi il miniprompt, le precedenti domande e risposte vengono azzerate. Se selezioni un’altra versione, il testo nell’editor viene sostituito: salva o esporta prima le modifiche manuali che vuoi conservare.

## Modello AI e consumi

Il provider attuale è **Groq**; il modello predefinito è **GPT-OSS-120B** (`openai/gpt-oss-120b`). `GROQ_MODEL` permette di scegliere un altro modello Groq compatibile con JSON Object Mode. Il livello di ragionamento non è impostato esplicitamente nella richiesta attuale.

L’invio del miniprompt effettua una chiamata al provider, che risponde con domande oppure direttamente con il prompt. La generazione dopo le risposte e ogni revisione effettuano ciascuna un’ulteriore chiamata. Se condividi l’app con una chiave sul server, tutti gli utenti consumano la quota di quell’account Groq. Non sono presenti account utenti, quote individuali o modalità con chiavi personali.

L’app invia a Groq il brief, le risposte ai chiarimenti e, per le revisioni, il prompt corrente con la modifica richiesta. Il builder non esegue ricerche web o codice.

## Chiave API

- La chiave viene letta soltanto dalla route server `app/api/rewrite/route.ts`.
- `.env.local` è escluso da Git: non aggiungerlo al repository.
- Il file `.env.local.example` contiene soltanto un valore dimostrativo.
- Non usare un nome che inizi con `NEXT_PUBLIC_` per una chiave segreta.
- Quando pubblichi l’app, configura `GROQ_API_KEY` nelle variabili d’ambiente del servizio di hosting. La chiave locale non viene trasferita con il push.

## Build e verifica

```bash
npm test
npm run build
npm run start -- --hostname 0.0.0.0
```

I test verificano i contratti di input/output e la route API con un provider simulato: miniprompt con domande oppure generazione diretta, chiarimenti, generazione, revisione, input troppo lungo, configurazione assente, risposte incomplete e rate limit. Non misurano la qualità del modello né verificano l’accesso a un account reale.

Il server valida gli input e le risposte AI, applica un timeout di 45 secondi al provider e limita la richiesta a 6.000 token di output. L’annullamento dal browser interrompe l’attesa del client; una chiamata AI già partita può comunque consumare token.

## Tecnologie

Next.js 14, React 18, TypeScript, Tailwind CSS, Groq SDK, React Markdown e Vercel Web Analytics. Palette originale: viola `#8b5cf6`, rosa `#ec4899` e sfondo scuro `#0a0a10`.

Il logo utilizzato nell’app e in questa pagina è disponibile in [public/logo.png](./public/logo.png); l’icona per dispositivi Apple è in [app/apple-icon.png](./app/apple-icon.png).

## Prossimi sviluppi

- Area di prova per eseguire i prompt su input di esempio e confrontare le versioni.
- Confronto dei modelli su brief italiani, considerando fedeltà all’obiettivo, dettagli inventati, latenza e consumo.
- Variabili riutilizzabili e importazione/esportazione di interi progetti.
- Eventuale sincronizzazione tra dispositivi e gestione degli accessi.

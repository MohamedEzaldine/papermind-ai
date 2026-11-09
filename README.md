# PaperMind AI

**Understand any research paper — deeply, with evidence.**
**افهم أي ورقة بحثية بعمق، وبالدليل الموثّق.**

PaperMind AI is a bilingual (Arabic / English) web app that analyzes one research paper (PDF) at a time from any scientific discipline. It produces a structured, peer-review-style analysis in which every point cites its page, and then automatically checks that evidence against the real text of the PDF.

> Graduation project, AI Ambassadors Program. The first version was generated with Google AI Studio (Build), then extended in this repository.

## Features

- **Landing page** that explains the problem, the features and how the app works.
- **PDF upload** with drag-and-drop (one file, up to 20 MB). Scanned PDFs without selectable text are detected and rejected with a clear message.
- **10-section analysis dashboard**:
  1. Overview
  2. Research problem & gap
  3. Objectives, questions & hypotheses
  4. Contributions
  5. Methodology
  6. Data, tools & models
  7. Results & discussion
  8. Limitations
  9. Critical evaluation (strengths and weaknesses)
  10. Future research
- **Evidence labels** on every point: the page number, plus *Explicit* (stated in the paper) or *Inferred* (AI interpretation), with a supporting quote.
- **Automatic evidence verification**, added in this repository:
  - The server extracts the text of every page and looks for each quote.
  - **Quote verified**: the quote was found on the cited page.
  - **Page corrected**: the quote was found on another page, and the page number was fixed automatically.
  - **Check manually**: the quote was not found word for word in the PDF text.
  - Numbers in *Explicit* points that do not appear anywhere in the paper are flagged, for example swapped or invented counts.
  - A summary bar shows the share of quotes that were verified.
- **Ask the Paper**: a Q&A chat that answers only from the paper, cites pages, and keeps the conversation context.
- **Export**: an Excel workbook (Overview and Analysis sheets, including the evidence-check column) and a print-ready PDF report with correct Arabic RTL.
- **Arabic and English interface** with full RTL support, a dark mode, and a responsive layout.
- **Secure key handling**: the Gemini API key lives only on the server (`server.ts`) and is never sent to the browser.

## Architecture

```
Browser (React + Vite + Tailwind)
   │  PDF as base64
   ▼
Express server (server.ts)
   ├─ unpdf: extract the text of each page  ──┐
   ├─ Gemini: structured JSON analysis        │
   └─ server/evidence.ts: verify quotes, pages and numbers ◄┘
```

| Path | Purpose |
|---|---|
| `server.ts` | API routes `/api/analyze` and `/api/chat`; also serves the built frontend |
| `server/evidence.ts` | Evidence verification: page text extraction, quote matching, number checks |
| `server/evidence.test.ts` | Tests for the verifier |
| `src/components/` | Landing, Upload, Dashboard, Ask-the-Paper drawer, Header |
| `src/utils/` | Excel export and evidence labels |
| `src/locales/translations.ts` | Arabic and English UI text |

## AI engines

PaperMind AI can run with either of two engines:

| Engine | When | Needs |
|---|---|---|
| **Ollama (local)** | Default when no Gemini key is set | [Ollama](https://ollama.com) running on the same computer, with the model pulled (`ollama pull qwen2.5:7b`). No key, no cloud, and the paper never leaves the device. |
| **Gemini (cloud)** | When `GEMINI_API_KEY` is set, or `AI_PROVIDER=gemini` | A free key from <https://aistudio.google.com/apikey> |

With Ollama, the server sends the model the paper's extracted text with `[Page N]` markers, so page citations and evidence verification work the same way. The upload page shows which engine is active and whether it is ready.

## Run locally

Requirements: Node.js 20 or newer, plus Ollama with a model, or a Gemini key.

```bash
npm install
cp .env.example .env      # optional: choose the engine/model
npm run dev               # http://localhost:3000
```

Production build:

```bash
npm run build
npm start
```

Tests for the evidence verifier (they use the small sample PDF in `server/fixtures/`):

```bash
npm test
```

## Windows desktop app (installer)

`PaperMind-AI-Setup.exe` installs PaperMind AI as a desktop program that runs **fully offline** on the local Ollama engine:

1. It installs the app and creates Desktop and Start Menu shortcuts.
2. If Ollama is not installed, it downloads and installs it silently.
3. It checks the computer's RAM and graphics card and downloads the model that suits it, with progress shown inside the installer window.

| Mode | Model | Size | Chosen automatically when |
|---|---|---|---|
| Fast | `qwen2.5:1.5b` | 1 GB | less than 8 GB RAM |
| Balanced | `qwen2.5:3b` | 1.9 GB | 8 GB RAM or more, no suitable graphics card |
| Accurate | `qwen2.5:7b` | 4.7 GB | NVIDIA GPU with 6 GB+ and 12 GB+ RAM |

Users can switch modes on the upload page. A mode that is not installed yet can be downloaded from inside the app, with a progress bar. During an analysis the app shows the real percentage, the section being written, and the estimated time left.

When the app starts, it launches Ollama if needed and opens PaperMind AI in its own window. The server listens only on `127.0.0.1`, so papers never leave the computer.

**Get the installer:** GitHub Actions builds it on Windows for every push to `main`. Open the repository's **Actions** tab, select the latest *Build Windows installer* run, and download `PaperMind-AI-Setup` under **Artifacts**. Pushing a tag such as `v1.0.0` also attaches the installer to a GitHub Release.

Build it yourself on Windows with `npm ci`, then `npm run dist:win`. The output goes to `release/`. To try the desktop app without installing it, run `npm run desktop`.

Requirements: 4 GB of RAM or more and 3 to 6 GB of free disk space, depending on the mode. A graphics card makes analysis much faster but is not required.

## Deploy (free) on Render

1. Sign in at <https://render.com> with GitHub.
2. Choose **New → Blueprint** and select this repository. Render reads `render.yaml`.
3. When asked, paste your `GEMINI_API_KEY`. It is stored privately in Render.
4. Wait for the build. Your public link looks like `https://papermind-ai.onrender.com`.

On Render's free plan the app sleeps after a period of inactivity, so the first visit after that can take about a minute to load.

## Limitations

- Evidence verification matches the PDF's text layer. Quotes taken from tables, figures or equations may show **Check manually** even when they are correct.
- One paper is analyzed at a time, and analysis quality depends on the Gemini model.
- The analysis supports reading; it does not replace reading the paper.

# PACE/CHECK

PACE/CHECK is a HYROX training log and weekly review companion. It keeps session history on the device, computes a transparent training index, and offers an optional read-only AI review of recent workout and recovery patterns.

The overview uses muted, looping Pexels training footage as a visual backdrop. It is gym training footage, not footage from a HYROX event. The clip is licensed by [Pexels](https://www.pexels.com/license/); users who prefer reduced motion see the static dark fallback instead.

The official [HYROX race finder](https://hyrox.com/find-my-race/) lists **Sweatpals HYROX Miami Beach for March 26–28, 2027**. PACE/CHECK counts down to the event-weekend start (March 26); athletes can change the event name or countdown date in **Setup** if their registered race day differs. The 1:45 goal is context only: the app does not predict a finish time.

Overview focuses on the signed-up event countdown, this week's workout count, calories, workout types, one readiness bar, the training video, and a short upcoming-race list. Calorie totals include only values entered from a tracker or manually by the athlete; the app never fabricates calories when data is missing. The optional calorie field appears on every session. The upcoming-race list is a snapshot checked October 22, 2026 and links to the live [official calendar](https://hyrox.com/find-my-race/).

## Run locally

Requirements: Node.js 20.19+ and Python 3.11+.

From the `Homework 6` folder, open two PowerShell terminals.

Frontend:

```powershell
npm install
npm run dev
```

Backend:

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -r backend\requirements.txt
Copy-Item .env.example .env
Set-Location backend
..\.venv\Scripts\python -m uvicorn main:app --reload --port 8000
```

The dashboard works without a model key. Logging and the readiness index are local; the AI weekly coach requires a key in `Homework 6/.env`. Add either `PORTKEY_API_KEY` (uses `gpt-6-luna`) or your own `OPENAI_API_KEY` (defaults to `gpt-4o-mini`). Never commit `.env` or a real key. The AI coach responds with a clear setup error when no key is configured.

Open the Vite URL printed in the frontend terminal, normally `http://localhost:5173`.

## How the index works

The displayed 0–100 index uses the previous 28 days of entries:

| Input | Weight | Current simple scale |
| --- | ---: | --- |
| Run volume | 25% | Logged run and simulation minutes, capped at 240 minutes |
| Station coverage | 25% | Distinct HYROX station types logged, out of eight |
| Race-specific work | 20% | One race simulation contributes 35 points, capped at 100 |
| Consistency | 15% | Distinct training days, capped at 12 days |
| Recovery check-ins | 15% | Average sleep, self-rated energy, and soreness; missing check-ins use a neutral placeholder |

These are transparent project heuristics, not validated sports-science thresholds. The index describes logged training signals, not actual readiness, injury risk, health, or likely race performance. Missing logs can make a factor look low. The Progress view explains the limitation, and the dashboard compares periods only when earlier entries exist.

The app opens directly on the workout picker with a blank log. Sample entries are only loaded when explicitly restored from Race setup. The numeric index stays hidden until at least three sessions are logged in the current 28-day window. Workout effort uses plain-language choices instead of requiring an RPE scale.

## HYROX Pulse

Pulse is one continuous stream: recent public Reddit results followed by live public-search links for X, Instagram, YouTube, and HYROX official. Reddit results come from its public search Atom feed through FastAPI. X and Instagram are not scraped or copied because their APIs require app registration and permissions. All content links to its original source.

The app now opens directly on the workout picker. Athletes can select one or several of the eight stations; selections are saved as the session focus, count toward station coverage, appear in the training history, and are included in coach reviews. Runs, strength sessions, and other workouts remain available from the alternate logging action.

## Weekly rhythm and check-ins

Race setup lets athletes choose a goal (finish feeling good, build consistency, or target a time), a realistic weekly session target, and preferred training days. When the app is open on a selected day with no logged workout, it offers Done, Move to tomorrow, Rest today, or Skip. A rescheduled date is stored locally and clears when a session is logged for that day. These are in-app check-ins only; the current project does not send background or push notifications.

## AI and safety

- The LLM never computes or changes the readiness score; that calculation is local and deterministic.
- The coach has two read-only tools that summarize submitted training and check-in data. It cannot create, edit, or delete records.
- Each request is limited to four model requests, two tool calls, and 450 output tokens, with no agent retries.
- Request lengths and log counts are validated by Pydantic. The API only enables local development origins by default.
- The prompt treats questions and log values as untrusted input, avoids diagnosis and medical readiness claims, and directs concerning symptoms to qualified care. Prompt instructions are not a substitute for clinical review.
- The frontend sends at most 40 sessions and 14 check-ins to the coach. It does not store the API key in the browser.
- Training entries are kept in this browser's local storage. They are not encrypted or synced, so do not use a shared device for sensitive notes.

## Checks

```powershell
npm run build
npm run lint
..\.venv\Scripts\python -m unittest discover -s backend -p "test_*.py"
```

## Final project submission

- [HTML report](output/report.html): 12 letter-size pages with screenshots, methodology, agent design, cost assumptions, safety, evaluation, and roadmap. Open in a browser and use Print → Save as PDF if a PDF copy is needed.
- [HTML slide deck](output/slides.html): 10 Reveal.js slides, with navigation controls and screenshots. Open through the running Vite server at `http://localhost:5173/output/slides.html`.
- `output/screenshots/`: UI evidence captured from the running app.

The deck uses a consulting-style executive narrative but labels hypotheses, assumptions, and unmeasured impact explicitly. It is not an investment recommendation or a claim of validated race-performance improvement.

## Project files

- `src/Dashboard.tsx`: local logging, index calculation, and dashboard views.
- `backend/main.py`: validated FastAPI health and coach routes.
- `backend/agent.py`: bounded PydanticAI agent and read-only summary tools.
- `backend/prompts/prompt.md`: coach behavior and safety boundary.
- `backend/test_main.py`: endpoint validation and missing-key tests.

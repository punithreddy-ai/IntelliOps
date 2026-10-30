# IntelliOps — AI Infrastructure Incident Analyzer

A focused full-stack prototype for an interview demonstration. An operator submits one incident report; a FastAPI backend sends it to a Groq-hosted LLM; the application displays a severity assessment, explanation, and recommended next steps. Analyses are saved in SQLite.

## Requirements
- Python 3.10+
- Node.js 18+
- A Groq API key

## 1. Configure the backend

Open a terminal in `backend`:

```bash
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# Windows CMD:
.venv\Scripts\activate.bat
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
```

Copy `.env.example` to `.env`, then add your own API key:

```env
GROQ_API_KEY=your_actual_key
GROQ_MODEL=llama-3.3-70b-versatile
```

Never commit `.env` or share your API key.

Start the API:

```bash
uvicorn main:app --reload
```

API docs: http://127.0.0.1:8000/docs

## 2. Start the frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite, usually http://localhost:5173.

## 3. Demo flow

1. Keep the prefilled sample incident, or enter your own.
2. Click **Analyse with AI**.
3. The frontend sends JSON to `POST /api/incidents/analyze`.
4. FastAPI validates the input and calls the Groq LLM.
5. The result appears in the assessment panel and is stored in SQLite.
6. Refreshing the page retains the recent incident history.

## Interview explanation

"IntelliOps is a full-stack AI incident-triage prototype. React provides the operator dashboard, FastAPI exposes REST endpoints, Groq provides LLM inference, and SQLite stores the analysis history. An operator submits an incident description; the backend asks the model for a structured severity assessment, concise analysis and recommended next steps. I designed it as decision support, so a human operator verifies the output and follows approved site procedures."

## Scope and safety

This is a demonstration prototype, not a certified safety system. The LLM output is not a verified diagnosis or hazard measurement. Do not connect this prototype to alarms, access controls, machinery, emergency shutoffs, or other physical systems. Real deployments need validated sensors and thresholds, human-approved procedures, security controls, monitoring, testing and domain review.

## Troubleshooting

- **503 / GROQ_API_KEY is missing:** create `backend/.env` from `.env.example` and restart FastAPI.
- **401 from Groq:** check that the API key is valid.
- **Model not found / unavailable:** set `GROQ_MODEL` to a model currently available to your Groq account.
- **Failed to fetch:** make sure FastAPI is running on port 8000 and Vite on port 5173.
- **AI response parse error:** retry once; model output must conform to the requested JSON structure.

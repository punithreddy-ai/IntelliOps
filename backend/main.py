import json
import os
import sqlite3
from datetime import datetime, timezone
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from pydantic import BaseModel, Field

load_dotenv()

DB_PATH = os.getenv("DB_PATH", "intelliops.db")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

app = FastAPI(title="IntelliOps API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


class IncidentInput(BaseModel):
    location: str = Field(min_length=2, max_length=120)
    incident_type: str = Field(min_length=2, max_length=80)
    description: str = Field(min_length=10, max_length=3000)
    sensor_reading: str | None = Field(default=None, max_length=100)


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS incidents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT NOT NULL,
                location TEXT NOT NULL,
                incident_type TEXT NOT NULL,
                description TEXT NOT NULL,
                sensor_reading TEXT,
                severity TEXT NOT NULL,
                analysis TEXT NOT NULL,
                recommendations TEXT NOT NULL
            )
        """)


init_db()


@app.get("/")
def health():
    return {"status": "ok", "service": "IntelliOps API"}


def extract_json(content: str) -> dict:
    content = content.strip()
    if content.startswith("```"):
        content = content.split("\n", 1)[-1]
        if content.endswith("```"):
            content = content[:-3]
    start, end = content.find("{"), content.rfind("}")
    if start < 0 or end < start:
        raise ValueError("The AI response did not contain JSON.")
    return json.loads(content[start:end + 1])


@app.post("/api/incidents/analyze")
def analyze_incident(payload: IncidentInput):
    if not GROQ_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="GROQ_API_KEY is missing. Add it to backend/.env and restart the API."
        )

    client = Groq(api_key=GROQ_API_KEY)

    prompt = f"""
You are an incident-triage assistant for a facilities operations team.
Analyse the reported event using only the information supplied.
Do not claim that a sensor reading proves a hazard unless the provided
context establishes that. Do not issue equipment-control commands.
Give cautious, practical recommendations and advise contacting trained
site personnel or emergency services when the description suggests
immediate danger.

Return ONLY valid JSON with exactly these keys:
{{
  "severity": "LOW" | "MEDIUM" | "CRITICAL",
  "analysis": "A concise explanation in 1-3 sentences.",
  "recommendations": ["3-5 clear next steps"]
}}

Incident type: {payload.incident_type}
Location: {payload.location}
Description: {payload.description}
Sensor reading (if supplied): {payload.sensor_reading or "Not provided"}
"""

    try:
        completion = client.chat.completions.create(
            model=GROQ_MODEL,
            temperature=0.2,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": "Return valid JSON only."},
                {"role": "user", "content": prompt},
            ],
        )
        result = extract_json(completion.choices[0].message.content or "")
        severity = str(result.get("severity", "MEDIUM")).upper()
        if severity not in {"LOW", "MEDIUM", "CRITICAL"}:
            severity = "MEDIUM"
        analysis = str(result.get("analysis", "No analysis returned."))[:1500]
        recommendations = result.get("recommendations", [])
        if not isinstance(recommendations, list):
            recommendations = [str(recommendations)]
        recommendations = [str(item)[:400] for item in recommendations[:5]]

        created_at = datetime.now(timezone.utc).isoformat()
        with get_db() as conn:
            cursor = conn.execute(
                """INSERT INTO incidents
                (created_at, location, incident_type, description,
                 sensor_reading, severity, analysis, recommendations)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    created_at, payload.location, payload.incident_type,
                    payload.description, payload.sensor_reading, severity,
                    analysis, json.dumps(recommendations),
                ),
            )
            incident_id = cursor.lastrowid

        return {
            "id": incident_id,
            "created_at": created_at,
            "location": payload.location,
            "incident_type": payload.incident_type,
            "severity": severity,
            "analysis": analysis,
            "recommendations": recommendations,
        }

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI analysis failed: {str(exc)}")


@app.get("/api/incidents")
def list_incidents():
    with get_db() as conn:
        rows = conn.execute(
            """SELECT id, created_at, location, incident_type, severity,
                      analysis, recommendations
               FROM incidents ORDER BY id DESC LIMIT 20"""
        ).fetchall()
    return [
        {
            **dict(row),
            "recommendations": json.loads(row["recommendations"]),
        }
        for row in rows
    ]

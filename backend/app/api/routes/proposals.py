import json
import logging
import os
import re
from typing import List, Optional

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

try:  # pragma: no cover - optional dependency
    from openai import OpenAI
except ImportError:  # pragma: no cover - gracefully handle missing package
    OpenAI = None  # type: ignore[assignment]

router = APIRouter(prefix="/proposals", tags=["proposals"])

logger = logging.getLogger(__name__)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_CHAT_MODEL = os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini")


class DraftAnalysis(BaseModel):
    section: str = Field(..., description="Proposal section identifier")
    summary: str = Field(..., description="Auto-generated summary or findings")
    recommendations: List[str] = Field(
        default_factory=list,
        description="Actionable recommendations derived from the draft content",
    )
    score: int = Field(
        0,
        ge=0,
        le=100,
        description="Section competitiveness score between 0 and 100",
    )


class ProposalPayload(BaseModel):
    project_title: str
    organization_name: str
    submission_date: Optional[str] = None
    executive_summary: Optional[str] = None
    community_background: Optional[str] = None
    problem_description: Optional[str] = None
    objectives: List[str] = Field(default_factory=list)
    milestones: List[str] = Field(default_factory=list)
    requested_amount: Optional[str] = None
    risks: Optional[str] = None


class ProposalResponse(BaseModel):
    message: str
    proposal_id: str


@router.post("/analyze", response_model=List[DraftAnalysis])
async def analyze_draft(file: UploadFile = File(...)) -> List[DraftAnalysis]:
    """Analyze an uploaded proposal draft and return section-level scoring."""

    content = await file.read()

    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    extracted_text = _extract_text(content)
    if not extracted_text.strip():
        raise HTTPException(
            status_code=400,
            detail="Uploaded file does not contain readable text for analysis.",
        )

    if OPENAI_API_KEY and OpenAI is not None:
        try:
            return await _analyze_with_openai(extracted_text)
        except HTTPException:
            raise
        except Exception as exc:  # pragma: no cover - defensive logging
            logger.warning("OpenAI analysis failed, falling back to heuristic scoring: %s", exc)

    return _fallback_analysis(extracted_text)


def _get_openai_client() -> OpenAI:
    if not OPENAI_API_KEY or OpenAI is None:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured.")
    return OpenAI(api_key=OPENAI_API_KEY)


async def _analyze_with_openai(text: str) -> List[DraftAnalysis]:
    client = _get_openai_client()

    condensed_text = text if len(text) <= 15000 else text[:15000]

    system_prompt = (
        "You are an expert grant reviewer. Assess the provided proposal text and "
        "score each major section between 0 and 100. Return JSON with a `sections` "
        "array. Each element must include `section`, `summary`, `recommendations` "
        "(array of strings), and `score` (integer)."
    )

    def _run_completion():
        return client.chat.completions.create(
            model=OPENAI_CHAT_MODEL,
            temperature=0.2,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": "Analyze the following proposal and respond with JSON only.\n\n" + condensed_text,
                },
            ],
        )

    completion = await run_in_threadpool(_run_completion)

    try:
        payload = completion.choices[0].message.content or "{}"
    except (AttributeError, IndexError) as exc:  # pragma: no cover - defensive guard
        raise ValueError("Unexpected response from analysis model.") from exc

    try:
        data = json.loads(payload)
    except json.JSONDecodeError as exc:  # pragma: no cover - propagate parse failure
        raise ValueError("Unable to parse AI analysis response.") from exc

    sections = data.get("sections")
    if not isinstance(sections, list):
        raise ValueError("AI analysis response missing sections array.")

    results: List[DraftAnalysis] = []
    for section in sections:
        if not isinstance(section, dict):
            continue
        name = str(section.get("section") or section.get("name") or "Unknown Section")
        summary = str(section.get("summary") or "")
        recommendations = section.get("recommendations") or []
        if not isinstance(recommendations, list):
            recommendations = [str(recommendations)]

        score_raw = section.get("score")
        try:
            score = int(float(score_raw))
        except (TypeError, ValueError):
            score = 0

        score = max(0, min(100, score))

        results.append(
            DraftAnalysis(
                section=name,
                summary=summary,
                recommendations=[str(rec) for rec in recommendations if str(rec).strip()],
                score=score,
            )
        )

    if not results:
        raise ValueError("AI analysis did not return any sections.")

    return results


def _extract_text(content: bytes) -> str:
    """Attempt to decode uploaded content into text."""

    for encoding in ("utf-8", "utf-16", "latin-1"):
        try:
            decoded = content.decode(encoding)
            return re.sub(r"\s+", " ", decoded)
        except UnicodeDecodeError:
            continue
    return ""


def _fallback_analysis(text: str) -> List[DraftAnalysis]:
    """Provide a deterministic heuristic analysis when AI is unavailable."""

    lower_text = text.lower()
    word_count = max(len(text.split()), 1)

    section_keywords = {
        "Executive Summary": ["executive", "summary", "overview"],
        "Community Context": ["community", "population", "needs", "demographic"],
        "Problem Statement": ["problem", "challenge", "issue"],
        "Project Description": ["project", "activities", "implementation"],
        "Budget": ["budget", "cost", "funding"],
        "Outcomes": ["outcome", "impact", "result"],
        "Risk Management": ["risk", "mitigation", "contingency"],
    }

    results: List[DraftAnalysis] = []
    for name, keywords in section_keywords.items():
        matches = sum(1 for keyword in keywords if keyword in lower_text)
        coverage_bonus = min(30, int(word_count / 200))
        score = 40 + matches * 12 + coverage_bonus
        score = max(30, min(92, score))

        if matches == 0:
            summary = f"{name} section appears to be missing or very light in detail."
            recommendations = [
                f"Add a dedicated section for {name.lower()} with clear specifics and quantifiable details.",
            ]
        else:
            summary = f"{name} content detected with {matches} key signal{'s' if matches == 1 else 's'}."
            recommendations = []
            if score < 75:
                recommendations.append(
                    f"Strengthen the {name.lower()} section with more evidence and funder-aligned language."
                )

        results.append(
            DraftAnalysis(
                section=name,
                summary=summary,
                recommendations=recommendations,
                score=score,
            )
        )

    return results


@router.post("", response_model=ProposalResponse, status_code=201)
async def create_proposal(payload: ProposalPayload) -> ProposalResponse:
    """
    Accept a structured proposal payload and return a mock identifier.

    Hook this into persistence once a database layer is decided.
    """
    proposal_id = f"proposal-{payload.project_title.lower().replace(' ', '-')}"
    return ProposalResponse(
        message="Proposal accepted for processing.",
        proposal_id=proposal_id,
    )

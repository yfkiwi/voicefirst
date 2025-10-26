from typing import List, Optional

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

router = APIRouter(prefix="/proposals", tags=["proposals"])


class DraftAnalysis(BaseModel):
    section: str = Field(..., description="Proposal section identifier")
    summary: str = Field(..., description="Auto-generated summary or findings")
    recommendations: List[str] = Field(
        default_factory=list,
        description="Actionable recommendations derived from the draft content",
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
    """
    Placeholder endpoint that demonstrates how a document upload would be handled.

    Replace the mock implementation with calls into your LLM, embedding service,
    or other domain-specific analysis once those pieces are available.
    """
    content = await file.read()

    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    filename = file.filename or "uploaded draft"
    size_kb = len(content) / 1024

    return [
        DraftAnalysis(
            section="executive_summary",
            summary=f"Received {filename} ({size_kb:.1f} KB). Analysis pipeline not implemented yet.",
            recommendations=[
                "Integrate this endpoint with your AI analysis workflow.",
                "Persist uploaded drafts or pass them into your processing pipeline.",
            ],
        )
    ]


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

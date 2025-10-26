from fastapi import APIRouter

from . import proposals

router = APIRouter()
router.include_router(proposals.router)

__all__ = ["router"]

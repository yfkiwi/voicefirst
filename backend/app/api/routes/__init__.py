from fastapi import APIRouter

from . import proposals, assist

router = APIRouter()
router.include_router(proposals.router)
router.include_router(assist.router)

__all__ = ["router"]

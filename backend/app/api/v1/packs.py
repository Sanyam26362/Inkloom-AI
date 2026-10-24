import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import CurrentUser, get_current_user
from app.schemas.pack import PackSummary, PackLoadRequest, PackLoadResponse
from app.services.pack_service import PackService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/packs", tags=["Premade Packs"])


@router.get("", response_model=List[PackSummary])
async def list_packs(
    user: CurrentUser = Depends(get_current_user),
) -> List[PackSummary]:
    """Lists all available premade governance packs."""
    return PackService.list_packs()


@router.post("/{name}/load", response_model=PackLoadResponse, status_code=status.HTTP_200_OK)
async def load_pack(
    name: str,
    payload: Optional[PackLoadRequest] = None,
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> PackLoadResponse:
    """
    Idempotently loads a premade pack:
    - Indexes ALL pack documents without truncation or caps.
    - Creates or updates the associated Campaign.
    - Triggers RuleSet extraction and syncs deterministic fields to BrandProfile.
    """
    try:
        target_brand_id = payload.brand_id if payload else None
        response = await PackService.load_pack(
            pack_name=name, brand_id=target_brand_id, session=session
        )
        return response
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to load pack '{name}': {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load pack '{name}': {str(e)}",
        )

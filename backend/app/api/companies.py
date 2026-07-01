"""Company API routes."""

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.authorization import ROLE_ADMIN, require_role
from app.auth.dependencies import require_authenticated_user
from app.auth.models import AuthUser
from app.models.companies import CompanyCreate, CompanyResponse, CompanyUpdate
from app.repositories.companies_postgres_repository import CompanyPostgresRepository
from app.services.companies_service import CompanyService

router = APIRouter(prefix="/api/companies", tags=["companies"])

_repository = CompanyPostgresRepository()
_service = CompanyService(repository=_repository)


def get_service() -> CompanyService:
    return _service


@router.get("", response_model=list[CompanyResponse])
def list_companies(
    _user: AuthUser = Depends(require_authenticated_user),
    service: CompanyService = Depends(get_service),
):
    return service.list_companies()


@router.post("", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
def create_company(
    payload: CompanyCreate,
    _user: AuthUser = Depends(require_role(ROLE_ADMIN)),
    service: CompanyService = Depends(get_service),
):
    return service.create_company(payload)


@router.get("/{entity_id}", response_model=CompanyResponse)
def get_company(
    entity_id: str,
    _user: AuthUser = Depends(require_authenticated_user),
    service: CompanyService = Depends(get_service),
):
    entity = service.get_company(entity_id)
    if entity is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Company '{entity_id}' not found.")
    return entity


@router.put("/{entity_id}", response_model=CompanyResponse)
def update_company(
    entity_id: str,
    payload: CompanyUpdate,
    _user: AuthUser = Depends(require_role(ROLE_ADMIN)),
    service: CompanyService = Depends(get_service),
):
    entity = service.update_company(entity_id, payload)
    if entity is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Company '{entity_id}' not found.")
    return entity


@router.delete("/{entity_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_company(
    entity_id: str,
    _user: AuthUser = Depends(require_role(ROLE_ADMIN)),
    service: CompanyService = Depends(get_service),
):
    if not service.delete_company(entity_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Company '{entity_id}' not found.")

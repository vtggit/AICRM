"""Business logic for companies."""

from app.models.companies import CompanyCreate, CompanyUpdate
from app.repositories.companies_postgres_repository import CompanyPostgresRepository


class CompanyService:
    """Service layer for companies."""

    def __init__(self, repository: CompanyPostgresRepository):
        self.repository = repository

    def list_companies(self) -> list[dict]:
        return self.repository.list_all()

    def get_company(self, entity_id: str) -> dict | None:
        return self.repository.get_by_id(entity_id)

    def create_company(self, payload: CompanyCreate) -> dict:
        return self.repository.create(payload.model_dump())

    def update_company(self, entity_id: str, payload: CompanyUpdate) -> dict | None:
        return self.repository.update(entity_id, payload.model_dump(exclude_unset=True))

    def delete_company(self, entity_id: str) -> bool:
        return self.repository.delete(entity_id)

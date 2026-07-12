"""Business logic for companies."""

from app.auth.models import AuthUser
from app.db.connection import transaction_scope
from app.models.audit import AuditEvent
from app.models.companies import CompanyCreate, CompanyUpdate
from app.repositories.companies_postgres_repository import CompanyPostgresRepository
from app.services.audit_service import AuditService


class CompanyService:
    """Service layer for companies."""

    def __init__(
        self,
        repository: CompanyPostgresRepository,
        audit_service: AuditService,
    ):
        self.repository = repository
        self.audit_service = audit_service

    def list_companies(
        self,
        limit: int | None = None,
        offset: int | None = None,
        include_deleted: bool = False,
    ) -> list[dict]:
        return self.repository.list_all(
            limit=limit, offset=offset, include_deleted=include_deleted
        )

    def get_company(self, entity_id: str) -> dict | None:
        return self.repository.get_by_id(entity_id)

    def create_company(self, payload: CompanyCreate, actor: AuthUser) -> dict:
        data = payload.model_dump()
        with (
            transaction_scope()
        ):  # the company and its audit event persist or vanish together
            company = self.repository.create(data)

            self.audit_service.write(
                AuditEvent(
                    entity_type="company",
                    entity_id=company["id"],
                    action="created",
                    actor_sub=actor.sub,
                    actor_username=actor.username,
                    actor_email=actor.email,
                    actor_roles=actor.roles,
                    details={
                        "name": company["name"],
                        "website": company.get("website"),
                        "industry": company.get("industry"),
                    },
                )
            )

        return company

    def update_company(
        self,
        entity_id: str,
        payload: CompanyUpdate,
        actor: AuthUser,
    ) -> dict | None:
        data = payload.model_dump(exclude_unset=True)
        with (
            transaction_scope()
        ):  # the update and its audit event persist or vanish together
            result = self.repository.update(entity_id, data)
            if result is None:
                return None

            changed_fields = [
                k
                for k in data
                if k in ("name", "website", "industry", "employee_count")
            ]

            self.audit_service.write(
                AuditEvent(
                    entity_type="company",
                    entity_id=entity_id,
                    action="updated",
                    actor_sub=actor.sub,
                    actor_username=actor.username,
                    actor_email=actor.email,
                    actor_roles=actor.roles,
                    details={
                        "changed_fields": changed_fields,
                    },
                )
            )

        return result

    def delete_company(self, entity_id: str, actor: AuthUser) -> bool:
        with (
            transaction_scope()
        ):  # the delete and its audit event persist or vanish together
            existing = self.repository.get_by_id(entity_id)
            deleted = self.repository.delete(entity_id)
            if not deleted:
                return False

            self.audit_service.write(
                AuditEvent(
                    entity_type="company",
                    entity_id=entity_id,
                    action="deleted",
                    actor_sub=actor.sub,
                    actor_username=actor.username,
                    actor_email=actor.email,
                    actor_roles=actor.roles,
                    details={
                        "name": existing.get("name") if existing else None,
                        # companies soft-delete: the row survives as a tombstone — an
                        # auditor can tell this "deleted" did not remove data
                        "soft": True,
                    },
                )
            )

        return True

"""Analytics API routes for lead conversion funnel and pipeline metrics."""

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends

from app.auth.authorization import ROLE_ADMIN
from app.auth.dependencies import require_authenticated_user
from app.auth.models import AuthUser
from app.repositories.leads_postgres_repository import LeadsPostgresRepository

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

_repository = LeadsPostgresRepository()

# Ordered funnel stages (top → bottom)
FUNNEL_STAGES = ["new", "contacted", "qualified", "proposal", "won"]
# Terminal stages (leads that have exited the funnel)
TERMINAL_STAGES = {"won", "lost"}


def _parse_ts(val: str | None) -> datetime | None:
    """Parse an ISO timestamp string into a datetime, tolerant of Z suffix."""
    if not val:
        return None
    try:
        return datetime.fromisoformat(val.replace("Z", "+00:00"))
    except Exception:
        return None


def _compute_avg_days(lead: dict, prev_stage: str | None) -> float | None:
    """Estimate days spent in *prev_stage* for a single lead.

    We approximate by using created_at → updated_at for leads that have
    moved beyond prev_stage (i.e., their current stage is later in the
    funnel or they are terminal).  For leads still in prev_stage we use
    created_at → now.
    """
    created = _parse_ts(lead.get("created_at"))
    updated = _parse_ts(lead.get("updated_at"))
    now = datetime.now(timezone.utc)

    if not created:
        return None

    # For leads currently in prev_stage, measure from creation to now
    if lead.get("stage") == prev_stage:
        delta = now - created
    else:
        # Lead has moved on — use updated_at as the exit point
        if not updated or updated <= created:
            return None
        delta = updated - created

    return delta.total_seconds() / 86400


@router.get("/funnel")
def get_funnel_analytics(
    _user: AuthUser = Depends(require_authenticated_user),
):
    """Return lead conversion funnel analytics.

    The funnel shows how leads flow through each stage, with conversion
    rates, drop-off counts, and average time spent per stage.
    """
    leads = _repository.list_all()
    lead_dicts = [lead.model_dump() if hasattr(lead, "model_dump") else lead for lead in leads]

    total_leads = len(lead_dicts)
    now = datetime.now(timezone.utc)

    # Count leads per stage and sum values
    stage_counts: dict[str, int] = {}
    stage_values: dict[str, float] = {}
    for stage in FUNNEL_STAGES:
        stage_leads = [l for l in lead_dicts if l.get("stage") == stage]
        stage_counts[stage] = len(stage_leads)
        stage_values[stage] = sum(l.get("value") or 0 for l in stage_leads)

    # Count terminal "lost" leads
    lost_count = sum(1 for l in lead_dicts if l.get("stage") == "lost")

    # Build funnel steps with conversion metrics
    funnel_steps: list[dict[str, Any]] = []
    cumulative = total_leads  # Total leads entering the funnel

    for i, stage in enumerate(FUNNEL_STAGES):
        count = stage_counts[stage]
        value = stage_values[stage]

        # Conversion rate from previous stage
        if i == 0:
            prev_count = total_leads
        else:
            prev_count = stage_counts[FUNNEL_STAGES[i - 1]]

        conversion_rate = (count / prev_count * 100) if prev_count > 0 else 0.0

        # Drop-off: leads that were in previous stage but didn't reach this one
        drop_off = prev_count - count if i > 0 else 0
        drop_off_rate = (drop_off / prev_count * 100) if prev_count > 0 else 0.0

        # Average days in this stage
        stage_lead_list = [l for l in lead_dicts if l.get("stage") == stage]
        days_list: list[float] = []
        for l in stage_lead_list:
            d = _compute_avg_days(l, stage)
            if d is not None and d >= 0:
                days_list.append(d)
        avg_days = sum(days_list) / len(days_list) if days_list else None

        # Percentage of total pipeline value
        total_value = sum(stage_values.values())
        value_pct = (value / total_value * 100) if total_value > 0 else 0.0

        funnel_steps.append(
            {
                "stage": stage,
                "label": stage.capitalize(),
                "count": count,
                "value": round(value, 2),
                "conversion_rate": round(conversion_rate, 1),
                "drop_off": drop_off,
                "drop_off_rate": round(drop_off_rate, 1),
                "avg_days_in_stage": round(avg_days, 1) if avg_days is not None else None,
                "value_percentage": round(value_pct, 1),
                "of_total": round(count / total_leads * 100, 1) if total_leads > 0 else 0.0,
            }
        )

    # Overall metrics
    won_count = stage_counts.get("won", 0)
    overall_conversion = (won_count / total_leads * 100) if total_leads > 0 else 0.0
    total_pipeline_value = sum(stage_values.values())
    won_value = stage_values.get("won", 0)

    return {
        "total_leads": total_leads,
        "lost_leads": lost_count,
        "won_leads": won_count,
        "overall_conversion_rate": round(overall_conversion, 1),
        "total_pipeline_value": round(total_pipeline_value, 2),
        "won_value": round(won_value, 2),
        "funnel_steps": funnel_steps,
        "generated_at": now.isoformat(),
    }

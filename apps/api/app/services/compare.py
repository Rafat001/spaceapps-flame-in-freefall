from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.labels import NOT_REPORTED, label
from app.models import Investigation
from app.services.serialize import conditions_summary, materials


def compare(session: Session, ids: list[str]) -> dict:
    invs = {i.id: i for i in session.scalars(select(Investigation).where(Investigation.id.in_(ids))
                                              .options(selectinload(Investigation.test_runs),
                                                       selectinload(Investigation.documents))).all()}
    missing = [i for i in ids if i not in invs]
    ordered = [invs[i] for i in ids if i in invs]
    cols = []
    for inv in ordered:
        c = conditions_summary(inv)
        cols.append({
            "id": inv.id, "acronym": inv.acronym, "title": inv.title, "source_url": inv.source_url,
            "fields": {
                "family": {"value": inv.family, "label": label("rule_tag")},
                "objective": {"value": inv.objective or NOT_REPORTED, "label": label("psi_metadata")},
                "fuel_class": {"value": inv.fuel_class, "label": label("challenge_brief"), "basis": inv.fuel_class_basis},
                "materials": {"value": materials(inv) or [NOT_REPORTED], "label": label("psi_experimental_table")},
                "hardware": {"value": inv.hardware or NOT_REPORTED, "label": label("psi_metadata")},
                "platform": {"value": inv.flight_platform or NOT_REPORTED, "label": label("psi_metadata")},
                "gravity_regime": {"value": inv.gravity_regime, "label": label("psi_metadata"), "basis": inv.gravity_regime_basis},
                "oxygen": c["oxygen"], "pressure": c["pressure"], "airflow": c["airflow"],
                "measurement_types": {"value": sorted(inv.measurement_types) or [NOT_REPORTED], "label": label("rule_tag")},
                "topics": {"value": sorted(inv.topics) or [NOT_REPORTED], "label": label("rule_tag")},
                "n_test_runs": {"value": len(inv.test_runs), "label": label("psi_experimental_table")},
            },
        })
    shared_topics = sorted(set.intersection(*[set(i.topics) for i in ordered])) if len(ordered) > 1 else []
    return {"investigations": cols, "missing_ids": missing,
            "similarities": {"shared_topics": shared_topics,
                             "same_hardware": len({i.hardware for i in ordered}) == 1 if ordered else False,
                             "same_fuel_class": len({i.fuel_class for i in ordered}) == 1 if ordered else False},
            "field_order": ["family", "objective", "fuel_class", "materials", "hardware", "platform", "gravity_regime",
                            "oxygen", "pressure", "airflow", "measurement_types", "topics", "n_test_runs"],
            "caveats": ["Condition ranges aggregate individual PSI table rows; they are not one experiment-wide condition.",
                        "Units: oxygen % by volume (mole fraction x 100), pressure kPa, airflow m/s; source text is kept per row.",
                        "Oxygen % is not oxygen partial pressure."]}

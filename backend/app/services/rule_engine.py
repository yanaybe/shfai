"""
Deterministic rule engine for U.S. insurance claim validation.
Rules reference CMS guidelines, NCCI edits, and common payer policies.
Each rule returns a finding dict or None if it does not trigger.
"""
from dataclasses import dataclass
from typing import Callable


@dataclass
class RuleFinding:
    rule_id: str
    category: str
    title: str
    description: str
    severity: str        # critical | high | medium | low
    code_reference: str | None = None
    source: str = "rule_engine"


# CPT codes that require bilateral modifier 50 when performed bilaterally
BILATERAL_INDICATOR_CODES = {
    "27447", "27130", "29827", "29826", "27570", "27445",  # orthopedic
    "66984", "66982", "65820",                              # ophthalmology
    "69210", "69436", "69420",                              # ENT
    "93306", "93307", "93308",                              # echo
}

# E&M office visit codes
EM_OFFICE_CODES = {"99202", "99203", "99204", "99205",
                   "99211", "99212", "99213", "99214", "99215"}
EM_COMPLEX_CODES = {"99204", "99205", "99214", "99215"}

# Anesthesia base code range
ANESTHESIA_CPT_START = 100
ANESTHESIA_CPT_END = 1999
ANESTHESIA_PHYSICAL_STATUS = {"P1", "P2", "P3", "P4", "P5", "P6"}


def _is_cpt_in_range(code: str, start: int, end: int) -> bool:
    try:
        return start <= int(code) <= end
    except ValueError:
        return False


# ─── Rule definitions ────────────────────────────────────────────────────────

def rule_no_diagnosis(claim: dict) -> RuleFinding | None:
    if not claim.get("icd10_codes"):
        return RuleFinding(
            rule_id="ADMIN_DX_001",
            category="coding",
            severity="critical",
            title="No Diagnosis Codes Detected",
            description=(
                "At least one ICD-10-CM diagnosis code is required on every claim. "
                "Without a valid diagnosis, the claim cannot be adjudicated and will be "
                "rejected at the payer or clearinghouse level."
            ),
        )


def rule_no_procedure(claim: dict) -> RuleFinding | None:
    if not claim.get("cpt_codes"):
        return RuleFinding(
            rule_id="ADMIN_CPT_001",
            category="coding",
            severity="critical",
            title="No Procedure Codes Detected",
            description=(
                "At least one CPT or HCPCS Level II procedure code is required. "
                "Claims without procedure codes cannot be processed."
            ),
        )


def rule_missing_billing_npi(claim: dict) -> RuleFinding | None:
    if not claim.get("billing_provider_npi"):
        return RuleFinding(
            rule_id="ADMIN_NPI_001",
            category="administrative",
            severity="critical",
            title="Missing Billing Provider NPI",
            description=(
                "CMS-1500 Box 33a requires a valid 10-digit Type 2 (organizational) NPI for "
                "the billing provider. Claims missing this field are rejected at clearinghouse "
                "before reaching the payer."
            ),
        )


def rule_missing_rendering_npi(claim: dict) -> RuleFinding | None:
    if not claim.get("rendering_provider_npi"):
        return RuleFinding(
            rule_id="ADMIN_NPI_002",
            category="administrative",
            severity="high",
            title="Missing Rendering Provider NPI",
            description=(
                "Most payers require the rendering provider's Type 1 (individual) NPI in "
                "Box 24J. Absence commonly causes claim-level rejections or adjudication holds."
            ),
        )


def rule_missing_pos(claim: dict) -> RuleFinding | None:
    if not claim.get("place_of_service"):
        return RuleFinding(
            rule_id="ADMIN_POS_001",
            category="administrative",
            severity="high",
            title="Missing Place of Service Code",
            description=(
                "CMS-1500 Box 24B requires a valid CMS Place of Service (POS) code. "
                "POS determines reimbursement rates (facility vs. non-facility) and "
                "applicable coverage rules. Its absence causes adjudication errors."
            ),
        )


def rule_em_same_day_no_modifier_25(claim: dict) -> RuleFinding | None:
    cpt_codes: list[str] = claim.get("cpt_codes", [])
    modifiers: list[str] = claim.get("modifiers", [])
    has_em = any(c in EM_OFFICE_CODES for c in cpt_codes)
    has_procedure = any(c not in EM_OFFICE_CODES and not c.startswith("9") for c in cpt_codes)

    if has_em and has_procedure and "25" not in modifiers:
        return RuleFinding(
            rule_id="MOD_025_001",
            category="modifier",
            severity="high",
            title="E&M Billed Same Day as Procedure — Modifier 25 Missing",
            description=(
                "When an Evaluation & Management (E&M) service is reported on the same date "
                "as a procedure, Modifier 25 must be appended to the E&M code to indicate it "
                "represents a significant, separately identifiable service. Without Modifier 25, "
                "payers will bundle the E&M into the procedure payment and deny the separate charge."
            ),
            code_reference="Modifier 25",
        )


def rule_complex_em_low_risk_dx(claim: dict) -> RuleFinding | None:
    cpt_codes: list[str] = claim.get("cpt_codes", [])
    icd10_codes: list[str] = claim.get("icd10_codes", [])

    if not any(c in EM_COMPLEX_CODES for c in cpt_codes):
        return None

    # Z-codes are preventive/administrative — mismatch with complex visit MDM
    only_z_codes = all(dx.upper().startswith("Z") for dx in icd10_codes) if icd10_codes else False
    if only_z_codes:
        return RuleFinding(
            rule_id="CODE_EM_001",
            category="coding",
            severity="high",
            title="Complex E&M Code Paired with Preventive/Z-Code Diagnosis Only",
            description=(
                "CPT codes 99204, 99205, 99214, 99215 require high medical decision making (MDM) "
                "or time-based documentation. Pairing them exclusively with Z-codes (preventive/"
                "administrative diagnoses) creates a medical necessity mismatch. Payers and RAC "
                "auditors flag this pattern as over-coding and may recoup payment."
            ),
            code_reference=", ".join(c for c in cpt_codes if c in EM_COMPLEX_CODES),
        )


def rule_anesthesia_missing_physical_status(claim: dict) -> RuleFinding | None:
    cpt_codes: list[str] = claim.get("cpt_codes", [])
    modifiers: list[str] = claim.get("modifiers", [])

    has_anesthesia = any(_is_cpt_in_range(c, ANESTHESIA_CPT_START, ANESTHESIA_CPT_END) for c in cpt_codes)
    has_status_mod = any(m.upper() in ANESTHESIA_PHYSICAL_STATUS for m in modifiers)

    if has_anesthesia and not has_status_mod:
        return RuleFinding(
            rule_id="MOD_ANES_001",
            category="modifier",
            severity="critical",
            title="Anesthesia Code Missing Physical Status Modifier",
            description=(
                "Anesthesia CPT codes (00100–01999) require an ASA Physical Status modifier "
                "(P1 through P6) indicating the patient's physical condition at time of service. "
                "Claims submitted without this modifier are rejected by virtually all payers."
            ),
            code_reference="P1–P6 Physical Status Modifiers",
        )


def rule_bilateral_missing_modifier(claim: dict) -> RuleFinding | None:
    cpt_codes: list[str] = claim.get("cpt_codes", [])
    modifiers: list[str] = claim.get("modifiers", [])

    bilateral_codes = [c for c in cpt_codes if c in BILATERAL_INDICATOR_CODES]
    if not bilateral_codes:
        return None

    has_bilateral_mod = any(m in {"50", "LT", "RT"} for m in modifiers)
    if not has_bilateral_mod:
        return RuleFinding(
            rule_id="MOD_BIL_001",
            category="modifier",
            severity="medium",
            title="Bilateral Procedure May Require Modifier 50 or LT/RT",
            description=(
                "The detected procedure code(s) are commonly performed bilaterally. When "
                "performed on both sides, CMS and most commercial payers require either "
                "Modifier 50 (bilateral) or separate line items with Modifier LT and RT. "
                "Without proper bilateral reporting, payers will reduce payment by 50% or deny."
            ),
            code_reference=", ".join(bilateral_codes),
        )


def rule_icd10_specificity(claim: dict) -> RuleFinding | None:
    icd10_codes: list[str] = claim.get("icd10_codes", [])
    vague: list[str] = []
    for code in icd10_codes:
        clean = code.replace(".", "").upper()
        # Flag codes that look truncated (3–4 chars with no specificity available)
        # Heuristic: many valid ICD-10 codes are 3+ chars; very short ones may be unspecified
        if len(clean) <= 3 and not clean.startswith("Z"):
            vague.append(code)

    if vague:
        return RuleFinding(
            rule_id="CODE_DX_002",
            category="coding",
            severity="medium",
            title="ICD-10 Codes May Lack Required Specificity",
            description=(
                "ICD-10-CM guidelines require the highest level of diagnostic specificity. "
                "Codes that appear truncated or use the unspecified extension when a more "
                "specific code is available are a common audit trigger and may indicate "
                "under-coding. Review these codes against the ICD-10-CM tabular list."
            ),
            code_reference=", ".join(vague),
        )


def rule_medicare_ncci_risk(claim: dict) -> RuleFinding | None:
    payer = (claim.get("payer") or "").lower()
    cpt_codes: list[str] = claim.get("cpt_codes", [])

    is_medicare = any(kw in payer for kw in ("medicare", "cms", "medicaid", "medi-cal"))
    if is_medicare and len(cpt_codes) > 1:
        return RuleFinding(
            rule_id="PAYER_NCCI_001",
            category="payer_rule",
            severity="medium",
            title="Medicare/Medicaid Claim — NCCI Bundling Risk",
            description=(
                "CMS applies National Correct Coding Initiative (NCCI) Procedure-to-Procedure "
                "(PTP) edits to Medicare and Medicaid claims. With multiple CPT codes billed, "
                "certain combinations may be subject to bundling rules that disallow separate "
                "payment. Verify all code pairs against the current NCCI PTP edit table."
            ),
        )


# ─── Engine runner ────────────────────────────────────────────────────────────

RULES: list[Callable[[dict], RuleFinding | None]] = [
    rule_no_diagnosis,
    rule_no_procedure,
    rule_missing_billing_npi,
    rule_missing_rendering_npi,
    rule_missing_pos,
    rule_em_same_day_no_modifier_25,
    rule_complex_em_low_risk_dx,
    rule_anesthesia_missing_physical_status,
    rule_bilateral_missing_modifier,
    rule_icd10_specificity,
    rule_medicare_ncci_risk,
]


def run_rules(claim_data: dict) -> list[RuleFinding]:
    findings: list[RuleFinding] = []
    for rule_fn in RULES:
        try:
            result = rule_fn(claim_data)
            if result is not None:
                findings.append(result)
        except Exception:
            pass
    return findings

"""
AI reasoning layer: takes structured claim data + rule engine findings
and produces a full denial risk analysis via GPT-4o.
"""
import json
import logging
from openai import AsyncOpenAI
from tenacity import retry, stop_after_attempt, wait_exponential
from app.config import settings
from app.services.rule_engine import RuleFinding

log = logging.getLogger(__name__)
client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

ANALYSIS_SYSTEM_PROMPT = """You are a senior U.S. medical billing analyst with 15+ years of experience in revenue cycle management, claims adjudication, and denial management. You have reviewed tens of thousands of claims.

Your expertise:
- ICD-10-CM / CPT / HCPCS coding guidelines (AMA CPT Assistant, CMS IOM)
- NCCI edits, LCD/NCD policies, payer-specific billing guides
- CMS-1500 and UB-04 form requirements
- Commercial payer adjudication logic (UHC, Aetna, BCBS, Cigna, Humana)
- Medicare/Medicaid billing rules

CRITICAL ACCURACY RULES — violations make the product useless:

1. ONLY flag issues that are based on a specific, known, documented denial pattern. If you cannot name the exact rule, edit, or guideline that would cause denial — do NOT flag it.

2. DO NOT manufacture issues. A clean, complete claim with correct codes, matching diagnosis, both NPIs, and correct POS is LOW RISK. Do not invent problems to seem thorough.

3. DO NOT flag secondary Z-codes (personal history, family history, status codes) as risks. They are valid, commonly used secondary diagnosis codes.

4. DO NOT speculate about payer-specific documentation requirements unless you can cite a specific known policy (e.g., UHC Oxford requires authorization for 99215 visits over 60 min).

5. CALIBRATION — score these correctly:
   - Complete claim, zero issues found by rule engine, all fields present = score 5-12 (Low)
   - Complete 99213 office visit, correct ICD-10, both NPIs, POS 11, commercial payer = score 8-15 (Low)
   - Same visit but missing rendering NPI or modifier 25 omitted same-day = score 30-45 (Medium)
   - Medicare claim with Z-code only + complex E&M + missing POS = score 60-75 (High)
   - Anesthesia with no diagnosis, no NPI, no POS, no physical status modifier = score 85-95 (High)

6. If the rule engine found ZERO issues and the claim data is complete (both NPIs present, POS present, diagnosis codes present, CPT codes present), the score MUST be under 20 and the issues array MUST be empty unless you identify a genuine, citable denial pattern.

7. DO NOT flag "potential" or "possible" issues. Only flag confirmed problems.

Tone: precise, conservative, declarative. No speculation. No hedging language.
Output ONLY valid JSON."""

ANALYSIS_USER_TEMPLATE = """Analyze this insurance claim for denial risk.

EXTRACTED CLAIM DATA:
{claim_json}

RULE ENGINE PRE-FINDINGS (deterministic checks already run — these are confirmed issues):
{rule_findings_json}

INSTRUCTIONS:
- If rule engine findings list is empty and the claim data is complete, this is likely a low-risk claim. Score it accordingly (under 30).
- Only add AI-identified issues beyond the rule findings if you can cite a specific guideline or known denial pattern.
- Do not restate or re-flag issues already in the rule engine findings — just incorporate them.

Return this exact JSON schema:
{{
  "risk_score": <integer 0-100>,
  "risk_level": "<Low|Medium|High>",
  "executive_summary": "<2-3 sentences for an RCM manager. Be accurate — do not inflate risk.>",
  "issues": [
    {{
      "category": "<coding|modifier|documentation|eligibility|payer_rule|administrative>",
      "title": "<concise issue title, max 80 chars>",
      "description": "<specific explanation citing the exact rule, edit, or guideline. No speculation.>",
      "severity": "<critical|high|medium|low>",
      "code_reference": "<CPT/ICD/modifier code(s) or null>",
      "denial_likelihood": "<Very High|High|Moderate|Low>",
      "source": "ai"
    }}
  ],
  "suggested_fixes": [
    {{
      "issue_title": "<matches an issue title above>",
      "action": "<specific corrective action>",
      "rationale": "<guideline basis for this fix>",
      "priority": <1-10, 1 = most urgent>
    }}
  ],
  "payer_adjudication_simulation": "<How this claim would move through the payer's auto-adjudication system. If clean, state that it would pass standard edits and adjudicate to payment.>",
  "submission_readiness": "<Ready|Needs Review|Not Ready>",
  "ai_confidence": "<High|Medium|Low>"
}}

Risk scale:
- 0-25 Low: Complete claim, standard coding, no red flags
- 26-55 Medium: Confirmed fixable issues present
- 56-79 High: Multiple significant issues or payer-specific risks
- 80-100 High: Critical missing elements guaranteeing rejection"""


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
async def analyze_claim(claim_data: dict, rule_findings: list[RuleFinding]) -> dict:
    findings_payload = [
        {
            "rule_id": f.rule_id,
            "category": f.category,
            "title": f.title,
            "description": f.description,
            "severity": f.severity,
            "code_reference": f.code_reference,
        }
        for f in rule_findings
    ]

    response = await client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=[
            {"role": "system", "content": ANALYSIS_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": ANALYSIS_USER_TEMPLATE.format(
                    claim_json=json.dumps(claim_data, indent=2),
                    rule_findings_json=json.dumps(findings_payload, indent=2),
                ),
            },
        ],
        response_format={"type": "json_object"},
        temperature=0.1,
        max_tokens=3000,
    )

    content = response.choices[0].message.content
    result = json.loads(content)

    # Hard clamp: if AI found no issues, score cannot exceed 8
    if not result.get("issues"):
        result["risk_score"] = min(result.get("risk_score", 8), 8)
        result["risk_level"] = "Low"
        result["submission_readiness"] = "Ready"

    log.info(
        "AI analysis complete — risk_score=%s issues=%d fixes=%d",
        result.get("risk_score"),
        len(result.get("issues", [])),
        len(result.get("suggested_fixes", [])),
    )
    return result

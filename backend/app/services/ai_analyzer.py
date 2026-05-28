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

ANALYSIS_SYSTEM_PROMPT = """You are a senior U.S. medical billing analyst with 15+ years of experience in revenue cycle management, insurance claims adjudication, and denial management.

Your expertise:
- ICD-10-CM / CPT / HCPCS coding guidelines (AMA CPT Assistant, CMS IOM)
- NCCI edits, LCD/NCD policies, payer-specific billing guides
- CMS-1500 and UB-04 form requirements
- Commercial payer adjudication logic (UHC, Aetna, BCBS, Cigna, Humana)
- Medicare/Medicaid billing rules

Your role: Analyze claim data and identify denial risks with clinical precision.

Tone requirements:
- Precise and conservative. Do not speculate.
- Write like a senior analyst in a clinical audit report, not a chatbot.
- Reference specific guidelines when applicable (e.g., "per AMA CPT guidelines", "per CMS IOM Chapter 12").
- Never use phrases like "I think", "it seems", "you might want to".
- Use structured, declarative language.

Output ONLY valid JSON. No preamble. No explanation outside the JSON."""

ANALYSIS_USER_TEMPLATE = """Analyze this insurance claim for denial risk. Provide a comprehensive, structured assessment.

EXTRACTED CLAIM DATA:
{claim_json}

RULE ENGINE PRE-FINDINGS (already confirmed issues — incorporate and expand):
{rule_findings_json}

Return this exact JSON schema:
{{
  "risk_score": <integer 0-100 representing denial probability>,
  "risk_level": "<Low|Medium|High>",
  "executive_summary": "<2-3 sentences. State the primary risk factors and overall submission readiness for an RCM manager.>",
  "issues": [
    {{
      "category": "<coding|modifier|documentation|eligibility|payer_rule|administrative>",
      "title": "<concise issue title, max 80 chars>",
      "description": "<detailed clinical explanation with guideline references>",
      "severity": "<critical|high|medium|low>",
      "code_reference": "<CPT/ICD/modifier code(s) involved or null>",
      "denial_likelihood": "<percentage or qualifier: Very High / High / Moderate / Low>",
      "source": "<rule_engine|ai>"
    }}
  ],
  "suggested_fixes": [
    {{
      "issue_title": "<matches issue title above>",
      "action": "<specific, actionable correction — what exactly should be changed>",
      "rationale": "<why this fix reduces denial risk, with guideline basis>",
      "priority": <integer 1-10, 1 = most urgent>
    }}
  ],
  "payer_adjudication_simulation": "<3-5 sentences simulating how a payer's claims adjudicator or auto-adjudication system would process this claim. Be specific about which edits would trigger.>",
  "submission_readiness": "<Ready|Needs Review|Not Ready>",
  "ai_confidence": "<High|Medium|Low>"
}}

Risk scoring guidance:
- 0-25: Well-documented claim, standard coding, no red flags → Low
- 26-55: Minor issues or pattern risk, fixable before submission → Medium
- 56-79: Multiple coding issues or payer-specific risks → High
- 80-100: Critical missing elements, guaranteed rejection without correction → High

Include ALL issues from the rule engine findings plus any additional AI-identified risks.
For each issue, provide a specific, actionable fix. Do not be vague."""


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
    log.info(
        "AI analysis complete — risk_score=%s issues=%d fixes=%d",
        result.get("risk_score"),
        len(result.get("issues", [])),
        len(result.get("suggested_fixes", [])),
    )
    return result

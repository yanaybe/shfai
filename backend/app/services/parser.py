import json
import logging
from openai import AsyncOpenAI
from tenacity import retry, stop_after_attempt, wait_exponential
from app.config import settings

log = logging.getLogger(__name__)
client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

EXTRACTION_SYSTEM_PROMPT = """You are a medical billing data extraction specialist with expert knowledge of CMS-1500 forms, UB-04 forms, and U.S. insurance claim documentation.

Your task: extract structured claim data from raw document text.

Rules:
- Extract ONLY what is explicitly present in the text. Do not infer or fabricate values.
- Use standard code formats: ICD-10-CM (e.g., M54.5), CPT (5-digit), HCPCS Level II (letter + 4 digits).
- Modifiers are 2-character codes (e.g., 25, 50, LT, RT, GP).
- Place of Service codes are 2-digit CMS codes (e.g., 11 = Office, 21 = Inpatient Hospital).
- If a field is not present, use null.
- Return ONLY valid JSON, no commentary."""

EXTRACTION_USER_TEMPLATE = """Extract claim data from this document text and return a JSON object with exactly this schema:

{{
  "payer": "insurance company or plan name",
  "payer_id": "payer/plan ID if present",
  "patient_age": "age or DOB string",
  "patient_gender": "M or F",
  "icd10_codes": ["array of ICD-10-CM codes"],
  "cpt_codes": ["array of CPT/HCPCS codes"],
  "modifiers": ["array of 2-char modifier codes"],
  "place_of_service": "POS code",
  "provider_type": "specialty or provider type",
  "billing_provider_npi": "10-digit NPI",
  "rendering_provider_npi": "10-digit NPI",
  "service_dates": ["array of service dates as strings"],
  "total_charge": "dollar amount as string",
  "claim_type": "professional or institutional",
  "notes": "any other billing-relevant observations"
}}

DOCUMENT TEXT:
{raw_text}"""


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
async def extract_claim_data(raw_text: str) -> dict:
    truncated = raw_text[:12000]
    response = await client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=[
            {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
            {"role": "user", "content": EXTRACTION_USER_TEMPLATE.format(raw_text=truncated)},
        ],
        response_format={"type": "json_object"},
        temperature=0,
        max_tokens=1500,
    )

    content = response.choices[0].message.content
    data = json.loads(content)
    log.info("Extracted claim data keys: %s", list(data.keys()))
    return data

-- Claims — core document record
CREATE TABLE IF NOT EXISTS claims (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status          VARCHAR(50)  NOT NULL DEFAULT 'pending',
    -- pending | processing | completed | failed
    file_name       VARCHAR(255),
    file_url        TEXT,
    file_type       VARCHAR(20),  -- pdf | image
    raw_text        TEXT,
    extracted_data  JSONB,
    risk_score      SMALLINT,     -- 0-100
    risk_level      VARCHAR(20),  -- low | medium | high
    processing_error TEXT
);

-- Per-issue findings
CREATE TABLE IF NOT EXISTS claim_issues (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id        UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    category        VARCHAR(100), -- coding | modifier | documentation | eligibility | payer_rule | administrative
    title           VARCHAR(255),
    description     TEXT,
    severity        VARCHAR(20),  -- critical | high | medium | low
    code_reference  VARCHAR(100),
    denial_likelihood VARCHAR(50),
    source          VARCHAR(50)   -- rule_engine | ai
);

-- Suggested corrections
CREATE TABLE IF NOT EXISTS claim_fixes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id        UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    issue_id        UUID REFERENCES claim_issues(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    action          TEXT,
    rationale       TEXT,
    priority        SMALLINT     -- 1 = most urgent
);

-- AI narrative report
CREATE TABLE IF NOT EXISTS claim_reports (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id                    UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    executive_summary           TEXT,
    payer_adjudication_simulation TEXT,
    submission_readiness        VARCHAR(30),  -- Ready | Needs Review | Not Ready
    ai_confidence               VARCHAR(20),  -- High | Medium | Low
    processing_time_ms          INTEGER
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
CREATE INDEX IF NOT EXISTS idx_claim_issues_claim_id ON claim_issues(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_fixes_claim_id ON claim_fixes(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_reports_claim_id ON claim_reports(claim_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER claims_updated_at
    BEFORE UPDATE ON claims
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

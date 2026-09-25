# Audit Redaction Specification

## Purpose

Guarantee one consistent sanitization boundary before persistence and administrative serialization.

## Requirements

### Requirement: Central redaction

All audit snapshots, trace fields, DTOs, errors, and export metadata MUST pass through a central redactor. It MUST remove or mask passwords, password hashes, JWTs, tokens, cookies, authorization headers, secrets, bank/account data, document/phone/email PII, and raw clinical history; unknown sensitive keys MUST default to omission.

#### Scenario: Mixed snapshot

- GIVEN a mutation snapshot contains name, passwordHash, accountNumber, and clinical notes
- WHEN it is persisted and returned by the viewer
- THEN only the permitted non-sensitive representation is present and forbidden values are absent

#### Scenario: Nested and serialized values

- GIVEN sensitive keys occur in nested objects, arrays, or JSON strings
- WHEN redaction runs
- THEN the same policy applies recursively without throwing or leaking the original value

### Requirement: Redaction safety

Redaction MUST be deterministic, preserve audit shape where safe, and MUST NOT make a protected value recoverable from changed fields, error messages, query parameters, or TraceLog.

#### Scenario: Token onboarding

- GIVEN onboarding creates or verifies a token
- WHEN the event is written
- THEN it records token lifecycle outcome and correlation only, never the token or JWT claims containing secrets

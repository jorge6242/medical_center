# Trace Log Specification

## Purpose

Provide operational, structured traces separate from persistent business audit history.

## Requirements

### Requirement: Structured operational trace

TraceLog MUST record action name, level, outcome, duration where available, correlation/request id, tenant/user identifiers only in non-sensitive form, and bounded error metadata. It MUST NOT duplicate every AuditLog event or contain secrets, tokens, credentials, bank data, raw PII, or clinical content.

#### Scenario: Audited request trace

- GIVEN an audited patient or payment action executes
- WHEN the request completes
- THEN an operational trace may describe timing/outcome and the AuditLog remains the business evidence

#### Scenario: Sensitive value

- GIVEN a trace field contains a password, JWT, authorization header, account number, or clinical payload
- WHEN the trace is emitted
- THEN the value is redacted or omitted

### Requirement: Request correlation

Authenticated and unauthenticated requests MUST carry a safe correlation id through request context; missing tenant on failed authentication MUST NOT trigger tenant enumeration.

#### Scenario: Failed login

- GIVEN credentials fail before a tenant is established
- WHEN a trace is emitted
- THEN it contains correlation and outcome only, with no tenant discovery or credential material

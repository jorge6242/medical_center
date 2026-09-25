# Onboarding Token Management Specification

## Purpose

Manage secure doctor onboarding while auditing lifecycle outcomes without persisting token material.

## MODIFIED Requirements

### Requirement: Invitation lifecycle and audit evidence

Each invitation attempt MUST retain its existing lifecycle metadata and rate limit, while audit/trace events MUST record send, rotation, verification, completion, rejection, and expiration outcomes without storing JWTs, raw tokens, passwords, or links.
(Previously: the lifecycle specified token rows but not safe audit evidence.)

#### Scenario: Send and rotate

- GIVEN an eligible doctor and fewer than 3 sends in one hour
- WHEN an admin sends or resends onboarding
- THEN the previous pending token is expired, a new pending token is created, and the event contains outcome/correlation only

#### Scenario: Rate limit

- GIVEN 3 invitations were sent within one hour
- WHEN a fourth send is attempted
- THEN the API returns 429 and the event contains the rejection without token data

### Requirement: Single-use validation and completion

Validation MUST enforce signature, expiry, row existence, pending status, and expiration timestamp. Completion MUST atomically update the user and token; its audit event MUST roll back if either update fails.

#### Scenario: Completed or expired token

- GIVEN a token is completed or expired
- WHEN it is submitted
- THEN the API returns 410 and no secret is written to audit or trace output

#### Scenario: Completion rollback

- GIVEN password and token completion are in one transaction
- WHEN persistence fails
- THEN neither update nor completion audit event remains

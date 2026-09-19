# Payment Processing Specification

## Purpose
Define how the system processes payments, generates doctor receipts, and sends receipt emails synchronously within the payment completion flow.

## Requirements

### Requirement: Synchronous Receipt Generation

The system MUST generate a doctor receipt immediately when a payment is completed, as part of the same request/response cycle.

#### Scenario: Payment completion generates receipt inline

- GIVEN a valid payment creation request with doctor services
- WHEN the payment is successfully persisted
- THEN the system MUST call the receipt generation service directly
- AND the receipt MUST be stored in the database before the HTTP response returns
- AND the response MUST include the receipt identifier

#### Scenario: Receipt generation failure blocks payment response

- GIVEN a valid payment creation request
- WHEN receipt generation fails (e.g., missing doctor data)
- THEN the payment MUST still be persisted
- AND the response MUST indicate partial success with a warning
- AND the failure MUST be logged for manual review

### Requirement: Synchronous Receipt Email

The system MUST send the receipt email to the doctor immediately after receipt generation, within the same request/response cycle.

#### Scenario: Email sent inline after receipt generation

- GIVEN a receipt was successfully generated for a payment
- WHEN the email service is invoked directly
- THEN the email MUST be sent before the HTTP response returns
- AND the response MUST indicate email delivery status

#### Scenario: Email delivery failure is non-blocking

- GIVEN a receipt was successfully generated
- WHEN the email service fails (e.g., SMTP unreachable)
- THEN the payment and receipt MUST remain valid
- AND the response MUST return success with an email failure warning
- AND the failure MUST be logged for retry

### Requirement: Response Time Budget

Payment creation with receipt generation and email delivery MUST complete within 5 seconds for 95% of requests under normal load.

#### Scenario: Normal payment flow completes within budget

- GIVEN standard payment data (1-3 services, single doctor)
- WHEN the payment endpoint is called
- THEN the total response time MUST NOT exceed 5000ms

## REMOVED Behavior

- Queue-based async receipt generation (BullMQ `receipt-generation` queue)
- Queue-based async email delivery (BullMQ `receipt-email` queue)
- Worker-processed background jobs for receipts

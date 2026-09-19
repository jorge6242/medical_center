# Medical Records Export Specification

## Purpose
Define how the system exports patient medical record summaries synchronously upon request.

## Requirements

### Requirement: Synchronous Medical Record Export

The system MUST generate medical record export files (PDF) directly within the HTTP request/response cycle.

#### Scenario: Doctor exports patient history

- GIVEN an authenticated doctor with access to a patient
- WHEN the doctor calls the medical records export endpoint
- THEN the system MUST query the patient's consultation history directly
- AND generate a PDF summary inline
- AND return the file as a downloadable blob or stream
- AND the response MUST complete within 5 seconds for records under 50 consultations

#### Scenario: Large patient history export

- GIVEN a patient with more than 50 consultations
- WHEN the doctor requests an export
- THEN the system MUST generate the PDF inline
- AND the response MAY exceed 5 seconds
- AND the system SHOULD return a warning that the file is large

### Requirement: Export Content Validation

Exported medical records MUST contain only data the requesting user is authorized to view, scoped by tenant.

#### Scenario: Doctor exports own patient's records

- GIVEN a doctor with valid patient assignment
- WHEN the export endpoint is called
- THEN the PDF MUST include all consultation history for that patient
- AND the PDF MUST NOT include other patients' data

#### Scenario: Unauthorized export attempt

- GIVEN a user without doctor role or patient access
- WHEN the export endpoint is called
- THEN the system MUST return 403 Forbidden
- AND no file MUST be generated

## REMOVED Behavior

- Queue-based async medical record export (BullMQ `medical-record-export` queue)
- Background worker processing for medical record PDFs

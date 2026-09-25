# doctor-service-pricing Specification

## Purpose

Allows assigning services and specific prices directly to individual doctors, overriding or replacing global specialty-based pricing.

## Requirements

### Requirement: Doctor Service Pricing Data Model

The system MUST allow associating a service and specialty directly with a doctor along with a specific price in USD.

#### Scenario: Assigning a service with price to a doctor

- GIVEN a doctor, a specialty, and a service
- WHEN an admin assigns the service to the doctor with a specific price
- THEN the system saves this mapping (`DoctorService`) scoped to the tenant
- AND the mapping requires a unique combination of doctor, specialty, and service.

### Requirement: Doctor Service Management via API

The system MUST support managing a doctor's services and prices through the doctors API endpoints using transactions for multi-write operations.

#### Scenario: Updating a doctor's services

- GIVEN an existing doctor
- WHEN an admin submits a request to update the doctor's profile including a list of services and prices
- THEN the system validates the input DTOs
- AND updates the doctor's services within a database transaction.

### Requirement: Consultation Service Filtering

The system MUST only allow selecting services that are explicitly assigned to the chosen doctor when creating a new consultation.

#### Scenario: Receptionist selects a doctor for consultation

- GIVEN a receptionist is creating a consultation
- WHEN they select a specific doctor
- THEN the list of available services is filtered to only show those assigned to that doctor.

### Requirement: Consultation Pricing Calculation

The system MUST fetch the consultation price directly from the chosen doctor's assigned services (`DoctorService`) instead of global specialty pricing.

#### Scenario: Consultation price applied

- GIVEN a consultation being created with a selected doctor and service
- WHEN the consultation is saved
- THEN the `priceUsd` is populated from the doctor's specific `DoctorService` record
- AND this price is snapshot into the consultation record for historical safety.

# Design: Catálogo de Servicios + Laboratorios + Extensión de Pagos

**Status**: Draft
**Based on**: 02-spec.md
**Prerequisites**: 01-proposal.md approved

## Architecture Overview

### PaymentItem Model (Reemplaza FKs opcionales)

Cada pago tiene exactamente **1 `PaymentItem`** (restricción de no mixtos). Esto mantiene atomicidad mientras unifica el código.

```prisma
enum ItemType {
  CONSULTATION
  LAB
  // PHARMACY  // Future
  // IMAGING   // Future
}

model Payment {
  id              String        @id @default(uuid())
  totalServiceUsd Decimal       @db.Decimal(12, 2)
  bcvExchangeRate Decimal       @db.Decimal(12, 4)
  totalPaidUsd    Decimal       @db.Decimal(12, 2)
  totalPaidBs     Decimal       @db.Decimal(12, 2)
  totalIgtfUsd    Decimal       @db.Decimal(12, 2) @default(0)
  doctorShareUsd  Decimal       @db.Decimal(12, 2)
  centerShareUsd  Decimal       @db.Decimal(12, 2)
  status          PaymentStatus @default(PENDING)
  tenantId        String        // Added for direct filtering
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  item           PaymentItem?
  details        PaymentDetail[]
  adjustments    PaymentAdjustment[]
  doctorReceipt  DoctorReceipt?

  @@index([tenantId])
  @@index([tenantId, status])
  @@index([status])
  @@index([createdAt])
  @@map("payments")
}

model PaymentItem {
  id          String   @id @default(uuid())
  paymentId   String   @unique
  itemType    ItemType
  description String   // Snapshot: "Consulta Cardiología" or "Hemograma Completo"
  quantity    Int      @default(1)
  unitPriceUsd Decimal @db.Decimal(12, 2)
  totalPriceUsd Decimal @db.Decimal(12, 2)

  // FKs opcionales según itemType (exactamente uno estará seteado)
  consultationId String? @unique
  labOrderId     String? @unique

  payment      Payment       @relation(fields: [paymentId], references: [id], onDelete: Cascade)
  consultation Consultation? @relation(fields: [consultationId], references: [id])
  labOrder     LabOrder?     @relation(fields: [labOrderId], references: [id])

  @@index([itemType])
  @@index([consultationId])
  @@index([labOrderId])
  @@map("payment_items")
}
```

**Key Design Decisions:**
1. **`tenantId` en `Payment` directamente**: Permite filtrar pagos sin JOIN a `Consultation` (performance + simplicidad para labs que no tienen `Consultation`)
2. **`paymentId` @unique en `PaymentItem`**: Garantiza exactamente 1 item por pago (no mixtos)
3. **`description` snapshot**: Copia el nombre del servicio en el momento del pago (igual que `ConsultationService.serviceName`)
4. **`quantity` + `unitPriceUsd` + `totalPriceUsd`**: Estructura de línea estándar, reusable para futuros tipos

### Lab Models

```prisma
model LabTestCatalog {
  id       String  @id @default(uuid())
  tenantId String
  name     String
  priceUsd Decimal @db.Decimal(12, 2)
  isActive Boolean @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id])
  orderTests LabOrderTest[]

  @@unique([tenantId, name])
  @@index([tenantId])
  @@index([tenantId, isActive])
  @@map("lab_test_catalogs")
}

enum LabOrderStatus {
  PENDING
  PAID
  VOIDED
}

model LabOrder {
  id        String         @id @default(uuid())
  tenantId  String
  patientId String
  status    LabOrderStatus @default(PENDING)
  totalUsd  Decimal        @db.Decimal(12, 2)
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt

  tenant   Tenant         @relation(fields: [tenantId], references: [id])
  patient  Patient        @relation(fields: [patientId], references: [id])
  tests    LabOrderTest[]
  paymentItem PaymentItem?

  @@index([tenantId])
  @@index([tenantId, patientId])
  @@index([tenantId, status])
  @@map("lab_orders")
}

model LabOrderTest {
  id          String @id @default(uuid())
  labOrderId  String
  labTestId   String
  testName    String // Snapshot
  priceUsd    Decimal @db.Decimal(12, 2)

  labOrder LabOrder @relation(fields: [labOrderId], references: [id], onDelete: Cascade)
  labTest  LabTestCatalog @relation(fields: [labTestId], references: [id])

  @@index([labOrderId])
  @@map("lab_order_tests")
}
```

### Flow: Consulta Médica (Regresión)

```
Recepción → POST /payments
  dto: {
    patientId, doctorId, servicePriceIds, bcvExchangeRate, paymentLines,
    items: [{ itemType: 'CONSULTATION', description: '...', servicePriceIds: [...] }]
  }

PaymentsService.create():
  1. Validar patient + doctor + servicePrices
  2. Crear Consultation
  3. Crear ConsultationService[] (snapshot)
  4. Calcular split: doctorShareUsd / centerShareUsd
  5. Crear Payment
  6. Crear PaymentItem { itemType: CONSULTATION, consultationId, description: 'Consulta ...', quantity: 1, unitPriceUsd, totalPriceUsd }
  7. Crear PaymentDetails[]
  8. Generar DoctorReceipt + email
```

### Flow: Laboratorio

```
Lab → POST /lab-orders
  dto: { patientId, labTestIds: [...] }
  → LabOrdersService: validar tests, calcular total, crear LabOrder + LabOrderTest[]

Recepción → POST /payments
  dto: {
    patientId, labOrderId, bcvExchangeRate, paymentLines,
    items: [{ itemType: 'LAB', description: 'Laboratorio ...', labOrderId }]
  }

PaymentsService.create():
  1. Validar patient + labOrder
  2. Calcular total: sum(LabOrderTest.priceUsd)  // NO split de doctor
  3. doctorShareUsd = 0, centerShareUsd = totalUsd
  4. Crear Payment
  5. Crear PaymentItem { itemType: LAB, labOrderId, description, quantity, unitPriceUsd, totalPriceUsd }
  6. Crear PaymentDetails[]
  7. Actualizar LabOrder.status = PAID
  8. NO generar DoctorReceipt
```

### Unified DTOs

```typescript
// create-payment.dto.ts
export class PaymentItemDto {
  @IsEnum(ItemType)
  itemType: ItemType;

  @IsString()
  description: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  servicePriceIds?: string[]; // For CONSULTATION

  @IsOptional()
  @IsString()
  labOrderId?: string; // For LAB
}

export class CreatePaymentDto {
  @IsUUID('4')
  idempotencyKey: string;

  @IsString()
  patientId: string;

  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  bcvExchangeRate: number;

  @ValidateNested()
  @Type(() => PaymentItemDto)
  item: PaymentItemDto; // Single item, no mixtos

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentLineDto)
  paymentLines: PaymentLineDto[];
}
```

### Unified Response

```typescript
// payment-response.dto.ts
export class PaymentItemResponseDto {
  id: string;
  itemType: ItemType;
  description: string;
  quantity: number;
  unitPriceUsd: string;
  totalPriceUsd: string;

  // Type-specific fields
  consultationId?: string;
  labOrderId?: string;

  // Embedded snapshot data
  services?: ConsultationServiceSnapshotDto[]; // For CONSULTATION
  labTests?: LabOrderTestSnapshotDto[]; // For LAB
}

export class PaymentResponseDto {
  id: string;
  idempotencyKey: string;
  status: PaymentStatus;
  tenantId: string;
  item: PaymentItemResponseDto;
  totalServiceUsd: string;
  // ... other fields same as before
}
```

### Receipts Service (Conditional)

```typescript
// receipts.service.ts
async createForPayment(tenantId, paymentId, generatedById) {
  const payment = await this.prisma.payment.findFirst({
    where: { id: paymentId, tenantId },
    include: {
      item: true,
      details: true,
    },
  });

  // Only generate receipt for consultations
  if (payment.item.itemType !== 'CONSULTATION') {
    throw new BadRequestException('Receipts only apply to consultation payments');
  }

  // Rest of logic unchanged...
}
```

### Stats Service (Filtered)

```typescript
// stats.service.ts
const pendingPayments = await this.prisma.payment.findMany({
  where: {
    status: 'COMPLETED',
    createdAt: { gte: monthStart },
    tenantId,
    item: { itemType: 'CONSULTATION' }, // Filter for consultations only
  },
  include: {
    item: { include: { consultation: { select: { doctorId: true } } } },
  },
});

const pendingPayoutDoctorIds = new Set(
  pendingPayments.map((p) => p.item.consultation?.doctorId).filter(Boolean),
);
```

## Decision Log

### Why PaymentItem (1 per payment) instead of FKs optional?
- **Scalability**: Adding a 3rd type (pharmacy, imaging) requires only: new Order table + enum value. `PaymentsService` doesn't change.
- **Code simplicity**: `buildResponse()`, `voidPayment()`, `findAll()` are generic. No conditional logic per type.
- **Atomic payments**: Each payment traceable to exactly one service. Clear for accounting and auditing.
- **Cost now vs later**: +1-2h now saves ~3-4h per future type.

### Why NOT PaymentItem (multiple per payment / mixtos)?
- **Complexity**: Receipt generation, doctor share calculation, and UI rendering become complicated.
- **No business need**: User confirmed "sin pagos mixtos".
- **Venezuela context**: Medical centers typically bill departments separately anyway.

### Why `tenantId` directly on `Payment`?
- `Consultation` and `LabOrder` both have `tenantId`, but querying payments via JOIN is slower and more complex.
- Direct `tenantId` on `Payment` allows simple `where: { tenantId }` in `findAll()`.
- Required because `LabOrder` doesn't have a `Consultation` to traverse for tenant filtering.

## Rollback / Migration Strategy

Since we're in testing phase with no real data:
1. Delete all `Payment`, `Consultation`, `ConsultationService`, `ConsultationPayment` records.
2. Apply new migration.
3. Re-seed if needed.

No data migration scripts needed.

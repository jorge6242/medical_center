# Delta — suscripciones y pagos SaaS

## ADDED Requirements

### Requirement: Reutilización e historia inmutable

El módulo MUST reutilizar modelos SaaS existentes una vez estabilizada su dependencia local. MUST conservar Decimal, snapshots de plan/precio y período mensual Caracas. Edición contractual MUST afectar solo condiciones futuras; V1 MUST NOT cobrar/renovar automáticamente ni editar catálogo de planes.

#### Scenario: Cambio de precio

- GIVEN períodos/facturas/pagos históricos
- WHEN se modifica agreedPriceUsd con versión vigente
- THEN solo períodos futuros usan el nuevo precio y todos los snapshots previos permanecen iguales.

#### Scenario: Período válido y duplicado

- GIVEN plan activo y contrato válido
- WHEN se registra período mensual con clave de idempotencia
- THEN crea snapshots y una factura única, sin solapamientos; repetir request no duplica, otro payload con misma clave devuelve 409.

### Requirement: Estados comerciales explícitos

MUST admitir únicamente las transiciones definidas en design.md con motivo/version y MUST mantener CANCELED terminal en V1. MUST NOT activar/desactivar Tenant por cambio de estado o registrar pago.

#### Scenario: Transición inválida

- GIVEN contrato CANCELED o versión desactualizada
- WHEN solicita reactivación directa o edición concurrente
- THEN devuelve 409 sin modificar contrato/tenant.

### Requirement: Registro financiero seguro

Pagos MUST registrar factura del tenant seleccionado, moneda/método compatibles, monto positivo, fecha y tasa snapshot para VES. MUST calcular USD por Decimal sin IGTF ni split clínico, impedir sobrepago y facturas VOIDED, y actualizar saldo/estado atómicamente con auditoría.

#### Scenario: Abono y cancelación de saldo

- GIVEN factura PENDING con saldo positivo
- WHEN registra abono confirmado menor al saldo y luego el resto
- THEN estados son PARTIALLY_PAID y PAID, respectivamente, con snapshots inmutables.

#### Scenario: Concurrencia y doble envío

- GIVEN dos requests simultáneos sobre saldo de una factura
- WHEN registran pagos o reintentan la misma clave/payload
- THEN bloqueo transaccional evita sobrepago y la clave idempotente genera un solo pago confirmado.

#### Scenario: Clave o id ajeno

- GIVEN factura/pago o clave global perteneciente a otro tenant
- WHEN se envía bajo tenant seleccionado distinto
- THEN devuelve 404/409 sin datos ajenos ni mutación.

#### Scenario: Anulación persistente

- GIVEN pago confirmado y motivo válido
- WHEN se anula idempotentemente
- THEN queda VOIDED sin DELETE y saldo/estado de factura se recalculan según vencimiento; contrato/tenant no se activan automáticamente.

#### Scenario: Entrada financiera inválida

- GIVEN monto cero/negativo, tasa VES ausente, moneda/método incompatible o sobrepago
- WHEN intenta registrar pago
- THEN recibe 400/409 y no cambia pago, saldo ni factura.

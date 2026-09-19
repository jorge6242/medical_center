# Plan de Extensión: Informes Médicos (Medical Records)

## 1. Estrategia de Diseño

En el área médica, los datos se dividen en dos ciclos de vida:

- **Datos longitudinales (Históricos):** Antecedentes personales, familiares, ginecológicos y obstétricos. Pertenecen al Paciente y trascienden la consulta actual.
- **Datos episódicos (Transaccionales):** Anamnesis, examen físico, ecografías y resolución médica del día. Pertenecen única y exclusivamente a la Consulta.

Para respetar las buenas prácticas del proyecto (evitar antipatrones EAV y columnas nulas esparcidas), utilizaremos **JSONB** nativo de PostgreSQL mapeado a interfaces estrictas en TypeScript.

## 2. Extensión del Schema (Prisma)

```prisma
// Agregar en prisma/schema.prisma

model Patient {
  // ... campos existentes (id, tenantId, name, etc.)

  // Historial clínico persistente del paciente
  clinicalHistory Json? @db.JsonB

  // Relaciones
  medicalRecords MedicalRecord[]
}

model Consultation {
  // ... campos existentes

  // Relación 1:1, una consulta tiene un informe médico (opcional)
  medicalRecord MedicalRecord?
}

// NUEVO MODELO
model MedicalRecord {
  id              String   @id @default(uuid())
  tenantId        String
  consultationId  String   @unique
  patientId       String
  doctorId        String

  // Plantilla usada (ej: "GYNECOLOGY_BASIC", "OBSTETRICS_ECO")
  templateType    String

  // Datos episódicos de la consulta
  recordData      Json     @db.JsonB

  status          String   @default("draft") // draft, completed, voided

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Auditoría
  voidedBy        String?
  voidReason      String?

  tenant          Tenant       @relation(fields: [tenantId], references: [id])
  consultation    Consultation @relation(fields: [consultationId], references: [id])
  patient         Patient      @relation(fields: [patientId], references: [id])
  doctor          Doctor       @relation(fields: [doctorId], references: [id])

  @@index([tenantId])
  @@index([tenantId, patientId])
  @@index([tenantId, doctorId])
  @@index([tenantId, templateType])
  @@map("medical_records")
}
```

### Diagrama de Relaciones (ASCII ERD)

```text
+-------------------------+       1:N        +-------------------------+
|         Tenant          |----------------->|      MedicalRecord      | (NUEVA)
+-------------------------+                  +-------------------------+
                                             | id (UUID, PK)           |
+-------------------------+       1:N        | tenantId (FK)           |
|         Doctor          |----------------->| doctorId (FK)           |
+-------------------------+                  | patientId (FK)          |
                                             | consultationId (FK, UQ) |
+-------------------------+       1:N        | templateType (String)   |
|         Patient         |----------------->| recordData (JSONB)      |
|-------------------------|                  | status (String)         |
| + clinicalHistory       |                  | voidedBy, voidReason    |
|   (JSONB NUEVO)         |                  +-------------------------+
+-------------------------+                               |
                                                          | 1:1
+-------------------------+                               |
|      Consultation       |<------------------------------+
+-------------------------+
```

**Explicación de las Relaciones:**

- `MedicalRecord` tiene una relación **1 a Muchos (N:1)** con `Tenant`, `Doctor` y `Patient` (un doctor/paciente puede tener múltiples informes, pero el informe pertenece a un solo doctor/paciente).
- `MedicalRecord` tiene una relación **1 a 1** con `Consultation` (garantizado por el atributo `@unique` en `consultationId`). Esto estipula que **de cada consulta nace exactamente un único informe médico oficial**.
- Las FKs hacia las entidades existentes son sólidas, asegurando la integridad referencial y permitiendo consultas rápidas.

## 3. Type-Safety: Interfaces (Shared)

Traducimos la estructura JSON a interfaces TypeScript estrictas en `packages/shared/src/interfaces/`. Esto nos permite separar claramente cuando un informe es exclusivamente ginecológico y cuando incluye control obstétrico.

**Antecedentes Históricos (Patient.clinicalHistory):**
Al ser datos del paciente, agrupamos todo como opcional. Si es una paciente sólo de ginecología, `antecedentesObstetricos` quedará indefinido.

```typescript
export interface PatientClinicalHistory {
  antecedentesPersonales?: {
    patologiasBase: string;
    alergias: string;
    quirurgicos: string;
    habitosPsicobiologicos: {
      cafeinicos: string;
      tabaquicos: string;
      alcohol: string;
      drogas: string;
    };
  };
  antecedentesGinecologicos?: {
    menarquiaEdad: number;
    formulaMenstrual: string;
    sexarquiaEdad: number;
    // ...
  };
  antecedentesObstetricos?: {
    gestas: number;
    partos: number;
    cesareas: number;
    abortos: number;
    // ...
  };
}
```

**Datos del Informe Actual (MedicalRecord.recordData):**
Dependiendo del `templateType` (ej. `"GYNECOLOGY_ONLY"` vs `"OBSTETRICS_ECO"`), el JSON guardará una u otra estructura.

_Variante 1: Ginecología Exclusiva_

```typescript
export interface GynecologyRecordData {
  anamnesis: {
    motivoConsulta: string;
    enfermedadActual: string;
  };
  examenFisicoGeneral: {
    signosVitales: { ... };
  };
  examenFisicoGinecologico: {
    mamasEvaluacion: string;
    vulvaPerineEvaluacion: string;
    especuloscopiaHallazgos: string;
    tactoVaginalHallazgos: string;
    colposcopiaHallazgos: string;
  };
  resolucionMedica: {
    diagnosticos: string[];
    planTrabajoExamenes: string;
    tratamientoMedico: string;
  };
}
```

_Variante 2: Integrada con Control Obstétrico_

```typescript
export interface ObstetricsRecordData extends GynecologyRecordData {
  // Hereda lo de ginecología y anamnesis, y le suma el componente obstétrico
  controlObstetricoEco: {
    fechaUltimaRegla: string;
    fechaProbableParto: string;
    edadGestacionalSemanas: number;
    estaticaFetal: { ... };
    biometriaFetal: { ... };
    anatomiaFetal: { ... };
    anexosFetales: { ... };
  };
}
```

## 4. DTOs e Implementación en NestJS

```typescript
// DTO de Creación
import { IsUUID, IsString, IsObject, IsNotEmpty } from 'class-validator';

export class CreateMedicalRecordDto {
  @IsUUID()
  consultationId: string;

  @IsString()
  @IsNotEmpty()
  templateType: string;

  @IsObject()
  recordData: Record<string, any>;
}
```

**Manejo en el Service:**

```typescript
async createRecord(dto: CreateMedicalRecordDto, docId: string, tenantId: string) {
  const consultation = await this.prisma.consultation.findFirst({ ... });

  const record = await this.prisma.medicalRecord.create({
    data: {
      tenantId,
      doctorId: docId,
      patientId: consultation.patientId,
      consultationId: dto.consultationId,
      templateType: dto.templateType,
      recordData: dto.recordData,
      status: 'completed'
    }
  });

  return record;
}

// Lectura con Casting
async getRecord(id: string) {
  const record = await this.prisma.medicalRecord.findUnique({ where: { id } });

  if (record.templateType === 'OBSTETRICS_ECO') {
    const data = record.recordData as unknown as ObstetricsRecordData;
    // Type-safety con la estructura de ObstetricsRecordData
  }
}
```

## 5. Ventajas

1. **Sin Tablas Dispersas / Cero EAV:** Escalable a N especialidades sin tocar el esquema de la base de datos.
2. **Historial Centralizado:** Antecedentes persistentes viven en el Paciente, útiles para cualquier médico en el futuro.
3. **Alto Rendimiento:** PostgreSQL soporta queries JSONB con eficiencia.
4. **Cumple Reglas Transaccionales de AGENTS.md:** Vinculado a `Consultation`, auditable y con soft-delete (`status = "voided"`).

## 6. Estrategia de Frontend (Motor Dinámico por Schema / Schema-Driven UI)

Para lograr una escalabilidad extrema sin sobrecargar la base de datos ni crear docenas de componentes React repetitivos, utilizaremos un **Motor de Formularios Mapeado por Schema (Config-Driven)** integrado con React Hook Form.

¿Cómo sabe el frontend qué inputs renderizar para el JSONB dinámico que espera el backend?

1. **Especificación Local por Especialidad:**
   El frontend almacenará arrays de configuración (`schemas`) estáticos que dictan cómo se pinta cada especialidad. Definen qué componentes de UI nativos (`text`, `select`, `date`) asociar a cada campo, sin atiborrar de lógica los archivos `.tsx`.

```tsx
// apps/web/src/features/medical-records/schemas/gynecology.schema.ts
export const GynecologyFormSchema = [
  {
    title: "Anamnesis",
    fields: [
      { name: "anamnesis.motivoConsulta", type: "textarea", label: "Motivo de Consulta", required: true },
      { name: "anamnesis.enfermedadActual", type: "textarea", label: "Enfermedad Actual" }
    ]
  },
  {
    title: "Examen Físico Ginecológico",
    fields: [
      { name: "examenFisicoGinecologico.mamas", type: "text", label: "Mamas" },
      { name: "examenFisicoGinecologico.vulva", type: "select", options: [...], label: "Vulva/Periné" },
      // Escape Hatch: soporte a lógica médica iterdependiente/compleja inyectando UI nativa customizada
      {
        name: "examenFisicoGinecologico.colposcopia",
        type: "custom",
        component: ColposcopiaVisualPicker
      }
    ]
  }
];
```

2. **Un Único Renderizador (Dynamic Form Engine):**
   Construiremos un componente agnóstico `<DynamicForm />` parecido al esquema avanzado analizado previamente. Este recorrerá recursivamente el schema y, usando un `componentsMap` y un HOC como `withFormField()`, inyectará el `Controller` de React-Hook-Form en cada input.

```tsx
// apps/web/src/features/medical-records/components/MedicalRecordDynamicForm.tsx

const TEMPLATES_REGISTRY = {
  GYNECOLOGY_ONLY: { schema: GynecologyFormSchema, zodValidator: GynecologyRecordZod },
  OBSTETRICS_ECO: { schema: ObstetricsFormSchema, zodValidator: ObstetricsRecordZod },
};

export function MedicalRecordDynamicForm({ templateType, initialData }) {
  // Resuelve qué schema pintar y validar según el tipo
  const template = TEMPLATES_REGISTRY[templateType];

  if (!template) return <p>Plantilla no soportada</p>;

  return (
    <DynamicForm
      groups={template.schema} // Define layouts e inputs dinámicos
      validation={template.zodValidator} // Validation rules
      defaultValues={initialData} // El viejo state cargado desde DB
    />
  );
}
```

**Ventajas del Enfoque Híbrido Schema-Driven:**

- **Altamente Mantenible (DRY):** Las plantillas nuevas se añaden creando un solo archivo de configuración (`.schema.ts`).
- **Desacople en DB y UI:** La Base de datos queda pura como depositaria JSONB y el esquema de renderizado vive completamente en el frontend.
- **Flexibilidad Médica:** Permite crear _Escape hatches_. A diferencia de un FormMaker genérico que no soporta flujos pesados, el atributo `component: CustomComponent` te deja interceptar la lógica de campos interdependientes (Ej: Edad gestacional vs cálculo automatizado de Fecha Probable de Parto).

3. **Hook Centralizado de Mutación (onSubmit):**
   Aunque los campos e inputs cambien por especialidad, el mecanismo de guardado es universal. La arquitectura contempla tener un hook centralizado, por ejemplo `useSaveMedicalRecord`, que encapsula la petición al API a nivel global.

El componente base delegaría su evento submit a este hook unificado:

```tsx
// apps/web/src/features/medical-records/hooks/useSaveMedicalRecord.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/config/api';

export function useSaveMedicalRecord(consultationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { templateType: string; recordData: any }) =>
      apiFetch(`/consultations/${consultationId}/medical-records`, {
        method: 'POST', // o PUT si es actualización
        body: JSON.stringify({
          templateType: data.templateType,
          recordData: data.recordData,
        }),
      }),
    onSuccess: () => {
      // Invalida cache para refrescar la historia médica
      queryClient.invalidateQueries({ queryKey: ['medical-records'] });
    },
  });
}
```

Al momento del envío (Submit) en el `MedicalRecordDynamicForm`, la ejecución se delega a este hook, mandando de forma transparente el `recordData` resultante, independientemente del `templateType` utilizado. Todo el manejo de estado (Carga, Errores y Validaciones) queda aislado limpiamente.

4. **Integración React-Hook-Form + Zod + Submit:**
   El motor de formularios (`DynamicForm`) inicializa `useForm` pasándole el validador Zod correspondiente a la plantilla. Cuando el usuario hace click en guardar, RHF ejecuta la validación y, si pasa, envía los datos limpios al hook centralizado.

```tsx
// Ejemplo conceptual dentro de MedicalRecordDynamicForm
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSaveMedicalRecord } from '../hooks/useSaveMedicalRecord';

export function MedicalRecordDynamicForm({ templateType, initialData, consultationId }) {
  const template = TEMPLATES_REGISTRY[templateType];
  const saveMedicalRecord = useSaveMedicalRecord(consultationId);

  const methods = useForm({
    resolver: zodResolver(template.zodValidator), // Validación estricta por especialidad
    defaultValues: initialData,
  });

  const onSubmit = (formData) => {
    saveMedicalRecord.mutate({
      templateType: templateType,
      recordData: formData, // Objeto limpio y validado
    });
  };

  if (!template) return <p>Plantilla no soportada</p>;

  return (
    <DynamicForm
      methods={methods}
      groups={template.schema}
      onSubmit={methods.handleSubmit(onSubmit)}
      isPending={saveMedicalRecord.isPending}
    />
  );
}
```

Esta integración logra:

- **Validación infalible:** Zod bloquea el Submit si el doctor olvida un campo requerido.
- **Rendimiento:** React-Hook-Form evita re-renderizados innecesarios en formularios grandes.
- **UX Consistente:** Todos los formularios comparten el estado de carga (`isPending`) y notificaciones de éxito/error.

5. **Inicialización Inteligente (Precarga por Consulta):**
   Al acceder a la vista de creación del informe desde una consulta específica, el frontend leerá los detalles de los servicios asociados a esa cita (e.g. `Consulta Ginecología`). Con base en esta información, la UI debe inferir y **precargar automáticamente el `templateType`** correspondiente (ej: `GYNECOLOGY_ONLY`). El médico no tendrá que seleccionar o adivinar qué formulario llenar; el sistema "despierta" levantando exactamente la plantilla asociada al servicio por el cual interactuó el paciente en recepción.

## 7. Visualización e Impresión (PDF e Historial del Paciente)

Para cerrar el flujo clínico de manera profesional, el médico debe poder entregar un informe físico/digital al paciente y tener visibilidad de consultas pasadas.

1. **Generación de Informes Médicos y Visores (Backend Strategy + BullMQ):**
   Alineados a la arquitectura consolidada de exportación del proyecto, la generación de los PDFs de informes médicos y el historial clínico completo del paciente se delegará al backend utilizando el **Patrón Strategy** integrado con colas asíncronas en **BullMQ**.
   - **Flujo:** La UI publicará una solicitud de descarga al endpoint (eg. `POST /medical-records/:id/export`).
   - Un Worker (BullMQ) recogerá el Job en segundo plano sin bloquear el hilo principal de Node.
   - Según el `templateType` del JSONB, el factory inyectará la `Strategy` de PDF correcta (ej: `ObstetricsRecordStrategy`, `GynecologyRecordStrategy`).
   - Desde aquí se podrá no solamente devolver un link de descarga al cliente, sino también escalar fluidamente a enviar el reporte con adjunto directo al correo del paciente mediante otro job.

2. **Vista Detalle del Paciente (Agrupación por Especialidad):**
   En la interfaz de detalle del paciente (e.g. `/pacientes/[id]`), para evitar una sobrecarga cognitiva de información cruzada, la vista se dividirá en pestañas (Tabs) o paneles por **Especialidad**.
   Dentro de cada tab de especialidad, el médico verá dos grandes bloques:
   - **Historial Médico Longitudinal:** Los antecedentes fijos del paciente correspondientes a esa área (se alimenta del `Patient.clinicalHistory`, por lo que en el tab de ginecología solo verá `$antecedentesGinecologicos`).
   - **Informes Médicos (Episódicos):** Una tabla cronológica alimentada por endpoint (e.g., `GET /patients/:patientId/medical-records?specialty=XXX`) que lista las consultas pasadas de esa rama con `Fecha`, `Doctor` y `Estado`. Cada fila tendrá la acción de **"Ver/Imprimir"** gatillando el job asíncrono con BullMQ desde el Backend.

## 8. Resumen de Arquitectura (Ciclo de Vida Completo)

Con todas estas adiciones, el plan cubre ahora de manera robusta y escalable todo el ciclo de vida del dato médico, permitiendo una experiencia de Sistemas de Salud (EHR u HCE) de vanguardia:

1. **Modelado (BDD):** Tablas ligeras con JSONB y relaciones claras (Evitando el anti-patrón EAV).
2. **Seguridad de tipo (TypeScript Shared):** Interfaces tipadas (`GynecologyRecordData`) validadas end-to-end.
3. **Backend (Endpoints):** Control unificado mediante un service que delega hacia Prisma.
4. **Captura UI (Formulario dinámico Hook-Form + Zod):** El motor (`DynamicForm`) y `TEMPLATES_REGISTRY` eliminan la duplicación de código.
5. **Consumo final (Histórico en perfil paciente e Impresión de PDF):**
   - **Reportes Robustos Background:** Al igual que los consolidados del SENIAT, se aplica Patrón Strategy + BullMQ para renderizar los informes con peso corporativo y capacidad de envío por correo desde workers dedicados en el backend.
   - **UX de Pestañas (Ficha del Paciente):** Historial médico y reportes pasados separados por especialidad para no abrumar cognitivamente al médico.

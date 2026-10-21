# Ficha del paciente y consultas

## Objetivo

Unificar lectura y edición de datos del paciente en `/pacientes/[id]` y consultar sus visitas sin mezclar informes ni antecedentes clínicos.

## Alcance aprobado

- Ficha de lectura por defecto; Editar, Guardar y Cancelar explícitos.
- Datos personales y representantes existentes; formulario compartido con el alta.
- Consultas paginadas, todos los estados y enlace al detalle existente.
- Permisos independientes de lectura del paciente, edición y listado de consultas.
- Reutilizar GET/PATCH `/patients/:id` y GET `/consultations?patientId=...`.
- Retirar el panel de informes/antecedentes solamente de esta ruta.

## Fuera de alcance

Informes, antecedentes, pagos nuevos, borrado/reactivación, migraciones, E2E de navegador, nuevas dependencias, builds y despliegues. No eliminar endpoints ni otros consumidores clínicos.

## Impacto real

Es una funcionalidad con cambios productivos, NO una entrega exclusivamente de tests. Cambian la navegación de edición, la ficha y el contrato de respuesta PATCH para conservar representantes. Se preservan alta, consulta individual, finanzas y selector de consultas elegibles para informes.

## Entrega y rollback

Modo automático; estrategia `auto-chain`: unidades autónomas inferiores a 400 líneas, con tests y evidencia. No implica crear ramas, commits ni PRs sin autorización. Si una unidad crece, subdividir antes de continuar. Rollback por unidad: restaurar contrato PATCH, paneles o navegación afectados sin tocar datos; no hay transformación de base de datos.

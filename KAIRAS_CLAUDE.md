# CLAUDE.md — KAIRAS OS / Sistema operativo interno

> Documento de contexto y especificación para Claude Code / Fable 5.  
> Objetivo: construir una aplicación propia, operativa y mantenible para centralizar CRM, clientes, leads, proyectos, servicios, ingresos, seguimiento comercial, conexión con Odoo y medición de captación de KAIRAS.

---

## 0. Principio rector

Construye un sistema real, no una maqueta.

KAIRAS necesita dejar de depender de Notion, Exceles sueltos y memoria mental. La aplicación debe ser una herramienta diaria para gestionar:

- leads,
- clientes,
- oportunidades comerciales,
- propuestas,
- proyectos,
- servicios recurrentes,
- tareas,
- control horario por proyecto, cliente, tarea y servicio,
- cronómetro tipo Toggl/Clockify para registrar trabajo en tiempo real,
- calendario operativo filtrable,
- ingresos previstos,
- facturas emitidas o pendientes,
- estado de cobro,
- campañas,
- eventos de conversión,
- documentación,
- seguimiento comercial,
- notas de reunión,
- próximos pasos.

La app no sustituye a Odoo como herramienta fiscal/contable.  
La app debe actuar como **cerebro comercial, operativo y de control interno**.  
Odoo debe ser la **fuente de verdad fiscal** para facturas, impuestos y cumplimiento legal.

No crear una aplicación que duplique mal la contabilidad. Crear una aplicación que conecte estrategia, venta, operación y facturación.

---

## 1. Contexto de negocio

### 1.1 Qué es KAIRAS

KAIRAS es una marca de optimización operativa, automatización e inteligencia artificial aplicada para pymes de servicios.

No vende IA por moda. Vende:

- tiempo recuperado,
- reducción de carga manual,
- procesos más claros,
- seguimiento más ordenado,
- sistemas conectados,
- menos caos operativo.

La marca trabaja desde el problema real del negocio, no desde la herramienta.

### 1.2 Servicios actuales y previsibles

La app debe soportar un mix realista de servicios, no solo automatizaciones.

Categorías base:

1. **Automatización e IA aplicada**
   - agentes conversacionales,
   - flujos con IA,
   - automatización de tareas repetitivas,
   - clasificación de leads,
   - extracción de datos,
   - asistentes internos,
   - sistemas de seguimiento.

2. **Software / sistemas a medida**
   - CRMs propios,
   - dashboards,
   - portales internos,
   - coordinadores digitales,
   - bases de datos conectadas,
   - apps internas.

3. **Web**
   - webs corporativas,
   - landings,
   - mantenimiento,
   - ajustes HTML/CSS,
   - responsive,
   - integraciones de formularios,
   - optimización de conversión.

4. **Redes sociales**
   - gestión mensual,
   - planificación,
   - copy,
   - diseño,
   - grabación,
   - edición,
   - publicaciones recurrentes.

5. **Marketing, comunicación y publicidad**
   - campañas Meta Ads,
   - estrategia,
   - naming,
   - identidad verbal,
   - propuestas,
   - contenido promocionado,
   - seguimiento de leads.

6. **Otros servicios puntuales**
   - branding,
   - naming,
   - auditorías,
   - propuestas visuales,
   - consultoría ligera,
   - producción audiovisual si se decide integrarla.

### 1.3 Modelo comercial

KAIRAS capta clientes mediante:

- contacto directo,
- puerta fría,
- cold calling,
- Instagram,
- WhatsApp,
- recomendaciones,
- contenido orgánico,
- Meta Ads,
- reuniones,
- demos,
- propuestas personalizadas.

La app debe permitir ver de un vistazo qué oportunidades existen, cuánto dinero representan, en qué estado están y cuál es la siguiente acción.

---

## 2. Objetivo del producto

Crear una aplicación web responsive tipo **operating system interno** para KAIRAS.

Nombre interno sugerido:

- `KAIRAS OS`
- `KAIRAS Control Center`
- `KAIRAS Command`

Usar `KAIRAS OS` como nombre técnico salvo que el usuario indique otro.

La app debe servir para responder cada día:

1. ¿Qué leads nuevos tengo?
2. ¿A quién tengo que escribir hoy?
3. ¿Qué oportunidades están calientes?
4. ¿Qué propuestas están pendientes?
5. ¿Qué proyectos están activos?
6. ¿Qué tareas están bloqueadas?
7. ¿Qué clientes me generan ingresos recurrentes?
8. ¿Cuánto ingreso previsto tengo este mes?
9. ¿Qué facturas faltan por emitir o cobrar?
10. ¿Qué campañas o fuentes están trayendo mejores leads?
11. ¿Qué servicio estoy vendiendo más?
12. ¿Qué clientes requieren seguimiento?
13. ¿Qué puedo automatizar después?
14. ¿Qué datos tengo que enviar o sincronizar con Odoo?
15. ¿Qué eventos debo enviar a Meta Conversions API?
16. ¿Cuántas horas estoy dedicando a cada cliente, proyecto, servicio o tarea?
17. ¿Qué horas son facturables y cuáles son internas/no facturables?
18. ¿Qué debo facturar por horas y qué debe enviarse a la cola de Odoo?
19. ¿Cómo se distribuye mi semana entre reuniones, producción, seguimiento comercial, administración y desarrollo?

---

## 3. Reglas no negociables

### 3.1 Producto real

No construir solo frontend.

Debe haber:

- backend real,
- base de datos real,
- autenticación,
- persistencia,
- migraciones,
- validación de datos,
- logs,
- backups,
- sistema de configuración,
- diseño responsive,
- API interna,
- estructura preparada para integraciones externas.

### 3.2 Nada de datos importantes solo en localStorage

Permitido localStorage solo para preferencias visuales menores:

- tema,
- sidebar abierta/cerrada,
- vista seleccionada.

Prohibido guardar datos de negocio solo en localStorage:

- clientes,
- facturas,
- leads,
- notas,
- oportunidades,
- tareas,
- tokens,
- datos personales,
- configuraciones sensibles.

### 3.3 Odoo es fuente fiscal

La app puede tener:

- estado comercial,
- forecast,
- importe previsto,
- importe aceptado,
- estado de factura,
- enlace a factura,
- snapshot de datos de Odoo,
- cola de facturación.

Pero la fuente final de facturas legales debe ser Odoo.

La app debe evitar generar facturas legales propias si no cumple normativa fiscal.

### 3.4 Integraciones por adaptadores

Toda integración externa debe ir mediante una capa `integrations`.

No mezclar lógica de Odoo, Meta o Playwright dentro de componentes React.

Estructura sugerida:

```txt
src/
  integrations/
    odoo/
      adapter.ts
      api-client.ts
      csv-client.ts
      playwright-client.ts
      mapper.ts
      types.ts
    meta/
      conversions-api.ts
      event-builder.ts
      mapper.ts
      types.ts
    email/
    whatsapp/
```

### 3.5 No usar Playwright como parche cutre

Playwright solo debe usarse como fallback explícito cuando:

- no haya API disponible,
- la acción esté permitida por el usuario,
- no vulnere términos de uso,
- no se use para manipular procesos fiscales críticos sin revisión,
- haya logs y confirmación.

Para Odoo, priorizar:

1. API oficial si está disponible.
2. Import/export CSV.
3. Webhooks o automatizaciones nativas si existen en el plan.
4. Playwright asistido solo para tareas no críticas o semiautomáticas.

### 3.6 Seguridad

Nunca exponer tokens en frontend.

Todo token debe vivir en:

- `.env`,
- gestor de secretos del hosting,
- tabla cifrada solo si es estrictamente necesario.

Implementar:

- autenticación,
- sesiones seguras,
- validación con Zod,
- rate limiting en endpoints sensibles,
- logs de acciones,
- permisos aunque al principio solo haya una usuaria,
- hash de datos personales cuando se envíen a Meta.

### 3.7 Protección de datos

La app manejará datos personales de clientes y leads.

Debe incluir:

- consentimiento/fuente del lead,
- base legal o estado de permiso comercial,
- opción de marcar `do_not_contact`,
- historial de comunicaciones,
- exportación de datos,
- eliminación/anonymización,
- minimización de datos,
- audit log.

---

## 4. Stack técnico recomendado

Prioridad: rapidez, mantenibilidad y despliegue sencillo.

### 4.1 Stack principal recomendado

- **Framework:** Next.js con App Router
- **Lenguaje:** TypeScript
- **Frontend:** React
- **Estilos:** Tailwind CSS
- **Componentes:** shadcn/ui o componentes propios con Radix
- **Base de datos:** PostgreSQL
- **ORM:** Prisma
- **Auth:** Auth.js / NextAuth o Supabase Auth
- **Validación:** Zod
- **Tablas:** TanStack Table
- **Formularios:** React Hook Form + Zod
- **Gráficas:** Recharts o Tremor si no rompe estética
- **Testing:** Vitest + Playwright para e2e
- **Hosting recomendado:** Vercel + Supabase / Neon
- **Backups:** backups automáticos de PostgreSQL + export manual CSV/JSON
- **Archivos:** Supabase Storage / S3 compatible / Cloudflare R2

### 4.2 Alternativa self-host

Si la usuaria prefiere control total:

- Next.js en VPS,
- Docker,
- PostgreSQL,
- Coolify,
- backups diarios a almacenamiento externo.

No recomendar servidor doméstico como única infraestructura si necesita acceso móvil y disponibilidad.

### 4.3 PWA

La app debe ser usable en móvil.

Implementar:

- diseño responsive serio,
- navegación móvil,
- quick actions,
- PWA instalable si es viable,
- formulario rápido de nuevo lead desde móvil,
- vista “Hoy”.

---

## 5. Identidad visual KAIRAS aplicada

La app debe respetar la estética de KAIRAS.

### 5.1 Estilo

- dark premium,
- sobrio,
- tecnológico sin cliché,
- limpio,
- estratégico,
- con mucho espacio negativo,
- sin ruido visual,
- sin exceso de colores.

### 5.2 Paleta

```txt
Negro base:       #0D090B
Superficie:       #121015
Blanco frío:      #E1E8F0
Morado KAIRAS:    #8B5DF5
Lavanda:          #C7B2FF
Borde sutil:      rgba(225,232,240,0.10)
Texto secundario: rgba(225,232,240,0.68)
Texto apagado:    rgba(225,232,240,0.42)
```

### 5.3 Tipografía

- Plus Jakarta Sans.
- Titulares grandes, peso 700/800.
- Labels uppercase con tracking amplio.
- Body limpio y legible.

### 5.4 Componentes visuales

- cards oscuras con borde sutil,
- radios amplios,
- botones pill,
- acentos morados muy controlados,
- badges de estado,
- tablas limpias,
- dashboards aireados,
- sidebar sobria,
- navegación clara.

### 5.5 Evitar

- robots,
- cerebros,
- engranajes,
- cronómetros literales,
- estética SaaS genérica azul,
- degradados exagerados,
- sombras teatrales,
- iconografía barata,
- exceso de morado.

---

## 6. Módulos principales

### 6.1 Dashboard general

Vista inicial.

Debe mostrar:

- leads nuevos de los últimos 7 días,
- próximos seguimientos,
- oportunidades calientes,
- propuestas pendientes,
- proyectos activos,
- tareas vencidas,
- ingresos previstos del mes,
- ingresos recurrentes mensuales,
- facturas pendientes de emitir,
- facturas pendientes de cobro,
- leads por fuente,
- tasa de conversión por etapa,
- campañas activas,
- eventos pendientes de enviar a Meta.

Bloques recomendados:

1. **Hoy**
   - llamadas,
   - mensajes,
   - reuniones,
   - tareas críticas.

2. **Pipeline**
   - valor total abierto,
   - valor ponderado por probabilidad,
   - oportunidades por etapa.

3. **Operativa**
   - proyectos activos,
   - tareas bloqueadas,
   - entregas próximas.

4. **Dinero**
   - facturación prevista,
   - recurrente mensual,
   - pendiente de cobro,
   - pendiente de emitir.

5. **Captación**
   - fuente principal de leads,
   - leads calientes,
   - campañas con más conversión.

---

### 6.2 CRM

El CRM debe ser flexible y adaptado a KAIRAS.

#### Entidades

- `Person`
- `Company`
- `Lead`
- `Opportunity`
- `Client`
- `Interaction`
- `Note`
- `Tag`
- `Source`
- `Consent`

#### Estados de lead

```txt
new
contacted
responded
interested
meeting_scheduled
diagnosis_done
proposal_needed
proposal_sent
follow_up
negotiation
won
lost
nurture
client_active
client_inactive
do_not_contact
```

#### Temperatura

```txt
cold
warm
hot
urgent
```

#### Fuente del lead

```txt
instagram_cold
instagram_inbound
meta_ads
website
whatsapp
referral
door_to_door
cold_call
email
linkedin
existing_client
networking
other
```

#### Campos clave del lead

- nombre,
- empresa,
- cargo,
- teléfono,
- email,
- Instagram,
- web,
- ciudad,
- provincia,
- sector,
- fuente,
- campaña,
- UTM source,
- UTM medium,
- UTM campaign,
- UTM content,
- Meta click id si existe,
- Meta lead id si existe,
- primera fecha de contacto,
- último contacto,
- siguiente acción,
- fecha de siguiente acción,
- temperatura,
- probabilidad,
- dolor detectado,
- servicio potencial,
- presupuesto estimado,
- objeciones,
- notas internas,
- consentimiento,
- estado de permiso comercial.

#### Vista CRM

Debe incluir:

- vista lista,
- vista kanban por estado,
- vista detalle,
- filtros por estado/fuente/servicio/temperatura,
- búsqueda global,
- acciones rápidas:
  - crear interacción,
  - crear oportunidad,
  - agendar seguimiento,
  - crear propuesta,
  - convertir a cliente,
  - marcar perdido,
  - enviar evento a Meta.

---

### 6.3 Pipeline comercial

La oportunidad representa posible dinero.

#### Etapas recomendadas

```txt
discovered
qualified
diagnosis
proposal_drafting
proposal_sent
follow_up
negotiation
accepted
won
lost
paused
```

#### Campos

- título,
- lead/persona/empresa asociada,
- servicio,
- unidad de negocio,
- valor estimado,
- valor aceptado,
- probabilidad,
- fecha estimada de cierre,
- etapa,
- prioridad,
- motivo de pérdida,
- propuesta asociada,
- tareas asociadas,
- interacciones,
- campaña/fuente,
- nivel de urgencia,
- coste de no resolver,
- encaje KAIRAS,
- observaciones.

#### Forecast

Calcular:

- valor abierto total,
- valor ponderado,
- previsión por mes,
- tasa de conversión,
- etapa con más fuga,
- oportunidades sin siguiente acción.

---

### 6.4 Clientes

Cliente = empresa/persona con proyecto ganado o servicio activo.

#### Estados

```txt
active
paused
completed
recurring
inactive
archived
```

#### Campos

- datos fiscales si aplica,
- datos comerciales,
- contactos,
- servicios contratados,
- proyectos,
- facturas vinculadas,
- ingresos recurrentes,
- documentación,
- accesos,
- notas,
- reuniones,
- próximos pasos,
- satisfacción,
- oportunidades futuras.

#### Vista cliente

Debe mostrar:

- resumen,
- datos,
- pipeline histórico,
- proyectos,
- servicios,
- facturación,
- interacciones,
- tareas,
- archivos,
- integraciones,
- notas internas.

---

### 6.5 Servicios y catálogo interno

Crear un catálogo flexible de servicios.

#### Servicios base

```txt
automation_ai
custom_software
website
website_maintenance
social_media_management
content_creation
meta_ads
marketing_strategy
branding_naming
consulting
audiovisual
other
```

Cada servicio debe tener:

- nombre comercial,
- descripción interna,
- categoría,
- precio base orientativo,
- rango de precio,
- recurrencia posible,
- IVA aplicable,
- unidad de facturación,
- entregables típicos,
- plantilla de propuesta,
- cuenta contable/categoría Odoo si aplica.

---

### 6.6 Propuestas

La app debe permitir registrar propuestas enviadas.

No hace falta generar PDFs al inicio, pero sí dejar preparado el modelo.

#### Estados

```txt
draft
sent
viewed
followed_up
accepted
rejected
expired
archived
```

#### Campos

- título,
- cliente/lead,
- oportunidad,
- servicios incluidos,
- importe sin IVA,
- IVA,
- importe total,
- fecha de envío,
- fecha límite,
- estado,
- enlace al PDF/documento,
- notas,
- condiciones,
- versión,
- motivo de rechazo,
- fecha de aceptación.

#### Acciones

- crear desde oportunidad,
- marcar enviada,
- programar seguimiento,
- marcar aceptada,
- crear proyecto desde propuesta aceptada,
- crear draft de factura / cola Odoo.

---

### 6.7 Proyectos

Proyecto = ejecución real.

#### Estados

```txt
not_started
discovery
planning
design
development
review
delivery
support
blocked
completed
cancelled
```

#### Campos

- cliente,
- oportunidad/propuesta origen,
- servicio principal,
- servicios secundarios,
- fecha inicio,
- deadline,
- presupuesto,
- margen estimado,
- estado,
- prioridad,
- responsable,
- descripción,
- alcance,
- fuera de alcance,
- entregables,
- hitos,
- tareas,
- incidencias,
- accesos asociados,
- archivos,
- notas de reunión,
- próximas acciones.

#### Vistas

- lista,
- kanban por estado,
- calendario,
- detalle de proyecto,
- timeline,
- tareas,
- finanzas asociadas.

---

### 6.8 Tareas y seguimiento

Debe funcionar como sistema de acción, no solo base de datos.

#### Tipos de tarea

```txt
follow_up
call
meeting
proposal
invoice
delivery
review
content
admin
technical
other
```

#### Campos

- título,
- descripción,
- fecha límite,
- fecha de recordatorio,
- prioridad,
- estado,
- asociado a lead/cliente/proyecto/oportunidad,
- checklist,
- resultado,
- repetición opcional,
- fecha de cierre.

#### Estados

```txt
todo
in_progress
waiting
done
cancelled
overdue
```

#### Vista “Hoy”

La app debe tener una vista centrada en acción diaria:

- vencidas,
- hoy,
- próximos 7 días,
- sin fecha pero importantes,
- oportunidades sin siguiente acción.

---

### 6.8 bis Control horario y calendario operativo

KAIRAS OS debe incluir un módulo propio de control horario inspirado en el flujo de herramientas como Toggl Track o Clockify, pero adaptado a KAIRAS. No copiar marca, textos, diseño exacto ni interfaz propietaria. Inspirarse solo en el patrón funcional: iniciar temporizador, parar, clasificar, revisar, corregir y facturar.

El objetivo no es tener un reloj decorativo. El objetivo es convertir el tiempo trabajado en información útil para:

- saber cuánto consume cada cliente,
- saber cuánto consume cada proyecto,
- separar horas facturables y no facturables,
- justificar trabajos por hora,
- detectar clientes poco rentables,
- preparar informes de horas,
- alimentar la cola de facturación hacia Odoo,
- entender dónde se está yendo la semana.

#### Funcionalidades obligatorias

1. **Cronómetro activo**
   - botón global de iniciar/parar,
   - solo puede haber un temporizador activo por usuaria,
   - el temporizador debe persistir aunque se recargue la página,
   - debe poder verse desde desktop y móvil,
   - debe permitir asignar cliente, proyecto, tarea, servicio y etiqueta,
   - debe permitir marcar `billable` / `non_billable`,
   - debe permitir añadir descripción antes, durante o después,
   - debe registrar hora de inicio, hora de fin, duración y zona horaria.

2. **Registro manual de horas**
   - crear entrada manual después de trabajar,
   - editar fecha, inicio, fin y duración,
   - duplicar entrada,
   - dividir una entrada larga en varias,
   - fusionar entradas compatibles,
   - redondeo configurable opcional: sin redondeo, 5 min, 10 min, 15 min, 30 min,
   - validar que no haya duraciones negativas ni solapamientos graves sin aviso.

3. **Clasificación operativa**
   Cada entrada de tiempo debe poder asociarse a:
   - cliente,
   - proyecto,
   - tarea,
   - oportunidad,
   - servicio,
   - propuesta,
   - campaña,
   - tipo de trabajo,
   - etiqueta.

4. **Tipos de trabajo recomendados**

```txt
strategy
sales
meeting
proposal
web_design
web_development
automation
ai_development
crm_system
debugging
content_planning
copywriting
design
video_editing
social_media
meta_ads
admin
accounting
learning
internal
other
```

5. **Facturable / no facturable**
   - campo `billable`,
   - tarifa horaria por defecto global,
   - tarifa horaria por cliente,
   - tarifa horaria por proyecto,
   - tarifa horaria por servicio,
   - importe calculado: duración x tarifa,
   - posibilidad de bloquear entradas ya facturadas,
   - posibilidad de excluir entradas internas.

6. **Estados de entrada horaria**

```txt
draft
reviewed
approved
queued_for_invoice
invoiced
non_billable
written_off
```

7. **Informes de horas**
   - por cliente,
   - por proyecto,
   - por tarea,
   - por servicio,
   - por tipo de trabajo,
   - por semana,
   - por mes,
   - facturable vs no facturable,
   - total de horas,
   - total facturable estimado,
   - export CSV/PDF simple,
   - informe compartible para cliente si procede.

8. **Conexión con finanzas y Odoo**
   - desde un informe de horas debe poder crearse una `InvoiceDraftRequest`,
   - las entradas incluidas deben quedar vinculadas a esa solicitud,
   - si se crea factura real en Odoo, las entradas deben pasar a `invoiced`,
   - no permitir modificar horas facturadas sin desbloqueo explícito y audit log,
   - export CSV de líneas de factura por horas.

9. **Importación desde Toggl/Clockify**
   - preparar importador CSV para traer histórico desde Toggl Track o Clockify,
   - mapear cliente/proyecto/tarea/descripción/duración/fecha,
   - detectar duplicados,
   - guardar origen `toggl_import`, `clockify_import` o `manual_import`,
   - no depender de sus APIs en MVP.

10. **Calidad de uso diario**
   - acción rápida global: iniciar temporizador,
   - acción rápida móvil: iniciar/parar,
   - aviso si hay temporizador activo desde hace demasiadas horas,
   - aviso de entrada sin cliente/proyecto,
   - vista “últimas entradas”,
   - autocompletar proyecto/cliente usado recientemente,
   - copiar última entrada.

#### Calendario operativo

La app debe incluir una vista de calendario que no mezcle todo de forma caótica. Puede ser un único calendario con capas/filtros, o varias vistas separadas si la UX queda más clara.

Vistas necesarias:

- día,
- semana,
- mes,
- agenda/lista,
- semana de trabajo con bloques horarios.

Capas filtrables:

- reuniones y citas,
- llamadas,
- deadlines,
- tareas,
- seguimientos comerciales,
- entregas de proyecto,
- entradas de tiempo registradas,
- campañas o publicaciones si procede.

Modo recomendado:

1. **Agenda**
   - muestra reuniones, llamadas, deadlines y tareas programadas.

2. **Horas trabajadas**
   - muestra bloques reales de trabajo registrados con el cronómetro o manualmente.

3. **Vista combinada**
   - muestra ambas capas con filtros claros para entender la semana sin convertirlo en una paella visual.

Cada evento o bloque debe abrir detalle y permitir saltar al lead, cliente, proyecto, tarea o entrada horaria asociada.

#### Entidades necesarias

Añadir al modelo de datos:

```txt
TimeEntry
TimerSession
HourlyRate
CalendarEvent
TimeReport
```

#### Campos mínimos `TimeEntry`

- id,
- userId,
- clientId opcional,
- projectId opcional,
- taskId opcional,
- opportunityId opcional,
- proposalId opcional,
- serviceId opcional,
- campaignId opcional,
- title,
- description,
- workType,
- source,
- startedAt,
- endedAt,
- durationSeconds,
- timezone,
- billable,
- hourlyRate,
- currency,
- calculatedAmount,
- status,
- invoiceDraftRequestId opcional,
- invoiceRecordId opcional,
- tags,
- lockedAt,
- lockedReason,
- createdAt,
- updatedAt,
- deletedAt.

#### Campos mínimos `TimerSession`

- id,
- userId,
- active,
- startedAt,
- pausedAt opcional,
- accumulatedSeconds,
- currentTitle,
- clientId opcional,
- projectId opcional,
- taskId opcional,
- serviceId opcional,
- billable,
- metadata,
- createdAt,
- updatedAt.

#### Campos mínimos `CalendarEvent`

- id,
- userId,
- title,
- description,
- type,
- startAt,
- endAt,
- allDay,
- timezone,
- leadId opcional,
- clientId opcional,
- projectId opcional,
- taskId opcional,
- opportunityId opcional,
- source,
- externalCalendarId opcional,
- externalEventId opcional,
- status,
- createdAt,
- updatedAt.

#### Vistas/rutas recomendadas

```txt
/time
/time/timer
/time/reports
/calendar
```

#### Métricas recomendadas

- horas hoy,
- horas esta semana,
- horas este mes,
- horas facturables,
- horas no facturables,
- importe facturable estimado,
- cliente con más horas,
- proyecto con más horas,
- servicio que más tiempo consume,
- ratio facturable/no facturable,
- horas por tipo de trabajo.

---

### 6.9 Ingresos recurrentes

KAIRAS tendrá clientes de redes sociales, mantenimiento web, soporte, automatizaciones y marketing.

Crear módulo de recurrencia.

#### Campos

- cliente,
- servicio,
- importe mensual,
- periodicidad,
- fecha de inicio,
- fecha de fin si existe,
- día de facturación,
- estado,
- próxima factura,
- método de cobro,
- enlace a factura Odoo,
- margen estimado,
- notas.

#### Estados

```txt
active
paused
cancelled
ended
trial
```

#### Métricas

- MRR,
- ARR,
- recurrencia activa,
- churn,
- próximos cobros,
- ingresos fijos por mes,
- ingresos variables por mes.

---

### 6.10 Finanzas operativas

No es contabilidad legal. Es control interno.

#### Debe incluir

- ingresos previstos,
- ingresos aceptados,
- facturas pendientes de emitir,
- facturas emitidas,
- cobros pendientes,
- pagos recibidos,
- gastos registrados,
- margen aproximado,
- desglose por servicio,
- desglose por cliente,
- desglose por mes.

#### Facturas

Modelo interno `InvoiceRecord` como snapshot / referencia.

Campos:

- cliente,
- proyecto/servicio,
- número de factura Odoo,
- Odoo ID,
- estado,
- base imponible,
- IVA,
- total,
- fecha emisión,
- fecha vencimiento,
- fecha cobro,
- enlace Odoo,
- PDF si se importa,
- sincronizado en,
- origen:
  - manual,
  - odoo_api,
  - odoo_csv,
  - playwright,
  - imported_pdf.

#### Estados

```txt
draft_needed
queued_for_odoo
created_in_odoo
sent
paid
overdue
cancelled
error
```

---

### 6.11 Odoo Sync Center

Crear una sección específica: **Integraciones > Odoo**.

Objetivo:

- ver estado de conexión,
- método activo,
- últimas sincronizaciones,
- errores,
- cola de facturación,
- contactos pendientes de crear,
- facturas pendientes de comprobar,
- importaciones CSV,
- exportaciones CSV.

#### Métodos de integración

##### Método A — API oficial

Usar si el plan de Odoo permite API externa.

Operaciones:

- leer contactos,
- crear/actualizar contactos,
- leer facturas,
- crear borradores de factura si procede,
- leer pagos,
- mapear productos/servicios.

##### Método B — CSV asistido

Para plan sin API.

La app genera:

- CSV de contactos para importar en Odoo,
- CSV de líneas de facturas,
- CSV de productos/servicios,
- CSV de clientes,
- instrucciones de importación.

La app permite importar:

- export de facturas de Odoo,
- export de contactos,
- export de pagos,
- export de gastos.

##### Método C — Playwright asistido

Solo si la usuaria autoriza expresamente.

Usos permitidos:

- abrir Odoo,
- comprobar estado de factura,
- descargar export,
- crear borrador no enviado,
- actualizar referencia no crítica.

Usos a evitar:

- emitir facturas automáticamente sin revisión,
- enviar facturas a cliente sin confirmación,
- modificar datos fiscales sensibles sin confirmación.

#### Cola de facturación

Cuando una propuesta se marca aceptada o un servicio recurrente toca facturar:

1. Crear `InvoiceDraftRequest`.
2. Mostrar datos a revisar.
3. Permitir marcar como:
   - pendiente,
   - enviada a Odoo,
   - creada en Odoo,
   - error,
   - descartada.
4. Guardar vínculo con factura real cuando exista.

---

### 6.12 Meta Ads / Conversions API

Crear módulo `Marketing Attribution`.

Objetivo: conectar captación, CRM y eventos de conversión.

#### Qué debe registrar

- fuente,
- campaña,
- anuncio,
- UTM,
- landing,
- formulario,
- fecha,
- lead id de Meta si existe,
- fbp,
- fbc,
- email/teléfono hasheado si hay consentimiento,
- evento generado,
- estado de envío,
- respuesta de Meta,
- deduplicación.

#### Eventos internos

```txt
lead_created
lead_contacted
meeting_scheduled
diagnosis_done
proposal_sent
qualified_lead
deal_won
invoice_paid
recurring_client_started
```

#### Eventos Meta sugeridos

Mapeo inicial:

```txt
lead_created              -> Lead
meeting_scheduled         -> Schedule
proposal_sent             -> Lead / custom event ProposalSent
qualified_lead            -> custom event QualifiedLead
deal_won                  -> Purchase
invoice_paid              -> Purchase
recurring_client_started  -> Subscribe / custom event RecurringClientStarted
```

Antes de implementar, revisar documentación vigente de Meta y validar nombres aceptados.

#### Requisitos técnicos

- Endpoint server-side para enviar eventos.
- Hash SHA-256 de email/teléfono cuando se envíen.
- No enviar datos personales sin consentimiento.
- Guardar `event_id` para deduplicación.
- Guardar respuesta de Meta.
- Reintentos con backoff.
- Tabla `MetaEventLog`.
- Modo test.
- Variables de entorno:

```txt
META_PIXEL_ID=
META_ACCESS_TOKEN=
META_TEST_EVENT_CODE=
META_API_VERSION=
```

#### Importante

Conversions API no “elige clientes buenos” mágicamente. Ayuda a Meta a recibir señales de conversión más completas para medición y optimización de campañas. La app debe construir un buen sistema de eventos y lead scoring propio.

---

### 6.13 Campañas y contenidos

Módulo ligero para saber qué acciones comerciales generan leads.

#### Entidades

- `Campaign`
- `ContentPiece`
- `Ad`
- `LandingPage`
- `UTM`

#### Campos campaña

- nombre,
- canal,
- objetivo,
- fecha inicio,
- fecha fin,
- presupuesto,
- estado,
- servicio promocionado,
- URL,
- UTMs,
- leads generados,
- oportunidades,
- ventas,
- coste por lead manual,
- ROAS estimado si hay gasto e ingreso.

#### Canales

```txt
instagram_organic
instagram_ads
facebook_ads
linkedin
website
whatsapp
door_to_door
cold_call
referral
email
other
```

---

### 6.14 Archivos y documentación

La app debe permitir asociar archivos o enlaces a:

- lead,
- cliente,
- proyecto,
- propuesta,
- factura,
- campaña.

Tipos:

- PDF propuesta,
- contrato,
- briefing,
- capturas,
- documentos del cliente,
- recursos visuales,
- facturas,
- presupuestos,
- notas.

Al principio puede bastar con enlaces externos y metadatos.  
Preparar storage real para fase 2.

---

### 6.15 Accesos y credenciales

Crear módulo de “Accesos” con mucho cuidado.

No guardar contraseñas en texto plano.

Opción recomendada:

- registrar qué accesos existen,
- quién los tiene,
- URL,
- usuario,
- estado,
- notas,
- enlace a gestor de contraseñas externo.

No construir un password manager casero salvo que se implemente cifrado serio.

Campos:

- cliente,
- proyecto,
- servicio,
- plataforma,
- URL,
- usuario/email,
- dónde está la contraseña,
- 2FA,
- estado,
- notas.

---

### 6.16 IA interna

Módulo opcional, no obligatorio en primera versión.

Funciones útiles:

- resumir notas de reunión,
- extraer dolor, objeciones y próximos pasos,
- sugerir siguiente acción,
- generar borrador de seguimiento,
- clasificar temperatura del lead,
- crear checklist de proyecto,
- preparar resumen para propuesta.

No bloquear la app por depender de IA.  
Primero sistema. Después IA.

---

## 7. Modelo de datos sugerido

Usar Prisma. Ajustar nombres si es necesario, pero mantener la lógica.

Entidades mínimas MVP:

```txt
User
Company
Person
Lead
Opportunity
Client
Service
Proposal
Project
Task
Interaction
Note
RecurringService
TimeEntry
TimerSession
HourlyRate
CalendarEvent
TimeReport
InvoiceRecord
InvoiceDraftRequest
ExpenseRecord
Campaign
MetaEventLog
OdooSyncJob
Attachment
Tag
AuditLog
Settings
```

### 7.1 Relaciones base

```txt
Company 1-N Person
Company 1-N Lead
Lead 1-N Opportunity
Opportunity 1-N Proposal
Proposal 1-1/N Project
Client 1-N Project
Client 1-N RecurringService
Client 1-N TimeEntry
Project 1-N TimeEntry
Task 1-N TimeEntry
Service 1-N TimeEntry
TimeEntry 0-1 InvoiceDraftRequest
CalendarEvent 0-1 Lead/Client/Project/Task/Opportunity via nullable relations
Client 1-N InvoiceRecord
Project 1-N Task
Lead/Client/Project 1-N Interaction
Lead/Client/Project 1-N Note
Campaign 1-N Lead
Lead 1-N MetaEventLog
InvoiceDraftRequest 0-1 InvoiceRecord
OdooSyncJob N records via metadata
```

### 7.2 Campos comunes

Todas las tablas importantes deben tener:

- id,
- createdAt,
- updatedAt,
- deletedAt opcional para soft delete,
- createdById,
- updatedById,
- audit log en acciones importantes.

### 7.3 Audit log

Registrar:

- creación,
- edición,
- cambio de estado,
- eliminación,
- sincronización,
- envío a Meta,
- generación de cola Odoo,
- importación/exportación.

Campos:

- actor,
- action,
- entityType,
- entityId,
- before,
- after,
- metadata,
- createdAt.

---

## 8. API interna

Usar server actions o API routes, pero mantener una capa clara de servicios.

Estructura sugerida:

```txt
src/
  app/
    dashboard/
    crm/
    leads/
    opportunities/
    clients/
    projects/
    tasks/
    time/
    calendar/
    finance/
    campaigns/
    integrations/
    settings/
  server/
    db/
    auth/
    services/
      lead-service.ts
      opportunity-service.ts
      client-service.ts
      project-service.ts
      time-entry-service.ts
      calendar-service.ts
      invoice-service.ts
      meta-service.ts
      odoo-service.ts
    validators/
    audit/
  components/
  lib/
  integrations/
```

### 8.1 Validación

Todo input debe pasar por Zod.

### 8.2 Errores

Crear manejo consistente:

- error técnico,
- error de validación,
- error de permisos,
- error de integración,
- error de sincronización.

Mostrar mensajes humanos, no stack traces.

---

## 9. Vistas obligatorias del MVP

### 9.1 `/dashboard`

Resumen operativo diario.

### 9.2 `/leads`

Lista + filtros + crear lead + detalle.

### 9.3 `/pipeline`

Kanban de oportunidades.

### 9.4 `/clients`

Lista de clientes + detalle.

### 9.5 `/projects`

Lista/kanban de proyectos + detalle.

### 9.6 `/tasks`

Vista Hoy + próximas + vencidas.

### 9.6 bis `/time`

Cronómetro, entradas de tiempo, edición manual, informes y horas facturables/no facturables.

### 9.6 ter `/calendar`

Calendario operativo con capas filtrables: agenda, tareas, seguimientos, deadlines y horas trabajadas.

### 9.7 `/finance`

Ingresos previstos, recurrentes, facturas, cola Odoo.

### 9.8 `/campaigns`

Campañas, fuentes y leads asociados.

### 9.9 `/integrations/odoo`

Estado de integración, cola y sync.

### 9.10 `/integrations/meta`

Eventos, configuración y logs.

### 9.11 `/settings`

Servicios, fuentes, etiquetas, datos de empresa, integraciones.

---

## 10. MVP realista

No intentar construir todo perfecto de golpe.

### MVP 1 — Núcleo operativo

Debe incluir:

- auth,
- base de datos,
- dashboard básico,
- leads,
- oportunidades,
- clientes,
- proyectos,
- tareas,
- control horario,
- cronómetro activo,
- calendario operativo filtrable,
- servicios,
- propuestas básicas,
- recurrentes,
- finanzas operativas,
- cola manual de facturación,
- export/import CSV básico,
- responsive.

### MVP 2 — Integraciones

- Odoo CSV,
- Odoo API si el plan lo permite,
- Meta CAPI modo test,
- UTMs,
- logs,
- reintentos.

### MVP 3 — Pulido y automatización

- PWA,
- recordatorios,
- notificaciones,
- IA interna,
- generación de documentos,
- Playwright asistido si se autoriza,
- dashboards avanzados.

---

## 11. Backups y recuperación

Implementar desde el inicio.

### Requisitos

- backups automáticos diarios de PostgreSQL,
- backups semanales conservados,
- exportación manual desde UI en CSV/JSON,
- restauración documentada,
- backup de archivos si hay storage,
- prueba de restauración documentada.

### Vista de administración

En `/settings/backups` o documentación:

- cómo se hacen los backups,
- dónde están,
- cómo restaurar,
- qué frecuencia tienen,
- último backup confirmado.

Si el proveedor gestiona backups, documentarlo claramente.

---

## 12. Importación inicial desde Notion/Excel

La app debe facilitar migración.

Crear importadores CSV para:

- leads,
- clientes,
- servicios,
- proyectos,
- facturas snapshot,
- tareas,
- entradas de tiempo.

Incluir templates CSV descargables.

Validar:

- columnas requeridas,
- duplicados,
- emails/teléfonos,
- errores antes de importar.

---

## 13. UX diaria

La app debe sentirse rápida y útil.

### Acciones rápidas globales

Siempre accesibles:

- nuevo lead,
- nueva tarea,
- iniciar/parar temporizador,
- nueva entrada manual de tiempo,
- nueva interacción,
- nueva oportunidad,
- nuevo cliente,
- registrar cobro,
- crear seguimiento.

### Búsqueda global

Buscar por:

- nombre,
- empresa,
- teléfono,
- email,
- Instagram,
- proyecto,
- propuesta,
- factura,
- entrada de tiempo,
- etiqueta.

### Vistas móviles

En móvil priorizar:

- Hoy,
- nuevo lead,
- seguimiento,
- detalle rápido,
- llamada/WhatsApp,
- notas de reunión,
- iniciar/parar temporizador,
- revisar horas de hoy.

---

## 14. Lead scoring

Crear scoring sencillo y editable.

### Señales positivas

- pidió información,
- aceptó reunión,
- tiene dolor claro,
- tiene presupuesto,
- tiene urgencia,
- encaja con sectores prioritarios,
- fuente cualificada,
- responde rápido,
- proyecto puede convertirse en caso.

### Señales negativas

- sin presupuesto,
- dolor difuso,
- solo curiosidad por IA,
- pide precio sin contexto,
- no responde,
- no encaja con KAIRAS,
- exige mucho por poco,
- sector poco rentable.

### Resultado

Campos:

- score 0-100,
- temperature,
- fit,
- urgency,
- next_best_action.

El scoring puede ser manual al inicio y automatizado después.

---

## 15. Reglas comerciales integradas

La app debe reforzar el método de KAIRAS.

### Preguntas de diagnóstico

Guardar respuestas a:

1. ¿Qué parte de la operativa te roba más tiempo?
2. ¿Qué tareas se repiten demasiado?
3. ¿Dónde se pierden leads, citas o seguimientos?
4. ¿Qué herramientas usáis ahora?
5. ¿Qué se apunta en cada sitio?
6. ¿Qué depende demasiado de una persona?
7. ¿Qué pasaría si entra más volumen mañana?
8. ¿Qué sería una mejora clara para vosotros?
9. ¿Qué presupuesto aproximado tendría sentido?
10. ¿Cuándo os gustaría resolverlo?

### Filtro de oportunidad

Campos booleanos o escala 1-5:

- dolor real,
- frecuencia,
- retorno potencial,
- capacidad de pago,
- urgencia,
- colaboración del cliente,
- encaje estratégico,
- potencial de caso,
- complejidad técnica,
- riesgo.

---

## 16. Definición de “done”

Una funcionalidad no está terminada si solo se ve bien.

Está terminada si:

- guarda en base de datos,
- valida input,
- maneja errores,
- tiene estado vacío,
- tiene loading,
- tiene permisos,
- funciona en móvil,
- no rompe dark theme,
- tiene test mínimo si es crítica,
- queda documentada,
- no contiene secretos,
- no contiene datos falsos hardcoded salvo seed.

---

## 17. Orden recomendado de implementación

### Fase 0 — Auditoría inicial

1. Inspeccionar repo.
2. Ver si ya existe Next.js.
3. Identificar stack actual.
4. No borrar trabajo existente sin permiso.
5. Proponer plan de implementación.
6. Crear ramas/commits si hay git.

### Fase 1 — Base

1. Crear proyecto o adaptar repo.
2. Configurar TypeScript.
3. Configurar Tailwind.
4. Configurar Prisma.
5. Configurar Postgres.
6. Crear auth.
7. Crear layout.
8. Crear diseño base KAIRAS.

### Fase 2 — DB

1. Definir schema Prisma.
2. Crear migración.
3. Crear seed.
4. Crear servicios server-side.
5. Crear validadores Zod.

### Fase 3 — CRM

1. Leads.
2. Personas/empresas.
3. Interacciones.
4. Oportunidades.
5. Kanban.
6. Seguimientos.

### Fase 4 — Operación

1. Clientes.
2. Proyectos.
3. Tareas.
4. Control horario.
5. Calendario operativo.
6. Servicios.
7. Recurrentes.

### Fase 5 — Finanzas

1. Propuestas.
2. InvoiceDraftRequest.
3. InvoiceRecord.
4. Dashboard financiero.
5. Export CSV.

### Fase 6 — Integraciones

1. Odoo sync center.
2. CSV import/export.
3. Meta CAPI test mode.
4. Logs.

### Fase 7 — Pulido

1. Responsive.
2. PWA.
3. Backups.
4. Tests.
5. Documentación.
6. Deploy.

---

## 18. Variables de entorno sugeridas

```env
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=

APP_URL=
APP_ENV=development
DEFAULT_TIMEZONE=Europe/Madrid
DEFAULT_CURRENCY=EUR

META_PIXEL_ID=
META_ACCESS_TOKEN=
META_TEST_EVENT_CODE=
META_API_VERSION=vXX.X

ODOO_BASE_URL=
ODOO_DB=
ODOO_USERNAME=
ODOO_API_KEY=
ODOO_INTEGRATION_MODE=csv

BACKUP_PROVIDER=
BACKUP_BUCKET=
BACKUP_ACCESS_KEY=
BACKUP_SECRET_KEY=

ENCRYPTION_KEY=
```

No todas son necesarias desde MVP 1. Crear `.env.example`.

---

## 19. Documentación que debe crear Claude

Crear en `/docs`:

```txt
docs/
  architecture.md
  database.md
  deployment.md
  backups.md
  time-tracking.md
  calendar.md
  odoo-integration.md
  meta-capi.md
  privacy-security.md
  user-guide.md
  import-csv-templates.md
```

---

## 20. Criterio de decisión si hay duda

Si hay una duda técnica o de producto, seguir este orden:

1. Seguridad.
2. Persistencia real.
3. Simplicidad.
4. Escalabilidad razonable.
5. Diseño KAIRAS.
6. Automatización.

No sacrificar seguridad ni datos reales por una interfaz bonita.

---

## 21. Tono de ejecución para Claude Code

Trabaja como senior full-stack developer y product engineer.

No preguntes por cada pequeño detalle.  
Asume defaults razonables.  
Pregunta solo si algo bloquea de verdad.

Cada vez que termines una fase:

1. resume qué hiciste,
2. lista archivos tocados,
3. indica cómo probarlo,
4. indica riesgos o pendientes reales,
5. no maquilles errores.

---

## 22. Resultado esperado

Al finalizar, la usuaria debe tener un sistema propio donde pueda entrar desde ordenador y móvil para gestionar KAIRAS con claridad:

- qué clientes tiene,
- qué leads tiene,
- en qué estado está cada oportunidad,
- qué tiene que hacer hoy,
- qué proyectos están abiertos,
- cuántas horas se han dedicado a cada cliente/proyecto/tarea,
- qué horas son facturables,
- qué dinero viene,
- qué facturas faltan,
- qué servicios recurrentes existen,
- qué campañas están funcionando,
- qué eventos se mandan a Meta,
- qué debe sincronizarse con Odoo.

La app debe reducir caos, no añadir otro trasto más al cementerio digital.

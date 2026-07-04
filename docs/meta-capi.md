# Meta Conversions API — KAIRAS OS

Objetivo: devolver a Meta señales de conversión reales (lead → reunión →
venta) para que las campañas optimicen con datos de verdad.

## Comportamiento sin credenciales (estado actual)

Sin `META_PIXEL_ID` + `META_ACCESS_TOKEN`:

- los eventos **se registran** en `MetaEventLog` con su `event_id`,
- **no se envía nada** a Meta (ni de test),
- la pantalla Integraciones → Meta muestra «Solo registro».

Cuando actives credenciales, la cola acumulada se puede procesar con el
botón «Procesar cola».

## Eventos registrados automáticamente

| Evento interno | Disparador real | Evento Meta |
| --- | --- | --- |
| `lead_created` | crear lead | `Lead` |
| `lead_contacted` | lead → estado Contactado | `Contact` |
| `meeting_scheduled` | lead → Reunión agendada | `Schedule` |
| `diagnosis_done` | lead → Diagnóstico hecho | `DiagnosisDone` (custom) |
| `proposal_sent` | lead → Propuesta enviada | `ProposalSent` (custom) |
| `qualified_lead` | (manual/futuro scoring) | `QualifiedLead` (custom) |
| `deal_won` | oportunidad ganada (con valor) | `Purchase` |
| `invoice_paid` | snapshot de factura → Cobrada (con importe) | `Purchase` |
| `recurring_client_started` | recurrente activo creado | `Subscribe` |

## Privacidad (no negociable)

- Email y teléfono **solo hasheados SHA-256** y **solo** si el lead tiene
  `consentStatus` = consentimiento explícito o interés legítimo.
- Sin base legal → evento `skipped_no_consent`: queda registrado para
  métricas internas pero **nunca** se envía.
- `fbp`/`fbc` (cookies de Meta capturadas con el lead) se usan como
  identificadores no-PII cuando existen.
- Deduplicación: cada evento lleva `event_id` UUID (si en el futuro hay
  pixel en la web, Meta deduplica navegador+servidor).

## Activación

```env
META_PIXEL_ID=            # Events Manager → Origen de datos
META_ACCESS_TOKEN=        # Events Manager → Configuración → Token CAPI
META_TEST_EVENT_CODE=TEST12345   # EMPEZAR SIEMPRE EN TEST
META_API_VERSION=v23.0    # revisar versión vigente al activar
```

1. Rellena las variables **con test code** y reinicia la app.
2. Integraciones → Meta → «Procesar cola»: los eventos salen con estado
   `test` y aparecen en Events Manager → Test Events.
3. Verifica nombres y matching; cuando cuadre, quita
   `META_TEST_EVENT_CODE` para enviar en real.

## Reintentos y errores

Envío con hasta 3 intentos por evento; los fallidos guardan `lastError` y
la respuesta cruda de Meta (`metaResponse`) para depurar desde la UI.

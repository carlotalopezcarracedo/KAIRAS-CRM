# Integración con Odoo — KAIRAS OS

**Principio: Odoo es la fuente de verdad fiscal.** KAIRAS OS nunca emite
facturas legales; prepara solicitudes, exporta datos y guarda snapshots.

## Modos (`ODOO_INTEGRATION_MODE`)

| Modo | Estado | Qué hace |
| --- | --- | --- |
| `csv` | ✅ operativo | Export/import por CSV compatibles con Odoo |
| `api` | 🔌 preparado, sin credenciales | Cliente JSON-RPC en `src/integrations/odoo/adapter.ts` |
| `playwright` | ⛔ no implementado a propósito | Solo se implementará con autorización explícita y nunca para emitir facturas |

## Flujo de facturación (modo CSV)

1. **Se genera una solicitud** (`InvoiceDraftRequest`) desde:
   - Finanzas → «Solicitud de factura» (manual),
   - Finanzas → «Desde horas aprobadas» (agrupa TimeEntries aprobadas),
   - Recurrentes → «Facturar ciclo» (avanza el próximo ciclo).
2. **Exportar**: Finanzas → «CSV para Odoo» (o Integraciones → Odoo).
   Las solicitudes pasan a estado `queued` y se registra un `OdooSyncJob`.
3. **Importar en Odoo**: Contabilidad → Facturas de cliente → Importar.
   Las facturas se crean como **borrador**; revisar y validar en Odoo.
4. **Registrar el resultado**: Finanzas → «Registrar factura Odoo» con el
   número real, vinculándola a la solicitud. Esto:
   - marca la solicitud como `created_in_odoo`,
   - bloquea las horas incluidas (`invoiced` + `lockedAt`),
   - habilita el seguimiento de cobro (estados sent/paid/overdue).
5. **Cobro**: cambiar el snapshot a «Cobrada» registra `paidAt` y dispara
   el evento interno `invoice_paid` (cola Meta).

## Contactos

Integraciones → Odoo → «Exportar contactos» genera un CSV `res.partner`
(name, vat, email, phone, street, city, is_company) importable directamente.

## Qué se enviaría por API cuando se active

- Leer/crear contactos (`res.partner`).
- Leer facturas y estados de pago (`account.move`) para sincronizar
  snapshots automáticamente.
- Crear facturas **borrador** desde la cola (nunca validar/emitir).

Activación: rellenar `ODOO_BASE_URL`, `ODOO_DB`, `ODOO_USERNAME`,
`ODOO_API_KEY` y `ODOO_INTEGRATION_MODE=api`. El cliente ya valida
credenciales y falla claro si faltan.

## Logs

Todos los exports/imports quedan en `OdooSyncJob` (tipo, modo, estado,
elementos, errores, archivo) visibles en Integraciones → Odoo.

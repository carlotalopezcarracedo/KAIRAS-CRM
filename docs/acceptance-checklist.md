# Checklist de aceptación — KAIRAS OS

> Última auditoría: 2026-07-05. Estado verificado con lint + build + 2 smoke
> tests + verificación HTTP de todas las rutas autenticadas.

## Leyenda

- ✅ **Funcional**: CRUD completo, validación Zod, datos reales, audit log,
  responsive, estados vacíos.
- 🟡 **Parcial**: funciona el flujo principal, faltan piezas indicadas.
- 🔌 **Preparado sin credenciales**: arquitectura y UI listas; desactivado
  hasta poner variables de entorno.
- ⛔ **Stub**: pantalla declarativa, sin funcionalidad.

## Estado por módulo

| Módulo | Estado | Notas |
| --- | --- | --- |
| Dashboard | ✅ | KPIs reales; los bloques crecen solos al usar los demás módulos |
| Leads | ✅ | + convertir a cliente, + crear oportunidad, eventos Meta |
| Pipeline | ✅ | Kanban solo escritorio (en móvil: cambiar etapa desde detalle, decisión deliberada) |
| Clientes | ✅ | Ficha 360; totales por agregados (no truncados) |
| Proyectos | ✅ | Rentabilidad = presupuesto vs horas × tarifa efectiva |
| Tareas | ✅ | `remindAt` y `recurrence` se guardan pero NO disparan recordatorios (no hay motor de notificaciones) |
| Control horario | ✅ | Timer persistente en BD, bloqueo de facturadas, aviso +8h |
| Tarifas | ✅ | Vigencias con `validFrom/validTo`; sin historial visual de cambios |
| Calendario | ✅ | 6 capas; agrupación por día en Europe/Madrid (corregido para Vercel/UTC) |
| Informes | ✅ | Ranking de clientes se alimenta de snapshots de factura cobrados |
| Recurrentes | ✅ | «Facturar ciclo» es manual; no hay cron que lo haga solo |
| Finanzas / cola | ✅ | Desde manual/horas/recurrente; export CSV Odoo; bloqueo/liberación de horas |
| Settings | ✅ | Perfil, preferencias, contraseña, tarifas |
| Integración Odoo | 🟡 | Modo CSV **operativo** (export facturas + contactos con jobs/logs). Cliente API escrito y probado solo contra validación de config 🔌. **Import** de CSVs de Odoo: no construido. Playwright: no implementado a propósito |
| Integración Meta | 🔌 | Eventos se registran siempre (con consentimiento → hash; sin él → skipped). Envío real: solo con `META_PIXEL_ID`/`META_ACCESS_TOKEN`. El envío HTTP está escrito pero **nunca se ha ejecutado contra Meta real** |
| Propuestas | ⛔ | Stub. Mientras tanto: oportunidad en etapa «Propuesta enviada» |
| Campañas | ⛔ | Stub. Los leads ya guardan UTMs y fuente para cuando llegue |

## Limitaciones conocidas (no maquilladas)

1. El redondeo de tiempo (Ajustes) se aplica **solo al parar el cronómetro**
   (hacia arriba, práctica estándar de facturación); las entradas manuales
   respetan las horas exactas que escribas.
2. **Sin rate limiting en el login** (riesgo bajo: una usuaria, contraseña
   fuerte; documentado en security.md).
3. **Sin recordatorios/notificaciones**: `remindAt` y `nextActionAt` solo se
   ven en Dashboard/Calendario al entrar.
4. **Import CSV** (Toggl/Clockify, Odoo, leads) no construido; solo export.
5. **Informes semanales** agrupan semanas con fecha local del servidor
   (residual menor; con `TZ=Europe/Madrid` en producción es correcto).
6. Kanban drag & drop no funciona con gestos táctiles.
7. `TimeReport` y `Attachment` existen en schema sin UI (preparados).

## Cómo verificar cada bloque

```bash
# Requiere la BD local corriendo (npm run db:dev)
npm run lint            # 0 errores
npm run build           # compila sin tocar la BD (force-dynamic)
npm run smoke           # 2 smoke tests:
#   smoke-lead-flow: validación → crear → filtrar → interacción → estado
#     → audit → soft delete
#   smoke-operations: lead → oportunidad ganada → cliente → proyecto →
#     tarea → timer (sesión única/auto-stop) → tarifa → aprobar horas →
#     solicitud de factura → factura vinculada → horas BLOQUEADAS →
#     cobrada → eventos Meta en cola sin enviar → limpieza
```

Verificación HTTP (con `npm start` o `npm run dev` corriendo): login por
formulario y visitar cada ruta — todas deben dar 200 autenticada y redirigir
a /login sin sesión.

## Revisión manual recomendada (pantallas)

En orden, 15 minutos, mejor desde el móvil también:

1. `/login` — credenciales malas → error visible; buenas → dashboard.
2. `/leads/new` — crear con solo nombre; añadir interacción; cambiar estado;
   botón WhatsApp; convertir en cliente.
3. `/pipeline` — crear desde el lead; arrastrar entre columnas; soltar en
   «Ganada»; comprobar que el lead pasó a Ganado.
4. `/clients/[id]` — KPIs, añadir contacto, nota.
5. `/projects/new` → crear tarea rápida dentro → ▶ iniciar cronómetro desde
   la tarea → verlo correr en la topbar → recargar la página (persiste) →
   parar → entrada en `/time`.
6. `/time` — editar la entrada, marcarla «Aprobada».
7. `/finance/queue/new` — «Desde horas aprobadas» → ver preview → crear.
8. `/finance` — registrar factura Odoo vinculada → la entrada queda
   bloqueada en `/time` → marcar cobrada.
9. `/recurring/new` → «Facturar ciclo» → aparece en la cola.
10. `/calendar` — capas on/off, vista semana, clic en un bloque.
11. `/reports`, `/integrations/meta` (eventos acumulados), `/settings`
    (cambiar contraseña y volver a entrar).

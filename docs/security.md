# Seguridad — KAIRAS OS

> Última revisión: 2026-07-05 (auditoría de consolidación).

## Modelo de amenaza realista

App interna de una sola usuaria con datos de clientes y leads (PII
comercial). Riesgos principales: exposición pública del despliegue, robo de
sesión, fuga de credenciales de integraciones y pérdida de datos.

## Qué está implementado (verificado)

### Autenticación y sesiones

- Auth.js v5 con credenciales; hash de contraseña **bcrypt (coste 12)**.
- Sesión JWT (14 días), cookie httpOnly gestionada por Auth.js.
- Middleware protege **todas** las rutas salvo `/login`, `/api/auth` y
  assets; probado: sin sesión → 307 a /login.
- Cambio de contraseña en Ajustes: exige la actual, mínimo 10 caracteres,
  re-hash y audit log.
- `trustHost: true` + `AUTH_URL` explícita (necesario fuera de Vercel).

### Autorización y mutaciones

- **Todos los server actions** pasan por `requireUser()` (verificado por
  grep en la auditoría: la única excepción es el propio login).
- Los route handlers (exports CSV) también llaman `requireUser()` y
  devuelven 401 (defensa en profundidad tras el middleware).
- Las entradas de tiempo facturadas quedan bloqueadas (`lockedAt`); editar o
  borrar una bloqueada devuelve error explícito.

### Validación y datos

- **Toda entrada de formulario pasa por Zod** en el servidor (verificado:
  todos los actions con FormData hacen `safeParse`).
- IDs de relaciones se verifican contra registros no borrados antes de usar.
- Borrado = soft delete (`deletedAt`); nada se destruye desde la UI.
- React escapa la salida por defecto; no se usa `dangerouslySetInnerHTML`.

### Secretos

- Sin credenciales hardcodeadas en `src/` (verificado por grep).
- `.env*` está en `.gitignore` (solo `.env.example` se commitea).
- Ningún componente cliente lee `process.env` (verificado).
- Tokens de integraciones solo en servidor (`src/integrations/*`).

### Privacidad (Meta CAPI)

- Email/teléfono **solo hasheados SHA-256** y **solo** con
  `consentStatus` ∈ {consentimiento explícito, interés legítimo}.
- Sin base legal → evento `skipped_no_consent`, nunca sale del sistema.
- Sin credenciales configuradas no se hace ninguna llamada externa.

### Cabeceras y logs

- Cabeceras: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`.
- Los logs de error del servidor (`console.error`) no incluyen contraseñas
  ni tokens; el audit log guarda estados antes/después, no secretos.

### Audit log

Registra crear/editar/borrar/cambios de estado/export/import/eventos Meta
con actor, entidad y before/after. No hay UI de consulta todavía: se ve con
`npm run db:studio` → tabla `AuditLog`.

## Riesgos aceptados / pendientes (no maquillados)

| Riesgo | Severidad | Mitigación actual | Pendiente |
| --- | --- | --- | --- |
| Sin rate limiting en login | Media si es público | Contraseña fuerte (mín. 10), una sola cuenta, bcrypt lento | Añadir límite por IP al desplegar (p. ej. Vercel Firewall o upstash/ratelimit) |
| Token Meta viaja como query param a graph.facebook.com | Baja | Es el método documentado por Meta; HTTPS | Vigilar logs del hosting |
| Sin 2FA | Baja | Una usuaria, contraseña fuerte | Considerar passkey/2FA más adelante |
| Sin CSP estricta | Baja | App sin contenido de terceros ni scripts externos | Añadir CSP si se incrustan recursos externos |
| `.env` local contiene el secreto de dev | Baja | Solo dev; producción usa secretos nuevos | Generar `AUTH_SECRET` nuevo al desplegar (checklist) |
| Cuenta única sin roles efectivos | Info | Campo `role` existe (owner) | Roles reales solo si algún día hay más personas |

## Reglas para el futuro

1. Nunca poner tokens en el frontend ni en la BD sin cifrar.
2. Toda mutación nueva: `requireUser()` + Zod + audit.
3. Producción: `AUTH_SECRET` distinto de desarrollo, rotar si se sospecha fuga.
4. Antes de activar Meta en real: empezar con `META_TEST_EVENT_CODE`.
5. El modo Playwright de Odoo requiere autorización explícita de la usuaria
   y nunca debe emitir facturas.

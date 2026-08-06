# Integración con Odoo — KAIRAS OS

**Principio: Odoo es la fuente de verdad fiscal.** KAIRAS consulta sus datos
financieros, pero no crea, valida, edita ni elimina registros en Odoo.

## API de solo lectura

La integración operativa usa la API JSON-2 de Odoo 19:

```txt
POST /json/2/account.move/search_read
```

El modelo y el método están fijados en el cliente. No existe un ejecutor RPC
genérico ni métodos `create`, `write`, `unlink` o `action_post`.

Datos mostrados en `/finance`:

- facturas y rectificativas de cliente;
- cliente, fecha y vencimiento;
- estado contable y estado de cobro;
- base, impuestos, total y saldo pendiente;
- resumen facturado, cobrado, pendiente y vencido.

La consulta se hace en vivo. Estos registros no se copian a PostgreSQL ni se
crean `OdooSyncJob` por cada lectura.

## Variables

```env
ODOO_BASE_URL=https://tu-instancia.odoo.com
ODOO_DB=
ODOO_USERNAME=bot-kairas@tu-dominio.com
ODOO_API_KEY=
ODOO_INTEGRATION_MODE=api
```

- `ODOO_BASE_URL`: origen de la instancia. Aunque se configure una ruta como
  `/odoo`, KAIRAS la normaliza al origen requerido por JSON-2.
- `ODOO_DB`: opcional. Solo se envía como `X-Odoo-Database` si contiene un
  nombre de base válido. Una URL se ignora para evitar seleccionar una base
  incorrecta.
- `ODOO_USERNAME`: referencia del usuario bot; JSON-2 autentica con la API key.
- `ODOO_API_KEY`: secreto de servidor, nunca se expone al navegador.

## Garantía completa de solo lectura

La aplicación no contiene operaciones de escritura, pero la API key hereda los
permisos de su usuario en Odoo. Para limitar también la credencial:

1. Crear un usuario bot dedicado para KAIRAS.
2. Darle acceso de lectura a Contabilidad y al modelo `account.move`.
3. Desactivar `Write`, `Create` y `Delete` en sus ACL/grupos.
4. Generar una API key exclusiva para esta integración.
5. Rotarla antes de que caduque y actualizarla en Vercel.

Los permisos de Odoo son aditivos: si otro grupo del bot concede escritura,
esa escritura seguirá permitida. Hay que revisar todos sus grupos.

## Modo CSV heredado

El modo `csv` sigue disponible para exportaciones manuales, pero se oculta en
la interfaz cuando `ODOO_INTEGRATION_MODE=api`. Ninguna exportación CSV llama a
la API de Odoo.

## Diagnóstico

- `401`: API key inválida o caducada.
- `403`: el usuario no puede leer Contabilidad.
- `404`: host/base incorrectos o JSON-2 no disponible.
- timeout: Odoo no respondió dentro del límite de la consulta.

La pantalla `/integrations/odoo` comprueba la conexión con una lectura real y
`/finance` muestra los datos financieros.

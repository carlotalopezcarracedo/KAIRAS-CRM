# Guía de uso — KAIRAS OS

> Esta guía también vive dentro de la app: **Sistema → Guía de uso** (`/guide`).
> Aquí queda la versión de referencia en el repo.

## 01 · El sistema en una frase

KAIRAS OS sigue el recorrido real del dinero:
**Lead → Oportunidad → Cliente → Proyecto → Horas → Factura → Cobro.**
Si dudas dónde va algo, pregúntate: *¿en qué punto del recorrido está este dinero?*

- **Lead**: alguien que podría comprar. Sin compromiso todavía.
- **Oportunidad**: dinero concreto en juego con ese lead/cliente. Vive en el Pipeline.
- **Cliente**: ya te ha comprado o firmado. Su ficha centraliza todo.
- **Proyecto**: el trabajo que ejecutas para un cliente.
- **Tareas y Tiempo**: lo que haces cada día y cuánto te cuesta.
- **Finanzas**: qué falta por facturar y por cobrar (la factura legal la emite Odoo).

## 02 · ¿Lead o Cliente? La regla de oro

**Lead hasta que paga (o firma). Cliente a partir de ahí.** No crees clientes
"por si acaso": un restaurante con propuesta enviada es un lead con
oportunidad, aunque parezca seguro.

Cuando un lead dice que sí: ficha del lead → **«Convertir en cliente»**.
Crea el cliente, vincula sus oportunidades y conserva el historial. Nunca
dupliques a mano. El lead no se borra: queda enlazado como origen del cliente.

## 03 · El Pipeline

Tu **dinero posible ordenado por cercanía al sí**. Cada tarjeta es una
oportunidad con valor estimado y probabilidad; las columnas son etapas
(detectada → cualificada → diagnóstico → propuesta → seguimiento →
negociación → ganada/perdida).

- **Valor ponderado** = valor × probabilidad: tu previsión realista.
- Arrastra tarjetas entre columnas (en móvil: cambia la etapa desde el detalle).
- **Ganada** pide el valor aceptado y marca el lead como ganado (conviértelo
  en cliente). **Perdida** pide el motivo — dentro de unos meses ese dato vale oro.
- **Regla de oro: ninguna oportunidad sin siguiente acción.** El dashboard
  avisa de las huérfanas.

## 04 · Interacciones y seguimientos

Cada contacto con un lead (llamada, WhatsApp, reunión) se registra con
**+ Interacción** desde su ficha, fijando ahí la **siguiente acción y fecha**.
Eso alimenta la vista Hoy y la capa «Seguimientos» del calendario. La memoria
del negocio vive aquí.

## 05 · Cómo organizar las tareas

Una **tarea** es algo que TÚ haces («maquetar la home»). Esperar/contactar a
alguien es un **seguimiento** → va como siguiente acción del lead, no como
tarea. Así la lista no se llena de ruido.

- **Asocia siempre** la tarea a proyecto o cliente.
- **Prioridades honestas**: urgente = hoy sí o sí.
- Trabaja desde **Hoy**; revisa **Vencidas** cada mañana: hacer, reprogramar o cancelar.
- Usa el **checklist** interno para pasos; no crees microtareas.
- El **▶** de cada tarea arranca el cronómetro ya asociado a su cliente/proyecto.

## 06 · El tiempo (tu Toggl integrado)

Cronómetro en el topbar, uno solo activo (arrancar otro guarda el anterior),
sobrevive a recargas, avisa a las 8 h.

- Olvidos → **entrada manual** con inicio/fin. Editable hasta facturar.
- Marca **facturable vs interno** siempre; el importe sale de tu tarifa
  (proyecto > cliente > servicio > global, en Ajustes → Tarifas).
- Flujo de hora facturable: **borrador → aprobada → en cola → facturada**
  (bloqueada). «Aprobada» = lista para cobrar; márcalo al revisar la semana.

## 07 · Proyectos

Créalo cuando el trabajo es real. Rellena **alcance** y sobre todo **fuera de
alcance** (vacuna contra el «ya que estás…»). La **rentabilidad estimada**
compara presupuesto vs horas × tarifa: por debajo del 30%, el proyecto te come.

## 08 · Recurrentes

Cuotas mensuales (redes, mantenimiento…) = **recurrentes**. Su suma es tu
**MRR**. Cuando toca el ciclo: **«Facturar ciclo»** crea la solicitud y
programa el siguiente.

## 09 · Facturación (KAIRAS OS prepara, Odoo emite)

1. **Solicitud de factura**: manual, desde **horas aprobadas** (agrupadas por
   proyecto) o desde un recurrente.
2. **CSV para Odoo** → importar en Odoo (Contabilidad → Facturas) → revisar y
   validar allí.
3. **Registrar la factura** en Finanzas con su número real, vinculada a la
   solicitud → las horas quedan bloqueadas como facturadas.
4. Cuando entra el dinero → **Cobrada**. Los informes beben de ahí.

## 10 · Calendario

6 capas activables: agenda, tareas, entregas, seguimientos, cierres previstos
y horas trabajadas. Presets: **Agenda** (planificar), **Horas** (revisar la
semana tipo Toggl), **Todo**. Cada bloque enlaza a su ficha.

## 11 · Archivos

Propuestas, contratos, briefings y capturas: en la ficha de su lead, cliente,
oportunidad, proyecto o tarea (máx. 4 MB, o enlaces de Drive). Privados —
solo con tu sesión. Regla: **el documento vive donde vive la conversación**.

## 12 · Rutina recomendada

**Cada mañana (2 min)** — dashboard: alertas → resolver o reprogramar;
«Hoy toca» = el plan; al ponerte a trabajar, ▶ cronómetro.

**Cada viernes (15 min)**: pipeline con siguiente acción en todo (muertas →
Perdida con motivo); aprobar horas facturables; recurrentes y horas → cola →
CSV a Odoo; backup: `npx dotenv -e .env.supabase -- npm run data:export`.

**Cada mes** — Informes: funnel, rentabilidad por proyecto, ranking de
clientes, ratio facturable.

## 13 · Chuleta rápida

| Quiero… | Hago… |
| --- | --- |
| Apuntar un posible cliente | Leads → Nuevo lead |
| Registrar que le he escrito | Ficha del lead → + Interacción → siguiente acción |
| Ponerle dinero a un contacto | Ficha del lead → + Oportunidad |
| Me han dicho que sí | Oportunidad → Ganada → Convertir en cliente |
| Empezar el trabajo | Cliente → + Proyecto (alcance / fuera de alcance) |
| Trabajar y que cuente | ▶ en la tarea o cronómetro del topbar |
| Cobrar horas sueltas | Tiempo → aprobar → Finanzas → Desde horas aprobadas |
| Facturar la cuota del mes | Recurrentes → Facturar ciclo |
| Guardar una propuesta PDF | Ficha del lead/oportunidad → Archivos |
| Ver cómo va el negocio | Informes (y el dashboard cada mañana) |

> Propuestas y Campañas están en construcción: mientras tanto, propuesta =
> oportunidad en «Propuesta enviada» + PDF adjunto.

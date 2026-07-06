import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";

export const metadata: Metadata = { title: "Guía de uso" };

function Section({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card id={`s${number}`}>
      <CardBody className="space-y-3">
        <h2 className="flex items-baseline gap-3 text-lg font-bold text-foam">
          <span className="font-mono text-sm text-lavender">{number}</span>
          {title}
        </h2>
        <div className="space-y-3 text-sm leading-relaxed text-mist">{children}</div>
      </CardBody>
    </Card>
  );
}

function Term({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-foam">{children}</strong>;
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-violet-line bg-violet-soft/40 px-4 py-3 text-lavender">
      {children}
    </p>
  );
}

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Guía de uso"
        subtitle="Cómo pensar y usar KAIRAS OS en el día a día"
      />

      <div className="space-y-5">
        <Section number="01" title="El sistema en una frase">
          <p>
            KAIRAS OS sigue el recorrido real del dinero:{" "}
            <Term>Lead → Oportunidad → Cliente → Proyecto → Horas → Factura → Cobro</Term>.
            Cada módulo es una etapa de ese recorrido. Si dudas dónde va algo,
            pregúntate: <em>¿en qué punto del recorrido está este dinero?</em>
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li><Term>Lead</Term>: alguien que podría comprar. Todavía no hay compromiso.</li>
            <li><Term>Oportunidad</Term>: dinero concreto en juego con ese lead (o cliente). Vive en el Pipeline.</li>
            <li><Term>Cliente</Term>: ya te ha comprado o firmado. Su ficha centraliza todo.</li>
            <li><Term>Proyecto</Term>: el trabajo que ejecutas para un cliente.</li>
            <li><Term>Tareas y Tiempo</Term>: lo que haces cada día y cuánto te cuesta.</li>
            <li><Term>Finanzas</Term>: qué falta por facturar y por cobrar (la factura legal la emite Odoo).</li>
          </ul>
        </Section>

        <Section number="02" title="¿Lead o Cliente? La regla de oro">
          <p>
            <Term>Lead hasta que paga (o firma). Cliente a partir de ahí.</Term>{" "}
            No crees clientes «por si acaso»: un restaurante al que le enviaste
            propuesta es un lead con oportunidad, aunque parezca seguro.
          </p>
          <p>
            Cuando un lead te dice que sí: abre su ficha y pulsa{" "}
            <Term>«Convertir en cliente»</Term>. Eso crea el cliente con sus
            datos, vincula sus oportunidades y mantiene el historial. Nunca
            dupliques a mano.
          </p>
          <Tip>
            El lead no se borra al convertirse: queda enlazado a la ficha del
            cliente como su origen, con todas las interacciones que hubo antes.
          </Tip>
        </Section>

        <Section number="03" title="El Pipeline: qué es y cómo usarlo">
          <p>
            El pipeline es tu <Term>dinero posible ordenado por cercanía al sí</Term>.
            Cada tarjeta es una oportunidad con un valor estimado y una
            probabilidad. Las columnas son etapas: detectada → cualificada →
            diagnóstico → propuesta → seguimiento → negociación → ganada/perdida.
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <Term>Valor ponderado</Term> = valor × probabilidad. 10.000 € al
              20% pesan menos que 3.000 € al 90%. Es tu previsión realista.
            </li>
            <li>
              Arrastra las tarjetas entre columnas (en móvil: entra en la
              oportunidad y cambia la etapa).
            </li>
            <li>
              Al marcar <Term>Ganada</Term> se te pide el valor aceptado y el
              lead pasa a Ganado (conviértelo en cliente). Al marcar{" "}
              <Term>Perdida</Term>, apunta el motivo: dentro de unos meses ese
              dato vale oro.
            </li>
          </ul>
          <Tip>
            Regla de oro: <strong>ninguna oportunidad sin siguiente acción</strong>.
            El dashboard te avisa de las que se quedan huérfanas — son dinero
            enfriándose.
          </Tip>
        </Section>

        <Section number="04" title="Interacciones y seguimientos">
          <p>
            Cada vez que hables con un lead (llamada, WhatsApp, reunión…),
            regístralo con <Term>+ Interacción</Term> desde su ficha. Ahí mismo
            puedes fijar la <Term>siguiente acción y su fecha</Term> — eso es lo
            que alimenta la vista Hoy del dashboard y la capa «Seguimientos» del
            calendario.
          </p>
          <p>
            La memoria del negocio vive aquí: dentro de tres semanas no
            recordarás qué te dijo Pontetapas. La interacción de 15 segundos sí.
          </p>
        </Section>

        <Section number="05" title="Cómo organizar las tareas">
          <p>
            Una <Term>tarea</Term> es algo que TÚ tienes que hacer («maquetar la
            home», «preparar propuesta»). Un <Term>seguimiento comercial</Term>{" "}
            es esperar/contactar a alguien — eso va como siguiente acción del
            lead, no como tarea. Así tu lista de tareas no se llena de ruido.
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <Term>Asocia siempre</Term> la tarea a su proyecto o cliente: así
              la ficha 360 y la rentabilidad cuentan la historia completa.
            </li>
            <li>
              <Term>Prioridades honestas</Term>: si todo es urgente, nada lo es.
              Urgente = hoy sí o sí.
            </li>
            <li>
              Trabaja desde la pestaña <Term>Hoy</Term>; revisa{" "}
              <Term>Vencidas</Term> cada mañana y decide: hacer, reprogramar o
              cancelar. Vencida ≠ decoración.
            </li>
            <li>
              Usa el <Term>checklist</Term> dentro de la tarea para los pasos
              («diseñar → revisar → publicar») en vez de crear microtareas.
            </li>
            <li>
              El botón <Term>▶</Term> de cada tarea arranca el cronómetro ya
              asociado a su cliente y proyecto. Es el gesto más rentable de la app.
            </li>
          </ul>
        </Section>

        <Section number="06" title="El tiempo: tu Toggl integrado">
          <p>
            El cronómetro vive arriba, en todas las pantallas. Solo hay uno
            activo: si arrancas otro, el anterior se guarda solo. Sobrevive a
            recargas y cambios de página, y te avisa si lleva más de 8 horas
            corriendo.
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              ¿Se te olvidó? Crea una <Term>entrada manual</Term> con inicio y
              fin. Todo es editable después (hasta que se factura).
            </li>
            <li>
              <Term>Facturable vs interno</Term>: márcalo siempre. El importe se
              calcula solo con tu tarifa (Ajustes → Tarifas: por proyecto &gt;
              cliente &gt; servicio &gt; global).
            </li>
            <li>
              Flujo de una hora facturable:{" "}
              <Term>borrador → aprobada → en cola de factura → facturada</Term>.
              «Aprobada» significa <em>lista para cobrar</em>; márcalo al revisar
              la semana. Una vez facturada, la entrada queda bloqueada.
            </li>
            <li>
              Las gráficas de Tiempo responden a: ¿en qué se me fue la semana?
              ¿qué cliente consume más? ¿cuánto de lo trabajado es facturable?
            </li>
          </ul>
        </Section>

        <Section number="07" title="Proyectos: alcance y rentabilidad">
          <p>
            Crea el proyecto cuando el trabajo es real (propuesta aceptada).
            Rellena <Term>alcance</Term> y sobre todo{" "}
            <Term>fuera de alcance</Term>: es tu vacuna contra el «ya que
            estás…». La ficha muestra la <Term>rentabilidad estimada</Term>:
            presupuesto vs horas registradas × tarifa — si baja del 30%, el
            proyecto te está comiendo.
          </p>
        </Section>

        <Section number="08" title="Recurrentes: tu suelo de ingresos">
          <p>
            Redes sociales mensuales, mantenimientos, cuotas… cada uno es un{" "}
            <Term>recurrente</Term> con su importe y periodicidad. Su suma es tu{" "}
            <Term>MRR</Term>: el dinero que entra sin vender nada nuevo. Cuando
            toca el ciclo, el botón <Term>«Facturar ciclo»</Term> crea la
            solicitud en la cola y programa el siguiente.
          </p>
        </Section>

        <Section number="09" title="Facturación: KAIRAS OS prepara, Odoo emite">
          <p>
            Aquí no se emiten facturas legales — eso es de Odoo. El flujo:
          </p>
          <ol className="list-decimal space-y-1.5 pl-5">
            <li>
              Se crea una <Term>solicitud de factura</Term>: manual, desde{" "}
              <Term>horas aprobadas</Term> (las agrupa por proyecto) o desde un
              recurrente.
            </li>
            <li>
              <Term>«CSV para Odoo»</Term> descarga el archivo; lo importas en
              Odoo (Contabilidad → Facturas → Importar) y ahí revisas y validas.
            </li>
            <li>
              Vuelves a Finanzas y <Term>registras la factura</Term> con su
              número real, vinculándola a la solicitud: las horas incluidas se
              bloquean como facturadas.
            </li>
            <li>
              Cuando entre el dinero, cámbiala a <Term>Cobrada</Term>. Los
              informes de ingresos beben de ahí.
            </li>
          </ol>
        </Section>

        <Section number="10" title="Calendario: capas, no sopa">
          <p>
            Es un calendario con 6 capas activables: agenda (reuniones que creas
            tú), tareas con fecha, entregas de proyecto, seguimientos
            comerciales, cierres previstos y horas trabajadas. Los presets
            resuelven el 90%: <Term>Agenda</Term> para planificar,{" "}
            <Term>Horas</Term> para revisar la semana tipo Toggl,{" "}
            <Term>Todo</Term> para la foto completa. Cada bloque te lleva a su
            ficha.
          </p>
        </Section>

        <Section number="11" title="Archivos">
          <p>
            Propuestas, contratos, briefings y capturas se adjuntan en la ficha
            de su lead, cliente, oportunidad, proyecto o tarea (máx. 4 MB;
            también puedes guardar enlaces de Drive). Son privados: solo se
            accede con tu sesión. Regla: <Term>el documento vive donde vive la
            conversación</Term> — la propuesta de un lead, en el lead.
          </p>
        </Section>

        <Section number="12" title="Tu rutina con KAIRAS OS">
          <p><Term>Cada mañana (2 minutos)</Term> — abre el dashboard:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>¿Alertas? Resuélvelas o reprográmalas, no las dejes criar.</li>
            <li>«Hoy toca»: seguimientos y tareas del día. Ese es el plan.</li>
            <li>Al empezar a trabajar: ▶ cronómetro. Siempre.</li>
          </ul>
          <p className="pt-1"><Term>Cada viernes (15 minutos)</Term>:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Pipeline: cada oportunidad con siguiente acción y fecha. Las muertas, a Perdida con motivo.</li>
            <li>Tiempo: revisa la semana y marca «Aprobada» lo facturable.</li>
            <li>Recurrentes y horas aprobadas → solicitudes de factura → CSV a Odoo.</li>
            <li>
              Backup: en tu ordenador,{" "}
              <code className="rounded bg-ink px-1.5 py-0.5 text-xs text-lavender">
                npx dotenv -e .env.supabase -- npm run data:export
              </code>{" "}
              y guarda el archivo en Drive.
            </li>
          </ul>
          <p className="pt-1"><Term>Cada mes</Term>: Informes — funnel de conversión,
            rentabilidad por proyecto, ranking de clientes y ratio facturable.
            Tres decisiones salen solas: qué canal empujar, qué cliente
            renegociar y qué trabajo interno recortar.</p>
        </Section>

        <Section number="13" title="Chuleta rápida">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="k-label py-2 pr-4">Quiero…</th>
                  <th className="k-label py-2">Hago…</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {[
                  ["Apuntar un posible cliente", "Leads → Nuevo lead (con solo el nombre vale)"],
                  ["Registrar que le he escrito", "Ficha del lead → + Interacción → siguiente acción"],
                  ["Ponerle dinero a un contacto", "Ficha del lead → + Oportunidad"],
                  ["Me han dicho que sí", "Oportunidad → Ganada → lead → Convertir en cliente"],
                  ["Empezar el trabajo", "Cliente → + Proyecto (con alcance y fuera de alcance)"],
                  ["Trabajar y que cuente", "▶ en la tarea (o cronómetro del topbar)"],
                  ["Cobrar horas sueltas", "Tiempo → aprobar → Finanzas → Desde horas aprobadas"],
                  ["Facturar la cuota del mes", "Recurrentes → Facturar ciclo"],
                  ["Guardar una propuesta PDF", "Ficha del lead/oportunidad → Archivos"],
                  ["Ver cómo va el negocio", "Informes (y el dashboard cada mañana)"],
                ].map(([want, how]) => (
                  <tr key={want}>
                    <td className="py-2 pr-4 font-medium text-foam">{want}</td>
                    <td className="py-2 text-mist">{how}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="pt-2 text-xs text-faint">
            Propuestas y Campañas están en construcción: mientras tanto, una
            propuesta = oportunidad en etapa «Propuesta enviada» + PDF adjunto.
          </p>
        </Section>

        <p className="pb-4 text-center text-xs text-faint">
          ¿Dudas técnicas (backups, despliegue, integraciones)? Están en la
          carpeta <code>docs/</code> del proyecto ·{" "}
          <Link href="/dashboard" className="text-lavender hover:underline">
            Volver al dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}

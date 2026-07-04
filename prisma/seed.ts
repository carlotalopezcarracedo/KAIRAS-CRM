/**
 * Seed de KAIRAS OS.
 * - Crea/actualiza la usuaria inicial (desde SEED_USER_* en .env).
 * - Crea el catálogo base de servicios (editable después desde la app).
 * - Crea la tarifa horaria global por defecto.
 * - Crea settings iniciales.
 *
 * No crea leads, clientes ni datos comerciales falsos.
 * Ejecutar: npm run db:seed
 */
import { PrismaClient, ServiceCategory, BillingUnit } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SERVICES: {
  slug: string;
  name: string;
  category: ServiceCategory;
  description: string;
  billingUnit: BillingUnit;
  canBeRecurring: boolean;
}[] = [
  {
    slug: "automation_ai",
    name: "Automatización e IA aplicada",
    category: "automation_ai",
    description:
      "Agentes conversacionales, flujos con IA, automatización de tareas repetitivas, clasificación de leads, asistentes internos.",
    billingUnit: "project",
    canBeRecurring: true,
  },
  {
    slug: "custom_software",
    name: "Software a medida",
    category: "custom_software",
    description:
      "CRMs propios, dashboards, portales internos, coordinadores digitales, apps internas.",
    billingUnit: "project",
    canBeRecurring: false,
  },
  {
    slug: "website",
    name: "Web",
    category: "website",
    description:
      "Webs corporativas, landings, integraciones de formularios, optimización de conversión.",
    billingUnit: "project",
    canBeRecurring: false,
  },
  {
    slug: "website_maintenance",
    name: "Mantenimiento web",
    category: "website_maintenance",
    description: "Mantenimiento, ajustes, responsive, soporte continuo.",
    billingUnit: "month",
    canBeRecurring: true,
  },
  {
    slug: "social_media_management",
    name: "Gestión de redes sociales",
    category: "social_media_management",
    description:
      "Gestión mensual, planificación, copy, diseño, grabación, edición, publicaciones recurrentes.",
    billingUnit: "month",
    canBeRecurring: true,
  },
  {
    slug: "content_creation",
    name: "Creación de contenido",
    category: "content_creation",
    description: "Contenido puntual: piezas, campañas de contenido, producción.",
    billingUnit: "piece",
    canBeRecurring: false,
  },
  {
    slug: "meta_ads",
    name: "Meta Ads",
    category: "meta_ads",
    description: "Campañas en Meta Ads: estrategia, montaje, seguimiento de leads.",
    billingUnit: "month",
    canBeRecurring: true,
  },
  {
    slug: "marketing_strategy",
    name: "Estrategia de marketing",
    category: "marketing_strategy",
    description: "Estrategia, comunicación, identidad verbal, propuestas.",
    billingUnit: "project",
    canBeRecurring: false,
  },
  {
    slug: "branding_naming",
    name: "Branding y naming",
    category: "branding_naming",
    description: "Naming, identidad, auditorías de marca, propuestas visuales.",
    billingUnit: "project",
    canBeRecurring: false,
  },
  {
    slug: "consulting",
    name: "Consultoría",
    category: "consulting",
    description: "Consultoría ligera de operaciones, procesos y digitalización.",
    billingUnit: "hour",
    canBeRecurring: false,
  },
  {
    slug: "audiovisual",
    name: "Producción audiovisual",
    category: "audiovisual",
    description: "Producción audiovisual puntual si se decide integrarla.",
    billingUnit: "piece",
    canBeRecurring: false,
  },
  {
    slug: "other",
    name: "Otros servicios",
    category: "other",
    description: "Servicios puntuales fuera de catálogo.",
    billingUnit: "other",
    canBeRecurring: false,
  },
];

async function main() {
  // 1. Usuaria inicial
  const email = process.env.SEED_USER_EMAIL?.toLowerCase().trim();
  const name = process.env.SEED_USER_NAME ?? "KAIRAS";
  const password = process.env.SEED_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Faltan SEED_USER_EMAIL o SEED_USER_PASSWORD en .env — no se puede crear la usuaria inicial.",
    );
  }
  if (password.length < 8) {
    throw new Error("SEED_USER_PASSWORD debe tener al menos 8 caracteres.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: { name },
    create: { email, name, passwordHash, role: "owner" },
  });
  console.log(`✓ Usuaria: ${user.email}`);

  // 2. Catálogo de servicios
  for (const s of SERVICES) {
    await prisma.service.upsert({
      where: { slug: s.slug },
      update: {},
      create: s,
    });
  }
  console.log(`✓ Servicios base: ${SERVICES.length}`);

  // 3. Tarifa horaria global por defecto (editable en Ajustes)
  const existingGlobalRate = await prisma.hourlyRate.findFirst({
    where: { scope: "global", active: true },
  });
  if (!existingGlobalRate) {
    await prisma.hourlyRate.create({
      data: {
        scope: "global",
        rate: 45,
        currency: "EUR",
        notes: "Tarifa global por defecto. Ajusta este valor en Ajustes.",
      },
    });
    console.log("✓ Tarifa horaria global: 45 €/h");
  }

  // 4. Settings iniciales
  const defaults: Record<string, unknown> = {
    "company.profile": {
      brandName: "KAIRAS",
      legalName: "",
      vatId: "",
      email: "",
      phone: "",
      address: "",
      web: "",
      instagram: "",
    },
    "app.defaults": {
      currency: "EUR",
      timezone: "Europe/Madrid",
      vatRate: 21,
      timeRounding: 0, // minutos: 0 = sin redondeo
    },
    "leads.sources_enabled": [
      "instagram_cold",
      "instagram_inbound",
      "meta_ads",
      "website",
      "whatsapp",
      "referral",
      "door_to_door",
      "cold_call",
      "email",
      "linkedin",
      "existing_client",
      "networking",
      "other",
    ],
  };

  for (const [key, value] of Object.entries(defaults)) {
    await prisma.settings.upsert({
      where: { key },
      update: {},
      create: { key, value: value as object },
    });
  }
  console.log(`✓ Settings iniciales: ${Object.keys(defaults).length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

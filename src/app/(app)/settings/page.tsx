import type { Metadata } from "next";
import { IntentLink as Link } from "@/components/navigation/intent-link";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/server/auth";
import {
  getCompanyProfile,
  getAppDefaults,
  getExpenseDefaults,
} from "@/server/services/settings-service";
import {
  CompanyProfileForm,
  AppDefaultsForm,
  ExpenseDefaultsForm,
  PasswordForm,
} from "./settings-forms";

export const metadata: Metadata = { title: "Ajustes" };

export default async function SettingsPage() {
  const [profile, defaults, expenseDefaults, session] = await Promise.all([
    getCompanyProfile(),
    getAppDefaults(),
    getExpenseDefaults(),
    auth(),
  ]);

  return (
    <div>
      <PageHeader
        title="Ajustes"
        subtitle={session?.user?.email ?? undefined}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Datos de KAIRAS</CardTitle>
          </CardHeader>
          <CardBody>
            <CompanyProfileForm profile={profile} />
          </CardBody>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Preferencias</CardTitle>
            </CardHeader>
            <CardBody>
              <AppDefaultsForm defaults={defaults} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Gastos de viaje</CardTitle>
            </CardHeader>
            <CardBody>
              <ExpenseDefaultsForm defaults={expenseDefaults} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Seguridad</CardTitle>
            </CardHeader>
            <CardBody>
              <PasswordForm />
            </CardBody>
          </Card>
        </div>

        <Link
          href="/settings/rates"
          className="group flex items-center justify-between rounded-card border border-line bg-surface p-5 transition-colors hover:border-line-strong"
        >
          <div>
            <p className="text-sm font-bold text-foam">Tarifas horarias</p>
            <p className="mt-0.5 text-xs text-mist">
              Global, por cliente, por proyecto y por servicio. Con vigencias.
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-faint transition-transform group-hover:translate-x-1 group-hover:text-lavender" />
        </Link>

        <Link
          href="/services"
          className="group flex items-center justify-between rounded-card border border-line bg-surface p-5 transition-colors hover:border-line-strong"
        >
          <div>
            <p className="text-sm font-bold text-foam">Catálogo de servicios</p>
            <p className="mt-0.5 text-xs text-mist">
              Precios, IVA, unidades de facturación y recurrencia.
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-faint transition-transform group-hover:translate-x-1 group-hover:text-lavender" />
        </Link>

        <Link
          href="/integrations"
          className="group flex items-center justify-between rounded-card border border-line bg-surface p-5 transition-colors hover:border-line-strong"
        >
          <div>
            <p className="text-sm font-bold text-foam">Integraciones</p>
            <p className="mt-0.5 text-xs text-mist">
              Odoo (fiscal) y Meta Conversions API. Estado y logs.
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-faint transition-transform group-hover:translate-x-1 group-hover:text-lavender" />
        </Link>

        <div className="rounded-card border border-line bg-surface p-5">
          <p className="text-sm font-bold text-foam">Backups</p>
          <p className="mt-0.5 text-xs text-mist">
            En local, los datos viven en el servidor Prisma dev. La estrategia
            completa (frecuencia, comandos pg_dump, restauración y proveedores)
            está documentada en{" "}
            <code className="text-lavender">docs/backups.md</code> y el paso a
            producción en <code className="text-lavender">docs/deployment.md</code>.
          </p>
        </div>
      </div>
    </div>
  );
}

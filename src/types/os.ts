// KAIRAS OS — tipos compartidos del módulo de conocimiento.
// Solo tipos + constantes del módulo. No modifica nada del CRM.

import type {
  OsEntryType,
  OsStatus,
  OsAuthority,
  OsBusinessLine,
  OsMessageLayer,
  OsRelationType,
} from "@prisma/client";

export type {
  OsEntryType,
  OsStatus,
  OsAuthority,
  OsBusinessLine,
  OsMessageLayer,
  OsRelationType,
};

/** Áreas navegables de KAIRAS OS (slug de ruta /os/[area]). */
export type OsAreaSlug =
  | "identidad"
  | "marca"
  | "comunicacion"
  | "oferta"
  | "comercial"
  | "clientes"
  | "contenidos"
  | "validacion"
  | "playbooks"
  | "recursos"
  | "constitucion";

/** Forma tipada del campo `meta` de una entrada (unión laxa por tipo). */
export type OsEntryMeta = Record<string, unknown> | null | undefined;

export type OsListFilters = {
  area?: OsAreaSlug;
  type?: OsEntryType;
  status?: OsStatus;
  sector?: string;
  tag?: string;
  q?: string;
};

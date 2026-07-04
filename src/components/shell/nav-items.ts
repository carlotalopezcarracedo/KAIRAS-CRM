import {
  LayoutDashboard,
  Users,
  KanbanSquare,
  Building2,
  FolderKanban,
  CheckSquare,
  Clock3,
  CalendarDays,
  Package,
  FileText,
  Repeat2,
  Wallet,
  Megaphone,
  Plug,
  Settings,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };
export type NavSection = { label: string; items: NavItem[] };

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Operativa",
    items: [
      { href: "/dashboard", label: "Hoy", icon: LayoutDashboard },
      { href: "/tasks", label: "Tareas", icon: CheckSquare },
      { href: "/time", label: "Tiempo", icon: Clock3 },
      { href: "/calendar", label: "Calendario", icon: CalendarDays },
    ],
  },
  {
    label: "Comercial",
    items: [
      { href: "/leads", label: "Leads", icon: Users },
      { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
      { href: "/proposals", label: "Propuestas", icon: FileText },
      { href: "/campaigns", label: "Campañas", icon: Megaphone },
    ],
  },
  {
    label: "Clientes",
    items: [
      { href: "/clients", label: "Clientes", icon: Building2 },
      { href: "/projects", label: "Proyectos", icon: FolderKanban },
      { href: "/services", label: "Servicios", icon: Package },
      { href: "/recurring", label: "Recurrentes", icon: Repeat2 },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/finance", label: "Finanzas", icon: Wallet },
      { href: "/reports", label: "Informes", icon: BarChart3 },
      { href: "/integrations", label: "Integraciones", icon: Plug },
      { href: "/settings", label: "Ajustes", icon: Settings },
    ],
  },
];

export const MOBILE_NAV: NavItem[] = [
  { href: "/dashboard", label: "Hoy", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/tasks", label: "Tareas", icon: CheckSquare },
  { href: "/menu", label: "Más", icon: Settings },
];

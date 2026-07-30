# Mapa de navegación — KAIRAS OS

## Rutas canónicas

```text
/os
├─ /os/marca
├─ /os/visual
├─ /os/comunicacion
├─ /os/oferta
├─ /os/playbooks
├─ /os/aprendizaje
├─ /os/contenidos
├─ /os/recursos
├─ /os/constitucion
├─ /os/buscar
├─ /os/favoritos
├─ /os/nuevo
└─ /os/e/[id]
   └─ /os/e/[id]/editar
```

## Compatibilidad

Las rutas anteriores siguen resolviendo y redirigen a su destino canónico:

| Ruta anterior | Destino |
| --- | --- |
| `/os/estrategia` | `/os/marca` |
| `/os/marketing` | `/os/comunicacion` |
| `/os/comercial` | `/os/oferta` |
| `/os/clientes` | `/os/oferta` |
| `/os/procesos` | `/os/playbooks` |

No se elimina ninguna ruta del CRM.

## Desktop

```text
Sidebar CRM
  └─ Conocimiento / KAIRAS OS
       ┌──────────────────┬─────────────────────────────────┐
       │ Sidebar OS       │ Topbar contextual               │
       │ Inicio           │ Buscar / Cmd-K                  │
       │ Marca            ├─────────────────────────────────┤
       │ Manual visual    │ Contenido de la ruta            │
       │ Comunicación     │                                 │
       │ Oferta/clientes  │                                 │
       │ Playbooks        │                                 │
       │ Aprendizaje      │                                 │
       │ Contenidos       │                                 │
       │ Recursos         │                                 │
       │ Constitución     │                                 │
       └──────────────────┴─────────────────────────────────┘
```

## Tablet y móvil

- el sidebar interior desaparece;
- una barra horizontal desplazable conserva las diez áreas;
- el buscador sigue visible;
- la navegación principal del CRM permanece intacta;
- las cards pasan a una columna cuando es necesario;
- ninguna acción depende de hover.

## Accesos directos

La home expone cuatro entradas de alta frecuencia:

- Manual visual;
- Oferta y clientes;
- Decisiones;
- Comunicación.

El resto permanece a un clic desde la navegación interior.

## Breadcrumb de detalle

```text
KAIRAS OS → Área canónica → Entrada
```

La URL de detalle es estable (`/os/e/[id]`) aunque la clasificación visible
cambie en el futuro.

## Teclado

- `Cmd/Ctrl + K`: abrir búsqueda;
- `Esc`: cerrar;
- flechas: recorrer resultados;
- `Enter`: abrir resultado.

La navegación lateral y móvil usa enlaces nativos y orden de foco DOM.

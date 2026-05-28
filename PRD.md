# PRD — SaaS de gestión de clientes y deudas

**Versión:** 0.2  
**Estado:** Borrador  
**Última actualización:** Mayo 2026

---

## 1. Visión general

### 1.1 Problema

Vendedores de herramientas y materiales que operan con múltiples ferreterías y talleres como clientes manejan hoy el control de deudas y pagos con Excel o papel. Esto genera:

- Pérdida de información (qué se vendió, a qué precio, cuánto se cobró)
- Imposibilidad de saber en tiempo real cuánto debe cada cliente
- Dificultad para comunicar el estado de cuenta a cada cliente de forma ágil
- El mismo problema espejado con los proveedores: quién le debe a quién y cuánto

### 1.2 Solución

Una PWA mobile-first que centraliza el registro de ventas, compras, pagos parciales y saldos. Permite al vendedor ver en un vistazo el estado de cada cliente o proveedor, registrar pagos en el momento, y generar una imagen del estado de cuenta lista para compartir por WhatsApp.

### 1.3 Usuarios objetivo

**MVP (fase 1):** Un único vendedor (tenant) que vende herramientas a ferreterías y talleres.  
**Futuro (fase 2+):** Múltiples tenants del mismo rubro o rubros similares, onboarding self-service.

---

## 2. Objetivos del MVP

| Objetivo                                   | Métrica de éxito                                |
| ------------------------------------------ | ----------------------------------------------- |
| Reemplazar el control en Excel/papel       | 100% de transacciones registradas en la app     |
| Ver saldo actualizado por cliente          | Saldo visible en < 2 taps desde home            |
| Registrar pagos parciales en campo (móvil) | Flujo de pago completo en < 60 segundos         |
| Generar estado de cuenta para WhatsApp     | Imagen generada y descargable en 1 tap          |
| Base escalable multi-tenant                | Agregar un segundo tenant sin cambios de código |

---

## 3. Alcance

### 3.1 Dentro del MVP

- Autenticación con email/password (un usuario por tenant en fase 1)
- CRUD de clientes (ferreterías / talleres)
- CRUD de proveedores
- CRUD de productos con múltiples tipos de precio
- Registro de ventas a clientes
- Registro de compras a proveedores
- Pagos parciales sobre ventas y compras
- Cálculo y visualización de saldos pendientes
- Generación de imagen PNG del estado de cuenta (para compartir por WhatsApp manualmente)
- PWA instalable, mobile-first, funcional en Chrome/Safari móvil

### 3.2 Fuera del MVP (fase 2+)

- Envío automático por WhatsApp Business API
- Onboarding self-service de nuevos tenants
- Notificaciones / recordatorios de deuda
- Control de stock
- Roles y múltiples usuarios por tenant
- Dashboard de analytics / reportes avanzados
- Integración con sistemas contables

---

## 4. Arquitectura

### 4.1 Stack tecnológico

| Capa                 | Tecnología                                        | Justificación                                          |
| -------------------- | ------------------------------------------------- | ------------------------------------------------------ |
| Frontend             | Next.js 14 (App Router) + Tailwind CSS            | PWA nativa, SSR, excelente soporte móvil               |
| Backend              | Next.js API Routes (o Node.js separado si escala) | Monorepo simple para MVP                               |
| Base de datos        | PostgreSQL (Railway)                              | Multi-tenant via `tenant_id`, tipos numéricos precisos |
| ORM                  | Prisma                                            | Type-safe, migraciones versionadas                     |
| Auth                 | NextAuth.js (credentials)                         | JWT stateless, extensible a OAuth                      |
| Deploy               | Vercel (frontend) + Railway (DB)                  | Bajo costo en fase 0, escala fácil                     |
| Generación de imagen | `html-to-image` o `canvas` en cliente             | PNG del estado de cuenta sin dependencia de servidor   |

### 4.2 Modelo multi-tenant

Todas las tablas principales incluyen `tenant_id` (UUID). Las queries siempre filtran por tenant activo extraído del JWT. Estrategia actual: schema compartido. Migración futura posible a schemas separados por tenant sin reescribir lógica de negocio.

### 4.3 Estructura de carpetas sugerida

```
/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Login / registro
│   ├── (dashboard)/
│   │   ├── clientes/
│   │   ├── proveedores/
│   │   ├── productos/
│   │   └── transacciones/
│   └── api/
│       ├── clientes/
│       ├── proveedores/
│       ├── productos/
│       ├── transacciones/
│       └── pagos/
├── components/
├── lib/
│   ├── db.ts                   # Prisma client
│   ├── auth.ts
│   └── tenant.ts               # Helper: getTenantId desde JWT
├── prisma/
│   └── schema.prisma
└── public/
```

---

## 5. Modelo de datos

### 5.1 Diagrama de entidades (simplificado)

```
organizations ──< users
     │
     ├──< customers ──< transactions (ventas, referencia producto opcional)
     │         └──────< account_payments (cobros libres sobre la cuenta)
     │
     ├──< suppliers ──< purchases (compras, referencia producto opcional)
     │         └──────< supplier_payments (pagos libres sobre la cuenta)
     │
     └──< products ──< price_entries
```

> **Cambio v0.2:** Los pagos ya no están ligados a una transacción/compra específica sino a la cuenta del cliente o proveedor. El saldo surge del total de ventas/compras menos el total de cobros/pagos acumulados. Esto refleja el modelo real del negocio: el cliente paga sobre su deuda total, no sobre ítems individuales.

### 5.2 Tablas principales

#### `organizations`

```sql
id          UUID PK
name        TEXT NOT NULL
created_at  TIMESTAMP
```

#### `users`

```sql
id           UUID PK
tenant_id    UUID FK → organizations.id
email        TEXT UNIQUE
password     TEXT (hash)
created_at   TIMESTAMP
```

#### `customers`

```sql
id              UUID PK
tenant_id       UUID FK
name            TEXT NOT NULL
phone_whatsapp  TEXT
address         TEXT
notes           TEXT
balance_due     NUMERIC(12,2) DEFAULT 0   -- calculado, desnormalizado para performance
created_at      TIMESTAMP
```

#### `suppliers`

```sql
id              UUID PK
tenant_id       UUID FK
name            TEXT NOT NULL
phone_whatsapp  TEXT
notes           TEXT
balance_due     NUMERIC(12,2) DEFAULT 0
created_at      TIMESTAMP
```

#### `products`

```sql
id              UUID PK
tenant_id       UUID FK
name            TEXT NOT NULL
unit            TEXT                      -- "unidad", "caja", "kg", etc.
price_list      NUMERIC(12,2)
price_credit    NUMERIC(12,2)
price_transfer  NUMERIC(12,2)
price_cash      NUMERIC(12,2)
notes           TEXT
created_at      TIMESTAMP
```

#### `transactions` (ventas a clientes)

```sql
id            UUID PK
tenant_id     UUID FK
customer_id   UUID FK → customers.id
product_id    UUID FK → products.id    -- referencia informativa, no cambia el saldo
quantity      NUMERIC(10,3)
price_type    ENUM('lista', 'credito', 'transferencia', 'contado')
unit_price    NUMERIC(12,2)            -- precio al momento de la venta
total_amount  NUMERIC(12,2)            -- quantity * unit_price
date          DATE NOT NULL
notes         TEXT
status        ENUM('active', 'cancelled') DEFAULT 'active'  -- v0.2: anulación
created_at    TIMESTAMP
```

> **Eliminado en v0.2:** `amount_paid` y `balance_due` por transacción. El saldo del cliente se calcula globalmente: `SUM(transactions.total_amount WHERE status='active') - SUM(account_payments.amount WHERE status='active')`.

#### `account_payments` (cobros sobre la cuenta del cliente) — nuevo en v0.2

```sql
id           UUID PK
tenant_id    UUID FK
customer_id  UUID FK → customers.id   -- pago asociado a la cuenta, no a una venta
amount       NUMERIC(12,2)
method       ENUM('efectivo', 'transferencia', 'cheque')
date         DATE NOT NULL
notes        TEXT                      -- descripción libre ("pago cuota", "abono julio", etc.)
status       ENUM('active', 'cancelled') DEFAULT 'active'
created_at   TIMESTAMP
```

#### `purchases` (compras a proveedores)

```sql
id            UUID PK
tenant_id     UUID FK
supplier_id   UUID FK → suppliers.id
product_id    UUID FK → products.id
quantity      NUMERIC(10,3)
price_type    ENUM('lista', 'credito', 'transferencia', 'contado')
unit_price    NUMERIC(12,2)
total_amount  NUMERIC(12,2)
commission_pct NUMERIC(5,2) DEFAULT 0
date          DATE NOT NULL
notes         TEXT
status        ENUM('active', 'cancelled') DEFAULT 'active'  -- v0.2: anulación
created_at    TIMESTAMP
```

> **Eliminado en v0.2:** `amount_paid` y `balance_due` por compra. Mismo modelo de libro diario que en clientes.

#### `supplier_payments` (pagos sobre la cuenta del proveedor) — nuevo en v0.2

```sql
id           UUID PK
tenant_id    UUID FK
supplier_id  UUID FK → suppliers.id
amount       NUMERIC(12,2)
method       ENUM('efectivo', 'transferencia', 'cheque')
date         DATE NOT NULL
notes        TEXT
status       ENUM('active', 'cancelled') DEFAULT 'active'
created_at   TIMESTAMP
```

### 5.3 Notas de consistencia

- `balance_due` en `customers` y `suppliers` sigue siendo un campo desnormalizado pero ahora se calcula como:  
  `balance_due = SUM(transactions.total_amount WHERE status='active') - SUM(account_payments.amount WHERE status='active')`  
  Se recalcula en la lógica de aplicación al crear, editar o cancelar cualquier entrada. No existe más `balance_due` por transacción individual.
- `unit_price` en `transactions` y `purchases` guarda el precio histórico al momento de la operación.
- `commission_pct` en `purchases` permite registrar el costo de la "cueva".
- Los registros nunca se borran físicamente (`DELETE`). La cancelación usa `status = 'cancelled'`. Esto preserva el historial auditable y permite revertir errores.
- **Orden del estado de cuenta:** siempre `ORDER BY date ASC` — de la entrada más antigua a la más nueva, como un libro diario.

---

## 6. Funcionalidades detalladas

### 6.1 Módulo de clientes

**Lista de clientes**

- Listado con nombre, saldo pendiente total y último movimiento
- Búsqueda por nombre
- Ordenar por saldo (mayor deuda primero)
- Indicador visual: saldo en verde (0), amarillo (>0), rojo (vencido o alto)

**Detalle de cliente**

- Datos de contacto (nombre, teléfono WhatsApp)
- Resumen: total vendido, total cobrado, saldo pendiente
- Historial de transacciones con estado (saldada / pendiente / parcial)
- Botón "Ver estado de cuenta" → genera imagen para WhatsApp

**Estado de cuenta (imagen PNG)** — actualizado en v0.2

La imagen debe contener:

- Logo / nombre del negocio (configurable por tenant)
- Nombre del cliente
- Tabla de libro diario con columnas: **Fecha · Descripción · Debe · Haber · Saldo**
  - Fila de tipo **venta**: Debe = `total_amount`, Haber = —, Descripción = producto + cantidad
  - Fila de tipo **cobro**: Debe = —, Haber = `amount`, Descripción = notas del pago
  - Filas ordenadas **de más antigua a más nueva** (`ORDER BY date ASC`)
- Fila de totales
- Saldo total destacado

**Reglas de UI para la imagen:**

- La columna Descripción tiene ancho fijo; el texto largo se trunca con `…` para no romper el layout
- Las columnas numéricas (Debe / Haber / Saldo) tienen ancho mínimo garantizado para no solaparse con el texto

### 6.2 Módulo de transacciones (ventas) — actualizado en v0.2

**Nueva venta**

1. Seleccionar cliente (buscador)
2. Seleccionar producto (buscador)
3. Ingresar cantidad
4. Seleccionar tipo de precio → precio se autocompleta, editable
5. Confirmar → crea `transaction`, recalcula `customer.balance_due`

> **Eliminado en v0.2:** el pago inicial como parte del formulario de venta. Los pagos siempre se registran por separado desde el estado de cuenta del cliente.

**Registrar cobro (pago libre sobre la cuenta)** — v0.2

- Desde el detalle / estado de cuenta del cliente
- Ingresar: monto, método de pago, fecha, descripción libre (opcional)
- El cobro **no está asociado a ninguna venta específica** — aplica contra el saldo total de la cuenta
- Recalcula `customer.balance_due`

**Editar / cancelar registros** — v0.2

- Tanto ventas como cobros permiten:
  - **Editar:** modificar monto, fecha, descripción u otros campos. El saldo se recalcula al guardar.
  - **Cancelar:** marca el registro como `status = 'cancelled'`. Queda visible en el historial con indicador visual (tachado o badge "Anulado") pero no afecta el saldo.
- No se permite eliminar registros físicamente (preservar auditoría).

### 6.3 Módulo de proveedores — actualizado en v0.2

Espejo simétrico del módulo de clientes. Aplican los mismos cambios de v0.2:

- Pagos libres sobre la cuenta del proveedor (`supplier_payments`), no vinculados a una compra específica
- Editar / cancelar compras y pagos con `status`
- Estado de cuenta en orden cronológico ascendente
- Las mismas reglas de UI para descripción truncada en imagen

Diferencias propias del módulo de proveedores:

- El saldo representa lo que **le debe mi cliente al proveedor** (no al revés)
- Campo adicional `commission_pct` en `purchases` para registrar el costo de cueva

### 6.4 Módulo de productos

- CRUD simple: nombre, unidad, 4 tipos de precio
- Los precios son editables en cualquier momento
- El precio histórico de cada venta/compra queda guardado en la transacción

---

## 7. UX / UI

### 7.1 Principios

- Mobile-first: todas las pantallas deben ser operables con una sola mano
- Flujo de nueva venta en máximo 5 taps
- Sin jerga contable: "cuánto debe" no "saldo acreedor"
- Feedback inmediato: al registrar un pago, el saldo se actualiza visualmente al instante

### 7.2 Pantallas principales

| Pantalla               | Ruta                   |
| ---------------------- | ---------------------- |
| Login                  | `/login`               |
| Home / dashboard       | `/`                    |
| Lista de clientes      | `/clientes`            |
| Detalle de cliente     | `/clientes/[id]`       |
| Nueva venta            | `/transacciones/nueva` |
| Detalle de transacción | `/transacciones/[id]`  |
| Lista de proveedores   | `/proveedores`         |
| Detalle de proveedor   | `/proveedores/[id]`    |
| Nueva compra           | `/compras/nueva`       |
| Productos              | `/productos`           |

### 7.3 PWA

- `manifest.json` con nombre, íconos y `display: standalone`
- Service worker básico para cachear shell y assets estáticos
- Instalable desde Chrome y Safari móvil

---

## 8. API REST — endpoints principales

```
POST   /api/auth/login
POST   /api/auth/logout

GET    /api/clientes
POST   /api/clientes
GET    /api/clientes/:id
PUT    /api/clientes/:id

GET    /api/clientes/:id/estado-cuenta         -- libro diario: ventas + cobros ordenados ASC por fecha
POST   /api/transacciones                      -- nueva venta (sin pago inicial)
GET    /api/transacciones/:id
PUT    /api/transacciones/:id                  -- editar venta (v0.2)
PATCH  /api/transacciones/:id/cancelar         -- cancelar venta (v0.2)

POST   /api/cobros                             -- nuevo cobro libre sobre cuenta de cliente (v0.2)
GET    /api/cobros/:id
PUT    /api/cobros/:id                         -- editar cobro (v0.2)
PATCH  /api/cobros/:id/cancelar                -- cancelar cobro (v0.2)

GET    /api/proveedores
POST   /api/proveedores
GET    /api/proveedores/:id

GET    /api/proveedores/:id/estado-cuenta      -- libro diario proveedor (v0.2)
POST   /api/compras
PUT    /api/compras/:id                        -- editar compra (v0.2)
PATCH  /api/compras/:id/cancelar               -- cancelar compra (v0.2)

POST   /api/pagos-proveedor                    -- pago libre sobre cuenta de proveedor (v0.2)
PUT    /api/pagos-proveedor/:id
PATCH  /api/pagos-proveedor/:id/cancelar

GET    /api/productos
POST   /api/productos
PUT    /api/productos/:id
```

Todos los endpoints validan `tenant_id` del JWT. Respuestas en JSON. Errores con formato `{ error: string, code: string }`.

> **Removido en v0.2:** `DELETE /api/pagos/:id` — los registros ya no se eliminan físicamente, solo se cancelan con `PATCH /:id/cancelar`.

---

## 9. Seguridad

- Contraseñas hasheadas con bcrypt (cost factor 12)
- JWT con expiración de 7 días, refresh token en cookie httpOnly
- Todas las queries incluyen `WHERE tenant_id = $tenantId` — nunca se exponen datos de otro tenant
- Rate limiting en endpoints de auth
- Variables de entorno para secrets (nunca en código)
- HTTPS obligatorio en producción

---

## 10. Plan de desarrollo — fases

### Fase 0 — Setup (1–2 días)

- [x] Repositorio Git, estructura de carpetas
- [x] Next.js 14.2.35 + Tailwind + Prisma configurados
- [x] Base de datos PostgreSQL en Railway — ya provisionada. `.env` tiene la URL interna (`postgres.railway.internal`). Para dev local, reemplazarla con la URL pública (Railway dashboard → tu DB → Connect → Public URL).
- [x] Schema completo en `prisma/schema.prisma` (todas las tablas del §5.2) — pendiente correr `npm run db:migrate` con URL pública para generar la migración inicial
- [x] Auth funcional (login / logout / JWT 7 días) — NextAuth credentials + bcrypt, `NEXTAUTH_SECRET` requerido
- [x] Middleware de tenant en todas las rutas API (`lib/api.ts` → `withTenant()`, `middleware.ts` protege rutas)

> **Nota de seguridad:** Next.js 14.x tiene CVEs conocidos (DoS en Image Optimizer, cache poisoning). Para producción, evaluar upgrade a Next.js 15/16 antes del deploy.

### Fase 1 — Core (1–2 semanas)

- [x] CRUD clientes — lista con búsqueda, nuevo, detalle, editar (`/clientes`, `/clientes/nuevo`, `/clientes/[id]`, `/clientes/[id]/editar`)
- [x] CRUD productos — lista con inline create/edit (`/productos`)
- [x] Flujo completo nueva venta — combobox cliente/producto, autocomplete de precio, pago inicial (`/transacciones/nueva`)
- [x] Pagos parciales — desde detalle de transacción, con anulación de pago (`/transacciones/[id]`)
- [x] Vista detalle de cliente con historial — stats (vendido/cobrado/debe) + lista de transacciones con badges

### Fase 2 — Proveedores + imagen WA (3–5 días)

- [x] CRUD proveedores — lista con búsqueda, nuevo, detalle con historial, editar (`/proveedores`, `/proveedores/nuevo`, `/proveedores/[id]`, `/proveedores/[id]/editar`)
- [x] Flujo completo nueva compra — combobox proveedor/producto, autocomplete precio, pago inicial, campo comisión cueva (`/compras/nueva`, `/compras/[id]`)
- [x] Generación de imagen PNG del estado de cuenta — `html-to-image`, botón en detalle de cliente, tabla con pendientes + totales
- [x] PWA: manifest + service worker — íconos 192/512, shortcuts, meta tags iOS, SW cache-first para shell

### Fase 3 — Polish MVP (2–3 días) ✅ Completada

- [x] Buscadores en listas — SearchInput con debounce en clientes, proveedores y productos; Combobox async en ventas/compras
- [x] Validaciones de formularios — cliente/servidor en todas las rutas; mensajes de error en rojo; botones deshabilitados durante carga
- [x] Estados vacíos y manejo de errores — empty states en todas las listas; feedback visual inmediato en formularios
- [x] Testing básico de flujos críticos — Vitest (27 tests): utils, validación de venta y validación de pago parcial; build de producción limpio
- [ ] Deploy en Vercel + Railway — `vercel.json` creado; pendiente: configurar env vars en Vercel dashboard y conectar Railway DB

### Fase 3.5 — v0.2: Libro diario + edición de registros

> Estos ítems representan el switch de modelo de negocio acordado con el cliente. Deben implementarse en orden para evitar estados inconsistentes en la DB.

**Modelo de datos**

- [ ] Migración Prisma: agregar `account_payments` y `supplier_payments` con `status`
- [ ] Migración Prisma: agregar campo `status` a `transactions` y `purchases`
- [ ] Migración Prisma: eliminar `amount_paid` y `balance_due` de `transactions` y `purchases`
- [ ] Actualizar `customer.balance_due` y `supplier.balance_due` para calcularse desde las nuevas tablas

**Backend**

- [ ] API `POST /api/cobros` — crear cobro libre sobre cuenta de cliente
- [ ] API `PUT /api/cobros/:id` y `PATCH /api/cobros/:id/cancelar`
- [ ] API `PUT /api/transacciones/:id` y `PATCH /api/transacciones/:id/cancelar`
- [ ] API `GET /api/clientes/:id/estado-cuenta` — retorna ventas + cobros ordenados `date ASC`
- [ ] Espejo para proveedores: `pagos-proveedor` + `/estado-cuenta`

**Frontend**

- [ ] Estado de cuenta: cambiar orden a `date ASC` (más antiguo primero)
- [ ] Estado de cuenta: columnas **Debe / Haber / Saldo** con running balance por fila
- [ ] Formulario "Registrar cobro" desde detalle de cliente (monto, método, fecha, descripción libre)
- [ ] Botón "Editar" en cada fila del historial (ventas y cobros)
- [ ] Botón "Anular" en cada fila del historial con confirmación; muestra badge "Anulado" en filas canceladas
- [ ] Fix UI imagen PNG: descripción con `text-overflow: ellipsis` o `max-width` fijo, columnas numéricas con ancho mínimo garantizado

### Fase 4 — Multi-tenant real (futuro)

- [ ] Onboarding self-service
- [ ] WhatsApp Business API
- [ ] Dashboard de métricas por tenant

---

## 11. Decisiones técnicas registradas

| Decisión                                | Alternativa descartada            | Razón                                                  |
| --------------------------------------- | --------------------------------- | ------------------------------------------------------ |
| Multi-tenant por `tenant_id` en columna | Schema separado por tenant        | Más simple para MVP, migrable a futuro                 |
| `balance_due` desnormalizado            | Calculado en query siempre        | Performance en listas con muchos clientes              |
| Precio histórico en `unit_price`        | Referencia al precio del producto | Los precios cambian; el precio cobrado no debe cambiar |
| Generación de imagen en cliente         | Servicio de render server-side    | Sin infraestructura extra, funciona offline            |
| Next.js monorepo                        | Backend separado (Express)        | Suficiente para MVP, split fácil si escala             |

---

## 12. Glosario

| Término en el sistema | Significado en el negocio                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------ |
| `customer`            | Ferretería o taller que le compra a mi cliente                                                               |
| `supplier`            | Proveedor que le vende mercadería a mi cliente                                                               |
| `transaction`         | Venta realizada a un cliente                                                                                 |
| `purchase`            | Compra realizada a un proveedor                                                                              |
| `account_payment`     | Cobro libre registrado sobre la cuenta total del cliente (no vinculado a una venta)                          |
| `supplier_payment`    | Pago libre registrado sobre la cuenta total del proveedor                                                    |
| `status`              | Estado de un registro: `active` (válido) o `cancelled` (anulado, sin efecto en saldo)                        |
| `balance_due`         | Saldo pendiente global: suma de ventas activas menos suma de cobros activos                                  |
| `price_type`          | Modalidad de precio: lista, crédito, transferencia, contado                                                  |
| `commission_pct`      | Porcentaje de comisión de "cueva" en pagos por transferencia                                                 |
| libro diario          | Nombre coloquial para el estado de cuenta en formato de entradas cronológicas (Debe / Haber / Saldo corrido) |

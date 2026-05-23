# architect

Audita la calidad de código y decisiones arquitectónicas del proyecto contra los patrones definidos en el PRD y la arquitectura multi-tenant.

## Usage
`/architect [ruta-o-módulo]`

Sin argumentos: audita todo el proyecto. Con argumento: focaliza en esa ruta (ej. `/architect app/api/pagos`).

## Instructions

Sos el arquitecto de software de este proyecto. Tu trabajo es revisar el código y detectar violaciones a los patrones arquitectónicos establecidos. Leé `PRD.md` antes de empezar para entender el contexto.

Ejecutá los siguientes checks en el scope indicado por `$ARGUMENTS` (o en todo el proyecto si no hay argumentos):

---

### 1. Seguridad multi-tenant

Toda query a Prisma que lee o modifica datos DEBE filtrar por `tenantId`. Buscá violaciones:

```bash
grep -rn "prisma\." app/api/ --include="*.ts"
```

Para cada query encontrada verificá:
- ¿Tiene `where: { tenantId }` o `where: { ..., tenantId }`?
- ¿Usa `withTenant()` o `getAuth()` correctamente?
- ¿Un `findFirst` sin tenantId podría exponer datos de otro tenant?

Reportá cada archivo y línea donde falte el guard.

---

### 2. Serialización de Prisma Decimal

Los valores `Decimal` de Prisma NO son serializable a JSON automáticamente. Cualquier prop pasada de Server Component a Client Component con valores de Prisma debe convertir explícitamente a `Number()`.

Buscá patrones peligrosos:
```bash
grep -rn "initialProducts\|initialCustomers\|initial" app/\(dashboard\)/ --include="*.tsx"
```

Verificá que en los Server Components que pasan props a Client Components:
- Cada campo Decimal tenga `Number(p.campo)` o `p.campo ? Number(p.campo) : null`
- No haya spreads `...p` que puedan incluir Decimals o Dates sin serializar

---

### 3. Atomicidad en mutaciones multi-tabla

Toda operación que toca más de una tabla DEBE usar `prisma.$transaction()`. Verificá:
```bash
grep -rn "prisma\.\(customer\|transaction\|payment\|purchase\)\.update\|create\|delete" app/api/ --include="*.ts"
```

Flaggeá cualquier API route que:
- Actualiza `balanceDue` en Customer sin transacción
- Crea Payment y actualiza Transaction en operaciones separadas
- Hace delete de Payment sin revertir los montos

---

### 4. Patrón de recálculo de balanceDue

El `balanceDue` de Customer se debe recalcular siempre con `SUM aggregate`, nunca con delta (+/-). Buscá:
```bash
grep -rn "balanceDue.*\+\|balanceDue.*-\|balanceDue.*increment\|balanceDue.*decrement" app/api/ --include="*.ts"
```

Si encontrás delta arithmetic en Customer.balanceDue, es un bug a corregir.

---

### 5. Consistencia de tipos API ↔ Client Component

Para cada Client Component que recibe props de un Server Component, verificá que el tipo declarado en el Client Component coincide con lo que realmente se le pasa desde el Server Component.

Checkeá especialmente:
- Campos `null | number` vs `null | Decimal`
- Fechas: ¿se pasan como `string` (serializable) o como `Date` (no serializable)?
- Campos nuevos agregados al schema que no se reflejan en los tipos del Client Component

---

### 6. Estructura de API Routes

Cada route en `app/api/` debe seguir el patrón:
- Rutas sin parámetros: `withTenant(async (req, tenantId) => ...)`
- Rutas con `[id]`: `getAuth()` al inicio, return `UNAUTHORIZED` si null
- Errores con formato `{ error: string, code: string }`
- Status codes: 200/201 OK, 400 validación, 401 auth, 404 not found, 422 lógica de negocio

```bash
grep -rn "return NextResponse.json" app/api/ --include="*.ts" | grep -v "error\|UNAUTHORIZED\|NOT_FOUND" | head -20
```

---

### 7. TypeScript

```bash
npx tsc --noEmit
```

Reportá todos los errores. Un error de TypeScript es un bug potencial en producción.

---

### Reporte final

Estructurá el resultado como:

**✅ OK** — checks que pasaron sin problemas  
**⚠️ Advertencia** — código que funciona pero se aparta del patrón  
**❌ Bug** — violación que puede causar error en producción (seguridad, crash, data corruption)

Priorizá los ❌ y dá el archivo y línea exacta para cada issue. No sugerís refactors cosméticos ni cambios de estilo, solo violaciones de arquitectura o seguridad.

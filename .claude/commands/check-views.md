# check-views

Verifica que las vistas (páginas y rutas API) no estén rotas. Hace un ciclo completo: TypeScript → build → runtime. Obligatorio antes de hacer push.

## Usage
`/check-views [ruta]`

Sin argumentos: verifica todas las vistas. Con argumento: focaliza en esa ruta (ej. `/check-views productos`).

## Instructions

Tu objetivo es detectar páginas rotas ANTES de que el usuario las vea o se haga push. Seguí estos pasos en orden. Si un paso falla, reportalo y continuá con los demás para dar un panorama completo.

---

### Paso 1 — TypeScript (estático)

```bash
npx tsc --noEmit 2>&1
```

Si hay errores: reportá archivo, línea y mensaje. Cada error de TS es un potencial crash en runtime.

---

### Paso 2 — Build de producción (Next.js)

```bash
npm run build 2>&1 | tail -40
```

Un build limpio garantiza que:
- No hay imports rotos
- No hay Server Components usando hooks de React
- No hay Client Components con imports server-only
- Las rutas dinámicas tienen el tipo correcto en `params`

Si el build falla, reportá el error exacto del compilador.

---

### Paso 3 — Patrones estáticos que rompen vistas

Buscá estos anti-patrones en el código fuente sin necesidad de levantar el servidor:

**3a. Componentes Client que usan imports server-only:**
```bash
grep -rn "from.*@/lib/db\|from.*@/lib/tenant\|from.*@/lib/auth" app/ --include="*.tsx" | grep -v "page.tsx\|layout.tsx\|route.ts"
```
Si un `client.tsx` importa `prisma` o `getTenantId`, crashea en el browser.

**3b. Dates pasadas como props a Client Components:**
```bash
grep -rn "createdAt\|paidAt\|date:" app/\(dashboard\)/ --include="page.tsx"
```
Las props de Server → Client no pueden contener `Date` objects. Deben ser `string` (ISO) o `number` (timestamp).

**3c. `params` no tipado correctamente en Next.js 14:**
```bash
grep -rn "params\." app/ --include="page.tsx" | grep -v "params\.id\|params\.searchParams"
```

**3d. `"use client"` faltante en componentes con hooks:**
```bash
grep -rn "useState\|useEffect\|useRouter\|useSearchParams" app/ --include="*.tsx" | grep -v '"use client"'
```
Luego verificá que los archivos que usan esos hooks tienen `"use client"` en la primera línea:
```bash
grep -rLn '"use client"' app/ --include="*.tsx" | xargs grep -l "useState\|useRouter\|useEffect" 2>/dev/null
```

---

### Paso 4 — Runtime: levantá el servidor y probá cada ruta

Levantá el servidor de desarrollo:
```bash
npm run dev &
sleep 4
```

Obtené una sesión autenticada:
```bash
CSRF=$(curl -s -c /tmp/cv_cookies.txt -b /tmp/cv_cookies.txt http://localhost:3000/api/auth/csrf | python3 -c 'import json,sys;print(json.load(sys.stdin)["csrfToken"])')
curl -s -c /tmp/cv_cookies.txt -b /tmp/cv_cookies.txt \
  -X POST http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "email=admin@clientesk.dev" \
  --data-urlencode "password=clientesk2026" \
  --data-urlencode "csrfToken=$CSRF" \
  --data-urlencode "callbackUrl=http://localhost:3000/" \
  -o /dev/null -w "%{http_code}"
```

Luego probá cada página relevante según el scope del argumento `$ARGUMENTS`. Si no hay argumento, probá TODAS las rutas de la siguiente lista:

```bash
for RUTA in "/" "/clientes" "/clientes/nuevo" "/productos" "/productos/importar" "/proveedores" "/transacciones/nueva"; do
  STATUS=$(curl -s -c /tmp/cv_cookies.txt -b /tmp/cv_cookies.txt -L \
    "http://localhost:3000$RUTA" -w "%{http_code}" -o /tmp/cv_body.txt 2>/dev/null)
  # Verificar que no hay error en el body
  ERROR=$(grep -c "Application error\|Internal Server Error\|unhandled-error\|Error:" /tmp/cv_body.txt 2>/dev/null || echo 0)
  echo "$STATUS $ERROR_COUNT $RUTA"
done
```

Para rutas con ID dinámico, usá un ID del seed:
- `/clientes/2c000000-0000-0000-0000-000000000001` (Ferretería Central)
- `/transacciones/3t000000-0000-0000-0000-000000000001`

Probá también los API routes clave:
```bash
for API in "/api/clientes" "/api/productos" "/api/transacciones/3t000000-0000-0000-0000-000000000001"; do
  STATUS=$(curl -s -c /tmp/cv_cookies.txt -b /tmp/cv_cookies.txt \
    "http://localhost:3000$API" -w "\n%{http_code}" -o /tmp/cv_api.txt)
  BODY=$(cat /tmp/cv_api.txt)
  echo "$STATUS — $API — $(echo $BODY | head -c 80)"
done
```

Una ruta está **rota** si:
- HTTP 500
- Body contiene "Application error", "Internal Server Error", o un stack trace
- Body no tiene la estructura de datos esperada (vacío cuando debería tener datos)

Una ruta está **OK** si:
- HTTP 200 con el layout de la app renderizado (tiene `<nav>` y `<main>`)
- O HTTP 200 con JSON válido (para API routes)

---

### Paso 5 — Matá el servidor

```bash
pkill -f "next dev"
```

---

### Reporte final

Presentá una tabla:

| Ruta | TypeScript | Build | Runtime | Estado |
|------|-----------|-------|---------|--------|
| /productos | ✅ | ✅ | HTTP 200 | ✅ OK |
| /api/pagos | ✅ | ✅ | HTTP 401 | ⚠️ (esperado sin auth) |

Estados posibles:
- **✅ OK** — todo pasa
- **⚠️ Advertencia** — funciona pero con comportamiento inesperado
- **❌ Roto** — crash, 500, o error visible en el body

Si hay rutas rotas, mostrá el error exacto y el archivo/línea probable del problema. No hagas push hasta que todas las rutas estén ✅ o ⚠️ con justificación.

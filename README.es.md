# Dunwell

Persigue facturas impagas con un calendario: primero con amabilidad, luego con firmeza. English: [README.md](README.md).

## Resultado

**Precisión de decisión: 100 / 100** en los 8 casos dados (49 facturas), con `bun run eval`:

```json
{ "cases": 8, "decisions": 49, "accuracy": 1, "score": 100 }
```

Con las facturas y una fecha, Dunwell decide qué recordatorio recibe cada factura (`heads_up`, `friendly`,
`firm`, `final`, `escalate`, `hold` o `none`), indica qué regla decidió, redacta el correo y añade un enlace de
pago. Las siete reglas se implementan tal como las pide `REQUIREMENTS.md`, en orden, y se prueban en cada borde.

## Cómo ejecutarlo

```bash
bun install
bun run dev                  # http://localhost:3000/en/app y /es/app, sin variables de entorno
bun run build && bun run start

bun run decide fixtures/invoices.json --today 2026-10-16   # solo JSON por stdout
bun run eval                                               # precisión y puntaje sobre fixtures/cases.json

bun test                     # pruebas unitarias y de la línea de comandos
bun run build && bun run test:smoke   # pruebas de rutas contra `next start`
bun run typecheck && bun run lint
```

Todo funciona sin variables de entorno. Cada servicio externo tiene un modo real opcional:

| Variable | Activa | Sin ella |
|---|---|---|
| `GEMINI_API_KEY`, `GROQ_API_KEY` u `OPENROUTER_API_KEY` | Correos escritos por un modelo de lenguaje con `ai-kit/` | Plantillas incluidas, marcadas como "Plantilla, no es texto de un modelo" |
| `STRIPE_SECRET_KEY` (debe empezar con `sk_test_`) | Enlaces de pago en modo de prueba | Pago simulado local que marca la factura como pagada en la sesión |
| `RESEND_API_KEY` y `MAIL_FROM` | Envío real (tú escribes el destinatario) | Bandeja de salida en pantalla, marcada "No enviado" |

## Arquitectura

1. `src/domain/`: lógica pura sin dependencias de framework. `decide.ts` son las siete reglas; `dates.ts` convierte `YYYY-MM-DD` en números de día enteros.
2. `src/cli/`: `decide` y `eval`. Imprimen JSON por stdout; los errores van a stderr como JSON con código de salida 1.
3. La CLI y la página llaman al mismo `decideAll`, así que el panel nunca puede contradecir la salida evaluada.
4. `src/services/`: adaptadores solo de servidor (borradores, pagos, correo), cada uno con ruta real y ruta demo. Las llamadas son `fetch` simple.
5. `app/api/{draft,send,pay-link}`: validadas con zod, con límite de uso de `ai-kit/rate-limit`; el servidor recalcula la decisión antes de actuar.
6. `src/components/`: un componente cliente (`TryIt`) guarda el estado de sesión (`sessionStorage`) con un reducer puro y probado.
7. `src/i18n/dictionary.ts`: un solo `Record<"en" | "es", Dictionary>`, así que una traducción faltante es un error de tipos.
8. `proxy.ts` redirige las rutas sin idioma a `/en` conservando la consulta. Un idioma desconocido da 404.
9. Los tokens de diseño están en `styles/tokens.css` y se documentan en [DESIGN.md](DESIGN.md), con una tabla de contraste probada.

## Compromisos

- **Números de día enteros en lugar de `Date`.** Las fechas pasan a días desde 1970 con un algoritmo de calendario civil, sin zonas horarias ni errores de horario de verano. El costo es un pequeño módulo de fechas propio, cubierto por pruebas.
- **Sin base de datos.** Las facturas pagadas y los recordatorios enviados viven en la sesión del navegador y se mandan al servidor en cada petición, que los vuelve a validar. Sirve para una demo, no para facturas reales.
- **Sin SDK de proveedores.** Pagos y correo son dos llamadas `fetch` cada uno, lo que mantiene pocas dependencias, pero yo manejo los errores y el formato de las peticiones.

## Lo que no funcionó

- El `ai-kit/` incluido no compila con `noUncheckedIndexedAccess`. No lo edité. Lo dejé fuera del `include` de tsconfig, así que solo se revisan los tipos de lo que la app importa, y lo excluí del lint.
- `server-only` falla bajo `bun test`, así que `tests/setup.ts` lo simula.
- Las rutas reales (modelo de lenguaje, proveedor de pagos, proveedor de correo) solo se probaron con `fetch` simulado. No tenía claves, así que nunca las ejecuté contra los servicios reales.
- En el primer arranque de desarrollo, Next generó un `AGENTS.md`. Lo borré y lo añadí a `.gitignore`.

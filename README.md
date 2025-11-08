# Aplicación de Colas (Modernización 2025)

Sistema de turnos en tiempo real con Node.js y Socket.IO. Esta versión modernizada mejora seguridad, CORS, persistencia de datos (JSON atómico), endpoints de importación/exportación, y un flujo de desarrollo más cómodo.

## 🚀 Produccion

Link: [[text](https://app-turnos-2025.onrender.com)](https://app-turnos-2025.onrender.com/)

- Servidor: [app.js](app.js), [JavaScript.server()](models/server.js:6)
- Lógica de tickets: [JavaScript.TicketControl()](models/ticket-control.js:11), [JavaScript.siguiente()](models/ticket-control.js:47), [JavaScript.atenderTicket()](models/ticket-control.js:55)
- WebSockets: [JavaScript.socketController()](sockets/controller.js:5)
- Frontend: [public/index.html](public/index.html), [public/publico.html](public/publico.html), [public/nuevo-ticket.html](public/nuevo-ticket.html), [public/escritorio.html](public/escritorio.html), estilos en [public/css/style.css](public/css/style.css)

## Novedades clave

- CORS estricto por lista de orígenes desde entorno (Express y Socket.IO).
- Reset diario corregido (ISO YYYY-MM-DD), con migración de esquema antigua (campo `hoy`).
- Escritura de `db/data.json` atómica con copia de seguridad `.bak` y rollback seguro.
- Endpoints REST: exportación e importación de datos de tickets (JSON validado).
- Endpoint de salud `/health` y cabeceras básicas de seguridad, compresión gzip.
- Scripts de desarrollo con nodemon.

## Requisitos

- Node.js LTS (18+ recomendado) y npm.
- Permitir sonido en el navegador para la pantalla pública.
- En producción: proxy con soporte WebSocket (Nginx/Traefik) y PM2 u otro process manager.

## Instalación

```bash
npm install
```

## Scripts

Definidos en [package.json](package.json):

- Desarrollo: `npm run dev` (recarga con nodemon)
- Producción: `npm start`

## Variables de entorno

Crear un archivo `.env` (o usar [dotenv](https://www.npmjs.com/package/dotenv)).

Ejemplo ([.env](.env)):

```
PORT=8080
NODE_ENV=development
CORS_ORIGINS=http://localhost:8080,http://127.0.0.1:8080
```

- `PORT`: Puerto HTTP del servidor.
- `NODE_ENV`: development | production.
- `CORS_ORIGINS`: Lista separada por comas con orígenes permitidos para CORS (aplica a HTTP y Socket.IO). En producción añade tu dominio(s).

El servidor lee estas variables en [JavaScript.server()](models/server.js:6) y su CORS en Express + Socket.IO.

## Ejecutar

Desarrollo:

```bash
npm run dev
```

Producción:

```bash
npm start
```

Abrir:

- Pantalla principal: http://localhost:8080/
- Crear tickets: http://localhost:8080/nuevo-ticket.html
- Escritorio: http://localhost:8080/escritorio.html?escritorio=Agente%201
- Pantalla pública: http://localhost:8080/publico.html

## Endpoints REST

- GET `/health`
  - Respuesta: `{ "status": "ok", "time": "..." }` (ver [JavaScript.routes()](models/server.js:36))
- GET `/api/tickets/export`
  - Descarga JSON del estado actual (seguro para respaldo).
- POST `/api/tickets/import`
  - Sobrescribe el estado con validación y persistencia atómica. Emitirá eventos a todos los clientes.
  - Ejemplo:
    ```bash
    curl -X POST http://localhost:8080/api/tickets/import \
      -H "Content-Type: application/json" \
      -d "{\"ultimo\":3,\"tickets\":[{\"numero\":1,\"escritorio\":null}],\"ultimos4\":[]}"
    ```

Formato JSON esperado:

```json
{
  "ultimo": number,
  "tickets": [{ "numero": number, "escritorio": string|null }],
  "ultimos4": [{ "numero": number, "escritorio": string|null }]
}
```

Notas:

- La fecha interna se normaliza al día actual local. El archivo persistido usa `date: "YYYY-MM-DD"`. Ver [JavaScript.guardarDB()](models/ticket-control.js:116).

## Persistencia de datos

- Archivo: [db/data.json](db/data.json)
- Esquema actual: `{ "ultimo": number, "date": "YYYY-MM-DD", "tickets": [], "ultimos4": [] }`
- Esquema legado soportado y migrado automáticamente (campo `hoy`). Ver [JavaScript.init()](models/ticket-control.js:61).

Escritura atómica con copia `.bak`:

1. escribe `data.tmp`, 2) rota `data.json` a `data.bak.json`, 3) renombra `data.tmp` a `data.json`. Rollback ante error.

## WebSockets

Eventos emitidos (servidor) ver [JavaScript.socketController()](sockets/controller.js:5):

- `ultimo-ticket`: número del último ticket creado.
- `estado-actual`: arreglo de los últimos 4 atendidos.
- `tickets-pendientes`: cantidad en cola.

Eventos recibidos:

- `siguiente-ticket` (ack string): crea ticket.
- `atender-ticket` ({ escritorio }, ack { ok, ticket|message }): atiende siguiente.

## Sonidos y accesibilidad

- Perfil B (TV-friendly, dark-first). Sonido solo en pantalla pública al atender ticket.
- Volumen recomendado 30%, con opción de mute (se agregará en la modernización de UI).
- Respetar “reduced motion” del sistema. Tipografías grandes para legibilidad.

## CORS

CORS estricto habilitado en:

- HTTP (Express) y WebSocket (Socket.IO), ambos leen `CORS_ORIGINS`. Ver [JavaScript.middleware()](models/server.js:29) y configuración de `io` en [JavaScript.server()](models/server.js:11).
- Agrega tus dominios productivos separados por comas.

## Despliegue (resumen)

- Ejecutar con PM2:
  ```bash
  npm ci --only=production
  NODE_ENV=production PORT=8080 CORS_ORIGINS="https://tu-dominio.com" pm2 start app.js --name turnos
  ```
- Proxy inverso (Nginx) con upgrade WebSocket en `/socket.io/` y TLS.
- Habilitar compresión y cabeceras seguras (ya incluidas con `compression` y `helmet`).

## Roadmap UI/UX

- Refactor de layouts (Bootstrap 5/semántico), tema dark-first Slate+Lime.
- Animaciones suaves, control de sonido, mejoras de accesibilidad.
- Página admin opcional para importar/exportar JSON y diagnósticos.

---

Autor original: SAMIR VERGARA V
Modernización: 2025

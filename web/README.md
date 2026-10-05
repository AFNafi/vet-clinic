# Vetwise Clinic demo

This is a responsive, fictional veterinary clinic UI served by Express. Its dashboard, patient list, and appointment list use in-memory sample data from `server.js`; no Oracle schema or database is used by the demo.

## Run locally

1. Install Node.js 18.11 or newer.
2. From a terminal, enter the web folder: `cd web`.
3. Install dependencies: `npm install`.
4. Start the development server with automatic restart: `npm run dev`.
5. Open <http://localhost:3000>.

For a regular start without automatic restart, run `npm start` from `web/`. Set `PORT` in a local, uncommitted `web/.env` file to use a different port. The example is `web/.env.example`.

The browser requests only the demo API routes served by Express. Keep any future Oracle credentials and database access on the server; never put them in `public/` files.

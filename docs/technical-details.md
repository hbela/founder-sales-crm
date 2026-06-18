Start with an **empty monorepo shell** first: backend, frontend, shared packages, env files, and health checks. No business logic yet.

## 1. Create

```bash
git init
pnpm init
```

Create workspace:

```bash
mkdir apps packages
mkdir apps/api apps/web
mkdir packages/config packages/db packages/types
```

## 2. Root `pnpm-workspace.yaml`

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

## 3. Root `package.json`

```json
{
  "name": "founder-sales-crm",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "pnpm --parallel dev",
    "dev:api": "pnpm --filter api dev",
    "dev:web": "pnpm --filter web dev",
    "build": "pnpm -r build",
    "lint": "pnpm -r lint"
  },
  "packageManager": "pnpm@9.0.0"
}
```

## 4. Backend shell: Fastify

```bash
cd apps/api
pnpm init
pnpm add fastify @fastify/cors dotenv
pnpm add -D typescript tsx @types/node
```

`apps/api/package.json`

```json
{
  "name": "api",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  }
}
```

`apps/api/src/server.ts`

```ts
import Fastify from "fastify";
import cors from "@fastify/cors";

const app = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: true,
});

app.get("/health", async () => {
  return {
    status: "ok",
    service: "founder-sales-crm-api",
  };
});

const port = Number(process.env.PORT ?? 4000);

app.listen({ port, host: "0.0.0.0" });
```

`apps/api/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "outDir": "dist",
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

Test:

```bash
pnpm dev:api
```

Open:

```text
http://localhost:4000/health
```

---

## 5. Frontend shell: React + Vite

From root:

```bash
cd apps
pnpm create vite web --template react-ts
cd web
pnpm add @tanstack/react-router @tanstack/react-query
pnpm add @mui/material @emotion/react @emotion/styled
```

`apps/web/src/main.tsx`

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { CssBaseline, Typography, Container } from "@mui/material";

function App() {
  return (
    <>
      <CssBaseline />
      <Container sx={{ py: 4 }}>
        <Typography variant="h4">
          Founder Sales CRM
        </Typography>
        <Typography sx={{ mt: 2 }}>
          Empty shell is running.
        </Typography>
      </Container>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
```

Run:

```bash
pnpm dev:web
```

---

## 6. Add `.env.example`

Root:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/founder_sales_crm"
RESEND_API_KEY=""
WEB_URL="http://localhost:5173"
API_URL="http://localhost:4000"
```

---

## 7. Suggested first folder structure

```text
founder-sales-crm/
  apps/
    api/
      src/
        server.ts
        modules/
          contacts/
          campaigns/
          emails/
    web/
      src/
        pages/
        components/
        features/
          contacts/
          campaigns/
          dashboard/
  packages/
    db/
    types/
    config/
```

## Next build step

After the shell works, add:

```text
PostgreSQL + Prisma
Contact model
Contacts API
Contacts table UI
```

That gives you the first real vertical slice.

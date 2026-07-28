import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { mkdirSync, appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dataDir = join(root, "data");
const leadsFile = join(dataDir, "leads.json");
mkdirSync(dataDir, { recursive: true });
if (!existsSync(leadsFile)) writeFileSync(leadsFile, "[]\n");

const app = new Hono();
app.use("*", cors({ origin: "*" }));

app.get("/health", (c) =>
  c.json({ ok: true, service: "psg-plumbing", business: "PSG Plumbing & Heating" }),
);

app.get("/api/config", (c) =>
  c.json({
    businessName: "PSG Plumbing & Heating",
    phone: process.env.BUSINESS_PHONE?.trim() || "",
    email: process.env.BUSINESS_EMAIL?.trim() || "Psgheatingplumb@outlook.com",
    area: "Cumbria",
    hours: "Monday–Friday, 8am–5pm",
    facebookUrl: process.env.FACEBOOK_URL?.trim() || "",
  }),
);

type Lead = {
  id: string;
  name: string;
  phone: string;
  email: string;
  message: string;
  createdAt: string;
};

app.post("/api/contact", async (c) => {
  const body = await c.req.json().catch(() => null);
  const name = String(body?.name ?? "").trim().slice(0, 120);
  const phone = String(body?.phone ?? "").trim().slice(0, 40);
  const email = String(body?.email ?? "").trim().slice(0, 120);
  const message = String(body?.message ?? "").trim().slice(0, 2000);

  if (!name || (!phone && !email) || !message) {
    return c.json({ error: "name_contact_and_message_required" }, 400);
  }

  const lead: Lead = {
    id: `lead_${Date.now().toString(36)}`,
    name,
    phone,
    email,
    message,
    createdAt: new Date().toISOString(),
  };

  const existing = JSON.parse(readFileSync(leadsFile, "utf8") || "[]") as Lead[];
  existing.push(lead);
  writeFileSync(leadsFile, JSON.stringify(existing, null, 2) + "\n");
  appendFileSync(join(dataDir, "leads.log"), `${lead.createdAt}\t${name}\t${phone}\t${email}\n`);

  const key = process.env.WEB3FORMS_ACCESS_KEY?.trim();
  if (key) {
    await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_key: key,
        subject: `PSG Plumbing enquiry from ${name}`,
        from_name: "PSG Plumbing website",
        name,
        phone,
        email,
        message,
      }),
    }).catch(() => null);
  }

  return c.json({ ok: true, id: lead.id });
});

app.use("/*", serveStatic({ root: "./public" }));
app.get("/", (c) => {
  const html = readFileSync(join(root, "public/index.html"), "utf8");
  return c.html(html);
});

const port = Number(process.env.PORT ?? 8080);
console.log(`PSG Plumbing listening on http://0.0.0.0:${port}`);
serve({ fetch: app.fetch, port, hostname: "0.0.0.0" });

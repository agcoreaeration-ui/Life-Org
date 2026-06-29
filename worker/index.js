// Life Org — Cloudflare Worker API
// Handles all data sync for the Life Org family calendar

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function error(msg, status = 400) {
  return json({ error: msg }, status);
}

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      // ── Events ──────────────────────────────────────────────────────────
      if (path === "/api/events") {
        if (method === "GET") {
          const { results } = await env.lifeorg.prepare(
            "SELECT id, data FROM events ORDER BY updated_at DESC"
          ).all();
          const events = results.map(r => JSON.parse(r.data));
          return json(events);
        }

        if (method === "POST") {
          const body = await request.json();
          const events = Array.isArray(body) ? body : [body];
          const stmt = env.lifeorg.prepare(
            "INSERT OR REPLACE INTO events (id, data, updated_at) VALUES (?, ?, unixepoch())"
          );
          const batch = events.map(ev =>
            stmt.bind(String(ev.id), JSON.stringify(ev))
          );
          await env.lifeorg.batch(batch);
          return json({ ok: true, count: events.length });
        }

        if (method === "DELETE") {
          const { id } = await request.json();
          await env.lifeorg.prepare("DELETE FROM events WHERE id = ?").bind(String(id)).run();
          return json({ ok: true });
        }
      }

      // ── Birthdays ────────────────────────────────────────────────────────
      if (path === "/api/birthdays") {
        if (method === "GET") {
          const { results } = await env.lifeorg.prepare(
            "SELECT id, data FROM birthdays"
          ).all();
          return json(results.map(r => JSON.parse(r.data)));
        }

        if (method === "POST") {
          const body = await request.json();
          const items = Array.isArray(body) ? body : [body];
          const stmt = env.lifeorg.prepare(
            "INSERT OR REPLACE INTO birthdays (id, data) VALUES (?, ?)"
          );
          await env.lifeorg.batch(items.map(b => stmt.bind(String(b.id), JSON.stringify(b))));
          return json({ ok: true });
        }

        if (method === "DELETE") {
          const { id } = await request.json();
          await env.lifeorg.prepare("DELETE FROM birthdays WHERE id = ?").bind(String(id)).run();
          return json({ ok: true });
        }
      }

      // ── Notes ────────────────────────────────────────────────────────────
      if (path === "/api/notes") {
        if (method === "GET") {
          const { results } = await env.lifeorg.prepare(
            "SELECT id, data FROM notes"
          ).all();
          return json(results.map(r => JSON.parse(r.data)));
        }

        if (method === "POST") {
          const body = await request.json();
          const items = Array.isArray(body) ? body : [body];
          const stmt = env.lifeorg.prepare(
            "INSERT OR REPLACE INTO notes (id, data) VALUES (?, ?)"
          );
          await env.lifeorg.batch(items.map(n => stmt.bind(String(n.id), JSON.stringify(n))));
          return json({ ok: true });
        }

        if (method === "DELETE") {
          const { id } = await request.json();
          await env.lifeorg.prepare("DELETE FROM notes WHERE id = ?").bind(String(id)).run();
          return json({ ok: true });
        }
      }

      // ── Settings ─────────────────────────────────────────────────────────
      if (path === "/api/settings") {
        if (method === "GET") {
          const { results } = await env.lifeorg.prepare(
            "SELECT key, value FROM settings"
          ).all();
          const out = {};
          results.forEach(r => { out[r.key] = JSON.parse(r.value); });
          return json(out);
        }

        if (method === "POST") {
          const body = await request.json();
          const stmt = env.lifeorg.prepare(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)"
          );
          const batch = Object.entries(body).map(([k, v]) =>
            stmt.bind(k, JSON.stringify(v))
          );
          await env.lifeorg.batch(batch);
          return json({ ok: true });
        }
      }

      // ── Terms ────────────────────────────────────────────────────────────
      if (path === "/api/terms") {
        if (method === "GET") {
          const { results } = await env.lifeorg.prepare(
            "SELECT id, data FROM terms"
          ).all();
          return json(results.map(r => JSON.parse(r.data)));
        }

        if (method === "POST") {
          const body = await request.json();
          const items = Array.isArray(body) ? body : [body];
          // Clear and re-insert terms (simpler than upsert for ordered list)
          await env.lifeorg.prepare("DELETE FROM terms").run();
          const stmt = env.lifeorg.prepare(
            "INSERT INTO terms (id, data) VALUES (?, ?)"
          );
          await env.lifeorg.batch(items.map((t, i) => stmt.bind(String(i), JSON.stringify(t))));
          return json({ ok: true });
        }
      }

      // ── Health check ─────────────────────────────────────────────────────
      if (path === "/api/health") {
        return json({ ok: true, app: "Life Org API", ts: Date.now() });
      }

      return error("Not found", 404);

    } catch (err) {
      console.error(err);
      return error(`Server error: ${err.message}`, 500);
    }
  },
};
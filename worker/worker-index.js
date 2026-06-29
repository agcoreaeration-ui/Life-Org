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

      // ── Live iCal feed — for iPhone/calendar subscription ────────────────
      // URL: /api/calendar.ics
      // On iPhone: Settings → Calendar → Accounts → Other → Add Subscribed Calendar
      if (path === "/api/calendar.ics") {
        // Fetch all data from D1
        const [evRows, bdRows, termRows, settingsRows] = await Promise.all([
          env.lifeorg.prepare("SELECT data FROM events ORDER BY updated_at DESC").all(),
          env.lifeorg.prepare("SELECT data FROM birthdays").all(),
          env.lifeorg.prepare("SELECT data FROM terms").all(),
          env.lifeorg.prepare("SELECT key, value FROM settings").all(),
        ]);

        const events    = evRows.results.map(r => JSON.parse(r.data));
        const birthdays = bdRows.results.map(r => JSON.parse(r.data));
        const terms     = termRows.results.map(r => JSON.parse(r.data));

        // Rebuild settings object
        const cfg = {};
        settingsRows.results.forEach(r => { cfg[r.key] = JSON.parse(r.value); });
        const familyName = cfg.familyName || "Life Org";

        // VIC public holidays 2026-2027
        const VIC_HOLIDAYS = {
          "2026-01-01":"New Year's Day","2026-01-26":"Australia Day",
          "2026-03-09":"Labour Day","2026-04-03":"Good Friday",
          "2026-04-04":"Easter Saturday","2026-04-05":"Easter Sunday",
          "2026-04-06":"Easter Monday","2026-04-25":"Anzac Day",
          "2026-06-08":"King's Birthday","2026-11-03":"Melbourne Cup Day",
          "2026-12-25":"Christmas Day","2026-12-26":"Boxing Day",
          "2027-01-01":"New Year's Day","2027-01-26":"Australia Day",
          "2027-03-08":"Labour Day","2027-03-26":"Good Friday",
          "2027-03-28":"Easter Sunday","2027-03-29":"Easter Monday",
          "2027-04-25":"Anzac Day","2027-06-14":"King's Birthday",
          "2027-11-02":"Melbourne Cup Day","2027-12-25":"Christmas Day",
          "2027-12-27":"Boxing Day (substitute)",
        };

        // Helper: format date string for iCal
        function icalDate(ds, time) {
          const c = ds.replace(/-/g, "");
          return time ? `${c}T${time.replace(/:/g, "")}00` : c;
        }
        function addDays(ds, n) {
          const d = new Date(ds);
          d.setDate(d.getDate() + n);
          return d.toISOString().slice(0, 10);
        }
        function addMins(ts, m) {
          const [h, mm] = ts.split(":").map(Number), tot = h * 60 + mm + m;
          return `${String(Math.floor(tot / 60) % 24).padStart(2, "0")}:${String(tot % 60).padStart(2, "0")}`;
        }
        function ordinal(n) { const s=["th","st","nd","rd"],v=n%100; return s[(v-20)%10]||s[v]||s[0]; }
        function getBdTitle(bd, y) {
          if (!bd.dob) return `${bd.name}'s Birthday 🎂`;
          const age = y - parseInt(bd.dob.split("-")[0]);
          return `${bd.name}'s ${age}${ordinal(age)} Birthday 🎂`;
        }

        const lines = [
          "BEGIN:VCALENDAR",
          "VERSION:2.0",
          `PRODID:-//LifeOrg//${familyName}//EN`,
          `X-WR-CALNAME:${familyName} — Life Org`,
          "X-WR-CALDESC:Family calendar powered by Life Org",
          "X-APPLE-CALENDAR-COLOR:#4f46e5",
          "CALSCALE:GREGORIAN",
          "METHOD:PUBLISH",
          "X-PUBLISHED-TTL:PT1H",
        ];

        // Regular events
        events.forEach(ev => {
          lines.push("BEGIN:VEVENT");
          lines.push(`UID:${ev.id}@lifeorg`);
          lines.push(`SUMMARY:${ev.title}`);
          lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,"").split(".")[0]}Z`);

          if (ev.allDay || !ev.startTime) {
            lines.push(`DTSTART;VALUE=DATE:${ev.date.replace(/-/g, "")}`);
            const endDs = ev.endDate && ev.endDate !== ev.date
              ? addDays(ev.endDate, 1)
              : addDays(ev.date, 1);
            lines.push(`DTEND;VALUE=DATE:${endDs.replace(/-/g, "")}`);
          } else {
            lines.push(`DTSTART:${icalDate(ev.date, ev.startTime)}`);
            const et = ev.endTime || addMins(ev.startTime, 60);
            lines.push(`DTEND:${icalDate(ev.date, et)}`);
          }

          if (ev.notes) lines.push(`DESCRIPTION:${ev.notes.replace(/\n/g, "\\n")}`);
          const rmap = { yearly:"YEARLY", weekly:"WEEKLY", monthly:"MONTHLY", daily:"DAILY" };
          if (rmap[ev.recurring]) lines.push(`RRULE:FREQ=${rmap[ev.recurring]}`);
          lines.push("END:VEVENT");
        });

        // Birthday events — generate this year + next
        const thisYear = new Date().getFullYear();
        birthdays.forEach(bd => {
          if (!bd.dob) return;
          const [, mm, dd] = bd.dob.split("-");
          [thisYear, thisYear + 1].forEach(yr => {
            const ds = `${yr}-${mm}-${dd}`;
            lines.push("BEGIN:VEVENT");
            lines.push(`UID:bd-${bd.id}-${yr}@lifeorg`);
            lines.push(`SUMMARY:${getBdTitle(bd, yr)}`);
            lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,"").split(".")[0]}Z`);
            lines.push(`DTSTART;VALUE=DATE:${ds.replace(/-/g, "")}`);
            lines.push(`DTEND;VALUE=DATE:${addDays(ds, 1).replace(/-/g, "")}`);
            if (bd.notes) lines.push(`DESCRIPTION:${bd.notes}`);
            lines.push("RRULE:FREQ=YEARLY");
            lines.push("END:VEVENT");
          });
        });

        // School terms
        terms.forEach((term, i) => {
          if (!term.start || !term.end) return;
          lines.push("BEGIN:VEVENT");
          lines.push(`UID:term-${i}@lifeorg`);
          lines.push(`SUMMARY:📚 ${term.label}`);
          lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,"").split(".")[0]}Z`);
          lines.push(`DTSTART;VALUE=DATE:${term.start.replace(/-/g, "")}`);
          lines.push(`DTEND;VALUE=DATE:${addDays(term.end, 1).replace(/-/g, "")}`);
          lines.push("END:VEVENT");
        });

        // VIC public holidays
        Object.entries(VIC_HOLIDAYS).forEach(([ds, name]) => {
          lines.push("BEGIN:VEVENT");
          lines.push(`UID:ph-${ds}@lifeorg`);
          lines.push(`SUMMARY:🏖️ ${name}`);
          lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,"").split(".")[0]}Z`);
          lines.push(`DTSTART;VALUE=DATE:${ds.replace(/-/g, "")}`);
          lines.push(`DTEND;VALUE=DATE:${addDays(ds, 1).replace(/-/g, "")}`);
          lines.push("END:VEVENT");
        });

        lines.push("END:VCALENDAR");
        const ical = lines.join("\r\n");

        return new Response(ical, {
          headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Content-Disposition": "inline; filename=life-org.ics",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Access-Control-Allow-Origin": "*",
          },
        });
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

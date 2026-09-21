/**
 * In-memory mock data store for the boilerplate (no backend required).
 *
 * The app runs entirely on this data while the real API calls are commented
 * out in `src/api/*.js`. Data is generated deterministically at load and
 * mutated in-memory by the mock handlers so CRUD feels real. Nothing persists
 * across a page refresh — that's fine for a UI demo.
 *
 * When your backend is ready, uncomment the real axios calls in the api files
 * (and comment the mock ones) — you can then delete this `mock/` folder.
 */

const CLIENT_NAMES = [
  "Nova Retail Group", "Brightline Studios", "Harbor & Co.", "Peak Fitness",
  "Summit Media", "Ironclad Security", "Lumen Analytics", "Copperfield Design",
  "Riverstone Legal", "Vantage Partners", "Blue Orbit Labs", "Meridian Health",
];
const CITIES = ["San Francisco, CA", "New York, NY", "Boston, MA", "Miami, FL", "Austin, TX", "Seattle, WA", "Chicago, IL", "Denver, CO"];
const STREETS = ["Market St", "Greene St", "Wharf Rd", "Ocean Dr", "Congress Ave", "Pine St", "Broadway"];

const CATALOG = [
  ["Brand & UI design sprint", "One-week design engagement", 3200, "project"],
  ["Frontend development", "React / TypeScript build", 95, "hour"],
  ["Backend API development", "Node / Postgres build", 110, "hour"],
  ["Monthly retainer — support", "Ongoing support & maintenance", 1500, "month"],
  ["Consultation & discovery", "Strategy and scoping call", 150, "hour"],
  ["Performance audit", "Full performance review", 900, "project"],
  ["UX research study", "Interviews + synthesis", 2400, "project"],
  ["Mobile app development", "React Native build", 120, "hour"],
  ["DevOps & CI/CD setup", "Pipelines and infra", 130, "hour"],
  ["SEO optimization", "Technical SEO pass", 750, "project"],
];

const EXPENSE_VENDORS = [
  ["Adobe", "Software", 30, 90], ["Figma", "Software", 12, 60], ["AWS", "Hosting", 80, 260],
  ["Vercel", "Hosting", 20, 150], ["GitHub", "Software", 4, 44], ["Google Workspace", "Software", 12, 72],
  ["Blue Bottle Coffee", "Meals", 8, 45], ["Uber", "Travel", 12, 80], ["Delta Airlines", "Travel", 180, 650],
  ["WeWork", "Office", 250, 400], ["Staples", "Office", 20, 180], ["Meta Ads", "Marketing", 50, 600],
];

// ── Deterministic PRNG (mulberry32) so the demo data is stable ──────────
let _s = 987654321;
function rnd() {
  _s |= 0; _s = (_s + 0x6d2b79f5) | 0;
  let t = Math.imul(_s ^ (_s >>> 15), 1 | _s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const ri = (n) => Math.floor(rnd() * n);
const pick = (a) => a[ri(a.length)];

let _id = 1;
export const nid = (p) => `${p}_${_id++}`;
export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const iso = (d) => d.toISOString();
const ymd = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 14);

export function computeTotals(items, taxRate = 0, discount = 0) {
  const norm = (items || []).map((it, i) => {
    const q = Number(it.quantity) || 0;
    const r = Number(it.rate) || 0;
    return { description: (it.description || "").toString(), quantity: q, rate: r, amount: round2(q * r), position: it.position ?? i };
  });
  const subtotal = round2(norm.reduce((s, it) => s + it.amount, 0));
  const disc = Math.min(round2(Number(discount) || 0), subtotal);
  const base = round2(subtotal - disc);
  const taxAmount = round2((base * (Number(taxRate) || 0)) / 100);
  const total = round2(base + taxAmount);
  return { items: norm, subtotal, discount: disc, taxAmount, total };
}

export function effectiveStatus(inv) {
  if (inv.status === "paid") return "paid";
  if (inv.status === "sent" && inv.due_date) {
    const due = new Date(inv.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (due < today) return "overdue";
  }
  return inv.status;
}

function build() {
  const user = { id: "user_demo", name: "Alex Chen", email: "alex@timetoprogram.com", created_at: iso(daysAgo(120)) };

  const settings = {
    user_id: user.id, company_name: "Chen Studio", logo_url: "",
    address: "410 Townsend St, San Francisco, CA 94107", email: user.email, phone: "+1 (415) 555-0192",
    currency: "USD", tax_rate: 8.5, invoice_prefix: "INV-", next_seq: 1, accent_color: "",
  };

  const clients = CLIENT_NAMES.map((name, i) => ({
    id: nid("cl"), name,
    email: `billing@${slug(name)}.com`,
    company: name.replace(/ (Group|Studios|Co\.?|Partners|Labs)$/i, ""),
    phone: `+1 (${200 + ri(700)}) 555-0${100 + ri(900)}`,
    address: `${100 + ri(900)} ${pick(STREETS)}, ${pick(CITIES)}`,
    notes: "", created_at: iso(daysAgo(100 - i * 3)),
  }));

  const items = CATALOG.map(([name, description, rate, unit]) => ({ id: nid("it"), name, description, rate, unit }));

  const invoices = [];
  let seq = 1;
  for (let i = 0; i < 30; i++) {
    const issueDaysAgo = ri(180);
    const issue = ymd(daysAgo(issueDaysAgo));
    const due = ymd(daysAgo(issueDaysAgo - [15, 30, 30, 45][ri(4)]));
    const lineCount = 1 + ri(3);
    const rawItems = [];
    for (let j = 0; j < lineCount; j++) {
      const c = pick(CATALOG);
      const qty = c[3] === "hour" ? pick([8, 12, 16, 24, 32, 40]) : 1;
      rawItems.push({ description: c[0], quantity: qty, rate: c[2] });
    }
    const taxRate = rnd() < 0.7 ? 8.5 : 0;
    const discount = rnd() < 0.15 ? [50, 100, 150][ri(3)] : 0;
    const totals = computeTotals(rawItems, taxRate, discount);
    const roll = rnd();
    const status = roll < 0.6 ? "paid" : roll < 0.85 ? "sent" : "draft";
    let paid_at = null;
    if (status === "paid") {
      const paidDaysAgo = Math.max(0, issueDaysAgo - ri(Math.min(35, issueDaysAgo + 1)));
      paid_at = iso(daysAgo(paidDaysAgo));
    }
    invoices.push({
      id: nid("inv"), client_id: pick(clients).id, invoice_number: `INV-${String(seq).padStart(4, "0")}`,
      status, issue_date: issue, due_date: due, currency: "USD",
      tax_rate: taxRate, discount: totals.discount, subtotal: totals.subtotal, tax_amount: totals.taxAmount, total: totals.total,
      notes: "Thank you for your business.", terms: "Payment due within 30 days.",
      paid_at, created_at: iso(daysAgo(issueDaysAgo)),
      items: totals.items.map((it) => ({ id: nid("li"), ...it })),
    });
    seq++;
  }
  settings.next_seq = seq;

  const payments = invoices
    .filter((i) => i.status === "paid")
    .map((inv) => ({
      id: nid("pay"), invoice_id: inv.id, amount: inv.total,
      method: pick(["Bank transfer", "Credit card", "Check", "PayPal"]),
      paid_on: (inv.paid_at || iso(new Date())).slice(0, 10), notes: "", created_at: inv.paid_at,
    }));

  const expenses = [];
  for (let i = 0; i < 20; i++) {
    const [vendor, category, mn, mx] = pick(EXPENSE_VENDORS);
    expenses.push({
      id: nid("exp"), vendor, category, expense_date: ymd(daysAgo(ri(180))),
      amount: round2(mn + rnd() * (mx - mn)), currency: "USD", notes: "", created_at: iso(daysAgo(ri(180))),
    });
  }

  return { user, settings, clients, items, invoices, payments, expenses };
}

export const store = build();

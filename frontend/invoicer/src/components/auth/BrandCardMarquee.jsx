import { motion } from "framer-motion";
import {
  TrendingUp,
  Sparkles,
  ScanLine,
  Check,
  Clock,
  BellRing,
} from "lucide-react";

/**
 * Infinite horizontal marquee of "product preview" cards for the auth panel.
 * Renders the card list twice and slides the row so the wrap-around is invisible.
 */
export function BrandCardMarquee() {
  const CARDS = [
    RevenueCard,
    InvoiceCard,
    OverdueCard,
    ReceiptCard,
    ReminderCard,
    PaidCard,
  ];
  const tilts = [-2, 1.5, -1, 2, -1.5, 1];

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        maskImage:
          "linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)",
      }}
    >
      <motion.div
        className="flex gap-5 py-4"
        animate={{ x: ["0%", "-400%"] }}
        transition={{ duration: 55, repeat: Infinity, ease: "linear" }}
      >
        {[...CARDS, ...CARDS].map((Card, i) => (
          <div
            key={i}
            className="shrink-0"
            style={{ transform: `rotate(${tilts[i % tilts.length]}deg)` }}
          >
            <Card />
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/**
 * Diagonal field of scrolling cards for the auth panel — three rows scrolling
 * horizontally inside a rotated block anchored to the lower-right, so the cards
 * appear to flow diagonally across the bottom-right half of the panel.
 */
export function DiagonalMarquee() {
  const rows = [
    { cards: [RevenueCard, InvoiceCard, OverdueCard], duration: 44, reverse: false },
    { cards: [ReceiptCard, ReminderCard, PaidCard], duration: 52, reverse: true },
    { cards: [InvoiceCard, PaidCard, RevenueCard], duration: 48, reverse: false },
  ];
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      <div
        className="absolute bottom-[-8%] right-[-32%] w-[175%]"
        style={{
          transform: "rotate(-24deg)",
          transformOrigin: "bottom right",
          maskImage: "linear-gradient(300deg, #000 46%, transparent 82%)",
          WebkitMaskImage: "linear-gradient(300deg, #000 46%, transparent 82%)",
        }}
      >
        <div className="flex flex-col gap-5">
          {rows.map((r, i) => (
            <MarqueeRow key={i} {...r} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MarqueeRow({ cards, duration, reverse }) {
  const tripled = [...cards, ...cards, ...cards];
  const from = reverse ? "-33.333%" : "0%";
  const to = reverse ? "0%" : "-33.333%";
  return (
    <motion.div
      className="flex gap-5"
      animate={{ x: [from, to] }}
      transition={{ duration, repeat: Infinity, ease: "linear" }}
    >
      {tripled.map((Card, i) => (
        <div key={i} className="shrink-0">
          <Card />
        </div>
      ))}
    </motion.div>
  );
}

const TEAL = "#0d9488";
const TEAL_DARK = "#0f766e";
const TEAL_SOFT = "#D3F4EC";

function PreviewCard({ children, width = 300 }) {
  return (
    <div
      className="bg-white rounded-3xl p-5 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.45)]"
      style={{ width }}
    >
      {children}
    </div>
  );
}

function Label({ children }) {
  return (
    <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
      {children}
    </div>
  );
}

function Footer({ subtitle }) {
  return (
    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2">
      <span className="h-4 w-4 rounded-md" style={{ background: `linear-gradient(135deg,${TEAL},${TEAL_DARK})` }} />
      <span className="text-[11px] font-medium text-gray-700">{subtitle || "Invoicer"}</span>
    </div>
  );
}

function Pill({ children, tone = "teal" }) {
  const styles =
    tone === "teal"
      ? { background: TEAL_SOFT, color: TEAL_DARK }
      : tone === "amber"
      ? { background: "#FBF1E2", color: "#B45309" }
      : { background: "#FDE7EA", color: "#BE123C" };
  return (
    <div
      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold"
      style={styles}
    >
      {children}
    </div>
  );
}

/* Card 1 — Total revenue */
function RevenueCard() {
  return (
    <PreviewCard width={300}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <Label>Total Revenue</Label>
          <div className="flex items-baseline gap-1 mt-1.5">
            <span
              className="text-[38px] font-semibold leading-none text-gray-900"
              style={{ fontFamily: '"Geist","Inter",sans-serif', fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}
            >
              $22,375
            </span>
          </div>
        </div>
        <Pill>
          <TrendingUp size={10} strokeWidth={2.5} /> +12%
        </Pill>
      </div>
      <div className="flex items-end gap-1.5 h-14">
        {[40, 55, 48, 68, 60, 82].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-md"
            style={{ height: `${h}%`, background: `linear-gradient(180deg,${TEAL},${TEAL_DARK})`, opacity: 0.4 + i * 0.1 }}
          />
        ))}
      </div>
      <Footer subtitle="Last 6 months" />
    </PreviewCard>
  );
}

/* Card 2 — Invoice */
function InvoiceCard() {
  return (
    <PreviewCard width={320}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <Label>Invoice</Label>
          <div className="text-[15px] font-semibold text-gray-900 mt-1 tabular">INV-0012</div>
        </div>
        <Pill>Sent</Pill>
      </div>
      <div className="space-y-1.5">
        {[["Design sprint", "$3,200"], ["Development · 40h", "$3,800"]].map(([d, a]) => (
          <div key={d} className="flex items-center justify-between text-[12.5px]">
            <span className="text-gray-500">{d}</span>
            <span className="text-gray-900 font-medium tabular">{a}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
        <span className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">Total</span>
        <span className="text-[16px] font-semibold tabular" style={{ color: TEAL_DARK }}>$7,595</span>
      </div>
      <Footer subtitle="Nova Retail Group" />
    </PreviewCard>
  );
}

/* Card 3 — Overdue */
function OverdueCard() {
  const rows = [
    { c: "Brightline Studios", a: "$3,787", d: "8d" },
    { c: "Peak Fitness", a: "$1,628", d: "15d" },
    { c: "Nova Retail", a: "$900", d: "20d" },
  ];
  return (
    <PreviewCard width={320}>
      <div className="flex items-start justify-between mb-4">
        <Label>Overdue</Label>
        <Pill tone="rose">
          <Clock size={10} strokeWidth={2.5} /> 3 open
        </Pill>
      </div>
      <div className="space-y-2.5">
        {rows.map((r) => (
          <div key={r.c} className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-gray-900 truncate">{r.c}</div>
              <div className="text-[10px] text-gray-400">{r.d} overdue</div>
            </div>
            <span className="text-[13px] font-semibold text-gray-900 tabular">{r.a}</span>
          </div>
        ))}
      </div>
      <Footer subtitle="Needs follow-up" />
    </PreviewCard>
  );
}

/* Card 4 — AI Receipt scan */
function ReceiptCard() {
  return (
    <PreviewCard width={300}>
      <div className="flex items-start justify-between mb-3">
        <Label>AI Receipt Scan</Label>
        <Pill>
          <ScanLine size={10} strokeWidth={2.5} /> Parsed
        </Pill>
      </div>
      <div className="rounded-2xl p-3" style={{ background: TEAL_SOFT }}>
        <div className="text-[9px] uppercase tracking-wide font-semibold mb-1" style={{ color: TEAL_DARK }}>
          Extracted
        </div>
        <div className="text-[13px] font-medium text-gray-900">Adobe Inc.</div>
        <div className="flex items-center justify-between text-[12px] text-gray-600 mt-1">
          <span>Creative Cloud · ×1</span>
          <span className="tabular font-semibold text-gray-900">$54.99</span>
        </div>
      </div>
      <Footer subtitle="Image → invoice" />
    </PreviewCard>
  );
}

/* Card 5 — AI Payment reminder */
function ReminderCard() {
  return (
    <PreviewCard width={340}>
      <div className="flex items-start justify-between mb-3">
        <Label>AI Reminder</Label>
        <Pill>
          <Sparkles size={10} strokeWidth={2.5} /> Drafted
        </Pill>
      </div>
      <div className="rounded-2xl bg-gray-50 border border-gray-100 p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <BellRing size={12} style={{ color: TEAL_DARK }} />
          <span className="text-[12px] font-semibold text-gray-900">Friendly nudge</span>
        </div>
        <p className="text-[12px] text-gray-500 leading-snug">
          "Hi Nova — just a gentle reminder that invoice INV-0006 for $2,400 was due last week…"
        </p>
      </div>
      <Footer subtitle="One click to send" />
    </PreviewCard>
  );
}

/* Card 6 — Paid */
function PaidCard() {
  return (
    <PreviewCard width={300}>
      <div className="flex items-start justify-between mb-4">
        <Label>Paid this month</Label>
        <Pill>
          <Check size={10} strokeWidth={3} /> On track
        </Pill>
      </div>
      <div
        className="text-[34px] font-semibold leading-none text-gray-900"
        style={{ fontFamily: '"Geist","Inter",sans-serif', fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}
      >
        $3,472
      </div>
      <div className="flex items-center gap-1 mt-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <span
            key={i}
            className="h-2 flex-1 rounded-full"
            style={{ background: i < 6 ? TEAL : "#E5E7EB" }}
          />
        ))}
      </div>
      <Footer subtitle="6 of 8 invoices paid" />
    </PreviewCard>
  );
}

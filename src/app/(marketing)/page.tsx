import Link from "next/link";

const SLOTS = [
  { time: "9:00", label: "Aarav — Haircut", state: "done" },
  { time: "9:45", label: "Meera — Colour touch-up", state: "done" },
  { time: "10:30", label: "Open slot", state: "open" },
  { time: "11:00", label: "Rohan — Beard trim", state: "next" },
  { time: "11:30", label: "Open slot", state: "open" },
  { time: "12:15", label: "Sana — Spa package", state: "booked" },
] as const;

const FEATURES = [
  {
    title: "Online booking, no phone tag",
    body: "Clients pick a service, a staff member, and a real open slot — your calendar updates itself the moment they confirm.",
  },
  {
    title: "Reminders that send themselves",
    body: "Automatic email reminders go out before every visit, so fewer clients forget and fewer chairs sit empty.",
  },
  {
    title: "Recurring appointments",
    body: "Weekly training sessions, monthly maintenance, biweekly touch-ups — set the cadence once and it keeps booking.",
  },
  {
    title: "A portal your clients actually use",
    body: "Clients see their upcoming visits, reschedule themselves, and pay online if you turn that on.",
  },
] as const;

const STEPS = [
  {
    n: "01",
    title: "Set up your shop",
    body: "Add your business name, hours, and the services you offer with pricing and duration.",
  },
  {
    n: "02",
    title: "Bring on your staff",
    body: "Invite each stylist, trainer, or technician so clients can book with the right person.",
  },
  {
    n: "03",
    title: "Share your booking link",
    body: "Every shop gets its own Queueva page clients can book from — on your site, Instagram, or WhatsApp.",
  },
  {
    n: "04",
    title: "Let the reminders run",
    body: "Queueva handles confirmations and reminders automatically, before and after every visit.",
  },
] as const;

function slotStateClasses(state: (typeof SLOTS)[number]["state"]) {
  switch (state) {
    case "done":
      return "border-line-dark/0 bg-white/5 text-white/40";
    case "next":
      return "border-marigold bg-marigold/15 text-white";
    case "booked":
      return "border-white/10 bg-white/5 text-white/80";
    default:
      return "border-dashed border-white/15 text-white/30";
  }
}

export default function MarketingHome() {
  return (
    <>
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <span className="font-display text-xl tracking-tight">Queueva</span>
          <nav className="hidden items-center gap-8 text-sm font-medium text-ink-soft md:flex">
            <a href="#features" className="hover:text-ink">
              Product
            </a>
            <a href="#how-it-works" className="hover:text-ink">
              How it works
            </a>
            <a href="#pricing" className="hover:text-ink">
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden text-sm font-semibold text-ink-soft hover:text-ink sm:inline"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-raised"
            >
              Start free
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ---------------------------------------------------------------- HERO */}
        <section className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-2 md:items-center md:py-24">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-marigold-ink uppercase">
              For salons, gyms, clinics & repair shops
            </p>
            <h1 className="mt-4 font-display text-4xl leading-[1.1] text-ink sm:text-5xl">
              Your front desk,
              <br />
              <span className="italic text-forest">without the front desk.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg text-ink-soft">
              Queueva books appointments, chases no-shows with automatic
              reminders, and keeps every recurring client on schedule — so you
              can spend the day on clients, not the calendar.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/signup"
                className="rounded-full bg-marigold px-6 py-3 text-sm font-bold text-marigold-ink transition hover:brightness-95"
              >
                Set up your shop — free
              </Link>
              <a
                href="#how-it-works"
                className="text-sm font-semibold text-ink-soft hover:text-ink"
              >
                See how it works →
              </a>
            </div>
          </div>

          {/* Signature element: a live schedule strip, the actual product in miniature */}
          <div className="rounded-2xl bg-navy p-6 shadow-xl shadow-navy/10">
            <div className="flex items-center justify-between text-xs font-semibold text-white/50">
              <span>Today · Glow Salon</span>
              <span className="flex items-center gap-1.5 text-marigold">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-marigold motion-reduce:animate-none" />
                next slot in 40 min
              </span>
            </div>
            <ol className="mt-5 space-y-2">
              {SLOTS.map((slot) => (
                <li
                  key={slot.time}
                  className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm ${slotStateClasses(
                    slot.state
                  )}`}
                >
                  <span className="font-mono text-xs tabular-nums opacity-80">
                    {slot.time}
                  </span>
                  <span className="flex-1 px-3 font-medium">{slot.label}</span>
                  {slot.state === "next" && (
                    <span className="rounded-full bg-marigold px-2 py-0.5 text-[10px] font-bold text-marigold-ink">
                      UP NEXT
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------------------------------------------------------------- PROBLEM/SOLUTION */}
        <section className="border-y border-line bg-canvas-raised">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-2">
            <div>
              <h2 className="font-display text-2xl text-ink">
                Booking by phone doesn&apos;t scale.
              </h2>
              <p className="mt-3 text-ink-soft">
                Missed calls become missed bookings. Sticky-note schedules
                don&apos;t send reminders. And every no-show costs a chair,
                a table, or a bay you can&apos;t get back.
              </p>
            </div>
            <div>
              <h2 className="font-display text-2xl text-ink">
                Queueva runs the front desk for you.
              </h2>
              <p className="mt-3 text-ink-soft">
                One booking page for your shop, automatic reminders before
                every visit, recurring appointments that book themselves, and
                a client portal that handles the back-and-forth.
              </p>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- FEATURES */}
        <section id="features" className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="font-display text-3xl text-ink">
            Everything the front desk used to do.
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-line bg-canvas-raised p-6"
              >
                <h3 className="font-semibold text-ink">{f.title}</h3>
                <p className="mt-2 text-sm text-ink-soft">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------------------------------------------------------- HOW IT WORKS (real sequence, numbering earns its keep) */}
        <section id="how-it-works" className="bg-navy py-16 text-white">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="font-display text-3xl">From sign-up to first booking.</h2>
            <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s) => (
                <li key={s.n}>
                  <span className="font-display text-3xl text-marigold">{s.n}</span>
                  <h3 className="mt-3 font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm text-white/60">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------------------------------------------------------------- PRICING TEASER */}
        <section id="pricing" className="mx-auto max-w-6xl px-6 py-16">
          <div className="rounded-2xl border border-line bg-canvas-raised p-10 text-center">
            <h2 className="font-display text-3xl text-ink">
              Free while you&apos;re getting started.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-ink-soft">
              Every shop starts on a free trial with full booking and
              reminders. Upgrade to a paid plan when you&apos;re ready to add
              more staff and client payments.
            </p>
            <Link
              href="/signup"
              className="mt-6 inline-block rounded-full bg-marigold px-6 py-3 text-sm font-bold text-marigold-ink transition hover:brightness-95"
            >
              Create your shop
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-ink-soft sm:flex-row">
          <span className="font-display text-ink">Queueva</span>
          <span>© {new Date().getFullYear()} Queueva. Built for local service businesses.</span>
        </div>
      </footer>
    </>
  );
}

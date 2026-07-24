import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import LandingMotion from "./LandingMotion";
import "./landing.css";

// Public marketing page. Fully static so it's crawlable — no "use client"
// at the top level; the only client code is the progressive-enhancement
// motion component below.
export const dynamic = "force-static";

// Where the real product lives. The landing page is marketing-only and just
// links out to the app.
const APP_URL = "https://www.getpatholearn.com";
const OG_IMAGE = "https://www.getpatholearn.com/patholearn-slide-view.jpeg";

const SLIDE_ALT =
  "PathoLearn slide viewer showing a lymph node in Classical Hodgkin Lymphoma, with four numbered annotations marking the Reed-Sternberg cell, owl-eye nucleolus, background lymphocytes and mononuclear Hodgkin cell, alongside a panel describing each structure.";

export const metadata: Metadata = {
  // Absolute title so the root layout's "%s | PathoLearn" template doesn't
  // double-brand the marketing headline.
  title: {
    absolute: "PathoLearn — Histopathology Learning Platform for Medical Schools",
  },
  description:
    "PathoLearn is a histopathology learning platform for medical students. Real annotated slides, active-recall quizzes and spaced repetition, on any device.",
  alternates: { canonical: "/landing" },
  openGraph: {
    type: "website",
    siteName: "PathoLearn",
    url: `${APP_URL}/landing`,
    title: "PathoLearn — Histopathology Learning Platform",
    description:
      "Real annotated slides, active-recall quizzes and spaced repetition, on any device.",
    // Absolute URL — relative paths don't resolve in social previews.
    images: [{ url: OG_IMAGE, width: 1200, height: 540, alt: SLIDE_ALT }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PathoLearn — Histopathology Learning Platform",
    description:
      "Real annotated slides, active-recall quizzes and spaced repetition, on any device.",
    images: [OG_IMAGE],
  },
};

export default function LandingPage() {
  return (
    <div id="pl-landing" className="pl-landing min-h-screen font-sans">
      <LandingMotion />

      {/* ── Nav ─────────────────────────────────────────────── */}
      <div
        id="pl-nav"
        className="pl-nav sticky top-0 z-50 bg-[rgba(245,246,250,0.82)] backdrop-blur-md"
      >
        <nav className="mx-auto flex max-w-[1140px] items-center justify-between px-7 py-[18px]">
          <Link href="/landing" className="inline-flex items-center" aria-label="PathoLearn home">
            <Image
              src="/patholearn-logo.png"
              alt="PathoLearn"
              width={42}
              height={34}
              className="h-[34px] w-auto"
              priority
            />
          </Link>
          <a
            href={APP_URL}
            className="pl-navcta rounded-[6px] border border-[#0e1330] px-[18px] py-[9px] font-mono text-[0.78rem] no-underline"
          >
            Try PathoLearn
          </a>
        </nav>
      </div>

      {/* ── Hero ────────────────────────────────────────────── */}
      <header className="pl-hero relative px-0 pb-10 pt-[76px] text-center max-[860px]:pt-[52px]">
        <div className="relative mx-auto max-w-[1140px] px-7">
          <span
            className="mb-[18px] block font-mono text-[0.72rem] uppercase tracking-[0.14em] text-[#4830f0]"
            data-rise
          >
            Learn from real slides
          </span>
          <h1
            className="mb-[22px] text-[clamp(2.5rem,5.4vw,4.1rem)] font-semibold leading-[1.08] tracking-[-0.015em] text-[#0e1330]"
            data-rise
            data-d="1"
          >
            Master histopathology,
            <br />
            <em className="not-italic text-[#1860f0]">slide by slide.</em>
          </h1>
          <p
            className="mx-auto mb-[34px] max-w-[56ch] text-[1.14rem] text-[#4e5578]"
            data-rise
            data-d="2"
          >
            Real annotated slides, structure by structure — with active-recall quizzes and spaced
            repetition that make the patterns stick.
          </p>
          <div className="flex flex-wrap justify-center gap-[13px]" data-rise data-d="3">
            <a
              href="#demo"
              className="pl-btn pl-btn-primary inline-flex items-center gap-[9px] rounded-[6px] bg-[#1860f0] px-[26px] py-[14px] font-mono text-[0.84rem] text-[#fffdfb] no-underline shadow-[0_6px_18px_-6px_rgba(24,96,240,0.42)]"
            >
              Book a demo <span className="pl-arw">→</span>
            </a>
            <a
              href={APP_URL}
              className="pl-btn pl-btn-ghost inline-flex items-center gap-[9px] rounded-[6px] border border-[#d8dcea] bg-[#fffdfb] px-[26px] py-[14px] font-mono text-[0.84rem] text-[#0e1330] no-underline"
            >
              Try PathoLearn
            </a>
          </div>
        </div>
      </header>

      {/* ── Hero screenshot ─────────────────────────────────── */}
      <div className="pl-shot-stage px-0 pb-24 pt-11 max-[860px]:pb-[60px]">
        <div className="mx-auto max-w-[1140px] px-7">
          <div
            id="pl-shot"
            className="pl-shot relative overflow-hidden rounded-[12px] border border-[#d8dcea] bg-[#fffdfb] shadow-[0_40px_80px_-40px_rgba(14,19,48,0.5),0_8px_24px_-12px_rgba(14,19,48,0.2)]"
          >
            <Image
              src="/patholearn-slide-view.jpeg"
              alt={SLIDE_ALT}
              width={1200}
              height={540}
              className="block h-auto w-full"
              sizes="(max-width: 1140px) 100vw, 1140px"
              priority
            />
            <div className="pl-shot-glow" />
          </div>
        </div>
      </div>

      {/* Real HTML comment (not a JSX comment) so the placeholder survives into
          the served markup and view-source, pending institutional approval. */}
      <div
        aria-hidden
        dangerouslySetInnerHTML={{
          __html:
            "<!-- SOCIAL PROOF STRIP: re-add once institutional naming approval is granted -->",
        }}
      />

      {/* ── The problem ─────────────────────────────────────── */}
      <section className="px-0 py-[88px]">
        <div className="mx-auto max-w-[1140px] px-7">
          <div className="mb-12 max-w-[660px]" data-rise>
            <span className="mb-3 block font-mono text-[0.72rem] uppercase tracking-[0.14em] text-[#4830f0]">
              The problem
            </span>
            <h2 className="text-[clamp(1.9rem,3.3vw,2.6rem)] font-semibold leading-[1.08] tracking-[-0.015em]">
              Histopathology is learned by seeing, not reading.
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-[22px] max-[860px]:grid-cols-1">
            <div
              className="pl-lift rounded-[6px] border border-[#d8dcea] bg-[#fffdfb] p-[30px]"
              data-rise
              data-d="1"
            >
              <h3 className="mb-[11px] text-[1.12rem] font-semibold">Textbooks are static</h3>
              <p className="text-[0.96rem] text-[#4e5578]">
                Histopathology is pattern recognition across hundreds of real slides — not diagrams
                and paragraphs on a page.
              </p>
            </div>
            <div
              className="pl-lift rounded-[6px] border border-[#d8dcea] bg-[#fffdfb] p-[30px]"
              data-rise
              data-d="2"
            >
              <h3 className="mb-[11px] text-[1.12rem] font-semibold">Microscope time runs out</h3>
              <p className="text-[0.96rem] text-[#4e5578]">
                Lab sessions are limited and the slides stay in the lab. Most revision happens from
                memory, long after the scope is packed away.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────── */}
      <section className="bg-[#eaecf5] px-0 py-[88px]">
        <div className="mx-auto max-w-[1140px] px-7">
          <div className="mx-auto mb-12 max-w-[660px] text-center" data-rise>
            <span className="mb-3 block font-mono text-[0.72rem] uppercase tracking-[0.14em] text-[#4830f0]">
              How it works
            </span>
            <h2 className="text-[clamp(1.9rem,3.3vw,2.6rem)] font-semibold leading-[1.08] tracking-[-0.015em]">
              Built for repetition
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-[30px] max-[860px]:grid-cols-1">
            {[
              {
                num: "01",
                title: "Open a slide",
                body: "Real histopathology slides with every diagnostic structure marked and described — zoom in and explore at your own pace.",
                d: "1",
              },
              {
                num: "02",
                title: "Test yourself",
                body: "Active-recall questions drawn from each slide and topic, so you're retrieving the pattern rather than re-reading it.",
                d: "2",
              },
              {
                num: "03",
                title: "Return at the right time",
                body: "Spaced repetition schedules each card for the moment just before you'd forget it. Progress tracked by topic and slide.",
                d: "3",
              },
            ].map((step) => (
              <div
                key={step.num}
                className="pl-step border-t-2 border-[#d8dcea] pt-[18px]"
                data-rise
                data-d={step.d}
              >
                <span className="mb-3 block font-mono text-[0.74rem] text-[#4830f0]">
                  {step.num}
                </span>
                <h3 className="mb-[11px] text-[1.18rem] font-semibold">{step.title}</h3>
                <p className="text-[0.96rem] text-[#4e5578]">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Institutions & individuals ──────────────────────── */}
      <section id="institutions" className="px-0 py-[88px]">
        <div className="mx-auto max-w-[1140px] px-7">
          <div className="mx-auto mb-12 max-w-[660px] text-center" data-rise>
            <span className="mb-3 block font-mono text-[0.72rem] uppercase tracking-[0.14em] text-[#4830f0]">
              Institutions &amp; individuals
            </span>
            <h2 className="text-[clamp(1.9rem,3.3vw,2.6rem)] font-semibold leading-[1.08] tracking-[-0.015em]">
              One platform, two audiences
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-[22px] max-[860px]:grid-cols-1">
            <div
              className="pl-lift rounded-[6px] border border-[#d8dcea] bg-[#fffdfb] p-9"
              data-rise
              data-d="1"
            >
              <h3 className="mb-2 text-[1.35rem] font-semibold">For institutions</h3>
              <span className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-[#4830f0]">
                Seat-based licensing
              </span>
              <ul className="my-5 mb-[26px] list-none space-y-[11px]">
                <li className="pl-li text-[0.96rem] text-[#4e5578]">Priced per student, per year</li>
                <li className="pl-li text-[0.96rem] text-[#4e5578]">
                  Deployed and in active use at a Nigerian medical university
                </li>
                <li className="pl-li text-[0.96rem] text-[#4e5578]">
                  Instructor dashboards and cohort management
                </li>
              </ul>
              <a
                id="demo"
                href="mailto:hello@getpatholearn.com"
                className="pl-btn pl-btn-primary inline-flex items-center gap-[9px] rounded-[6px] bg-[#1860f0] px-[26px] py-[14px] font-mono text-[0.84rem] text-[#fffdfb] no-underline shadow-[0_6px_18px_-6px_rgba(24,96,240,0.42)]"
              >
                Talk to us <span className="pl-arw">→</span>
              </a>
            </div>
            <div
              className="pl-lift rounded-[6px] border border-[#d8dcea] bg-[#fffdfb] p-9"
              data-rise
              data-d="2"
            >
              <h3 className="mb-2 text-[1.35rem] font-semibold">For Individuals</h3>
              <span className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-[#4830f0]">
                Study anywhere
              </span>
              <ul className="my-5 mb-[26px] list-none space-y-[11px]">
                <li className="pl-li text-[0.96rem] text-[#4e5578]">
                  Installable on any device, works offline-friendly
                </li>
                <li className="pl-li text-[0.96rem] text-[#4e5578]">
                  Spaced repetition means less cramming before exams
                </li>
                <li className="pl-li text-[0.96rem] text-[#4e5578]">
                  Real slides with real annotations, not stock diagrams
                </li>
              </ul>
              <a
                href={APP_URL}
                className="pl-btn pl-btn-ghost inline-flex items-center gap-[9px] rounded-[6px] border border-[#d8dcea] bg-[#fffdfb] px-[26px] py-[14px] font-mono text-[0.84rem] text-[#0e1330] no-underline"
              >
                See it in action
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer CTA (dark band) ──────────────────────────── */}
      <section className="pl-footcta bg-[#0e1330] px-0 py-24 text-center text-[#fffdfb]">
        <div className="relative mx-auto max-w-[1140px] px-7">
          <h2
            className="mb-4 text-[clamp(1.9rem,3.8vw,2.8rem)] font-semibold leading-[1.08] tracking-[-0.015em] text-[#fffdfb]"
            data-rise
          >
            Bring PathoLearn to your institution
          </h2>
          <p className="mb-8 text-[#b9c0dc]" data-rise data-d="1">
            Real annotated slides and active recall, ready to deploy.
          </p>
          <div data-rise data-d="2">
            <a
              href="mailto:hello@getpatholearn.com"
              className="pl-btn pl-btn-primary inline-flex items-center gap-[9px] rounded-[6px] bg-[#1860f0] px-[26px] py-[14px] font-mono text-[0.84rem] text-[#fffdfb] no-underline shadow-[0_6px_18px_-6px_rgba(24,96,240,0.42)]"
            >
              Request a demo <span className="pl-arw">→</span>
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="px-0 py-9">
        <div className="mx-auto flex max-w-[1140px] flex-wrap items-center justify-between gap-[14px] px-7">
          <span className="inline-flex items-center">
            <Image
              src="/patholearn-logo.png"
              alt="PathoLearn"
              width={32}
              height={26}
              className="h-[26px] w-auto opacity-90"
            />
          </span>
          <div className="flex gap-[22px] text-[0.86rem] text-[#4e5578]">
            <a href="#" className="no-underline transition-colors hover:text-[#1860f0]">
              About
            </a>
            <a href="#" className="no-underline transition-colors hover:text-[#1860f0]">
              Contact
            </a>
            <a href="/privacy" className="no-underline transition-colors hover:text-[#1860f0]">
              Privacy
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { Metadata } from "next";
import fs from "fs";
import path from "path";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GameSlug, GAME_CATALOG } from "@/lib/puzzles/types";
import { getDailyEdition } from "@/lib/puzzles/daily-engine";
import { GAME_EDITORIALS } from "@/lib/puzzles/editorial";
import { AdBanner } from "@/components/ads/ad-banner";

// Board Components
import { QueensBoard } from "@/components/games/queens/queens-board";
import { TangoBoard } from "@/components/games/tango/tango-board";
import { MiniSudokuBoard } from "@/components/games/mini-sudoku/mini-sudoku-board";
import { PinpointBoard } from "@/components/games/pinpoint/pinpoint-board";
import { CrossclimbBoard } from "@/components/games/crossclimb/crossclimb-board";
import { PatchesBoard } from "@/components/games/patches/patches-board";
import { ZipBoard } from "@/components/games/zip/zip-board";
import { WendBoard } from "@/components/games/wend/wend-board";

interface GamePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ mode?: string }>;
}

export async function generateMetadata({ params }: GamePageProps): Promise<Metadata> {
  const { slug } = await params;
  const game = GAME_CATALOG.find((g) => g.slug === slug);
  if (!game) return { title: "Game Not Found | Brain Games" };

  const edition = getDailyEdition(game.slug);
  const title = `${game.title} #${edition.issueNumber} - Daily Brain Game`;
  const description = `Play today's daily puzzle ${game.title} #${edition.issueNumber}. ${game.description}`;
  const canonicalUrl = `https://brain-games.vercel.app/games/${slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonicalUrl,
    },
  };
}

function loadPuzzleForSlug(slug: GameSlug, issueNumber: number) {
  try {
    const filePath = path.join(process.cwd(), "data", "puzzles", `${slug}.json`);
    if (!fs.existsSync(filePath)) return null;
    const pool = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    if (!Array.isArray(pool) || pool.length === 0) return null;
    const index = (issueNumber - 1) % pool.length;
    return pool[index];
  } catch {
    return null;
  }
}

export default async function GamePage({ params, searchParams }: GamePageProps) {
  const { slug } = await params;
  const game = GAME_CATALOG.find((g) => g.slug === slug);
  if (!game) notFound();

  const query = await searchParams;
  const session = await auth();
  const daily = getDailyEdition(game.slug);

  // Load the authoritative puzzle for today's issue
  const puzzle = loadPuzzleForSlug(game.slug, daily.issueNumber);
  if (!puzzle) notFound();

  // Check if user has already solved today's edition
  let initialMode: "daily" | "practice" = query.mode === "practice" ? "practice" : "daily";

  if (session?.user?.id && initialMode === "daily") {
    const completed = await prisma.dailyGameCompletion.findUnique({
      where: {
        userId_gameSlug_dateKey: {
          userId: session.user.id,
          gameSlug: game.slug,
          dateKey: daily.dateKey,
        },
      },
    });
    if (completed) {
      initialMode = "practice";
    }
  }

  const editorial = GAME_EDITORIALS[game.slug];

  // Schema.org Structured Data for SEO Rich Snippets
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["SoftwareApplication", "Game"],
        "name": `${game.title} #${daily.issueNumber}`,
        "description": game.description,
        "applicationCategory": "GameApplication",
        "operatingSystem": "Any",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD",
        },
      },
      {
        "@type": "FAQPage",
        "mainEntity": editorial?.faqs.map((faq) => ({
          "@type": "Question",
          "name": faq.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": faq.answer,
          },
        })),
      },
    ],
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* JSON-LD Rich Snippet for Search Engines */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Main Interactive Board Mount */}
      <main className="mb-12">
        {game.slug === "queens" && (
          <QueensBoard
            puzzle={puzzle}
            issueNumber={daily.issueNumber}
            initialMode={initialMode}
          />
        )}
        {game.slug === "tango" && (
          <TangoBoard
            puzzle={puzzle}
            issueNumber={daily.issueNumber}
            initialMode={initialMode}
          />
        )}
        {game.slug === "mini-sudoku" && (
          <MiniSudokuBoard
            puzzle={puzzle}
            issueNumber={daily.issueNumber}
            initialMode={initialMode}
          />
        )}
        {game.slug === "pinpoint" && (
          <PinpointBoard
            puzzle={puzzle}
            issueNumber={daily.issueNumber}
            initialMode={initialMode}
          />
        )}
        {game.slug === "crossclimb" && (
          <CrossclimbBoard
            puzzle={puzzle}
            issueNumber={daily.issueNumber}
            initialMode={initialMode}
          />
        )}
        {game.slug === "patches" && (
          <PatchesBoard
            puzzle={puzzle}
            issueNumber={daily.issueNumber}
            initialMode={initialMode}
          />
        )}
        {game.slug === "zip" && (
          <ZipBoard
            puzzle={puzzle}
            issueNumber={daily.issueNumber}
            initialMode={initialMode}
          />
        )}
        {game.slug === "wend" && (
          <WendBoard
            puzzle={puzzle}
            issueNumber={daily.issueNumber}
            initialMode={initialMode}
          />
        )}
      </main>

      {/* Non-Disruptive Responsive Ad Banner (0 CLS) */}
      <div className="my-10 flex justify-center">
        <AdBanner slotType="bottom" />
      </div>

      {/* Rich Editorial & SEO Content (AdSense Policy Compliant) */}
      <article className="mt-12 space-y-10 border-t border-slate-200 pt-10 text-slate-800">
        {/* Rules & Mechanics */}
        <section>
          <h2 className="text-xl font-black text-slate-900">
            Rules & Mechanics
          </h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-600">
            {editorial?.rules.map((rule, idx) => (
              <li key={idx}>{rule}</li>
            ))}
          </ul>
        </section>

        {/* How to Play */}
        <section>
          <h2 className="text-xl font-black text-slate-900">
            How to Play {game.title}
          </h2>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-slate-600">
            {editorial?.howToPlay.map((step, idx) => (
              <li key={idx}>{step}</li>
            ))}
          </ol>
        </section>

        {/* Strategies & Tips */}
        <section>
          <h2 className="text-xl font-black text-slate-900">
            Deduction Strategies & Tips
          </h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-600">
            {editorial?.strategies.map((tip, idx) => (
              <li key={idx}>{tip}</li>
            ))}
          </ul>
        </section>

        {/* FAQ Accordion */}
        <section>
          <h2 className="text-xl font-black text-slate-900">
            Frequently Asked Questions
          </h2>
          <div className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            {editorial?.faqs.map((faq, idx) => (
              <div key={idx} className={idx > 0 ? "pt-4 mt-4" : ""}>
                <h3 className="font-bold text-sm text-slate-900">
                  {faq.question}
                </h3>
                <p className="mt-1 text-sm text-slate-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>
      </article>
    </div>
  );
}

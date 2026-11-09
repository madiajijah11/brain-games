export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { gameCatalog } from "@/lib/games";
import { GameRunner } from "@/components/game-runner";
export default async function GamePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ daily?: string }> }) { const session = await auth(); if (!session?.user) redirect("/login"); const { slug } = await params; const query = await searchParams; const game = gameCatalog.find(g => g.slug === slug); if (!game) notFound(); return <div className="mx-auto max-w-2xl"><Link href="/dashboard" className="text-sm font-semibold text-slate-500 hover:text-brand">← Dashboard</Link><div className="mb-6 mt-5"><p className="text-xs font-black tracking-widest text-brand">{game.category} TRAINING</p><h1 className="mt-2 text-3xl font-black">{game.title}</h1><p className="mt-2 text-slate-500">{game.description} {query.daily === "1" ? "Daily challenge · earn an extra 50 XP for your first completion today." : "Answer all five questions to earn XP."}</p></div><GameRunner slug={game.slug} title={game.title} isDaily={query.daily === "1"}/></div>; }

import { MetadataRoute } from "next";
import { GAME_CATALOG } from "@/lib/puzzles/types";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://brain-games.vercel.app";
  const now = new Date();

  const gameUrls = GAME_CATALOG.map((game) => ({
    url: `${baseUrl}/games/${game.slug}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.9,
  }));

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/leaderboard`,
      lastModified: now,
      changeFrequency: "hourly" as const,
      priority: 0.8,
    },
    ...gameUrls,
  ];
}

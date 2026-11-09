import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
export const metadata: Metadata = { title: "Brain Games — Train your thinking", description: "Daily brain games, challenges, progress, and global competition." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><SiteHeader /><main className="mx-auto min-h-[calc(100vh-72px)] w-full max-w-6xl px-4 py-8 sm:px-6">{children}</main></body></html>; }

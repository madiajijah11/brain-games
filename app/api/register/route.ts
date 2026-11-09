export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
const schema = z.object({ name: z.string().min(2).max(60), email: z.string().email(), password: z.string().min(8) });
export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Please provide a valid name, email, and password (at least 8 characters)." }, { status: 400 });
    const { name, email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();
    if (await prisma.user.findUnique({ where: { email: normalizedEmail } })) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    await prisma.user.create({ data: { name, email: normalizedEmail, passwordHash: await hash(password, 12) } });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Unable to create account." }, { status: 500 }); }
}

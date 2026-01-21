import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { adminDb } from "@/lib/firebase-admin";

const NONCE_COLLECTION = "wallet_nonces";
const NONCE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function POST(request: Request) {
  try {
    // Robustly handle empty or invalid JSON bodies
    let body;
    try {
      const text = await request.text();
      if (!text) {
         return NextResponse.json({ error: "Empty request body" }, { status: 400 });
      }
      body = JSON.parse(text);
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    const { address } = body;

    if (!address || typeof address !== "string") {
      const response = NextResponse.json(
        { error: "Wallet address is required." },
        { status: 400 }
      );
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.headers.set('X-Content-Type-Options', 'nosniff');
      return response;
    }

    const normalizedAddress = address.toLowerCase();
    const nonce = randomBytes(32).toString("hex");
    const now = Date.now();

    await adminDb.collection(NONCE_COLLECTION).doc(normalizedAddress).set({
      nonce,
      createdAt: now,
      expiresAt: now + NONCE_TTL_MS,
    });

    const response = NextResponse.json({ nonce });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    return response;
  } catch (error) {
    console.error("Error generating nonce:", error);
    const response = NextResponse.json(
      { error: "Failed to generate nonce." },
      { status: 500 }
    );
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    return response;
  }
}


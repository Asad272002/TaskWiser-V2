import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, tags, actual_cost } = body;

    if (actual_cost === undefined || actual_cost === null) {
      return NextResponse.json({ error: "actual_cost is required" }, { status: 400 });
    }

    // Call the Python ML backend
    const mlResponse = await fetch("http://127.0.0.1:8000/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title || "",
        description: description || "",
        tags: Array.isArray(tags) ? tags : [],
        actual_cost: Number(actual_cost),
      }),
    });

    if (!mlResponse.ok) {
      const errorText = await mlResponse.text();
      throw new Error(`ML API error: ${mlResponse.statusText} - ${errorText}`);
    }

    const data = await mlResponse.json();
    return NextResponse.json(data, { status: 200 });

  } catch (error) {
    console.error("Error updating model:", error);
    return NextResponse.json({ error: "Failed to update model" }, { status: 500 });
  }
}

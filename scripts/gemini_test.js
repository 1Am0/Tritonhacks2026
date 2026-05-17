#!/usr/bin/env node
"use strict";

const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || "text-bison-001";
const prompt = process.argv.slice(2).join(" ") || "Hello from Tritonhacks - test Gemini.";

if (!apiKey) {
  console.error("Missing GOOGLE_API_KEY or GEMINI_API_KEY environment variable.");
  process.exit(1);
}

const url = `https://generativeai.googleapis.com/v1beta2/models/${model}:generate?key=${encodeURIComponent(apiKey)}`;

(async () => {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: { text: prompt },
        maxOutputTokens: 256
      })
    });
    const text = await res.text();
    if (!res.ok) {
      console.error("API error:", res.status, text);
      if (res.status === 404) {
        console.error("\nTip: a 404 usually means the Generative API isn't enabled for your project.\n- Go to Google Cloud Console -> APIs & Services -> Library and enable the Generative Language / Generative AI API for your project.\n- Ensure the API key has no restrictive application restrictions or that the correct APIs are allowed.\n- Make sure billing is enabled for the project.");
      }
      process.exit(2);
    }

    const json = JSON.parse(text || "{}");
    console.log("Raw response:", JSON.stringify(json, null, 2));

    // Try to extract human-readable output from a few possible response shapes
    let generated = null;
    if (json.candidates && json.candidates.length) {
      generated = json.candidates.map(c => c.content).join("\n\n");
    } else if (json.output && json.output.length) {
      generated = json.output.map(o => o.content).join("\n\n");
    } else if (json.text) {
      generated = json.text;
    }

    if (generated) {
      console.log("\nGenerated output:\n", generated);
    } else {
      console.log("\nNo generated text found in the response.");
    }
  } catch (err) {
    console.error("Request failed:", err);
    process.exit(3);
  }
})();

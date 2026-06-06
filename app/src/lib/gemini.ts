// Gemini SDK integration — placeholder for future use.
// Current MVP uses Grok (xAI) via src/lib/grok.ts and src/app/api/analyse/route.ts.
// To enable Gemini: install @google/generative-ai, then swap getGemini() into the analyse route.

export const GEMINI_MODEL = "gemini-2.0-flash";

export function getGemini(): never {
  throw new Error(
    "Gemini is not enabled in this build. " +
    "Install @google/generative-ai and update analyse/route.ts to use getGemini().",
  );
}

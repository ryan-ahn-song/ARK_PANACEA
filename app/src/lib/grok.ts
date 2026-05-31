import OpenAI from "openai";

export const GROK_MODEL = "grok-3-mini";

// Lazy singleton — instantiated only at request time, not at build time
let _grok: OpenAI | null = null;

export function getGrok(): OpenAI {
  if (!_grok) {
    const apiKey = process.env.GROK_API_KEY;
    if (!apiKey) {
      throw new Error("GROK_API_KEY environment variable is not set");
    }
    _grok = new OpenAI({
      apiKey,
      baseURL: "https://api.x.ai/v1",
    });
  }
  return _grok;
}

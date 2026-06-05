import { GoogleGenerativeAI } from "@google/generative-ai";

export const GEMINI_MODEL = "gemini-2.0-flash";

let _gemini: GoogleGenerativeAI | null = null;

export function getGemini(): GoogleGenerativeAI {
  if (!_gemini) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }
    _gemini = new GoogleGenerativeAI(apiKey);
  }
  return _gemini;
}

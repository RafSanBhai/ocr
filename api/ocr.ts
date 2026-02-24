import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";

export default async function handler(req: VercelRequest, res: VercelResponse) {

  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
  }

  try {
    const { base64Data, mimeType } = req.body || {};

    if (!base64Data || !mimeType) {
      return res.status(400).json({ error: "base64Data and mimeType are required" });
    }

    const genAI = new GoogleGenAI({ apiKey });

    const response = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              text: "Extract all text from this document exactly as it appears. Maintain structure and formatting. If multi-page, extract all pages clearly."
            },
            {
              inlineData: {
                data: base64Data,
                mimeType
              }
            }
          ]
        }
      ]
    });

    return res.status(200).json({
      text: response.text || ""
    });

  } catch (error: any) {
    console.error("OCR API Error:", error);
    return res.status(500).json({
      error: error?.message || "OCR processing failed"
    });
  }
}

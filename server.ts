import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Gemini client server-side only
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

app.use(express.json({ limit: "50mb" }));

// API Route for syllabus parsing
app.post("/api/parse-syllabus", async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({
        error: "Gemini API key is not configured. Please add GEMINI_API_KEY in Settings > Secrets.",
      });
    }

    const { text } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Syllabus text is required." });
    }

    const prompt = `You are a syllabus parser. Given raw text extracted from a course syllabus PDF, extract a structured hierarchy of Units, Topics, and Sub-topics.

Rules:
- Preserve the unit titles/numbers exactly as written (e.g. "Unit-I", "Unit-II").
- Break long comma/dash-separated syllabus paragraphs into individual topic items.
  Each distinct concept (e.g. "Aliasing and reconstruction", "Fast Fourier Transform (FFT)") should be its own topic entry.
- Where a topic clearly has natural sub-parts (e.g. "Decimation in Time FFT" and "Decimation in Frequency FFT" under "FFT"), nest them as sub-topics.
- Do not summarize or omit content — every concept mentioned must appear as a topic.
- Ignore textbook/reference list sections; only extract syllabus content (units/topics).
- Ensure units have sequential ordering.

Raw syllabus text:
${text}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            units: {
              type: Type.ARRAY,
              description: "Array of units in the syllabus",
              items: {
                type: Type.OBJECT,
                properties: {
                  title: {
                    type: Type.STRING,
                    description: "Unit title, e.g. Unit-I, Unit-II",
                  },
                  topics: {
                    type: Type.ARRAY,
                    description: "Core topics covered in this unit",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        title: {
                          type: Type.STRING,
                          description: "Topic name, e.g. Sampling, DFT",
                        },
                        subtopics: {
                          type: Type.ARRAY,
                          description: "Detailed subtopics or concepts",
                          items: {
                            type: Type.STRING,
                          },
                        },
                      },
                      required: ["title", "subtopics"],
                    },
                  },
                },
                required: ["title", "topics"],
              },
            },
          },
          required: ["units"],
        },
      },
    });

    const parsedText = response.text;
    if (!parsedText) {
      throw new Error("No response text received from Gemini.");
    }

    // Return the structured JSON
    const parsedJson = JSON.parse(parsedText);
    res.json(parsedJson);
  } catch (error: any) {
    console.error("Syllabus parsing error:", error);
    res.status(500).json({
      error: "Failed to parse syllabus with AI",
      details: error.message || error,
    });
  }
});

// Vite middleware or Static files serving
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

setupServer();

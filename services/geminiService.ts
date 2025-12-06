import { GoogleGenAI, Type, Schema } from "@google/genai";
import { PebbleData, CognitiveLevel } from "../types";

// Initialize the API client
// Note: process.env.API_KEY is injected by the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    eli5_title: { type: Type.STRING },
    eli5_summary: { type: Type.STRING },
    eli5_sections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          heading: { type: Type.STRING },
          body: { type: Type.STRING },
        },
      },
    },
    eli5_keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
    
    academic_title: { type: Type.STRING },
    academic_summary: { type: Type.STRING },
    academic_sections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          heading: { type: Type.STRING },
          body: { type: Type.STRING },
        },
      },
    },
    academic_keywords: { type: Type.ARRAY, items: { type: Type.STRING } },

    mermaid_code: { type: Type.STRING, description: "A valid Mermaid.js graph definition (e.g. graph TD...)" },
    socratic_questions: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: [
    "eli5_title", "eli5_summary", "eli5_sections", "eli5_keywords",
    "academic_title", "academic_summary", "academic_sections", "academic_keywords",
    "mermaid_code", "socratic_questions"
  ],
};

export const generatePebble = async (topic: string): Promise<PebbleData> => {
  const model = "gemini-2.5-flash"; // Using flash for speed and JSON capability
  
  const prompt = `
    You are 'Pebbles', a Generative Cognitive Builder. 
    Analyze the topic: "${topic}".
    
    Generate a structured knowledge artifact with two distinct cognitive levels:
    1. ELI5 (Explain Like I'm 5): Use analogies, simple language, and metaphors.
    2. Academic: Use formal tone, technical terminology, and deep structural analysis.
    
    Also generate:
    - A Mermaid.js diagram code (graph TD or mindmap) that visualizes the concept's structure or process.
    - CRITICAL: Return ONLY valid Mermaid syntax. 
    - Ensure the first line is 'graph TD' (or 'mindmap') followed immediately by a newline character.
    - Do NOT put node definitions on the same line as 'graph TD'.
    - Do NOT use markdown code blocks or fencing. 
    - Do NOT use HTML entities (use > for arrows, not &gt;). 
    - ALWAYS quote node labels to handle special characters (e.g., A["Node Label"]).
    - 3 Socratic reflection questions that test deep understanding.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    const json = JSON.parse(text);

    // Map JSON response to internal PebbleData structure
    const pebble: PebbleData = {
      id: crypto.randomUUID(),
      topic: topic,
      timestamp: Date.now(),
      isVerified: false,
      content: {
        [CognitiveLevel.ELI5]: {
          title: json.eli5_title,
          summary: json.eli5_summary,
          sections: json.eli5_sections,
          keywords: json.eli5_keywords,
        },
        [CognitiveLevel.ACADEMIC]: {
          title: json.academic_title,
          summary: json.academic_summary,
          sections: json.academic_sections,
          keywords: json.academic_keywords,
        },
      },
      mermaidChart: json.mermaid_code,
      socraticQuestions: json.socratic_questions,
    };

    return pebble;

  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};
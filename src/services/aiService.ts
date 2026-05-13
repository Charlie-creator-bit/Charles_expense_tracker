import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface ParsedTransaction {
  type: "expense" | "income";
  amount: number;
  categoryOrSource: string;
  description: string;
  date: string;
}

export const aiService = {
  parseSMS: async (smsText: string): Promise<ParsedTransaction | null> => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: smsText,
        config: {
          systemInstruction: `You are a financial transaction extractor. Analyze the provided SMS message and extract transaction details. 
          Respond in JSON format.
          - type: "expense" if money was sent or spent, "income" if money was received.
          - amount: numeric value.
          - categoryOrSource: a short category (e.g., Food, Transport) for expenses, or the sender's name for income.
          - description: a detailed summary of the transaction.
          - date: the date if mentioned, otherwise use the current ISO date.
          
          Example SMS: "You have sent 500 GHS to Kojo Bonsu. Your balance is 1200 GHS."
          Output: {"type": "expense", "amount": 500, "categoryOrSource": "Transfer", "description": "Money sent to Kojo Bonsu", "date": "2026-05-11"}
          
          Example SMS: "Confirmed. You have received 1000 GHS from 0244112233. Ref: Salary."
          Output: {"type": "income", "amount": 1000, "categoryOrSource": "Salary", "description": "Money received from 0244112233", "date": "2026-05-11"}`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING, enum: ["expense", "income"] },
              amount: { type: Type.NUMBER },
              categoryOrSource: { type: Type.STRING },
              description: { type: Type.STRING },
              date: { type: Type.STRING },
            },
            required: ["type", "amount", "categoryOrSource", "description", "date"],
          },
        },
      });

      if (!response.text) return null;
      return JSON.parse(response.text.trim()) as ParsedTransaction;
    } catch (error) {
      console.error("AI Parsing Error:", error);
      return null;
    }
  }
};

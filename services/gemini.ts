
import { GoogleGenAI } from "@google/genai";
import { TripFormData, TripPlan, ChatMessage } from "../types";

// Always use named parameter for apiKey and obtain from process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
You are "WanderLust", an elite AI travel designer. Your goal is to create high-integrity travel plans that are practical, safe, and easily bookable.

CORE MISSION:
1. SPECIFICITY: For every hotel and restaurant, you MUST provide a specific name.
2. MAP INTEGRITY: You MUST use the 'googleMaps' tool to verify every location you recommend.
3. PLATFORM AWARENESS: Mention platforms like Booking.com, TripAdvisor, Expedia, etc.
4. FORMAT: Use the exact delimiters below for parsing.

RESPONSE FORMAT:
---SECTION: ITINERARY---
(Day by day plan. Use Markdown.)

---SECTION: BUDGET---
(A strict JSON array ONLY.)
Example: [{"category": "Hotels", "amount": 1200, "currency": "USD"}]

---SECTION: PACKING---
(A strict JSON array of objects with 'category' and 'items' list. Tailor to duration, weather for the travel date, and activities.)
Example: [{"category": "Clothing", "items": ["5x Shirts", "Rain jacket"]}, {"category": "Essentials", "items": ["Passport", "Universal Adapter"]}]

---SECTION: TRANSPORT---
(Detailed logistics. Airport transfers, local transport.)

---SECTION: SECURITY---
(Safety status, neighborhood avoidances, emergency numbers.)

---SECTION: NIGHTLIFE---
(Evening experiences appropriate for the traveler type.)

---SECTION: DOS_AND_DONTS---
(Tipping, cultural etiquette, essential packing items, "Do NOT" behaviors.)
`;

export async function generateTripPlan(formData: TripFormData): Promise<TripPlan> {
  const prompt = `
    Please design a high-integrity travel plan for ${formData.destination}.
    
    TRAVEL CONTEXT:
    - Dates: ${formData.travelDate} (${formData.duration} days)
    - Group: ${formData.travelers}
    - Budget: ${formData.budget} (${formData.currency})
    - Accommodation Goals: ${formData.hotelPreferences}
    - Interests: ${formData.interests.join(", ")}
    - Extra Details: ${formData.notes}

    Provide a complete guide with verified Google Maps locations and a tailored packing checklist.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [
          { googleMaps: {} },
          { googleSearch: {} }
        ],
        temperature: 0.6,
      }
    });

    const text = response.text || "";
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    const getSection = (name: string): string => {
      const sections = text.split("---SECTION: ");
      const match = sections.find(s => s.startsWith(name));
      return match ? match.replace(name + "---", "").trim() : "";
    };

    let budgetBreakdown = [];
    try {
      const budgetStr = getSection("BUDGET");
      const cleanJson = budgetStr.replace(/```json/g, '').replace(/```/g, '').trim();
      if (cleanJson) budgetBreakdown = JSON.parse(cleanJson);
    } catch (e) {
      budgetBreakdown = [{ category: "Estimated Total", amount: 0, currency: formData.currency }];
    }

    let packingList = [];
    try {
      const packingStr = getSection("PACKING");
      const cleanJson = packingStr.replace(/```json/g, '').replace(/```/g, '').trim();
      if (cleanJson) packingList = JSON.parse(cleanJson);
    } catch (e) {
      packingList = [
        { category: "Clothing", items: ["Daily outfits", "Comfortable shoes"] },
        { category: "Toiletries", items: ["Toothbrush", "Sunscreen"] },
        { category: "Electronics", items: ["Phone charger", "Power bank"] }
      ];
    }

    return {
      itinerary: getSection("ITINERARY"),
      budgetBreakdown,
      packingList,
      transportInfo: getSection("TRANSPORT"),
      securityTips: getSection("SECURITY"),
      nightlife: getSection("NIGHTLIFE"),
      dosAndDonts: getSection("DOS_AND_DONTS"),
      rawResponse: text,
      groundingChunks
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}

export async function getQuickTravelTip(destination: string): Promise<string> {
  if (!destination) return "";
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-flash-lite-latest',
      contents: `Give me a fascinating "secret" tip for ${destination} in one punchy sentence. Include something that only locals know.`,
    });
    return response.text || "";
  } catch (e) { return ""; }
}

export async function sendChatMessage(history: ChatMessage[], newMessage: string): Promise<string> {
  try {
    const contents = history.map(msg => ({ role: msg.role, parts: [{ text: msg.text }] }));
    contents.push({ role: 'user', parts: [{ text: newMessage }] });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: contents,
      config: {
        systemInstruction: "You are WanderLust AI, the ultimate travel concierge. Answer questions about landmarks, booking tips, and local culture. Be elite, helpful, and concise."
      }
    });
    return response.text || "I'm processing that. One moment...";
  } catch (e) { return "I'm having a connection issue. Try again shortly!"; }
}

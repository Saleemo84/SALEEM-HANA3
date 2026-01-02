
import { GoogleGenAI } from "@google/genai";
import { TripFormData, TripPlan, ChatMessage, WeatherDay, RecommendedHotel } from "../types";

// Always use named parameter for apiKey and obtain from process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
You are "WanderLust", an elite AI travel designer. Your goal is to create high-integrity travel plans that are practical, safe, and easily bookable.

CORE MISSION:
1. SPECIFICITY: For every hotel and restaurant, you MUST provide a specific name.
2. MAP INTEGRITY: You MUST use the 'googleMaps' tool to verify every location you recommend.
3. WEATHER API ROLE: You MUST use 'googleSearch' to act as a real-time weather API. Find the specific forecast for the destination on the travel dates provided.
4. INTEGRATED BOOKING: You MUST provide a list of at least 3 specific hotel recommendations.
5. LOGISTICS INTEGRATION: If flight details (airline, flight number, departure/arrival times) or car rental details (company, pickup/dropoff locations) are provided, you MUST integrate them into the 'Day 1' (arrival/pickup) and the 'Last Day' (departure/dropoff) itinerary sections as fixed time events.

RESPONSE FORMAT:
---SECTION: ITINERARY---
(Day by day plan. Use Markdown.)

---SECTION: BUDGET---
(A strict JSON array ONLY.)
Example: [{"category": "Hotels", "amount": 1200, "currency": "USD"}]

---SECTION: HOTELS---
(A strict JSON array of objects.)
Example: [{"name": "The Ritz-Carlton", "stars": 5, "pricePerNight": 450, "amenities": ["WiFi", "Pool", "Spa"], "description": "Iconic luxury with city views.", "locationVibe": "Upscale Downtown"}]

---SECTION: WEATHER---
(A strict JSON array of objects.)
Example: [{"date": "Oct 12", "condition": "Sunny", "tempHigh": 24, "tempLow": 16, "icon": "☀️"}]

---SECTION: PACKING---
(A strict JSON array of objects.)
Example: [{"category": "Clothing", "items": ["5x Shirts", "Light jacket"]}]

---SECTION: TRANSPORT---
(Detailed logistics.)

---SECTION: SECURITY---
(Safety status.)

---SECTION: NIGHTLIFE---
(Evening experiences.)

---SECTION: DOS_AND_DONTS---
(Cultural etiquette.)
`;

export async function generateTripPlan(formData: TripFormData): Promise<TripPlan> {
  let transportLogistics = '';
  
  if (formData.transportMode === 'Flight') {
    transportLogistics = `Flight Info: ${formData.airline || ''} ${formData.flightNumber || ''} (Departure: ${formData.departureTime || 'N/A'}, Arrival: ${formData.arrivalTime || 'N/A'})`;
  } else if (formData.transportMode === 'Car' && formData.carRentalCompany) {
    transportLogistics = `Car Rental: ${formData.carRentalCompany} (Pickup: ${formData.pickupLocation || 'Not specified'}, Dropoff: ${formData.dropoffLocation || 'Not specified'})`;
  } else {
    transportLogistics = `Transport Mode: ${formData.transportMode}`;
  }

  const prompt = `
    Generate a complete travel plan for ${formData.destination}.
    Dates: ${formData.travelDate} for ${formData.duration} days.
    
    Travel Logistics:
    - ${transportLogistics}
    
    Preferences:
    - Group: ${formData.travelers}
    - Budget Level: ${formData.budget}
    - Hotel Preferences: ${formData.hotelPreferences}
    - Interests: ${formData.interests.join(", ")}
    - Notes: ${formData.notes}

    You MUST find real, verified hotels in ${formData.destination} that fit the "${formData.budget}" budget.
    Integrate the travel logistics provided directly into the itinerary flow.
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
        temperature: 0.3,
      }
    });

    const text = response.text || "";
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    const getSection = (name: string): string => {
      const sections = text.split("---SECTION: ");
      const match = sections.find(s => s.startsWith(name));
      return match ? match.replace(name + "---", "").trim() : "";
    };

    const parseJson = <T>(sectionName: string, fallback: T): T => {
      try {
        const content = getSection(sectionName);
        const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();
        return cleanJson ? JSON.parse(cleanJson) : fallback;
      } catch (e) {
        return fallback;
      }
    };

    return {
      itinerary: getSection("ITINERARY"),
      budgetBreakdown: parseJson("BUDGET", []),
      packingList: parseJson("PACKING", []),
      weatherForecast: parseJson("WEATHER", []),
      recommendedHotels: parseJson("HOTELS", []),
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
      model: 'gemini-3-flash-preview',
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

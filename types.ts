
export interface TripFormData {
  destination: string;
  duration: number;
  travelDate: string;
  travelers: string; // Couple, Solo, Family, etc.
  budget: string; // Budget, Moderate, Luxury
  budgetAmount?: string; // Optional specific amount
  currency: string; // Preferred currency for budget
  hotelPreferences: string; // Stars, amenities
  transportMode: string; // Flight, Train, Car
  flightClass?: string; // Economy, Business, etc.
  airportTransfer: string; // Taxi, Public Transport, Rental, Hotel Shuttle
  carRental: boolean;
  interests: string[]; // Sightseeing, Nightlife, Food, etc.
  notes: string;
  airline?: string;
  flightNumber?: string;
  departureTime?: string;
  arrivalTime?: string;
}

export interface PackingCategory {
  category: string;
  items: string[];
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
  maps?: {
    placeId?: string;
    uri: string;
    title: string;
    placeAnswerSources?: {
        reviewSnippets?: {
            reviewText: string;
            author: string;
            sourceUri: string;
        }[]
    }
  };
}

export interface TripPlan {
  itinerary: string;
  budgetBreakdown: { category: string; amount: number; currency: string }[];
  packingList: PackingCategory[];
  securityTips: string;
  nightlife: string;
  dosAndDonts: string;
  transportInfo: string;
  rawResponse: string; 
  groundingChunks?: GroundingChunk[];
}

export interface SavedTrip {
  id: string;
  timestamp: number;
  destination: string;
  formData: TripFormData;
  plan: TripPlan;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export enum ViewState {
  FORM = 'FORM',
  LOADING = 'LOADING',
  RESULT = 'RESULT',
  ERROR = 'ERROR',
  SAVED_LIST = 'SAVED_LIST'
}

export const INTEREST_OPTIONS = [
  "Sightseeing & History",
  "Nature & Outdoors",
  "Food & Dining",
  "Nightlife & Partying",
  "Relaxation & Spa",
  "Shopping",
  "Art & Culture",
  "Adventure Sports"
];

export const TRAVELER_TYPES = [
  "Solo",
  "Couple",
  "Family (with kids)",
  "Friends",
  "Business"
];

export const BUDGET_TYPES = [
  "Budget-Friendly",
  "Moderate",
  "Luxury"
];

export const FLIGHT_CLASSES = [
  "Not Specified",
  "Economy",
  "Business",
  "First Class"
];

export const TRANSPORT_MODES = [
  "Flight",
  "Train",
  "Car",
  "Bus",
  "Ship / Cruise"
];

export const CURRENCIES = [
  "USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY", "HKD", "NZD", "AED", "SAR", "INR", "SGD"
];


import React, { useState, useEffect, useRef } from 'react';
import { 
  TripFormData, 
  TripPlan, 
  ViewState, 
  INTEREST_OPTIONS, 
  TRAVELER_TYPES, 
  BUDGET_TYPES,
  FLIGHT_CLASSES,
  TRANSPORT_MODES,
  CURRENCIES,
  ChatMessage,
  SavedTrip,
  GroundingChunk,
  RecommendedHotel
} from './types';
import { 
  generateTripPlan, 
  getQuickTravelTip, 
  sendChatMessage,
  exploreNearby
} from './services/gemini';

const INSURANCE_PROVIDERS = [
  { 
    name: 'Allianz Global Assistance', 
    logo: '🛡️',
    plans: [
      { name: 'OneTrip Basic', price: '$25', coverage: 'Essential medical & trip cancellation.' },
      { name: 'OneTrip Prime', price: '$48', coverage: 'Double medical coverage & 24/7 assistance.' }
    ]
  },
  { 
    name: 'World Nomads', 
    logo: '🌏',
    plans: [
      { name: 'Standard Plan', price: '$35', coverage: 'Perfect for regular travelers & tech.' },
      { name: 'Explorer Plan', price: '$65', coverage: 'Covers extreme sports & adventure activities.' }
    ]
  },
  { 
    name: 'AXA Assistance', 
    logo: '⚖️',
    plans: [
      { name: 'Gold Plan', price: '$30', coverage: 'Comprehensive global medical coverage.' },
      { name: 'Platinum Plan', price: '$55', coverage: 'Highest limits for lost luggage & medical.' }
    ]
  }
];

const MAP_CATEGORIES = [
  { label: 'Hotel', icon: '🏨' },
  { label: 'Dining', icon: '🍽️' },
  { label: 'Culture/Spot', icon: '🏛️' },
  { label: 'Attraction', icon: '🎡' }
];

const TRAVEL_PLATFORMS = [
  { name: 'Booking.com', icon: '🏨', color: '#003580', getLink: (q: string) => `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(q)}` },
  { name: 'TripAdvisor', icon: '🦉', color: '#34e0a1', getLink: (q: string) => `https://www.tripadvisor.com/Search?q=${encodeURIComponent(q)}` },
  { name: 'Expedia', icon: '✈️', color: '#00355f', getLink: (q: string) => `https://www.expedia.com/Hotel-Search?destination=${encodeURIComponent(q)}` },
  { name: 'Hotels.com', icon: '🏩', color: '#d32f2f', getLink: (q: string) => `https://www.hotels.com/Hotel-Search?destination=${encodeURIComponent(q)}` },
  { name: 'Trivago', icon: '📊', color: '#007faf', getLink: (q: string) => `https://www.trivago.com/en-US/srl?q=${encodeURIComponent(q)}` },
];

const LOADING_STEPS = [
  { label: 'Initializing AI Concierge', detail: 'Connecting to global travel nodes...', weight: 10 },
  { label: 'Analyzing Weather Patterns', detail: 'Fetching satellite data for your dates...', weight: 25 },
  { label: 'Searching Local Gems', detail: 'Scanning Google Maps for verified spots...', weight: 45 },
  { label: 'Checking Travel Advisories', detail: 'Scanning for official alerts and entry requirements...', weight: 60 },
  { label: 'Optimizing Travel Routes', detail: 'Calculating travel times and logistics...', weight: 75 },
  { label: 'Drafting Elite Itinerary', detail: 'Structuring your personalized daily plan...', weight: 90 },
  { label: 'Finalizing Details', detail: 'Double-checking budget and safety tips...', weight: 95 },
];

const styles = {
  container: { maxWidth: '1200px', margin: '0 auto', padding: '20px', fontFamily: 'Inter, sans-serif', position: 'relative' as const, zIndex: 1 },
  header: { textAlign: 'center' as const, color: '#1e293b', marginBottom: '30px' },
  formGroup: { marginBottom: '20px' },
  label: { display: 'block', marginBottom: '6px', fontWeight: '600', color: '#334155' },
  helperText: { fontSize: '0.82em', color: '#64748b', marginTop: '4px', display: 'block', fontWeight: 'normal' },
  input: { width: '100%', padding: '12px', boxSizing: 'border-box' as const, borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '16px' },
  select: { width: '100%', padding: '12px', boxSizing: 'border-box' as const, borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', fontSize: '16px' },
  textarea: { width: '100%', padding: '12px', boxSizing: 'border-box' as const, minHeight: '100px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '16px' },
  button: { background: '#2563eb', color: 'white', padding: '14px 24px', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '16px', fontWeight: '700', transition: 'all 0.2s' },
  buttonSecondary: { background: '#f1f5f9', color: '#475569', padding: '10px 18px', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' },
  card: { border: '1px solid #e2e8f0', padding: '24px', borderRadius: '16px', marginBottom: '24px', background: '#ffffff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
  
  dayCard: {
    marginBottom: '40px',
    padding: '30px',
    borderRadius: '24px',
    border: '2px dashed #bfdbfe', 
    borderLeft: '12px solid #2563eb', 
    background: '#ffffff', 
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)',
    position: 'relative' as const,
    overflow: 'hidden' as const,
  },
  dayHeader: {
    marginTop: 0,
    color: '#1e40af',
    fontSize: '1.4em',
    fontWeight: '800',
    borderBottom: '2px solid #eff6ff',
    paddingBottom: '12px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    letterSpacing: '-0.025em'
  },
  watermark: {
    position: 'fixed' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%) rotate(-30deg)',
    opacity: 0.05,
    pointerEvents: 'none' as const,
    zIndex: 0,
    textAlign: 'center' as const,
    whiteSpace: 'nowrap' as const,
    fontSize: '60px',
    fontWeight: 'bold',
    color: '#000'
  },
  successMessage: {
    background: '#ecfdf5',
    color: '#059669',
    padding: '12px',
    borderRadius: '12px',
    border: '1px solid #10b981',
    marginBottom: '20px',
    fontWeight: '600',
    textAlign: 'center' as const,
  }
};

const initialFormData: TripFormData = {
  destination: 'Paris, France',
  duration: 5,
  travelDate: new Date().toISOString().split('T')[0],
  travelers: 'Couple',
  budget: 'Moderate',
  budgetAmount: '',
  currency: 'USD',
  hotelPreferences: '4-star, near city center',
  transportMode: 'Flight',
  flightClass: 'Not Specified',
  airportTransfer: 'Taxi',
  carRental: false,
  interests: ['Sightseeing & History', 'Food & Dining'],
  notes: '',
  airline: '',
  flightNumber: '',
  departureTime: '',
  arrivalTime: '',
  carRentalCompany: '',
  pickupLocation: '',
  dropoffLocation: '',
  insuranceProvider: '',
  insurancePlan: '',
  trainNumber: '',
  departureStation: '',
  arrivalStation: '',
  busCompany: '',
  busStop: ''
};

type ActiveTab = 'itinerary' | 'stays' | 'packing' | 'map';

export default function App() {
  const [view, setView] = useState<ViewState>(ViewState.FORM);
  const [activeTab, setActiveTab] = useState<ActiveTab>('itinerary');
  const [formData, setFormData] = useState<TripFormData>(initialFormData);
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null);
  const [error, setError] = useState<string>('');
  const [quickTip, setQuickTip] = useState<string>('');
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [shareStatus, setShareStatus] = useState(false);
  const [mapQuery, setMapQuery] = useState('');
  const [mapZoom, setMapZoom] = useState(12);
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedPlaceChunk, setSelectedPlaceChunk] = useState<GroundingChunk | null>(null);
  const [nearbyDiscoveries, setNearbyDiscoveries] = useState<GroundingChunk[]>([]);
  const [isExploring, setIsExploring] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [skippedItems, setSkippedItems] = useState<Record<string, boolean>>({});
  const [loadingStepIdx, setLoadingStepIdx] = useState(0);
  
  // Offline Map States
  const [isPreparingMap, setIsPreparingMap] = useState(false);
  const [offlineMapUrl, setOfflineMapUrl] = useState<string | null>(null);
  const [mapViewMode, setMapViewMode] = useState<'live' | 'offline'>('live');
  const [offlineMarkerCategories, setOfflineMarkerCategories] = useState<string[]>(['Hotel', 'Dining', 'Culture/Spot', 'Attraction']);

  // Booking Modal State
  const [selectedHotel, setSelectedHotel] = useState<RecommendedHotel | null>(null);
  const [bookingStep, setBookingStep] = useState<'details' | 'confirming' | 'success' | null>(null);
  const [searchHotelQuery, setSearchHotelQuery] = useState('');

  const [chatOpen, setChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');

  const currentRequestId = useRef<number>(0);
  const packingListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const existing = localStorage.getItem('wanderlust_trips');
    if (existing) {
      setSavedTrips(JSON.parse(existing));
    }
  }, []);

  useEffect(() => {
    if (formData.destination.length > 3) {
      const timer = setTimeout(() => {
        getQuickTravelTip(formData.destination).then(setQuickTip);
        setMapQuery(formData.destination);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [formData.destination]);

  // Loading animation simulation
  useEffect(() => {
    if (view === ViewState.LOADING) {
      const interval = setInterval(() => {
        setLoadingStepIdx(prev => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev));
      }, 3500);
      return () => clearInterval(interval);
    } else {
      setLoadingStepIdx(0);
    }
  }, [view]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'duration' ? parseInt(value) : value }));
  };

  const handleInterestChange = (interest: string) => {
    setFormData(prev => {
      const newInterests = prev.interests.includes(interest)
        ? prev.interests.filter(interestItem => interestItem !== interest)
        : [...prev.interests, interest];
      return { ...prev, interests: newInterests };
    });
  };

  const handleCancelRequest = () => {
    currentRequestId.current = 0;
    setView(ViewState.FORM);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.destination.trim()) {
      setError('Destination is required.');
      return;
    }
    
    const reqId = ++currentRequestId.current;
    setView(ViewState.LOADING);
    setError('');
    setOfflineMapUrl(null);
    setNearbyDiscoveries([]);
    setMapViewMode('live');
    
    try {
      const plan = await generateTripPlan(formData);
      if (reqId !== currentRequestId.current) return;
      setTripPlan(plan);
      setMapQuery(formData.destination);
      setView(ViewState.RESULT);
      window.scrollTo(0, 0);
    } catch (err: any) {
      if (reqId !== currentRequestId.current) return;
      setError(err.message || 'Something went wrong generating the plan.');
      setView(ViewState.ERROR);
    }
  };

  const handleSaveTrip = (mapDataUrl?: string) => {
    if (!tripPlan) return;
    
    const existingList = JSON.parse(localStorage.getItem('wanderlust_trips') || '[]');
    const existingIndex = existingList.findIndex((t: SavedTrip) => 
      t.destination === formData.destination && t.formData.travelDate === formData.travelDate
    );

    const newTrip: SavedTrip = {
      id: existingIndex !== -1 ? existingList[existingIndex].id : Date.now().toString(),
      timestamp: Date.now(),
      destination: formData.destination,
      formData: { ...formData },
      plan: { ...tripPlan },
      offlineMapDataUrl: mapDataUrl || (existingIndex !== -1 ? existingList[existingIndex].offlineMapDataUrl : undefined)
    };
    
    try {
      let trips: SavedTrip[] = [...existingList];
      if (existingIndex !== -1) {
        trips[existingIndex] = newTrip;
      } else {
        trips.push(newTrip);
      }
      localStorage.setItem('wanderlust_trips', JSON.stringify(trips));
      setSavedTrips(trips);
      setShowSaveConfirm(true);
      setTimeout(() => setShowSaveConfirm(false), 3000);
    } catch (e) { 
      console.error(e);
      alert('Local storage is full. Please delete some saved trips.');
    }
  };

  const handleShare = async () => {
    if (!tripPlan) return;
    
    const shareData = {
      title: `WanderLust Trip: ${formData.destination}`,
      text: `Check out my ${formData.duration}-day travel plan to ${formData.destination} starting on ${formData.travelDate}! Generated by WanderLust AI.`,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        const summaryText = `${shareData.title}\n${shareData.text}\n\nApp Link: ${shareData.url}`;
        await navigator.clipboard.writeText(summaryText);
        setShareStatus(true);
        setTimeout(() => setShareStatus(false), 3000);
      }
    } catch (err) {
      console.error('Error sharing trip:', err);
    }
  };

  const handleExploreNearby = async () => {
    if (!tripPlan) return;
    setIsExploring(true);
    
    const existingTitles = [
      ...(tripPlan.groundingChunks?.map(c => c.maps?.title || c.web?.title) || []),
      ...nearbyDiscoveries.map(c => c.maps?.title || c.web?.title)
    ].filter(Boolean) as string[];

    // Use current mapQuery if it's a search term or destination
    const query = mapQuery.startsWith('place_id:') ? formData.destination : mapQuery;

    try {
      const results = await exploreNearby(query, existingTitles);
      setNearbyDiscoveries(prev => [...prev, ...results]);
    } catch (e) {
      console.error("Exploration failed", e);
    } finally {
      setIsExploring(false);
    }
  };

  const handleDeleteTrip = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedTrips.filter(t => t.id !== id);
    localStorage.setItem('wanderlust_trips', JSON.stringify(updated));
    setSavedTrips(updated);
  };

  const handleLoadSavedTrip = (trip: SavedTrip) => {
    setFormData(trip.formData);
    setTripPlan(trip.plan);
    setMapQuery(trip.destination);
    setOfflineMapUrl(trip.offlineMapDataUrl || null);
    setMapViewMode(trip.offlineMapDataUrl ? 'offline' : 'live');
    setView(ViewState.RESULT);
    window.scrollTo(0, 0);
  };

  const handlePrepareOfflineMap = async () => {
    if (!formData.destination) return;
    setIsPreparingMap(true);
    
    try {
      const filteredGroundings = [
        ...(tripPlan?.groundingChunks || []),
        ...nearbyDiscoveries
      ].filter(chunk => {
        const title = chunk.maps?.title || chunk.web?.title;
        if (!title) return false;
        const cat = getLocationCategory(title);
        return offlineMarkerCategories.includes(cat.label);
      });

      const markers = filteredGroundings.map(chunk => {
        const title = chunk.maps?.title || chunk.web?.title;
        return title ? `|label:${title.charAt(0).toUpperCase()}|${title}` : '';
      }).filter(m => m !== '').join('') || '';

      const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(formData.destination)}&zoom=13&size=800x600&maptype=roadmap&markers=color:blue${markers}&key=${process.env.API_KEY}`;
      
      const response = await fetch(staticMapUrl);
      const blob = await response.blob();
      
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        const base64data = reader.result as string;
        setOfflineMapUrl(base64data);
        setMapViewMode('offline');
        handleSaveTrip(base64data);
        setIsPreparingMap(false);
      };
    } catch (error) {
      console.error('Error fetching static map:', error);
      setIsPreparingMap(false);
      alert('Failed to generate offline map. Please check your connection.');
    }
  };

  const handleDownloadOfflineMap = () => {
    if (!offlineMapUrl) return;
    const link = document.createElement('a');
    link.href = offlineMapUrl;
    link.download = `Map-${formData.destination.replace(/[^a-z0-9]/gi, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg: ChatMessage = { role: 'user', text: chatInput };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    try {
      const response = await sendChatMessage(chatHistory, chatInput);
      setChatHistory(prev => [...prev, { role: 'model', text: response }]);
    } catch (e) {
      setChatHistory(prev => [...prev, { role: 'model', text: "Error sending message." }]);
    }
  };

  const toggleCheck = (item: string) => {
    setCheckedItems(prev => ({ ...prev, [item]: !prev[item] }));
    if (!checkedItems[item]) {
      setSkippedItems(prev => ({ ...prev, [item]: false }));
    }
  };

  const toggleSkip = (item: string) => {
    setSkippedItems(prev => ({ ...prev, [item]: !prev[item] }));
    if (!skippedItems[item]) {
      setCheckedItems(prev => ({ ...prev, [item]: false }));
    }
  };

  const toggleOfflineCategory = (label: string) => {
    setOfflineMarkerCategories(prev => 
      prev.includes(label) ? prev.filter(c => c !== label) : [...prev, label]
    );
  };

  const handleStartBooking = (hotel: RecommendedHotel) => {
    setSelectedHotel(hotel);
    setBookingStep('details');
  };

  const confirmBooking = () => {
    setBookingStep('confirming');
    setTimeout(() => {
      setBookingStep('success');
    }, 2000);
  };

  const closeBooking = () => {
    setSelectedHotel(null);
    setBookingStep(null);
  };

  const handlePrint = () => {
    const printContent = packingListRef.current;
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Packing Checklist - ${formData.destination}</title>
              <style>
                body { font-family: sans-serif; padding: 40px; }
                h1 { color: #1e293b; margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
                .category { margin-bottom: 30px; page-break-inside: avoid; }
                .category h2 { font-size: 1.2rem; color: #2563eb; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px; }
                .item { display: flex; align-items: center; margin-bottom: 8px; font-size: 1rem; color: #334155; }
                .checkbox { width: 18px; height: 18px; border: 1px solid #cbd5e1; margin-right: 12px; }
                .skip-info { display: none; }
              </style>
            </head>
            <body>
              <h1>Packing Checklist for ${formData.destination}</h1>
              <p>Trip duration: ${formData.duration} days | Date: ${formData.travelDate}</p>
              ${printContent.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const getLocationCategory = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('hotel') || t.includes('resort') || t.includes('inn') || t.includes('stay') || t.includes('hostel') || t.includes('lodging') || t.includes('apartment')) 
      return { label: 'Hotel', icon: '🏨', color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-200' };
    if (t.includes('restaurant') || t.includes('cafe') || t.includes('bistro') || t.includes('grill') || t.includes('food') || t.includes('dining') || t.includes('kitchen') || t.includes('bar')) 
      return { label: 'Dining', icon: '🍽️', color: 'text-orange-600', bg: 'bg-orange-100', border: 'border-orange-200' };
    if (t.includes('museum') || t.includes('art') || t.includes('gallery') || t.includes('theatre') || t.includes('temple') || t.includes('church') || t.includes('cathedral') || t.includes('park') || t.includes('square')) 
      return { label: 'Culture/Spot', icon: '🏛️', color: 'text-purple-600', bg: 'bg-purple-100', border: 'border-purple-200' };
    return { label: 'Attraction', icon: '🎡', color: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-emerald-200' };
  };

  const renderMarkdown = (text: string, chunks?: GroundingChunk[]) => {
    const linkText = (content: string) => {
      if (!chunks) return content;
      let linkedContent = content;
      chunks.forEach(chunk => {
        const title = chunk.maps?.title || chunk.web?.title;
        const uri = chunk.maps?.uri || chunk.web?.uri;
        if (title && uri) {
          const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`\\b${escapedTitle}\\b`, 'gi');
          linkedContent = linkedContent.replace(regex, `<a href="${uri}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline; font-weight: 500;">${title}</a>`);
        }
      });
      return linkedContent;
    };
    return <div dangerouslySetInnerHTML={{ __html: linkText(text.replace(/\n/g, '<br/>')) }} />;
  };

  const renderItinerary = (text: string, chunks?: GroundingChunk[]) => {
    const dayRegex = /(?:^|\n)(?=\**Day\s+\d+)/i;
    const parts = text.split(dayRegex);

    if (parts.length < 2) {
      return <div className="prose max-w-none text-slate-700 leading-relaxed">{renderMarkdown(text, chunks)}</div>;
    }

    return (
      <div className="mt-5 space-y-8">
        {parts.map((part, index) => {
          const trimmed = part.trim();
          if (!trimmed) return null;
          const isDayCard = /^\**Day\s+\d+/i.test(trimmed);
          if (!isDayCard) return <div key={index} className="italic text-slate-500 border-l-4 border-slate-200 pl-4 py-2 my-4">{renderMarkdown(trimmed, chunks)}</div>;

          const firstNewLine = trimmed.indexOf('\n');
          let title = trimmed;
          let content = '';
          if (firstNewLine !== -1) {
            title = trimmed.substring(0, firstNewLine).replace(/\*\*/g, '').replace(/[:#-]/g, '').trim();
            content = trimmed.substring(firstNewLine + 1).trim();
          } else {
            title = trimmed.replace(/\*\*/g, '').replace(/[:#-]/g, '').trim();
          }

          return (
            <div key={index} style={styles.dayCard} className="group transition-all">
              <h3 style={styles.dayHeader}>
                <span className="bg-blue-600 text-white w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-lg">📅</span> 
                {title}
              </h3>
              <div style={{lineHeight: '1.8', color: '#334155', fontSize: '1.05em'}}>
                {renderMarkdown(content, chunks)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const BrandingElements = () => (
    <>
      <div style={styles.watermark}>DR. SALEEM ANDRAWS</div>
    </>
  );

  const renderSavedListView = () => (
    <div style={styles.container}>
      <BrandingElements />
      <div className="flex justify-between items-center mb-8">
        <button onClick={() => setView(ViewState.FORM)} style={styles.buttonSecondary}>&larr; Planner</button>
        <h1 className="text-xl font-black text-slate-900">Saved Journeys</h1>
      </div>
      {savedTrips.length === 0 ? (
        <div style={styles.card} className="text-center py-20">
          <div className="text-6xl mb-4">🎒</div>
          <h2 className="text-lg font-bold text-slate-800">No saved trips.</h2>
          <p className="text-slate-500 mt-2 text-sm">Your journeys will appear here once saved.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {savedTrips.sort((a,b) => b.timestamp - a.timestamp).map(trip => (
            <div key={trip.id} onClick={() => handleLoadSavedTrip(trip)} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col p-5">
              <div className="flex justify-between items-start mb-2">
                <div className="bg-blue-100 text-blue-600 w-10 h-10 rounded-xl flex items-center justify-center text-xl">📍</div>
                <div className="flex gap-2">
                   {trip.offlineMapDataUrl && <div className="bg-emerald-100 text-emerald-600 px-2 py-1 rounded text-[8px] font-black uppercase">🗺️ Map Offline</div>}
                   <button onClick={(e) => handleDeleteTrip(trip.id, e)} className="text-slate-300 hover:text-rose-500 transition-colors p-2 text-xl">✕</button>
                </div>
              </div>
              <h3 className="text-lg font-black text-slate-800 mb-1">{trip.destination}</h3>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{trip.formData.duration} Days • {trip.formData.travelers}</p>
              <div className="mt-4 bg-slate-50 p-2 rounded-lg text-[10px] font-bold text-slate-400 uppercase tracking-widest">Available Offline</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (view === ViewState.SAVED_LIST) return renderSavedListView();

  if (view === ViewState.LOADING) {
    const currentStep = LOADING_STEPS[loadingStepIdx];
    return (
      <div style={styles.container}>
        <BrandingElements />
        <div style={{...styles.card, padding: '48px 24px', textAlign: 'center'}} className="overflow-hidden relative">
          <div className="relative mb-12">
            <div className="text-7xl mb-6 relative z-10 animate-float">✈️</div>
            <div className="absolute inset-0 bg-blue-500/10 blur-3xl rounded-full scale-150 animate-pulse"></div>
          </div>
          
          <h2 className="text-2xl font-black text-slate-900 mb-2 transition-all duration-500">{currentStep.label}</h2>
          <p className="text-slate-500 text-sm h-6 transition-all duration-500 mb-10">{currentStep.detail}</p>
          
          <div className="max-w-md mx-auto mb-10">
            <div className="flex justify-between text-[10px] font-black text-blue-600 mb-2 uppercase tracking-widest">
              <span>Progressing</span>
              <span>{currentStep.weight}%</span>
            </div>
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden shadow-inner">
              <div 
                className="bg-blue-600 h-full transition-all duration-1000 ease-out shadow-lg" 
                style={{ width: `${currentStep.weight}%` }}
              ></div>
            </div>
          </div>

          <div className="max-w-sm mx-auto space-y-3">
             {LOADING_STEPS.map((step, idx) => (
               <div key={idx} className={`flex items-center gap-3 transition-all duration-500 ${idx > loadingStepIdx ? 'opacity-20 translate-y-2' : idx < loadingStepIdx ? 'opacity-40' : 'opacity-100 scale-105'}`}>
                 <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${idx < loadingStepIdx ? 'bg-emerald-500 text-white' : idx === loadingStepIdx ? 'bg-blue-600 text-white animate-pulse' : 'bg-slate-200'}`}>
                   {idx < loadingStepIdx ? '✓' : ''}
                 </div>
                 <span className={`text-[10px] font-black uppercase tracking-wider ${idx === loadingStepIdx ? 'text-blue-600' : 'text-slate-400'}`}>
                   {step.label}
                 </span>
               </div>
             ))}
          </div>

          <button onClick={handleCancelRequest} className="mt-16 px-8 py-3 rounded-xl border border-slate-200 text-slate-400 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all">
            Cancel Generation
          </button>
        </div>
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0) rotate(0); }
            50% { transform: translateY(-15px) rotate(5deg); }
          }
          .animate-float { animation: float 3s ease-in-out infinite; }
        `}</style>
      </div>
    );
  }

  if (view === ViewState.RESULT && tripPlan) {
    const embedMode = mapQuery.startsWith('place_id:') ? 'place' : 'search';
    const mapUrl = `https://www.google.com/maps/embed/v1/${embedMode}?key=${process.env.API_KEY}&q=${encodeURIComponent(mapQuery)}&zoom=${mapZoom}`;

    return (
      <div style={styles.container}>
        <BrandingElements />
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => setView(ViewState.FORM)} style={styles.buttonSecondary}>&larr; Back</button>
          <div className="flex gap-2">
            <button 
              onClick={handleShare} 
              className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md text-sm flex items-center gap-2"
            >
              <span>📤</span> Share
            </button>
            <button onClick={() => handleSaveTrip()} className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-md text-sm">Save Trip</button>
          </div>
        </div>

        {showSaveConfirm && <div style={styles.successMessage} className="animate-fadeIn text-sm text-center">✅ Saved for offline use!</div>}
        {shareStatus && <div style={styles.successMessage} className="animate-fadeIn text-sm text-center">📋 Summary copied to clipboard!</div>}

        <h1 className="text-2xl md:text-3xl font-black text-slate-900 mb-6 text-center leading-tight">{formData.destination}</h1>

        <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 mb-6 overflow-hidden text-[10px] md:text-xs">
          <button onClick={() => setActiveTab('itinerary')} className={`flex-1 py-4 font-bold transition-all ${activeTab === 'itinerary' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>ITINERARY</button>
          <button onClick={() => setActiveTab('stays')} className={`flex-1 py-4 font-bold transition-all ${activeTab === 'stays' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>STAYS</button>
          <button onClick={() => setActiveTab('packing')} className={`flex-1 py-4 font-bold transition-all ${activeTab === 'packing' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>PACKING</button>
          <button onClick={() => setActiveTab('map')} className={`flex-1 py-4 font-bold transition-all ${activeTab === 'map' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>MAPS</button>
        </div>

        {activeTab === 'itinerary' ? (
          <div className="space-y-6 animate-fadeIn pb-20">
            {/* Travel Advisories Section */}
            {tripPlan.advisories && tripPlan.advisories.length > 5 && (
              <div style={styles.card} className="bg-amber-50 border-2 border-amber-200">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">⚠️</span>
                  <h2 className="text-lg font-black text-amber-900 uppercase tracking-tight">Travel Alerts & Advisories</h2>
                </div>
                <div className="text-amber-800 text-sm leading-relaxed prose prose-amber max-w-none">
                  {renderMarkdown(tripPlan.advisories, tripPlan.groundingChunks)}
                </div>
                <p className="mt-4 text-[10px] font-bold text-amber-600 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
                  Verified via Real-time Search
                </p>
              </div>
            )}

            {tripPlan.weatherForecast && tripPlan.weatherForecast.length > 0 && (
              <div style={styles.card} className="bg-gradient-to-br from-blue-50 to-white overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">🌤️ Destination Forecast</h2>
                  <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Real-time Search API</span>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
                  {tripPlan.weatherForecast.map((day, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm text-center min-w-[120px] snap-start flex flex-col items-center group hover:scale-105 transition-transform">
                      <span className="text-[10px] font-black text-slate-400 uppercase mb-2">{day.date}</span>
                      <span className="text-3xl mb-2 filter drop-shadow-md">{day.icon}</span>
                      <span className="text-xs font-bold text-slate-800 mb-1">{day.condition}</span>
                      <div className="flex gap-3 text-xs font-black mt-2">
                        <span className="text-rose-500">{day.tempHigh}°</span>
                        <span className="text-blue-500">{day.tempLow}°</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={styles.card} className="border-t-4 border-t-blue-600">
              <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">🚀 Your Journey</h2>
              {renderItinerary(tripPlan.itinerary, tripPlan.groundingChunks)}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div style={styles.card}>
                <h2 className="text-lg font-bold text-slate-800 mb-4">💰 Budget ({formData.currency})</h2>
                <div className="space-y-3">
                  {tripPlan.budgetBreakdown.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-600 text-xs font-bold">{item.category}</span>
                      <span className="text-blue-600 font-black">{item.amount.toLocaleString()} {item.currency || formData.currency}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={styles.card}>
                <h2 className="text-lg font-bold text-slate-800 mb-4">🛡️ Safety & Local Tips</h2>
                <div className="space-y-4">
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <span className="text-[10px] font-black text-amber-700 uppercase">Security Advice</span>
                    <p className="text-slate-700 text-xs mt-1 leading-relaxed">{tripPlan.securityTips}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'stays' ? (
          <div className="animate-fadeIn pb-20 space-y-6">
            <div className="flex flex-col md:flex-row gap-4 mb-4">
               <div className="flex-1 relative">
                 <input 
                   type="text" 
                   placeholder="Search hotels..." 
                   className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 pl-12 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all"
                   value={searchHotelQuery}
                   onChange={(e) => setSearchHotelQuery(e.target.value)}
                 />
                 <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">🔍</span>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tripPlan.recommendedHotels
                .filter(h => h.name.toLowerCase().includes(searchHotelQuery.toLowerCase()))
                .map((hotel, idx) => (
                <div key={idx} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-xl transition-all border-b-4 border-b-blue-600 active:scale-95">
                  <div className="h-40 bg-slate-900 relative flex items-center justify-center text-5xl">
                    🏨
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-lg">
                      <span className="text-xs font-black text-blue-600">★</span>
                      <span className="text-xs font-black text-slate-800">{hotel.stars}</span>
                    </div>
                    <div className="absolute bottom-4 left-4 bg-blue-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">WanderLust Verified</div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="text-lg font-black text-slate-900 mb-1 leading-tight">{hotel.name}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-3 flex items-center gap-1">📍 {hotel.locationVibe}</p>
                    <p className="text-xs text-slate-600 leading-relaxed mb-4 flex-1">{hotel.description}</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {hotel.amenities.map(a => (
                        <span key={a} className="text-[8px] font-black uppercase tracking-widest bg-slate-50 text-slate-400 px-2 py-1 rounded-md border border-slate-100">{a}</span>
                      ))}
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                      <div>
                        <span className="text-xs text-slate-400 font-bold block">Starts from</span>
                        <span className="text-xl font-black text-slate-900">${hotel.pricePerNight}</span>
                        <span className="text-[10px] text-slate-400 ml-1 font-bold">/night</span>
                      </div>
                      <button 
                        onClick={() => handleStartBooking(hotel)}
                        className="bg-blue-600 text-white px-5 py-3 rounded-2xl font-black text-xs shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors"
                      >
                        BOOK DIRECT
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-slate-50 p-6 rounded-3xl border-2 border-dashed border-slate-200 text-center">
              <p className="text-xs font-black text-slate-400 uppercase mb-4 tracking-widest">Prefer other platforms?</p>
              <div className="flex justify-center gap-3 flex-wrap">
                 {TRAVEL_PLATFORMS.map(p => (
                   <a key={p.name} href={p.getLink(`${formData.destination} Hotels`)} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm text-[10px] font-black hover:border-blue-400 transition-colors">
                     <span>{p.icon}</span>
                     <span>{p.name}</span>
                   </a>
                 ))}
              </div>
            </div>
          </div>
        ) : activeTab === 'packing' ? (
          <div className="animate-fadeIn space-y-4 pb-20">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
               <h2 className="text-lg font-black text-slate-800">Checklist</h2>
               <button onClick={handlePrint} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-xs">PRINT</button>
            </div>
            <div ref={packingListRef} className="grid grid-cols-1 gap-4">
              {tripPlan.packingList.map((cat, idx) => (
                <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-blue-600 font-black text-[10px] uppercase tracking-widest mb-4">{cat.category}</h3>
                  <ul className="space-y-3">
                    {cat.items.map((item, i) => (
                      <li key={i} className="flex items-center justify-between group py-1.5 border-b border-slate-50 last:border-0">
                        <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => !skippedItems[item] && toggleCheck(item)}>
                          <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all ${checkedItems[item] ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200'} ${skippedItems[item] ? 'opacity-20 cursor-not-allowed' : ''}`}>
                            {checkedItems[item] && <span className="text-[10px]">✓</span>}
                          </div>
                          <span className={`text-slate-700 text-sm transition-all ${checkedItems[item] ? 'line-through opacity-40 text-slate-400' : ''} ${skippedItems[item] ? 'opacity-30 italic text-slate-300' : ''}`}>
                            {item}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-50 transition-colors skip-info">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 rounded-md border-slate-300 text-rose-500 focus:ring-rose-400 transition-all cursor-pointer"
                              checked={!!skippedItems[item]} 
                              onChange={(e) => { e.stopPropagation(); toggleSkip(item); }} 
                            />
                            <span className={`text-[9px] font-black uppercase tracking-wider transition-colors ${skippedItems[item] ? 'text-rose-500' : 'text-slate-400'}`}>Skip</span>
                          </label>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 animate-fadeIn h-[calc(100vh-250px)] pb-10">
            <div className="bg-white p-4 rounded-xl shadow-md border border-slate-200 flex flex-col items-stretch gap-4">
               <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                 <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
                   <button onClick={() => setMapViewMode('live')} className={`flex-1 sm:px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${mapViewMode === 'live' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Live Interactive</button>
                   <button onClick={() => setMapViewMode('offline')} className={`flex-1 sm:px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${mapViewMode === 'offline' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`} disabled={!offlineMapUrl && !isPreparingMap}>Offline Snapshot</button>
                 </div>
                 
                 {!offlineMapUrl && !isPreparingMap ? (
                   <button onClick={handlePrepareOfflineMap} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-all w-full sm:w-auto">Prepare Offline Map</button>
                 ) : isPreparingMap ? (
                   <div className="text-[10px] font-black text-blue-600 animate-pulse uppercase tracking-widest">Generating Snapshot...</div>
                 ) : (
                   <button onClick={handleDownloadOfflineMap} className="bg-slate-900 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all w-full sm:w-auto">⬇️ Save Image to Device</button>
                 )}
               </div>

               {/* Category Selection for Offline Map */}
               {!offlineMapUrl && !isPreparingMap && (
                 <div className="mt-2 pt-4 border-t border-slate-100 animate-fadeIn">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Include in Offline Map:</p>
                   <div className="flex flex-wrap gap-2">
                     {MAP_CATEGORIES.map(cat => (
                       <button 
                         key={cat.label} 
                         onClick={() => toggleOfflineCategory(cat.label)}
                         className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 text-[10px] font-black transition-all ${offlineMarkerCategories.includes(cat.label) ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 bg-slate-50 text-slate-400'}`}
                       >
                         <span>{cat.icon}</span>
                         <span>{cat.label}</span>
                         {offlineMarkerCategories.includes(cat.label) && <span className="ml-1">✓</span>}
                       </button>
                     ))}
                   </div>
                   <p className="text-[9px] text-slate-400 mt-3 italic">Custom markers help you focus on what's important when you're off the grid.</p>
                 </div>
               )}
            </div>

            {mapViewMode === 'live' ? (
              <div className="flex flex-col gap-4 flex-1">
                <div className="bg-white p-4 rounded-xl shadow-xl border border-slate-200 overflow-y-auto flex-1 custom-scrollbar min-h-[150px]">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-black text-slate-800">📍 Places</h2>
                    <button 
                      onClick={handleExploreNearby} 
                      disabled={isExploring}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isExploring ? 'bg-slate-100 text-slate-400' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}
                    >
                      {isExploring ? 'Searching...' : 'Explore Nearby'}
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Itinerary Places */}
                    {tripPlan.groundingChunks?.map((chunk, i) => {
                      const title = chunk.maps?.title || chunk.web?.title;
                      if (!title) return null;
                      const category = getLocationCategory(title);
                      return (
                        <div 
                          key={`itin-${i}`} 
                          onClick={() => { 
                            setMapQuery(chunk.maps?.placeId ? `place_id:${chunk.maps.placeId}` : title); 
                            setMapZoom(17); 
                            setSelectedLocation(title); 
                            setSelectedPlaceChunk(chunk);
                          }} 
                          className={`p-4 rounded-xl border-2 transition-all cursor-pointer group ${selectedLocation === title ? 'bg-blue-50 border-blue-400' : 'bg-slate-50 border-transparent hover:bg-white hover:border-slate-200'}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`${category.bg} ${category.color} w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm group-hover:scale-110 transition-transform`}>{category.icon}</div>
                            <div className="flex-1">
                              <h4 className="font-bold text-slate-800 text-sm leading-tight">{title}</h4>
                              <span className={`text-[8px] font-black uppercase ${category.color}`}>{category.label}</span>
                            </div>
                            <div className="text-slate-300 group-hover:text-blue-500 transition-colors">➜</div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Nearby Discoveries Section */}
                    {nearbyDiscoveries.length > 0 && (
                      <div className="pt-4 mt-4 border-t border-slate-100">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Nearby Discoveries</h3>
                        <div className="space-y-4">
                          {nearbyDiscoveries.map((chunk, i) => {
                            const title = chunk.maps?.title || chunk.web?.title;
                            if (!title) return null;
                            const category = getLocationCategory(title);
                            return (
                              <div 
                                key={`nearby-${i}`} 
                                onClick={() => { 
                                  setMapQuery(chunk.maps?.placeId ? `place_id:${chunk.maps.placeId}` : title); 
                                  setMapZoom(17); 
                                  setSelectedLocation(title); 
                                  setSelectedPlaceChunk(chunk);
                                }} 
                                className={`p-4 rounded-xl border-2 border-dashed transition-all cursor-pointer group ${selectedLocation === title ? 'bg-amber-50 border-amber-400' : 'bg-amber-50/30 border-amber-100 hover:bg-amber-50/50 hover:border-amber-200'}`}
                              >
                                <div className="flex items-start gap-3">
                                  <div className={`bg-amber-100 text-amber-600 w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm group-hover:scale-110 transition-transform`}>{category.icon}</div>
                                  <div className="flex-1">
                                    <h4 className="font-bold text-slate-800 text-sm leading-tight">{title}</h4>
                                    <span className={`text-[8px] font-black uppercase text-amber-600`}>AI Suggestion</span>
                                  </div>
                                  <div className="text-slate-300 group-hover:text-amber-500 transition-colors">➜</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-[2] relative rounded-xl overflow-hidden shadow-2xl border border-slate-300 min-h-[300px]">
                  <iframe width="100%" height="100%" title="Map" style={{ border: 0 }} loading="lazy" src={mapUrl}></iframe>
                  
                  {/* Location Info Overlay - Responsive Detail View */}
                  {selectedPlaceChunk && (
                    <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 p-5 animate-slideUp z-10 max-h-[40%] overflow-y-auto custom-scrollbar">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                           <div className={`${getLocationCategory(selectedPlaceChunk.maps?.title || selectedPlaceChunk.web?.title || '').bg} p-2 rounded-lg text-xl shadow-inner`}>
                             {getLocationCategory(selectedPlaceChunk.maps?.title || selectedPlaceChunk.web?.title || '').icon}
                           </div>
                           <div>
                              <h3 className="font-black text-slate-900 text-sm leading-tight">{selectedPlaceChunk.maps?.title || selectedPlaceChunk.web?.title}</h3>
                              <span className={`text-[8px] font-black uppercase ${getLocationCategory(selectedPlaceChunk.maps?.title || selectedPlaceChunk.web?.title || '').color}`}>
                                {getLocationCategory(selectedPlaceChunk.maps?.title || selectedPlaceChunk.web?.title || '').label}
                              </span>
                           </div>
                        </div>
                        <button 
                          onClick={() => setSelectedPlaceChunk(null)} 
                          className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors text-slate-500"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Fetched Details (Reviews, etc) */}
                      {selectedPlaceChunk.maps?.placeAnswerSources?.reviewSnippets && selectedPlaceChunk.maps.placeAnswerSources.reviewSnippets.length > 0 ? (
                        <div className="space-y-3">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">What locals say:</p>
                          <div className="space-y-2">
                             {selectedPlaceChunk.maps.placeAnswerSources.reviewSnippets.slice(0, 2).map((snippet, idx) => (
                               <div key={idx} className="bg-slate-50/50 p-2.5 rounded-xl italic text-[11px] text-slate-600 leading-relaxed border border-slate-100">
                                 "{snippet.reviewText}"
                                 <div className="not-italic text-[8px] font-black text-slate-400 mt-1 uppercase">— {snippet.author}</div>
                               </div>
                             ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-500 italic">No detailed review snippets available for this specific spot, but it's a top recommendation in your AI itinerary!</p>
                      )}

                      <div className="mt-4 flex gap-2">
                        <a 
                          href={selectedPlaceChunk.maps?.uri || selectedPlaceChunk.web?.uri} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="flex-1 bg-blue-600 text-white text-center py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-all"
                        >
                          Open in Google Maps
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 bg-white p-4 rounded-xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col items-center justify-center relative min-h-[400px]">
                {offlineMapUrl ? (
                  <img src={offlineMapUrl} alt="Offline Map" className="max-w-full max-h-full object-contain rounded-lg shadow-lg" />
                ) : (
                  <div className="text-center p-12">
                     <div className="text-5xl mb-4">📍</div>
                     <h3 className="font-black text-slate-900 mb-2">No Offline Map Prepared</h3>
                     <p className="text-xs text-slate-500 max-w-xs">Download a snapshot to view the map and key locations without internet connection.</p>
                     <button onClick={handlePrepareOfflineMap} className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg">Download Now</button>
                  </div>
                )}
                {offlineMapUrl && (
                  <div className="absolute top-8 left-8 flex flex-col gap-2 items-start">
                    <div className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest shadow-xl">OFFLINE SNAPSHOT</div>
                    <button onClick={() => setOfflineMapUrl(null)} className="bg-white/90 backdrop-blur-md text-rose-600 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest shadow-lg hover:bg-white transition-all">Reset & Re-prepare</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {selectedHotel && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-md p-0 sm:p-4 animate-fadeIn">
            <div className="bg-white w-full max-w-xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-slideUp">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                 <div>
                   <h3 className="text-xl font-black text-slate-900">Secure Booking</h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Direct via WanderLust API</p>
                 </div>
                 <button onClick={closeBooking} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xl">✕</button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[70vh]">
                {bookingStep === 'details' ? (
                  <div className="space-y-6">
                    <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                      <div className="text-3xl">🏨</div>
                      <div>
                        <h4 className="font-black text-slate-900">{selectedHotel.name}</h4>
                        <p className="text-xs text-blue-600 font-bold">{formData.destination}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-slate-50 p-4 rounded-2xl">
                         <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Check-in</span>
                         <span className="text-sm font-bold text-slate-900">{formData.travelDate}</span>
                       </div>
                       <div className="bg-slate-50 p-4 rounded-2xl">
                         <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Duration</span>
                         <span className="text-sm font-bold text-slate-900">{formData.duration} Nights</span>
                       </div>
                    </div>
                    <div className="space-y-3">
                      <span className="text-xs font-black text-slate-800 uppercase tracking-widest block">Select Room Type</span>
                      <div className="flex flex-col gap-2">
                         <div className="flex justify-between items-center p-4 rounded-2xl border-2 border-blue-600 bg-blue-50/50">
                            <div>
                               <span className="font-bold text-slate-900 block">Deluxe King Room</span>
                               <span className="text-[10px] text-emerald-600 font-black">Free Cancellation</span>
                            </div>
                            <span className="font-black text-slate-900">${selectedHotel.pricePerNight}</span>
                         </div>
                         <div className="flex justify-between items-center p-4 rounded-2xl border border-slate-200 bg-white opacity-60">
                            <div>
                               <span className="font-bold text-slate-900 block">Standard Suite</span>
                               <span className="text-[10px] text-slate-400 font-bold">Sold Out</span>
                            </div>
                            <span className="font-black text-slate-900">${Math.floor(selectedHotel.pricePerNight * 0.8)}</span>
                         </div>
                      </div>
                    </div>
                    <div className="pt-4">
                       <div className="flex justify-between text-slate-600 text-sm mb-2">
                          <span>${selectedHotel.pricePerNight} x {formData.duration} nights</span>
                          <span className="font-bold">${selectedHotel.pricePerNight * formData.duration}</span>
                       </div>
                       <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                          <span className="text-lg font-black text-slate-900">Total Price</span>
                          <span className="text-2xl font-black text-blue-600">${selectedHotel.pricePerNight * formData.duration}</span>
                       </div>
                    </div>
                    <button onClick={confirmBooking} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-slate-200 active:scale-95 transition-all mt-4">SECURE CHECKOUT</button>
                  </div>
                ) : bookingStep === 'confirming' ? (
                  <div className="py-20 text-center">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-8"></div>
                    <h3 className="text-xl font-black text-slate-900">Finalizing Reservation...</h3>
                  </div>
                ) : (
                  <div className="py-12 text-center animate-fadeIn">
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 flex items-center justify-center text-4xl rounded-full mx-auto mb-6 shadow-xl shadow-emerald-50 border-4 border-white animate-bounce">✓</div>
                    <h3 className="text-2xl font-black text-slate-900">Reservation Confirmed!</h3>
                    <p className="text-slate-500 text-sm mt-2 mb-8 px-8">Your room at {selectedHotel.name} is ready. A confirmation email has been sent.</p>
                    <button onClick={closeBooking} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl active:scale-95 transition-all">BACK TO ITINERARY</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <BrandingElements />
      <div className="flex justify-between items-start mb-10">
        <div className="flex-1">
          <h1 className="text-3xl font-black text-slate-900 leading-none">WANDERLUST</h1>
          <p className="text-slate-400 font-bold uppercase text-[8px] tracking-[0.2em] mt-1">AI Travel Concierge</p>
        </div>
        <button onClick={() => setView(ViewState.SAVED_LIST)} className="bg-white border-2 border-slate-200 p-2.5 rounded-xl shadow-sm hover:bg-slate-50 transition-all">
          📂 <span className="text-[10px] font-black ml-1 uppercase">{savedTrips.length}</span>
        </button>
      </div>

      {quickTip && (
        <div className="bg-blue-600 text-white p-4 rounded-2xl shadow-xl mb-10 flex items-center gap-4 animate-slideUp">
          <div className="text-2xl">💡</div>
          <p className="font-bold text-sm leading-snug">{quickTip}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} style={styles.card} className="max-w-2xl mx-auto shadow-xl p-6 border-0 bg-white/80 backdrop-blur-md">
        <div style={styles.formGroup}>
          <label style={styles.label}>Destination</label>
          <input name="destination" style={styles.input} value={formData.destination} onChange={handleInputChange} required placeholder="e.g., Tokyo, Japan" />
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label style={styles.label}>Days</label>
            <input type="number" name="duration" min={1} max={30} value={formData.duration} onChange={handleInputChange} style={styles.input} />
          </div>
          <div>
            <label style={styles.label}>Start Date</label>
            <input type="date" name="travelDate" style={styles.input} value={formData.travelDate} onChange={handleInputChange} required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label style={styles.label}>Travelers</label>
            <select name="travelers" style={styles.select} value={formData.travelers} onChange={handleInputChange}>
              {TRAVELER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={styles.label}>Budget</label>
            <select name="budget" style={styles.select} value={formData.budget} onChange={handleInputChange}>
              {BUDGET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div>
            <label style={styles.label}>Way of Travel</label>
            <select name="transportMode" style={styles.select} value={formData.transportMode} onChange={handleInputChange}>
              {TRANSPORT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={styles.label}>Currency</label>
            <select name="currency" style={styles.select} value={formData.currency} onChange={handleInputChange}>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {formData.transportMode === 'Flight' && (
          <div className="mb-8 p-5 bg-blue-50 rounded-2xl border border-blue-100 space-y-4 animate-slideUp">
            <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2"><span>✈️</span> Flight Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <input name="airline" style={styles.input} value={formData.airline} onChange={handleInputChange} placeholder="Airline" />
              <input name="flightNumber" style={styles.input} value={formData.flightNumber} onChange={handleInputChange} placeholder="Flight #" />
              <div>
                <label style={{...styles.label, fontSize: '10px'}}>Departure Time</label>
                <input type="time" name="departureTime" style={styles.input} value={formData.departureTime} onChange={handleInputChange} />
              </div>
              <div>
                <label style={{...styles.label, fontSize: '10px'}}>Arrival Time</label>
                <input type="time" name="arrivalTime" style={styles.input} value={formData.arrivalTime} onChange={handleInputChange} />
              </div>
            </div>
          </div>
        )}

        {formData.transportMode === 'Train' && (
          <div className="mb-8 p-5 bg-orange-50 rounded-2xl border border-orange-100 space-y-4 animate-slideUp">
            <h3 className="text-[10px] font-black text-orange-600 uppercase tracking-widest flex items-center gap-2"><span>🚆</span> Train Details</h3>
            <div className="grid grid-cols-1 gap-3">
              <input name="trainNumber" style={styles.input} value={formData.trainNumber} onChange={handleInputChange} placeholder="Train Number (e.g., ICE 543, Eurostar)" />
              <div className="grid grid-cols-2 gap-3">
                <input name="departureStation" style={styles.input} value={formData.departureStation} onChange={handleInputChange} placeholder="Departure Station" />
                <input name="arrivalStation" style={styles.input} value={formData.arrivalStation} onChange={handleInputChange} placeholder="Arrival Station" />
              </div>
            </div>
          </div>
        )}

        {formData.transportMode === 'Bus' && (
          <div className="mb-8 p-5 bg-amber-50 rounded-2xl border border-amber-100 space-y-4 animate-slideUp">
            <h3 className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2"><span>🚌</span> Bus Details</h3>
            <div className="grid grid-cols-1 gap-3">
              <input name="busCompany" style={styles.input} value={formData.busCompany} onChange={handleInputChange} placeholder="Bus Company (e.g., FlixBus, Greyhound)" />
              <input name="busStop" style={styles.input} value={formData.busStop} onChange={handleInputChange} placeholder="Station / Stop Location" />
            </div>
          </div>
        )}

        {formData.transportMode === 'Car' && (
          <div className="mb-8 p-5 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-4 animate-slideUp">
            <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2"><span>🚗</span> Car Rental Details</h3>
            <div className="grid grid-cols-1 gap-3">
              <input name="carRentalCompany" style={styles.input} value={formData.carRentalCompany} onChange={handleInputChange} placeholder="Rental Company (e.g., Hertz, Avis)" />
              <div className="grid grid-cols-2 gap-3">
                <input name="pickupLocation" style={styles.input} value={formData.pickupLocation} onChange={handleInputChange} placeholder="Pick-up Location" />
                <input name="dropoffLocation" style={styles.input} value={formData.dropoffLocation} onChange={handleInputChange} placeholder="Drop-off Location" />
              </div>
            </div>
          </div>
        )}

        {/* Travel Insurance Section */}
        <div className="mb-8 p-5 bg-purple-50 rounded-2xl border border-purple-100 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] font-black text-purple-600 uppercase tracking-widest flex items-center gap-2"><span>🛡️</span> Optional Travel Insurance</h3>
            {!formData.insuranceProvider && <span className="text-[9px] font-bold text-purple-400 bg-white px-2 py-1 rounded-full shadow-sm">Optional</span>}
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            <div className="flex overflow-x-auto gap-3 pb-2 custom-scrollbar">
              {INSURANCE_PROVIDERS.map(provider => (
                <button
                  type="button"
                  key={provider.name}
                  onClick={() => setFormData(prev => ({ ...prev, insuranceProvider: prev.insuranceProvider === provider.name ? '' : provider.name, insurancePlan: '' }))}
                  className={`flex flex-col items-center p-3 min-w-[120px] rounded-xl border-2 transition-all ${formData.insuranceProvider === provider.name ? 'border-purple-600 bg-white shadow-md' : 'border-transparent bg-white/50 opacity-60'}`}
                >
                  <span className="text-2xl mb-1">{provider.logo}</span>
                  <span className="text-[9px] font-black text-center leading-tight">{provider.name}</span>
                </button>
              ))}
            </div>

            {formData.insuranceProvider && (
              <div className="space-y-3 animate-fadeIn">
                <p className="text-[9px] font-black text-purple-400 uppercase tracking-widest">Select a Plan:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {INSURANCE_PROVIDERS.find(p => p.name === formData.insuranceProvider)?.plans.map(plan => (
                    <button
                      type="button"
                      key={plan.name}
                      onClick={() => setFormData(prev => ({ ...prev, insurancePlan: plan.name }))}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${formData.insurancePlan === plan.name ? 'border-purple-600 bg-white shadow-sm' : 'border-slate-100 bg-white/50'}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[10px] font-black text-slate-800">{plan.name}</span>
                        <span className="text-[10px] font-black text-purple-600">{plan.price}</span>
                      </div>
                      <p className="text-[9px] text-slate-500 leading-tight">{plan.coverage}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mb-8 p-5 bg-slate-50 rounded-2xl border border-slate-100">
          <label style={styles.label}>Interests</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {INTEREST_OPTIONS.map(interest => (
              <button type="button" key={interest} onClick={() => handleInterestChange(interest)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black border-2 transition-all ${formData.interests.includes(interest) ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500'}`}>{interest}</button>
            ))}
          </div>
        </div>
        <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all">GENERATE TRIP</button>
      </form>

      <div className="fixed bottom-6 right-6 z-50">
        {!chatOpen ? (
          <button onClick={() => setChatOpen(true)} className="bg-slate-900 text-white w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center text-2xl active:scale-110 transition-transform">💬</button>
        ) : (
          <div className="bg-white w-72 h-[450px] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-slideUp">
            <div className="bg-slate-900 p-4 text-white flex justify-between items-center"><span className="font-bold text-xs uppercase tracking-widest">WanderLust AI</span><button onClick={() => setChatOpen(false)}>✕</button></div>
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50 custom-scrollbar text-xs">
              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] p-3 rounded-xl ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white text-slate-800 shadow-sm border border-slate-100'}`}>{msg.text}</div></div>
              ))}
            </div>
            <div className="p-3 bg-white border-t border-slate-100 flex gap-2"><input className="flex-1 bg-slate-100 rounded-lg px-3 py-2 text-xs outline-none" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Ask anything..." /><button onClick={handleSendMessage} className="bg-blue-600 text-white p-2 rounded-lg">➤</button></div>
          </div>
        )}
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 4px; width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(100%); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-slideUp { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
}

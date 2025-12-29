
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
  GroundingChunk
} from './types';
import { 
  generateTripPlan, 
  getQuickTravelTip, 
  sendChatMessage 
} from './services/gemini';

const TRAVEL_PLATFORMS = [
  { name: 'Booking.com', icon: '🏨', color: '#003580', getLink: (q: string) => `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(q)}` },
  { name: 'TripAdvisor', icon: '🦉', color: '#34e0a1', getLink: (q: string) => `https://www.tripadvisor.com/Search?q=${encodeURIComponent(q)}` },
  { name: 'Expedia', icon: '✈️', color: '#ffcf00', getLink: (q: string) => `https://www.expedia.com/Hotel-Search?destination=${encodeURIComponent(q)}` },
  { name: 'Hotels.com', icon: '🏩', color: '#d32f2f', getLink: (q: string) => `https://www.hotels.com/Hotel-Search?destination=${encodeURIComponent(q)}` },
  { name: 'Trivago', icon: '📊', color: '#007faf', getLink: (q: string) => `https://www.trivago.com/en-US/srl?q=${encodeURIComponent(q)}` },
];

const styles = {
  container: { maxWidth: '1200px', margin: '0 auto', padding: '20px', fontFamily: 'Inter, sans-serif', position: 'relative' as const, zIndex: 1 },
  header: { textAlign: 'center' as const, color: '#1e293b', marginBottom: '30px' },
  formGroup: { marginBottom: '20px' },
  label: { display: 'block', marginBottom: '6px', fontWeight: '600', color: '#334155' },
  helperText: { fontSize: '0.82em', color: '#64748b', marginTop: '4px', display: 'block', fontWeight: 'normal' },
  input: { width: '100%', padding: '10px', boxSizing: 'border-box' as const, borderRadius: '6px', border: '1px solid #cbd5e1' },
  select: { width: '100%', padding: '10px', boxSizing: 'border-box' as const, borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white' },
  textarea: { width: '100%', padding: '10px', boxSizing: 'border-box' as const, minHeight: '100px', borderRadius: '6px', border: '1px solid #cbd5e1' },
  button: { background: '#2563eb', color: 'white', padding: '12px 24px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: '600', transition: 'background 0.2s' },
  buttonSecondary: { background: '#f1f5f9', color: '#475569', padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' },
  card: { border: '1px solid #e2e8f0', padding: '24px', borderRadius: '12px', marginBottom: '24px', background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  error: { color: '#dc2626', padding: '16px', border: '1px solid #fecaca', borderRadius: '8px', background: '#fef2f2' },
  successMessage: { color: '#15803d', padding: '16px', border: '1px solid #bbf7d0', borderRadius: '8px', background: '#f0fdf4', marginBottom: '20px', fontWeight: 'bold' as const },
  
  dayCard: {
    marginBottom: '50px',
    padding: '40px',
    borderRadius: '32px',
    border: '3px dashed #3b82f6', 
    borderLeft: '16px solid #2563eb', 
    background: 'linear-gradient(135deg, #ffffff 0%, #f0f7ff 50%, #e0f2fe 100%)', 
    boxShadow: '0 25px 50px -12px rgba(59, 130, 246, 0.15)',
    position: 'relative' as const,
    overflow: 'hidden' as const,
  },
  dayHeader: {
    marginTop: 0,
    color: '#1e40af',
    fontSize: '1.6em',
    fontWeight: '900',
    borderBottom: '3px solid #bfdbfe',
    paddingBottom: '16px',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    letterSpacing: '-0.025em'
  },

  watermark: {
    position: 'fixed' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%) rotate(-30deg)',
    opacity: 0.15,
    pointerEvents: 'none' as const,
    zIndex: 0,
    textAlign: 'center' as const,
    whiteSpace: 'nowrap' as const,
  },
  sidebar: {
    position: 'fixed' as const,
    left: 0,
    top: '20%',
    width: '50px',
    background: 'linear-gradient(to bottom, #3b82f6, #8b5cf6, #ec4899)',
    padding: '20px 0',
    borderTopRightRadius: '20px',
    borderBottomRightRadius: '20px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '40px',
    color: 'white',
    writingMode: 'vertical-rl' as const,
    textTransform: 'uppercase' as const,
    fontSize: '12px',
    fontWeight: 'bold' as const,
    boxShadow: '2px 0 10px rgba(0,0,0,0.1)',
    zIndex: 50,
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
  arrivalTime: ''
};

type ActiveTab = 'itinerary' | 'map' | 'packing';

export default function App() {
  const [view, setView] = useState<ViewState>(ViewState.FORM);
  const [activeTab, setActiveTab] = useState<ActiveTab>('itinerary');
  const [formData, setFormData] = useState<TripFormData>(initialFormData);
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null);
  const [error, setError] = useState<string>('');
  const [quickTip, setQuickTip] = useState<string>('');
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [mapQuery, setMapQuery] = useState('');
  const [mapZoom, setMapZoom] = useState(12);
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

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
    
    try {
      const plan = await generateTripPlan(formData);
      if (reqId !== currentRequestId.current) return;
      setTripPlan(plan);
      setMapQuery(formData.destination);
      setView(ViewState.RESULT);
    } catch (err: any) {
      if (reqId !== currentRequestId.current) return;
      setError(err.message || 'Something went wrong generating the plan.');
      setView(ViewState.ERROR);
    }
  };

  const handleSaveTrip = () => {
    if (!tripPlan) return;
    const newTrip: SavedTrip = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      destination: formData.destination,
      formData: { ...formData },
      plan: { ...tripPlan }
    };
    
    try {
      const existing = localStorage.getItem('wanderlust_trips');
      const trips: SavedTrip[] = existing ? JSON.parse(existing) : [];
      trips.push(newTrip);
      localStorage.setItem('wanderlust_trips', JSON.stringify(trips));
      setSavedTrips(trips);
      setShowSaveConfirm(true);
      setTimeout(() => setShowSaveConfirm(false), 3000);
    } catch (e) { console.error(e); }
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
    setView(ViewState.RESULT);
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

  const renderItinerary = (text: string, chunks?: GroundingChunk[]) => {
    const dayRegex = /(?:^|\n)(?=\**Day\s+\d+)/i;
    const parts = text.split(dayRegex);

    const linkText = (content: string) => {
      if (!chunks) return content;
      let linkedContent = content;
      chunks.forEach(chunk => {
        const title = chunk.maps?.title || chunk.web?.title;
        const uri = chunk.maps?.uri || chunk.web?.uri;
        if (title && uri) {
          const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`\\b${escapedTitle}\\b`, 'gi');
          linkedContent = linkedContent.replace(regex, `<a href="${uri}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline; font-weight: 500;">${title}</a>`);
        }
      });
      return linkedContent;
    };

    if (parts.length < 2) {
      return <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: linkText(text.replace(/\n/g, '<br/>')) }} />;
    }

    return (
      <div className="mt-5 space-y-12">
        {parts.map((part, index) => {
          const trimmed = part.trim();
          if (!trimmed) return null;
          const isDayCard = /^\**Day\s+\d+/i.test(trimmed);
          if (!isDayCard) return <div key={index} className="italic text-slate-500 border-l-4 border-slate-200 pl-4 py-2" dangerouslySetInnerHTML={{ __html: linkText(trimmed.replace(/\n/g, '<br/>')) }} />;

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
            <div key={index} style={styles.dayCard} className="group hover:translate-x-1 transition-all duration-300">
              <h3 style={styles.dayHeader}>
                <span className="bg-blue-600 text-white w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-blue-200">📅</span> 
                {title}
              </h3>
              <div style={{lineHeight: '1.9', color: '#334155', fontSize: '1.1em'}} dangerouslySetInnerHTML={{ __html: linkText(content.replace(/\n/g, '<br/>')) }} />
              <div className="absolute top-0 right-0 p-8 opacity-5 select-none pointer-events-none text-9xl font-black text-blue-600 italic">
                {title.match(/\d+/)?.[0]}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const BrandingElements = () => (
    <>
      <div style={styles.watermark}><div style={{fontSize: '80px', fontWeight: 'bold', color: '#cbd5e1'}}>DR. SALEEM ANDRAWS</div></div>
      <div style={styles.sidebar}><span>DR. SALEEM ANDRAWS</span></div>
    </>
  );

  const renderSavedListView = () => (
    <div style={styles.container}>
      <BrandingElements />
      <div className="flex justify-between items-center mb-8">
        <button onClick={() => setView(ViewState.FORM)} style={styles.buttonSecondary}>&larr; Back to Planner</button>
        <h1 className="text-2xl font-black text-slate-900">My Saved Journeys</h1>
      </div>
      {savedTrips.length === 0 ? (
        <div style={styles.card} className="text-center py-20">
          <div className="text-6xl mb-4">🎒</div>
          <h2 className="text-xl font-bold text-slate-800">No saved trips yet.</h2>
          <p className="text-slate-500 mt-2">Generate a plan and click 'Save Trip' to see it here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedTrips.sort((a,b) => b.timestamp - a.timestamp).map(trip => (
            <div key={trip.id} onClick={() => handleLoadSavedTrip(trip)} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden flex flex-col">
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-blue-100 text-blue-600 w-10 h-10 rounded-xl flex items-center justify-center text-xl">📍</div>
                  <button onClick={(e) => handleDeleteTrip(trip.id, e)} className="text-slate-300 hover:text-rose-500 transition-colors p-2">✕</button>
                </div>
                <h3 className="text-lg font-black text-slate-800 mb-1">{trip.destination}</h3>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">{trip.formData.duration} Days • {trip.formData.travelers}</p>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-4 bg-slate-50 p-2 rounded-lg"><span>🕒</span><span>Saved: {new Date(trip.timestamp).toLocaleDateString()}</span></div>
              </div>
              <div className="bg-blue-600 text-white text-center py-3 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">VIEW FULL PLAN</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (view === ViewState.SAVED_LIST) return renderSavedListView();

  if (view === ViewState.LOADING) {
    return (
      <div style={styles.container}>
        <BrandingElements />
        <div style={{...styles.card, textAlign: 'center', paddingTop: '60px', paddingBottom: '60px'}}>
          <div className="animate-bounce" style={{fontSize: '60px', marginBottom: '20px'}}>🌍</div>
          <h2 style={{color: '#1e293b', fontSize: '24px', fontWeight: 'bold'}}>Planning your perfect trip to {formData.destination}...</h2>
          <p style={{color: '#64748b', marginTop: '10px'}}>Searching Booking.com, TripAdvisor, and Google Maps to craft the best itinerary...</p>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-8 overflow-hidden"><div className="bg-blue-600 h-full animate-progress" style={{width: '60%'}}></div></div>
          <button onClick={handleCancelRequest} className="mt-8 px-6 py-2 rounded-lg border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-all font-bold text-sm">Cancel Request</button>
        </div>
        <style>{`@keyframes progress { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } } .animate-progress { animation: progress 2s infinite linear; }`}</style>
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
          <button onClick={() => setView(ViewState.FORM)} style={styles.buttonSecondary}>&larr; Back to Planner</button>
          <button onClick={handleSaveTrip} className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-emerald-700 transition-all shadow-md">Save Trip</button>
        </div>

        {showSaveConfirm && <div style={styles.successMessage} className="animate-fadeIn">✅ Trip saved successfully! Check your saved trips list anytime.</div>}

        <h1 style={styles.header} className="text-4xl font-black text-slate-900 mb-8">{formData.destination} Adventure Plan</h1>

        <div className="flex bg-white rounded-2xl shadow-sm border border-slate-200 mb-8 overflow-hidden">
          <button onClick={() => setActiveTab('itinerary')} className={`flex-1 py-5 px-6 font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'itinerary' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}><span>📅</span> ITINERARY</button>
          <button onClick={() => setActiveTab('packing')} className={`flex-1 py-5 px-6 font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'packing' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}><span>🎒</span> PACKING LIST</button>
          <button onClick={() => setActiveTab('map')} className={`flex-1 py-5 px-6 font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'map' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}><span>🗺️</span> MAP & BOOKING</button>
        </div>

        {activeTab === 'itinerary' ? (
          <div className="space-y-8 animate-fadeIn">
            <div style={styles.card} className="shadow-lg border-t-8 border-t-blue-600">
              <h2 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3"><span className="bg-blue-100 p-2 rounded-xl text-blue-600">🚀</span> Your Adventure Flow</h2>
              {renderItinerary(tripPlan.itinerary, tripPlan.groundingChunks)}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div style={styles.card} className="bg-gradient-to-br from-white to-slate-50">
                <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">💰 Budget Breakdown ({formData.currency})</h2>
                <div className="space-y-4">
                  {tripPlan.budgetBreakdown.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                      <span className="text-slate-600 font-bold">{item.category}</span>
                      <span className="text-blue-600 font-black text-lg">{item.amount.toLocaleString()} {item.currency || formData.currency}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={styles.card} className="bg-gradient-to-br from-white to-amber-50">
                <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">🛡️ Safety & Local Tips</h2>
                <div className="space-y-6">
                  <div className="p-4 bg-amber-100/50 rounded-xl border border-amber-200">
                    <span className="text-xs font-black text-amber-700 uppercase tracking-widest">Security Advice</span>
                    <p className="text-slate-700 text-sm mt-2 leading-relaxed">{tripPlan.securityTips}</p>
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Cultural Etiquette</span>
                    <div className="text-slate-700 text-sm mt-2 leading-relaxed prose prose-sm" dangerouslySetInnerHTML={{ __html: tripPlan.dosAndDonts.replace(/\n/g, '<br/>') }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'packing' ? (
          <div className="animate-fadeIn max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
               <div>
                 <h2 className="text-2xl font-black text-slate-800">Dynamic Packing Checklist</h2>
                 <p className="text-slate-500 text-sm font-medium">Smart items suggested for {formData.duration} days in {formData.destination}</p>
               </div>
               <button onClick={handlePrint} className="bg-slate-900 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-600 transition-colors shadow-lg active:scale-95">
                 <span>🖨️</span> PRINT LIST
               </button>
            </div>

            <div ref={packingListRef} className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
              {tripPlan.packingList.map((cat, idx) => (
                <div key={idx} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow category">
                  <h3 className="text-blue-600 font-black text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-600 rounded-full"></span> {cat.category}
                  </h3>
                  <ul className="space-y-4">
                    {cat.items.map((item, i) => (
                      <li key={i} className="flex items-center gap-4 group cursor-pointer item" onClick={() => toggleCheck(item)}>
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all checkbox ${checkedItems[item] ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 bg-white group-hover:border-blue-400'}`}>
                          {checkedItems[item] && <span className="text-xs font-black">✓</span>}
                        </div>
                        <span className={`text-slate-700 font-medium transition-all ${checkedItems[item] ? 'line-through opacity-50' : ''}`}>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[850px] animate-fadeIn">
            <div className="lg:col-span-4 bg-white p-6 rounded-2xl shadow-xl border border-slate-200 overflow-y-auto custom-scrollbar">
              <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><span>🏷️</span> Smart Booking Hub</h2>
              
              <div className="space-y-6">
                {tripPlan.groundingChunks?.map((chunk, i) => {
                  const title = chunk.maps?.title || chunk.web?.title;
                  const uri = chunk.maps?.uri || chunk.web?.uri;
                  if (!title) return null;
                  const category = getLocationCategory(title);
                  const isHotel = category.label === 'Hotel';

                  return (
                    <div 
                      key={i} 
                      onClick={() => {
                        setMapQuery(chunk.maps?.placeId ? `place_id:${chunk.maps.placeId}` : title);
                        setMapZoom(17);
                        setSelectedLocation(title);
                      }}
                      className={`group p-5 rounded-2xl border-2 transition-all cursor-pointer ${selectedLocation === title ? 'bg-blue-50 border-blue-400 shadow-inner' : 'bg-slate-50 border-transparent hover:bg-white hover:border-slate-200 hover:shadow-lg'}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`${category.bg} ${category.color} w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm border ${category.border} transition-transform group-hover:scale-110`}>
                          {category.icon}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-black text-slate-800 text-lg leading-tight group-hover:text-blue-700 transition-colors">{title}</h4>
                          <span className={`text-[10px] font-black uppercase tracking-widest ${category.color}`}>{category.label}</span>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-2 pt-4 border-t border-slate-200/50">
                        <a href={uri} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                           🔗 Google Maps
                        </a>
                        <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(title)}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm">
                           🚗 Directions
                        </a>
                      </div>

                      {isHotel && (
                        <div className="mt-4 pt-4 border-t border-slate-200/50">
                          <span className="text-[9px] font-black text-slate-400 uppercase block mb-3 text-center">Compare on major platforms</span>
                          <div className="grid grid-cols-5 gap-2">
                            {TRAVEL_PLATFORMS.map(p => (
                              <a 
                                key={p.name} 
                                href={p.getLink(title)} 
                                target="_blank" 
                                rel="noreferrer" 
                                title={`Find on ${p.name}`}
                                className="flex flex-col items-center gap-1 opacity-60 hover:opacity-100 transition-all transform hover:-translate-y-1"
                              >
                                <span className="text-lg bg-white w-8 h-8 rounded-full shadow-sm flex items-center justify-center border border-slate-100">{p.icon}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-8 relative bg-slate-100 rounded-2xl overflow-hidden shadow-2xl border border-slate-300">
              <iframe width="100%" height="100%" title="Map" style={{ border: 0 }} loading="lazy" allowFullScreen src={mapUrl}></iframe>
              <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-2xl space-y-2 max-w-[200px]">
                <h5 className="text-[10px] font-black text-slate-400 uppercase mb-2">Map Legend</h5>
                <div className="flex items-center gap-2 text-xs font-bold"><span className="w-3 h-3 bg-blue-500 rounded-full"></span> Hotels</div>
                <div className="flex items-center gap-2 text-xs font-bold"><span className="w-3 h-3 bg-orange-500 rounded-full"></span> Dining</div>
                <div className="flex items-center gap-2 text-xs font-bold"><span className="w-3 h-3 bg-purple-500 rounded-full"></span> Cultural Sites</div>
                <div className="flex items-center gap-2 text-xs font-bold"><span className="w-3 h-3 bg-emerald-500 rounded-full"></span> Attractions</div>
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
      <div className="flex justify-between items-start mb-12">
        <div className="flex-1">
          <h1 className="text-5xl font-black text-slate-900 mb-2 tracking-tighter">WANDERLUST AI</h1>
          <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Global Travel Designer • Powered by Gemini & Google Maps</p>
        </div>
        <button onClick={() => setView(ViewState.SAVED_LIST)} className="bg-white border-2 border-slate-200 text-slate-700 px-6 py-3 rounded-2xl shadow-sm font-black hover:bg-slate-50 flex items-center gap-2 transition-all active:scale-95">
          <span>📂</span> SAVED JOURNEYS ({savedTrips.length})
        </button>
      </div>

      {quickTip && (
        <div className="max-w-2xl mx-auto bg-blue-600 text-white p-5 rounded-2xl shadow-xl mb-12 flex items-center gap-5 animate-slideUp">
          <div className="text-3xl bg-blue-500/50 p-2 rounded-xl">💡</div>
          <div>
            <span className="text-[10px] font-black text-blue-100 uppercase tracking-widest">Destination Fast Fact</span>
            <p className="font-bold text-lg leading-snug">{quickTip}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} style={styles.card} className="max-w-3xl mx-auto shadow-2xl border-2 border-slate-100 p-8">
        <div style={styles.formGroup}>
          <label style={styles.label}>Where are you going?<span style={styles.helperText}>Enter any city, country, or specific region (e.g. Kyoto, Amalfi Coast)</span></label>
          <input name="destination" style={styles.input} value={formData.destination} onChange={handleInputChange} required className="text-xl font-bold py-3 px-4 focus:ring-4 focus:ring-blue-100 outline-none transition-all" placeholder="e.g., Tokyo, Japan" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <label style={styles.label}>How many days?</label>
            <div className="flex items-center gap-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <input type="range" name="duration" min={1} max={30} step={1} value={formData.duration} onChange={handleInputChange} className="flex-1 accent-blue-600 cursor-pointer" />
              <span className="bg-blue-600 text-white px-4 py-2 rounded-xl font-black text-sm shadow-md">{formData.duration} DAYS</span>
            </div>
          </div>
          <div>
            <label style={styles.label}>When are you leaving?</label>
            <input type="date" name="travelDate" style={styles.input} value={formData.travelDate} onChange={handleInputChange} required className="py-3 px-4" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div>
            <label style={styles.label}>Traveler Type</label>
            <select name="travelers" style={styles.select} value={formData.travelers} onChange={handleInputChange} className="font-bold">
              {TRAVELER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={styles.label}>Budget Tier</label>
            <select name="budget" style={styles.select} value={formData.budget} onChange={handleInputChange} className="font-bold">
              {BUDGET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={styles.label}>Way of Travel</label>
            <select name="transportMode" style={styles.select} value={formData.transportMode} onChange={handleInputChange} className="font-bold">
              {TRANSPORT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={styles.label}>Currency</label>
            <select name="currency" style={styles.select} value={formData.currency} onChange={handleInputChange} className="font-bold">
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Conditional Flight Fields */}
        {formData.transportMode === 'Flight' && (
          <div className="mb-10 p-6 bg-blue-50 rounded-2xl border border-blue-100 animate-slideUp">
            <h3 className="text-xs font-black text-blue-400 uppercase mb-4 tracking-widest flex items-center gap-2"><span>✈️</span> Flight Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label style={styles.label}>Airline</label>
                <input name="airline" style={styles.input} value={formData.airline} onChange={handleInputChange} placeholder="e.g. Air France, Delta" />
              </div>
              <div>
                <label style={styles.label}>Flight Number</label>
                <input name="flightNumber" style={styles.input} value={formData.flightNumber} onChange={handleInputChange} placeholder="e.g. AF123" />
              </div>
              <div>
                <label style={styles.label}>Departure Time</label>
                <input type="time" name="departureTime" style={styles.input} value={formData.departureTime} onChange={handleInputChange} />
              </div>
              <div>
                <label style={styles.label}>Arrival Time</label>
                <input type="time" name="arrivalTime" style={styles.input} value={formData.arrivalTime} onChange={handleInputChange} />
              </div>
              <div className="md:col-span-2">
                <label style={styles.label}>Travel Class</label>
                <select name="flightClass" style={styles.select} value={formData.flightClass} onChange={handleInputChange} className="font-bold">
                  {FLIGHT_CLASSES.map(fc => <option key={fc} value={fc}>{fc}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="mb-10 p-6 bg-slate-50 rounded-2xl border border-slate-200">
          <h3 className="text-xs font-black text-slate-400 uppercase mb-4 tracking-widest flex items-center gap-2"><span>🛌</span> ACCOMMODATION & PREFERENCES</h3>
          <div className="space-y-4">
            <input name="hotelPreferences" style={styles.input} value={formData.hotelPreferences} onChange={handleInputChange} placeholder="e.g. 5-star with pool, Boutique hotels in Old Town..." className="font-medium" />
            <div className="flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map(interest => (
                <button
                  type="button"
                  key={interest}
                  onClick={() => handleInterestChange(interest)}
                  className={`px-4 py-2 rounded-xl text-xs font-black border-2 transition-all ${formData.interests.includes(interest) ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-105' : 'bg-white border-slate-200 text-slate-500 hover:border-blue-400'}`}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-8">
          <label style={styles.label}>Notes & Special Requests</label>
          <textarea name="notes" style={styles.textarea} value={formData.notes} onChange={handleInputChange} placeholder="Dietary needs, must-see landmarks, preferred travel pace, or special celebrations..." className="font-medium text-sm leading-relaxed" />
        </div>

        {error && <div className="mb-6 p-4 bg-rose-50 border-2 border-rose-100 text-rose-600 text-sm font-bold rounded-xl flex items-center gap-3"><span>⚠️</span> {error}</div>}

        <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xl hover:bg-blue-700 transition-all shadow-xl hover:shadow-blue-200 active:scale-95 flex items-center justify-center gap-4">
           <span>✨</span> GENERATE SMART ITINERARY
        </button>
      </form>

      {/* Floating Help Chat */}
      <div className="fixed bottom-8 right-8 z-50">
        {!chatOpen ? (
          <button onClick={() => setChatOpen(true)} className="bg-slate-900 text-white w-16 h-16 rounded-3xl shadow-2xl flex items-center justify-center text-3xl hover:scale-110 transition-transform active:rotate-12">💬</button>
        ) : (
          <div className="bg-white w-96 h-[600px] rounded-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] border border-slate-200 flex flex-col overflow-hidden animate-slideUp">
            <div className="bg-slate-900 p-5 text-white flex justify-between items-center">
              <span className="font-black tracking-widest text-sm flex items-center gap-2"><span className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse"></span> WANDERLUST AI ASSISTANT</span>
              <button onClick={() => setChatOpen(false)} className="text-slate-400 hover:text-white transition-colors">✕</button>
            </div>
            <div className="flex-1 p-6 overflow-y-auto space-y-5 bg-slate-50 custom-scrollbar">
              {chatHistory.length === 0 && <div className="text-center py-20 text-slate-400"><div className="text-4xl mb-4">🧳</div><p className="text-sm font-bold">How can I help with your trip?</p></div>}
              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                   <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none shadow-lg shadow-blue-100' : 'bg-white text-slate-800 shadow-sm border border-slate-100 rounded-bl-none'}`}>{msg.text}</div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-white border-t border-slate-100 flex gap-2">
              <input className="flex-1 bg-slate-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Ask about tips, safety, or sights..." />
              <button onClick={handleSendMessage} className="bg-blue-600 text-white px-4 rounded-xl font-bold shadow-lg shadow-blue-100 active:scale-90 transition-transform">➤</button>
            </div>
          </div>
        )}
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slideUp { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
}

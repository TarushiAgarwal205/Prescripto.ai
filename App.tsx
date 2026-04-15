import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, FileText, CheckCircle, AlertTriangle, Volume2, MessageSquare, X, Send, 
  Edit2, Loader2, RefreshCcw, ShieldAlert, Stethoscope, Pill, Activity, History, 
  Clock, Trash2, ChevronRight, Mic, MapPin, Bell, Home, Baby, PersonStanding, 
  HeartPulse, ChevronDown, ChevronUp, ArrowLeft, Globe, Zap, AlertOctagon, Calendar, 
  Sparkles, Award, ClipboardList, Lightbulb, Frown, Smile, Meh, Hand, Droplet, Plus, Syringe, Lock, Apple, Search, Navigation, Square, Check, ZoomIn, ZoomOut, Maximize2
} from 'lucide-react';
import { analyzePrescriptionImage, generatePrescriptionAudio, chatWithPrescriptionContext, parseReminderFromVoice, translatePrescriptionAnalysis, findNearbyPlaces } from './services/geminiService';
import { decodeBase64, decodeAudioData, playAudioBuffer } from './utils/audioUtils';
import { PrescriptionAnalysis, Medicine, AppState, ChatMessage, SavedPrescription, Reminder, Language } from './types';

const CONFIDENCE_THRESHOLD = 0.8;
const STORAGE_KEY = 'prescripto_history_v1';
const REMINDERS_KEY = 'prescripto_reminders_v1';

// Fun Tips & Jokes for Loading Screen
const LOADING_TIPS = [
  "🍎 An apple a day keeps the doctor away!",
  "💧 Stay hydrated! Your brain is 73% water.",
  "😴 Sleep is the best meditation. Aim for 7-9 hours.",
  "😂 Why did the cookie go to the hospital? Because he felt crummy!",
  "🚶‍♀️ Walking just 30 mins a day boosts your heart health.",
  "🥦 Eat your greens! They are packed with essential vitamins.",
  "👩‍⚕️ Laughter boosts your immune system. Ha ha ha!",
  "🤒 Why did the banana go to the doctor? He wasn't peeling well.",
  "🌞 15 minutes of sunlight gives you Vitamin D for strong bones.",
  "🦴 Did you know? The smallest bone in your body is in your ear!",
  "🩺 Regular check-ups are cheaper than fixing a big problem later.",
  "👀 Blink often when staring at screens to save your eyes."
];

// Localized UI Strings
const UI_TEXT = {
  English: {
    planTitle: "Here's your plan",
    planSubtitle: "I've organized everything below.",
    listen: "Listen",
    assistant: "Assistant",
    banner: "Prescription Decoded!",
  },
  Hindi: {
    planTitle: "यहाँ आपकी योजना है",
    planSubtitle: "मैंने सब कुछ नीचे व्यवस्थित किया है।",
    listen: " सुनें",
    assistant: "सहायक",
    banner: "प्रिस्क्रिप्शन डिकोड किया गया!",
  },
  Tamil: {
    planTitle: "இதோ உங்கள் திட்டம்",
    planSubtitle: "நான் அனைத்தையும் கீழே ஒழுங்கமைத்துள்ளேன்.",
    listen: "கேளுங்கள்",
    assistant: "உதவியாளர்",
    banner: "மருந்து சீட்டு குறிநீக்கம் செய்யப்பட்டது!",
  },
  Bengali: {
    planTitle: "এখানে আপনার পরিকল্পনা",
    planSubtitle: "আমি নিচে সবকিছু গুছিয়ে রেখেছি।",
    listen: "শুনুন",
    assistant: "সহকারী",
    banner: "প্রেসক্রিপশন ডিকোড করা হয়েছে!",
  }
};

// --- Medical Background Component ---
const MEDICAL_EMOJIS = ['💉', '❤️', '🩸', '💊', '⚕️', '🧪', '🩺', '🏥'];

const MedicalBackground = () => {
  // Use refs to access DOM elements directly for high-performance animation
  const bubblesRef = useRef<(HTMLDivElement | null)[]>([]);
  
  // Store dynamic state in a ref or just use the initial state object if we don't need to trigger re-renders
  // Here we initialize the bubbles data once
  const [bubbles] = useState(() => Array.from({ length: 15 }).map((_, i) => ({
    id: i,
    emoji: MEDICAL_EMOJIS[Math.floor(Math.random() * MEDICAL_EMOJIS.length)],
    size: 60 + Math.random() * 80, // 60px - 140px
    x: Math.random() * 100, // 0-100vw
    y: Math.random() * 120 - 10, // -10 to 110vh
    speed: 0.02 + Math.random() * 0.05, // Vertical speed (vh/frame)
    wobbleAmp: 1 + Math.random() * 3, // Horizontal wobble amplitude (vw)
    wobbleFreq: 0.0005 + Math.random() * 0.001, // Frequency
    wobbleOffset: Math.random() * Math.PI * 2, // Phase shift
    rotation: Math.random() * 360,
    rotSpeed: (Math.random() - 0.5) * 0.2, // Rotation speed
    opacity: 0.1 + Math.random() * 0.2 // Slightly increased opacity for better glow visibility
  })));

  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;

      bubbles.forEach((b, i) => {
        const el = bubblesRef.current[i];
        if (!el) return;

        // Update vertical position (float up)
        b.y -= b.speed * (delta / 16); // Normalize speed to ~60fps
        
        // Reset if off screen (top)
        if (b.y < -20) {
          b.y = 110;
          b.x = Math.random() * 100;
        }

        // Calculate horizontal wobble
        const wobble = Math.sin(time * b.wobbleFreq + b.wobbleOffset) * b.wobbleAmp;
        
        // Update rotation
        b.rotation += b.rotSpeed * (delta / 16);

        // Apply transformations efficiently
        el.style.transform = `translate3d(${b.x + wobble}vw, ${b.y}vh, 0) rotate(${b.rotation}deg)`;
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrameId);
  }, [bubbles]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-slate-950">
       {/* Background gradient overlay */}
       <div className="absolute inset-0 bg-gradient-to-b from-blue-950/30 to-purple-950/30" />

       {bubbles.map((bubble, i) => (
         <div
           key={bubble.id}
           ref={(el) => { bubblesRef.current[i] = el; }}
           // Removed 'backdrop-blur-[2px]' for better performance
           className="absolute top-0 left-0 flex items-center justify-center rounded-full will-change-transform"
           style={{
             width: `${bubble.size}px`,
             height: `${bubble.size}px`,
             opacity: bubble.opacity,
             // Optimized Glowing Outline Styles: Removed heavy blur calculations
             border: '1px solid rgba(139, 92, 246, 0.4)', // Soft violet border
             boxShadow: '0 0 10px rgba(139, 92, 246, 0.2)', // Simplified shadow for performance
             background: 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.02), rgba(0, 0, 0, 0))',
             // Initial position set by JS immediately, but fallback provided
             transform: `translate3d(${bubble.x}vw, ${bubble.y}vh, 0)`
           }}
         >
           {/* Inner Emoji - Centered */}
           {/* Removed 'filter drop-shadow-md' for better performance */}
           <div 
             className="text-4xl opacity-80 select-none"
             style={{ fontSize: `${bubble.size * 0.45}px` }}
           >
             {bubble.emoji}
           </div>
         </div>
       ))}
    </div>
  );
};

// --- Confetti Component ---
const Confetti = () => {
  const [particles, setParticles] = useState<Array<{id: number, left: number, color: string, delay: number}>>([]);

  useEffect(() => {
    const colors = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];
    const newParticles = Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 2
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute top-[-20px] w-3 h-3 rounded-full animate-fall"
          style={{
            left: `${p.left}%`,
            backgroundColor: p.color,
            animationDuration: `${3 + Math.random()}s`,
            animationDelay: `${p.delay}s`,
            opacity: 0.8
          }}
        />
      ))}
      <style>{`
        @keyframes fall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        .animate-fall {
          animation-name: fall;
          animation-timing-function: linear;
          animation-fill-mode: forwards;
        }
      `}</style>
    </div>
  );
};

// --- Dr. Prescripto Avatar Component ---
type DoctorEmotion = 'neutral' | 'analyzing' | 'happy' | 'confused' | 'speaking' | 'listening';

const DrPrescripto = ({ 
  emotion = 'neutral', 
  message, 
  className = '',
  thumbnailImage,
  onThumbnailClick
}: { 
  emotion?: DoctorEmotion, 
  message?: string,
  className?: string,
  thumbnailImage?: string | null,
  onThumbnailClick?: () => void
}) => {
  // Greeting Animation State for Neutral Emotion
  const [greetingPhase, setGreetingPhase] = useState<'wave' | 'namaste'>('wave');

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (emotion === 'neutral') {
      // Toggle between waving and namaste every 4 seconds
      interval = setInterval(() => {
        setGreetingPhase(prev => prev === 'wave' ? 'namaste' : 'wave');
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [emotion]);

  return (
    <div className={`flex flex-col items-center ${className} transition-all duration-500`}>
      {/* Speech Bubble */}
      {message && (
        <div className="mb-4 relative animate-fade-in-up">
           <div className="bg-slate-800 px-6 py-4 rounded-2xl rounded-bl-none shadow-xl border border-slate-700 max-w-xs text-center relative z-10">
              <p className="text-slate-100 font-medium text-lg leading-snug">{message}</p>
           </div>
           {/* Speech bubble tail */}
           <div className="absolute -bottom-2 left-4 w-4 h-4 bg-slate-800 border-b border-r border-slate-700 transform rotate-45 z-0"></div>
        </div>
      )}

      {/* Avatar Container */}
      <div className="relative w-24 h-24">
        {/* Glow Effect */}
        <div className={`absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full opacity-40 blur-md ${emotion === 'analyzing' || emotion === 'speaking' ? 'animate-pulse' : ''}`}></div>
        
        {/* Main Face Circle */}
        <div className="absolute inset-1 bg-white rounded-full flex items-center justify-center border-4 border-slate-700 shadow-inner overflow-hidden">
           
           {/* Face Content based on Emotion */}
           {emotion === 'neutral' && (
             <div className="relative w-full h-full flex items-center justify-center">
                {/* The Doctor Base Emoji */}
                <span className="text-5xl transform translate-y-1 select-none">👩‍⚕️</span>
                
                {/* Animated Hand: Wave */}
                <div className={`absolute top-[40%] right-[5%] origin-bottom-left z-20 transition-all duration-700 ease-in-out ${greetingPhase === 'wave' ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
                   <Hand className="w-8 h-8 text-yellow-400 fill-yellow-400 stroke-amber-600 animate-hand-wave" strokeWidth={1.5} />
                </div>

                {/* Animated Hands: Namaste */}
                <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 flex items-end z-20 transition-all duration-700 ease-in-out ${greetingPhase === 'namaste' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                   <Hand className="w-6 h-6 text-yellow-400 fill-yellow-400 stroke-amber-600 -scale-x-100 rotate-[15deg] -mr-1.5 drop-shadow-sm" strokeWidth={1.5} />
                   <Hand className="w-6 h-6 text-yellow-400 fill-yellow-400 stroke-amber-600 rotate-[15deg] -ml-1.5 drop-shadow-sm" strokeWidth={1.5} />
                </div>
             </div>
           )}
           
           {emotion === 'analyzing' && (
             <div className="flex flex-col items-center">
                <ClipboardList className="w-8 h-8 text-indigo-600 animate-bounce mb-1" />
                <span className="text-xs font-bold text-indigo-400">Analyzing</span>
             </div>
           )}
           
           {emotion === 'happy' && (
             <div className="relative">
                <span className="text-5xl animate-bounce-subtle block">👩‍⚕️</span>
                <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-400 animate-spin-slow" />
             </div>
           )}
           
           {emotion === 'confused' && (
             <div className="relative">
                <span className="text-5xl">😵‍💫</span>
                <span className="absolute -top-1 -right-1 text-2xl animate-pulse">❓</span>
             </div>
           )}

           {emotion === 'speaking' && (
             <div className="flex flex-col items-center justify-center h-full w-full bg-indigo-50">
                <div className="flex space-x-1 items-end h-8 mb-2">
                  <div className="w-1.5 bg-indigo-500 rounded-full animate-wave-1"></div>
                  <div className="w-1.5 bg-indigo-500 rounded-full animate-wave-2"></div>
                  <div className="w-1.5 bg-indigo-500 rounded-full animate-wave-3"></div>
                </div>
             </div>
           )}

           {emotion === 'listening' && (
             <div className="flex items-center justify-center">
               <Mic className="w-10 h-10 text-red-500 animate-pulse" />
             </div>
           )}
        </div>

        {/* Prescription Thumbnail (New) */}
        {thumbnailImage && (
             <div 
                className="absolute right-full top-0 mr-4 w-16 h-20 md:w-20 md:h-24 rotate-[-6deg] hover:rotate-0 transition-all duration-300 z-20 cursor-pointer group"
                onClick={onThumbnailClick}
             >
                <div className="w-full h-full bg-slate-800 rounded-xl border-2 border-dashed border-blue-400 p-1 shadow-lg hover:shadow-blue-500/20 hover:scale-105 transition-transform overflow-hidden relative">
                    <img src={thumbnailImage} alt="Uploaded" className="w-full h-full object-cover rounded-lg opacity-80 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 bg-blue-500/10 group-hover:bg-transparent transition-colors" />
                    <div className="absolute bottom-1 right-1 bg-blue-600 text-white p-0.5 rounded-full shadow-sm scale-75">
                        <Maximize2 className="w-3 h-3" />
                    </div>
                </div>
             </div>
        )}

        {/* Action Cues (Tapping Tablet, Waving) */}
        {emotion === 'analyzing' && (
           <div className="absolute -right-4 top-1/2 bg-slate-800 p-1.5 rounded-lg shadow-md border border-slate-600 animate-pulse">
              <ClipboardList className="w-4 h-4 text-slate-300" />
           </div>
        )}
        {(emotion === 'speaking' || emotion === 'happy') && (
           <div className="absolute -left-2 top-0 bg-slate-800 p-1 rounded-full shadow-sm animate-wiggle border border-slate-600">
              <Hand className="w-5 h-5 text-yellow-400" />
           </div>
        )}
      </div>

      {/* Name Tag */}
      <div className="mt-2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-indigo-900/50">
        Dr. Prescripto (AI)
      </div>

      <style>{`
        @keyframes wave { 0%, 100% { height: 10%; } 50% { height: 100%; } }
        .animate-wave-1 { animation: wave 1s infinite 0.1s; }
        .animate-wave-2 { animation: wave 1s infinite 0.2s; }
        .animate-wave-3 { animation: wave 1s infinite 0.3s; }
        @keyframes wiggle { 0%, 100% { transform: rotate(-10deg); } 50% { transform: rotate(10deg); } }
        .animate-wiggle { animation: wiggle 2s infinite ease-in-out; }
        
        /* Realistic Hand Wave Animation */
        @keyframes hand-wave {
          0% { transform: rotate(0deg); }
          20% { transform: rotate(-20deg); }
          40% { transform: rotate(10deg); }
          60% { transform: rotate(-20deg); }
          80% { transform: rotate(0deg); }
          100% { transform: rotate(0deg); }
        }
        .animate-hand-wave {
          animation: hand-wave 2s infinite ease-in-out;
          transform-origin: bottom left;
        }
      `}</style>
    </div>
  );
};

export default function App() {
  const [state, setState] = useState<AppState>('home');
  const [image, setImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<PrescriptionAnalysis | null>(null);
  const [language, setLanguage] = useState<Language>('English');
  
  // Gamified Loading State
  const [loadingStage, setLoadingStage] = useState(0);
  const [loadingTip, setLoadingTip] = useState('');
  
  const [reviewItems, setReviewItems] = useState<Medicine[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  
  // Chat State
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Audio & Voice State
  const [audioLoading, setAudioLoading] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Doctor Search State
  const [doctorSearchTerm, setDoctorSearchTerm] = useState('');
  const [doctorResults, setDoctorResults] = useState<any>({ text: '', chunks: [] });
  const [doctorLoading, setDoctorLoading] = useState(false);

  // Translation State
  const [isTranslating, setIsTranslating] = useState(false);

  // Data State
  const [showHistory, setShowHistory] = useState(false);
  const [savedPrescriptions, setSavedPrescriptions] = useState<SavedPrescription[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [newReminderText, setNewReminderText] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('');

  // History Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Image Modal State
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imgZoom, setImgZoom] = useState(1); // Zoom state

  // Doctor State
  const [docEmotion, setDocEmotion] = useState<DoctorEmotion>('neutral');
  const [docMessage, setDocMessage] = useState<string>("Hi! I'm Dr. Prescripto. How can I help today?");
  const [showConfetti, setShowConfetti] = useState(false);

  // Load data on mount
  useEffect(() => {
    const storedHistory = localStorage.getItem(STORAGE_KEY);
    if (storedHistory) {
      try { setSavedPrescriptions(JSON.parse(storedHistory)); } catch (e) { console.error(e); }
    }
    const storedReminders = localStorage.getItem(REMINDERS_KEY);
    if (storedReminders) {
       try { setReminders(JSON.parse(storedReminders)); } catch (e) { console.error(e); }
    }
  }, []);

  // Update Doctor State based on App State
  useEffect(() => {
    if (state === 'home') {
      setDocEmotion('neutral');
      setDocMessage("Hi! I'm Dr. Prescripto. I can read your prescriptions for you.");
    } else if (state === 'upload') {
      setDocEmotion('neutral');
      setDocMessage("Great! Please upload a clear photo of the prescription.");
    } else if (state === 'analyzing') {
      setDocEmotion('analyzing');
      setDocMessage("Let me analyze this for you... Just a moment.");
    } else if (state === 'review') {
      setDocEmotion('confused');
      // Message is set in processImage logic dynamically based on confidence
    } else if (state === 'results') {
      setDocEmotion('happy');
      setDocMessage("🏆 Prescription Decoded!");
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    } else if (state === 'doctors') {
      if (doctorLoading) {
        setDocEmotion('analyzing');
        setDocMessage("Searching nearby...");
      } else {
        setDocEmotion('neutral');
        setDocMessage("Here are some places I found.");
      }
    }
  }, [state, doctorLoading]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, showChat]);

  // Handle Language Change Logic
  const handleLanguageChange = async (newLang: Language) => {
    setLanguage(newLang);
    if (state === 'results' && analysis) {
        setIsTranslating(true);
        setDocEmotion('analyzing');
        setDocMessage(`Translating to ${newLang}...`);
        try {
            const translated = await translatePrescriptionAnalysis(analysis, newLang);
            setAnalysis(translated);
            setDocEmotion('happy');
            setDocMessage(`Translation complete!`);
        } catch (error) {
            setDocMessage("Oops, translation failed.");
            console.error("Translation Failed", error);
        } finally {
            setIsTranslating(false);
        }
    }
  };

  // --- Gamified Loading Logic ---
  const startGamifiedLoading = () => {
    setLoadingStage(1);
    const intervals = [
      setTimeout(() => setLoadingStage(2), 1500),
      setTimeout(() => setLoadingStage(3), 3500),
      setTimeout(() => setLoadingStage(4), 5500),
    ];
    return () => intervals.forEach(clearTimeout);
  };

  // --- Doctor Search Logic ---
  const handleDoctorSearch = async (query: string) => {
    if (!query) return;
    setDoctorLoading(true);
    setDocEmotion('analyzing');
    setDocMessage("Searching nearby...");
    
    // Attempt to get location
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const { text, chunks } = await findNearbyPlaces(query, {
          lat: position.coords.latitude, 
          lng: position.coords.longitude
        });
        setDoctorResults({text, chunks});
        setDocMessage(`Found some options for you.`);
        setDocEmotion('happy');
      } catch (e) {
        setDocMessage("Couldn't find anything.");
        setDocEmotion('confused');
        console.error(e);
      } finally {
        setDoctorLoading(false);
      }
    }, (err) => {
       console.log("Loc error", err);
       // Fallback without location if permission denied
       findNearbyPlaces(query).then(({text, chunks}) => {
          setDoctorResults({text, chunks});
          setDocMessage("Found some options (no location used).");
          setDoctorLoading(false);
          setDocEmotion('neutral');
       }).catch(() => {
          setDoctorLoading(false);
          setDocMessage("Search failed.");
       });
    });
  };

  // --- Voice Input Handler ---
  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Voice input is not supported in this browser.");
      return;
    }
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);
    setDocEmotion('listening');
    setDocMessage("I'm listening...");

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      
      if (transcript.includes("scan") || transcript.includes("prescription")) {
         setDocMessage("Opening scanner...");
         setState('upload');
         setTimeout(() => fileInputRef.current?.click(), 500);
      } else if (transcript.includes("remind me")) {
         setState('reminders');
         setDocMessage("Setting up that reminder for you.");
         setLoadingStage(1); 
         try {
           const parsedReminders = await parseReminderFromVoice(transcript);
           if (parsedReminders.length > 0) {
              const newReminders = parsedReminders.map(r => ({
                id: Date.now().toString() + Math.random(),
                text: r.text,
                time: r.time,
                completed: false
              }));
              const updated = [...reminders, ...newReminders];
              setReminders(updated);
              localStorage.setItem(REMINDERS_KEY, JSON.stringify(updated));
           } else {
              const parts = transcript.split("remind me to");
              if (parts.length > 1) setNewReminderText(parts[1].trim());
           }
         } catch (e) {
           console.error(e);
         } finally {
           setLoadingStage(0);
         }
      } else if (transcript.includes("find") || transcript.includes("doctor") || transcript.includes("clinic") || transcript.includes("hospital")) {
         setState('doctors');
         setDoctorSearchTerm(transcript);
         setDocMessage("Searching for doctors nearby...");
         handleDoctorSearch(transcript);
      } else {
         setDocMessage(`I heard: "${transcript}". Try "Scan prescription".`);
      }
      setIsListening(false);
      if (state === 'home') setDocEmotion('neutral');
    };
    recognition.onerror = () => {
        setIsListening(false);
        setDocMessage("I couldn't hear you clearly.");
        setDocEmotion('neutral');
    };
    recognition.onend = () => {
        setIsListening(false);
        if (state !== 'upload' && state !== 'reminders' && state !== 'doctors') setDocEmotion('neutral');
    };
    recognition.start();
  };

  // --- Core Logic ---
  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result as string);
      setState('analyzing');
      processImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (base64Img: string) => {
    // Select a random tip
    setLoadingTip(LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)]);
    startGamifiedLoading();
    try {
      const result = await analyzePrescriptionImage(base64Img, language);
      setAnalysis(result);

      const lowConfidenceItems = result.medicines.filter(m => m.confidence < CONFIDENCE_THRESHOLD);
      if (lowConfidenceItems.length > 0) {
        setReviewItems(lowConfidenceItems);
        // Special logic for Review State
        setDocEmotion('confused');
        const avgConf = Math.round(lowConfidenceItems.reduce((acc, i) => acc + i.confidence, 0) / lowConfidenceItems.length * 100);
        setDocMessage(`I'm only ${avgConf}% confident about some names. Can you confirm?`);
        setState('review');
      } else {
        saveToHistory(result);
        setState('results');
      }
    } catch (error) {
      console.error("Analysis failed:", error);
      setDocEmotion('confused');
      setDocMessage("I had trouble reading that. Could you try a clearer photo?");
      alert("Failed to analyze. Please try again.");
      setState('upload');
    } finally {
      setLoadingStage(0);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // --- Drag and Drop Handlers ---
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      if(file.type.startsWith('image/')) {
        processFile(file);
      } else {
        alert("For now, only image files (JPG, PNG) are supported for prescription analysis.");
      }
    }
  };

  // --- Helper Functions ---
  const saveToHistory = (result: PrescriptionAnalysis) => {
    const newRecord: SavedPrescription = {
      id: Date.now().toString(),
      name: `Prescription ${new Date().toLocaleDateString()}`,
      date: new Date().toLocaleDateString(),
      timestamp: Date.now(),
      analysis: result
    };
    const updatedHistory = [newRecord, ...savedPrescriptions];
    setSavedPrescriptions(updatedHistory);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
  };

  const handleSaveName = (id: string) => {
    if (!editingName.trim()) return;
    const updatedHistory = savedPrescriptions.map(p => 
        p.id === id ? { ...p, name: editingName } : p
    );
    setSavedPrescriptions(updatedHistory);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
    setEditingId(null);
    setEditingName('');
  };

  const stopTTS = () => {
      if (audioSourceRef.current) {
          audioSourceRef.current.onended = null;
          try {
              audioSourceRef.current.stop();
          } catch (e) {
              console.error("Error stopping audio", e);
          }
          audioSourceRef.current = null;
      }
      if (audioContextRef.current) {
          try {
              audioContextRef.current.close();
          } catch (e) {
              console.error("Error closing audio context", e);
          }
          audioContextRef.current = null;
      }
      setIsPlayingAudio(false);
      setDocEmotion('neutral');
  };

  const handleTTS = async () => {
    if (!analysis) return;
    
    stopTTS(); // Ensure fresh start

    setAudioLoading(true);
    setDocEmotion('speaking');
    setDocMessage("🔊 Voice Guide Activated. Listen closely.");
    
    try {
      const summary = analysis.medicines
        .map(m => `${m.name}. ${m.instructions}`)
        .join('. ');
        
      const textToRead = summary;
      const audioBase64 = await generatePrescriptionAudio(textToRead, language);
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = audioContext;

      const audioBuffer = await decodeAudioData(decodeBase64(audioBase64), audioContext);
      
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      audioSourceRef.current = source;

      source.onended = () => {
         setDocEmotion('happy');
         setDocMessage("I hope that was clear!");
         setIsPlayingAudio(false);
         // Close context to free resources
         audioContext.close().catch(console.error);
         audioContextRef.current = null;
         audioSourceRef.current = null;
      };
      
      source.start();
      setIsPlayingAudio(true);
    } catch (e) { 
        alert("Audio generation failed"); 
        setDocEmotion('neutral');
        setIsPlayingAudio(false);
    } 
    finally { setAudioLoading(false); }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !analysis) return;
    const newUserMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: chatInput, timestamp: new Date() };
    setChatMessages(prev => [...prev, newUserMsg]);
    setChatInput('');
    setChatLoading(true);
    try {
      const historyForApi = chatMessages.map(m => ({ role: m.role, text: m.text }));
      const responseText = await chatWithPrescriptionContext(historyForApi, newUserMsg.text, analysis);
      const newAiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: responseText || "Error", timestamp: new Date() };
      setChatMessages(prev => [...prev, newAiMsg]);
    } catch (error) { console.error(error); } 
    finally { setChatLoading(false); }
  };

  // --- Components ---
  const renderHeader = () => (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 px-4 md:px-6 py-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center">
        {state !== 'home' && (
          <button 
            onClick={() => setState('home')}
            className="mr-3 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all border border-transparent hover:border-slate-700"
            aria-label="Go Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center space-x-2 text-indigo-400 cursor-pointer" onClick={() => setState('home')}>
          <div className="bg-indigo-600 text-white p-1.5 rounded-lg">
            <Stethoscope className="w-5 h-5" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">Prescripto AI</h1>
        </div>
      </div>
      
      <div className="flex items-center space-x-2 md:space-x-4">
        {/* Language Selector */}
        <div className="hidden md:flex items-center bg-slate-800 rounded-full px-3 py-1.5 border border-slate-700">
          <Globe className="w-4 h-4 text-indigo-400 mr-2" />
          <select 
            value={language} 
            onChange={(e) => handleLanguageChange(e.target.value as Language)}
            className="bg-transparent border-none text-sm font-semibold text-slate-200 focus:ring-0 cursor-pointer outline-none"
          >
            <option value="English" className="text-slate-900 bg-white">English</option>
            <option value="Hindi" className="text-slate-900 bg-white">Hindi</option>
            <option value="Tamil" className="text-slate-900 bg-white">Tamil</option>
            <option value="Bengali" className="text-slate-900 bg-white">Bengali</option>
          </select>
        </div>

        <button onClick={startListening} className={`p-2.5 rounded-full transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-indigo-400'}`}>
          <Mic className="w-5 h-5" />
        </button>
        
        <button onClick={() => setShowHistory(true)} className="p-2 text-slate-400 hover:text-indigo-400 relative">
          <History className="w-6 h-6" />
          {savedPrescriptions.length > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900" />}
        </button>
      </div>
    </header>
  );

  return (
    <div className="min-h-screen relative pb-20 font-sans overflow-hidden">
      {/* Animated Medical Background */}
      <MedicalBackground />

      {showConfetti && <Confetti />}
      {renderHeader()}

      <main className="max-w-4xl mx-auto p-4 md:p-8 relative z-10">
        
        {/* AVATAR CENTER STAGE */}
        <div className="flex justify-center mb-8 relative">
           <DrPrescripto 
             emotion={docEmotion} 
             message={docMessage} 
             thumbnailImage={state === 'results' ? image : null}
             onThumbnailClick={() => {
                if (state === 'results' && image) {
                    setIsImageModalOpen(true);
                    setImgZoom(1);
                }
             }}
           />
        </div>

        {/* HOME SCREEN */}
        {state === 'home' && (
           <div className="space-y-12 animate-fade-in">
             <div className="text-center space-y-6">
               <h2 className="text-4xl md:text-6xl font-extrabold text-slate-100 tracking-tight leading-tight">
                 Deciphering Meds <br/>
                 <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">Just Got Easier.</span>
               </h2>
               <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
                 Turn messy prescriptions into clear, safe instructions with AI.
               </p>
             </div>

             <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto relative">
               
               {/* 1. SCAN PRESCRIPTION BUTTON */}
               <button onClick={() => setState('upload')} className="col-span-2 group relative overflow-hidden bg-gradient-to-r from-indigo-700 to-purple-800 text-white p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 border border-indigo-600/30">
                 {/* Decorative Background Blur */}
                 <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
                 
                 {/* Decorative Pill - Top Left */}
                 <div className="absolute top-6 left-16 opacity-10 transform -rotate-12 group-hover:scale-110 transition-transform duration-500">
                    <div className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center">
                        <Pill className="w-10 h-10 text-white" />
                    </div>
                 </div>

                 {/* Decorative Drop - Top Right */}
                 <div className="absolute top-6 right-20 opacity-10 transform rotate-12 group-hover:scale-110 transition-transform duration-500">
                    <div className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center">
                        <Droplet className="w-10 h-10 text-white" />
                    </div>
                 </div>

                 <div className="flex items-center justify-between relative z-10">
                   <div className="flex items-center space-x-6">
                     <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
                       <Upload className="w-8 h-8 text-white" />
                     </div>
                     <div className="text-left">
                       <h3 className="text-2xl font-bold">Scan Prescription</h3>
                       <p className="text-indigo-200">Upload or take a photo</p>
                     </div>
                   </div>
                   <div className="bg-white/10 p-3 rounded-full group-hover:bg-white/20 transition-colors">
                     <ChevronRight className="w-6 h-6" />
                   </div>
                 </div>
               </button>

               {/* 2. SMART REMINDERS BUTTON */}
               <button onClick={() => setState('reminders')} className="relative overflow-hidden bg-slate-800/80 hover:bg-slate-700/80 p-6 rounded-3xl shadow-sm border border-slate-700 hover:border-purple-500/50 transition-all flex flex-col items-center text-center space-y-4 group backdrop-blur-sm">
                 {/* Decorative Plus/Ambulance Sign */}
                 <div className="absolute -bottom-6 -left-6 opacity-10 transform rotate-12 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
                     <div className="w-32 h-32 rounded-full border-4 border-purple-400 flex items-center justify-center">
                        <Plus className="w-16 h-16 text-purple-400" strokeWidth={4} />
                     </div>
                 </div>
                 
                 <div className="bg-purple-900/40 p-4 rounded-full group-hover:scale-110 transition-transform duration-300 relative z-10">
                   <Bell className="w-8 h-8 text-purple-400" />
                 </div>
                 <div className="relative z-10">
                   <h3 className="font-bold text-slate-100 text-lg">Smart Reminders</h3>
                   <p className="text-sm text-slate-400">Auto-schedule your meds</p>
                 </div>
               </button>

               {/* 3. FIND DOCTORS BUTTON */}
               <button onClick={() => setState('doctors')} className="relative overflow-hidden bg-slate-800/80 hover:bg-slate-700/80 p-6 rounded-3xl shadow-sm border border-slate-700 hover:border-blue-500/50 transition-all flex flex-col items-center text-center space-y-4 group backdrop-blur-sm">
                 {/* Decorative Syringe */}
                 <div className="absolute -top-6 -left-6 opacity-10 transform -rotate-45 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
                     <div className="w-32 h-32 rounded-full border-4 border-blue-400 flex items-center justify-center">
                        <Syringe className="w-16 h-16 text-blue-400" />
                     </div>
                 </div>
                 
                 {/* Decorative Heartbeat */}
                 <div className="absolute bottom-2 right-2 opacity-5 pointer-events-none">
                    <HeartPulse className="w-16 h-16 text-blue-400" />
                 </div>

                 <div className="bg-blue-900/40 p-4 rounded-full group-hover:scale-110 transition-transform duration-300 relative z-10">
                   <MapPin className="w-8 h-8 text-blue-400" />
                 </div>
                 <div className="relative z-10">
                   <h3 className="font-bold text-slate-100 text-lg">Find Doctors</h3>
                   <p className="text-sm text-slate-400">Locate nearby clinics</p>
                 </div>
               </button>
             </div>
             
             {/* Voice Input Trigger */}
             <div className="flex justify-center mt-12 w-full">
               <button 
                 onClick={startListening}
                 className={`
                   w-full max-w-md relative px-6 py-6 rounded-3xl border-2 border-dashed transition-all flex flex-col items-center space-y-3 bg-slate-800/50 backdrop-blur-sm
                   ${isListening 
                     ? 'border-red-400 bg-red-900/20' 
                     : 'border-slate-700 hover:border-indigo-500 hover:bg-slate-800'
                   }
                 `}
               >
                 <div className={`p-4 rounded-full ${isListening ? 'bg-red-500 shadow-lg animate-pulse' : 'bg-indigo-600 shadow-md'} transition-colors`}>
                   <Mic className="w-8 h-8 text-white" />
                 </div>
                 <div className="text-center">
                   <p className={`text-lg font-bold ${isListening ? 'text-red-400' : 'text-slate-200'}`}>
                     {isListening ? 'Listening...' : 'Tap to Speak'}
                   </p>
                   <p className="text-sm text-slate-400 mt-1 max-w-xs mx-auto">
                     Try saying <span className="font-medium text-indigo-400">"Scan the prescription"</span> or <span className="font-medium text-indigo-400">"Remind me to take paracetamol at 8 pm"</span>
                   </p>
                 </div>
               </button>
             </div>
           </div>
        )}

        {/* UPLOAD SCREEN */}
        {state === 'upload' && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] animate-fade-in relative">
            <div className="w-full max-w-2xl text-center space-y-8 mt-12">
               <div>
                  <h2 className="text-4xl font-extrabold text-slate-100 mb-2">Upload Prescription</h2>
                  <p className="text-slate-400">We'll analyze it for medicines and safety.</p>
               </div>
               
               <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    relative group cursor-pointer border-2 border-dashed rounded-3xl p-4 transition-all duration-300
                    ${isDragging ? 'border-blue-500 bg-blue-900/20' : 'border-slate-600 hover:border-blue-500'}
                  `}
               >
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  
                  <div className={`
                    bg-slate-800/50 backdrop-blur-sm rounded-2xl p-16 flex flex-col items-center justify-center space-y-6 transition-all duration-300
                    ${isDragging ? 'bg-slate-800 shadow-md' : 'group-hover:bg-slate-800 group-hover:shadow-sm'}
                  `}>
                    <div className="bg-indigo-900/50 p-6 rounded-full text-indigo-400 mb-2">
                      <Upload className="w-10 h-10" />
                    </div>
                    <div className="space-y-2">
                       <p className="text-xl font-bold text-slate-200">Click to Upload</p>
                       <p className="text-slate-500 text-sm">SVG, PNG, JPG or GIF (max. 800x400px)</p>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* GAMIFIED ANALYZING SCREEN */}
        {state === 'analyzing' && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-10 animate-fade-in">
            
            <div className="w-full max-w-md space-y-4">
              <h3 className="text-2xl font-bold text-slate-100">
                {/* Use the new UI_TEXT if implemented, or fallback */}
                {loadingStage === 1 && "Detecting Handwriting..."}
                {loadingStage === 2 && "Identifying Medicines..."}
                {loadingStage === 3 && "Checking Interactions..."}
                {loadingStage === 4 && "Generating Report..."}
              </h3>
              
              {/* Level Up Progress Bar */}
              <div className="h-4 bg-slate-800 backdrop-blur-sm rounded-full overflow-hidden shadow-inner border border-slate-700">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-1000 ease-out"
                  style={{ width: `${loadingStage * 25}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span className={loadingStage >= 1 ? "text-indigo-400" : ""}>Scan</span>
                <span className={loadingStage >= 2 ? "text-indigo-400" : ""}>Identify</span>
                <span className={loadingStage >= 3 ? "text-indigo-400" : ""}>Safety</span>
                <span className={loadingStage >= 4 ? "text-indigo-400" : ""}>Done</span>
              </div>
            </div>

            {/* Health Tip / Joke Card */}
            <div className="mt-8 bg-slate-800/90 backdrop-blur-md border border-slate-700 p-6 rounded-2xl shadow-lg max-w-sm w-full mx-auto relative overflow-hidden animate-fade-in-up">
               <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
               <Lightbulb className="w-6 h-6 text-yellow-400 mb-3" />
               <p className="text-slate-200 font-medium italic">"{loadingTip}"</p>
               <p className="text-slate-500 text-xs mt-3 font-bold uppercase tracking-widest">While you wait</p>
            </div>
          </div>
        )}

        {/* REVIEW SCREEN (Confusion -> Clarity) */}
        {state === 'review' && (
           <div className="max-w-xl mx-auto space-y-8 animate-fade-in">
             <div className="bg-slate-800/90 backdrop-blur-md p-6 rounded-3xl shadow-xl border border-slate-700 text-center space-y-4">
                
                {/* Clarity Meter Animation */}
                <div className="flex items-center justify-center space-x-6">
                   <div className="text-center opacity-40">
                      <div className="text-4xl mb-2">😵‍💫</div>
                      <div className="text-xs font-bold text-slate-500">Messy</div>
                   </div>
                   <ArrowLeft className="w-6 h-6 text-slate-600 transform rotate-180" />
                   <div className="text-center transform scale-125">
                      <div className="text-5xl mb-2 animate-bounce">🤔</div>
                      <div className="text-sm font-bold text-indigo-400 bg-indigo-900/30 px-3 py-1 rounded-full">Clarity Meter</div>
                   </div>
                   <ArrowRightIcon className="w-6 h-6 text-slate-600" />
                   <div className="text-center opacity-40">
                      <div className="text-4xl mb-2">💡</div>
                      <div className="text-xs font-bold text-slate-500">Clear</div>
                   </div>
                </div>

                <div className="bg-amber-900/20 p-4 rounded-2xl text-amber-200 text-sm border border-amber-900/30">
                   I need your help to reach 100% clarity. Please check the fields below.
                </div>
             </div>

             <ReviewScreen 
                items={reviewItems} 
                onConfirm={(items) => {
                  // Merge confirmed items back into analysis
                  if (analysis) {
                     const updatedMeds = analysis.medicines.map(m => {
                        const confirmed = items.find(i => i.id === m.id);
                        return confirmed || m;
                     });
                     const newAnalysis = { ...analysis, medicines: updatedMeds };
                     setAnalysis(newAnalysis);
                     saveToHistory(newAnalysis);
                     setState('results');
                  }
                }} 
             />
           </div>
        )}

        {/* RESULTS SCREEN */}
        {state === 'results' && analysis && (
          <div className={`space-y-8 animate-slide-up pb-20 ${isTranslating ? 'opacity-50 pointer-events-none' : ''}`}>
             
             {isTranslating && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
                    <div className="bg-slate-800 p-6 rounded-3xl shadow-2xl flex flex-col items-center animate-bounce border border-slate-700">
                        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-2" />
                        <span className="font-bold text-slate-200">Translating...</span>
                    </div>
                </div>
             )}

            {/* Achievement Banner */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4 rounded-2xl shadow-lg flex items-center justify-center space-x-3 mb-6 animate-bounce-subtle border border-emerald-500/30">
              <Award className="w-6 h-6 text-yellow-300" />
              <span className="font-bold text-lg">{UI_TEXT[language]?.banner || UI_TEXT['English'].banner}</span>
            </div>

            {/* Image Modal (Enhanced) */}
            {isImageModalOpen && image && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fade-in">
                    {/* Close Button */}
                    <button 
                        className="absolute top-6 right-6 text-white/70 hover:text-white z-50 p-2 bg-slate-800/50 rounded-full hover:bg-slate-700 transition-colors"
                        onClick={() => setIsImageModalOpen(false)}
                    >
                        <X className="w-8 h-8" />
                    </button>

                    {/* Toolbar */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-800/80 backdrop-blur-md px-6 py-3 rounded-full border border-slate-700 z-50">
                        <button onClick={() => setImgZoom(z => Math.max(1, z - 0.5))} className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-full"><ZoomOut className="w-5 h-5"/></button>
                        <span className="text-sm font-mono text-slate-300 w-12 text-center">{Math.round(imgZoom * 100)}%</span>
                        <button onClick={() => setImgZoom(z => Math.min(3, z + 0.5))} className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-full"><ZoomIn className="w-5 h-5"/></button>
                    </div>

                    {/* Image Container with Scroll for Zoom */}
                    <div className="w-full h-full overflow-auto flex items-center justify-center" onClick={() => setIsImageModalOpen(false)}>
                        <img 
                            src={image} 
                            alt="Full size prescription" 
                            className="transition-transform duration-200 ease-out max-w-none"
                            style={{ 
                                transform: `scale(${imgZoom})`, 
                                maxHeight: imgZoom === 1 ? '90vh' : 'none',
                                maxWidth: imgZoom === 1 ? '90vw' : 'none'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
            )}

            {/* Action Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between bg-slate-800/90 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-slate-700 gap-4">
               <div className="flex items-center space-x-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-100">{UI_TEXT[language]?.planTitle || UI_TEXT['English'].planTitle}</h2>
                    <p className="text-sm text-slate-400">{UI_TEXT[language]?.planSubtitle || UI_TEXT['English'].planSubtitle}</p>
                  </div>
               </div>
               <div className="flex space-x-3">
                <button 
                  onClick={isPlayingAudio ? stopTTS : handleTTS} 
                  disabled={audioLoading} 
                  className={`flex items-center space-x-2 px-5 py-3 rounded-xl transition-colors font-bold border ${
                    isPlayingAudio 
                      ? 'bg-red-900/30 text-red-300 border-red-500/20 hover:bg-red-900/50' 
                      : 'bg-indigo-900/30 text-indigo-300 border-indigo-500/20 hover:bg-indigo-900/50'
                  }`}
                >
                  {audioLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin"/> 
                  ) : isPlayingAudio ? (
                    <Square className="w-5 h-5 fill-current" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                  <span className="hidden sm:inline">
                    {audioLoading ? "Loading..." : isPlayingAudio ? "Stop" : (UI_TEXT[language]?.listen || UI_TEXT['English'].listen)}
                  </span>
                </button>
                <button onClick={() => setShowChat(!showChat)} className={`flex items-center space-x-2 px-5 py-3 rounded-xl transition-colors shadow-md hover:shadow-lg font-bold border ${showChat ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-700 text-indigo-300 border-slate-600 hover:bg-slate-600'}`}>
                  <MessageSquare className="w-5 h-5" />
                  <span>{UI_TEXT[language]?.assistant || UI_TEXT['English'].assistant}</span>
                </button>
              </div>
            </div>

             {/* INLINE CHATBOX */}
             {showChat && (
               <div className="bg-slate-800/95 backdrop-blur-md rounded-3xl border border-slate-700 shadow-xl overflow-hidden animate-fade-in-down">
                 <div className="bg-indigo-900/30 p-4 flex justify-between items-center border-b border-slate-700">
                    <span className="font-bold text-indigo-300">AI Health Assistant</span>
                    <button onClick={() => setShowChat(false)} className="text-indigo-400 hover:text-indigo-300"><X className="w-5 h-5"/></button>
                 </div>
                 <div className="h-64 overflow-y-auto p-4 space-y-4 bg-slate-900/50">
                    {chatMessages.map(msg => (
                      <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-slate-700 border border-slate-600 text-slate-200 rounded-tl-sm shadow-sm'}`}>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    {chatLoading && <div className="text-xs text-slate-500 ml-4 animate-pulse">Assistant is typing...</div>}
                    <div ref={chatEndRef} />
                 </div>
                 <div className="p-3 bg-slate-800 border-t border-slate-700 flex gap-2">
                    <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Ask a question..." className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-slate-200 placeholder-slate-500" />
                    <button onClick={handleSendMessage} className="bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-500"><Send className="w-4 h-4" /></button>
                 </div>
               </div>
             )}

            {/* POKEMON STYLE CARDS GRID */}
            <div className="grid gap-6 md:grid-cols-2">
              {analysis.medicines.map((med, idx) => (
                <div key={idx} className="bg-slate-800/90 backdrop-blur-sm rounded-3xl p-1 shadow-sm hover:shadow-[0_0_20px_rgba(236,72,153,0.6)] transition-all duration-300 hover:-translate-y-1 border border-slate-700 hover:border-pink-500 group relative overflow-hidden">
                   {/* Card Top Banner (Color based on confidence) */}
                   <div className={`h-2 rounded-t-3xl w-full ${med.confidence > 0.9 ? 'bg-green-500' : med.confidence > 0.7 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                   
                   <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="bg-indigo-900/30 p-3 rounded-2xl group-hover:bg-indigo-900/50 transition-colors">
                            <Pill className="w-6 h-6 text-indigo-400" />
                          </div>
                          <div>
                            <h3 className="text-xl font-extrabold text-slate-100">{med.name}</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{med.dosage}</p>
                          </div>
                        </div>
                        {/* Confidence Meter Badge */}
                        <div className="text-right">
                          <div className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold ${med.confidence > 0.9 ? 'bg-green-900/30 text-green-400' : 'bg-yellow-900/30 text-yellow-400'}`}>
                            {med.confidence > 0.9 ? <CheckCircle className="w-3 h-3 mr-1"/> : <AlertTriangle className="w-3 h-3 mr-1"/>}
                            {Math.round(med.confidence * 100)}% Match
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 mb-6">
                         <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-700/50">
                            <span className="text-sm text-slate-400 font-medium">Frequency</span>
                            <span className="text-sm font-bold text-slate-200">{med.frequency}</span>
                         </div>
                         <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-700/50">
                            <span className="text-sm text-slate-400 font-medium">Instruction</span>
                            <span className="text-sm font-bold text-slate-200 text-right">{med.instructions}</span>
                         </div>
                      </div>

                      {/* Smart Alerts Footer */}
                      <div className="flex gap-2">
                        {med.refillDuration && med.refillDuration < 5 && (
                           <div className="flex-1 bg-blue-900/30 text-blue-300 p-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border border-blue-500/20">
                             <Calendar className="w-3 h-3" /> Refill in {med.refillDuration} days
                           </div>
                        )}
                        {med.isSuspicious && (
                           <div className="flex-1 bg-red-900/30 text-red-300 p-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 animate-pulse border border-red-500/20">
                             <ShieldAlert className="w-3 h-3" /> Check Authenticity
                           </div>
                        )}
                        <div className="flex-1 bg-purple-900/30 text-purple-300 p-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border border-purple-500/20">
                             <Clock className="w-3 h-3" /> {med.timing || 'Mixed'}
                        </div>
                      </div>
                   </div>
                </div>
              ))}
            </div>

            {/* Warnings Section - Enhanced */}
            {analysis.safetyWarnings.length > 0 && (
              <div className="bg-amber-900/20 backdrop-blur-sm border border-amber-800/50 rounded-3xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-amber-600 rounded-full opacity-20 blur-2xl"></div>
                <div className="flex items-center space-x-3 mb-6 relative z-10">
                   <div className="bg-amber-900/40 p-2 rounded-xl"><ShieldAlert className="w-6 h-6 text-amber-500" /></div>
                   <h3 className="text-xl font-bold text-amber-200">Safety Check</h3>
                </div>
                <div className="space-y-3 relative z-10">
                   {analysis.safetyWarnings.map((w, i) => (
                     <div key={i} className={`p-4 rounded-2xl border flex items-start space-x-3 ${w.type === 'pregnancy' ? 'bg-pink-900/20 border-pink-800/40' : 'bg-slate-800 border-amber-800/30'}`}>
                        {w.type === 'pregnancy' ? <HeartPulse className="w-5 h-5 text-pink-400 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />}
                        <div>
                           <p className={`font-bold text-sm ${w.type === 'pregnancy' ? 'text-pink-200' : 'text-slate-200'}`}>{w.warning}</p>
                           <p className="text-xs text-slate-400 mt-1">{w.reasoning}</p>
                        </div>
                     </div>
                   ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* DOCTORS SCREEN */}
        {state === 'doctors' && (
           <div className="max-w-2xl mx-auto bg-slate-800/95 backdrop-blur-md rounded-3xl shadow-xl overflow-hidden animate-fade-in pb-10 border border-slate-700 min-h-[50vh]">
              <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
                <h2 className="text-2xl font-bold flex items-center gap-2"><MapPin className="w-6 h-6"/> Find Doctors</h2>
                <button onClick={() => setState('home')}><X className="w-6 h-6"/></button>
              </div>

              {/* Search Bar */}
              <div className="p-4 border-b border-slate-700 bg-slate-800">
                 <div className="relative">
                   <input 
                     value={doctorSearchTerm} 
                     onChange={(e) => setDoctorSearchTerm(e.target.value)} 
                     placeholder="Search specialized doctors nearby..." 
                     className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-200 placeholder-slate-500"
                     onKeyDown={(e) => e.key === 'Enter' && handleDoctorSearch(doctorSearchTerm)}
                   />
                   <Search className="w-5 h-5 text-slate-500 absolute left-3 top-3.5" />
                   <button onClick={() => handleDoctorSearch(doctorSearchTerm)} className="absolute right-2 top-2 bg-blue-600 text-white p-1.5 rounded-lg hover:bg-blue-500">
                     <ArrowRightIcon className="w-4 h-4" />
                   </button>
                 </div>
              </div>

              <div className="p-6">
                 {doctorLoading ? (
                   <div className="flex flex-col items-center justify-center py-12 space-y-4">
                      <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
                      <p className="text-slate-400">Searching nearby clinics...</p>
                   </div>
                 ) : (
                   <div className="space-y-4">
                      {doctorResults.chunks.length === 0 && !doctorResults.text && (
                        <div className="text-center py-8 opacity-50">
                           <MapPin className="w-12 h-12 mx-auto mb-2 text-slate-500" />
                           <p className="text-slate-400">Search for "Cardiologist" or "Dentist"</p>
                        </div>
                      )}
                      
                      {doctorResults.text && (
                         <div className="p-5 bg-slate-900/50 rounded-2xl border border-slate-700/50 text-slate-300 text-sm mb-4 leading-relaxed">
                            {doctorResults.text.split('\n').map((line: string, i: number) => {
                                if (!line.trim()) return <br key={i} />;
                                const isList = line.trim().startsWith('* ') || line.trim().startsWith('- ');
                                const cleanLine = isList ? line.trim().substring(2) : line;
                                return (
                                  <div key={i} className={`${isList ? 'flex gap-3 pl-2 mb-2' : 'mb-3'}`}>
                                     {isList && <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
                                     <p>
                                        {cleanLine.split(/(\*\*.*?\*\*)/).map((part, j) => 
                                          part.startsWith('**') && part.endsWith('**') 
                                            ? <span key={j} className="text-white font-bold">{part.slice(2, -2)}</span> 
                                            : part
                                        )}
                                     </p>
                                  </div>
                                );
                            })}
                         </div>
                      )}

                      {doctorResults.chunks.map((chunk: any, i: number) => {
                         // Only render map chunks
                         if (!chunk.web?.uri && !chunk.web?.title) return null;
                         return (
                            <div key={i} className="flex flex-col p-4 bg-slate-900/50 rounded-2xl border border-slate-700/50 hover:bg-slate-800 hover:border-blue-500/30 transition-all group">
                               <div className="flex justify-between items-start">
                                  <h3 className="font-bold text-lg text-slate-200">{chunk.web.title}</h3>
                                  <a href={chunk.web.uri} target="_blank" rel="noreferrer" className="bg-blue-600/20 text-blue-400 p-2 rounded-lg hover:bg-blue-600 hover:text-white transition-colors">
                                     <Navigation className="w-4 h-4" />
                                  </a>
                               </div>
                               <div className="mt-2 text-sm text-slate-400">
                                  {/* Sometimes grounding chunks have simplified data, usually title and URI are most reliable for 'web' chunks returned by Maps tool */}
                                  <a href={chunk.web.uri} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1">
                                    View on Maps <ArrowRightIcon className="w-3 h-3" />
                                  </a>
                               </div>
                            </div>
                         )
                      })}
                   </div>
                 )}
              </div>
           </div>
        )}

        {/* OTHER SCREENS (Reminders) - Keeping minimal updates for brevity, consistent styling */}
        {state === 'reminders' && (
           <div className="max-w-2xl mx-auto bg-slate-800/95 backdrop-blur-md rounded-3xl shadow-xl overflow-hidden animate-fade-in pb-10 border border-slate-700">
              <div className="bg-purple-700 p-6 text-white flex justify-between items-center">
                <h2 className="text-2xl font-bold flex items-center gap-2"><Bell className="w-6 h-6"/> Reminders</h2>
                <button onClick={() => setState('home')}><X className="w-6 h-6"/></button>
              </div>

              {/* Privacy Note */}
              <div className="bg-purple-900/40 px-6 py-3 flex items-center space-x-3 border-b border-purple-600/30">
                  <Globe className="w-4 h-4 text-purple-300 flex-shrink-0" />
                  <p className="text-xs text-purple-200 font-medium leading-relaxed">
                    <span className="text-white font-bold">Public Access</span>: Data is stored temporarily on this device.
                  </p>
              </div>

              <div className="p-6">
                <div className="flex gap-2 mb-6">
                   <input value={newReminderText} onChange={e => setNewReminderText(e.target.value)} placeholder="Medicine name" className="flex-1 p-3 bg-slate-900 rounded-xl border border-slate-700 focus:ring-2 focus:ring-purple-500 text-slate-200 placeholder-slate-500"/>
                   <input type="time" value={newReminderTime} onChange={e => setNewReminderTime(e.target.value)} className="p-3 bg-slate-900 rounded-xl border border-slate-700 focus:ring-2 focus:ring-purple-500 text-slate-200 [color-scheme:dark]"/>
                   <button onClick={() => { 
                      if(newReminderText && newReminderTime) { 
                        const updatedReminders = [...reminders, {id: Date.now().toString(), text: newReminderText, time: newReminderTime, completed: false}];
                        setReminders(updatedReminders); 
                        localStorage.setItem(REMINDERS_KEY, JSON.stringify(updatedReminders)); // Added persistence
                        setNewReminderText(''); 
                      }
                   }} className="bg-purple-600 text-white px-4 rounded-xl font-bold hover:bg-purple-500">Add</button>
                </div>
                <div className="space-y-3">
                   {reminders.length === 0 && (
                      <div className="text-center py-8 opacity-50">
                        <Bell className="w-12 h-12 mx-auto mb-2 text-slate-500" />
                        <p className="text-slate-400">No reminders set</p>
                      </div>
                   )}
                   {reminders.map(r => {
                     // Time Calculation for Status
                     const now = new Date();
                     const currentMins = now.getHours() * 60 + now.getMinutes();
                     const [h, m] = r.time.split(':').map(Number);
                     const reminderMins = h * 60 + m;
                     
                     // Status Flags
                     const isOverdue = !r.completed && currentMins > reminderMins;
                     const isSoon = !r.completed && !isOverdue && (reminderMins - currentMins <= 60);

                     return (
                     <div key={r.id} className={`flex justify-between items-center p-4 rounded-2xl border transition-all duration-300 ${
                        r.completed ? 'bg-slate-900/30 border-slate-800' :
                        isOverdue ? 'bg-red-900/10 border-red-500/30' :
                        isSoon ? 'bg-yellow-900/10 border-yellow-500/30' :
                        'bg-slate-900/50 border-slate-700/50'
                     }`}>
                        <div className="flex items-center gap-4">
                           <button onClick={() => {
                              const updatedReminders = reminders.map(x => x.id === r.id ? {...x, completed: !x.completed} : x);
                              setReminders(updatedReminders);
                              localStorage.setItem(REMINDERS_KEY, JSON.stringify(updatedReminders));
                           }} className="focus:outline-none group">
                              {r.completed ? (
                                 <Apple className="w-8 h-8 text-green-500 fill-green-500 drop-shadow-md animate-bounce-subtle" />
                              ) : (
                                 <div className={`w-6 h-6 rounded-full border-2 ${isOverdue ? 'border-red-400' : isSoon ? 'border-yellow-400' : 'border-slate-500'} group-hover:border-purple-400 transition-colors bg-transparent`}></div>
                              )}
                           </button>
                           <div>
                               <span className={`block font-bold text-lg transition-all ${r.completed ? 'line-through text-slate-600' : 'text-slate-200'}`}>{r.text}</span>
                               {isOverdue && <div className="flex items-center gap-1 text-[10px] font-bold text-red-400 uppercase tracking-widest mt-0.5"><AlertTriangle className="w-3 h-3"/> Overdue</div>}
                               {isSoon && <div className="flex items-center gap-1 text-[10px] font-bold text-yellow-400 uppercase tracking-widest mt-0.5"><Clock className="w-3 h-3"/> Upcoming</div>}
                           </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={`text-sm font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
                                r.completed ? 'text-slate-500 border-slate-700 bg-slate-800' :
                                isOverdue ? 'text-red-300 border-red-500/30 bg-red-900/20 animate-pulse' :
                                isSoon ? 'text-yellow-300 border-yellow-500/30 bg-yellow-900/20' :
                                'text-purple-300 border-purple-500/30 bg-purple-900/20'
                            }`}>
                                <Clock className="w-3.5 h-3.5" />
                                {r.time}
                            </span>
                            <button onClick={() => {
                                const updatedReminders = reminders.filter(x => x.id !== r.id);
                                setReminders(updatedReminders);
                                localStorage.setItem(REMINDERS_KEY, JSON.stringify(updatedReminders));
                            }} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded-xl transition-colors">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                     </div>
                   );
                   })}
                </div>
              </div>
           </div>
        )}

      </main>
      
      {/* History Overlay - Kept logic, updated visuals */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex justify-end">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowHistory(false)}></div>
           <div className="relative w-full max-w-sm bg-slate-900/95 backdrop-blur-md h-full shadow-2xl p-6 flex flex-col animate-fade-in-right border-l border-slate-700">
              <div className="flex justify-between items-center mb-2">
                 <h2 className="text-2xl font-bold text-slate-100">History</h2>
                 <button onClick={() => setShowHistory(false)}><X className="w-6 h-6 text-slate-400"/></button>
              </div>

              {/* Privacy Note */}
              <div className="mb-6 flex items-center space-x-2 bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Public Mode. History accessible on this device.
                  </p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                 {savedPrescriptions.length === 0 && (
                    <div className="text-center text-slate-500 mt-10">
                        <History className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p>No history yet</p>
                    </div>
                 )}
                 {savedPrescriptions.map(item => (
                    <div key={item.id} className="group relative p-4 bg-slate-800 rounded-2xl hover:bg-slate-750 border border-slate-700 hover:border-indigo-500/30 transition-all cursor-pointer">
                       {editingId === item.id ? (
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <input 
                                  value={editingName}
                                  onChange={(e) => setEditingName(e.target.value)}
                                  onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveName(item.id);
                                  }}
                                  autoFocus
                                  className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                              />
                              <button 
                                  onClick={() => handleSaveName(item.id)}
                                  className="p-1.5 bg-indigo-600 rounded-lg text-white hover:bg-indigo-500"
                              >
                                  <Check className="w-4 h-4" />
                              </button>
                          </div>
                       ) : (
                          <div onClick={() => { setAnalysis(item.analysis); setState('results'); setShowHistory(false); }}>
                              <h4 className="font-bold text-slate-200 pr-16 truncate">{item.name}</h4>
                              <p className="text-xs text-slate-400 mt-1">{item.date} • {item.analysis.medicines.length} meds</p>
                          </div>
                       )}

                       {/* Action Buttons (Edit & Delete) */}
                       {editingId !== item.id && (
                          <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                              <button 
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingId(item.id);
                                      setEditingName(item.name);
                                  }}
                                  className="text-slate-500 hover:text-indigo-400 hover:bg-indigo-900/20 p-1.5 rounded-lg transition-all"
                                  title="Rename"
                              >
                                  <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      const updated = savedPrescriptions.filter(p => p.id !== item.id);
                                      setSavedPrescriptions(updated);
                                      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
                                  }}
                                  className="text-slate-500 hover:text-red-400 hover:bg-red-900/20 p-1.5 rounded-lg transition-all"
                                  title="Delete from history"
                              >
                                  <Trash2 className="w-4 h-4" />
                              </button>
                          </div>
                       )}
                    </div>
                 ))}
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

const ArrowRightIcon = ({className}:{className?:string}) => (
   <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
   </svg>
);

// Sub-component for reviewing unclear items (ReviewScreen) remains structurally similar but styled if needed.
function ReviewScreen({ items, onConfirm }: { items: Medicine[], onConfirm: (items: Medicine[]) => void }) {
  const [editedItems, setEditedItems] = useState<Medicine[]>(items);
  // ... (simplified logic for brevity, visual styling handled by Tailwind classes in main return)
  return (
    <div className="space-y-6">
       {editedItems.map((item, i) => (
         <div key={item.id} className="bg-slate-800/90 backdrop-blur-sm p-6 rounded-3xl shadow-sm border border-slate-700">
            <div className="flex justify-between mb-4">
               <span className="font-bold text-slate-500 uppercase text-xs">Medicine {i+1}</span>
               <span className="text-xs bg-red-900/30 text-red-400 px-2 py-1 rounded-lg font-bold">{(item.confidence * 100).toFixed(0)}% Conf.</span>
            </div>
            <input value={item.name} onChange={e => { const n = [...editedItems]; n[i].name = e.target.value; setEditedItems(n); }} className="w-full mb-3 p-3 bg-slate-900 rounded-xl border-none font-bold text-slate-200 focus:ring-2 focus:ring-indigo-500 placeholder-slate-500" />
            <input value={item.dosage} onChange={e => { const n = [...editedItems]; n[i].dosage = e.target.value; setEditedItems(n); }} className="w-full p-3 bg-slate-900 rounded-xl border-none text-slate-400 focus:ring-2 focus:ring-indigo-500" />
         </div>
       ))}
       <button onClick={() => onConfirm(editedItems)} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center space-x-2">
         <CheckCircle className="w-5 h-5" />
         <span>Confirm and Decode</span>
       </button>
    </div>
  );
}
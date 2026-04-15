export interface Medicine {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  purpose: string;
  instructions: string;
  confidence: number;
  refillDuration?: number; // Estimated days until refill needed
  isSuspicious?: boolean; // Potential counterfeit flag
  timing?: 'Morning' | 'Afternoon' | 'Night' | 'As Needed' | 'Mixed'; // For smart sorting
}

export interface DetailedWarning {
  warning: string;
  type: 'general' | 'interaction' | 'pediatric' | 'geriatric' | 'pregnancy';
  reasoning: string;
}

export interface PrescriptionAnalysis {
  medicines: Medicine[];
  interactions: string[];
  safetyWarnings: DetailedWarning[];
  notes: string;
}

export interface SavedPrescription {
  id: string;
  name: string;
  date: string;
  timestamp: number;
  analysis: PrescriptionAnalysis;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface Reminder {
  id: string;
  text: string;
  time: string;
  completed: boolean;
}

export type Language = 'English' | 'Hindi' | 'Tamil' | 'Bengali';

export type AppState = 'home' | 'upload' | 'analyzing' | 'review' | 'results' | 'reminders' | 'doctors';

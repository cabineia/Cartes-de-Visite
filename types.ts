
export enum AppStep {
  SCAN = 'SCAN',
  QR_SCAN = 'QR_SCAN',
  PROCESSING = 'PROCESSING',
  VALIDATE = 'VALIDATE',
  ACTIONS = 'ACTIONS',
  HISTORY = 'HISTORY',
}

export enum SocialPlatform {
  LINKEDIN = 'LINKEDIN',
  TWITTER = 'TWITTER',
  FACEBOOK = 'FACEBOOK',
  INSTAGRAM = 'INSTAGRAM',
}

export interface ContactData {
  id: string;
  timestamp: number;
  scanImage?: string; // Base64
  profileImage?: string; // Base64 (user uploaded or cropped)
  fullName: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  socials: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
  };
  notes?: string;
}

export type TemplateCategory = string;

export interface EmailTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
}

export interface UserSignature {
  id: string;
  name: string;
  content: string; // HTML
  isDefault: boolean;
  data?: {
    name: string;
    title: string;
    company: string;
    logo: string;
  };
}

export interface AppState {
  step: AppStep;
  currentContact: ContactData | null;
  history: ContactData[];
  signatures: UserSignature[];
  categories: string[]; // Unified list containing both default and custom categories
  templates: EmailTemplate[]; // Unified list containing ALL templates (default + custom) to allow deletion
  isDarkMode: boolean;
  processingStatus: string; // For showing loading messages
}

export type AppAction =
  | { type: 'SET_STEP'; payload: AppStep }
  | { type: 'SET_PROCESSING_STATUS'; payload: string }
  | { type: 'SET_CURRENT_CONTACT'; payload: ContactData }
  | { type: 'UPDATE_CONTACT_FIELD'; payload: { field: keyof ContactData; value: any } }
  | { type: 'UPDATE_SOCIAL'; payload: { platform: keyof ContactData['socials']; value: string } }
  | { type: 'SAVE_CONTACT'; payload: ContactData }
  | { type: 'DELETE_CONTACT'; payload: string } // ID
  | { type: 'LOAD_CONTACT'; payload: ContactData }
  | { type: 'ADD_SIGNATURE'; payload: UserSignature }
  | { type: 'UPDATE_SIGNATURE'; payload: UserSignature }
  | { type: 'DELETE_SIGNATURE'; payload: string }
  | { type: 'ADD_CATEGORY'; payload: string }
  | { type: 'DELETE_CATEGORY'; payload: string }
  | { type: 'ADD_TEMPLATE'; payload: EmailTemplate }
  | { type: 'DELETE_TEMPLATE'; payload: string } // ID
  | { type: 'TOGGLE_THEME' };

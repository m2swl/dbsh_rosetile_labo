
export enum Mood {
  Joyful = "Joyful",
  Calm = "Calm",
  Energetic = "Energetic",
  Reflective = "Reflective",
  Neutral = "Neutral",
  Sad = "Sad",
  Anxious = "Anxious",
}

export interface SensorDataPoint {
  timestamp: number;
  gyro?: { x: number | null; y: number | null; z: number | null };
  accel?: { x: number | null; y: number | null; z: number | null }; // Accelerometer data
  mic?: number; // Decibels
}

export interface DiaryRecord {
  id: string;
  date: string; // ISO string
  title: string;
  text: string;
  photo?: string; // base64 encoded image
  mood: Mood;
  moodColor: string; // Hex color associated with mood
  sensorData: SensorDataPoint[];
}

export interface OrigamiPattern {
  lines: Array<{ x1: number; y1: number; x2: number; y2: number; type: 'mountain' | 'valley' | 'cut' }>;
  instructions?: string;
  svgContent?: string; // Gemini might return a full SVG
}

export interface SpatialExperienceConcept {
  title: string;
  description: string;
  colors: string[];
  ambiance: string;
}

export interface NewFeelEntry {
  id: string;
  date: string; // ISO string
  text: string;
  relatedRecordId?: string; // Optional: link to a DiaryRecord
}

export enum NavigationPath {
  Album = "/album",
  Experience = "/experience",
  NewFeel = "/newfeel",
  SpatialViewer = "/spatial-viewer" // Note: IDs will be appended as /:id
}

// For useSensors hook
export interface MotionData {
  gyroscope: { x: number | null; y: number | null; z: number | null };
  accelerometer: { x: number | null; y: number | null; z: number | null };
}

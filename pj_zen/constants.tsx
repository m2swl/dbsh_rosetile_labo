
import React from 'react';
import { Mood, NavigationPath } from './types';

export const APP_NAME = "ZEN Diary";
export const GEMINI_TEXT_MODEL = "gemini-2.5-flash-preview-04-17";
// No image generation model needed for this app as per current requirements.

export const MOOD_CONFIG: Record<Mood, { color: string; emoji: string }> = {
  [Mood.Joyful]: { color: "#FFD700", emoji: "😄" }, // Gold
  [Mood.Calm]: { color: "#AEC6CF", emoji: "😌" },   // Pastel Blue
  [Mood.Energetic]: { color: "#FF69B4", emoji: "⚡️" },// Hot Pink
  [Mood.Reflective]: { color: "#B2BABB", emoji: "🤔" },// Light Gray
  [Mood.Neutral]: { color: "#E0E0E0", emoji: "😐" }, // Lighter Gray
  [Mood.Sad]: { color: "#778899", emoji: "😢" },     // Light Slate Gray
  [Mood.Anxious]: { color: "#FFB347", emoji: "😟" },  // Pastel Orange
};

export const NAVIGATION_ITEMS = [
  { path: NavigationPath.Album, label: "Album", icon: (className: string) => <AlbumIcon className={className} /> },
  { path: NavigationPath.Experience, label: "Experience", icon: (className: string) => <ExperienceIcon className={className} /> },
  { path: NavigationPath.NewFeel, label: "New Feel", icon: (className: string) => <NewFeelIcon className={className} /> },
];

// SVG Icons (Material Design Inspired - simplified)
// Using common SVG paths that are simple and clear

const AlbumIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 10l-2.5-1.5L15 12V4h5v8z"/>
  </svg>
);

const ExperienceIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4c-1.48 0-2.85.43-4.01 1.17l1.46 1.46C10.21 6.23 11.08 6 12 6c3.03 0 5.5 2.47 5.5 5.5 0 .27-.02.53-.06.79l1.69 1.69c.23-.61.37-1.26.37-1.94zM4.73 5.59L3.32 7.01C2.56 8.47 2 10.17 2 12c0 3.03 1.19 5.78 3.13 7.86l1.43-1.43C5.02 16.96 4 14.64 4 12c0-1.03.24-2 .66-2.87L4.73 5.59zm14.54 0l-1.41 1.41c.43.87.67 1.84.67 2.87 0 2.64-1.02 4.96-2.57 6.71l1.43 1.43C20.81 17.78 22 15.03 22 12c0-1.83-.56-3.53-1.48-4.99l-.25-.42z"/>
  </svg>
);


const NewFeelIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v2h-2V7zm0 4h2v6h-2v-6z"/>
  </svg>
);

export const DEFAULT_ERROR_MESSAGE = "An unexpected error occurred. Please try again.";
export const GEMINI_API_KEY_ERROR = "Gemini API key is not configured. Please set the API_KEY environment variable.";
export const MAX_FILE_SIZE_MB = 5;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const CloseIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

export const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12.56 0c1.153 0 2.243.096 3.288.257m-11.056 0c.646.753 1.528 1.445 2.57 1.977m0 0A48.482 48.482 0 0112 10.5c2.258 0 4.403-.507 6.348-1.418m-12.696 0A48.566 48.566 0 0112 10.5c2.258 0 4.403-.507 6.348-1.418" />
  </svg>
);

export const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

export const PrintIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0A42.323 42.323 0 0112 18.75c-2.178 0-4.207-.5-5.923-1.41M12 14.25L12 18.75m0 0H8.25m3.75 0H15.75M12 21v-2.25M18.75 5.25A2.25 2.25 0 0016.5 3H7.5A2.25 2.25 0 005.25 5.25v4.5A2.25 2.25 0 007.5 12h9a2.25 2.25 0 002.25-2.25v-4.5z" />
  </svg>
);

export const EditIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
);

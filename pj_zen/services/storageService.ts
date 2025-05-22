
import { DiaryRecord, NewFeelEntry } from '../types';

const DIARY_RECORDS_KEY = 'zenDiaryRecords';
const NEW_FEEL_ENTRIES_KEY = 'zenNewFeelEntries';

// Diary Records
export const saveRecords = (records: DiaryRecord[]): void => {
  try {
    localStorage.setItem(DIARY_RECORDS_KEY, JSON.stringify(records));
  } catch (error) {
    console.error("Error saving diary records to localStorage:", error);
    // Handle potential storage full errors, etc.
  }
};

export const getRecords = (): DiaryRecord[] => {
  try {
    const recordsJson = localStorage.getItem(DIARY_RECORDS_KEY);
    return recordsJson ? JSON.parse(recordsJson) : [];
  } catch (error) {
    console.error("Error retrieving diary records from localStorage:", error);
    return [];
  }
};

// New Feel Entries
export const saveNewFeels = (entries: NewFeelEntry[]): void => {
  try {
    localStorage.setItem(NEW_FEEL_ENTRIES_KEY, JSON.stringify(entries));
  } catch (error) {
    console.error("Error saving new feel entries to localStorage:", error);
  }
};

export const getNewFeels = (): NewFeelEntry[] => {
  try {
    const entriesJson = localStorage.getItem(NEW_FEEL_ENTRIES_KEY);
    return entriesJson ? JSON.parse(entriesJson) : [];
  } catch (error) {
    console.error("Error retrieving new feel entries from localStorage:", error);
    return [];
  }
};


import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DiaryRecord, NewFeelEntry, NavigationPath } from './types';
import { MOOD_CONFIG } from './constants';
import BottomNavigation from './components/BottomNavigation';
import AlbumPage from './pages/AlbumPage';
import ExperiencePage from './pages/ExperiencePage';
import NewFeelPage from './pages/NewFeelPage';
import SpatialExperienceViewerPage from './pages/SpatialExperienceViewerPage';
import { getRecords, saveRecords, getNewFeels, saveNewFeels } from './services/storageService';

const App: React.FC = () => {
  const [diaryRecords, setDiaryRecords] = useState<DiaryRecord[]>([]);
  const [newFeelEntries, setNewFeelEntries] = useState<NewFeelEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadedRecords = getRecords();
    setDiaryRecords(loadedRecords);
    const loadedNewFeels = getNewFeels();
    setNewFeelEntries(loadedNewFeels);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      saveRecords(diaryRecords);
    }
  }, [diaryRecords, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      saveNewFeels(newFeelEntries);
    }
  }, [newFeelEntries, isLoading]);

  const addDiaryRecord = (record: Omit<DiaryRecord, 'id' | 'date' | 'moodColor'>) => {
    const newRecord: DiaryRecord = {
      ...record,
      id: Date.now().toString(),
      date: new Date().toISOString(),
      moodColor: MOOD_CONFIG[record.mood].color,
    };
    setDiaryRecords(prevRecords => [newRecord, ...prevRecords]);
  };

  const updateDiaryRecord = (updatedRecord: DiaryRecord) => {
    setDiaryRecords(prevRecords => 
      prevRecords.map(r => r.id === updatedRecord.id ? {...updatedRecord, moodColor: MOOD_CONFIG[updatedRecord.mood].color} : r)
    );
  };

  const deleteDiaryRecord = (recordId: string) => {
    setDiaryRecords(prevRecords => prevRecords.filter(r => r.id !== recordId));
    // Also delete related new feel entries
    setNewFeelEntries(prevEntries => prevEntries.filter(nf => nf.relatedRecordId !== recordId));
  };

  const addNewFeelEntry = (entry: Omit<NewFeelEntry, 'id' | 'date'>) => {
    const newEntry: NewFeelEntry = {
      ...entry,
      id: Date.now().toString(),
      date: new Date().toISOString(),
    };
    setNewFeelEntries(prevEntries => [newEntry, ...prevEntries]);
  };

  const deleteNewFeelEntry = (entryId: string) => {
    setNewFeelEntries(prevEntries => prevEntries.filter(entry => entry.id !== entryId));
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100">
        <div className="text-2xl text-slate-600">Loading Zen Diary...</div>
      </div>
    );
  }

  return (
    <HashRouter>
      <div className="flex flex-col h-screen bg-slate-100 font-sans">
        <main className="flex-grow overflow-y-auto pb-20"> {/* Padding bottom to avoid overlap with nav */}
          <Routes>
            <Route path="/" element={<Navigate to={NavigationPath.Album} replace />} />
            <Route 
              path={NavigationPath.Album} 
              element={
                <AlbumPage 
                  records={diaryRecords} 
                  onAddRecord={addDiaryRecord} 
                  onUpdateRecord={updateDiaryRecord}
                  onDeleteRecord={deleteDiaryRecord}
                />
              } 
            />
            <Route 
              path={NavigationPath.Experience} 
              element={<ExperiencePage records={diaryRecords} />} 
            />
            <Route 
              path={`${NavigationPath.SpatialViewer}/:recordId`} 
              element={<SpatialExperienceViewerPage records={diaryRecords} />} 
            />
            <Route 
              path={NavigationPath.NewFeel} 
              element={
                <NewFeelPage 
                  entries={newFeelEntries} 
                  onAddEntry={addNewFeelEntry} 
                  records={diaryRecords}
                  onDeleteEntry={deleteNewFeelEntry}
                />
              } 
            />
          </Routes>
        </main>
        <BottomNavigation />
      </div>
    </HashRouter>
  );
};

export default App;


import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { DiaryRecord, SpatialExperienceConcept } from '../types';
import { generateSpatialExperienceConcept } from '../services/geminiService'; // Re-generate if needed or fetch pre-generated
import Card from '../components/common/Card';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { MOOD_CONFIG } from '../constants';

interface SpatialExperienceViewerPageProps {
  records: DiaryRecord[];
}

const SpatialExperienceViewerPage: React.FC<SpatialExperienceViewerPageProps> = ({ records }) => {
  const { recordId } = useParams<{ recordId: string }>();
  const [record, setRecord] = useState<DiaryRecord | null>(null);
  const [concept, setConcept] = useState<SpatialExperienceConcept | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (recordId) {
      const foundRecord = records.find(r => r.id === recordId);
      if (foundRecord) {
        setRecord(foundRecord);
        // Fetch or generate concept
        const fetchConcept = async () => {
          setIsLoading(true);
          setError(null);
          try {
            // For simplicity, we regenerate. In a real app, you might store this.
            const fetchedConcept = await generateSpatialExperienceConcept(foundRecord);
            setConcept(fetchedConcept);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load spatial concept.");
            console.error(err);
          } finally {
            setIsLoading(false);
          }
        };
        fetchConcept();
      } else {
        setError("Diary record not found.");
        setIsLoading(false);
      }
    } else {
        setError("No record ID provided.");
        setIsLoading(false);
    }
  }, [recordId, records]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><LoadingSpinner text="Loading Experience..." size="lg"/></div>;
  }

  if (error) {
    return <div className="p-6 text-center"><Card className="bg-red-100 border-red-500 text-red-700 p-4">{error}</Card></div>;
  }

  if (!record || !concept) {
    return <div className="p-6 text-center"><Card><p className="text-slate-500">Could not load experience details.</p></Card></div>;
  }
  
  const moodEmoji = MOOD_CONFIG[record.mood].emoji;
  const moodColor = MOOD_CONFIG[record.mood].color;


  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-black text-white">
      <Card className="bg-white bg-opacity-5 shadow-2xl backdrop-blur-lg border border-white border-opacity-10">
        <header className="mb-6 text-center">
          <h1 className="text-4xl font-bold mb-2" style={{color: moodColor}}>{moodEmoji} {concept.title}</h1>
          <p className="text-lg text-slate-300">An immersive concept based on the diary entry: "{record.title}"</p>
          <p className="text-sm text-slate-400">Recorded on: {new Date(record.date).toLocaleDateString()} | Mood: {record.mood}</p>
        </header>

        {record.photo && (
          <div className="mb-6 flex justify-center">
            <img src={record.photo} alt={record.title} className="rounded-xl max-h-80 w-auto object-contain shadow-lg border-2 border-opacity-20" style={{borderColor: moodColor}} />
          </div>
        )}
        
        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-2" style={{color: moodColor}}>Core Feeling & Theme</h2>
          <p className="text-slate-200 text-lg leading-relaxed">{concept.description}</p>
        </section>

        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-3" style={{color: moodColor}}>Sensory Palette</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
                <h3 className="text-xl font-medium text-slate-300 mb-2">Colors</h3>
                <div className="flex space-x-3">
                {concept.colors.map((color, index) => (
                    <div key={index} className="w-16 h-16 rounded-full shadow-md border-2 border-white border-opacity-30" style={{ backgroundColor: color }} title={color}></div>
                ))}
                </div>
            </div>
            <div>
                <h3 className="text-xl font-medium text-slate-300 mb-2">Ambiance</h3>
                <p className="text-slate-200 leading-relaxed">{concept.ambiance}</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2" style={{color: moodColor}}>Original Diary Entry</h2>
          <div className="bg-slate-700 bg-opacity-30 p-4 rounded-lg max-h-60 overflow-y-auto">
            <p className="text-slate-300 whitespace-pre-wrap">{record.text}</p>
          </div>
        </section>
         <footer className="mt-8 text-center text-xs text-slate-500">
            This spatial concept was generated by ZEN Diary AI.
        </footer>
      </Card>
    </div>
  );
};

export default SpatialExperienceViewerPage;

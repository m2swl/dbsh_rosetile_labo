
import React, { useState } from 'react';
import { NewFeelEntry, DiaryRecord } from '../types';
import { MOOD_CONFIG, PlusIcon, TrashIcon } from '../constants';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Modal from '../components/common/Modal';

interface NewFeelPageProps {
  entries: NewFeelEntry[];
  onAddEntry: (entry: Omit<NewFeelEntry, 'id' | 'date'>) => void;
  onDeleteEntry: (entryId: string) => void;
  records: DiaryRecord[]; // To link reflections to specific diary entries
}

const NewFeelPage: React.FC<NewFeelPageProps> = ({ entries, onAddEntry, onDeleteEntry, records }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [text, setText] = useState('');
  const [relatedRecordId, setRelatedRecordId] = useState<string | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);

  const handleOpenModal = () => {
    setText('');
    setRelatedRecordId(undefined);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveEntry = () => {
    if (!text.trim()) {
      setFormError("Your reflection cannot be empty.");
      return;
    }
    setFormError(null);
    onAddEntry({ text, relatedRecordId });
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this reflection?")) {
        onDeleteEntry(id);
    }
  };

  const getRecordTitleById = (id?: string): string => {
    if (!id) return "General Reflection";
    const record = records.find(r => r.id === id);
    return record ? `Reflection on: "${record.title}"` : "Reflection on an old entry";
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-700">New Feelings & Insights</h1>
        <Button onClick={handleOpenModal} color="primary" leftIcon={<PlusIcon className="w-5 h-5"/>}>
          Add Reflection
        </Button>
      </div>

      {entries.length === 0 ? (
        <Card className="text-center">
          <p className="text-slate-500 text-lg">No reflections recorded yet.</p>
          <p className="text-slate-400 mt-2">After an 'Experience', come here to jot down your new thoughts and feelings.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {entries.map((entry) => (
            <Card key={entry.id} className="group relative">
              <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-lg font-semibold text-indigo-600">{getRecordTitleById(entry.relatedRecordId)}</h2>
                    <p className="text-sm text-slate-500 mb-2">
                    {new Date(entry.date).toLocaleDateString()}
                    </p>
                </div>
                <Button onClick={() => handleDelete(entry.id)} size="sm" variant="text" color="danger" title="Delete" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <TrashIcon className="w-5 h-5 text-slate-500 hover:text-red-600"/>
                </Button>
              </div>
              <p className="text-slate-700 whitespace-pre-wrap">{entry.text}</p>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Record New Feeling/Insight">
        <div className="space-y-4">
          {formError && <p className="text-red-500 text-sm bg-red-100 p-2 rounded">{formError}</p>}
          <div>
            <label htmlFor="reflectionText" className="block text-sm font-medium text-slate-700 mb-1">Your Reflection:</label>
            <textarea
              id="reflectionText"
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="What new insights or feelings have emerged?"
            />
          </div>
          {records.length > 0 && (
            <div>
              <label htmlFor="relatedRecord" className="block text-sm font-medium text-slate-700 mb-1">Link to Diary Entry (Optional):</label>
              <select
                id="relatedRecord"
                value={relatedRecordId || ""}
                onChange={(e) => setRelatedRecordId(e.target.value || undefined)}
                className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">None (General Reflection)</option>
                {records.map(record => (
                  <option key={record.id} value={record.id}>{MOOD_CONFIG[record.mood].emoji} {record.title} ({new Date(record.date).toLocaleDateString()})</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button onClick={() => setIsModalOpen(false)} variant="outlined" color="secondary">
              Cancel
            </Button>
            <Button onClick={handleSaveEntry} color="primary">
              Save Reflection
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default NewFeelPage;


import React, { useState, useCallback, ChangeEvent } from 'react';
import { DiaryRecord, Mood, SensorDataPoint } from '../types';
import { MOOD_CONFIG, PlusIcon, DownloadIcon, TrashIcon, EditIcon } from '../constants';
import useSensors from '../hooks/useSensors';
import { fileToBase64 } from '../utils/imageUtils';
import { exportSensorDataToCSV } from '../utils/csvExporter';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';

interface AlbumPageProps {
  records: DiaryRecord[];
  onAddRecord: (record: Omit<DiaryRecord, 'id' | 'date' | 'moodColor'>) => void;
  onUpdateRecord: (record: DiaryRecord) => void;
  onDeleteRecord: (recordId: string) => void;
}

const AlbumPage: React.FC<AlbumPageProps> = ({ records, onAddRecord, onUpdateRecord, onDeleteRecord }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DiaryRecord | null>(null);
  
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [mood, setMood] = useState<Mood>(Mood.Neutral);
  const [localSensorData, setLocalSensorData] = useState<SensorDataPoint[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    sensorDataLog,
    liveMotionData,
    liveMicLevel,
    isRecording,
    permissionGranted,
    error: sensorError,
    startRecording,
    stopRecording,
    requestPermissions,
  } = useSensors();

  const openNewRecordModal = () => {
    setEditingRecord(null);
    setTitle('');
    setText('');
    setPhoto(undefined);
    setPhotoPreview(undefined);
    setMood(Mood.Neutral);
    setLocalSensorData([]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditRecordModal = (record: DiaryRecord) => {
    setEditingRecord(record);
    setTitle(record.title);
    setText(record.text);
    setPhoto(record.photo);
    setPhotoPreview(record.photo);
    setMood(record.mood);
    setLocalSensorData(record.sensorData); // Keep existing sensor data
    setFormError(null);
    setIsModalOpen(true);
  };


  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      try {
        const base64 = await fileToBase64(file);
        setPhoto(base64);
        setPhotoPreview(base64);
        setFormError(null);
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'Failed to load image.');
        setPhoto(undefined);
        setPhotoPreview(undefined);
      }
    }
  };

  const handleSaveRecord = () => {
    if (!title.trim() || !text.trim()) {
      setFormError("Title and diary text cannot be empty.");
      return;
    }
    setFormError(null);

    const recordData = {
      title,
      text,
      photo,
      mood,
      sensorData: localSensorData.length > 0 ? localSensorData : (isRecording ? sensorDataLog : []), // Use newly recorded if available
    };

    if(editingRecord){
        onUpdateRecord({...editingRecord, ...recordData});
    } else {
        onAddRecord(recordData);
    }
    
    if (isRecording) stopRecording(); // Ensure recording stops if it was active for this entry
    setLocalSensorData([]); // Reset local sensor data after saving
    setIsModalOpen(false);
  };

  const handleStartRecordingSensors = async () => {
    if (!permissionGranted) {
      const granted = await requestPermissions();
      if (!granted) return; // Error handled by useSensors hook
    }
    setLocalSensorData([]); // Clear any previous/stale data for a new recording session
    await startRecording();
  };
  
  const handleStopRecordingSensors = () => {
    stopRecording();
    setLocalSensorData(sensorDataLog); // Store the captured log
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this diary entry? This action cannot be undone.")) {
        onDeleteRecord(id);
    }
  };
  
  const handleExportAllCSV = () => {
    exportSensorDataToCSV(records);
  };

  const handleExportSingleCSV = (recordId: string) => {
    exportSensorDataToCSV(records, recordId);
  };


  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-700">My Album</h1>
        <Button onClick={openNewRecordModal} color="primary" leftIcon={<PlusIcon className="w-5 h-5"/>}>
          New Entry
        </Button>
      </div>

      {records.length === 0 ? (
        <Card className="text-center">
          <p className="text-slate-500 text-lg">No diary entries yet.</p>
          <p className="text-slate-400 mt-2">Click "New Entry" to start your ZEN Diary journey.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-end mb-4">
            <Button onClick={handleExportAllCSV} variant="outlined" size="sm" leftIcon={<DownloadIcon className="w-4 h-4"/>}>
                Export All Sensor Data (CSV)
            </Button>
          </div>
          {records.map((record) => (
            <Card key={record.id} className="group relative">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold text-indigo-600">{record.title}</h2>
                  <p className="text-sm text-slate-500 mb-1">
                    {new Date(record.date).toLocaleDateString()} - Mood: {MOOD_CONFIG[record.mood].emoji} {record.mood}
                  </p>
                </div>
                <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button onClick={() => openEditRecordModal(record)} size="sm" variant="text" title="Edit">
                        <EditIcon className="w-5 h-5 text-slate-500 hover:text-indigo-600"/>
                    </Button>
                    <Button onClick={() => handleDelete(record.id)} size="sm" variant="text" color="danger" title="Delete">
                        <TrashIcon className="w-5 h-5 text-slate-500 hover:text-red-600"/>
                    </Button>
                </div>
              </div>
              
              <p className="text-slate-700 mt-2 mb-3 whitespace-pre-wrap">{record.text}</p>
              {record.photo && (
                <img src={record.photo} alt={record.title} className="my-3 rounded-lg max-h-60 w-auto object-contain border border-slate-200" />
              )}
              {record.sensorData && record.sensorData.length > 0 && (
                 <div className="mt-3">
                    <Button 
                        onClick={() => handleExportSingleCSV(record.id)} 
                        variant="text" 
                        size="sm"
                        leftIcon={<DownloadIcon className="w-4 h-4"/>}
                    >
                        Export Sensor Data for this Entry
                    </Button>
                 </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => { if(isRecording) stopRecording(); setIsModalOpen(false);}} title={editingRecord ? "Edit Diary Entry" : "New Diary Entry"} size="lg">
        <div className="space-y-4">
          {formError && <p className="text-red-500 text-sm bg-red-100 p-2 rounded">{formError}</p>}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">Title</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="text" className="block text-sm font-medium text-slate-700 mb-1">Diary Text</label>
            <textarea
              id="text"
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="mood" className="block text-sm font-medium text-slate-700 mb-1">Mood</label>
            <select
              id="mood"
              value={mood}
              onChange={(e) => setMood(e.target.value as Mood)}
              className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              {Object.values(Mood).map((m) => (
                <option key={m} value={m}>{MOOD_CONFIG[m].emoji} {m}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="photo" className="block text-sm font-medium text-slate-700 mb-1">Photo (Optional)</label>
            <input
              type="file"
              id="photo"
              accept="image/*"
              onChange={handlePhotoChange}
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            {photoPreview && <img src={photoPreview} alt="Preview" className="mt-2 rounded-md max-h-40 border border-slate-200" />}
          </div>
          
          <div className="border-t pt-4 mt-4">
            <h3 className="text-md font-semibold text-slate-700 mb-2">Sensor Recording</h3>
            {sensorError && <p className="text-red-500 text-sm bg-red-100 p-2 rounded mb-2">{sensorError}</p>}
            {!permissionGranted && permissionGranted !== null && (
                <p className="text-orange-600 text-sm bg-orange-100 p-2 rounded mb-2">Sensor permissions were denied. Please grant them in your browser settings if you wish to record sensor data.</p>
            )}
            
            <div className="flex space-x-2 mb-2">
                <Button 
                    onClick={handleStartRecordingSensors} 
                    disabled={isRecording || (permissionGranted === false)}
                    color="secondary"
                    variant="outlined"
                >
                    {isRecording ? "Recording..." : "Start Sensor Recording"}
                </Button>
                <Button onClick={handleStopRecordingSensors} disabled={!isRecording} color="secondary">
                    Stop Recording
                </Button>
            </div>

            {isRecording && (
                <div className="text-xs text-slate-500 p-2 bg-slate-100 rounded">
                    <p>Gyro: X: {liveMotionData.gyroscope.x?.toFixed(2)}, Y: {liveMotionData.gyroscope.y?.toFixed(2)}, Z: {liveMotionData.gyroscope.z?.toFixed(2)}</p>
                    <p>Accel: X: {liveMotionData.accelerometer.x?.toFixed(2)}, Y: {liveMotionData.accelerometer.y?.toFixed(2)}, Z: {liveMotionData.accelerometer.z?.toFixed(2)}</p>
                    <p>Mic Level: {liveMicLevel?.toFixed(0) ?? 'N/A'}</p>
                </div>
            )}
            {!isRecording && localSensorData.length > 0 && (
                <p className="text-sm text-green-600 bg-green-100 p-2 rounded">Sensor data recorded ({localSensorData.length} points). Ready to save.</p>
            )}
             {!isRecording && sensorDataLog.length > 0 && localSensorData.length === 0 && !editingRecord && (
                // This case happens if modal is closed and reopened after recording but before saving.
                // We should ideally persist this temporary recording state or clear it.
                // For now, let's indicate that data from previous uncommitted recording exists.
                <p className="text-sm text-blue-600 bg-blue-100 p-2 rounded">Note: Unsaved sensor data from a previous recording session exists ({sensorDataLog.length} points). Start new recording to overwrite.</p>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button onClick={() => { if(isRecording) stopRecording(); setIsModalOpen(false);}} variant="outlined" color="secondary">
              Cancel
            </Button>
            <Button onClick={handleSaveRecord} color="primary">
              {editingRecord ? "Save Changes" : "Save Entry"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AlbumPage;

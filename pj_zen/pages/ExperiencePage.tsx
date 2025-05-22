
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react'; // Changed from default import
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DiaryRecord, OrigamiPattern, SpatialExperienceConcept, NavigationPath } from '../types';
import { generateOrigamiPattern, generateSpatialExperienceConcept } from '../services/geminiService';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import { PrintIcon, MOOD_CONFIG } from '../constants';

interface ExperiencePageProps {
  records: DiaryRecord[];
}

const ExperiencePage: React.FC<ExperiencePageProps> = ({ records }) => {
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [origami, setOrigami] = useState<OrigamiPattern | null>(null);
  const [spatialConcept, setSpatialConcept] = useState<SpatialExperienceConcept | null>(null);
  const [isLoadingOrigami, setIsLoadingOrigami] = useState(false);
  const [isLoadingSpatial, setIsLoadingSpatial] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  const navigate = useNavigate();

  const selectedRecord = useMemo(() => {
    return records.find(r => r.id === selectedRecordId) || null;
  }, [records, selectedRecordId]);

  useEffect(() => {
    // Reset experiences if selected record changes or no record is selected
    setOrigami(null);
    setSpatialConcept(null);
    setError(null);
    if (records.length > 0 && !selectedRecordId) {
      setSelectedRecordId(records[0].id); // Default to first record if available
    } else if (records.length === 0) {
      setSelectedRecordId(null); // No records, no selection
    }
  }, [selectedRecordId, records]);

  const handleGenerateOrigami = async () => {
    if (!selectedRecord) return;
    setIsLoadingOrigami(true);
    setError(null);
    setOrigami(null);
    try {
      const pattern = await generateOrigamiPattern(selectedRecord);
      setOrigami(pattern);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate origami pattern.");
    } finally {
      setIsLoadingOrigami(false);
    }
  };

  const handleGenerateSpatialConcept = async () => {
    if (!selectedRecord) return;
    setIsLoadingSpatial(true);
    setError(null);
    setSpatialConcept(null);
    try {
      const concept = await generateSpatialExperienceConcept(selectedRecord);
      setSpatialConcept(concept);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate spatial concept.");
    } finally {
      setIsLoadingSpatial(false);
    }
  };

  const handlePrintOrigami = () => {
    if (!origami || !origami.svgContent) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>Print Origami</title>
          <style>
            @media print { body { -webkit-print-color-adjust: exact; } }
            body { margin: 20px; font-family: sans-serif; }
            .origami-container { width: 180mm; height: 180mm; border: 1px solid #ccc; margin-bottom: 20px; }
            .instructions { margin-top: 20px; white-space: pre-wrap; }
          </style>
          </head>
          <body>
            <h2>Origami Pattern for "${selectedRecord?.title || 'Entry'}"</h2>
            <p>Mood: ${selectedRecord?.mood || 'N/A'}</p>
            <div class="origami-container">
              ${origami.svgContent}
            </div>
            <h3>Instructions:</h3>
            <div class="instructions">${origami.instructions || "No instructions provided."}</div>
            <script>
              setTimeout(() => { window.print(); window.close(); }, 500);
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };
  
  const getQrCodeValue = () => {
    if (!selectedRecord || !spatialConcept) return "";
    // Construct URL to internal page for viewing the spatial experience
    // Base URL needs to be determined based on deployment (GitHub pages)
    // For HashRouter, it's part of the hash.
    const baseUrl = window.location.origin + window.location.pathname; // e.g. https://user.github.io/repo/
    return `${baseUrl}#${NavigationPath.SpatialViewer}/${selectedRecord.id}`;
  };


  const chartData = useMemo(() => {
    if (!selectedRecord || !selectedRecord.sensorData) return [];
    return selectedRecord.sensorData.map((d, index) => ({
      name: index.toString(), // or format timestamp
      time: new Date(d.timestamp).toLocaleTimeString(),
      gyroX: d.gyro?.x,
      gyroY: d.gyro?.y,
      gyroZ: d.gyro?.z,
      accelX: d.accel?.x,
      mic: d.mic,
    }));
  }, [selectedRecord]);

  if (records.length === 0) {
    return (
      <div className="p-4 md:p-6 text-center">
        <h1 className="text-3xl font-bold text-slate-700 mb-6">Experience Zone</h1>
        <Card><p className="text-slate-500">Please add some entries in the Album first to generate experiences.</p></Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-3xl font-bold text-slate-700 mb-6">Experience Zone</h1>

      <div className="mb-6">
        <label htmlFor="record-select" className="block text-sm font-medium text-slate-700 mb-1">Select Diary Entry:</label>
        <select
          id="record-select"
          value={selectedRecordId || ""}
          onChange={(e) => setSelectedRecordId(e.target.value)}
          className="w-full max-w-md p-2.5 border border-slate-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white"
        >
          {records.map(r => <option key={r.id} value={r.id}>{new Date(r.date).toLocaleDateString()} - {r.title}</option>)}
        </select>
      </div>

      {error && <Card className="bg-red-100 border-red-500 border text-red-700 mb-4 p-3">{error}</Card>}

      {selectedRecord && (
        <div className="space-y-8">
          {/* Movement Visualization */}
          <Card>
            <h2 className="text-2xl font-semibold text-indigo-700 mb-4">Movement & Sound Visualization</h2>
            {selectedRecord.sensorData && selectedRecord.sensorData.length > 0 ? (
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0"/>
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="left" orientation="left" stroke="#8884d8" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="gyroX" stroke="#8884d8" strokeWidth={2} dot={false} name="Gyro X"/>
                    <Line yAxisId="left" type="monotone" dataKey="gyroY" stroke="#FF8042" strokeWidth={2} dot={false} name="Gyro Y"/>
                    <Line yAxisId="right" type="monotone" dataKey="mic" stroke="#82ca9d" strokeWidth={2} dot={false} name="Mic Level"/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-slate-500">No sensor data recorded for this entry.</p>
            )}
          </Card>
          
          {/* Origami Generation */}
          <Card>
            <h2 className="text-2xl font-semibold text-indigo-700 mb-4">Origami Pattern</h2>
            <Button onClick={handleGenerateOrigami} disabled={isLoadingOrigami || !selectedRecord} color="primary">
              {isLoadingOrigami ? <LoadingSpinner size="sm" color="text-white"/> : "Generate Origami from this Entry"}
            </Button>
            {isLoadingOrigami && <div className="mt-4"><LoadingSpinner text="Generating origami... this may take a moment."/></div>}
            {origami && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-slate-700">Generated Pattern:</h3>
                <div className="my-4 p-2 border border-slate-300 rounded-md bg-slate-50 inline-block max-w-xs md:max-w-sm">
                  {origami.svgContent ? (
                    <div dangerouslySetInnerHTML={{ __html: origami.svgContent }} />
                  ) : <p>SVG preview not available.</p>}
                </div>
                <h4 className="text-md font-medium text-slate-600 mt-2">Instructions:</h4>
                <p className="text-sm text-slate-600 whitespace-pre-wrap bg-slate-100 p-3 rounded-md">{origami.instructions || "No specific instructions provided."}</p>
                <Button onClick={handlePrintOrigami} leftIcon={<PrintIcon className="w-4 h-4"/>} className="mt-4" variant="outlined">Print Origami</Button>
              </div>
            )}
          </Card>

          {/* Spatial Experience QR */}
          <Card>
            <h2 className="text-2xl font-semibold text-indigo-700 mb-4">Spatial Experience Concept</h2>
            <Button onClick={handleGenerateSpatialConcept} disabled={isLoadingSpatial || !selectedRecord} color="primary">
              {isLoadingSpatial ? <LoadingSpinner size="sm" color="text-white"/> : "Generate Spatial QR Concept"}
            </Button>
            {isLoadingSpatial && <div className="mt-4"><LoadingSpinner text="Generating spatial concept..."/></div>}
            {spatialConcept && selectedRecord && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-slate-700">{spatialConcept.title}</h3>
                <p className="text-sm text-slate-600 mt-1">{spatialConcept.description}</p>
                <div className="my-2">
                  <span className="font-medium">Colors: </span>
                  {spatialConcept.colors.map(color => (
                    <span key={color} style={{ backgroundColor: color, color: '#fff', mixBlendMode: 'difference' }} className="inline-block w-6 h-6 rounded-full border border-slate-300 mr-1 align-middle leading-6 text-center text-xs"></span>
                  ))}
                </div>
                <p className="text-sm text-slate-600"><span className="font-medium">Ambiance:</span> {spatialConcept.ambiance}</p>
                <Button onClick={() => setQrModalOpen(true)} className="mt-4" variant="outlined">Show QR Code</Button>
              </div>
            )}
          </Card>
        </div>
      )}
      
      {selectedRecord && spatialConcept && (
        <Modal isOpen={qrModalOpen} onClose={() => setQrModalOpen(false)} title={`QR for: ${spatialConcept.title}`}>
            <div className="flex flex-col items-center p-4">
                <QRCodeSVG value={getQrCodeValue()} size={256} level="H" includeMargin={true} />
                <p className="mt-4 text-sm text-slate-600 text-center">Scan this QR code to view the spatial experience concept for "{selectedRecord.title}".</p>
                <p className="mt-1 text-xs text-slate-500">URL: <a href={getQrCodeValue()} target="_blank" rel="noopener noreferrer" className="underline hover:text-indigo-600">{getQrCodeValue()}</a></p>
            </div>
        </Modal>
      )}
    </div>
  );
};

export default ExperiencePage;

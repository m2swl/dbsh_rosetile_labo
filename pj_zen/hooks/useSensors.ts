
import { useState, useEffect, useCallback, useRef } from 'react';
import { SensorDataPoint, MotionData } from '../types';

const RECORDING_INTERVAL_MS = 100; // How often to push data to the array

interface UseSensorsReturn {
  sensorDataLog: SensorDataPoint[];
  liveMotionData: MotionData;
  liveMicLevel: number | null;
  isRecording: boolean;
  permissionGranted: boolean | null; // null = not yet requested, true = granted, false = denied
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  requestPermissions: () => Promise<boolean>;
}

const useSensors = (): UseSensorsReturn => {
  const [sensorDataLog, setSensorDataLog] = useState<SensorDataPoint[]>([]);
  const [liveMotionData, setLiveMotionData] = useState<MotionData>({
    gyroscope: { x: null, y: null, z: null },
    accelerometer: { x: null, y: null, z: null },
  });
  const [liveMicLevel, setLiveMicLevel] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  
  // Fix: Changed NodeJS.Timeout to number for browser compatibility
  const recordingIntervalRef = useRef<number | null>(null);
  const motionDataBufferRef = useRef<MotionData>(liveMotionData); // Buffer for latest motion data

  const handleDeviceMotion = useCallback((event: DeviceMotionEvent) => {
    const { rotationRate, accelerationIncludingGravity } = event;
    const newMotionData: MotionData = {
      gyroscope: rotationRate ? { x: rotationRate.alpha, y: rotationRate.beta, z: rotationRate.gamma } : { x: null, y: null, z: null },
      accelerometer: accelerationIncludingGravity ? { x: accelerationIncludingGravity.x, y: accelerationIncludingGravity.y, z: accelerationIncludingGravity.z } : { x: null, y: null, z: null },
    };
    setLiveMotionData(newMotionData);
    motionDataBufferRef.current = newMotionData; // Update buffer
  }, []);

  const getMicrophoneLevel = useCallback(() => {
    if (analyserRef.current && dataArrayRef.current) {
      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      let sum = 0;
      for (let i = 0; i < dataArrayRef.current.length; i++) {
        sum += dataArrayRef.current[i];
      }
      const average = sum / dataArrayRef.current.length;
      // Normalize to a pseudo-decibel scale (0-100). This is a simplification.
      const normalizedLevel = Math.min(100, Math.max(0, average)); 
      setLiveMicLevel(normalizedLevel);
      return normalizedLevel;
    }
    return null;
  }, []);


  const requestPermissions = useCallback(async (): Promise<boolean> => {
    setError(null);
    try {
      // Gyroscope/Accelerometer permissions (iOS specific)
      if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        const motionPermissionState = await (DeviceMotionEvent as any).requestPermission();
        if (motionPermissionState !== 'granted') {
          setError('Motion sensor permission denied.');
          setPermissionGranted(false);
          return false;
        }
      }
      // Microphone permission
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256; 
        microphoneSourceRef.current = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
        microphoneSourceRef.current.connect(analyserRef.current);
        dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);

        setPermissionGranted(true);
        return true;
      } else {
        setError('Audio context or getUserMedia not supported.');
        setPermissionGranted(false);
        return false;
      }
    } catch (err) {
      console.error('Error requesting permissions:', err);
      setError(`Permission request failed: ${err instanceof Error ? err.message : String(err)}`);
      setPermissionGranted(false);
      return false;
    }
  }, []);


  const startRecording = useCallback(async () => {
    if (!permissionGranted) {
      const granted = await requestPermissions();
      if (!granted) {
        setError("Permissions not granted. Cannot start recording.");
        return;
      }
    }
    
    setSensorDataLog([]); // Clear previous log
    setIsRecording(true);
    setError(null);

    window.addEventListener('devicemotion', handleDeviceMotion);

    // Start collecting data at intervals
    // Fix: Use window.setInterval to ensure the browser's setInterval (which returns a number) is used.
    recordingIntervalRef.current = window.setInterval(() => {
      const micLevel = getMicrophoneLevel();
      const currentMotionData = motionDataBufferRef.current;

      setSensorDataLog(prevLog => [
        ...prevLog,
        {
          timestamp: Date.now(),
          gyro: currentMotionData.gyroscope,
          accel: currentMotionData.accelerometer,
          mic: micLevel ?? undefined,
        },
      ]);
    }, RECORDING_INTERVAL_MS);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionGranted, handleDeviceMotion, getMicrophoneLevel, requestPermissions]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    window.removeEventListener('devicemotion', handleDeviceMotion);
    
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    // Stop microphone and release resources
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (microphoneSourceRef.current) {
      microphoneSourceRef.current.disconnect();
      microphoneSourceRef.current = null;
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect(); // Not strictly necessary if source is disconnected
      analyserRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(e => console.error("Error closing audio context", e));
      audioContextRef.current = null;
    }
    // Reset live data when not recording to avoid stale display
    setLiveMicLevel(null); 
    // Keep last motion data visible or clear it? Let's clear it.
    // setLiveMotionData({ gyroscope: { x: null, y: null, z: null }, accelerometer: { x: null, y: null, z: null }});

  }, [handleDeviceMotion]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  return {
    sensorDataLog,
    liveMotionData,
    liveMicLevel,
    isRecording,
    permissionGranted,
    error,
    startRecording,
    stopRecording,
    requestPermissions,
  };
};

export default useSensors;
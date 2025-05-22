
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { GEMINI_TEXT_MODEL, GEMINI_API_KEY_ERROR } from '../constants';
import { DiaryRecord, OrigamiPattern, SensorDataPoint, SpatialExperienceConcept } from "../types";

const getApiKey = (): string | undefined => {
  // In a real browser environment, process.env is not typically available unless injected by a build tool.
  // The instructions are very specific to use `process.env.API_KEY` directly.
  // This assumes the execution environment will provide this.
  try {
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      return process.env.API_KEY;
    }
  } catch (e) {
    // process might not be defined (e.g. strict browser env)
    console.warn("process.env.API_KEY not accessible.");
  }
  // Fallback or direct check if it's somehow globally available (less likely for API keys)
  // For development, you might temporarily hardcode it here OR use a .env file with a build process
  // but adhering to instructions: "exclusively from process.env.API_KEY"
  return undefined; 
};

const API_KEY = getApiKey();
let ai: GoogleGenAI | null = null;

if (API_KEY) {
  ai = new GoogleGenAI({ apiKey: API_KEY });
} else {
  console.error(GEMINI_API_KEY_ERROR);
}

const summarizeSensorData = (sensorData: SensorDataPoint[]): string => {
  if (!sensorData || sensorData.length === 0) return "No specific movement data recorded.";
  
  let maxGyroX = -Infinity, minGyroX = Infinity;
  let maxGyroY = -Infinity, minGyroY = Infinity;
  let maxGyroZ = -Infinity, minGyroZ = Infinity;
  let maxAccelX = -Infinity, minAccelX = Infinity;
  let avgMic = 0;
  let micSamples = 0;

  sensorData.forEach(p => {
    if (p.gyro) {
      if (p.gyro.x !== null) { maxGyroX = Math.max(maxGyroX, p.gyro.x); minGyroX = Math.min(minGyroX, p.gyro.x); }
      if (p.gyro.y !== null) { maxGyroY = Math.max(maxGyroY, p.gyro.y); minGyroY = Math.min(minGyroY, p.gyro.y); }
      if (p.gyro.z !== null) { maxGyroZ = Math.max(maxGyroZ, p.gyro.z); minGyroZ = Math.min(minGyroZ, p.gyro.z); }
    }
    if (p.accel && p.accel.x !== null) { // Assuming X is most indicative for simplicity
        maxAccelX = Math.max(maxAccelX, p.accel.x); minAccelX = Math.min(minAccelX, p.accel.x);
    }
    if (p.mic !== undefined) {
      avgMic += p.mic;
      micSamples++;
    }
  });

  const gyroRangeX = maxGyroX !== -Infinity ? (maxGyroX - minGyroX).toFixed(2) : "N/A";
  const accelRangeX = maxAccelX !== -Infinity ? (maxAccelX - minAccelX).toFixed(2) : "N/A";
  const avgMicLevel = micSamples > 0 ? (avgMic / micSamples).toFixed(2) : "N/A";

  return `Movement summary: Gyro rotation range (alpha axis): ${gyroRangeX}. Accelerometer activity (X-axis range): ${accelRangeX}. Average sound level: ${avgMicLevel} (0-100 scale). Duration: approx ${(sensorData.length * 100) / 1000} seconds.`;
};


export const generateOrigamiPattern = async (record: DiaryRecord): Promise<OrigamiPattern> => {
  if (!ai) throw new Error(GEMINI_API_KEY_ERROR);

  const sensorSummary = summarizeSensorData(record.sensorData);
  const photoDescription = record.photo ? "The user captured a photo related to this memory." : "No photo was taken.";

  const prompt = `
    You are an AI assistant that designs simple origami patterns.
    Based on the following diary entry, mood, sensor data summary, and photo description, generate an origami pattern.
    The pattern should be relatively simple, suitable for a beginner.
    The output must be a JSON object with the following structure:
    {
      "lines": [
        {"x1": 0.0, "y1": 0.5, "x2": 1.0, "y2": 0.5, "type": "valley"}, 
        ... more lines ...
      ],
      "instructions": "1. Fold in half. 2. Fold corners to center. ...",
      "svgContent": "<svg width='200' height='200' viewBox='0 0 1 1' xmlns='http://www.w3.org/2000/svg'>...</svg>" 
    }
    Coordinates for lines should be normalized (0.0 to 1.0 for a unit square).
    'type' can be 'valley', 'mountain', or 'cut'.
    Provide an 'svgContent' string representing the origami base with fold lines. The SVG viewBox should be '0 0 1 1'. Lines should be thin strokes. Valley folds blue, mountain folds red, cut lines green.

    Diary Entry: "${record.text}"
    Mood: ${record.mood}
    Sensor Data Summary: ${sensorSummary}
    Photo: ${photoDescription}

    Generate the JSON output now.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: [{ role: "user", parts: [{text: prompt}] }],
      config: {
        responseMimeType: "application/json",
      }
    });

    let jsonStr = response.text.trim();
    const fenceRegex = /^\`\`\`(?:json)?\s*\n?(.*?)\n?\s*\`\`\`$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[1]) {
      jsonStr = match[1].trim();
    }
    
    const parsedData = JSON.parse(jsonStr) as OrigamiPattern;
    // Validate basic structure
    if (!parsedData.lines || !Array.isArray(parsedData.lines) || !parsedData.instructions || !parsedData.svgContent) {
        throw new Error("Invalid origami pattern structure received from API.");
    }
    return parsedData;

  } catch (error) {
    console.error("Error generating origami pattern:", error);
    throw new Error(`Failed to generate origami pattern: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const generateSpatialExperienceConcept = async (record: DiaryRecord): Promise<SpatialExperienceConcept> => {
  if (!ai) throw new Error(GEMINI_API_KEY_ERROR);

  const prompt = `
    You are an AI assistant that conceptualizes immersive spatial experiences based on emotions and memories.
    For the given diary entry and mood, describe a concept for a room or space that embodies these feelings.
    The output must be a JSON object with the following structure:
    {
      "title": "A fitting title for the experience",
      "description": "A short paragraph (2-3 sentences) describing the overall feeling and theme of the space.",
      "colors": ["#hex1", "#hex2", "#hex3"], // Suggest 3-5 dominant hex color codes
      "ambiance": "Describe the ambiance (e.g., lighting, sounds, textures, abstract elements like flowing particles or gentle lights)."
    }

    Diary Entry: "${record.text}"
    Mood: ${record.mood}
    Associated Color: ${record.moodColor}
    ${record.photo ? "A photo was part of this memory." : ""}

    Generate the JSON output now.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: [{ role: "user", parts: [{text: prompt}] }],
      config: {
        responseMimeType: "application/json",
      }
    });

    let jsonStr = response.text.trim();
    const fenceRegex = /^\`\`\`(?:json)?\s*\n?(.*?)\n?\s*\`\`\`$/s; // More robust regex for ```json
    const match = jsonStr.match(fenceRegex);
    if (match && match[1]) {
      jsonStr = match[1].trim();
    }
    
    const parsedData = JSON.parse(jsonStr) as SpatialExperienceConcept;
    if (!parsedData.title || !parsedData.description || !parsedData.colors || !Array.isArray(parsedData.colors) || !parsedData.ambiance) {
        throw new Error("Invalid spatial concept structure received from API.");
    }
    return parsedData;

  } catch (error) {
    console.error("Error generating spatial experience concept:", error);
    throw new Error(`Failed to generate spatial concept: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// グローバル変数
let scene, camera, renderer;
let sensorData = [];
let currentIndex = 0;
let actualStartTime = 0; // Actual start time of playback relative to performance.now()
let lastProcessedTimestamp = 0;
let playbackSpeed = 1.0;
let isPlaying = false;
let animationFrameId;

let bgShaderMaterial, backgroundScene, backgroundCamera, bgMesh; // 背景用 (Shader)
// Graph specific variables
let graphLine, graphPoint, graphGeometry, graphMaterial, pointMesh; // Graph line and point
let graphShadedAreaMesh, graphShadedAreaGeometry, graphShadedAreaMaterial; // Graph shaded area
let dataHistory = [];
const HISTORY_WINDOW_MS = 15000; // 15 seconds history window for the graph
const MAX_HISTORY_POINTS = 500; // Limit number of points in history for performance

// Particle specific variables
let particleGeometry, particleMaterial, particleSystem;
let particleTexture;
const MAX_PARTICLES = 5000; // Maximum number of particles

// Particle attributes for BufferGeometry (fixed size arrays)
let pPositions, pVelocities, pEmissionTimes, pLifespans, pSizes, pColors;
let pAttributeIndex = 0; // Index for writing to buffer attributes (wrap around)
let particleCount = 0; // Logical count of emitted particles (resets on clear/reset)


let audioContext, oscillator, gainNode, filterNode; // 音声用
let isAudioInitialized = false;
let isSeeking = false; // シークバー操作中フラグ
let currentAudioParams = { frequency: 440, filterFreq: 2500, filterQ: 1, gain: 0 }; // オーディオパラメータの状態を保持

// DOM要素
const csvFileInput = document.getElementById('csvFile');
const playButton = document.getElementById('playButton');
const pauseButton = document.getElementById('pauseButton');
const resetButton = document.getElementById('resetButton');
const speedControl = document.getElementById('speedControl');
const speedValueDisplay = document.getElementById('speedValue');
const vizContainer = document.getElementById('visualizationContainer');

const csvFileNameDisplay = document.getElementById('csvFileName');
const currentDataDisplay = document.getElementById('currentData');
const seekBar = document.getElementById('seekBar');
const currentTimeDisplay = document.getElementById('currentTimeDisplay');
const totalTimeDisplay = document.getElementById('totalTimeDisplay');

// 新しいDOM要素
const toggleDarkModeButton = document.getElementById('toggleDarkModeButton');
const toggleCustomizationButton = document.getElementById('toggleCustomizationButton');
const customizationPanel = document.getElementById('customizationPanel');
const intensityMultiplierSlider = document.getElementById('intensityMultiplier');
const intensityValueDisplay = document.getElementById('intensityValue');
const varietyMultiplierSlider = document.getElementById('varietyMultiplier');
const varietyValueDisplay = document.getElementById('varietyValue');
const highlightMultiplierSlider = document.getElementById('highlightMultiplier');
const highlightValueDisplay = document.getElementById('highlightValue');
// Visualization mode toggle button
const toggleVizModeButton = document.getElementById('toggleVizModeButton');
const currentVizTextElement = document.getElementById('currentVizMode');


// 状態変数
let darkModeEnabled = false;
let customizationPanelVisible = false; // Customization panel state
let vizMode = 'shader'; // 'shader', 'graph', or 'particles'
let manualIntensityMultiplier = 1.0;
let manualVarietyMultiplier = 1.0;
let manualHighlightMultiplier = 1.0;


// シェーダーコード
const backgroundVertexShader = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const backgroundFragmentShader = `
    varying vec2 vUv;
    uniform float uTime;
    uniform vec3 uBaseColor;         // CSVのsessionColorから派生 (RGB)
    uniform float uHighlightIntensity;
    uniform float uEmotionSpeed;
    uniform float uEmotionIntensity;
    uniform float uColorVariety;

    float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    float noise(vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(random(i), random(i + vec2(1.0, 0.0)), u.x) +
               (random(i + vec2(0.0, 1.0)) - random(i)) * u.y * (1.0 - u.x) +
               (random(i + vec2(1.0, 1.0)) - random(i + vec2(1.0, 0.0))) * u.y * u.x;
    }

    float fbm(vec2 st) {
        float value = 0.0;
        float amplitude = 0.6;
        float frequency = 1.0;
        for (int i = 0; i < 4; i++) {
            value += amplitude * noise(st * frequency);
            frequency *= 1.8;
            amplitude *= 0.5;
        }
        return value;
    }

    void main() {
        vec2 uv = vUv;
        // uEmotionSpeedの影響をさらに強く、全体の速度も調整
        float time = uTime * (0.03 + uEmotionSpeed * 0.15); // 速度係数調整

        // uBaseColor (RGB) を基本とする
        vec3 baseRgb = uBaseColor;

        // color1: uBaseColor から uColorVariety と uEmotionIntensity に基づくオフセット
        // 各チャンネルに異なるノイズを適用し、色の多様性を強調
        float offset1_r = (noise(uv * 1.5 + time * 0.09) - 0.5) * (0.15 + uColorVariety * 0.3) * uEmotionIntensity;
        float offset1_g = (noise(uv * 1.4 + time * 0.11 + vec2(1.0,0.0)) - 0.5) * (0.15 + uColorVariety * 0.3) * uEmotionIntensity;
        float offset1_b = (noise(uv * 1.3 + time * 0.10 + vec2(0.0,1.0)) - 0.5) * (0.15 + uColorVariety * 0.3) * uEmotionIntensity;
        vec3 color1 = clamp(baseRgb + vec3(offset1_r, offset1_g, offset1_b), 0.0, 1.0);


        // color2: uBaseColor から別の方向へのオフセット
        float offset2_r = (noise(uv * 1.6 - time * 0.12) - 0.5) * (0.2 + uColorVariety * 0.4) * uEmotionIntensity;
        float offset2_g = (noise(uv * 1.7 - time * 0.14 + vec2(0.5, 0.5)) - 0.5) * (0.2 + uColorVariety * 0.4) * uEmotionIntensity;
        float offset2_b = (noise(uv * 1.8 - time * 0.13 + vec2(1.5, 0.2)) - 0.5) * (0.2 + uColorVariety * 0.4) * uEmotionIntensity;
        vec3 color2 = clamp(baseRgb + vec3(offset2_r, offset2_g, offset2_b), 0.0, 1.0);


        // FBMパターンとミキシング
        // パターンのスケールと動きを uEmotionIntensity と uEmotionSpeed で制御
        float patternScale = 0.5 + uEmotionIntensity * 1.5; // 強度が高いほどパターンが細かく複雑に
        float fbmTimeX = time * (0.8 + uEmotionSpeed * 1.2); // 動きを加速
        float fbmTimeY = time * (0.7 + uEmotionSpeed * 1.0);
        float fbmPattern = fbm(uv * patternScale + vec2(fbmTimeX, fbmTimeY));

        // mix範囲を調整し、パターンの影響度を uEmotionIntensity で変化させる
        float mixThreshold = 0.5 - uEmotionIntensity * 0.2; // 強度が高いほど閾値が下がり、color2の領域が増える
        float mixSmoothness = 0.2 + uEmotionIntensity * 0.2; // 強度が高いほどブレンドが滑らかに
        vec3 blendedColor = mix(color1, color2, smoothstep(mixThreshold, mixThreshold + mixSmoothness, fbmPattern));


        // ハイライト
        // ハイライトの位置とサイズ、強度を uHighlightIntensity と uEmotionSpeed/Intensity で制御
        vec2 highlightOffset = vec2(sin(time * (0.3 + uEmotionSpeed * 0.1) + uEmotionIntensity * 0.4) * 0.4,
                                    cos(time * (0.25 + uEmotionSpeed * 0.09) - uEmotionIntensity * 0.35) * 0.4);
        float distToHighlight = length(uv - (vec2(0.5, 0.5) + highlightOffset));
        // ハイライトの広がりを uHighlightIntensity と uEmotionIntensity で調整
        float highlightSpread = 0.6 - uHighlightIntensity * 0.2 - uEmotionIntensity * 0.1; // 強度が高いほど広がりが狭まる
        float highlightSharpness = 0.08 + uHighlightIntensity * 0.05; // 強度が高いほどシャープに
        float highlightEffect = smoothstep(highlightSpread, highlightSharpness, distToHighlight) * uHighlightIntensity * 2.5; // 影響度をさらに上げる

        // ハイライト色を明るく、わずかにベースカラーに寄せる
        vec3 highlightColor = mix(vec3(0.95, 0.95, 0.98), baseRgb, 0.1); // 白に近い色とベースカラーを少しブレンド
        vec3 finalColor = mix(blendedColor, highlightColor, highlightEffect);


        // Vignette (ビネット)
        // ビネットの強さを uEmotionIntensity で調整
        float vigStrength = 0.3 + uEmotionIntensity * 0.3; // 強度が高いほどビネットが強くなる
        float vig = smoothstep(1.0, vigStrength, length(uv - vec2(0.5)));
        finalColor *= vig;

        // 全体のコントラストと明るさを微調整
        // uHighlightIntensity で全体を明るくする影響を強める
        finalColor = pow(finalColor, vec3(0.85)); // 少し明るくコントラストを上げる
        finalColor = clamp(finalColor + uHighlightIntensity * 0.08, 0.0, 1.0); // ハイライト強度で全体を明るく

        gl_FragColor = vec4(finalColor, 1.0);
    }
`;

// Particle shader code
const particleVertexShader = `
    attribute vec3 initialPosition;
    attribute vec3 initialVelocity;
    attribute float emissionTime;
    attribute float lifespan;
    attribute float size;
    attribute vec4 color; // rgb + alpha

    uniform float uTime; // Time in seconds since start of particle visualization
    uniform float uSpeedFactor; // Use for scaling movement speed

    varying vec4 vColor;

    void main() {
        float age = uTime - emissionTime;
        // Discard particles that are dead or haven't been emitted yet
        if (age < 0.0 || age > lifespan) {
            gl_Position = vec4(1e20); // Move far away (using vec4(value) sets xyz and w=value)
            vColor = vec4(0.0);
            gl_PointSize = 0.0;
            return;
        }

        // Calculate position based on initial state, age, and speed factor
        // Add a little vertical random wiggle?
        vec3 currentPosition = initialPosition + initialVelocity * age * uSpeedFactor;
         // currentPosition.y += sin(age * 5.0) * 0.05; // Example wiggle


        // Perspective scaling for point size
        // The size attribute is the desired pixel size.
        // THREE.js handles perspective scaling when sizeAttenuation: true is used with Points material
        gl_PointSize = size; // Point size in pixels


        // Calculate transparency based on age (fade in/out)
        float fadeStartTime = lifespan * 0.05; // Start fading in after 5% life
        float fadeEndTime = lifespan * 0.8; // Start fading out after 80% life
        float alpha = color.a;
        if (age < fadeStartTime) {
            alpha *= smoothstep(0.0, fadeStartTime, age);
        } else if (age > fadeEndTime) {
            alpha *= (1.0 - smoothstep(fadeEndTime, lifespan, age));
        }

        vColor = vec4(color.rgb, alpha);

        gl_Position = projectionMatrix * modelViewMatrix * vec4(currentPosition, 1.0);
    }
`;

const particleFragmentShader = `
    uniform sampler2D uTexture;

    varying vec4 vColor;

    void main() {
        // Sample the texture at the current point coordinate
        vec4 texColor = texture2D(uTexture, gl_PointCoord);

        // Combine texture color with particle color and opacity
        vec4 finalColor = texColor * vColor;

        // Discard fragments with very low alpha to avoid rendering invisible parts
        // This helps performance and transparency sorting artifacts
        if (finalColor.a < 0.005) discard;

        gl_FragColor = finalColor;
    }
`;


// ファイル読み込み処理
function handleFileLoad(event) {
    const file = event.target.files[0];
    if (!file) {
        console.log("handleFileLoad: No file selected.");
        return;
    }

    console.log("handleFileLoad: File selected:", file.name);
    csvFileNameDisplay.textContent = file.name;

    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target.result;
        parseCSV(text); // This updates sensorData
        console.log("handleFileLoad: CSV parsed. sensorData.length:", sensorData.length);

        if (sensorData.length > 0) {
            const firstTimestamp = sensorData[0].timestamp;
            const lastTimestamp = sensorData[sensorData.length - 1].timestamp;
            const totalDurationMs = lastTimestamp - firstTimestamp; // Total duration from first to last point

            totalTimeDisplay.textContent = formatTime(totalDurationMs);
            seekBar.max = totalDurationMs; // Max value is total duration
            seekBar.value = 0;
            currentTimeDisplay.textContent = formatTime(0);
            seekBar.disabled = false;
             console.log(`handleFileLoad: Data loaded. Total duration: ${totalDurationMs} ms.`);

            // Reset state for new data
            currentIndex = 0;
            // lastProcessedTimestamp should track the timestamp *from the original CSV*, not relative one
            // The relative timestamps are used internally for calculation, but seeking/display should use original relative values.
            // Let's clarify timestamp usage:
            // sensorData[i].timestamp is NOW relative to the first entry's timestamp (which is treated as 0).
            // seek bar value is relative elapsed time (0 to totalDurationMs).
            // lastProcessedTimestamp should track the current relative elapsed time.
             lastProcessedTimestamp = 0; // Relative timestamp

            isPlaying = false;
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
            pauseAnimation(); // Ensure UI reflects paused state - THIS ENABLES PLAY BUTTON


            // Initialize visuals and audio with the first data point (which has relative timestamp 0)
            const firstRow = sensorData[0];

            // Rebuild graph history for the very start
            rebuildGraphHistory(firstRow.timestamp); // timestamp is 0 here
             console.log("handleFileLoad: Graph history rebuilt for start.");

            // Update visuals based on the current mode
             if (vizMode === 'shader') {
                 updateShaderVisuals(firstRow);
                  // Reset shader uTime to 0 for the start
                 if (bgShaderMaterial && bgShaderMaterial.uniforms.uTime) {
                      bgShaderMaterial.uniforms.uTime.value = 0.0;
                      delete bgShaderMaterial.uniforms.uTime.lastFrameTime; // Clear lastFrameTime
                 }
                  console.log("handleFileLoad: Shader visuals updated.");
             } else if (vizMode === 'graph') { // vizMode === 'graph'
                 updateGraphVisuals(firstRow);
                  console.log("handleFileLoad: Graph visuals updated.");
             } else { // vizMode === 'particles'
                  clearParticles(); // Start with no particles
                  updateParticleVisuals(firstRow, 0); // Update uniforms based on first row (no emission)
                 // Reset particle uTime to 0 for the start
                  if (particleMaterial && particleMaterial.uniforms.uTime) {
                       particleMaterial.uniforms.uTime.value = 0.0;
                  }
                  console.log("handleFileLoad: Particle visuals updated.");
             }

             // Update audio state based on the first frame (gain should be 0 as not playing)
            if (!isAudioInitialized) {
                 initAudio(); // Initialize audio context if not already
            }
             // Ensure audio is reset to initial silent state on new file load
             if (isAudioInitialized && audioContext && audioContext.state !== 'closed') {
                 // Smoothly fade out gain if audio was active
                 if (gainNode) {
                     gainNode.gain.cancelScheduledValues(audioContext.currentTime);
                     gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.1);
                     currentAudioParams.gain = 0;
                 }
                  // Reset audio parameters to defaults
                  const currentTime = audioContext.currentTime;
                  const smoothTime = 0.1;
                  if (oscillator) oscillator.frequency.setTargetAtTime(440, currentTime, smoothTime);
                  if (filterNode) {
                      filterNode.frequency.setTargetAtTime(2500, currentTime, smoothTime);
                      filterNode.Q.setTargetAtTime(1, currentTime, smoothTime);
                  }
                  // Also reset particle and photo time trackers in updateAudio
                  updateAudio.lastStepTime = 0;
                  updateAudio.lastPhotoTime = 0;
                 currentAudioParams.frequency = 440;
                 currentAudioParams.filterFreq = 2500;
                 currentAudioParams.filterQ = 1;
             }
             // Audio parameters for the first frame (gain is 0 due to pause)
            const emotionFactor = getEmotionFactor(firstRow.sessionEmotion);
            updateAudio(firstRow, emotionFactor); // This will set the *target* parameters based on data, but gain will be 0

            // Initial render
            renderer.clear();
            if (vizMode === 'shader') {
                 renderer.render(backgroundScene, backgroundCamera);
            } else {
                 renderer.render(scene, camera);
            }
             console.log("handleFileLoad: Initial render complete.");


        } else {
            console.warn("handleFileLoad: No valid data rows found after parsing.");
            // Handle empty data case
            totalTimeDisplay.textContent = formatTime(0);
            seekBar.max = 0;
            seekBar.value = 0;
            currentTimeDisplay.textContent = formatTime(0);
            seekBar.disabled = true;
            currentDataDisplay.textContent = 'No data loaded or data invalid.';
            sensorData = [];
            currentIndex = 0;
            lastProcessedTimestamp = 0; // Reset timestamp
            dataHistory = []; // Clear graph history
            clearParticles(); // Clear particle history


            // Reset visuals to default empty state
             if (vizMode === 'shader') {
                  if (bgShaderMaterial && bgShaderMaterial.uniforms) {
                       bgShaderMaterial.uniforms.uBaseColor.value.setRGB(0.2, 0.3, 0.7); // Default color
                       bgShaderMaterial.uniforms.uHighlightIntensity.value = 0.1;
                       bgShaderMaterial.uniforms.uEmotionSpeed.value = 0.5;
                       bgShaderMaterial.uniforms.uEmotionIntensity.value = 0.3;
                       bgShaderMaterial.uniforms.uColorVariety.value = 0.2;
                       if (bgShaderMaterial.uniforms.uTime) {
                           bgShaderMaterial.uniforms.uTime.value = 0.0;
                            delete bgShaderMaterial.uniforms.uTime.lastFrameTime;
                       }
                  }
             } else if (vizMode === 'graph') { // vizMode === 'graph'
                 if (graphGeometry) graphGeometry.setDrawRange(0, 0);
                 if (graphShadedAreaGeometry) graphShadedAreaGeometry.setDrawRange(0, 0);
                 if (pointMesh) pointMesh.visible = false;
                 // Keep graph objects visible but empty
                 if (graphLine) graphLine.visible = true;
                 if (graphShadedAreaMesh) graphShadedAreaMesh.visible = true;
             } else { // vizMode === 'particles'
                  clearParticles(); // Ensure no particles are displayed
                   if (particleSystem && particleMaterial && particleMaterial.uniforms.uTime) {
                       particleMaterial.uniforms.uTime.value = 0.0;
                       if (particleSystem) particleSystem.visible = true; // Keep object visible but empty
                  }
             }


            // Reset audio
             if (isAudioInitialized && audioContext && audioContext.state !== 'closed') {
                  // Stop sound, reset params
                  if (gainNode) {
                      gainNode.gain.setTargetAtTime(0, audioContext.currentTime, 0.1);
                      currentAudioParams.gain = 0;
                  }
                  // Optionally reset frequency/filter to defaults
                  const currentTime = audioContext.currentTime;
                  const smoothTime = 0.1;
                  if (oscillator) oscillator.frequency.setTargetAtTime(440, currentTime, smoothTime);
                  if (filterNode) {
                      filterNode.frequency.setTargetAtTime(2500, currentTime, smoothTime);
                      filterNode.Q.setTargetAtTime(1, currentTime, smoothTime);
                  }
                   currentAudioParams.frequency = 440;
                  currentAudioParams.filterFreq = 2500;
                  currentAudioParams.filterQ = 1;
                  // Also reset particle and photo time trackers in updateAudio
                  updateAudio.lastStepTime = 0;
                  updateAudio.lastPhotoTime = 0;
             }

             // Ensure pause button is disabled and play/reset are enabled if they shouldn't be clickable without data.
             // But pauseAnimation handles this correctly if called. Let's ensure it's called here too.
             pauseAnimation(); // This will set play/pause/reset button states correctly based on isPlaying=false


             renderer.clear();
             if (vizMode === 'shader') {
                  renderer.render(backgroundScene, backgroundCamera);
             } else {
                  renderer.render(scene, camera);
             }
              console.log("handleFileLoad: No data loaded, reset visuals.");
        }
    };
    reader.readAsText(file);
}


function parseCSV(text) {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    if (lines.length <= 1) {
        sensorData = [];
        console.warn("parseCSV: CSV contains no data rows.");
        return;
    }

    const headers = lines[0].split(',');
    const dataRows = lines.slice(1);

    // Use PapaParse for more robust CSV parsing
    const results = PapaParse.parse(dataRows.join('\n'), {
         header: true,
         skipEmptyLines: true,
         dynamicTyping: (header) => {
             // Automatically detect numbers for known numeric fields
             if (['timestamp', 'temperature_celsius', 'illuminance', 'decibels', 'accelX', 'accelY', 'accelZ', 'gyroX', 'gyroY', 'gyroZ', 'steps_in_interval', 'photoTakenId'].includes(header.trim())) {
                 return true; // Try to parse as number
             }
              return false; // Keep as string
         }
    });

     if (results.errors.length > 0) {
         console.error("parseCSV: parsing errors:", results.errors);
         // Decide how to handle errors: proceed with valid rows or abort?
         // Let's proceed with valid rows
     }

     // Filter out rows without a valid timestamp OR if timestamp is not a finite number after dynamicTyping
     sensorData = results.data.filter(data => data.timestamp != null && typeof data.timestamp === 'number' && isFinite(data.timestamp)); // Filter out rows without a valid timestamp


    // Ensure timestamps are relative to the first timestamp for easier calculation later
    if (sensorData.length > 0) {
        const firstTimestamp = sensorData[0].timestamp;
        sensorData.forEach(data => {
             // Check if timestamp is already relative (e.g., if CSV provided it that way)
             // Assume the first timestamp is the base unless it looks like an absolute value far from 0.
             // Simple check: if first timestamp > 10 years in ms, assume epoch time and make relative.
             // Otherwise, assume it's already relative or 0-based.
             // Given the context, it's likely Unix epoch ms or similar.
             // Let's always make it relative to the first timestamp found.
             if (data.timestamp != null && typeof data.timestamp === 'number' && isFinite(data.timestamp)) {
                data.timestamp -= firstTimestamp;
             }
        });
         // Store the original first timestamp if needed elsewhere? Not currently used, but good practice maybe.
         // Let's adjust the logic to work with the adjusted timestamps (relative to the first)
         lastProcessedTimestamp = sensorData[0].timestamp; // This is now 0 after making relative
         console.log(`parseCSV: Adjusted timestamps relative to first entry (${firstTimestamp}). First relative: ${sensorData[0].timestamp}`);
    } else {
         lastProcessedTimestamp = 0;
         console.warn("parseCSV: No valid data points remaining after filtering.");
    }

    console.log(`parseCSV: Loaded ${sensorData.length} data points.`);
     if (sensorData.length > 0) {
         console.log("parseCSV: First data point:", sensorData[0]);
         console.log("parseCSV: Last data point:", sensorData[sensorData.length - 1]);
     }
}


// Helper function to toggle play/pause state
function playAnimation() {
    console.log("playAnimation called. sensorData.length:", sensorData.length);
    if (sensorData.length === 0) {
        console.warn("playAnimation: No data loaded, returning.");
        // Optionally, provide user feedback here if needed
        // currentDataDisplay.textContent = 'Cannot play: No data loaded.';
        return;
    }

    isPlaying = true;
    playButton.disabled = true;
    pauseButton.disabled = false;
    resetButton.disabled = true; // Disable reset while playing

    // Resume AudioContext if suspended
    if (isAudioInitialized && audioContext && audioContext.state === 'suspended') {
         audioContext.resume().then(() => {
              console.log("AudioContext resumed successfully.");
               // Smoothly fade in gain after resume
              if (gainNode) {
                  // Use last calculated audio params which includes gain based on data BEFORE pause/seek
                  // Let's use currentAudioParams.gain which reflects the last *intended* non-zero gain
                  const targetGain = Math.min(0.15, Math.max(0, currentAudioParams.gain || 0.02)); // Default to small gain if state was 0
                  gainNode.gain.cancelScheduledValues(audioContext.currentTime); // Clear any pending fades
                  gainNode.gain.setValueAtTime(gainNode.gain.value, audioContext.currentTime); // Start ramp from current value
                  gainNode.gain.linearRampToValueAtTime(targetGain, audioContext.currentTime + 0.2); // Fade in over 0.2s
                  currentAudioParams.gain = targetGain; // Update state to the new target
              }
         }).catch(e => console.error("Error resuming AudioContext:", e));
    } else if (isAudioInitialized && audioContext && audioContext.state === 'running') {
         // If already running (e.g. after seek change when already playing), ensure gain is correct
          if (gainNode) {
               // Use last calculated audio params state
              const targetGain = Math.min(0.15, Math.max(0, currentAudioParams.gain || 0.02));
              gainNode.gain.cancelScheduledValues(audioContext.currentTime);
              gainNode.gain.setValueAtTime(gainNode.gain.value, audioContext.currentTime);
              gainNode.gain.linearRampToValueAtTime(targetGain, audioContext.currentTime + 0.2);
              currentAudioParams.gain = targetGain;
          }
    }


    // Determine the elapsed time based on the current index's timestamp
    // This should be the timestamp of the current point relative to the CSV start.
    const elapsedCsvTime = sensorData[currentIndex].timestamp; // This is relative to the CSV start (time 0)

    // Calculate actualStartTime: performance.now() - (elapsed_csv_time / playback_speed)
    // This sets the reference point for the animation timer.
    actualStartTime = performance.now() - (elapsedCsvTime / playbackSpeed);
     console.log(`playAnimation: Starting from CSV timestamp ${elapsedCsvTime} ms. actualStartTime set to ${actualStartTime}. Playback speed: ${playbackSpeed}`);


    // Start the animation loop if it's not already running
    if (animationFrameId === null) {
        console.log("playAnimation: Starting animation loop.");
        animate.lastFrameTime = performance.now(); // Reset lastFrameTime for delta calculation
        animate();
    } else {
         console.log("playAnimation: Animation loop already running.");
    }
}

function pauseAnimation() {
    console.log("pauseAnimation called.");
    isPlaying = false;
    playButton.disabled = false;
    pauseButton.disabled = true;
    resetButton.disabled = false; // Enable reset when paused

    // Pause AudioContext or just fade gain out
     if (isAudioInitialized && audioContext && audioContext.state === 'running') {
          if (gainNode) {
              gainNode.gain.cancelScheduledValues(audioContext.currentTime); // Clear any pending ramps
              gainNode.gain.setValueAtTime(gainNode.gain.value, audioContext.currentTime); // Start ramp from current value
              gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2); // Fade out over 0.2s
               currentAudioParams.gain = 0; // Update state
          }
     }

    // The animate function will stop requesting frames when isPlaying is false
    // cancelAnimationFrame(animationFrameId); // This is handled inside animate loop now
    // animationFrameId = null; // Don't null it here, let animate loop handle it

    // Render the current paused state (e.g., if user paused midway)
    // This is implicitly handled by the next frame request (or lack thereof) and multiplier updates if done while paused.
    // Explicitly render if needed after state change:
     if (!isSeeking && sensorData.length > 0 && currentIndex >= 0) { // Only render if not seeking
          console.log("pauseAnimation: Rendering current frame.");
          const currentRow = sensorData[currentIndex];
          if (vizMode === 'shader') {
              updateShaderVisuals(currentRow);
          } else if (vizMode === 'graph') {
              updateGraphVisuals(currentRow);
          } else { // vizMode === 'particles'
               updateParticleVisuals(currentRow, 0);
          }
         renderer.clear();
         if (vizMode === 'shader') {
              renderer.render(backgroundScene, backgroundCamera);
         } else {
              renderer.render(scene, camera);
         }
     }
}


function resetAnimation() {
    console.log("resetAnimation called.");
    if (sensorData.length === 0) {
        console.warn("resetAnimation: No data loaded, returning.");
        return;
    }

    pauseAnimation(); // Ensure playback is stopped and UI is in paused state

    currentIndex = 0;
    lastProcessedTimestamp = 0; // Relative elapsed time
    seekBar.value = 0;
    currentTimeDisplay.textContent = formatTime(0);

    // Reset actualStartTime
    actualStartTime = performance.now(); // Reset relative to 'now' as if starting from 0
    console.log(`resetAnimation: Reset playback to timestamp 0. actualStartTime set to ${actualStartTime}.`);


    // Reset shader uTime
    if (bgShaderMaterial && bgShaderMaterial.uniforms.uTime) {
        bgShaderMaterial.uniforms.uTime.value = 0.0;
        delete bgShaderMaterial.uniforms.uTime.lastFrameTime; // Ensure next animate frame starts fresh delta calculation
    }

    // Clear particle system and reset particle uTime
    clearParticles();
    if (particleMaterial && particleMaterial.uniforms.uTime) {
        particleMaterial.uniforms.uTime.value = 0.0;
    }


    // Rebuild graph history from the beginning (timestamp 0)
    rebuildGraphHistory(0);

    // Update visuals and audio for the very first data point (timestamp 0)
    const firstRow = sensorData[0];
     if (firstRow) {
          if (vizMode === 'shader') {
               updateShaderVisuals(firstRow);
          } else if (vizMode === 'graph') {
               updateGraphVisuals(firstRow); // Update graph geometry for the start state
          } else { // vizMode === 'particles'
               updateParticleVisuals(firstRow, 0); // Update uniforms, no emission yet
          }
          const emotionFactor = getEmotionFactor(firstRow.sessionEmotion);
          updateAudio(firstRow, emotionFactor); // Update audio state (gain will be 0 due to pause)
     }


    // Render the reset state
     renderer.clear();
     if (vizMode === 'shader') {
         renderer.render(backgroundScene, backgroundCamera);
     } else {
         renderer.render(scene, camera);
     }

     resetButton.disabled = false; // Keep reset button enabled
}

// Function to switch visualization modes
function setVisualizationMode(mode) {
     if (vizMode === mode) {
          console.log(`Already in mode: ${mode}`);
          return; // Do nothing if already in this mode
     }

     console.log(`Switching visualization mode to: ${mode}`);

     // Hide all visualization elements first
     if (bgMesh) bgMesh.visible = false;
     if (graphLine) graphLine.visible = false;
     if (graphShadedAreaMesh) graphShadedAreaMesh.visible = false;
     if (pointMesh) pointMesh.visible = false;
     if (particleSystem) particleSystem.visible = false;

     // Update vizMode state
     const oldVizMode = vizMode;
     vizMode = mode;

     // Show elements for the new mode
     switch (vizMode) {
         case 'shader':
             if (bgMesh) bgMesh.visible = true;
             // If data is loaded, reset shader time and update visuals
             if (sensorData.length > 0 && currentIndex >= 0) {
                  const currentRow = sensorData[currentIndex];
                  if (bgShaderMaterial && bgShaderMaterial.uniforms.uTime) {
                       // Align shader time with current playback position
                       const elapsedCsvTime = sensorData[currentIndex].timestamp;
                       bgShaderMaterial.uniforms.uTime.value = elapsedCsvTime / 1000.0; // Convert ms to seconds
                        delete bgShaderMaterial.uniforms.uTime.lastFrameTime; // Reset delta time calculation
                  }
                  updateShaderVisuals(currentRow);
             } else {
                  // No data loaded, reset shader to default empty state
                   if (bgShaderMaterial && bgShaderMaterial.uniforms) {
                       bgShaderMaterial.uniforms.uBaseColor.value.setRGB(0.2, 0.3, 0.7);
                       bgShaderMaterial.uniforms.uHighlightIntensity.value = 0.1;
                       bgShaderMaterial.uniforms.uEmotionSpeed.value = 0.5;
                       bgShaderMaterial.uniforms.uEmotionIntensity.value = 0.3;
                       bgShaderMaterial.uniforms.uColorVariety.value = 0.2;
                       if (bgShaderMaterial.uniforms.uTime) bgShaderMaterial.uniforms.uTime.value = 0.0;
                   }
             }
             break;
         case 'graph':
             if (graphLine) graphLine.visible = true;
             if (graphShadedAreaMesh) graphShadedAreaMesh.visible = true;
              // pointMesh visibility is handled by updateGraphVisuals
             // If data is loaded, rebuild graph history up to current point and update visuals
             if (sensorData.length > 0 && currentIndex >= 0) {
                 const currentRow = sensorData[currentIndex];
                  rebuildGraphHistory(currentRow.timestamp); // Rebuild history up to current time
                 updateGraphVisuals(currentRow); // Update geometry based on history and current point
             } else {
                  // No data loaded, clear graph geometry
                  if (graphGeometry) graphGeometry.setDrawRange(0, 0);
                  if (graphShadedAreaGeometry) graphShadedAreaGeometry.setDrawRange(0, 0);
                  if (pointMesh) pointMesh.visible = false;
             }
             break;
         case 'particles':
              if (particleSystem) particleSystem.visible = true;
              // Clear existing particles when switching to particle mode
              clearParticles();
              // If data is loaded, reset particle time and update visuals
              if (sensorData.length > 0 && currentIndex >= 0) {
                   const currentRow = sensorData[currentIndex];
                  if (particleMaterial && particleMaterial.uniforms.uTime) {
                      // Align particle time with current playback position
                      const elapsedCsvTime = sensorData[currentIndex].timestamp;
                      particleMaterial.uniforms.uTime.value = elapsedCsvTime / 1000.0; // Convert ms to seconds
                   }
                   updateParticleVisuals(currentRow, 0); // Update uniforms for current state (no emission on mode switch)
              } else {
                   // No data loaded, ensure particle system is empty and time is 0
                   if (particleMaterial && particleMaterial.uniforms.uTime) particleMaterial.uniforms.uTime.value = 0.0;
                   clearParticles(); // Already called above, but safe
              }
              break;
     }

     // Update button icon and title
     const iconElement = toggleVizModeButton.querySelector('.material-symbols-outlined');
     if (mode === 'shader') {
         iconElement.textContent = 'scatter_plot'; // Icon for Graph
         toggleVizModeButton.title = 'Switch to Graph Visualization';
          if (currentVizTextElement) currentVizTextElement.textContent = 'Shader';
     } else if (mode === 'graph') {
         iconElement.textContent = 'auto_awesome'; // Icon for Particles
         toggleVizModeButton.title = 'Switch to Particle Visualization';
          if (currentVizTextElement) currentVizTextElement.textContent = 'Graph';
     } else { // Currently 'particles'
         iconElement.textContent = 'palette'; // Icon for Shader
         toggleVizModeButton.title = 'Switch to Shader Visualization';
          if (currentVizTextElement) currentVizTextElement.textContent = 'Particles';
     }


    // Re-render the scene immediately after switching modes if not playing/seeking
     if (!isPlaying && !isSeeking) {
          console.log("Rendering after viz mode switch.");
          renderer.clear();
          if (vizMode === 'shader') {
              renderer.render(backgroundScene, backgroundCamera);
          } else {
              renderer.render(scene, camera);
          }
     }
}

// Function to handle the visualization mode toggle button click
function toggleVisualizationMode() {
    if (vizMode === 'shader') {
        setVisualizationMode('graph');
    } else if (vizMode === 'graph') {
        setVisualizationMode('particles');
    } else { // Currently 'particles'
        setVisualizationMode('shader');
    }
}


// 初期化処理
function init() {
    // Scene is shared for Graph and Particles
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    // Position camera slightly back if needed for the scale of Graph/Particles, but Z=1 works for the current setup mapping Y to -1/1
    camera.position.z = 1.0; // Camera position for Graph/Particle elements at Z=0

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.autoClear = false; // We will manually clear if needed (e.g., between shader and other renders)
    vizContainer.appendChild(renderer.domElement);

    // Setup for the Shader background
    backgroundScene = new THREE.Scene();
    // Fixed orthographic camera for the 2D shader plane (covers -1 to 1 in X and Y)
    backgroundCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const bgPlaneGeo = new THREE.PlaneGeometry(2, 2); // Plane covers the whole screen
    bgShaderMaterial = new THREE.ShaderMaterial({
        vertexShader: backgroundVertexShader,
        fragmentShader: backgroundFragmentShader,
        uniforms: {
            uTime: { value: 0.0 },
            uBaseColor: { value: new THREE.Color(0.2, 0.3, 0.7) }, // 初期ベースカラー (RGB)
            uHighlightIntensity: { value: 0.1 },                 // 初期ハイライト強度
            uEmotionSpeed: { value: 0.5 },                       // 感情による速度係数 (shaders internal speed)
            uEmotionIntensity: { value: 0.3 },                   // 感情による変化の強さ係数
            uColorVariety: { value: 0.2 }                        // 感情による色の多様性
        },
        depthTest: false,
        depthWrite: false
    });
    bgMesh = new THREE.Mesh(bgPlaneGeo, bgShaderMaterial); // Declare bgMesh globally
    backgroundScene.add(bgMesh);

    // Initialize graph visualization elements
    initGraph();

    // Initialize particle visualization elements
    initParticles();


    // イベントリスナー設定
    csvFileInput.addEventListener('change', handleFileLoad);
    playButton.addEventListener('click', playAnimation);
    pauseButton.addEventListener('click', pauseAnimation);
    resetButton.addEventListener('click', resetAnimation);
    speedControl.addEventListener('input', (e) => {
        playbackSpeed = parseFloat(e.target.value);
        speedValueDisplay.textContent = `${playbackSpeed.toFixed(1)}x`;
        // Playback speed affects the animation loop's time progression
         if (!isPlaying && !isSeeking && sensorData.length > 0 && currentIndex >= 0) {
              // If paused, update visuals to reflect potential changes influenced by speed (e.g., graph x-axis mapping)
              // Although current graph implementation scales the *window* dynamically, not the playback speed.
              // Speed *does* affect the target time when seeking, and how fast uTime updates.
              // If paused, re-render the current frame to show the state based on multipliers if applicable.
              const currentRow = sensorData[currentIndex];
              if (vizMode === 'shader') {
                   // Re-calculate shader uniforms based on new playback speed affecting uTime advance rate (in animate)
                   // uEmotionSpeed uniform itself isn't directly tied to playbackSpeed, just the multiplier from emotion.
                   // But updating visuals while paused ensures multipliers are applied.
                   updateShaderVisuals(currentRow);
              } else if (vizMode === 'graph') {
                   // Graph time mapping and history window are relative to data timestamps, not playback speed directly.
                   // The speed influences *which* points are shown over time, but the *look* of the points within the window is fixed.
                   // No specific visual update needed for graph on speed change while paused.
              } else { // vizMode === 'particles'
                   // Particle uTime advance rate is affected by playback speed.
                   // If paused, uTime is frozen, but uniforms like uSpeedFactor (based on emotion) might update.
                   updateParticleVisuals(currentRow, 0); // Update uniforms, no emission
              }
              // Re-render after speed change if paused and data loaded
              renderer.clear();
              if (vizMode === 'shader') {
                   renderer.render(backgroundScene, backgroundCamera);
               } else {
                   renderer.render(scene, camera);
               }
         }
    });
    seekBar.addEventListener('input', handleSeekBarInput);
    seekBar.addEventListener('change', handleSeekBarChange);
    seekBar.disabled = true; // Disabled until CSV is loaded

    // 新しいイベントリスナー
    toggleDarkModeButton.addEventListener('click', toggleDarkMode);
    toggleCustomizationButton.addEventListener('click', toggleCustomizationPanel);
    intensityMultiplierSlider.addEventListener('input', updateMultiplierDisplay);
    varietyMultiplierSlider.addEventListener('input', updateMultiplierDisplay);
    highlightMultiplierSlider.addEventListener('input', updateMultiplierDisplay);
    toggleVizModeButton.addEventListener('click', toggleVisualizationMode); // Listener for the new button

    // 初期テーマ設定 (システム設定優先)
    setInitialTheme();

    // 初期visualization mode設定
    vizMode = 'shader'; // Start with shader mode
    setVisualizationMode(vizMode); // Apply visibility and button icon

    // Initial rendering is handled by onWindowResize
    onWindowResize();
}

function initGraph() {
    // Create graph geometry (dynamic line)
    graphGeometry = new THREE.BufferGeometry();
    graphGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_HISTORY_POINTS * 3), 3));
    graphMaterial = new THREE.LineBasicMaterial({ color: 0x8844EE, linewidth: 2 }); // Purple color (light mode)
    graphLine = new THREE.Line(graphGeometry, graphMaterial);
    scene.add(graphLine); // Add to the main scene

    // Create graph shaded area geometry (dynamic mesh)
    graphShadedAreaGeometry = new THREE.BufferGeometry();
    graphShadedAreaGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_HISTORY_POINTS * 4 * 3), 3));
    // Indices for quads (two triangles per quad)
    const shadedAreaIndicesArray = new Uint16Array((MAX_HISTORY_POINTS - 1) * 6);
     for (let i = 0; i < MAX_HISTORY_POINTS - 1; i++) {
          const baseIndex = i * 4; // 4 vertices per segment (quad)
          const indexIndex = i * 6;
          // Triangle 1 (top-left, bottom-left, bottom-right)
          shadedAreaIndicesArray[indexIndex] = baseIndex; // v0
          shadedAreaIndicesArray[indexIndex + 1] = baseIndex + 2; // v2
          shadedAreaIndicesArray[indexIndex + 2] = baseIndex + 3; // v3
          // Triangle 2 (top-left, bottom-right, top-right)
          shadedAreaIndicesArray[indexIndex + 3] = baseIndex; // v0
          shadedAreaIndicesArray[indexIndex + 4] = baseIndex + 3; // v3
          shadedAreaIndicesArray[indexIndex + 5] = baseIndex + 1; // v1
     }

    graphShadedAreaGeometry.setIndex(new THREE.BufferAttribute(shadedAreaIndicesArray, 1));
    graphShadedAreaMaterial = new THREE.MeshBasicMaterial({
        color: 0x8844EE, // Match line color (light mode)
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide // Needed if camera can go behind the plane
    });
    graphShadedAreaMesh = new THREE.Mesh(graphShadedAreaGeometry, graphShadedAreaMaterial);
    scene.add(graphShadedAreaMesh);


    // Create the current point indicator (sphere)
    const pointGeometry = new THREE.SphereGeometry(0.02, 16, 16);
    const pointMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 }); // Black point for light mode contrast
    pointMesh = new THREE.Mesh(pointGeometry, pointMaterial);
    scene.add(pointMesh);

    // Initialize data history
    dataHistory = [];

     // Ensure graph objects are hidden initially until data is loaded and mode is set
     if (graphLine) graphLine.visible = false;
     if (graphShadedAreaMesh) graphShadedAreaMesh.visible = false;
     if (pointMesh) pointMesh.visible = false;
}

function initParticles() {
    // Load the particle texture
    const loader = new THREE.TextureLoader();
    // Use a local path relative to index.html
    loader.load('./assets/particle.png', (texture) => {
        particleTexture = texture;
         // If material already exists, update the uniform value
         if (particleMaterial) {
              particleMaterial.uniforms.uTexture.value = particleTexture;
              particleMaterial.needsUpdate = true;
         }
          console.log("Particle texture loaded.");
    }, undefined, (err) => {
        console.error('Error loading particle texture:', err);
        // Fallback? Or handle visually (e.g., particles won't render correctly)
        // Maybe set uTexture to null or a default solid white texture?
        if (particleMaterial) {
             // Could use a default texture or just accept that rendering will be broken without it
        }
    });


    particleGeometry = new THREE.BufferGeometry();

    // Create attribute buffers (fixed size)
    pPositions = new Float32Array(MAX_PARTICLES * 3);
    pVelocities = new Float32Array(MAX_PARTICLES * 3);
    pEmissionTimes = new Float32Array(MAX_PARTICLES); // Time relative to particle shader uTime = 0
    pLifespans = new Float32Array(MAX_PARTICLES); // Life duration in seconds
    pSizes = new Float32Array(MAX_PARTICLES); // Size in pixels
    pColors = new Float32Array(MAX_PARTICLES * 4); // RGBA color

    particleGeometry.setAttribute('initialPosition', new THREE.BufferAttribute(pPositions, 3));
    particleGeometry.setAttribute('initialVelocity', new THREE.BufferAttribute(pVelocities, 3));
    particleGeometry.setAttribute('emissionTime', new THREE.BufferAttribute(pEmissionTimes, 1));
    particleGeometry.setAttribute('lifespan', new THREE.BufferAttribute(pLifespans, 1));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(pSizes, 1));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(pColors, 4));

    // Initialize all particles as inactive
    for(let i = 0; i < MAX_PARTICLES; i++) {
         pEmissionTimes[i] = -1000; // Set emission time far in the past so age > lifespan initially
         pSizes[i] = 0; // Set size to 0 so they aren't visible
    }
     // Mark initial attributes as needing update
     particleGeometry.attributes.emissionTime.needsUpdate = true;
     particleGeometry.attributes.size.needsUpdate = true;


    particleMaterial = new THREE.ShaderMaterial({
        vertexShader: particleVertexShader,
        fragmentShader: particleFragmentShader,
        uniforms: {
            uTime: { value: 0.0 }, // This uniform will be updated by the animation loop (in seconds)
            uTexture: { value: particleTexture || null }, // Texture uniform, set to null if not loaded yet
            uSpeedFactor: { value: 1.0 } // Emotion speed influence on particle velocity
        },
        transparent: true,
        blending: THREE.AdditiveBlending, // Additive blending for glowing effect
        depthWrite: false, // Avoid depth sorting issues with transparent particles
        sizeAttenuation: true // Enable size attenuation based on distance (gl_PointSize unit is pixels)
    });

    particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particleSystem); // Add to the main scene (shared with graph)


     // Ensure particle system is hidden initially
     if (particleSystem) particleSystem.visible = false;
     // Set initial draw range to full buffer size, shader handles visibility
     particleGeometry.setDrawRange(0, MAX_PARTICLES); // Always render all points, shader discards inactive ones.
}

// Helper to clear all active particles
function clearParticles() {
     console.log("clearParticles called.");
     particleCount = 0; // Reset logical active count
     // Mark all particles in the buffer as inactive by setting emission time
     // Set emission time far in the past
     for(let i = 0; i < MAX_PARTICLES; i++) {
          pEmissionTimes[i] = -1000;
     }
     // Mark emissionTime attribute as needing update
     if (particleGeometry && particleGeometry.attributes.emissionTime) {
          particleGeometry.attributes.emissionTime.needsUpdate = true;
           // No need to reset draw range if shader discards based on age
           // particleGeometry.setDrawRange(0, 0); // Could set draw range to 0 if not using shader discard
     }
      console.log("Particles cleared.");
}


// Helper to emit particles based on data
function emitParticles(data, emotionFactor) {
    // Only emit if playing and particle texture is loaded
    if (!isPlaying || !particleSystem || !particleTexture) return;

    // Determine emission rate per second based on data/emotion/multipliers
    let emissionRatePerSec = 0; // Particles per second
    if (data.sessionEmotion) {
        // Higher intensity/speed -> more particles
        emissionRatePerSec += (emotionFactor.particleMovement * 0.5 + emotionFactor.speedFactor * 0.3) * 50; // Base rate + emotion influence
    }
     // Add sensor influence
     if (data.illuminance != null && typeof data.illuminance === 'number' && isFinite(data.illuminance)) emissionRatePerSec += Math.min(100, data.illuminance / 20); // More light, more particles (cap effect)
     if (data.decibels != null && typeof data.decibels === 'number' && isFinite(data.decibels)) emissionRatePerSec += Math.min(100, (data.decibels + 40) / 5); // More noise, more particles (cap effect)

     // Apply manual multipliers to emission rate
     emissionRatePerSec *= manualIntensityMultiplier; // Use intensity multiplier for rate

     // Limit max emission rate to avoid flooding the system
     const MAX_EMISSION_PER_SEC = 1000; // Cap emission rate
     emissionRatePerSec = Math.min(MAX_EMISSION_PER_SEC, emissionRatePerSec);


    // Determine number of particles to emit this frame based on delta time and playback speed
    // Use the global animate deltaTime, scaled by playback speed
    const frameEmissionCount = Math.floor(emissionRatePerSec * animate.deltaTime * playbackSpeed);

    if (frameEmissionCount <= 0) return;

     // console.log(`Emitting ${frameEmissionCount} particles. Emission rate: ${emissionRatePerSec.toFixed(1)}/s`);

    // Determine particle parameters based on data/emotion/multipliers
    const baseLifespan = 3.0; // seconds
    const baseSpeed = 0.05; // units per second (world units)
    const baseSize = 15; // pixels (screen units)

    // Parameters influenced by data/emotion/multipliers
    // Lifespan could be fixed or vary inversely with speed/emotion
    const effectiveLifespan = baseLifespan; // Keep fixed lifespan for simplicity

    const effectiveSpeed = baseSpeed * (emotionFactor.particleMovement * 0.8 + 0.2); // Speed based on movement factor
     effectiveSpeed *= manualIntensityMultiplier; // Intensity multiplier affects speed

    const effectiveSize = baseSize * (emotionFactor.sizeVariety * 0.5 + 0.5); // Size based on variety factor
    effectiveSize *= manualVarietyMultiplier; // Variety multiplier affects size

     // Color influenced by base color, emotion, and potentially highlight
     const baseColor = parseSessionColor(data.sessionColor) || { r: 0.5, g: 0.5, b: 0.7 };
     const targetColor = new THREE.Color(baseColor.r, baseColor.g, baseColor.b);
     // Add highlight influence to color? Or just make it brighter?
     // Let's blend towards white based on calculated highlight value
     let dataHighlightValue = 0.05; // Recalculate data highlight
     if (data.illuminance != null && typeof data.illuminance === 'number' && isFinite(data.illuminance)) {
          // Log scale for illuminance mapping
         const minLogLux = Math.log(1);
         const maxLogLux = Math.log(10001); // Max + 1 to handle 0 lux
         const logLux = Math.log(Math.max(1, data.illuminance + 1)); // Max 1 to avoid log(0)
         const luxNorm = Math.min(1.0, Math.max(0.0, (logLux - minLogLux) / (maxLogLux - minLogLux)));
         dataHighlightValue += luxNorm * 1.0; // Add up to 1.0
     }
     if (data.decibels != null && typeof data.decibels === 'number' && isFinite(data.decibels)) {
         // Simple linear mapping for decibels
         const decibelNorm = Math.min(1.0, Math.max(0.0, (data.decibels + 40) / 70.0)); // -40dB to 30dB -> 0 to 1
         dataHighlightValue += decibelNorm * 0.5; // Add up to 0.5
     }
      // Check for photoTakenId as a highlight trigger
     if (data.photoTakenId === 1 && typeof data.photoTakenId === 'number' && isFinite(data.photoTakenId)) {
         dataHighlightValue += 1.0; // Add a significant boost for photo events
     }

     // Apply highlight multiplier to the calculated data highlight influence
     const finalHighlightInfluence = Math.max(0.0, Math.min(2.0, dataHighlightValue * manualHighlightMultiplier)); // Cap influence


     // Blend towards white or bright color based on highlight influence
     const particleFinalColor = targetColor.clone();
     // Blend towards a bright, slightly tinted color (e.g., white with a hint of base color) based on highlight
     // Use interpolateRgb or lerp? Lerp towards a bright value.
      particleFinalColor.lerp(new THREE.Color(0.9 + baseColor.r * 0.1, 0.9 + baseColor.g * 0.1, 0.9 + baseColor.b * 0.1), finalHighlightInfluence * 0.8);


     // Alpha based on intensity, emotion, and highlight
     let targetAlpha = 0.4 + emotionFactor.particleMovement * 0.2 + finalHighlightInfluence * 0.1; // Base alpha + influences
     targetAlpha = Math.min(1.0, targetAlpha * manualIntensityMultiplier); // Intensity affects alpha


    const currentShaderTime = particleMaterial.uniforms.uTime.value; // Get current shader time (in seconds)

    // Emit the calculated number of particles
    for (let i = 0; i < frameEmissionCount; i++) {
        // Find the next particle slot to write to (wrap around the buffer)
        const index = pAttributeIndex; // Use the current index pointer
        const index3 = index * 3;
        const index4 = index * 4;

        // Set initial position (e.g., origin [0,0,0] in world space)
        pPositions[index3] = 0;
        pPositions[index3 + 1] = 0;
        pPositions[index3 + 2] = 0;

        // Set initial velocity (random direction, speed based on effectiveSpeed)
        // Emit in a sphere or cone shape? Sphere for now.
        const phi = Math.random() * Math.PI * 2; // Azimuthal angle
        const theta = Math.acos((Math.random() * 2) - 1); // Polar angle (distribute points on sphere)
        const speed = effectiveSpeed * (0.8 + Math.random() * 0.4); // Add some speed variation

        pVelocities[index3] = speed * Math.sin(theta) * Math.cos(phi);
        pVelocities[index3 + 1] = speed * Math.sin(theta) * Math.sin(phi);
        pVelocities[index3 + 2] = speed * Math.cos(theta);


        // Set emission time (current shader time)
        pEmissionTimes[index] = currentShaderTime;

        // Set lifespan
        pLifespans[index] = effectiveLifespan;

        // Set size
        pSizes[index] = effectiveSize * (0.8 + Math.random() * 0.4); // Add some size variation

        // Set color and alpha
        pColors[index4] = particleFinalColor.r;
        pColors[index4 + 1] = particleFinalColor.g;
        pColors[index4 + 2] = particleFinalColor.b;
        pColors[index4 + 3] = targetAlpha; // Use the calculated alpha

        // Move pointer to the next slot (wrap around)
        pAttributeIndex = (pAttributeIndex + 1) % MAX_PARTICLES;
        particleCount++; // Increment logical count
    }

     // Mark all relevant attributes as needing update
     // Since we are writing to a circular buffer, we need to update the modified range
     // or just mark the entire buffer dirty for simplicity if updates are frequent.
     // Marking the whole buffer dirty is often acceptable for particle systems.
     particleGeometry.attributes.initialPosition.needsUpdate = true;
     particleGeometry.attributes.initialVelocity.needsUpdate = true;
     particleGeometry.attributes.emissionTime.needsUpdate = true;
     particleGeometry.attributes.lifespan.needsUpdate = true; // If lifespan varies
     particleGeometry.attributes.size.needsUpdate = true;
     particleGeometry.attributes.color.needsUpdate = true;

     // Ensure the draw range covers all possible particles, shader hides inactive
     // This is already set in initParticles and should not need repeating per frame unless MAX_PARTICLES changes (it doesn't)
     // particleGeometry.setDrawRange(0, MAX_PARTICLES);
}


// New function to update particle visuals (called by animate, handleSeekBarInput/Change, updateMultiplierDisplay)
function updateParticleVisuals(data, deltaTime) {
     // Check if in particle mode before proceeding
     if (vizMode !== 'particles' || !particleSystem || !particleMaterial) {
          if (particleSystem) particleSystem.visible = false;
          return;
     }
      if (particleSystem) particleSystem.visible = true;


    // Update data display (always update data display) - Duplicated from updateShaderVisuals/updateGraphVisuals, should refactor common parts
    let dataStr = "";
    const keysToShow = ['timestamp', 'sessionColor', 'sessionEmotion', 'temperature_celsius', 'illuminance', 'decibels', 'accelY', 'steps_in_interval', 'photoTakenId'];
    for(const key of keysToShow){
        if(data[key] !== undefined && data[key] !== null){
            let value = data[key];
             if (typeof value === 'number' && isFinite(value)) {
                if (!Number.isInteger(value)) {
                    value = value.toFixed(2);
                }
                if(key === 'temperature_celsius') value += ' °C';
                if(key === 'decibels') value += ' dB';
                 if(key === 'timestamp') value = formatTime(value); // Format timestamp for display
            } else if (typeof value === 'string') {
                 value = value.trim(); // Clean up string values
            }
            dataStr += `${key}: ${value}\n`;
        }
    }
    currentDataDisplay.innerHTML = `<pre>${dataStr}</pre>`;


    // Update shader time uniform for particle animation ONLY IF PLAYING
    if (isPlaying && particleMaterial.uniforms.uTime) {
         particleMaterial.uniforms.uTime.value += deltaTime * playbackSpeed; // uTime progresses with playback speed
         if(isNaN(particleMaterial.uniforms.uTime.value)) particleMaterial.uniforms.uTime.value = 0;
    }

    // Update emotion speed uniform for particle movement scaling regardless of playing state (needed for static visuals when paused)
     const emotionFactor = getEmotionFactor(data.sessionEmotion);
     if (particleMaterial.uniforms.uSpeedFactor) {
         const targetSpeedFactor = emotionFactor.speedFactor;
         // Use a lerp factor that applies changes instantly when paused, smoothly when playing
         const currentLerpFactor = isPlaying ? 0.15 : 1.0;
         particleMaterial.uniforms.uSpeedFactor.value = THREE.MathUtils.lerp(
              particleMaterial.uniforms.uSpeedFactor.value,
              targetSpeedFactor,
              currentLerpFactor
         );
     }


    // Emit new particles based on current data ONLY IF PLAYING
    if (isPlaying) {
        emitParticles(data, emotionFactor);
    }

     // Ensure draw range is always MAX_PARTICLES, shader hides inactive
     // This is already set in initParticles and should not need repeating per frame unless MAX_PARTICLES changes (it doesn't)
     // particleGeometry.setDrawRange(0, MAX_PARTICLES);
}


// Rename original updateVisuals to updateShaderVisuals
function updateShaderVisuals(data) {
    // Update data display (always show data regardless of viz mode) - Duplicated, see note in updateParticleVisuals
     let dataStr = "";
     const keysToShow = ['timestamp', 'sessionColor', 'sessionEmotion', 'temperature_celsius', 'illuminance', 'decibels', 'accelY', 'steps_in_interval', 'photoTakenId'];
     for(const key of keysToShow){
         if(data[key] !== undefined && data[key] !== null){
             let value = data[key];
              if (typeof value === 'number' && isFinite(value)) {
                 if (!Number.isInteger(value)) {
                     value = value.toFixed(2);
                 }
                 if(key === 'temperature_celsius') value += ' °C';
                 if(key === 'decibels') value += ' dB';
                 if(key === 'timestamp') value = formatTime(value); // Format timestamp for display
             } else if (typeof value === 'string') {
                  value = value.trim(); // Clean up string values
             }
             dataStr += `${key}: ${value}\n`;
         }
     }
     currentDataDisplay.innerHTML = `<pre>${dataStr}</pre>`;


    // --- Update Shader Uniforms ---
    // Only update shader uniforms if bgShaderMaterial exists
    if (!bgShaderMaterial || !bgShaderMaterial.uniforms) return;

    const lerpFactor = isPlaying ? 0.15 : 1.0; // Lerp faster when paused/seeking (effectively instant)


    let baseColorData = parseSessionColor(data.sessionColor);
    if (!baseColorData || typeof baseColorData.r === 'undefined') {
        baseColorData = { r: 0.4, g: 0.4, b: 0.6 };
    }
    const targetBaseColor = new THREE.Color(baseColorData.r, baseColorData.g, baseColorData.b);
    bgShaderMaterial.uniforms.uBaseColor.value.lerp(targetBaseColor, lerpFactor);

    let dataHighlight = 0.05;
    if (data.illuminance != null && typeof data.illuminance === 'number' && isFinite(data.illuminance)) {
         const minLogLux = Math.log(1);
         const maxLogLux = Math.log(10001);
         const logLux = Math.log(Math.max(1, data.illuminance + 1));
         const luxNorm = Math.min(1.0, Math.max(0.0, (logLux - minLogLux) / (maxLogLux - minLogLux)));
         dataHighlight += luxNorm * 1.5;
    }
    if (data.decibels != null && typeof data.decibels === 'number' && isFinite(data.decibels)) {
        const decibelNorm = Math.min(1.0, Math.max(0.0, (data.decibels + 40) / 70.0));
        dataHighlight += decibelNorm * 0.6;
    }
     // Check for photoTakenId as a highlight trigger
     if (data.photoTakenId === 1 && typeof data.photoTakenId === 'number' && isFinite(data.photoTakenId)) {
         dataHighlight += 1.0; // Add a significant boost
     }

    const finalHighlight = Math.max(0.0, Math.min(3.0, dataHighlight * manualHighlightMultiplier));
    bgShaderMaterial.uniforms.uHighlightIntensity.value = THREE.MathUtils.lerp(
         bgShaderMaterial.uniforms.uHighlightIntensity.value,
         finalHighlight,
         lerpFactor
     );

    let emotionFactor = getEmotionFactor(data.sessionEmotion);
    if (!emotionFactor || typeof emotionFactor.speedFactor === 'undefined') {
        emotionFactor = { speedFactor: 1.0, colorVariety: 1.0, sizeVariety: 1.0, particleMovement: 1.0, apertureFactor: 1.0 };
    }

     // The uEmotionSpeed uniform should represent the *boost* from emotion, not including playbackSpeed
     // uTime calculation in animate uses playbackSpeed * uEmotionSpeed
     const effectiveEmotionSpeedBoost = emotionFactor.speedFactor;
     bgShaderMaterial.uniforms.uEmotionSpeed.value = THREE.MathUtils.lerp(
         bgShaderMaterial.uniforms.uEmotionSpeed.value,
         effectiveEmotionSpeedBoost,
         lerpFactor
     );


    const dataIntensity = (emotionFactor.particleMovement * 0.7 + 0.1);
    // Apply the CURRENT manual multiplier here
    const finalIntensity = dataIntensity * manualIntensityMultiplier;
    bgShaderMaterial.uniforms.uEmotionIntensity.value = THREE.MathUtils.lerp(
        bgShaderMaterial.uniforms.uEmotionIntensity.value,
        Math.max(0.1, Math.min(2.0, finalIntensity)),
        lerpFactor
    );

    const dataVariety = emotionFactor.colorVariety * 0.5;
    // Apply the CURRENT manual multiplier here
    const finalVariety = dataVariety * manualVarietyMultiplier;
    bgShaderMaterial.uniforms.uColorVariety.value = THREE.MathUtils.lerp(
        bgShaderMaterial.uniforms.uColorVariety.value,
        Math.max(0.1, Math.min(1.5, finalVariety)),
        lerpFactor
    );


     // Photo flash effect - still applies in shader mode regardless of playback state
     // Only trigger flash if this is a new photo event at a timestamp > the last triggered flash timestamp
     // Use data.timestamp (relative to CSV start) for comparison
     if (data.photoTakenId === 1 && typeof data.photoTakenId === 'number' && isFinite(data.photoTakenId) && data.timestamp > (updateShaderVisuals.lastPhotoFlashTimestamp || 0)) {
         if (bgShaderMaterial) {
             const flashDurationMs = 150; // ms
             const flashAmount = 1.5; // How much to boost highlight intensity

             // Store the highlight value *before* the flash boost
             const originalHighlightBeforeFlash = bgShaderMaterial.uniforms.uHighlightIntensity.value;

             // Apply the flash boost immediately
             bgShaderMaterial.uniforms.uHighlightIntensity.value = Math.min(3.5, originalHighlightBeforeFlash + flashAmount);

             // Trigger a render immediately if paused/seeking, to show the flash
             if (!isPlaying && !isSeeking && vizMode === 'shader') {
                  renderer.clear();
                  renderer.render(backgroundScene, backgroundCamera);
             }

             // Schedule the return to the original value after flashDurationMs
             setTimeout(() => {
                  if (bgShaderMaterial) {
                      // Use lerp to smoothly return, lerpFactor=1.0 for instant return after timeout
                      bgShaderMaterial.uniforms.uHighlightIntensity.value = THREE.MathUtils.lerp(
                          bgShaderMaterial.uniforms.uHighlightIntensity.value,
                          originalHighlightBeforeFlash, // Lerp back to the value before the flash boost
                          1.0 // Apply instantly after the timeout
                      );
                      // Trigger a render after the flash is over if paused/seeking
                      if (!isPlaying && !isSeeking && vizMode === 'shader') {
                         renderer.clear();
                         renderer.render(backgroundScene, backgroundCamera);
                      }
                  }
             }, flashDurationMs / playbackSpeed); // Scale flash duration by playback speed

             // Update the last photo flash timestamp *in terms of CSV time*
             updateShaderVisuals.lastPhotoFlashTimestamp = data.timestamp;
         }
     }
}
// Static property to track the last timestamp a photo flash was triggered (using CSV relative time)
updateShaderVisuals.lastPhotoFlashTimestamp = 0;


// New function to update graph visuals (geometry and point position)
function updateGraphVisuals(data) {
    // Check if in graph mode before proceeding with graph updates
    if (vizMode !== 'graph' || !graphGeometry || !pointMesh || !graphShadedAreaGeometry || !graphShadedAreaMaterial) {
        // Ensure graph elements are hidden if not in graph mode
        if (graphLine) graphLine.visible = false;
        if (pointMesh) pointMesh.visible = false;
        if (graphShadedAreaMesh) graphShadedAreaMesh.visible = false;
        return;
    }


    // Update data display (always update data display) - Duplicated, see note above
     let dataStr = "";
     const keysToShow = ['timestamp', 'sessionColor', 'sessionEmotion', 'temperature_celsius', 'illuminance', 'decibels', 'accelY', 'steps_in_interval', 'photoTakenId'];
     for(const key of keysToShow){
         if(data[key] !== undefined && data[key] !== null){
             let value = data[key];
              if (typeof value === 'number' && isFinite(value)) {
                 if (!Number.isInteger(value)) {
                     value = value.toFixed(2);
                 }
                 if(key === 'temperature_celsius') value += ' °C';
                 if(key === 'decibels') value += ' dB';
                  if(key === 'timestamp') value = formatTime(value); // Format timestamp for display
             } else if (typeof value === 'string') {
                  value = value.trim(); // Clean up string values
             }
             dataStr += `${key}: ${value}\n`;
         }
     }
     currentDataDisplay.innerHTML = `<pre>${dataStr}</pre>`;


    // Clear graph visuals if no data history
    if (dataHistory.length === 0) {
        if (graphGeometry) graphGeometry.setDrawRange(0, 0);
        if (graphShadedAreaGeometry) graphShadedAreaGeometry.setDrawRange(0, 0);
        if (pointMesh) pointMesh.visible = false;
        // Keep line/mesh objects visible but empty
        if (graphLine) graphLine.visible = true;
        if (graphShadedAreaMesh) graphShadedAreaMesh.visible = true;
        return;
    }


    // --- Update Graph Geometry and Point ---

    // Calculate the visible width at Z=0 for the perspective camera
    // This allows the graph to scale correctly with window size
    const vFOV = THREE.MathUtils.degToRad(camera.fov); // Vertical field of view in radians
    const viewHeightAtZero = 2 * Math.tan( vFOV / 2 ) * camera.position.z;
    const viewWidthAtZero = viewHeightAtZero * camera.aspect;
    const xRange = viewWidthAtZero * 0.9; // Use 90% of width for padding (0.05 on each side)


    // Update graph line geometry positions
    const linePositions = graphGeometry.attributes.position.array;
    let linePositionIndex = 0;

    const currentTimestamp = data.timestamp; // This is the ABSOLUTE timestamp (relative to start of data)
    // The graph window shows HISTORY_WINDOW_MS ending at currentTimestamp
    const windowStartTime = currentTimestamp - HISTORY_WINDOW_MS;
    const visibleHistory = dataHistory.filter(point => point.timestamp >= windowStartTime && point.timestamp <= currentTimestamp);


    for (let i = 0; i < visibleHistory.length; i++) {
        const point = visibleHistory[i];
        // Map timestamp within the window (windowStartTime to currentTimestamp) to X range (-xRange/2 to +xRange/2)
        const elapsedInWindow = point.timestamp - windowStartTime;
        const windowDuration = HISTORY_WINDOW_MS; // The fixed window duration
        const xNorm = (windowDuration > 0) ? (elapsedInWindow / windowDuration) : 0;
        const xPos = xNorm * xRange - xRange / 2; // Map normalized time to X range (-xRange/2 to +xRange/2)

        linePositions[linePositionIndex++] = xPos;
        linePositions[linePositionIndex++] = point.value; // Y (already scaled -1 to 1)
        linePositions[linePositionIndex++] = 0; // Z
    }
     // Clear unused positions for the line
    for (let i = linePositionIndex; i < MAX_HISTORY_POINTS * 3; i++) {
        linePositions[i] = 0;
    }
    graphGeometry.attributes.position.needsUpdate = true;
    graphGeometry.setDrawRange(0, visibleHistory.length); // Only draw the visible points


    // Update graph shaded area geometry
    const shadedAreaPositions = graphShadedAreaGeometry.attributes.position.array;
    const shadedAreaIndices = graphShadedAreaGeometry.index.array; // Indices array is fixed
    let shadedPosIndex = 0;
    let shadedIdxIndex = 0;

    // Map color from sessionColor to shaded area material
     const baseColorData = parseSessionColor(data.sessionColor);
     if (baseColorData) {
         // Smoothly transition color? Or set instantly? Instant for now.
         graphShadedAreaMaterial.color.setRGB(baseColorData.r, baseColorData.g, baseColorData.b);
     }

    // Only draw shaded area if at least two visible points exist
    if (visibleHistory.length >= 2) {
         const baseLineY = -0.9; // The Y coordinate for the base of the shaded area (slightly above bottom)

         for (let i = 0; i < visibleHistory.length - 1; i++) {
            const p1 = visibleHistory[i];
            const p2 = visibleHistory[i+1];

             // Get scaled X positions for p1 and p2 (using the same xRange and window mapping)
            const elapsedInWindow1 = p1.timestamp - windowStartTime;
            const windowDuration = HISTORY_WINDOW_MS; // Fixed window duration
            const xNorm1 = (windowDuration > 0) ? (elapsedInWindow1 / windowDuration) : 0;
            const xPos1 = xNorm1 * xRange - xRange / 2;

            const elapsedInWindow2 = p2.timestamp - windowStartTime;
            const xNorm2 = (windowDuration > 0) ? (elapsedInWindow2 / windowDuration) : 0;
            const xPos2 = xNorm2 * xRange - xRange / 2;

            const yPos1 = p1.value;
            const yPos2 = p2.value;

            // Vertices for the quad (p1_top, p2_top, p1_bottom, p2_bottom)
            // p1_top (v0), p2_top (v1), p1_bottom (v2), p2_bottom (v3) - using relative indices for the current quad segment
            const baseVertexIndexForSegment = shadedPosIndex / 3; // Starting index for this segment's 4 vertices

            // Top-left (from line)
            shadedAreaPositions[shadedPosIndex++] = xPos1;
            shadedAreaPositions[shadedPosIndex++] = yPos1;
            shadedAreaPositions[shadedPosIndex++] = 0;

            // Top-right (from line)
            shadedAreaPositions[shadedPosIndex++] = xPos2;
            shadedAreaPositions[shadedPosIndex++] = yPos2;
            shadedAreaPositions[shadedPosIndex++] = 0;

            // Bottom-left (on base line)
            shadedAreaPositions[shadedPosIndex++] = xPos1;
            shadedAreaPositions[shadedPosIndex++] = baseLineY;
            shadedAreaPositions[shadedPosIndex++] = 0;

            // Bottom-right (on base line)
            shadedAreaPositions[shadedPosIndex++] = xPos2;
            shadedAreaPositions[shadedPosIndex++] = baseLineY;
            shadedAreaPositions[shadedPosIndex++] = 0;

            // Indices for the two triangles forming the quad (v0, v1, v2, v3)
            // Triangle 1: v0, v2, v3 (top-left, bottom-left, bottom-right)
             shadedAreaIndices[shadedIdxIndex++] = baseVertexIndexForSegment;
             shadedAreaIndices[shadedIdxIndex++] = baseVertexIndexForSegment + 2;
             shadedAreaIndices[shadedIdxIndex++] = baseVertexIndexForSegment + 3;
             // Triangle 2: v0, v3, v1 (top-left, bottom-right, top-right)
             shadedAreaIndices[shadedIdxIndex++] = baseVertexIndexForSegment;
             shadedAreaIndices[shadedIdxIndex++] = baseVertexIndexForSegment + 3;
             shadedAreaIndices[shadedIdxIndex++] = baseVertexIndexForSegment + 1;
         }
     }

     // Clear unused positions for the shaded area
     for (let i = shadedPosIndex; i < MAX_HISTORY_POINTS * 4 * 3; i++) {
         shadedAreaPositions[i] = 0;
     }
     // Indices array is fixed size based on MAX_HISTORY_POINTS, just need to set draw range
      // No need to clear indices, just ensure draw range is correct.


    graphShadedAreaGeometry.attributes.position.needsUpdate = true;
    // graphShadedAreaGeometry.index.needsUpdate = true; // Index array is fixed, doesn't need per-frame update
    graphShadedAreaGeometry.setDrawRange(0, shadedIdxIndex); // Draw based on number of active indices


    // Update the position and visibility of the current point sphere
    if (vizMode === 'graph' && visibleHistory.length > 0) {
        // Position the sphere at the LAST visible point in history, which corresponds to the current data point
        const lastPointInHistory = visibleHistory[visibleHistory.length - 1];
        if (lastPointInHistory) {
            // The sphere position is the last point on the line
            // Find its calculated X position using the same logic as above
            const elapsedInWindow = lastPointInHistory.timestamp - windowStartTime;
            const windowDuration = HISTORY_WINDOW_MS;
            const xNorm = (windowDuration > 0) ? (elapsedInWindow / windowDuration) : 0;
            const xPos = xNorm * xRange - xRange / 2;
            pointMesh.position.set(xPos, lastPointInHistory.value, 0);
            pointMesh.visible = true;
             // Ensure point color matches dark/light mode
             if (pointMesh.material) {
                  pointMesh.material.color.setHex(darkModeEnabled ? 0xFFFFFF : 0x000000);
             }
        } else {
             pointMesh.visible = false; // Should not happen if visibleHistory.length > 0, but safe
        }

    } else {
        pointMesh.visible = false; // Hide sphere if not in graph mode or no visible history
    }

     // Ensure graph objects are visible only in graph mode (redundant with setVisualizationMode but safe)
     if (graphLine) graphLine.visible = (vizMode === 'graph');
     if (graphShadedAreaMesh) graphShadedAreaMesh.visible = (vizMode === 'graph');
     // pointMesh visibility handled above based on visibleHistory
}


// Helper function to calculate the y-value for the graph
// This now incorporates all manual multipliers
function updateGraphVisualsHelper(data) {
    if (!data) return 0.0;

    let plotValueBase = 0.5; // Default center value for the emotion/variety part
    let emotionFactor = { speedFactor: 1.0, colorVariety: 1.0, sizeVariety: 1.0, particleMovement: 1.0, apertureFactor: 1.0 };
    if (data.sessionEmotion) {
         emotionFactor = getEmotionFactor(data.sessionEmotion);
        // Combine factors that influence the "intensity/variety" feel
        // Using particleMovement and colorVariety as the primary drivers for graph shape
        let emotionCombinedRaw = (emotionFactor.particleMovement * 0.7 + emotionFactor.colorVariety * 0.3);

        // Apply intensity and variety multipliers to the emotion/variety combined value
        let emotionCombinedMultiplied = emotionCombinedRaw * manualIntensityMultiplier * 0.7 + emotionCombinedRaw * manualVarietyMultiplier * 0.3;

        // Map the multiplied emotion combined value to a 0-1 range for plot value base
        // Assuming the raw combined value might range from ~0.3 (sad/calm low multipliers) up to ~2.5 (angry/happy high multipliers)
        // Let's map this scaled range (0 to ~7.5 with multipliers) to a 0-1 base value.
        // Example mapping: 0 -> 0, 3 -> 0.5, 6 -> 1
        plotValueBase = Math.max(0, Math.min(1, emotionCombinedMultiplied / 6.0));


    }
     let sensorBoostRaw = 0;
     if (data.illuminance != null && typeof data.illuminance === 'number' && isFinite(data.illuminance)) {
        const minLogLux = Math.log(1);
        const maxLogLux = Math.log(10001);
        const logLux = Math.log(Math.max(1, data.illuminance + 1));
        const luxNorm = Math.min(1.0, Math.max(0.0, (logLux - minLogLux) / (maxLogLux - minLogLux)));
        sensorBoostRaw += luxNorm * 0.5;
     }
     if (data.decibels != null && typeof data.decibels === 'number' && isFinite(data.decibels)) {
         const decibelNorm = Math.min(1.0, Math.max(0.0, (data.decibels + 40) / 70.0));
         sensorBoostRaw += decibelNorm * 0.3;
     }
     // Check for photoTakenId as a boost trigger for the graph Y
     if (data.photoTakenId === 1 && typeof data.photoTakenId === 'number' && isFinite(data.photoTakenId)) {
         sensorBoostRaw += 0.5; // Add a boost for photo events
     }

      // Apply highlight multiplier ONLY to the sensor boost part, as it's meant to represent external "highlight" events
     const sensorBoostMultiplied = sensorBoostRaw * manualHighlightMultiplier;

     // Combine the base value (from emotion/variety) and the sensor boost (from sensor/highlight)
     const totalValue = plotValueBase + sensorBoostMultiplied; // Expected range might be 0 to ~1 + 0.5*3 = ~2.5

     // Map the total value (e.g., 0 to ~3.5 with multipliers) to the final Y range (-1 to 1)
     // Let's try mapping totalValue from 0 to 2 to -1 to 1, centering around 1.
     // Mapping: 0 -> -1, 1 -> 0, 2 -> 1
     const scaledY = Math.max(-1, Math.min(1, (totalValue - 1.0) / 1.0)); // Adjust scaling as needed

     return scaledY;
}


// Helper function to rebuild graph history upon seeking/reset/mode switch to graph
function rebuildGraphHistory(seekAbsoluteTimestamp) {
     console.log(`rebuildGraphHistory called for timestamp: ${seekAbsoluteTimestamp}`);
    if (sensorData.length === 0) {
        dataHistory = [];
         console.log("rebuildGraphHistory: sensorData is empty, history cleared.");
        return;
    }

    // seekAbsoluteTimestamp is already relative to the start of the data (timestamp 0)
    const windowStartTime = seekAbsoluteTimestamp - HISTORY_WINDOW_MS;
     console.log(`rebuildGraphHistory: Window start time: ${windowStartTime}`);

    dataHistory = [];
    // Find the index to start searching from. Efficiently jump close to windowStartTime.
    let startIndex = 0;
    // Use binary search or a simple loop
    for(let i = 0; i < sensorData.length; i++) {
        if (sensorData[i].timestamp >= windowStartTime) {
             // Found the first point >= windowStartTime, go back a few points just in case interpolation is needed or window boundary is tricky
            startIndex = Math.max(0, i - 2); // Go back a couple indices
            break;
        }
         // If we reach the end and all timestamps are before windowStartTime, start from the beginning.
         if (i === sensorData.length - 1) startIndex = 0;
    }
    // Ensure startIndex is not past the end
    startIndex = Math.min(startIndex, sensorData.length - 1);
     // If data is empty after filtering, startIndex could be -1 or sensorData.length. Ensure it's valid.
     if (sensorData.length === 0) startIndex = 0;
     console.log(`rebuildGraphHistory: Starting search from index: ${startIndex}`);


    // Add points within the history window up to the seek target timestamp
    for (let i = startIndex; i < sensorData.length; i++) {
        const row = sensorData[i];
         // Only add points strictly less than or equal to the seek time AND within the window
        if (row.timestamp >= windowStartTime && row.timestamp <= seekAbsoluteTimestamp) {
             const scaledY = updateGraphVisualsHelper(row); // Calculate Y value for this historical point using CURRENT multipliers
             dataHistory.push({ timestamp: row.timestamp, value: scaledY });
        } else if (row.timestamp > seekAbsoluteTimestamp) {
            // Data is sorted by timestamp, stop searching once we pass the seek time
            break;
        }
    }

    // Ensure history doesn't exceed max points
    if (dataHistory.length > MAX_HISTORY_POINTS) {
         dataHistory = dataHistory.slice(dataHistory.length - MAX_HISTORY_POINTS);
     }
     // Ensure dataHistory is sorted by timestamp (should be if sensorData is sorted and logic is correct)
     dataHistory.sort((a, b) => a.timestamp - b.timestamp);

     console.log(`rebuildGraphHistory: Rebuilt graph history for time ${seekAbsoluteTimestamp} ms. Found ${dataHistory.length} points.`);
}

// Modify handleSeekBarInput
function handleSeekBarInput() {
    isSeeking = true;
    const seekTimeMs = parseFloat(seekBar.value);
    currentTimeDisplay.textContent = formatTime(seekTimeMs);
     console.log(`handleSeekBarInput: Seeking to ${seekTimeMs} ms`);

    if (sensorData.length > 0) {
         // Find the data index closest to the seeked time (last index <= target time)
         const seekTargetElapsedCsvTime = parseFloat(seekBar.value);
         let tempIndex = 0;

         // Find the last index whose timestamp is <= seekTargetElapsedCsvTime
         for (let i = 0; i < sensorData.length; i++) {
             if (sensorData[i].timestamp <= seekTargetElapsedCsvTime) {
                 tempIndex = i;
             } else {
                 break; // Assumes data is sorted by timestamp
             }
         }
        tempIndex = Math.max(0, Math.min(sensorData.length - 1, tempIndex));
        console.log(`handleSeekBarInput: Found index ${tempIndex} for time ${seekTargetElapsedCsvTime} ms`);


        const currentRow = sensorData[tempIndex];
        if (currentRow) {
             // Update data display immediately
             let dataStr = "";
             const keysToShow = ['timestamp', 'sessionColor', 'sessionEmotion', 'temperature_celsius', 'illuminance', 'decibels', 'accelY', 'steps_in_interval', 'photoTakenId'];
             for(const key of keysToShow){
                 if(currentRow[key] !== undefined && currentRow[key] !== null){
                     let value = currentRow[key];
                      if (typeof value === 'number' && isFinite(value)) {
                         if (!Number.isInteger(value)) {
                             value = value.toFixed(2);
                         }
                         if(key === 'temperature_celsius') value += ' °C';
                         if(key === 'decibels') value += ' dB';
                         if(key === 'timestamp') value = formatTime(value); // Format timestamp for display
                     } else if (typeof value === 'string') {
                          value = value.trim(); // Clean up string values
                     }
                     dataStr += `${key}: ${value}\n`;
                 }
             }
             currentDataDisplay.innerHTML = `<pre>${dataStr}</pre>`;

             // Update visualization visuals based on current mode while seeking
             // When seeking, we update the visuals to reflect the state at the seeked time.
             // If paused, this also triggers a manual render.
             if (vizMode === 'shader') {
                  updateShaderVisuals(currentRow); // Passes current multipliers automatically
                   // Shader uTime should reflect the seek position when scrubbing
                  if (bgShaderMaterial && bgShaderMaterial.uniforms.uTime) {
                      bgShaderMaterial.uniforms.uTime.value = seekTargetElapsedCsvTime / 1000.0; // Set based on elapsed time in seconds
                       // Don't update lastFrameTime here, only in animate
                  }
                  if (!isPlaying) { // Render immediately if paused
                      console.log("handleSeekBarInput: Rendering shader scene (paused/seeking).");
                      renderer.clear();
                      renderer.render(backgroundScene, backgroundCamera);
                  }
             } else if (vizMode === 'graph') {
                 // Rebuild history up to the seeked point using the seek target time
                 // Use the actual timestamp of the currentRow for rebuilding history to be accurate
                 rebuildGraphHistory(currentRow.timestamp);
                 // Update graph geometry based on the history and the data point at the seeked time (for pointMesh)
                 updateGraphVisuals(currentRow);
                  if (!isPlaying) { // Render immediately if paused
                       console.log("handleSeekBarInput: Rendering graph scene (paused/seeking).");
                       renderer.clear();
                       renderer.render(scene, camera);
                  }
             } else { // vizMode === 'particles'
                  // On seek input, update uniforms but don't emit/move particles.
                  // Particles are cleared and reset on seek *change* or play.
                 updateParticleVisuals(currentRow, 0); // Pass 0 deltaTime, no emission while seeking
                  // Particle uTime should also reflect the seek position when scrubbing
                 if (particleMaterial && particleMaterial.uniforms.uTime) {
                      particleMaterial.uniforms.uTime.value = seekTargetElapsedCsvTime / 1000.0; // Set based on elapsed time in seconds
                 }
                  if (!isPlaying) { // Render immediately if paused
                       console.log("handleSeekBarInput: Rendering particle scene (paused/seeking).");
                       renderer.clear();
                       renderer.render(scene, camera);
                  }
             }

             // Audio params are updated but gain should be 0 due to isSeeking (controlled in updateAudio)
             const emotionFactor = getEmotionFactor(currentRow.sessionEmotion);
             updateAudio(currentRow, emotionFactor);
        }
    }
}

// Modify handleSeekBarChange
function handleSeekBarChange() {
     console.log("handleSeekBarChange called.");
    isSeeking = false; // End seeking
    if (sensorData.length === 0) {
        console.warn("handleSeekBarChange: No data loaded, returning.");
        return;
    }

    const seekTargetElapsedCsvTime = parseFloat(seekBar.value); // This is relative to start (0)

    // Find the data index closest to the seeked time (last index <= target)
    let newIndex = 0;
     for (let i = 0; i < sensorData.length; i++) {
         if (sensorData[i].timestamp <= seekTargetElapsedCsvTime) {
             newIndex = i;
         } else {
             break; // Assumes data is sorted by timestamp
         }
     }
    newIndex = Math.max(0, Math.min(sensorData.length - 1, newIndex));
    currentIndex = newIndex;
     console.log(`handleSeekBarChange: Seeked to index ${currentIndex} at timestamp ${sensorData[currentIndex].timestamp} ms`);


    // Reset actual start time based on the new currentIndex's timestamp
    // actualStartTime = performance.now() - (sensorData[currentIndex].timestamp / playbackSpeed);
    // Correction: actualStartTime should be calculated relative to the *start* of the CSV data (timestamp 0).
    // So, performance.now() - (elapsed_time_in_csv / playbackSpeed)
    actualStartTime = performance.now() - (seekTargetElapsedCsvTime / playbackSpeed);
     console.log(`handleSeekBarChange: actualStartTime recalculated to ${actualStartTime}.`);


    // Rebuild graph history for the new seek point regardless of mode
     // Use the actual timestamp of the current data point for rebuilding history
    rebuildGraphHistory(sensorData[currentIndex].timestamp);

     // Clear particles on seek change
     clearParticles();
     if (particleMaterial && particleMaterial.uniforms.uTime) {
         // Align particle shader time with the seeked position
         particleMaterial.uniforms.uTime.value = sensorData[currentIndex].timestamp / 1000.0; // Convert ms to seconds
     }


    // Update visuals and audio for the new current point
    if (sensorData[currentIndex]) {
      lastProcessedTimestamp = sensorData[currentIndex].timestamp; // Update last processed timestamp (relative elapsed time)
      const currentRow = sensorData[currentIndex];
      console.log(`handleSeekBarChange: Updating visuals/audio for data point at index ${currentIndex}.`);


      if (vizMode === 'shader') {
        updateShaderVisuals(currentRow);
         // Reset shader uTime as it's tied to playback start/seek
        if (bgShaderMaterial && bgShaderMaterial.uniforms.uTime) {
            bgShaderMaterial.uniforms.uTime.value = currentRow.timestamp / 1000.0; // Set based on elapsed time in seconds
            delete bgShaderMaterial.uniforms.uTime.lastFrameTime; // Clear last frame time to ensure animate calculates delta correctly
        }
      } else if (vizMode === 'graph') {
        updateGraphVisuals(currentRow);
      } else { // vizMode === 'particles'
         updateParticleVisuals(currentRow, 0); // Update uniforms for current state, no emission yet
         // Particle uTime is already set above
      }
       // Audio parameters update, but gain is controlled by isPlaying/isSeeking state
       const emotionFactor = getEmotionFactor(currentRow.sessionEmotion);
       updateAudio(currentRow, emotionFactor);
    }

    if (isPlaying) {
         console.log("handleSeekBarChange: Resuming playback.");
        // Restart animation loop if it was paused for seeking (shouldn't happen with current logic)
        if (animationFrameId === null) { // If animation was stopped (e.g., by seeking at the end)
             // Reset lastFrameTime for animate delta calculation upon resuming
            animate.lastFrameTime = performance.now();
             animate(); // Request next frame to restart the loop
        }

         // Audio resume/fade in logic remains the same as playAnimation, triggered if isPlaying is true after seek
        if (isAudioInitialized && audioContext && audioContext.state === 'suspended') {
             audioContext.resume().then(() => {
                  console.log("AudioContext resumed successfully after seek.");
                  if (gainNode) {
                      // Ensure target gain is correct for the current state (isPlaying, not seeking)
                      // Let's use currentAudioParams.gain which reflects the last *intended* non-zero gain
                      const targetGain = isPlaying && !isSeeking ? Math.min(0.15, Math.max(0, currentAudioParams.gain || 0.02)) : 0;

                      gainNode.gain.cancelScheduledValues(audioContext.currentTime); // Clear any pending fades
                      gainNode.gain.setValueAtTime(gainNode.gain.value, audioContext.currentTime);
                      gainNode.gain.linearRampToValueAtTime(targetGain, audioContext.currentTime + 0.2);
                       currentAudioParams.gain = targetGain; // Update state to the new target
                       console.log("Audio gain faded in after seek resume.");
                  }
             }).catch(e => console.error("Error resuming AudioContext:", e));
         } else if (isAudioInitialized && audioContext && audioContext.state === 'running') {
              // If already running, fade gain back in in case it was muted during seeking
             if (gainNode) {
                 // Recalculate intended gain for the current state (isPlaying, not seeking)
                  const targetGain = isPlaying && !isSeeking ? Math.min(0.15, Math.max(0, currentAudioParams.gain || 0.02)) : 0;

                 gainNode.gain.cancelScheduledValues(audioContext.currentTime); // Clear any pending fades
                  gainNode.gain.setValueAtTime(gainNode.gain.value, audioContext.currentTime);
                  gainNode.gain.linearRampToValueAtTime(targetGain, audioContext.currentTime + 0.2);
                  currentAudioParams.gain = targetGain; // Update state
                  console.log("Audio gain faded in after seek while running.");
             }
         }


    } else {
         console.log("handleSeekBarChange: Not playing, rendering updated state.");
        // Not playing, render the updated state at the seeked position
        renderer.clear();
        if (vizMode === 'shader') {
             renderer.render(backgroundScene, backgroundCamera);
        } else {
             renderer.render(scene, camera);
        }
    }
}


// Modify animate function
function animate() {
    // Calculate delta time for this frame
    const now = performance.now();
    const deltaTime = (now - (animate.lastFrameTime || now)) / 1000.0; // Delta in seconds
    animate.lastFrameTime = now; // Store for next frame
    animate.deltaTime = deltaTime; // Store delta time globally for emitters


    if (!isPlaying) {
         // If paused, we still need to render the current state if something changed (e.g. multiplier slider moved)
         // But we don't advance time or data index here.
         // Rendering is triggered by the change handlers (pauseAnimation, handleSeekBar*, updateMultiplierDisplay).
         // We need to cancel the animation frame *if* the loop is still running after pause.
         if (animationFrameId !== null) {
              cancelAnimationFrame(animationFrameId);
              animationFrameId = null;
              console.log("Animation loop stopped due to isPlaying = false.");
         }
         return; // Exit if not playing
    }
    animationFrameId = requestAnimationFrame(animate);


    const performanceNow = performance.now();
    // Elapsed time since actualStartTime, scaled by playback speed
    const currentElapsedTargetMs = (performanceNow - actualStartTime) * playbackSpeed;

    // Ensure currentElapsedTargetMs doesn't exceed total duration
     const totalDurationMs = sensorData.length > 0 ? sensorData[sensorData.length - 1].timestamp : 0;
     const cappedElapsedTargetMs = Math.min(totalDurationMs, currentElapsedTargetMs);

    // Find the index corresponding to the capped time target
    let nextIndex = currentIndex;
     if (sensorData.length > 0) {
          // Find the last index whose timestamp is less than or equal to the capped target time.
          // This ensures we always process the data point that represents the state *at or just before* the current time.
          // Optimized search: start from current index or slightly before
          let searchStartIndex = Math.max(0, currentIndex - 2); // Look back a couple frames

          for (let i = searchStartIndex; i < sensorData.length; i++) {
              if (sensorData[i].timestamp <= cappedElapsedTargetMs) {
                  nextIndex = i;
              } else {
                  // Since data is sorted, we found the last index <= target
                  break;
              }
          }
           // Ensure nextIndex is within bounds
          nextIndex = Math.max(0, Math.min(sensorData.length - 1, nextIndex));
     }


    const indexChanged = (nextIndex !== currentIndex);

    // Process data point if index changed or it's the very first step from 0 and time has advanced
    if (indexChanged || (currentIndex === 0 && lastProcessedTimestamp === 0 && cappedElapsedTargetMs > 0)) {
         // console.log(`Index changed from ${currentIndex} to ${nextIndex} at target time ${cappedElapsedTargetMs} ms.`);
        currentIndex = nextIndex;
        const currentRow = sensorData[currentIndex];
        if (currentRow) {
            // Update visuals based on current mode
            if (vizMode === 'shader') {
                updateShaderVisuals(currentRow); // Shader uniforms lerp towards new values
            } else if (vizMode === 'graph') {
                 // Add current point to history *before* updating graph geometry
                const scaledY = updateGraphVisualsHelper(currentRow); // Calculate value using current multipliers
                const currentTimestamp = currentRow.timestamp; // Already relative to start
                // Filter old points from history *before* adding the new one
                const windowStartTime = currentTimestamp - HISTORY_WINDOW_MS;
                // Filter history: Keep points within the window *and* up to the current timestamp
                dataHistory = dataHistory.filter(point => point.timestamp >= windowStartTime); // Remove old points
                 // Check if the current point is already the last point in history to avoid duplicates on index jumps
                 if (dataHistory.length === 0 || dataHistory[dataHistory.length - 1].timestamp < currentTimestamp) {
                     dataHistory.push({ timestamp: currentTimestamp, value: scaledY }); // Add current point
                 }
                 // Cap history size
                 if (dataHistory.length > MAX_HISTORY_POINTS) {
                     dataHistory = dataHistory.slice(dataHistory.length - MAX_HISTORY_POINTS);
                 }
                updateGraphVisuals(currentRow); // Update graph geometry based on the new history
            } else { // vizMode === 'particles'
                 // updateParticleVisuals handles uniform updates and particle emission based on isPlaying
                 updateParticleVisuals(currentRow, deltaTime);
            }

            // Update audio regardless of mode
            const emotionFactor = getEmotionFactor(currentRow.sessionEmotion);
            updateAudio(currentRow, emotionFactor);

            lastProcessedTimestamp = currentRow.timestamp; // Update last processed timestamp (relative elapsed time)
        }
    } else {
         // Index hasn't changed, but need to update visuals that depend on continuous time (shaders, particles)
         // Also, update audio parameters even if index hasn't strictly changed, as lerping happens over time.

          if (sensorData.length > 0 && currentIndex >= 0) {
             const currentRow = sensorData[currentIndex];

               // Update shader uTime if in shader mode
             if (vizMode === 'shader' && bgShaderMaterial && bgShaderMaterial.uniforms.uTime) {
                   bgShaderMaterial.uniforms.uTime.value = cappedElapsedTargetMs / 1000.0; // Set shader time based on elapsed playback time
             }
               // Update particle uTime and emit particles if in particle mode
             if (vizMode === 'particles') {
                 if (particleMaterial && particleMaterial.uniforms.uTime) {
                     particleMaterial.uniforms.uTime.value = cappedElapsedTargetMs / 1000.0;
                 }
                 // Need to call updateParticleVisuals to emit particles based on current data and deltaTime
                 updateParticleVisuals(currentRow, deltaTime); // Pass deltaTime for emission logic
              }

             // Update audio parameters based on the current data point state
             const emotionFactor = getEmotionFactor(currentRow.sessionEmotion);
             updateAudio(currentRow, emotionFactor);
          }
    }


    // Update seek bar and time display regardless of mode
    // Only update if not currently seeking (user is dragging the bar)
    if (!isSeeking && sensorData.length > 0) {
        // The time displayed/seeked should reflect the *target* time based on playback,
        // which is cappedElapsedTargetMs.
        seekBar.value = Math.max(0, Math.min(parseFloat(seekBar.max), cappedElapsedTargetMs));
        currentTimeDisplay.textContent = formatTime(cappedElapsedTargetMs);
    }

    // Render based on current mode
    renderer.clear(); // Clear the buffer
    if (vizMode === 'shader') {
        renderer.render(backgroundScene, backgroundCamera); // Render shader scene
    } else { // vizMode === 'graph' or vizMode === 'particles'
        renderer.render(scene, camera); // Render graph or particle scene
    }

    // Animation end check
    // Check if the capped target time has reached or exceeded the total duration AND we are playing
    if (isPlaying && totalDurationMs > 0 && currentElapsedTargetMs >= totalDurationMs) { // Use currentElapsedTargetMs here, not capped, to trigger *exactly* when time runs out
        console.log("Animation reached end.");
        // Move to the very last data point for the final state update
        currentIndex = sensorData.length - 1;
        const lastRow = sensorData[currentIndex];

        // Update visuals for the very last frame
        if (vizMode === 'shader') {
             updateShaderVisuals(lastRow);
        } else if (vizMode === 'graph') {
            rebuildGraphHistory(lastRow.timestamp); // Rebuild history up to end
            updateGraphVisuals(lastRow); // Update graph
        } else { // vizMode === 'particles'
             updateParticleVisuals(lastRow, deltaTime); // Update uniforms, final emission/state
        }

        // Update audio for the last frame
        const emotionFactor = getEmotionFactor(lastRow.sessionEmotion);
        updateAudio(lastRow, emotionFactor);

         // Ensure seek bar is at the very end
        seekBar.value = totalDurationMs;
        currentTimeDisplay.textContent = formatTime(totalDurationMs);

        // Render the final state
         renderer.clear();
         if (vizMode === 'shader') {
              renderer.render(backgroundScene, backgroundCamera);
         } else {
              renderer.render(scene, camera);
         }

        // Then pause
        pauseAnimation();
        resetButton.disabled = false; // Enable reset after playback finishes
    }
}
// Static properties for animate
animate.lastFrameTime = 0;
animate.deltaTime = 0;


// --- Dark Mode and Customization ---

function setInitialTheme() {
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        enableDarkMode();
    } else {
        disableDarkMode();
    }
}

function toggleDarkMode() {
    if (darkModeEnabled) {
        disableDarkMode();
    } else {
        enableDarkMode();
    }
}

function enableDarkMode() {
    document.body.classList.add('dark-mode');
     document.documentElement.setAttribute('data-theme', 'dark'); // Apply data-theme attribute
    darkModeEnabled = true;
    toggleDarkModeButton.querySelector('.material-symbols-outlined').textContent = 'light_mode';
    toggleDarkModeButton.title = 'Switch to Light Mode';
    // Update graph colors for dark mode
    if (graphMaterial) graphMaterial.color.setHex(0xBB86FC); // Brighter purple for dark mode
    if (graphShadedAreaMaterial) graphShadedAreaMaterial.color.setHex(0xBB86FC); // Match line color
    if (pointMesh && pointMesh.material) pointMesh.material.color.setHex(0xFFFFFF); // White point
     // If data is loaded and not playing/seeking, re-render to show color change
     if (!isPlaying && !isSeeking && sensorData.length > 0 && currentIndex >= 0 && vizMode === 'graph') {
          updateGraphVisuals(sensorData[currentIndex]); // Forces color update and render
          renderer.clear();
          renderer.render(scene, camera);
     }
}

function disableDarkMode() {
    document.body.classList.remove('dark-mode');
    document.documentElement.removeAttribute('data-theme'); // Remove data-theme attribute
    darkModeEnabled = false;
    toggleDarkModeButton.querySelector('.material-symbols-outlined').textContent = 'dark_mode';
    toggleDarkModeButton.title = 'Switch to Dark Mode';
    // Reset graph colors to light mode defaults
    if (graphMaterial) graphMaterial.color.setHex(0x8844EE); // Original purple for light mode
    if (graphShadedAreaMaterial) graphShadedAreaMaterial.color.setHex(0x8844EE); // Match line color
     if (pointMesh && pointMesh.material) pointMesh.material.color.setHex(0x000000); // Black point for light mode contrast
     // If data is loaded and not playing/seeking, re-render to show color change
     if (!isPlaying && !isSeeking && sensorData.length > 0 && currentIndex >= 0 && vizMode === 'graph') {
         updateGraphVisuals(sensorData[currentIndex]); // Forces color update and render
         renderer.clear();
         renderer.render(scene, camera);
     }
}

function toggleCustomizationPanel() {
    customizationPanelVisible = !customizationPanelVisible;
    customizationPanel.classList.toggle('visible', customizationPanelVisible);
     customizationPanel.classList.toggle('hidden', !customizationPanelVisible);
    // Also ensure the button has the correct icon based on state
    toggleCustomizationButton.querySelector('.material-symbols-outlined').textContent = customizationPanelVisible ? 'close' : 'tune';
}

function updateMultiplierDisplay(event) {
     console.log("updateMultiplierDisplay called.");
    const sliderId = event.target.id;
    const value = parseFloat(event.target.value);

    switch(sliderId) {
        case 'intensityMultiplier':
            manualIntensityMultiplier = value;
            intensityValueDisplay.textContent = value.toFixed(1);
            break;
        case 'varietyMultiplier':
            manualVarietyMultiplier = value;
            varietyValueDisplay.textContent = value.toFixed(1);
            break;
        case 'highlightMultiplier':
            manualHighlightMultiplier = value;
            highlightValueDisplay.textContent = value.toFixed(1);
            // Note: Highlight multiplier affects BOTH shader and graph Y value calculation, and particle color/emission
            break;
    }

    // Update visualization if not playing/seeking and data is loaded
     if (!isPlaying && !isSeeking && sensorData.length > 0 && currentIndex >= 0) {
         const currentRow = sensorData[currentIndex];
         console.log("updateMultiplierDisplay: Updating visuals for paused/seeking state.");
         if (vizMode === 'shader') {
             // Recalculate shader uniforms based on the *current* data row and *new* multipliers
             updateShaderVisuals(currentRow);
         } else if (vizMode === 'graph') {
             // Rebuild history with the new multiplier values affecting Y calculation
             rebuildGraphHistory(currentRow.timestamp); // Recalculates Y for history points
             // Update graph visuals based on the current history and point
             updateGraphVisuals(currentRow); // Redraws geometry
         } else { // vizMode === 'particles'
             // For particles, update uniforms that depend on multipliers (e.g. uSpeedFactor implicitly via lerp)
             // And update particle parameters *on re-emission*.
             // Manual multipliers affect parameters calculated inside emitParticles.
             // Calling updateParticleVisuals here will update uniforms like uSpeedFactor
             // and if isPlaying were true, it would also emit particles with the new params.
             // When paused, emission is skipped, but uniforms are updated.
             updateParticleVisuals(currentRow, 0); // Pass 0 deltaTime to avoid uTime change, update uniforms
         }
          // Always render after multiplier change if paused and data loaded
          renderer.clear();
          if (vizMode === 'shader') {
               renderer.render(backgroundScene, backgroundCamera);
           } else {
               renderer.render(scene, camera);
           }
     }
}

// Initialize multiplier displays on load
document.addEventListener('DOMContentLoaded', () => {
     intensityValueDisplay.textContent = intensityMultiplierSlider.value;
     varietyValueDisplay.textContent = varietyMultiplierSlider.value;
     highlightValueDisplay.textContent = highlightMultiplierSlider.value;
});


// Helper functions (parseSessionColor, getEmotionFactor, formatTime, initAudio, updateAudio)
// These are already in the original code and don't need mode-specific changes, just ensure they are called correctly.
// updateAudio is called in animate and handleSeekBarChange/Input, which is correct.

function parseSessionColor(colorName) {
    switch (colorName) {
        case "黄": return { r: 0.98, g: 0.85, b: 0.3 }; // より鮮やかに調整
        case "赤": return { r: 0.98, g: 0.25, b: 0.25 }; // より鮮やかに調整
        case "青": return { r: 0.25, g: 0.6, b: 0.98 }; // より鮮やかに調整
        case "緑": return { r: 0.3, g: 0.95, b: 0.4 }; // より鮮やかに調整
        case "紫": return { r: 0.8, g: 0.4, b: 0.95 }; // より鮮やかに調整
        default: return { r: 0.5, g: 0.5, b: 0.7 }; // デフォルト調整
    }
}

function getEmotionFactor(emotionName) {
    // 各係数の影響度をさらに上げる
    switch (emotionName) {
        case "楽しい": return { speedFactor: 2.0, colorVariety: 2.5, sizeVariety: 1.5, particleMovement: 2.2, apertureFactor: 1.5 };
        case "悲しい": return { speedFactor: 0.4, colorVariety: 0.1, sizeVariety: 0.6, particleMovement: 0.2, apertureFactor: 0.6 };
        case "怒り":   return { speedFactor: 3.0, colorVariety: 2.0, sizeVariety: 1.8, particleMovement: 3.5, apertureFactor: 1.8 };
        case "穏やか": return { speedFactor: 0.6, colorVariety: 0.4, sizeVariety: 0.8, particleMovement: 0.5, apertureFactor: 0.8 };
        default:     return { speedFactor: 1.0, colorVariety: 1.0, sizeVariety: 1.0, particleMovement: 1.0, apertureFactor: 1.0 };
    }
}

function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    console.log(`onWindowResize: Resizing to ${width}x${height}`);

    if (camera && renderer && backgroundCamera) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        // Orthographic camera for background doesn't need aspect update, but size might if it wasn't fixed -1 to 1
        // backgroundCamera.left = -1;
        // backgroundCamera.right = 1;
        // backgroundCamera.top = 1;
        // backgroundCamera.bottom = -1;
        // backgroundCamera.updateProjectionMatrix(); // This is already set correctly in init

        renderer.setSize(width, height);

        // Update visuals for the current frame after resize
        // Only render if not playing and not seeking, and data exists
        if (!isPlaying && !isSeeking && sensorData.length > 0 && currentIndex >= 0) {
             const currentRow = sensorData[currentIndex];
             console.log("onWindowResize: Rendering current state after resize.");
             if (vizMode === 'shader') {
                  updateShaderVisuals(currentRow);
             } else if (vizMode === 'graph') { // vizMode === 'graph'
                 // Recalculate graph geometry with new aspect ratio affecting X range
                 // No need to rebuild history, just update the geometry using the existing history
                 updateGraphVisuals(currentRow); // This recalculates positions based on current aspect
             } else { // vizMode === 'particles'
                 // Particle positions are calculated in the shader relative to origin, camera doesn't change their relative positions.
                 // Point size might be affected by projection, but shader handles sizeAttenuation.
                 // No specific updateParticleVisuals call needed *because* of resize itself, unless it affects parameters calculation.
                 // Ensure uniforms are up-to-date with current data/multipliers if paused
                 updateParticleVisuals(currentRow, 0); // Pass 0 deltaTime
             }
             renderer.clear(); // Clear before rendering
             if (vizMode === 'shader') {
                  renderer.render(backgroundScene, backgroundCamera);
             } else {
                  renderer.render(scene, camera);
             }
        } else if (!isPlaying && !isSeeking) {
           // If no data, render the default scene based on mode
             console.log("onWindowResize: Rendering default state after resize (no data).");
             renderer.clear();
             if (vizMode === 'shader') {
                 renderer.render(backgroundScene, backgroundCamera);
             } else {
                  // Graph or Particle mode with no data: render empty scene
                  if (vizMode === 'graph') {
                      if (graphGeometry) graphGeometry.setDrawRange(0, 0);
                       if (graphShadedAreaGeometry) graphShadedAreaGeometry.setDrawRange(0, 0);
                      if (pointMesh) pointMesh.visible = false;
                      if (graphLine) graphLine.visible = true;
                      if (graphShadedAreaMesh) graphShadedAreaMesh.visible = true;
                  } else if (vizMode === 'particles') {
                       clearParticles(); // Ensure no particles shown
                       if (particleSystem) particleSystem.visible = true; // Keep object visible but empty
                  }
                  renderer.render(scene, camera);
             }
        }
    }
}

function initAudio() {
    if (isAudioInitialized) return;
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        oscillator = audioContext.createOscillator();
        gainNode = audioContext.createGain();
        filterNode = audioContext.createBiquadFilter();

        oscillator.type = 'sine'; // 初期はサイン波
        oscillator.frequency.setValueAtTime(currentAudioParams.frequency, audioContext.currentTime);

        filterNode.type = "lowpass";
        filterNode.frequency.setValueAtTime(currentAudioParams.filterFreq, audioContext.currentTime);
        filterNode.Q.setValueAtTime(currentAudioParams.filterQ, audioContext.currentTime);

        gainNode.gain.setValueAtTime(0, audioContext.currentTime); // 初期ゲインはゼロ

        oscillator.connect(filterNode);
        filterNode.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.start(); // オシレーターは起動したまま周波数などを変更する
        isAudioInitialized = true;
         console.log("AudioContext Initialized.");

         // User interaction is needed to resume context if suspended
         if (audioContext.state === 'suspended') {
             console.log("AudioContext is suspended. User interaction (e.g., clicking play) is required to resume.");
         }

    } catch (e) {
        console.error("Error initializing audio:", e);
         isAudioInitialized = false; // 初期化失敗フラグ
         // Disable audio controls or show message if initialization fails completely?
    }
}

// Helper to calculate the target gain value based on data (excluding isPlaying/isSeeking state)
function getAudioTargetGain(data, emotionFactor) {
     let targetGain = 0.02; // Base gain

     // Decibels -> Gain
     if (data && data.decibels != null && typeof data.decibels === 'number' && isFinite(data.decibels)) {
         const decibelNorm = Math.min(1, Math.max(0, (data.decibels + 40) / 70.0)); // -40dB to 30dB map to 0-1
         targetGain += decibelNorm * 0.06; // Add up to 0.06 to base gain
     }

     // Emotion -> Gain multiplier (using apertureFactor)
     if (emotionFactor) {
          targetGain *= (emotionFactor.apertureFactor || 1.0);
     }

     // Clamp final gain (before considering play/seek state)
     return Math.min(0.15, Math.max(0, targetGain));
}


function updateAudio(data, emotionFactor) {
    // Only update audio parameters if initialized and data exists
    if (!isAudioInitialized || !audioContext || audioContext.state === 'closed' || !data) {
         // Ensure gain is zero if audio is not initialized or data is missing/invalid
         if (isAudioInitialized && gainNode) {
              gainNode.gain.setTargetAtTime(0, audioContext.currentTime, 0.1);
               currentAudioParams.gain = 0;
         }
         return;
    }

    const currentTime = audioContext.currentTime;
    const smoothTime = 0.05; // Parameter change smoothness (seconds)

    // Data-based parameter calculation
    let targetFreq = 440; // Default frequency (A4)
    let targetFilterFreq = 2500; // Default filter frequency
    let targetFilterQ = 1; // Default Q value
    // Base gain is calculated by getAudioTargetGain, then adjusted based on state

    // Temperature -> Frequency
    if (data.temperature_celsius != null && typeof data.temperature_celsius === 'number' && isFinite(data.temperature_celsius)) {
        const tempNorm = Math.min(1, Math.max(0, (data.temperature_celsius - 10) / 25)); // 10°C -> 0, 35°C -> 1
        targetFreq = 220 + tempNorm * 660; // 220Hz (A3) から 880Hz (A5) の範囲で変化
    }

    // Decibels -> Filter frequency
    if (data.decibels != null && typeof data.decibels === 'number' && isFinite(data.decibels)) {
        // -40dB to 30dB map to 0-1
        const decibelNorm = Math.min(1, Math.max(0, (data.decibels + 40) / 70.0));
        targetFilterFreq = 2000 + decibelNorm * 3000; // 2000Hz to 5000Hz
    }

    // Emotion -> Oscillator type, filter parameters, multipliers
    // Use emotionFactor directly for timbre/pitch/filter characteristics.
     if (oscillator) { // Check if oscillator exists before changing type
         switch (data.sessionEmotion) {
             case "楽しい":
                 oscillator.type = 'triangle';
                 targetFreq *= (1.0 + (emotionFactor.speedFactor - 1.0) * 0.2); // SpeedFactor influences pitch slightly
                 targetFilterFreq = 4000 + (emotionFactor.particleMovement - 1.0) * 1000; // Movement influences filter
                 targetFilterQ = 1.5 + (emotionFactor.sizeVariety - 1.0) * 0.5; // Size influences Q
                 break;
             case "悲しい":
                 oscillator.type = 'sine';
                 targetFreq *= (1.0 - (1.0 - emotionFactor.speedFactor) * 0.2); // Inverse speed for sadness pitch?
                 targetFilterFreq = 800 + (1.0 - emotionFactor.colorVariety) * 500; // Color variety influences filter
                 targetFilterQ = 0.9;
                 break;
             case "怒り":
                 oscillator.type = 'sawtooth';
                 targetFreq *= (1.0 + (emotionFactor.speedFactor - 1.0) * 0.3);
                 targetFilterFreq = 2500 + (emotionFactor.speedFactor - 1.0) * 1500 + Math.random() * 500; // Speed + random for filter
                 targetFilterQ = 3 + (emotionFactor.particleMovement - 1.0) * 2 + Math.random() * 1; // Movement + random for Q
                 break;
             case "穏やか":
                 oscillator.type = 'sine';
                 targetFreq *= (1.0 - (1.0 - emotionFactor.speedFactor) * 0.1);
                 targetFilterFreq = 1800 + (emotionFactor.speedFactor - 1.0) * 500;
                 targetFilterQ = 1.2;
                 break;
             default: // Other/Default
                 oscillator.type = 'sine';
                 targetFilterFreq = 2500;
                 targetFilterQ = 1.0;
                 break;
         }
     }


    // Apply parameters smoothly, clamp values
    const finalFreq = Math.max(50, Math.min(10000, targetFreq));
    if (oscillator && finalFreq !== currentAudioParams.frequency) {
        oscillator.frequency.setTargetAtTime(finalFreq, currentTime, smoothTime);
        currentAudioParams.frequency = finalFreq;
    }

    const finalFilterFreq = Math.max(100, Math.min(8000, targetFilterFreq));
    if (filterNode && finalFilterFreq !== currentAudioParams.filterFreq) {
        filterNode.frequency.setTargetAtTime(finalFilterFreq, currentTime, smoothTime);
         currentAudioParams.filterFreq = finalFilterFreq;
    }

    const finalFilterQ = Math.max(0.1, Math.min(10, targetFilterQ));
    if (filterNode && finalFilterQ !== currentAudioParams.filterQ) {
        filterNode.Q.setTargetAtTime(finalFilterQ, currentTime, smoothTime);
         currentAudioParams.filterQ = finalFilterQ;
    }

    // Calculate target gain considering data and emotion *before* state check
    const calculatedTargetGainFromData = getAudioTargetGain(data, emotionFactor);

    // Apply gain smoothly, based on play/seek state
    const finalGain = isPlaying && !isSeeking ? calculatedTargetGainFromData : 0;
    if (gainNode && finalGain !== currentAudioParams.gain) {
         // Use linearRampToValueAtTime for smoother fade in/out than setTargetAtTime for large changes
         if (Math.abs(finalGain - gainNode.gain.value) > 0.01) { // Only ramp if there's a significant change
             gainNode.gain.cancelScheduledValues(currentTime); // Clear any pending ramps
             gainNode.gain.setValueAtTime(gainNode.gain.value, currentTime); // Start ramp from current value
             gainNode.gain.linearRampToValueAtTime(finalGain, currentTime + smoothTime);
         } else {
              // If change is small, set instantly or use setTargetAtTime with very short time
              gainNode.gain.setValueAtTime(finalGain, currentTime);
         }

        currentAudioParams.gain = finalGain; // Update state to the *actual* target gain (0 or calculated)
    }


    // steps_in_interval sound effect
    // Only trigger if steps > 0 and we haven't triggered recently (debounce based on audio context time)
    // Use audioContext.currentTime for timing comparison
    if (isPlaying && data.steps_in_interval > 0 && typeof data.steps_in_interval === 'number' && isFinite(data.steps_in_interval)) {
        // Debounce time should be inversely proportional to playback speed
        const stepDebounceTime = 0.1 / playbackSpeed; // seconds
        if (!updateAudio.lastStepTime || (currentTime - updateAudio.lastStepTime >= stepDebounceTime)) {
             // Create temporary nodes for the sound effect
             const stepOsc = audioContext.createOscillator();
             const stepGain = audioContext.createGain();
             const stepFilter = audioContext.createBiquadFilter();

             stepOsc.type = 'triangle';
             // Pitch based on number of steps and emotion speed
             const stepPitchBase = 300;
             const stepPitchRange = 600; // Max pitch
             const stepPitchStepsEffect = Math.min(data.steps_in_interval, 10) * 30; // Add up to 300Hz
             const stepPitchEmotionEffect = (emotionFactor.speedFactor - 1.0) * 100; // Emotion speed adds +/- 100Hz
             const stepPitch = Math.max(stepPitchBase, Math.min(stepPitchBase + stepPitchRange, stepPitchBase + Math.random() * 100 + stepPitchStepsEffect + stepPitchEmotionEffect));

             stepOsc.frequency.setValueAtTime(stepPitch, currentTime);

             stepFilter.type = 'bandpass';
             const filterCenterFreqBase = 800;
             const filterCenterFreqStepsEffect = Math.min(data.steps_in_interval, 10) * 60;
             const filterCenterFreqEmotionEffect = (emotionFactor.colorVariety - 1.0) * 200;
             const filterCenterFreq = Math.max(500, Math.min(3000, filterCenterFreqBase + filterCenterFreqStepsEffect + filterCenterFreqEmotionEffect));

             stepFilter.frequency.setValueAtTime(filterCenterFreq, currentTime);
             stepFilter.Q.setValueAtTime(5 + Math.min(data.steps_in_interval, 10) * 0.5, currentTime); // Q based on steps

             // Gain based on number of steps, fade out
             const stepPeakGain = 0.05 * Math.min(data.steps_in_interval / 5, 1) * (emotionFactor.apertureFactor || 1.0);
             stepGain.gain.setValueAtTime(stepPeakGain, currentTime);
             const stepSoundDuration = 0.15 / playbackSpeed; // Duration scaled by speed
             stepGain.gain.exponentialRampToValueAtTime(0.0001, currentTime + stepSoundDuration);

             stepOsc.connect(stepFilter);
             stepFilter.connect(stepGain);
             stepGain.connect(audioContext.destination);

             // Start and stop sound
             stepOsc.start(currentTime);
             stepOsc.stop(currentTime + stepSoundDuration + 0.05); // Ensure stop happens after ramp

             // Update the last step time using audio context time
             updateAudio.lastStepTime = currentTime;

             console.log(`Step sound triggered at ${formatTime(data.timestamp)} (steps: ${data.steps_in_interval})`);
        }
    }


    // photoTakenId sound effect
    // Only trigger if photoTakenId is 1 and we haven't triggered recently (debounce based on audio context time)
    if (isPlaying && data.photoTakenId === 1 && typeof data.photoTakenId === 'number' && isFinite(data.photoTakenId)) {
        const photoDebounceTime = 0.5 / playbackSpeed; // seconds
         if (!updateAudio.lastPhotoTime || (currentTime - updateAudio.lastPhotoTime >= photoDebounceTime)) {
            // Create temporary nodes for the sound effect
            const clickOsc = audioContext.createOscillator();
            const clickGain = audioContext.createGain();
            const clickFilter = audioContext.createBiquadFilter();

            clickOsc.type = 'square';
            clickOsc.frequency.setValueAtTime(2500 + (emotionFactor.speedFactor - 1.0) * 500, currentTime); // Pitch slightly influenced by emotion speed

            clickFilter.type = 'highpass';
            clickFilter.frequency.setValueAtTime(1500 + (emotionFactor.particleMovement - 1.0) * 300, currentTime); // Filter influenced by movement
            clickFilter.Q.setValueAtTime(1.0, currentTime);

            // Gain fade out influenced by emotion aperture
            const clickPeakGain = 0.15 * (emotionFactor.apertureFactor || 1.0);
            clickGain.gain.setValueAtTime(clickPeakGain, currentTime);
            const clickSoundDuration = 0.1 / playbackSpeed; // Duration scaled by speed
            clickGain.gain.exponentialRampToValueAtTime(0.0001, currentTime + clickSoundDuration);

            clickOsc.connect(clickFilter);
            clickFilter.connect(clickGain);
             clickGain.connect(audioContext.destination); // Connect to main gainNode? No, connect directly to destination for click sound.


            // Start and stop sound
            clickOsc.start(currentTime);
            clickOsc.stop(currentTime + clickSoundDuration + 0.05); // Ensure stop happens after ramp

            // Update the last photo time using audio context time
            updateAudio.lastPhotoTime = currentTime;

             console.log(`Photo sound triggered at ${formatTime(data.timestamp)}`);
         }
    }
}
// updateAudio 関数の静的プロパティを初期化 (オーディオコンテキスト時間を使用)
updateAudio.lastStepTime = 0;
updateAudio.lastPhotoTime = 0;


function formatTime(ms) {
    if (isNaN(ms) || ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
     const milliseconds = Math.floor((ms % 1000) / 10); // Get tenths of a second
     // return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`; // Keep MM:SS.ms format for display
    return `${minutes}:${seconds.toString().padStart(2, '0')}`; // Keep MM:SS format for display
}

// ウィンドウリサイズイベントリスナーを追加
window.addEventListener('resize', onWindowResize);

// 初期化処理を呼び出し
init();
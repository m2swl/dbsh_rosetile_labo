// グローバル変数 (Three.js objects, data, state)
let scene, camera, renderer;
let backgroundScene, backgroundCamera, bgShaderMaterial, bgMesh;
let graphLine, graphPoint, graphGeometry, graphMaterial, pointMesh;
let graphShadedAreaMesh, graphShadedAreaGeometry, graphShadedAreaMaterial;
let particleGeometry, particleMaterial, particleSystem, particleTexture;
let pPositions, pVelocities, pEmissionTimes, pLifespans, pSizes, pColors;
let pAttributeIndex = 0;
let particleCount = 0; // Logical count of emitted particles

let sensorData = [];
let dataHistory = []; // For graph visualization
let currentIndex = 0;
let actualStartTime = 0;
let lastProcessedTimestamp = 0; // CSV relative timestamp of the last processed data row
let playbackSpeed = 1.0;
let isPlaying = false;
let isSeeking = false;
let animationFrameId = null;

// Audio
let audioContext, oscillator, gainNode, filterNode;
let isAudioInitialized = false;
let currentAudioParams = { frequency: 440, filterFreq: 2500, filterQ: 1, gain: 0 };

// DOM Elements (fetched in DOMContentLoaded)
let csvFileInput, playButton, pauseButton, resetButton, speedControl, speedValueDisplay;
let vizContainer, csvFileNameDisplay, currentDataDisplay, seekBar, currentTimeDisplay, totalTimeDisplay;
let toggleDarkModeButton, toggleCustomizationButton, customizationPanel, toggleVizModeButton, currentVizModeTextElement;
let intensityMultiplierSlider, intensityValueDisplay, varietyMultiplierSlider, varietyValueDisplay, highlightMultiplierSlider, highlightValueDisplay;

// State Variables
let darkModeEnabled = false;
let customizationPanelVisible = false;
let vizMode = 'shader'; // 'shader', 'graph', or 'particles'
let manualIntensityMultiplier = 1.0;
let manualVarietyMultiplier = 1.0;
let manualHighlightMultiplier = 1.0;

// Constants
const HISTORY_WINDOW_MS = 15000; // 15 seconds history window for the graph
const MAX_HISTORY_POINTS = 500; // Max points in graph history
const MAX_PARTICLES = 5000;     // Max particles in particle system

// --- Shader Code (Vertex and Fragment) ---
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
    uniform vec3 uBaseColor;
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
        float time = uTime * (0.03 + uEmotionSpeed * 0.15);
        vec3 baseRgb = uBaseColor;

        float offset1_r = (noise(uv * 1.5 + time * 0.09) - 0.5) * (0.15 + uColorVariety * 0.3) * uEmotionIntensity;
        float offset1_g = (noise(uv * 1.4 + time * 0.11 + vec2(1.0,0.0)) - 0.5) * (0.15 + uColorVariety * 0.3) * uEmotionIntensity;
        float offset1_b = (noise(uv * 1.3 + time * 0.10 + vec2(0.0,1.0)) - 0.5) * (0.15 + uColorVariety * 0.3) * uEmotionIntensity;
        vec3 color1 = clamp(baseRgb + vec3(offset1_r, offset1_g, offset1_b), 0.0, 1.0);

        float offset2_r = (noise(uv * 1.6 - time * 0.12) - 0.5) * (0.2 + uColorVariety * 0.4) * uEmotionIntensity;
        float offset2_g = (noise(uv * 1.7 - time * 0.14 + vec2(0.5, 0.5)) - 0.5) * (0.2 + uColorVariety * 0.4) * uEmotionIntensity;
        float offset2_b = (noise(uv * 1.8 - time * 0.13 + vec2(1.5, 0.2)) - 0.5) * (0.2 + uColorVariety * 0.4) * uEmotionIntensity;
        vec3 color2 = clamp(baseRgb + vec3(offset2_r, offset2_g, offset2_b), 0.0, 1.0);

        float patternScale = 0.5 + uEmotionIntensity * 1.5;
        float fbmTimeX = time * (0.8 + uEmotionSpeed * 1.2);
        float fbmTimeY = time * (0.7 + uEmotionSpeed * 1.0);
        float fbmPattern = fbm(uv * patternScale + vec2(fbmTimeX, fbmTimeY));

        float mixThreshold = 0.5 - uEmotionIntensity * 0.2;
        float mixSmoothness = 0.2 + uEmotionIntensity * 0.2;
        vec3 blendedColor = mix(color1, color2, smoothstep(mixThreshold, mixThreshold + mixSmoothness, fbmPattern));

        vec2 highlightOffset = vec2(sin(time * (0.3 + uEmotionSpeed * 0.1) + uEmotionIntensity * 0.4) * 0.4,
                                    cos(time * (0.25 + uEmotionSpeed * 0.09) - uEmotionIntensity * 0.35) * 0.4);
        float distToHighlight = length(uv - (vec2(0.5, 0.5) + highlightOffset));
        float highlightSpread = 0.6 - uHighlightIntensity * 0.2 - uEmotionIntensity * 0.1;
        float highlightSharpness = 0.08 + uHighlightIntensity * 0.05;
        float highlightEffect = smoothstep(highlightSpread, highlightSharpness, distToHighlight) * uHighlightIntensity * 2.5;

        vec3 highlightColor = mix(vec3(0.95, 0.95, 0.98), baseRgb, 0.1);
        vec3 finalColor = mix(blendedColor, highlightColor, highlightEffect);

        float vigStrength = 0.3 + uEmotionIntensity * 0.3;
        float vig = smoothstep(1.0, vigStrength, length(uv - vec2(0.5)));
        finalColor *= vig;

        finalColor = pow(finalColor, vec3(0.85));
        finalColor = clamp(finalColor + uHighlightIntensity * 0.08, 0.0, 1.0);

        gl_FragColor = vec4(finalColor, 1.0);
    }
`;

const particleVertexShader = `
    attribute vec3 initialPosition;
    attribute vec3 initialVelocity;
    attribute float emissionTime;
    attribute float lifespan;
    attribute float size;
    attribute vec4 color;

    uniform float uTime;
    uniform float uSpeedFactor;

    varying vec4 vColor;

    void main() {
        float age = uTime - emissionTime;
        if (age < 0.0 || age > lifespan) {
            gl_Position = vec4(1e20, 1e20, 1e20, 1.0); // Move far away
            vColor = vec4(0.0);
            gl_PointSize = 0.0;
            return;
        }

        vec3 currentPosition = initialPosition + initialVelocity * age * uSpeedFactor;
        gl_PointSize = size;

        float fadeStartTime = lifespan * 0.05;
        float fadeEndTime = lifespan * 0.8;
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
        vec4 texColor = texture2D(uTexture, gl_PointCoord);
        vec4 finalColor = texColor * vColor;
        if (finalColor.a < 0.005) discard;
        gl_FragColor = finalColor;
    }
`;


// --- Initialization Functions ---
function initThreeJS() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 1.0;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.autoClear = false; // We manually clear

    // Shader Background
    backgroundScene = new THREE.Scene();
    backgroundCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const bgPlaneGeo = new THREE.PlaneGeometry(2, 2);
    bgShaderMaterial = new THREE.ShaderMaterial({
        vertexShader: backgroundVertexShader,
        fragmentShader: backgroundFragmentShader,
        uniforms: {
            uTime: { value: 0.0 },
            uBaseColor: { value: new THREE.Color(0.2, 0.3, 0.7) },
            uHighlightIntensity: { value: 0.1 },
            uEmotionSpeed: { value: 0.5 },
            uEmotionIntensity: { value: 0.3 },
            uColorVariety: { value: 0.2 }
        },
        depthTest: false, depthWrite: false
    });
    bgMesh = new THREE.Mesh(bgPlaneGeo, bgShaderMaterial);
    backgroundScene.add(bgMesh);

    initGraph();
    initParticles();
    console.log("Three.js initialized.");
}

function initGraph() {
    graphGeometry = new THREE.BufferGeometry();
    graphGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_HISTORY_POINTS * 3), 3));
    graphMaterial = new THREE.LineBasicMaterial({ color: 0x8844EE, linewidth: 2 });
    graphLine = new THREE.Line(graphGeometry, graphMaterial);
    scene.add(graphLine);

    graphShadedAreaGeometry = new THREE.BufferGeometry();
    graphShadedAreaGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_HISTORY_POINTS * 4 * 3), 3));
    const shadedAreaIndicesArray = new Uint16Array((MAX_HISTORY_POINTS - 1) * 6);
    for (let i = 0; i < MAX_HISTORY_POINTS - 1; i++) {
        const baseVtxIdx = i * 4;
        const baseLinkIdx = i * 6;
        shadedAreaIndicesArray[baseLinkIdx] = baseVtxIdx;
        shadedAreaIndicesArray[baseLinkIdx + 1] = baseVtxIdx + 2;
        shadedAreaIndicesArray[baseLinkIdx + 2] = baseVtxIdx + 3;
        shadedAreaIndicesArray[baseLinkIdx + 3] = baseVtxIdx;
        shadedAreaIndicesArray[baseLinkIdx + 4] = baseVtxIdx + 3;
        shadedAreaIndicesArray[baseLinkIdx + 5] = baseVtxIdx + 1;
    }
    graphShadedAreaGeometry.setIndex(new THREE.BufferAttribute(shadedAreaIndicesArray, 1));
    graphShadedAreaMaterial = new THREE.MeshBasicMaterial({
        color: 0x8844EE, transparent: true, opacity: 0.5, side: THREE.DoubleSide
    });
    graphShadedAreaMesh = new THREE.Mesh(graphShadedAreaGeometry, graphShadedAreaMaterial);
    scene.add(graphShadedAreaMesh);

    const pointGeometry = new THREE.SphereGeometry(0.02, 16, 16);
    const pointMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    pointMesh = new THREE.Mesh(pointGeometry, pointMaterial);
    scene.add(pointMesh);

    dataHistory = [];
    console.log("Graph visualization initialized.");
}

function initParticles() {
    const loader = new THREE.TextureLoader();
    loader.load('./assets/particle.png', 
        (texture) => {
            particleTexture = texture;
            if (particleMaterial) {
                particleMaterial.uniforms.uTexture.value = particleTexture;
                particleMaterial.needsUpdate = true;
            }
            console.log("Particle texture loaded.");
        }, 
        undefined, 
        (err) => {
            console.error('Error loading particle texture:', err);
            if (particleMaterial) { // Fallback to white pixel texture
                const canvas = document.createElement('canvas');
                canvas.width = 1; canvas.height = 1;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, 1, 1);
                    particleMaterial.uniforms.uTexture.value = new THREE.CanvasTexture(canvas);
                    particleMaterial.needsUpdate = true;
                    console.log("Using fallback white texture for particles.");
                }
            }
        }
    );

    particleGeometry = new THREE.BufferGeometry();
    pPositions = new Float32Array(MAX_PARTICLES * 3);
    pVelocities = new Float32Array(MAX_PARTICLES * 3);
    pEmissionTimes = new Float32Array(MAX_PARTICLES);
    pLifespans = new Float32Array(MAX_PARTICLES);
    pSizes = new Float32Array(MAX_PARTICLES);
    pColors = new Float32Array(MAX_PARTICLES * 4);

    particleGeometry.setAttribute('initialPosition', new THREE.BufferAttribute(pPositions, 3).setUsage(THREE.DynamicDrawUsage));
    particleGeometry.setAttribute('initialVelocity', new THREE.BufferAttribute(pVelocities, 3).setUsage(THREE.DynamicDrawUsage));
    particleGeometry.setAttribute('emissionTime', new THREE.BufferAttribute(pEmissionTimes, 1).setUsage(THREE.DynamicDrawUsage));
    particleGeometry.setAttribute('lifespan', new THREE.BufferAttribute(pLifespans, 1).setUsage(THREE.DynamicDrawUsage));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(pSizes, 1).setUsage(THREE.DynamicDrawUsage));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(pColors, 4).setUsage(THREE.DynamicDrawUsage));

    for(let i = 0; i < MAX_PARTICLES; i++) { // Initialize as inactive
        pEmissionTimes[i] = -1000; 
        pSizes[i] = 0;
    }

    particleMaterial = new THREE.ShaderMaterial({
        vertexShader: particleVertexShader,
        fragmentShader: particleFragmentShader,
        uniforms: {
            uTime: { value: 0.0 },
            uTexture: { value: null }, // Will be set by loader
            uSpeedFactor: { value: 1.0 }
        },
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
    });
    particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particleSystem);
    particleGeometry.setDrawRange(0, MAX_PARTICLES); // Shader handles visibility
    console.log("Particle system initialized.");
}

function initAudio() {
    if (isAudioInitialized) return;
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        oscillator = audioContext.createOscillator();
        gainNode = audioContext.createGain();
        filterNode = audioContext.createBiquadFilter();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(currentAudioParams.frequency, audioContext.currentTime);
        filterNode.type = "lowpass";
        filterNode.frequency.setValueAtTime(currentAudioParams.filterFreq, audioContext.currentTime);
        filterNode.Q.setValueAtTime(currentAudioParams.filterQ, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);

        oscillator.connect(filterNode);
        filterNode.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.start();
        isAudioInitialized = true;
        console.log("AudioContext Initialized.");
        if (audioContext.state === 'suspended') {
            console.log("AudioContext is suspended. User interaction needed to resume.");
        }
    } catch (e) {
        console.error("Error initializing audio:", e);
        isAudioInitialized = false;
    }
}

// --- File Handling ---
function handleFileLoad(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (csvFileNameDisplay) csvFileNameDisplay.textContent = file.name;
    const reader = new FileReader();
    reader.onload = (e) => {
        if (e.target && typeof e.target.result === 'string') {
            parseCSV(e.target.result);
            if (sensorData.length > 0) {
                const firstTimestamp = sensorData[0].timestamp; // Should be 0
                const lastTimestamp = sensorData[sensorData.length - 1].timestamp;
                const totalDurationMs = lastTimestamp - firstTimestamp;

                if (totalTimeDisplay) totalTimeDisplay.textContent = formatTime(totalDurationMs);
                if (seekBar) {
                    seekBar.max = totalDurationMs.toString();
                    seekBar.value = "0";
                    seekBar.disabled = false;
                }
                if (currentTimeDisplay) currentTimeDisplay.textContent = formatTime(0);
                
                resetApplicationStateToStart(); // Reset playback and visuals
                updateVisualsAndAudioForData(sensorData[0], 0); // Update for first frame, 0 deltaTime
                pauseAnimation(); // Ensure UI reflects paused state and enables play button
                renderCurrentFrame(); // Render the initial state
            } else {
                handleEmptyData("No valid data rows found after parsing.");
            }
        } else {
            handleEmptyData("Error reading file content.");
        }
    };
    reader.readAsText(file);
}

function parseCSV(text) {
    if (typeof Papa === 'undefined') {
        console.error("PapaParse is not defined.");
        sensorData = [];
        if (currentDataDisplay) currentDataDisplay.innerHTML = '<pre style="color: red;">Error: CSV parsing library missing.</pre>';
        return;
    }

    const results = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: (header) => {
            const trimmedHeader = header ? header.trim() : "";
            return ['timestamp', 'temperature_celsius', 'illuminance', 'decibels', 'accelX', 'accelY', 'accelZ', 'gyroX', 'gyroY', 'gyroZ', 'steps_in_interval', 'photoTakenId'].includes(trimmedHeader);
        }
    });

    if (results.errors.length > 0) {
        console.error("CSV parsing errors:", results.errors);
        const errorMessages = results.errors.map(err => `Row ${err.row}: ${err.message}`).join('\n');
        if (currentDataDisplay) {
            const existingContent = currentDataDisplay.innerHTML;
            currentDataDisplay.innerHTML = `${existingContent}<pre style="color: orange;">CSV Parsing Errors:\n${errorMessages}</pre>`;
        }
    }

    sensorData = results.data.filter(data =>
        data && typeof data.timestamp === 'number' && isFinite(data.timestamp)
    );

    if (sensorData.length > 0) {
        const firstCsvTimestamp = sensorData[0].timestamp;
        sensorData.forEach(data => {
            data.timestamp -= firstCsvTimestamp; // Make timestamps relative to the first entry
        });
        lastProcessedTimestamp = 0; // sensorData[0].timestamp is now 0
    } else {
        lastProcessedTimestamp = 0;
    }
    console.log(`Parsed ${sensorData.length} data points.`);
}

function resetApplicationStateToStart() {
    currentIndex = 0;
    lastProcessedTimestamp = 0;
    if (seekBar) seekBar.value = "0";
    if (currentTimeDisplay) currentTimeDisplay.textContent = formatTime(0);
    actualStartTime = performance.now();

    if (bgShaderMaterial && bgShaderMaterial.uniforms.uTime) {
        bgShaderMaterial.uniforms.uTime.value = 0.0;
        delete bgShaderMaterial.uniforms.uTime.lastFrameTime;
    }
    clearParticles();
    if (particleMaterial && particleMaterial.uniforms.uTime) {
        particleMaterial.uniforms.uTime.value = 0.0;
    }
    rebuildGraphHistory(0);
}

function handleEmptyData(message) {
    console.warn(message);
    if (totalTimeDisplay) totalTimeDisplay.textContent = formatTime(0);
    if (seekBar) { seekBar.max = "0"; seekBar.value = "0"; seekBar.disabled = true; }
    if (currentTimeDisplay) currentTimeDisplay.textContent = formatTime(0);
    if (currentDataDisplay) currentDataDisplay.textContent = message;
    
    sensorData = [];
    currentIndex = 0;
    lastProcessedTimestamp = 0;
    dataHistory = [];
    clearParticles();

    // Reset visuals to default empty state
    if (bgShaderMaterial && bgShaderMaterial.uniforms) {
        bgShaderMaterial.uniforms.uBaseColor.value.setRGB(0.2, 0.3, 0.7);
        bgShaderMaterial.uniforms.uHighlightIntensity.value = 0.1;
        bgShaderMaterial.uniforms.uEmotionSpeed.value = 0.5;
        bgShaderMaterial.uniforms.uEmotionIntensity.value = 0.3;
        bgShaderMaterial.uniforms.uColorVariety.value = 0.2;
        if (bgShaderMaterial.uniforms.uTime) bgShaderMaterial.uniforms.uTime.value = 0.0;
    }
    if (graphGeometry) graphGeometry.setDrawRange(0, 0);
    if (graphShadedAreaGeometry) graphShadedAreaGeometry.setDrawRange(0, 0);
    if (pointMesh) pointMesh.visible = false;
    
    if (isAudioInitialized && audioContext && audioContext.state !== 'closed' && gainNode) {
        gainNode.gain.setTargetAtTime(0, audioContext.currentTime, 0.1);
        currentAudioParams.gain = 0;
    }
    pauseAnimation(); // Update button states
    renderCurrentFrame();
}


// --- Playback Controls ---
function playAnimation() {
    if (sensorData.length === 0) {
        console.warn("Play: No data loaded.");
        return;
    }
    isPlaying = true;
    if (playButton) playButton.disabled = true;
    if (pauseButton) pauseButton.disabled = false;
    if (resetButton) resetButton.disabled = true;

    if (isAudioInitialized && audioContext) {
        if (audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log("AudioContext resumed.");
                setAudioGain(true); // Fade in gain
            }).catch(e => console.error("Error resuming AudioContext:", e));
        } else if (audioContext.state === 'running') {
            setAudioGain(true); // Fade in gain
        }
    }
    
    const elapsedCsvTime = (sensorData.length > 0 && currentIndex >= 0 && currentIndex < sensorData.length) 
                           ? sensorData[currentIndex].timestamp : 0;
    actualStartTime = performance.now() - (elapsedCsvTime / playbackSpeed);

    if (animationFrameId === null) {
        animate.lastFrameTime = performance.now(); // Reset for delta calculation
        animate();
    }
}

function pauseAnimation() {
    isPlaying = false;
    if (playButton) playButton.disabled = sensorData.length === 0; // Only enable if data exists
    if (pauseButton) pauseButton.disabled = true;
    if (resetButton) resetButton.disabled = sensorData.length === 0;

    setAudioGain(false); // Fade out gain

    // If paused not due to seeking and data exists, render current frame
    if (!isSeeking && sensorData.length > 0 && currentIndex >= 0 && currentIndex < sensorData.length) {
        updateVisualsAndAudioForData(sensorData[currentIndex], 0); // Update with 0 delta time
        renderCurrentFrame();
    } else if (!isSeeking && sensorData.length === 0) {
        renderCurrentFrame(); // Render empty state
    }
}

function resetAnimation() {
    if (sensorData.length === 0) return;
    pauseAnimation(); // Stop playback, set UI to paused
    resetApplicationStateToStart();
    
    if (sensorData.length > 0) {
        updateVisualsAndAudioForData(sensorData[0], 0);
    }
    renderCurrentFrame();
    if (resetButton) resetButton.disabled = false;
}

function setAudioGain(shouldPlay) {
    if (!isAudioInitialized || !audioContext || !gainNode || audioContext.state === 'closed') return;
    
    const targetGain = shouldPlay && !isSeeking ? getAudioTargetGain(sensorData[currentIndex], getEmotionFactor(sensorData[currentIndex]?.sessionEmotion)) : 0;
    gainNode.gain.cancelScheduledValues(audioContext.currentTime);
    gainNode.gain.setValueAtTime(gainNode.gain.value, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(targetGain, audioContext.currentTime + 0.2);
    currentAudioParams.gain = targetGain;
}


// --- Seek Bar ---
function handleSeekBarInput() {
    if (!seekBar || sensorData.length === 0) return;
    isSeeking = true;
    setAudioGain(false); // Mute audio while seeking

    const seekTimeMs = parseFloat(seekBar.value);
    if (currentTimeDisplay) currentTimeDisplay.textContent = formatTime(seekTimeMs);

    let tempIndex = 0;
    for (let i = 0; i < sensorData.length; i++) {
        if (sensorData[i].timestamp <= seekTimeMs) {
            tempIndex = i;
        } else {
            break;
        }
    }
    tempIndex = Math.max(0, Math.min(sensorData.length - 1, tempIndex));
    const currentRow = sensorData[tempIndex];

    if (currentRow) {
        updateDataDisplay(currentRow); // Update data display immediately

        // Update visualization visuals based on current mode while seeking (no lerp, 0 delta)
        if (vizMode === 'shader') {
            if (bgShaderMaterial?.uniforms.uTime) bgShaderMaterial.uniforms.uTime.value = currentRow.timestamp / 1000.0;
            updateShaderVisuals(currentRow);
        } else if (vizMode === 'graph') {
            rebuildGraphHistory(currentRow.timestamp);
            updateGraphVisuals(currentRow);
        } else { // particles
            if (particleMaterial?.uniforms.uTime) particleMaterial.uniforms.uTime.value = currentRow.timestamp / 1000.0;
            updateParticleVisuals(currentRow, 0); // Update uniforms, no emission
        }
        updateAudioParameters(currentRow, getEmotionFactor(currentRow.sessionEmotion)); // Update audio params (gain handled by setAudioGain)
        renderCurrentFrame(); // Render the seeked frame immediately
    }
}

function handleSeekBarChange() {
    if (!seekBar || sensorData.length === 0) {
        isSeeking = false;
        return;
    }
    isSeeking = false;
    const seekTargetElapsedCsvTime = parseFloat(seekBar.value);

    let newIndex = 0;
    for (let i = 0; i < sensorData.length; i++) {
        if (sensorData[i].timestamp <= seekTargetElapsedCsvTime) {
            newIndex = i;
        } else {
            break;
        }
    }
    currentIndex = Math.max(0, Math.min(sensorData.length - 1, newIndex));
    
    actualStartTime = performance.now() - (sensorData[currentIndex].timestamp / playbackSpeed);
    lastProcessedTimestamp = sensorData[currentIndex].timestamp;

    rebuildGraphHistory(sensorData[currentIndex].timestamp);
    clearParticles(); // Clear particles on seek change
    if (particleMaterial?.uniforms.uTime) {
        particleMaterial.uniforms.uTime.value = sensorData[currentIndex].timestamp / 1000.0;
    }
    
    updateVisualsAndAudioForData(sensorData[currentIndex], 0);

    if (isPlaying) {
        setAudioGain(true); // Resume audio gain if was playing
        if (animationFrameId === null) { // Restart animation loop if it stopped
            animate.lastFrameTime = performance.now();
            animate();
        }
    } else {
        renderCurrentFrame(); // Render updated state if paused
    }
}

// --- Animation Loop ---
function animate() {
    const now = performance.now();
    const deltaTime = Math.max(0, (now - (animate.lastFrameTime || now)) / 1000.0); // Delta in seconds, non-negative
    animate.lastFrameTime = now;
    animate.deltaTime = deltaTime; // Store for emitters etc.

    if (!isPlaying) {
        if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        return;
    }
    animationFrameId = requestAnimationFrame(animate);

    const currentElapsedTargetMs = (performance.now() - actualStartTime) * playbackSpeed;
    const totalDurationMs = sensorData.length > 0 ? sensorData[sensorData.length - 1].timestamp : 0;
    const cappedElapsedTargetMs = Math.min(totalDurationMs, Math.max(0, currentElapsedTargetMs));

    let nextIndex = currentIndex;
    if (sensorData.length > 0) {
        for (let i = Math.max(0, currentIndex - 2); i < sensorData.length; i++) {
            if (sensorData[i].timestamp <= cappedElapsedTargetMs) {
                nextIndex = i;
            } else {
                break;
            }
        }
        nextIndex = Math.max(0, Math.min(sensorData.length - 1, nextIndex));
    }
    
    const indexChanged = (nextIndex !== currentIndex);
    const currentRow = sensorData[nextIndex]; // Use nextIndex for current row

    if (currentRow) {
        if (indexChanged || (currentIndex === 0 && lastProcessedTimestamp === 0 && cappedElapsedTargetMs > 0)) {
            currentIndex = nextIndex;
            lastProcessedTimestamp = currentRow.timestamp;
            updateVisualsAndAudioForData(currentRow, deltaTime);
        } else { // Index hasn't changed, but update continuous elements if playing
            if (vizMode === 'shader') {
                if (bgShaderMaterial?.uniforms.uTime) bgShaderMaterial.uniforms.uTime.value = cappedElapsedTargetMs / 1000.0;
                updateShaderVisuals(currentRow); // Continue lerping uniforms
            } else if (vizMode === 'particles') {
                if (particleMaterial?.uniforms.uTime) particleMaterial.uniforms.uTime.value = cappedElapsedTargetMs / 1000.0;
                updateParticleVisuals(currentRow, deltaTime); // Emit particles, update uniforms
            }
            // Graph does not need continuous update if index is same
            updateAudioParameters(currentRow, getEmotionFactor(currentRow.sessionEmotion)); // Continue lerping audio params
        }
        updateDataDisplay(currentRow); // Always update data display
    }


    if (!isSeeking && seekBar && currentTimeDisplay) {
        seekBar.value = cappedElapsedTargetMs.toString();
        currentTimeDisplay.textContent = formatTime(cappedElapsedTargetMs);
    }

    renderCurrentFrame();

    if (isPlaying && totalDurationMs > 0 && currentElapsedTargetMs >= totalDurationMs) {
        currentIndex = sensorData.length - 1; // Ensure final state is last data point
        if (sensorData[currentIndex]) {
            updateVisualsAndAudioForData(sensorData[currentIndex], deltaTime); // Final update
            updateDataDisplay(sensorData[currentIndex]);
        }
        if (seekBar) seekBar.value = totalDurationMs.toString();
        if (currentTimeDisplay) currentTimeDisplay.textContent = formatTime(totalDurationMs);
        renderCurrentFrame();
        pauseAnimation();
        if (resetButton) resetButton.disabled = false;
    }
}
animate.lastFrameTime = 0;
animate.deltaTime = 0;

function renderCurrentFrame() {
    if (!renderer) return;
    renderer.clear();
    if (vizMode === 'shader' && backgroundScene && backgroundCamera) {
        renderer.render(backgroundScene, backgroundCamera);
    } else if (scene && camera) { // Graph or Particles
        renderer.render(scene, camera);
    }
}

// --- Visual Updates ---
function updateVisualsAndAudioForData(data, deltaTime) {
    if (!data) return;
    const emotionFactor = getEmotionFactor(data.sessionEmotion);

    if (vizMode === 'shader') {
        if (bgShaderMaterial?.uniforms.uTime) bgShaderMaterial.uniforms.uTime.value = data.timestamp / 1000.0;
        updateShaderVisuals(data);
    } else if (vizMode === 'graph') {
        // Add current point to history before updating geometry
        const scaledY = updateGraphVisualsHelper(data);
        const currentTimestamp = data.timestamp;
        const windowStartTime = currentTimestamp - HISTORY_WINDOW_MS;
        dataHistory = dataHistory.filter(point => point.timestamp >= windowStartTime);
        if (dataHistory.length === 0 || dataHistory[dataHistory.length - 1].timestamp < currentTimestamp) {
            dataHistory.push({ timestamp: currentTimestamp, value: scaledY });
        }
        if (dataHistory.length > MAX_HISTORY_POINTS) {
            dataHistory = dataHistory.slice(dataHistory.length - MAX_HISTORY_POINTS);
        }
        updateGraphVisuals(data);
    } else { // particles
        if (particleMaterial?.uniforms.uTime) particleMaterial.uniforms.uTime.value = data.timestamp / 1000.0;
        updateParticleVisuals(data, deltaTime);
    }
    updateAudioParameters(data, emotionFactor); // Update audio parameters
    // Note: setAudioGain controls actual gain based on isPlaying/isSeeking
}

function updateDataDisplay(data) {
    if (!currentDataDisplay || !data) return;
    let dataStr = "";
    const keysToShow = ['timestamp', 'sessionColor', 'sessionEmotion', 'temperature_celsius', 'illuminance', 'decibels', 'accelY', 'steps_in_interval', 'photoTakenId'];
    for (const key of keysToShow) {
        if (data[key] !== undefined && data[key] !== null) {
            let value = data[key];
            if (typeof value === 'number' && isFinite(value)) {
                if (!Number.isInteger(value)) value = value.toFixed(2);
                if (key === 'temperature_celsius') value += ' °C';
                if (key === 'decibels') value += ' dB';
                if (key === 'timestamp') value = formatTime(value);
            } else if (typeof value === 'string') {
                value = value.trim();
            }
            dataStr += `${key}: ${value}\n`;
        }
    }
    currentDataDisplay.innerHTML = `<pre>${dataStr}</pre>`;
}

function updateShaderVisuals(data) {
    if (!bgShaderMaterial?.uniforms || !data) return;
    const lerpFactor = (isPlaying && !isSeeking) ? 0.15 : 1.0;

    const baseColorData = parseSessionColor(data.sessionColor);
    const targetBaseColor = new THREE.Color(baseColorData.r, baseColorData.g, baseColorData.b);
    bgShaderMaterial.uniforms.uBaseColor.value.lerp(targetBaseColor, lerpFactor);

    let dataHighlight = 0.05;
    if (data.illuminance && isFinite(data.illuminance)) {
        const logLux = Math.log(Math.max(1, data.illuminance + 1));
        const luxNorm = Math.min(1.0, Math.max(0.0, (logLux - Math.log(1)) / (Math.log(10001) - Math.log(1))));
        dataHighlight += luxNorm * 1.5;
    }
    if (data.decibels && isFinite(data.decibels)) {
        dataHighlight += Math.min(1.0, Math.max(0.0, (data.decibels + 40) / 70.0)) * 0.6;
    }
    if (data.photoTakenId === 1) dataHighlight += 1.0;
    const finalHighlight = Math.max(0.0, Math.min(3.0, dataHighlight * manualHighlightMultiplier));
    bgShaderMaterial.uniforms.uHighlightIntensity.value = THREE.MathUtils.lerp(bgShaderMaterial.uniforms.uHighlightIntensity.value, finalHighlight, lerpFactor);

    const emotionFactor = getEmotionFactor(data.sessionEmotion);
    bgShaderMaterial.uniforms.uEmotionSpeed.value = THREE.MathUtils.lerp(bgShaderMaterial.uniforms.uEmotionSpeed.value, emotionFactor.speedFactor, lerpFactor);
    
    const dataIntensity = (emotionFactor.particleMovement * 0.7 + 0.1);
    const finalIntensity = dataIntensity * manualIntensityMultiplier;
    bgShaderMaterial.uniforms.uEmotionIntensity.value = THREE.MathUtils.lerp(bgShaderMaterial.uniforms.uEmotionIntensity.value, Math.max(0.1, Math.min(2.0, finalIntensity)), lerpFactor);

    const dataVariety = emotionFactor.colorVariety * 0.5;
    const finalVariety = dataVariety * manualVarietyMultiplier;
    bgShaderMaterial.uniforms.uColorVariety.value = THREE.MathUtils.lerp(bgShaderMaterial.uniforms.uColorVariety.value, Math.max(0.1, Math.min(1.5, finalVariety)), lerpFactor);

    // Photo flash effect
    if (data.photoTakenId === 1 && data.timestamp > (updateShaderVisuals.lastPhotoFlashTimestamp || -1)) {
        const flashDurationMs = 150;
        const flashAmount = 1.5;
        const originalHighlight = bgShaderMaterial.uniforms.uHighlightIntensity.value;
        bgShaderMaterial.uniforms.uHighlightIntensity.value = Math.min(3.5, originalHighlight + flashAmount);
        if (!isPlaying && !isSeeking) renderCurrentFrame(); // Immediate render if paused

        setTimeout(() => {
            if (bgShaderMaterial) { // Check if material still exists
                bgShaderMaterial.uniforms.uHighlightIntensity.value = THREE.MathUtils.lerp(
                    bgShaderMaterial.uniforms.uHighlightIntensity.value, 
                    originalHighlight, // Lerp back towards original value (or value it would have been)
                    1.0 // Instant return after timeout
                ); 
                if (!isPlaying && !isSeeking) renderCurrentFrame();
            }
        }, flashDurationMs / playbackSpeed);
        updateShaderVisuals.lastPhotoFlashTimestamp = data.timestamp;
    }
}
updateShaderVisuals.lastPhotoFlashTimestamp = -1;


function updateGraphVisuals(data) {
    if (!graphGeometry || !pointMesh || !graphShadedAreaGeometry || !graphShadedAreaMaterial || !camera || !data) {
        if (graphLine) graphLine.visible = false;
        if (pointMesh) pointMesh.visible = false;
        if (graphShadedAreaMesh) graphShadedAreaMesh.visible = false;
        return;
    }
    if (graphLine) graphLine.visible = true;
    if (graphShadedAreaMesh) graphShadedAreaMesh.visible = true;


    if (dataHistory.length === 0) {
        graphGeometry.setDrawRange(0, 0);
        graphShadedAreaGeometry.setDrawRange(0, 0);
        pointMesh.visible = false;
        return;
    }

    const vFOV = THREE.MathUtils.degToRad(camera.fov);
    const viewHeightAtZ0 = 2 * Math.tan(vFOV / 2) * camera.position.z;
    const viewWidthAtZ0 = viewHeightAtZ0 * camera.aspect;
    const xRange = viewWidthAtZ0 * 0.9; // 90% of width

    const currentTimestamp = data.timestamp;
    const windowStartTime = currentTimestamp - HISTORY_WINDOW_MS;
    const visibleHistory = dataHistory.filter(p => p.timestamp >= windowStartTime && p.timestamp <= currentTimestamp);

    const linePositions = graphGeometry.attributes.position.array;
    let linePosIdx = 0;
    for (let i = 0; i < visibleHistory.length; i++) {
        const p = visibleHistory[i];
        const xNorm = (HISTORY_WINDOW_MS > 0) ? ((p.timestamp - windowStartTime) / HISTORY_WINDOW_MS) : 0;
        linePositions[linePosIdx++] = xNorm * xRange - xRange / 2;
        linePositions[linePosIdx++] = p.value;
        linePositions[linePosIdx++] = 0;
    }
    for (let i = linePosIdx; i < MAX_HISTORY_POINTS * 3; i++) linePositions[i] = 0; // Clear unused
    graphGeometry.attributes.position.needsUpdate = true;
    graphGeometry.setDrawRange(0, visibleHistory.length);

    const baseColorData = parseSessionColor(data.sessionColor);
    graphShadedAreaMaterial.color.setRGB(baseColorData.r, baseColorData.g, baseColorData.b);

    const shadedPositions = graphShadedAreaGeometry.attributes.position.array;
    let shadedPosIdx = 0;
    let shadedIndicesCount = 0; // Count of indices to draw
    if (visibleHistory.length >= 2) {
        const baseLineY = -0.9;
        for (let i = 0; i < visibleHistory.length - 1; i++) {
            const p1 = visibleHistory[i], p2 = visibleHistory[i + 1];
            const xNorm1 = (HISTORY_WINDOW_MS > 0) ? (p1.timestamp - windowStartTime) / HISTORY_WINDOW_MS : 0;
            const xPos1 = xNorm1 * xRange - xRange / 2;
            const xNorm2 = (HISTORY_WINDOW_MS > 0) ? (p2.timestamp - windowStartTime) / HISTORY_WINDOW_MS : 0;
            const xPos2 = xNorm2 * xRange - xRange / 2;
            
            // v0 (top-left)
            shadedPositions[shadedPosIdx++] = xPos1; shadedPositions[shadedPosIdx++] = p1.value; shadedPositions[shadedPosIdx++] = 0;
            // v1 (top-right)
            shadedPositions[shadedPosIdx++] = xPos2; shadedPositions[shadedPosIdx++] = p2.value; shadedPositions[shadedPosIdx++] = 0;
            // v2 (bottom-left)
            shadedPositions[shadedPosIdx++] = xPos1; shadedPositions[shadedPosIdx++] = baseLineY; shadedPositions[shadedPosIdx++] = 0;
            // v3 (bottom-right)
            shadedPositions[shadedPosIdx++] = xPos2; shadedPositions[shadedPosIdx++] = baseLineY; shadedPositions[shadedPosIdx++] = 0;
            shadedIndicesCount += 6; // 2 triangles per quad = 6 indices
        }
    }
    for (let i = shadedPosIdx; i < MAX_HISTORY_POINTS * 4 * 3; i++) shadedPositions[i] = 0; // Clear unused
    graphShadedAreaGeometry.attributes.position.needsUpdate = true;
    graphShadedAreaGeometry.setDrawRange(0, shadedIndicesCount);


    if (visibleHistory.length > 0 && pointMesh) {
        const lastP = visibleHistory[visibleHistory.length - 1];
        const xNorm = (HISTORY_WINDOW_MS > 0) ? (lastP.timestamp - windowStartTime) / HISTORY_WINDOW_MS : 0;
        pointMesh.position.set(xNorm * xRange - xRange / 2, lastP.value, 0.01); // Slightly in front
        pointMesh.visible = true;
        if (pointMesh.material) pointMesh.material.color.setHex(darkModeEnabled ? 0xFFFFFF : 0x000000);
    } else if (pointMesh) {
        pointMesh.visible = false;
    }
}

function updateGraphVisualsHelper(data) { // Calculates Y value for graph
    if (!data) return 0.0;
    let plotValueBase = 0.5;
    const emotionFactor = getEmotionFactor(data.sessionEmotion);
    let emotionCombinedRaw = (emotionFactor.particleMovement * 0.7 + emotionFactor.colorVariety * 0.3);
    let emotionCombinedMultiplied = emotionCombinedRaw * manualIntensityMultiplier * 0.7 + emotionCombinedRaw * manualVarietyMultiplier * 0.3;
    plotValueBase = Math.max(0, Math.min(1, emotionCombinedMultiplied / 6.0));

    let sensorBoostRaw = 0;
    if (data.illuminance && isFinite(data.illuminance)) {
        const logLux = Math.log(Math.max(1, data.illuminance + 1));
        sensorBoostRaw += Math.min(1.0, Math.max(0.0, (logLux - Math.log(1)) / (Math.log(10001) - Math.log(1)))) * 0.5;
    }
    if (data.decibels && isFinite(data.decibels)) {
        sensorBoostRaw += Math.min(1.0, Math.max(0.0, (data.decibels + 40) / 70.0)) * 0.3;
    }
    if (data.photoTakenId === 1) sensorBoostRaw += 0.5;
    
    const sensorBoostMultiplied = sensorBoostRaw * manualHighlightMultiplier;
    const totalValue = plotValueBase + sensorBoostMultiplied;
    return Math.max(-1, Math.min(1, (totalValue - 1.0))); // Map [0,2] to [-1,1] center 1
}

function rebuildGraphHistory(seekAbsoluteTimestamp) {
    if (sensorData.length === 0) {
        dataHistory = [];
        return;
    }
    const windowStartTime = seekAbsoluteTimestamp - HISTORY_WINDOW_MS;
    dataHistory = [];
    let startIndex = 0;
    for(let i = 0; i < sensorData.length; i++) { // Find rough start index
        if (sensorData[i].timestamp >= windowStartTime) {
            startIndex = Math.max(0, i - 5); // Go back a few points for safety
            break;
        }
        if (i === sensorData.length - 1) startIndex = 0;
    }

    for (let i = startIndex; i < sensorData.length; i++) {
        const row = sensorData[i];
        if (row.timestamp >= windowStartTime && row.timestamp <= seekAbsoluteTimestamp) {
            dataHistory.push({ timestamp: row.timestamp, value: updateGraphVisualsHelper(row) });
        } else if (row.timestamp > seekAbsoluteTimestamp) {
            break;
        }
    }
    if (dataHistory.length > MAX_HISTORY_POINTS) {
        dataHistory = dataHistory.slice(dataHistory.length - MAX_HISTORY_POINTS);
    }
    dataHistory.sort((a, b) => a.timestamp - b.timestamp); // Ensure sorted
}

function updateParticleVisuals(data, deltaTime) {
    if (vizMode !== 'particles' || !particleSystem || !particleMaterial || !data) {
        if (particleSystem) particleSystem.visible = false;
        return;
    }
    if (particleSystem) particleSystem.visible = true;

    if (isPlaying && !isSeeking && particleMaterial.uniforms.uTime) { // uTime advances only if playing
         // deltaTime is already scaled by playbackSpeed effectively in animate's currentElapsedTargetMs
         // So particle uTime should directly track the current playback time in seconds
         particleMaterial.uniforms.uTime.value = data.timestamp / 1000.0;
    }

    const emotionFactor = getEmotionFactor(data.sessionEmotion);
    if (particleMaterial.uniforms.uSpeedFactor) {
        const targetSpeedFactor = emotionFactor.speedFactor;
        const lerpFactor = (isPlaying && !isSeeking) ? 0.15 : 1.0;
        particleMaterial.uniforms.uSpeedFactor.value = THREE.MathUtils.lerp(
            particleMaterial.uniforms.uSpeedFactor.value, targetSpeedFactor, lerpFactor
        );
    }

    if (isPlaying && !isSeeking && deltaTime > 0) { // Only emit if playing and time has advanced
        emitParticles(data, emotionFactor, deltaTime);
    }
}

function emitParticles(data, emotionFactor, deltaTimeS) {
    if (!pPositions || !pEmissionTimes || !particleGeometry || !data) return;

    let emissionRateModifier = 0;
    if (data.accelY && isFinite(data.accelY)) emissionRateModifier += Math.min(1.0, Math.abs(data.accelY) / 5.0) * 0.01;
    if (data.steps_in_interval > 0) emissionRateModifier += Math.min(1.0, data.steps_in_interval / 5.0) * 0.02;
    if (data.photoTakenId === 1) emissionRateModifier += 0.05;
    
    const finalEmissionRateS = (0.005 * 1000 + emissionRateModifier * 1000) * manualIntensityMultiplier * emotionFactor.particleMovement; // particles per second
    const particlesToEmit = Math.floor(finalEmissionRateS * deltaTimeS * playbackSpeed);

    if (particlesToEmit > 0) {
        const baseColor = parseSessionColor(data.sessionColor);
        // Emission time is current data timestamp in seconds
        const emissionTimeSeconds = data.timestamp / 1000.0; 

        let needsUpdate = false;
        for (let i = 0; i < particlesToEmit; i++) {
            const idx = pAttributeIndex;
            pPositions[idx * 3 + 0] = (Math.random() - 0.5) * 0.5; // X
            pPositions[idx * 3 + 1] = (Math.random() - 0.5) * 0.5; // Y
            pPositions[idx * 3 + 2] = (Math.random() - 0.5) * 0.1; // Z

            const speed = (0.05 + Math.random() * 0.1) * emotionFactor.speedFactor * manualVarietyMultiplier;
            const angle = Math.random() * Math.PI * 2;
            pVelocities[idx * 3 + 0] = Math.cos(angle) * speed;
            pVelocities[idx * 3 + 1] = Math.sin(angle) * speed;
            pVelocities[idx * 3 + 2] = (Math.random() - 0.5) * speed * 0.5;

            pEmissionTimes[idx] = emissionTimeSeconds;
            pLifespans[idx] = (3.0 + Math.random() * 2.0) / (manualIntensityMultiplier * (1 + (emotionFactor.particleMovement - 1.0) * 0.5));
            pSizes[idx] = (5 + Math.random() * 10) * emotionFactor.sizeVariety * manualVarietyMultiplier * (1 + manualHighlightMultiplier * 0.2);
            
            pColors[idx * 4 + 0] = Math.max(0, Math.min(1, baseColor.r + (Math.random() - 0.5) * (emotionFactor.sizeVariety - 1.0) * 0.2));
            pColors[idx * 4 + 1] = Math.max(0, Math.min(1, baseColor.g + (Math.random() - 0.5) * (emotionFactor.sizeVariety - 1.0) * 0.2));
            pColors[idx * 4 + 2] = Math.max(0, Math.min(1, baseColor.b + (Math.random() - 0.5) * (emotionFactor.sizeVariety - 1.0) * 0.2));
            pColors[idx * 4 + 3] = 0.5 + Math.random() * 0.5;

            pAttributeIndex = (pAttributeIndex + 1) % MAX_PARTICLES;
            particleCount = Math.min(particleCount + 1, MAX_PARTICLES);
            needsUpdate = true;
        }

        if (needsUpdate) {
            if (particleGeometry.attributes.initialPosition) particleGeometry.attributes.initialPosition.needsUpdate = true;
            if (particleGeometry.attributes.initialVelocity) particleGeometry.attributes.initialVelocity.needsUpdate = true;
            if (particleGeometry.attributes.emissionTime) particleGeometry.attributes.emissionTime.needsUpdate = true;
            if (particleGeometry.attributes.lifespan) particleGeometry.attributes.lifespan.needsUpdate = true;
            if (particleGeometry.attributes.size) particleGeometry.attributes.size.needsUpdate = true;
            if (particleGeometry.attributes.color) particleGeometry.attributes.color.needsUpdate = true;
        }
    }
}

function clearParticles() {
    particleCount = 0;
    pAttributeIndex = 0;
    if (pEmissionTimes) {
        for(let i = 0; i < MAX_PARTICLES; i++) pEmissionTimes[i] = -1000; // Mark as dead
    }
    if (particleGeometry?.attributes.emissionTime) {
        particleGeometry.attributes.emissionTime.needsUpdate = true;
    }
}

// --- Visualization Mode Switching ---
function setVisualizationMode(mode) {
    if (vizMode === mode && bgMesh) { // Check bgMesh to ensure init ran
         // If mode is same, still ensure visibility is correct (e.g. after error)
         bgMesh.visible = (mode === 'shader');
         if (graphLine) graphLine.visible = (mode === 'graph');
         if (graphShadedAreaMesh) graphShadedAreaMesh.visible = (mode === 'graph');
         if (pointMesh) pointMesh.visible = (mode === 'graph' && dataHistory.length > 0);
         if (particleSystem) particleSystem.visible = (mode === 'particles');
         return;
    }
    
    const oldVizMode = vizMode;
    vizMode = mode;

    if (bgMesh) bgMesh.visible = false;
    if (graphLine) graphLine.visible = false;
    if (graphShadedAreaMesh) graphShadedAreaMesh.visible = false;
    if (pointMesh) pointMesh.visible = false;
    if (particleSystem) particleSystem.visible = false;

    const currentDataRow = (sensorData.length > 0 && currentIndex >= 0 && currentIndex < sensorData.length) ? sensorData[currentIndex] : null;
    const currentTimeSec = currentDataRow ? currentDataRow.timestamp / 1000.0 : 0;

    switch (vizMode) {
        case 'shader':
            if (bgMesh) bgMesh.visible = true;
            if (bgShaderMaterial?.uniforms.uTime) {
                bgShaderMaterial.uniforms.uTime.value = currentTimeSec;
                delete bgShaderMaterial.uniforms.uTime.lastFrameTime;
            }
            if (currentDataRow) updateShaderVisuals(currentDataRow);
            else if (bgShaderMaterial?.uniforms) { // Reset to default if no data
                bgShaderMaterial.uniforms.uBaseColor.value.setRGB(0.2,0.3,0.7); /* defaults... */
            }
            break;
        case 'graph':
            if (graphLine) graphLine.visible = true;
            if (graphShadedAreaMesh) graphShadedAreaMesh.visible = true;
            // pointMesh visibility handled by updateGraphVisuals
            rebuildGraphHistory(currentDataRow ? currentDataRow.timestamp : 0);
            if (currentDataRow) updateGraphVisuals(currentDataRow);
            else if (graphGeometry) { graphGeometry.setDrawRange(0,0); /* clear graph */ }
            break;
        case 'particles':
            if (particleSystem) particleSystem.visible = true;
            clearParticles();
            if (particleMaterial?.uniforms.uTime) particleMaterial.uniforms.uTime.value = currentTimeSec;
            if (currentDataRow) updateParticleVisuals(currentDataRow, 0); // Update uniforms, no emission
            break;
    }

    if (toggleVizModeButton && currentVizModeTextElement) {
        const iconEl = toggleVizModeButton.querySelector('.material-symbols-outlined');
        if (iconEl) {
            if (mode === 'shader') {
                iconEl.textContent = 'scatter_plot'; toggleVizModeButton.title = 'Switch to Graph';
                currentVizModeTextElement.textContent = 'Shader';
            } else if (mode === 'graph') {
                iconEl.textContent = 'auto_awesome'; toggleVizModeButton.title = 'Switch to Particles';
                currentVizModeTextElement.textContent = 'Graph';
            } else { // particles
                iconEl.textContent = 'palette'; toggleVizModeButton.title = 'Switch to Shader';
                currentVizModeTextElement.textContent = 'Particles';
            }
        }
    }
    if (!isPlaying && !isSeeking) renderCurrentFrame();
}

function toggleVisualizationMode() {
    if (vizMode === 'shader') setVisualizationMode('graph');
    else if (vizMode === 'graph') setVisualizationMode('particles');
    else setVisualizationMode('shader');
}

// --- UI Customization (Dark Mode, Panel, Multipliers) ---
function setInitialTheme() {
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) enableDarkMode();
    else disableDarkMode();
}

function toggleDarkMode() {
    if (darkModeEnabled) disableDarkMode();
    else enableDarkMode();
}

function enableDarkMode() {
    document.documentElement.setAttribute('data-theme', 'dark');
    darkModeEnabled = true;
    if (toggleDarkModeButton?.querySelector('.material-symbols-outlined')) {
        toggleDarkModeButton.querySelector('.material-symbols-outlined').textContent = 'light_mode';
        toggleDarkModeButton.title = 'Switch to Light Mode';
    }
    if (graphMaterial) graphMaterial.color.setHex(0xBB86FC);
    if (graphShadedAreaMaterial) graphShadedAreaMaterial.color.setHex(0xBB86FC);
    if (pointMesh?.material) pointMesh.material.color.setHex(0xFFFFFF);
    if (!isPlaying && !isSeeking && sensorData.length > 0 && currentIndex < sensorData.length && vizMode === 'graph') {
        updateGraphVisuals(sensorData[currentIndex]); // Update colors
        renderCurrentFrame();
    }
}

function disableDarkMode() {
    document.documentElement.removeAttribute('data-theme');
    darkModeEnabled = false;
    if (toggleDarkModeButton?.querySelector('.material-symbols-outlined')) {
        toggleDarkModeButton.querySelector('.material-symbols-outlined').textContent = 'dark_mode';
        toggleDarkModeButton.title = 'Switch to Dark Mode';
    }
    if (graphMaterial) graphMaterial.color.setHex(0x8844EE);
    if (graphShadedAreaMaterial) graphShadedAreaMaterial.color.setHex(0x8844EE);
    if (pointMesh?.material) pointMesh.material.color.setHex(0x000000);
    if (!isPlaying && !isSeeking && sensorData.length > 0 && currentIndex < sensorData.length && vizMode === 'graph') {
        updateGraphVisuals(sensorData[currentIndex]); // Update colors
        renderCurrentFrame();
    }
}

function toggleCustomizationPanel() {
    customizationPanelVisible = !customizationPanelVisible;
    if (customizationPanel) {
        customizationPanel.classList.toggle('visible', customizationPanelVisible);
        customizationPanel.classList.toggle('hidden', !customizationPanelVisible);
    }
    if (toggleCustomizationButton?.querySelector('.material-symbols-outlined')) {
        toggleCustomizationButton.querySelector('.material-symbols-outlined').textContent = customizationPanelVisible ? 'close' : 'tune';
    }
}

function updateMultiplierDisplay(event) {
    if (!event.target) return;
    const sliderId = event.target.id;
    const value = parseFloat(event.target.value);

    if (sliderId === 'intensityMultiplier' && intensityValueDisplay) {
        manualIntensityMultiplier = value; intensityValueDisplay.textContent = `${value.toFixed(1)}x`;
    } else if (sliderId === 'varietyMultiplier' && varietyValueDisplay) {
        manualVarietyMultiplier = value; varietyValueDisplay.textContent = `${value.toFixed(1)}x`;
    } else if (sliderId === 'highlightMultiplier' && highlightValueDisplay) {
        manualHighlightMultiplier = value; highlightValueDisplay.textContent = `${value.toFixed(1)}x`;
    }

    if (!isPlaying && !isSeeking && sensorData.length > 0 && currentIndex < sensorData.length) {
        const currentRow = sensorData[currentIndex];
        if (vizMode === 'graph') rebuildGraphHistory(currentRow.timestamp); // Graph Y values depend on multipliers
        updateVisualsAndAudioForData(currentRow, 0); // Update all visuals with new multipliers
        renderCurrentFrame();
    }
}

// --- Audio Updates ---
function getAudioTargetGain(data, emotionFactor) {
    let targetGain = 0.02; // Base
    if (data?.decibels && isFinite(data.decibels)) {
        targetGain += Math.min(1, Math.max(0, (data.decibels + 40) / 70.0)) * 0.06;
    }
    if (emotionFactor) targetGain *= (emotionFactor.apertureFactor || 1.0);
    return Math.min(0.15, Math.max(0, targetGain));
}

// Renamed from updateAudio to avoid confusion with visual updates. This sets parameters. Actual gain set by setAudioGain.
function updateAudioParameters(data, emotionFactor) {
    if (!isAudioInitialized || !audioContext || audioContext.state === 'closed' || !data) return;

    const audioTime = audioContext.currentTime;
    const smooth = 0.05;
    let targetFreq = 440, targetFilterFreq = 2500, targetFilterQ = 1;

    if (data.temperature_celsius && isFinite(data.temperature_celsius)) {
        targetFreq = 220 + Math.min(1, Math.max(0, (data.temperature_celsius - 10) / 25)) * 660;
    }
    if (data.decibels && isFinite(data.decibels)) {
        targetFilterFreq = 2000 + Math.min(1, Math.max(0, (data.decibels + 40) / 70.0)) * 3000;
    }

    if (oscillator) {
        switch (data.sessionEmotion) {
            case "楽しい": oscillator.type = 'triangle'; targetFreq *= (1 + (emotionFactor.speedFactor - 1) * 0.2); targetFilterFreq = 4000 + (emotionFactor.particleMovement - 1) * 1000; targetFilterQ = 1.5 + (emotionFactor.sizeVariety - 1) * 0.5; break;
            case "悲しい": oscillator.type = 'sine'; targetFreq *= (1 - (1 - emotionFactor.speedFactor) * 0.2); targetFilterFreq = 800 + (1 - emotionFactor.colorVariety) * 500; targetFilterQ = 0.9; break;
            case "怒り": oscillator.type = 'sawtooth'; targetFreq *= (1 + (emotionFactor.speedFactor - 1) * 0.3); targetFilterFreq = 2500 + (emotionFactor.speedFactor - 1) * 1500 + Math.random() * 500; targetFilterQ = 3 + (emotionFactor.particleMovement - 1) * 2 + Math.random(); break;
            case "穏やか": oscillator.type = 'sine'; targetFreq *= (1 - (1 - emotionFactor.speedFactor) * 0.1); targetFilterFreq = 1800 + (emotionFactor.speedFactor - 1) * 500; targetFilterQ = 1.2; break;
            default: oscillator.type = 'sine'; break;
        }
    }

    const finalFreq = Math.max(50, Math.min(10000, targetFreq));
    if (oscillator && Math.abs(finalFreq - currentAudioParams.frequency) > 0.1) { // Threshold to avoid rapid small changes
        oscillator.frequency.setTargetAtTime(finalFreq, audioTime, smooth);
        currentAudioParams.frequency = finalFreq;
    }
    const finalFilterFreq = Math.max(100, Math.min(8000, targetFilterFreq));
    if (filterNode && Math.abs(finalFilterFreq - currentAudioParams.filterFreq) > 1) {
        filterNode.frequency.setTargetAtTime(finalFilterFreq, audioTime, smooth);
        currentAudioParams.filterFreq = finalFilterFreq;
    }
    const finalFilterQ = Math.max(0.1, Math.min(10, targetFilterQ));
    if (filterNode && Math.abs(finalFilterQ - currentAudioParams.filterQ) > 0.01) {
        filterNode.Q.setTargetAtTime(finalFilterQ, audioTime, smooth);
        currentAudioParams.filterQ = finalFilterQ;
    }
    
    // Event sounds
    if (isPlaying && !isSeeking && data.steps_in_interval > 0) {
        const stepDebounce = 0.1 / playbackSpeed;
        if (!updateAudioParameters.lastStepTime || (audioTime - updateAudioParameters.lastStepTime >= stepDebounce)) {
            const sOsc = audioContext.createOscillator(), sGain = audioContext.createGain(), sFilt = audioContext.createBiquadFilter();
            sOsc.type = 'triangle';
            sOsc.frequency.setValueAtTime(Math.max(300, Math.min(900, 300 + Math.random()*100 + Math.min(data.steps_in_interval,10)*30 + (emotionFactor.speedFactor-1)*100)), audioTime);
            sFilt.type = 'bandpass';
            sFilt.frequency.setValueAtTime(Math.max(500, Math.min(3000, 800 + Math.min(data.steps_in_interval,10)*60 + (emotionFactor.colorVariety-1)*200)), audioTime);
            sFilt.Q.setValueAtTime(5 + Math.min(data.steps_in_interval,10)*0.5, audioTime);
            sGain.gain.setValueAtTime(0.05 * Math.min(data.steps_in_interval/5,1) * (emotionFactor.apertureFactor||1), audioTime);
            sGain.gain.exponentialRampToValueAtTime(0.0001, audioTime + 0.15/playbackSpeed);
            sOsc.connect(sFilt); sFilt.connect(sGain); sGain.connect(audioContext.destination);
            sOsc.start(audioTime); sOsc.stop(audioTime + 0.2/playbackSpeed);
            updateAudioParameters.lastStepTime = audioTime;
        }
    }
    if (isPlaying && !isSeeking && data.photoTakenId === 1) {
        const photoDebounce = 0.5 / playbackSpeed;
        if (!updateAudioParameters.lastPhotoTime || (audioTime - updateAudioParameters.lastPhotoTime >= photoDebounce)) {
            const pOsc = audioContext.createOscillator(), pGain = audioContext.createGain(), pFilt = audioContext.createBiquadFilter();
            pOsc.type = 'square';
            pOsc.frequency.setValueAtTime(2500 + (emotionFactor.speedFactor-1)*500, audioTime);
            pFilt.type = 'highpass';
            pFilt.frequency.setValueAtTime(1500 + (emotionFactor.particleMovement-1)*300, audioTime);
            pFilt.Q.setValueAtTime(1.0, audioTime);
            pGain.gain.setValueAtTime(0.15 * (emotionFactor.apertureFactor||1), audioTime);
            pGain.gain.exponentialRampToValueAtTime(0.0001, audioTime + 0.1/playbackSpeed);
            pOsc.connect(pFilt); pFilt.connect(pGain); pGain.connect(audioContext.destination);
            pOsc.start(audioTime); pOsc.stop(audioTime + 0.15/playbackSpeed);
            updateAudioParameters.lastPhotoTime = audioTime;
        }
    }
}
updateAudioParameters.lastStepTime = 0;
updateAudioParameters.lastPhotoTime = 0;


// --- Helper Functions ---
function parseSessionColor(colorName) {
    switch (colorName) {
        case "黄": return { r: 0.98, g: 0.85, b: 0.3 };
        case "赤": return { r: 0.98, g: 0.25, b: 0.25 };
        case "青": return { r: 0.25, g: 0.6, b: 0.98 };
        case "緑": return { r: 0.3, g: 0.95, b: 0.4 };
        case "紫": return { r: 0.8, g: 0.4, b: 0.95 };
        default: return { r: 0.5, g: 0.5, b: 0.7 };
    }
}

function getEmotionFactor(emotionName) {
    switch (emotionName) {
        case "楽しい": return { speedFactor: 2.0, colorVariety: 2.5, sizeVariety: 1.5, particleMovement: 2.2, apertureFactor: 1.5 };
        case "悲しい": return { speedFactor: 0.4, colorVariety: 0.1, sizeVariety: 0.6, particleMovement: 0.2, apertureFactor: 0.6 };
        case "怒り": return { speedFactor: 3.0, colorVariety: 2.0, sizeVariety: 1.8, particleMovement: 3.5, apertureFactor: 1.8 };
        case "穏やか": return { speedFactor: 0.6, colorVariety: 0.4, sizeVariety: 0.8, particleMovement: 0.5, apertureFactor: 0.8 };
        default: return { speedFactor: 1.0, colorVariety: 1.0, sizeVariety: 1.0, particleMovement: 1.0, apertureFactor: 1.0 };
    }
}

function formatTime(ms) {
    if (isNaN(ms) || ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function onWindowResize() {
    if (!camera || !renderer) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    // backgroundCamera is orthographic, typically doesn't need aspect update unless its definition changes
    renderer.setSize(width, height);
    
    // Re-render current frame if paused/not seeking
    if (!isPlaying && !isSeeking) {
        if (sensorData.length > 0 && currentIndex < sensorData.length) {
            updateVisualsAndAudioForData(sensorData[currentIndex], 0); // Re-calc graph x-range, etc.
        }
        renderCurrentFrame();
    }
}

// --- DOMContentLoaded: Main Application Setup ---
document.addEventListener('DOMContentLoaded', () => {
    // Fetch DOM elements
    csvFileInput = document.getElementById('csvFile');
    playButton = document.getElementById('playButton');
    pauseButton = document.getElementById('pauseButton');
    resetButton = document.getElementById('resetButton');
    speedControl = document.getElementById('speedControl');
    speedValueDisplay = document.getElementById('speedValue');
    vizContainer = document.getElementById('visualizationContainer');
    csvFileNameDisplay = document.getElementById('csvFileName');
    currentDataDisplay = document.getElementById('currentData');
    seekBar = document.getElementById('seekBar');
    currentTimeDisplay = document.getElementById('currentTimeDisplay');
    totalTimeDisplay = document.getElementById('totalTimeDisplay');
    toggleDarkModeButton = document.getElementById('toggleDarkModeButton');
    toggleCustomizationButton = document.getElementById('toggleCustomizationButton');
    customizationPanel = document.getElementById('customizationPanel');
    intensityMultiplierSlider = document.getElementById('intensityMultiplier');
    intensityValueDisplay = document.getElementById('intensityValue');
    varietyMultiplierSlider = document.getElementById('varietyMultiplier');
    varietyValueDisplay = document.getElementById('varietyValue');
    highlightMultiplierSlider = document.getElementById('highlightMultiplier');
    highlightValueDisplay = document.getElementById('highlightValue');
    toggleVizModeButton = document.getElementById('toggleVizModeButton');
    currentVizModeTextElement = document.getElementById('currentVizModeText');

    // Check for critical library
    if (typeof Papa === 'undefined') {
        console.error("PapaParse library not loaded. CSV functionality disabled.");
        if (currentDataDisplay) currentDataDisplay.innerHTML = '<pre style="color: red;">Error: CSV library missing. App disabled.</pre>';
        // Disable all controls
        const controls = [csvFileInput, playButton, pauseButton, resetButton, speedControl, seekBar, toggleCustomizationButton, toggleVizModeButton, intensityMultiplierSlider, varietyMultiplierSlider, highlightMultiplierSlider];
        controls.forEach(el => { if (el) el.disabled = true; });
        return;
    }

    // Initialize Three.js and Audio
    initThreeJS();
    if (vizContainer && renderer) {
        vizContainer.appendChild(renderer.domElement);
    } else {
        console.error("Visualization container or renderer is null. Cannot append renderer.");
        if (currentDataDisplay) currentDataDisplay.innerHTML = '<pre style="color: red;">Error: Viz init failed.</pre>';
        return; // Stop further Three.js dependent setup
    }
    initAudio(); // Initialize audio context

    // Setup Event Listeners
    if (csvFileInput) csvFileInput.addEventListener('change', handleFileLoad);
    if (playButton) playButton.addEventListener('click', playAnimation);
    if (pauseButton) pauseButton.addEventListener('click', pauseAnimation);
    if (resetButton) resetButton.addEventListener('click', resetAnimation);
    if (speedControl) {
        speedControl.addEventListener('input', (e) => {
            playbackSpeed = parseFloat(e.target.value);
            if (speedValueDisplay) speedValueDisplay.textContent = `${playbackSpeed.toFixed(1)}x`;
            if (isPlaying) { // Recalculate actualStartTime if playing to maintain smooth speed change
                 const elapsedCsvTime = (sensorData.length > 0 && currentIndex >= 0 && currentIndex < sensorData.length) 
                               ? sensorData[currentIndex].timestamp : 0;
                 actualStartTime = performance.now() - (elapsedCsvTime / playbackSpeed);
            }
        });
    }
    if (seekBar) {
        seekBar.addEventListener('input', handleSeekBarInput);
        seekBar.addEventListener('change', handleSeekBarChange);
    }
    if (toggleDarkModeButton) toggleDarkModeButton.addEventListener('click', toggleDarkMode);
    if (toggleCustomizationButton) toggleCustomizationButton.addEventListener('click', toggleCustomizationPanel);
    if (intensityMultiplierSlider) intensityMultiplierSlider.addEventListener('input', updateMultiplierDisplay);
    if (varietyMultiplierSlider) varietyMultiplierSlider.addEventListener('input', updateMultiplierDisplay);
    if (highlightMultiplierSlider) highlightMultiplierSlider.addEventListener('input', updateMultiplierDisplay);
    if (toggleVizModeButton) toggleVizModeButton.addEventListener('click', toggleVisualizationMode);
    
    window.addEventListener('resize', onWindowResize);

    // Set Initial State
    setInitialTheme();
    if (intensityValueDisplay && intensityMultiplierSlider) intensityValueDisplay.textContent = `${parseFloat(intensityMultiplierSlider.value).toFixed(1)}x`;
    if (varietyValueDisplay && varietyMultiplierSlider) varietyValueDisplay.textContent = `${parseFloat(varietyMultiplierSlider.value).toFixed(1)}x`;
    if (highlightValueDisplay && highlightMultiplierSlider) highlightValueDisplay.textContent = `${parseFloat(highlightMultiplierSlider.value).toFixed(1)}x`;
    
    setVisualizationMode('shader'); // Default viz mode
    pauseAnimation(); // Set initial button states
    onWindowResize(); // Initial render and size adjustment

    console.log("Application initialized.");
});
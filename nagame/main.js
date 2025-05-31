
// グローバル変数
let scene, camera, renderer;
let sensorData = [];
let currentIndex = 0;
let animationStartTime = 0;
let lastProcessedTimestamp = 0;
let playbackSpeed = 1.0;
let isPlaying = false;
let animationFrameId;

let bgShaderMaterial, backgroundScene, backgroundCamera; // 背景用 (Shader)
// Graph specific variables
let graphLine, graphPoint, graphGeometry, graphMaterial, pointMesh; // Graph line and point
let graphShadedAreaMesh, graphShadedAreaGeometry, graphShadedAreaMaterial; // Graph shaded area
let dataHistory = [];
const HISTORY_WINDOW_MS = 15000; // 15 seconds history window for the graph
const MAX_HISTORY_POINTS = 500; // Limit number of points in history for performance


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


// 状態変数
let darkModeEnabled = false;
let customizationPanelVisible = false; // Customization panel state
let vizMode = 'shader'; // 'shader' or 'graph'
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

// 初期化処理
function init() {
    scene = new THREE.Scene(); // Used for Graph
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 1.0; // Camera position for Graph/Shader elements at Z=0

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.autoClear = false;
    vizContainer.appendChild(renderer.domElement);

    // Setup for the Shader background
    backgroundScene = new THREE.Scene();
    backgroundCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); // Fixed orthographic camera for the 2D shader plane
    const bgPlaneGeo = new THREE.PlaneGeometry(2, 2); // Plane covers the whole screen (-1 to 1 in orthographic space)
    bgShaderMaterial = new THREE.ShaderMaterial({
        vertexShader: backgroundVertexShader,
        fragmentShader: backgroundFragmentShader,
        uniforms: {
            uTime: { value: 0.0 },
            uBaseColor: { value: new THREE.Color(0.2, 0.3, 0.7) }, // 初期ベースカラー (RGB)
            uHighlightIntensity: { value: 0.1 },                 // 初期ハイライト強度
            uEmotionSpeed: { value: 0.5 },                       // 感情による速度係数
            uEmotionIntensity: { value: 0.3 },                   // 感情による変化の強さ係数
            uColorVariety: { value: 0.2 }                        // 感情による色の多様性
        },
        depthTest: false,
        depthWrite: false
    });
    const bgMesh = new THREE.Mesh(bgPlaneGeo, bgShaderMaterial);
    backgroundScene.add(bgMesh);

    // Initialize graph visualization elements
    initGraph();


    // イベントリスナー設定
    csvFileInput.addEventListener('change', handleFileLoad);
    playButton.addEventListener('click', playAnimation);
    pauseButton.addEventListener('click', pauseAnimation);
    resetButton.addEventListener('click', resetAnimation);
    speedControl.addEventListener('input', (e) => {
        playbackSpeed = parseFloat(e.target.value);
        speedValueDisplay.textContent = `${playbackSpeed.toFixed(1)}x`;
        // Playback speed affects uEmotionSpeed calculation in updateShaderVisuals and graph x-axis time mapping
         if (!isPlaying && !isSeeking && sensorData.length > 0 && currentIndex >= 0) {
              if (vizMode === 'shader') {
                   // Re-calculate shader uniforms based on new playback speed
                   updateShaderVisuals(sensorData[currentIndex]); // This recalculates speed factor
                   renderer.clear();
                   renderer.render(backgroundScene, backgroundCamera);
              } else {
                   // Graph time mapping depends on playbackSpeed indirectly via animate loop's cappedElapsedTarget
                   // Redraw graph with current data point based on new speed affecting history time window
                   rebuildGraphHistory(sensorData[currentIndex].timestamp);
                   updateGraphVisuals(sensorData[currentIndex]);
                   renderer.clear();
                   renderer.render(scene, camera);
              }
         }
    });
    seekBar.addEventListener('input', handleSeekBarInput);
    seekBar.addEventListener('change', handleSeekBarChange);
    seekBar.disabled = true;

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
    graphMaterial = new THREE.LineBasicMaterial({ color: 0x8844EE, linewidth: 2 }); // Purple color
    graphLine = new THREE.Line(graphGeometry, graphMaterial);
    scene.add(graphLine); // Add to the main scene

    // Create graph shaded area geometry (dynamic mesh)
    graphShadedAreaGeometry = new THREE.BufferGeometry();
    graphShadedAreaGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_HISTORY_POINTS * 4 * 3), 3));
    graphShadedAreaGeometry.setIndex(new THREE.BufferAttribute(new Uint16Array((MAX_HISTORY_POINTS - 1) * 6), 1));
    graphShadedAreaMaterial = new THREE.MeshBasicMaterial({
        color: 0x8844EE,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
    });
    graphShadedAreaMesh = new THREE.Mesh(graphShadedAreaGeometry, graphShadedAreaMaterial);
    scene.add(graphShadedAreaMesh);


    // Create the current point indicator (sphere)
    const pointGeometry = new THREE.SphereGeometry(0.02, 16, 16);
    const pointMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    pointMesh = new THREE.Mesh(pointGeometry, pointMaterial);
    scene.add(pointMesh);

    // Initialize data history
    dataHistory = [];
}

function toggleVisualizationMode() {
    vizMode = vizMode === 'shader' ? 'graph' : 'shader';
    setVisualizationMode(vizMode);
}

function setVisualizationMode(mode) {
    vizMode = mode;
    // Update button text/icon
    toggleVizModeButton.querySelector('.material-symbols-outlined').textContent = vizMode === 'shader' ? 'area_chart' : 'blur_on';
    toggleVizModeButton.title = vizMode === 'shader' ? 'Switch to Graph Viz' : 'Switch to Shader Viz';

    // Manage visibility of visualization elements
    const isShader = vizMode === 'shader';
    if (backgroundScene.children[0]) backgroundScene.children[0].visible = isShader; // The shader plane
    if (graphLine) graphLine.visible = !isShader;
    // Only show point/shaded area if in graph mode AND data exists (checked inside updateGraphVisuals)
    if (pointMesh) pointMesh.visible = !isShader && dataHistory.length > 0; // Initial visibility state
    if (graphShadedAreaMesh) graphShadedAreaMesh.visible = !isShader && dataHistory.length >= 2; // Initial visibility state


    // Re-render immediately to show the change if not playing/seeking
    if (!isPlaying && !isSeeking) {
         if (sensorData.length > 0 && currentIndex >= 0) {
             // Update visuals based on the new mode's requirements using the current data
             if (vizMode === 'shader') {
                 updateShaderVisuals(sensorData[currentIndex]);
             } else { // vizMode === 'graph'
                 // For graph, rebuild history and update geometry based on current time
                 rebuildGraphHistory(sensorData[currentIndex].timestamp);
                 updateGraphVisuals(sensorData[currentIndex]); // Update graph geometry based on history
             }
              renderer.clear();
              if (vizMode === 'shader') {
                   renderer.render(backgroundScene, backgroundCamera);
               } else {
                   renderer.render(scene, camera);
               }
         } else {
             // No data, render default state for the mode
             renderer.clear();
             if (vizMode === 'shader') {
                 renderer.render(backgroundScene, backgroundCamera);
             } else {
                 // Graph mode with no data: render empty graph scene
                 if (graphGeometry) graphGeometry.setDrawRange(0, 0);
                  if (graphShadedAreaGeometry) graphShadedAreaGeometry.setDrawRange(0, 0);
                 if (pointMesh) pointMesh.visible = false;
                 graphLine.visible = (vizMode === 'graph'); // Keep line/mesh objects visible, but empty
                 graphShadedAreaMesh.visible = (vizMode === 'graph');
                 renderer.render(scene, camera);
             }
         }
    }
}


// Modify animate function
function animate() {
    if (!isPlaying) {
         animationFrameId = null;
         return;
    }
    animationFrameId = requestAnimationFrame(animate);

    const performanceNow = performance.now();
    const performanceElapsed = performanceNow - actualStartTime;
    const currentCsvElapsedTarget = (performanceElapsed * playbackSpeed);
    // Ensure currentCsvElapsedTarget doesn't exceed total duration
     const totalDurationMs = sensorData.length > 0 ? sensorData[sensorData.length - 1].timestamp - sensorData[0].timestamp : 0;
     const cappedElapsedTarget = Math.min(totalDurationMs, currentCsvElapsedTarget);

    const currentCsvTimestampTarget = sensorData.length > 0 ? sensorData[0].timestamp + cappedElapsedTarget : 0;


    let nextIndex = currentIndex;
     // Ensure we don't go out of bounds
    while (nextIndex < sensorData.length - 1 && sensorData[nextIndex + 1].timestamp <= currentCsvTimestampTarget) {
        nextIndex++;
    }
     // Ensure the index corresponds to the capped time target if we jump ahead
    if (sensorData.length > 0 && sensorData[nextIndex].timestamp > currentCsvTimestampTarget) {
         // This shouldn't happen with the while loop condition, but as a safeguard:
         // If the current index timestamp is past the target, find the correct index again from the start
         nextIndex = 0;
         while (nextIndex < sensorData.length - 1 && sensorData[nextIndex + 1].timestamp <= currentCsvTimestampTarget) {
              nextIndex++;
         }
    }


    if (nextIndex !== currentIndex || currentIndex === 0) { // Always update on first frame or index change
        currentIndex = nextIndex;
        const currentRow = sensorData[currentIndex];
        if (currentRow) {
            // Update visuals based on current mode
            if (vizMode === 'shader') {
                updateShaderVisuals(currentRow);
            } else { // vizMode === 'graph'
                 // Add current point to history
                const scaledY = updateGraphVisualsHelper(currentRow); // Calculate value
                const currentTimestamp = currentRow.timestamp;
                // Filter old points from history *before* adding the new one
                const windowStartTime = currentTimestamp - HISTORY_WINDOW_MS;
                dataHistory = dataHistory.filter(point => point.timestamp >= windowStartTime);
                // Add the new point
                dataHistory.push({ timestamp: currentTimestamp, value: scaledY });
                 // Cap history size
                 if (dataHistory.length > MAX_HISTORY_POINTS) {
                     dataHistory = dataHistory.slice(dataHistory.length - MAX_HISTORY_POINTS);
                 }
                updateGraphVisuals(currentRow); // Update geometry based on the new history
            }

            // Update audio regardless of mode
            const emotionFactor = getEmotionFactor(currentRow.sessionEmotion);
            updateAudio(currentRow, emotionFactor);

            lastProcessedTimestamp = currentRow.timestamp;
        }
    }

    // Update shader uTime only if in shader mode
    if (vizMode === 'shader' && bgShaderMaterial && bgShaderMaterial.uniforms.uTime) {
        const lastTime = bgShaderMaterial.uniforms.uTime.lastTime || performanceNow;
        const deltaTime = (performanceNow - lastTime) / 1000.0;
        bgShaderMaterial.uniforms.uTime.value += deltaTime * playbackSpeed; // uTime should also scale with playback speed
        bgShaderMaterial.uniforms.uTime.lastTime = performanceNow;
        if(isNaN(bgShaderMaterial.uniforms.uTime.value)) bgShaderMaterial.uniforms.uTime.value = 0;
    }


    // Update seek bar and time display regardless of mode
    if (!isSeeking && sensorData.length > 0) {
        seekBar.value = Math.max(0, Math.min(parseFloat(seekBar.max), cappedElapsedTarget)); // Use capped time
        currentTimeDisplay.textContent = formatTime(cappedElapsedTarget); // Use capped time
    }

    // Render based on current mode
    renderer.clear(); // Clear the buffer
    if (vizMode === 'shader') {
        renderer.render(backgroundScene, backgroundCamera); // Render shader scene
    } else { // vizMode === 'graph'
        renderer.render(scene, camera); // Render graph scene
    }

    // Animation end check
    if (sensorData.length > 0 && currentIndex >= sensorData.length - 1 && cappedElapsedTarget >= totalDurationMs) {
        pauseAnimation();
        resetButton.disabled = false;
        seekBar.value = seekBar.max;
        currentTimeDisplay.textContent = totalTimeDisplay.textContent;
         // Ensure visuals are updated to the very last frame upon finishing
         if (vizMode === 'shader') {
              updateShaderVisuals(sensorData[sensorData.length - 1]);
         } else {
             rebuildGraphHistory(sensorData[sensorData.length - 1].timestamp); // Rebuild history up to end
             updateGraphVisuals(sensorData[sensorData.length - 1]); // Update graph
         }
         renderer.clear();
         if (vizMode === 'shader') {
              renderer.render(backgroundScene, backgroundCamera);
         } else {
              renderer.render(scene, camera);
         }
    }
}


// Rename original updateVisuals to updateShaderVisuals
function updateShaderVisuals(data, options = {}) {
    if (!data || !bgShaderMaterial) return;

    const defaultOptions = {
        applyManualMultipliersOnly: false
    };
    const finalOptions = { ...defaultOptions, ...options };

    // Update data display (always show data regardless of viz mode)
    if (!finalOptions.applyManualMultipliersOnly) { // Only update data display if not just applying multipliers
        let dataStr = "";
        const keysToShow = ['timestamp', 'sessionColor', 'sessionEmotion', 'temperature_celsius', 'illuminance', 'decibels', 'accelY', 'steps_in_interval', 'photoTakenId'];
        for(const key of keysToShow){
            if(data[key] !== undefined && data[key] !== null){
                let value = data[key];
                 if (typeof value === 'number') {
                    if (!Number.isInteger(value)) {
                        value = value.toFixed(2);
                    }
                    if(key === 'temperature_celsius') value += ' °C';
                    if(key === 'decibels') value += ' dB';
                }
                dataStr += `${key}: ${value}\n`;
            }
        }
        currentDataDisplay.innerHTML = `<pre>${dataStr}</pre>`;
    }

    // --- Update Shader Uniforms ---
    // Only update shader uniforms if currently in shader mode OR if applyManualMultipliersOnly is true (for slider updates while paused in shader mode)
    if (vizMode === 'shader' || (finalOptions.applyManualMultipliersOnly && vizMode === 'shader')) { // Explicitly check vizMode
         const lerpFactor = isPlaying ? 0.15 : 1.0;

         if (!finalOptions.applyManualMultipliersOnly) {
             let baseColorData = parseSessionColor(data.sessionColor);
             if (!baseColorData || typeof baseColorData.r === 'undefined') {
                 baseColorData = { r: 0.4, g: 0.4, b: 0.6 };
             }
             const targetBaseColor = new THREE.Color(baseColorData.r, baseColorData.g, baseColorData.b);
             bgShaderMaterial.uniforms.uBaseColor.value.lerp(targetBaseColor, lerpFactor);

             let dataHighlight = 0.05;
             if (data.illuminance != null && typeof data.illuminance === 'number') {
                  const minLogLux = Math.log(1);
                  const maxLogLux = Math.log(10001);
                  const logLux = Math.log(Math.max(1, data.illuminance + 1));
                  const luxNorm = Math.min(1.0, Math.max(0.0, (logLux - minLogLux) / (maxLogLux - minLogLux)));
                  dataHighlight += luxNorm * 1.5;
             }
             if (data.decibels != null && typeof data.decibels === 'number') {
                 const decibelNorm = Math.min(1.0, Math.max(0.0, (data.decibels + 40) / 70.0));
                 dataHighlight += decibelNorm * 0.6;
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

             // Effective speed affects the shader animation speed directly
             const effectiveSpeed = emotionFactor.speedFactor * playbackSpeed;
             bgShaderMaterial.uniforms.uEmotionSpeed.value = THREE.MathUtils.lerp(
                 bgShaderMaterial.uniforms.uEmotionSpeed.value,
                 effectiveSpeed,
                 lerpFactor
             );

             const dataIntensity = (emotionFactor.particleMovement * 0.7 + 0.1);
             const finalIntensity = dataIntensity * manualIntensityMultiplier;
             bgShaderMaterial.uniforms.uEmotionIntensity.value = THREE.MathUtils.lerp(
                 bgShaderMaterial.uniforms.uEmotionIntensity.value,
                 Math.max(0.1, Math.min(2.0, finalIntensity)),
                 lerpFactor
             );

             const dataVariety = emotionFactor.colorVariety * 0.5;
             const finalVariety = dataVariety * manualVarietyMultiplier;
             bgShaderMaterial.uniforms.uColorVariety.value = THREE.MathUtils.lerp(
                 bgShaderMaterial.uniforms.uColorVariety.value,
                 Math.max(0.1, Math.min(1.5, finalVariety)),
                 lerpFactor
             );

         } else { // applyManualMultipliersOnly is true
             const lerpFactorManual = 1.0; // Apply multipliers instantly

             const currentCalculatedHighlightBase = bgShaderMaterial.uniforms.uHighlightIntensity.value / (manualHighlightMultiplier || 1.0);
             const currentCalculatedIntensityBase = bgShaderMaterial.uniforms.uEmotionIntensity.value / (manualIntensityMultiplier || 1.0);
             const currentCalculatedVarietyBase = bgShaderMaterial.uniforms.uColorVariety.value / (manualVarietyMultiplier || 1.0);

             const targetHighlight = Math.max(0.0, Math.min(3.0, currentCalculatedHighlightBase * manualHighlightMultiplier));
             const targetIntensity = Math.max(0.1, Math.min(2.0, currentCalculatedIntensityBase * manualIntensityMultiplier));
             const targetVariety = Math.max(0.1, Math.min(1.5, currentCalculatedVarietyBase * manualVarietyMultiplier));

             bgShaderMaterial.uniforms.uHighlightIntensity.value = THREE.MathUtils.lerp(bgShaderMaterial.uniforms.uHighlightIntensity.value, targetHighlight, lerpFactorManual);
             bgShaderMaterial.uniforms.uEmotionIntensity.value = THREE.MathUtils.lerp(bgShaderMaterial.uniforms.uEmotionIntensity.value, targetIntensity, lerpFactorManual);
             bgShaderMaterial.uniforms.uColorVariety.value = THREE.MathUtils.lerp(bgShaderMaterial.uniforms.uColorVariety.value, targetVariety, lerpFactorManual);
         }

         // Photo flash effect - still applies in shader mode
        if (data.photoTakenId === 1) {
            if (bgShaderMaterial) {
                const currentCalculatedHighlight = bgShaderMaterial.uniforms.uHighlightIntensity.value;
                const flashBoost = 1.5;
                const flashTargetHighlight = Math.min(3.5, currentCalculatedHighlight + flashBoost);
                const flashDuration = 150;

                // Only manually render the flash if paused and in shader mode
                const needsRender = !isPlaying && !isSeeking && vizMode === 'shader';

                if (needsRender) renderer.clear();

                bgShaderMaterial.uniforms.uHighlightIntensity.value = flashTargetHighlight;
                if (needsRender) renderer.render(backgroundScene, backgroundCamera);

                setTimeout(() => {
                     if (bgShaderMaterial) {
                        // Lerp back to the value calculated from data + multipliers
                         // Re-calculate the intended value without the flash boost
                         let dataHighlight = 0.05;
                          if (data.illuminance != null && typeof data.illuminance === 'number') {
                             const minLogLux = Math.log(1); const maxLogLux = Math.log(10001);
                             const logLux = Math.log(Math.max(1, data.illuminance + 1));
                             const luxNorm = Math.min(1.0, Math.max(0.0, (logLux - minLogLux) / (maxLogLux - minLogLux)));
                             dataHighlight += luxNorm * 1.5;
                          }
                          if (data.decibels != null && typeof data.decibels === 'number') {
                              const decibelNorm = Math.min(1.0, Math.max(0.0, (data.decibels + 40) / 70.0));
                              dataHighlight += decibelNorm * 0.6;
                          }
                          const originalHighlight = Math.max(0.0, Math.min(3.0, dataHighlight * manualHighlightMultiplier));

                        bgShaderMaterial.uniforms.uHighlightIntensity.value = THREE.MathUtils.lerp(
                             bgShaderMaterial.uniforms.uHighlightIntensity.value,
                             originalHighlight, // Lerp back to the value without flash boost
                             1.0 // Instant return for simplicity after the flash
                         );
                         if (needsRender) {
                            renderer.clear();
                            renderer.render(backgroundScene, backgroundCamera);
                         }
                     }
                }, flashDuration);

            }
        }
    }
}


// New function to update graph visuals
function updateGraphVisuals(data) {
    // Check if in graph mode before proceeding with graph updates
    if (vizMode !== 'graph' || !graphGeometry || !pointMesh || !graphShadedAreaGeometry || !graphShadedAreaMaterial) {
        // Ensure graph elements are hidden if not in graph mode
        if (graphLine) graphLine.visible = false;
        if (pointMesh) pointMesh.visible = false;
        if (graphShadedAreaMesh) graphShadedAreaMesh.visible = false;
        return;
    }


    // Update data display (always update data display)
    // This part is also done in updateShaderVisuals, maybe move it outside?
    // Let's keep it in both for simplicity, it doesn't hurt.
    let dataStr = "";
    const keysToShow = ['timestamp', 'sessionColor', 'sessionEmotion', 'temperature_celsius', 'illuminance', 'decibels', 'accelY', 'steps_in_interval', 'photoTakenId'];
    for(const key of keysToShow){
        if(data[key] !== undefined && data[key] !== null){
            let value = data[key];
             if (typeof value === 'number') {
                if (!Number.isInteger(value)) {
                    value = value.toFixed(2);
                }
                if(key === 'temperature_celsius') value += ' °C';
                if(key === 'decibels') value += ' dB';
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
    const vFOV = THREE.MathUtils.degToRad(camera.fov);
    const viewHeightAtZero = 2 * Math.tan( vFOV / 2 ) * camera.position.z;
    const viewWidthAtZero = viewHeightAtZero * camera.aspect;
    const xRange = viewWidthAtZero;


    // Update graph line geometry positions
    const linePositions = graphGeometry.attributes.position.array;
    let linePositionIndex = 0;

    const currentTimestamp = data.timestamp;
    const minHistoryTimestamp = dataHistory.length > 0 ? dataHistory[0].timestamp : currentTimestamp; // Should have history points here
    const historyDuration = currentTimestamp - minHistoryTimestamp;


    for (let i = 0; i < dataHistory.length; i++) {
        const point = dataHistory[i];
        const elapsedInHistory = point.timestamp - minHistoryTimestamp;
        const xNorm = (historyDuration > 0) ? (elapsedInHistory / historyDuration) : 0;
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
    graphGeometry.setDrawRange(0, dataHistory.length);


    // Update graph shaded area geometry
    const shadedAreaPositions = graphShadedAreaGeometry.attributes.position.array;
    const shadedAreaIndices = graphShadedAreaGeometry.index.array;
    let shadedPosIndex = 0;
    let shadedIdxIndex = 0;

    // Map color from sessionColor to shaded area material
     const baseColorData = parseSessionColor(data.sessionColor);
     if (baseColorData) {
         graphShadedAreaMaterial.color.setRGB(baseColorData.r, baseColorData.g, baseColorData.b);
     }

    // Only draw shaded area if at least two points exist
    if (dataHistory.length >= 2) {
         const baseLineY = -1.0; // The Y coordinate for the base of the shaded area

         for (let i = 0; i < dataHistory.length - 1; i++) {
            const p1 = dataHistory[i];
            const p2 = dataHistory[i+1];

             // Get scaled X positions for p1 and p2 (using the same xRange)
            const elapsedInHistory1 = p1.timestamp - minHistoryTimestamp;
            const xNorm1 = (historyDuration > 0) ? (elapsedInHistory1 / historyDuration) : 0;
            const xPos1 = xNorm1 * xRange - xRange / 2;

            const elapsedInHistory2 = p2.timestamp - minHistoryTimestamp;
            const xNorm2 = (historyDuration > 0) ? (elapsedInHistory2 / historyDuration) : 0;
            const xPos2 = xNorm2 * xRange - xRange / 2;

            const yPos1 = p1.value;
            const yPos2 = p2.value;

            // Vertices for the quad (p1, p2, base_p1, base_p2)
            const v1_index = shadedPosIndex / 3; // Index of the current vertex group

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

            // Indices for the two triangles forming the quad (v1, v2, v3, v4)
            // Vertices: 0=TL, 1=TR, 2=BL, 3=BR
            // Indices: (0, 2, 3), (0, 3, 1)
             shadedAreaIndices[shadedIdxIndex++] = v1_index; // TL
             shadedAreaIndices[shadedIdxIndex++] = v1_index + 2; // BL
             shadedAreaIndices[shadedIdxIndex++] = v1_index + 3; // BR

             shadedAreaIndices[shadedIdxIndex++] = v1_index; // TL
             shadedAreaIndices[shadedIdxIndex++] = v1_index + 3; // BR
             shadedAreaIndices[shadedIdxIndex++] = v1_index + 1; // TR
         }
     }

     // Clear unused positions for the shaded area
     for (let i = shadedPosIndex; i < MAX_HISTORY_POINTS * 4 * 3; i++) {
         shadedAreaPositions[i] = 0;
     }
     // Clear unused indices
      for (let i = shadedIdxIndex; i < (MAX_HISTORY_POINTS - 1) * 6; i++) {
          shadedAreaIndices[i] = 0;
      }

    graphShadedAreaGeometry.attributes.position.needsUpdate = true;
    graphShadedAreaGeometry.index.needsUpdate = true;
    graphShadedAreaGeometry.setDrawRange(0, shadedIdxIndex); // Draw based on number of indices


    // Update the position and visibility of the current point sphere
    if (vizMode === 'graph' && dataHistory.length > 0) {
        const lastPoint = dataHistory[dataHistory.length - 1];
        // The sphere position is the last point on the line
        // Find its calculated X position using the same logic
        const elapsedInHistory = lastPoint.timestamp - minHistoryTimestamp;
        const xNorm = (historyDuration > 0) ? (elapsedInHistory / historyDuration) : 0;
        const xPos = xNorm * xRange - xRange / 2;
        pointMesh.position.set(xPos, lastPoint.value, 0);
        pointMesh.visible = true;
    } else {
        pointMesh.visible = false; // Hide sphere if not in graph mode or no data
    }

     // Ensure graph objects are visible only in graph mode (redundant with setVisualizationMode but safe)
     if (graphLine) graphLine.visible = (vizMode === 'graph');
     if (graphShadedAreaMesh) graphShadedAreaMesh.visible = (vizMode === 'graph');
     // Shaded area is only drawn if >= 2 points, visibility set by drawRange
}


// Helper function to calculate the y-value for the graph
function updateGraphVisualsHelper(data) {
    if (!data) return 0.0;

    let plotValue = 0.5; // Default center value
    if (data.sessionEmotion) {
        const emotionFactor = getEmotionFactor(data.sessionEmotion);
        const intensity = (emotionFactor.particleMovement * 0.7 + 0.1) * manualIntensityMultiplier;
        const variety = emotionFactor.colorVariety * 0.5 * manualVarietyMultiplier;
        plotValue = (intensity + variety) / 2.0;
        plotValue = Math.max(0, Math.min(1, (plotValue - 0.2) / 3.8)); // Map 0.2-4.0 to 0-1
    }
     let sensorBoost = 0;
     if (data.illuminance != null && typeof data.illuminance === 'number') {
        const minLogLux = Math.log(1);
        const maxLogLux = Math.log(10001);
        const logLux = Math.log(Math.max(1, data.illuminance + 1));
        const luxNorm = Math.min(1.0, Math.max(0.0, (logLux - minLogLux) / (maxLogLux - minLogLux)));
        sensorBoost += luxNorm * 0.5;
     }
     if (data.decibels != null && typeof data.decibels === 'number') {
         const decibelNorm = Math.min(1.0, Math.max(0.0, (data.decibels + 40) / 70.0));
         sensorBoost += decibelNorm * 0.3;
     }
      sensorBoost *= manualHighlightMultiplier;

     plotValue = Math.max(0, Math.min(1, plotValue + sensorBoost));

     // Scale plotValue to Y range (-1 to 1 in the scene)
     const scaledY = plotValue * 2.0 - 1.0;
     return scaledY;
}


// Helper function to rebuild graph history upon seeking/reset
function rebuildGraphHistory(seekAbsoluteTimestamp) {
    if (sensorData.length === 0) {
        dataHistory = [];
        return;
    }

    const windowStartTime = seekAbsoluteTimestamp - HISTORY_WINDOW_MS;

    dataHistory = [];
    for (let i = 0; i < sensorData.length; i++) {
        const row = sensorData[i];
        if (row.timestamp >= windowStartTime && row.timestamp <= seekAbsoluteTimestamp) {
             const scaledY = updateGraphVisualsHelper(row);
             dataHistory.push({ timestamp: row.timestamp, value: scaledY });
        } else if (row.timestamp > seekAbsoluteTimestamp) {
            break;
        }
    }

    if (dataHistory.length > MAX_HISTORY_POINTS) {
         dataHistory = dataHistory.slice(dataHistory.length - MAX_HISTORY_POINTS);
     }
}

// Modify handleSeekBarInput
function handleSeekBarInput() {
    isSeeking = true;
    const seekTimeMs = parseFloat(seekBar.value);
    currentTimeDisplay.textContent = formatTime(seekTimeMs);

    if (sensorData.length > 0) {
         const seekTargetElapsedCsvTime = parseFloat(seekBar.value);
         const seekTargetAbsoluteCsvTime = sensorData[0].timestamp + seekTargetElapsedCsvTime;
         let tempIndex = 0;
         for (let i = 0; i < sensorData.length; i++) {
             if (sensorData[i].timestamp <= seekTargetAbsoluteCsvTime) {
                 tempIndex = i;
             } else {
                 break;
             }
         }
        const currentRow = sensorData[tempIndex];
        if (currentRow) {
             // Update data display immediately
             let dataStr = "";
             const keysToShow = ['timestamp', 'sessionColor', 'sessionEmotion', 'temperature_celsius', 'illuminance', 'decibels', 'accelY', 'steps_in_interval', 'photoTakenId'];
             for(const key of keysToShow){
                 if(currentRow[key] !== undefined && currentRow[key] !== null){
                     let value = currentRow[key];
                      if (typeof value === 'number') {
                         if (!Number.isInteger(value)) {
                             value = value.toFixed(2);
                         }
                         if(key === 'temperature_celsius') value += ' °C';
                         if(key === 'decibels') value += ' dB';
                     }
                     dataStr += `${key}: ${value}\n`;
                 }
             }
             currentDataDisplay.innerHTML = `<pre>${dataStr}</pre>`;

             // Update visualization visuals based on current mode while seeking
             if (vizMode === 'shader') {
                  updateShaderVisuals(currentRow, { applyManualMultipliersOnly: !isPlaying }); // Apply multipliers only if paused

                  if (!isPlaying) {
                      renderer.clear();
                      renderer.render(backgroundScene, backgroundCamera);
                  }
             } else { // vizMode === 'graph'
                 // Rebuild history up to the seeked point
                 rebuildGraphHistory(seekTargetAbsoluteCsvTime);
                 // Update graph geometry based on the history and the data point at the seeked time (for pointMesh)
                 updateGraphVisuals(currentRow);

                  if (!isPlaying) {
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
    isSeeking = false; // End seeking
    if (sensorData.length === 0) return;

    const seekTargetElapsedCsvTime = parseFloat(seekBar.value);
    const seekTargetAbsoluteCsvTime = sensorData[0].timestamp + seekTargetElapsedCsvTime;

    let newIndex = 0;
    for (let i = 0; i < sensorData.length; i++) {
        if (sensorData[i].timestamp <= seekTargetAbsoluteCsvTime) {
            newIndex = i;
        } else {
            break;
        }
    }
    currentIndex = newIndex;

    actualStartTime = performance.now() - (seekTargetElapsedCsvTime / playbackSpeed);

    // Rebuild graph history for the new seek point regardless of mode
    rebuildGraphHistory(seekTargetAbsoluteCsvTime);

    // Update visuals and audio for the new current point
    if (sensorData[currentIndex]) {
      lastProcessedTimestamp = sensorData[currentIndex].timestamp;
      if (vizMode === 'shader') {
        updateShaderVisuals(sensorData[currentIndex]);
      } else {
        updateGraphVisuals(sensorData[currentIndex]);
      }
       const emotionFactor = getEmotionFactor(sensorData[currentIndex].sessionEmotion);
       updateAudio(sensorData[currentIndex], emotionFactor);
    }

    // Reset shader uTime regardless of mode, as it's relative to the start of play
    if (bgShaderMaterial && bgShaderMaterial.uniforms.uTime) {
        bgShaderMaterial.uniforms.uTime.value = 0.0;
        delete bgShaderMaterial.uniforms.uTime.lastTime;
    }

    if (isPlaying) {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        animationFrameId = requestAnimationFrame(animate);
         // Audio resume/fade in logic remains the same
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                 if (gainNode) gainNode.gain.setTargetAtTime(Math.min(0.15, Math.max(0, currentAudioParams.gain)), audioContext.currentTime, 0.1);
            });
        } else if (gainNode) {
             gainNode.gain.setTargetAtTime(Math.min(0.15, Math.max(0, currentAudioParams.gain)), audioContext.currentTime, 0.1);
        }
    } else {
        // Not playing, render the updated state at the seeked position
        renderer.clear();
        if (vizMode === 'shader') {
             renderer.render(backgroundScene, backgroundCamera);
        } else {
             renderer.render(scene, camera);
        }
    }
}


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

    if (camera && renderer && backgroundCamera) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        // Orthographic camera for background doesn't need aspect update, but size might if it wasn't fixed -1 to 1
        // backgroundCamera.left = -width / height;
        // backgroundCamera.right = width / height;
        // backgroundCamera.updateProjectionMatrix();

        renderer.setSize(width, height);

        // Update visuals for the current frame after resize
        // Only render if not playing and not seeking, and data exists
        if (!isPlaying && !isSeeking && sensorData.length > 0 && currentIndex >= 0) {
             if (vizMode === 'shader') {
                  updateShaderVisuals(sensorData[currentIndex]);
                  renderer.clear();
                  renderer.render(backgroundScene, backgroundCamera);
             } else { // vizMode === 'graph'
                 // Recalculate graph geometry with new aspect ratio
                 // No need to rebuild history, just update the geometry using the existing history
                 updateGraphVisuals(sensorData[currentIndex]); // This recalculates positions based on current aspect
                 renderer.clear();
                 renderer.render(scene, camera);
             }
        } else if (!isPlaying && !isSeeking) {
           // If no data, render the default scene based on mode
             renderer.clear();
             if (vizMode === 'shader') {
                 renderer.render(backgroundScene, backgroundCamera);
             } else {
                  // Graph mode with no data: render empty graph scene
                  if (graphGeometry) graphGeometry.setDrawRange(0, 0);
                   if (graphShadedAreaGeometry) graphShadedAreaGeometry.setDrawRange(0, 0);
                  if (pointMesh) pointMesh.visible = false;
                  graphLine.visible = (vizMode === 'graph'); // Ensure objects are visible
                  graphShadedAreaMesh.visible = (vizMode === 'graph');
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

         // ユーザーインタラクション後にオーディオコンテキストが再開可能か確認
         if (audioContext.state === 'suspended') {
             console.log("AudioContext is suspended. User interaction is required to resume.");
         }

    } catch (e) {
        console.error("Error initializing audio:", e);
         isAudioInitialized = false; // 初期化失敗フラグ
    }
}

function updateAudio(data, emotionFactor) {
    if (!isAudioInitialized || !audioContext || !oscillator || !filterNode || !gainNode || audioContext.state === 'closed') {
         if (!isAudioInitialized || audioContext.state === 'closed') return;
    }

    const currentTime = audioContext.currentTime;
    const smoothTime = 0.1; // パラメータ変化の滑らかさ (秒)

    // データに基づくパラメータ計算
    let targetFreq = 440; // デフォルト周波数 (A4)
    let targetFilterFreq = 2500; // デフォルトフィルター周波数
    let targetFilterQ = 1; // デフォルトQ値
    let targetGain = isPlaying && !isSeeking ? 0.02 : 0; // 基本ゲイン (再生中かつ非シーク中のみ音を出す)

    // 温度 -> 周波数
    if (data.temperature_celsius != null && typeof data.temperature_celsius === 'number') {
        const tempNorm = Math.min(1, Math.max(0, (data.temperature_celsius - 10) / 25)); // 10°C -> 0, 35°C -> 1
        targetFreq = 220 + tempNorm * 660; // 220Hz (A3) から 880Hz (A5) の範囲で変化
    }

    // デシベル -> ゲイン、フィルター周波数
    if (data.decibels != null && typeof data.decibels === 'number') {
        // -40dB を 0, 30dB を 1 にマッピング
        const decibelNorm = Math.min(1, Math.max(0, (data.decibels + 40) / 70.0));
        targetGain += decibelNorm * 0.06; // ゲインにデシベルを少し加算
        targetFilterFreq += decibelNorm * 2000; // デシベルが高いほどフィルターを開く
    }

    // 感情 -> オシレータータイプ、フィルター、周波数/ゲイン乗数
    const effectiveSpeed = emotionFactor.speedFactor * playbackSpeed; // 再生速度も考慮
    switch (data.sessionEmotion) {
        case "楽しい":
            oscillator.type = 'triangle';
            targetFreq *= (1.0 + effectiveSpeed * 0.2);
            targetFilterFreq = 3000 + emotionFactor.particleMovement * 800 * effectiveSpeed;
            targetFilterQ = 1.5 + emotionFactor.sizeVariety * 0.5;
            targetGain += emotionFactor.apertureFactor * 0.02;
            break;
        case "悲しい":
            oscillator.type = 'sine';
            targetFreq *= (0.8 / Math.sqrt(effectiveSpeed));
            targetFilterFreq = 600 + emotionFactor.colorVariety * 300 / effectiveSpeed;
            targetFilterQ = 0.9;
            targetGain *= 0.5;
            break;
        case "怒り":
            oscillator.type = 'sawtooth';
            targetFreq *= (1.2 * effectiveSpeed);
            targetFilterFreq = 1500 + Math.random() * 1000 * effectiveSpeed;
            targetFilterQ = 3 + Math.random() * 2;
            targetGain += emotionFactor.apertureFactor * 0.05;
            break;
        case "穏やか":
            oscillator.type = 'sine';
            targetFreq *= (1.0 / Math.sqrt(effectiveSpeed));
            targetFilterFreq = 2000 * Math.sqrt(effectiveSpeed);
            targetFilterQ = 1.2;
            targetGain *= 0.8;
            break;
        default: // その他/デフォルト
            oscillator.type = 'sine';
            targetFilterFreq = 2200 * Math.sqrt(effectiveSpeed);
            targetFilterQ = 1.0;
             targetGain *= 0.9;
            break;
    }

    // Apply parameters smoothly, clamp values
    const finalFreq = Math.max(50, Math.min(10000, targetFreq));
    if (finalFreq !== currentAudioParams.frequency) {
        oscillator.frequency.setTargetAtTime(finalFreq, currentTime, smoothTime);
        currentAudioParams.frequency = finalFreq;
    }

    const finalFilterFreq = Math.max(100, Math.min(8000, targetFilterFreq));
    if (finalFilterFreq !== currentAudioParams.filterFreq) {
        filterNode.frequency.setTargetAtTime(finalFilterFreq, currentTime, smoothTime);
        currentAudioParams.filterFreq = finalFilterFreq;
    }

    const finalFilterQ = Math.max(0.1, Math.min(10, targetFilterQ));
    if (finalFilterQ !== currentAudioParams.filterQ) {
        filterNode.Q.setTargetAtTime(finalFilterQ, currentTime, smoothTime);
         currentAudioParams.filterQ = finalFilterQ;
    }

    const finalGain = isPlaying && !isSeeking ? Math.min(0.15, Math.max(0, targetGain)) : 0; // Ensure gain is 0 if not playing or seeking
    if (finalGain !== currentAudioParams.gain) {
        gainNode.gain.setTargetAtTime(finalGain, currentTime, smoothTime);
        currentAudioParams.gain = finalGain;
    }


    // steps_in_interval があれば短い効果音を追加
    if (data.steps_in_interval > 0 && typeof data.steps_in_interval === 'number') {
        if (!updateAudio.lastStepTime || (currentTime - updateAudio.lastStepTime > 0.1)) {
             const stepOsc = audioContext.createOscillator();
             const stepGain = audioContext.createGain();
             const stepFilter = audioContext.createBiquadFilter();

             stepOsc.type = 'triangle';
             const stepPitch = 400 + Math.random() * 400 + data.steps_in_interval * 20;
             stepOsc.frequency.setValueAtTime(stepPitch, currentTime);

             stepFilter.type = 'bandpass';
             const filterCenterFreq = 800 + data.steps_in_interval * 50;
             stepFilter.frequency.setValueAtTime(filterCenterFreq, currentTime);
             stepFilter.Q.setValueAtTime(5 + data.steps_in_interval * 0.5, currentTime);

             stepGain.gain.setValueAtTime(0.05 * Math.min(data.steps_in_interval / 5, 1), currentTime);
             stepGain.gain.exponentialRampToValueAtTime(0.0001, currentTime + 0.15);

             stepOsc.connect(stepFilter);
             stepFilter.connect(stepGain);
             stepGain.connect(audioContext.destination);

             stepOsc.start(currentTime);
             stepOsc.stop(currentTime + 0.15);

             updateAudio.lastStepTime = currentTime;
        }
    }


    // photoTakenId があれば短いクリック音を追加
    if (data.photoTakenId === 1 && typeof data.photoTakenId === 'number') {
         if (!updateAudio.lastPhotoTime || (currentTime - updateAudio.lastPhotoTime > 0.5)) {
            const clickOsc = audioContext.createOscillator();
            const clickGain = audioContext.createGain();
            const clickFilter = audioContext.createBiquadFilter();

            clickOsc.type = 'square';
            clickOsc.frequency.setValueAtTime(2500, currentTime);

            clickFilter.type = 'highpass';
            clickFilter.frequency.setValueAtTime(1500, currentTime);
            clickFilter.Q.setValueAtTime(1.0, currentTime);

            clickGain.gain.setValueAtTime(0.15, currentTime);
            clickGain.gain.exponentialRampToValueAtTime(0.0001, currentTime + 0.1);

            clickOsc.connect(clickFilter);
            clickFilter.connect(clickGain);
            clickGain.connect(audioContext.destination);

            clickOsc.start(currentTime);
            clickOsc.stop(currentTime + 0.1);

            updateAudio.lastPhotoTime = currentTime;
         }
    }
}
// updateAudio 関数の静的プロパティを初期化
updateAudio.lastStepTime = 0;
updateAudio.lastPhotoTime = 0;


function formatTime(ms) {
    if (isNaN(ms) || ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
     return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// ウィンドウリサイズイベントリスナーを追加
window.addEventListener('resize', onWindowResize);

// 初期化処理を呼び出し
init();
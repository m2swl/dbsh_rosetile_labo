// nagame/main.js

// グローバル変数
let scene, camera, renderer, composer, bokehPass;
let particles;
let sensorData = [];
let currentIndex = 0;
let animationStartTime = 0; 
let lastProcessedTimestamp = 0; 
let playbackSpeed = 1.0;
let isPlaying = false;
let animationFrameId;

let bgShaderMaterial, backgroundScene, backgroundCamera; // 背景用
let audioContext, oscillator, gainNode, filterNode; // 音声用
let isAudioInitialized = false;
let isSeeking = false; // シークバー操作中フラグ

const PARTICLE_COUNT = 500;

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


// シェーダーコード
const backgroundVertexShader = `
    varying vec2 vUv;
    void main() {
        vUv = uv; // PlaneGeometryのUV座標(0-1)
        // OrthographicCamera を使っているので、ジオメトリを画面いっぱいに広げるだけで良い
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const backgroundFragmentShader = `
    varying vec2 vUv;
    uniform float uTime;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform vec3 uColor3;

    // Simple pseudo-random function
    float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    // Simple noise function (value noise)
    float noise(vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);

        float a = random(i);
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));

        vec2 u = f * f * (3.0 - 2.0 * f); // Smoothstep interpolation
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.y * u.x;
    }

    void main() {
        vec2 uv = vUv;
        float t = uTime * 0.05; // Slower time progression
        
        vec3 color = vec3(0.0);
        
        // Adjust noise parameters for a softer, more blurred look
        float n1 = noise(uv * 2.0 + vec2(t * 0.2, t * 0.1));
        float n2 = noise(uv * 1.5 - vec2(t * 0.1, t * 0.3) + 0.5);
        float n3 = noise(uv * 2.5 + vec2(t * 0.3, -t * 0.2) - 0.3);

        // Smoother mixing
        color = mix(uColor1, uColor2, smoothstep(0.2, 0.8, n1 + n2 * 0.2));
        color = mix(color, uColor3, smoothstep(0.3, 0.7, n2 - n3 * 0.3));
        color = mix(color, uColor1, smoothstep(0.4, 0.9, n3 + n1 * 0.1));
        
        // Add a subtle vignette effect
        float dist = length(uv - vec2(0.5));
        color *= smoothstep(0.9, 0.3, dist);

        gl_FragColor = vec4(color, 1.0);
    }
`;


// 初期化処理
function init() {
    // Three.js シーン設定
    scene = new THREE.Scene();
    // scene.background は背景シェーダーで描画するため設定しない

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 50;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.autoClear = false; // 手動でクリアと背景描画を行うため
    vizContainer.appendChild(renderer.domElement);

    // 背景シェーダー設定
    backgroundScene = new THREE.Scene();
    backgroundCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const bgPlaneGeo = new THREE.PlaneGeometry(2, 2); // スクリーン全体をカバー
    bgShaderMaterial = new THREE.ShaderMaterial({
        vertexShader: backgroundVertexShader,
        fragmentShader: backgroundFragmentShader,
        uniforms: {
            uTime: { value: 0.0 },
            uColor1: { value: new THREE.Color(0.1, 0.1, 0.2) }, // Initial dark colors
            uColor2: { value: new THREE.Color(0.2, 0.1, 0.3) },
            uColor3: { value: new THREE.Color(0.1, 0.2, 0.2) },
        },
        depthTest: false,
        depthWrite: false
    });
    const bgMesh = new THREE.Mesh(bgPlaneGeo, bgShaderMaterial);
    backgroundScene.add(bgMesh);

    // パーティクル初期化
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);
    const customAttributes = {
        startTimeOffset: new Float32Array(PARTICLE_COUNT),
        velocity: new Float32Array(PARTICLE_COUNT * 3)
    };

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 150;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 150;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 100 - 50;
        colors[i * 3] = 1.0; colors[i * 3 + 1] = 1.0; colors[i * 3 + 2] = 1.0;
        sizes[i] = Math.random() * 8 + 3;
        customAttributes.startTimeOffset[i] = Math.random() * 5000;
        customAttributes.velocity[i*3] = (Math.random() - 0.5) * 0.05;
        customAttributes.velocity[i*3+1] = (Math.random() - 0.5) * 0.05 + 0.05;
        customAttributes.velocity[i*3+2] = (Math.random() - 0.5) * 0.02;
    }
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1)); // シェーダーで使う場合は'size', PointsMaterialでは直接使われない
    particleGeometry.setAttribute('startTimeOffset', new THREE.BufferAttribute(customAttributes.startTimeOffset, 1));
    particleGeometry.setAttribute('velocity', new THREE.BufferAttribute(customAttributes.velocity, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
        size: 1, 
        map: new THREE.TextureLoader().load('assets/particle.png'), // パスを確認
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        sizeAttenuation: true,
        opacity: 0.8
    });

    particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // ポストプロセッシング
    const renderPass = new THREE.RenderPass(scene, camera);
    renderPass.clear = false; // 背景描画の上に重ねるため、RenderPassではクリアしない

    bokehPass = new THREE.BokehPass(scene, camera, {
        focus: 30.0, aperture: 0.0002, maxblur: 0.008,
        width: window.innerWidth, height: window.innerHeight
    });

    composer = new THREE.EffectComposer(renderer);
    composer.addPass(renderPass);
    composer.addPass(bokehPass);

    window.addEventListener('resize', onWindowResize, false);

    // UIイベントリスナー
    csvFileInput.addEventListener('change', handleFileLoad);
    playButton.addEventListener('click', playAnimation);
    pauseButton.addEventListener('click', pauseAnimation);
    resetButton.addEventListener('click', resetAnimation);
    speedControl.addEventListener('input', (e) => {
        playbackSpeed = parseFloat(e.target.value);
        speedValueDisplay.textContent = `${playbackSpeed.toFixed(1)}x`;
    });
    seekBar.addEventListener('input', handleSeekBarInput);
    seekBar.addEventListener('change', handleSeekBarChange);
    seekBar.disabled = true;
}

function handleFileLoad(event) {
    const file = event.target.files[0];
    if (file) {
        csvFileNameDisplay.textContent = file.name; // ファイル名表示
        Papa.parse(file, {
            header: true, dynamicTyping: true, skipEmptyLines: true,
            complete: function(results) {
                sensorData = results.data.filter(row => row.timestamp != null && typeof row.timestamp === 'number');
                if (sensorData.length > 0) {
                    sensorData.sort((a, b) => a.timestamp - b.timestamp);
                    const firstTs = sensorData[0].timestamp;
                    const lastTs = sensorData[sensorData.length - 1].timestamp;
                    seekBar.max = lastTs - firstTs;
                    seekBar.value = 0;
                    totalTimeDisplay.textContent = formatTime(lastTs - firstTs);
                    currentTimeDisplay.textContent = formatTime(0);
                    
                    resetAnimation(); // 状態をリセットして最初のフレームを表示
                    playButton.disabled = false;
                    resetButton.disabled = false;
                    seekBar.disabled = false;
                    console.log("CSV data loaded and parsed:", sensorData.length, "rows");
                } else {
                    alert("有効なデータが見つかりませんでした。タイムスタンプ列を確認してください。");
                    csvFileNameDisplay.textContent = "N/A";
                }
            },
            error: function(error) {
                console.error("CSV Parse Error:", error);
                alert("CSVファイルのパースに失敗しました。");
                csvFileNameDisplay.textContent = "N/A";
            }
        });
    }
}

let actualStartTime = 0; 

function playAnimation() {
    if (sensorData.length === 0 || currentIndex >= sensorData.length) return;
    
    if (!isAudioInitialized) { // 最初の再生時にAudioContextを初期化
        initAudio();
    }
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
    if(gainNode) gainNode.gain.setTargetAtTime(0.05, audioContext.currentTime, 0.1); // 音量少し上げる

    isPlaying = true;
    playButton.disabled = true;
    pauseButton.disabled = false;

    const csvTimeOffset = parseFloat(seekBar.value); // シークバーの現在値 (ms)
    actualStartTime = performance.now() - (csvTimeOffset / playbackSpeed);
    
    animate();
}

function pauseAnimation() {
    isPlaying = false;
    playButton.disabled = false;
    pauseButton.disabled = true;
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    if(gainNode) gainNode.gain.setTargetAtTime(0, audioContext.currentTime, 0.1); // 音量下げる
}

function resetAnimation() {
    pauseAnimation();
    currentIndex = 0;
    seekBar.value = 0;
    currentTimeDisplay.textContent = formatTime(0);

    if (sensorData.length > 0) {
        lastProcessedTimestamp = sensorData[0].timestamp;
        updateVisuals(sensorData[0]);
        playButton.disabled = false;
    } else {
        playButton.disabled = true;
        csvFileNameDisplay.textContent = "N/A";
        currentDataDisplay.innerHTML = "";
        totalTimeDisplay.textContent = formatTime(0);
        seekBar.disabled = true;
    }
    resetButton.disabled = true; 
    if (composer) composer.render(); else if (renderer) renderer.render(scene, camera); // Ensure one frame is rendered for reset state
}


function animate() {
    if (!isPlaying) return;
    animationFrameId = requestAnimationFrame(animate);

    const performanceElapsed = performance.now() - actualStartTime;
    const currentCsvTimestampTarget = sensorData[0].timestamp + (performanceElapsed * playbackSpeed);

    let advanced = false;
    while (currentIndex < sensorData.length - 1 && sensorData[currentIndex + 1].timestamp <= currentCsvTimestampTarget) {
        currentIndex++;
        advanced = true;
    }
    
    const currentRow = sensorData[currentIndex];
    if (currentRow) {
        updateVisuals(currentRow);
        lastProcessedTimestamp = currentRow.timestamp;
    }

    // パーティクルの動き
    const positions = particles.geometry.attributes.position.array;
    const velocities = particles.geometry.attributes.velocity.array;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        positions[i * 3] += velocities[i * 3] * playbackSpeed;
        positions[i * 3 + 1] += velocities[i * 3 + 1] * playbackSpeed;
        positions[i * 3 + 2] += velocities[i * 3 + 2] * playbackSpeed;

        if (positions[i * 3 + 1] > 75) { positions[i * 3 + 1] = -75; positions[i * 3] = (Math.random() - 0.5) * 150; }
        else if (positions[i * 3 + 1] < -75) { positions[i * 3 + 1] = 75; positions[i * 3] = (Math.random() - 0.5) * 150; }
        if (positions[i * 3] > 75) positions[i * 3] = -75; else if (positions[i * 3] < -75) positions[i * 3] = 75;
        if (positions[i * 3 + 2] > camera.position.z) positions[i * 3 + 2] = -50 + Math.random()*10;
        if (positions[i * 3 + 2] < -50) positions[i * 3 + 2] = camera.position.z - 10 + Math.random()*10;
    }
    particles.geometry.attributes.position.needsUpdate = true;
    
    // 背景シェーダーの時刻更新
    if (bgShaderMaterial) {
        bgShaderMaterial.uniforms.uTime.value = (performance.now() / 2000.0) * playbackSpeed; // 2000.0で少し遅く
    }

    // シークバー更新
    if (sensorData.length > 0 && !isSeeking) {
        const elapsedCsvTime = currentCsvTimestampTarget - sensorData[0].timestamp;
        seekBar.value = Math.max(0, Math.min(parseFloat(seekBar.max), elapsedCsvTime));
        currentTimeDisplay.textContent = formatTime(elapsedCsvTime);
    }
    
    renderer.clear(); // 手動でクリア
    renderer.render(backgroundScene, backgroundCamera); // 背景を描画
    composer.render(); // メインシーンとポストプロセス

    if (currentIndex >= sensorData.length - 1 && currentCsvTimestampTarget >= sensorData[sensorData.length-1].timestamp) {
        pauseAnimation();
        resetButton.disabled = false;
        seekBar.value = seekBar.max; // 最後に到達
        currentTimeDisplay.textContent = totalTimeDisplay.textContent;
        console.log("Playback finished.");
    }
}


function updateVisuals(data) {
    if (!data || !particles) return;

    // データ表示更新
    let dataStr = "";
    const keysToShow = ['timestamp', 'sessionColor', 'sessionEmotion', 'temperature_celsius', 'illuminance', 'decibels', 'accelY', 'steps_in_interval', 'orientAlpha', 'orientBeta', 'orientGamma', 'photoTakenId'];
    for(const key of keysToShow){
        if(data[key] !== undefined){
            let value = data[key];
            if (typeof value === 'number' && !Number.isInteger(value)) {
                value = value.toFixed(2); // 小数は2桁まで
            }
            dataStr += `${key}: ${value}\n`;
        }
    }
    currentDataDisplay.innerHTML = `<pre>${dataStr}</pre>`;


    // パーティクルの色とサイズ
    const colors = particles.geometry.attributes.color.array;
    const pSizes = particles.geometry.attributes.size.array; // これは PointsMaterial.size に乗算される係数として使うか、シェーダーで直接使う

    const baseColor = parseSessionColor(data.sessionColor);
    const emotionFactor = getEmotionFactor(data.sessionEmotion);
    const globalBrightness = data.illuminance != null ? Math.min(1, Math.max(0.1, (data.illuminance / 500))) : 0.7;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        let r = baseColor.r, g = baseColor.g, b = baseColor.b;
        if (data.temperature_celsius != null) {
            const tempNorm = (Math.min(35, Math.max(5, data.temperature_celsius)) - 5) / 30;
            r = r * (0.8 + tempNorm * 0.4); b = b * (1.2 - tempNorm * 0.4);
        }
        const accelYNorm = data.accelY != null ? (data.accelY + 10) / 20 : 0.5;
        const brightnessFluctuation = 0.8 + accelYNorm * 0.4;
        
        colors[i * 3]     = Math.max(0, Math.min(1, r * globalBrightness * brightnessFluctuation * (0.8 + (Math.random()-0.5)*0.3*emotionFactor.colorVariety) ));
        colors[i * 3 + 1] = Math.max(0, Math.min(1, g * globalBrightness * brightnessFluctuation * (0.8 + (Math.random()-0.5)*0.3*emotionFactor.colorVariety) ));
        colors[i * 3 + 2] = Math.max(0, Math.min(1, b * globalBrightness * brightnessFluctuation * (0.8 + (Math.random()-0.5)*0.3*emotionFactor.colorVariety) ));

        let baseSize = particles.geometry.attributes.size.array[i]; // initで設定したランダムサイズ
        let decibelFactor = data.decibels != null ? Math.max(0.5, Math.min(2.5, (Math.abs(data.decibels) / 25))) : 1;
        decibelFactor *= emotionFactor.sizeVariety;
        pSizes[i] = baseSize * decibelFactor * (data.steps_in_interval > 0 ? 1.3 : 1); // PointsMaterialではこの個別サイズは直接反映されない
    }
    particles.geometry.attributes.color.needsUpdate = true;
    // particles.geometry.attributes.size.needsUpdate = true; // PointsMaterialでは効果なし
    const avgSize = pSizes.reduce((a,b) => a+b, 0) / pSizes.length;
    particles.material.size = Math.max(1, Math.min(15, avgSize / 2)); // マテリアルのsizeプロパティで平均サイズを調整

    // ボケ効果
    bokehPass.materialBokeh.uniforms['focus'].value = data.orientBeta != null ? THREE.MathUtils.mapLinear(data.orientBeta, -90, 90, 10, 70) : 30;
    bokehPass.materialBokeh.uniforms['aperture'].value = data.decibels != null ? Math.max(0.00001, Math.min(0.001, Math.abs(data.decibels) / 40000 * emotionFactor.apertureFactor)) : 0.0002;
    bokehPass.materialBokeh.uniforms['maxblur'].value = data.gyroAlpha != null ? Math.max(0.001, Math.min(0.02, Math.abs(data.gyroAlpha) / 360 * 0.015)) : 0.008;
    
    // カメラ
    if (data.orientAlpha != null) camera.rotation.y = THREE.MathUtils.degToRad(data.orientAlpha / 2);
    if (data.orientBeta != null) camera.rotation.x = THREE.MathUtils.degToRad(data.orientBeta / 3);
    if (data.orientGamma != null) camera.rotation.z = THREE.MathUtils.degToRad(data.orientGamma / 3);
    camera.lookAt(scene.position);

    if (data.photoTakenId === 1) flashEffect(data.sessionColor);

    // 背景シェーダーの色更新
    if (bgShaderMaterial) {
        let c1 = new THREE.Color(baseColor.r, baseColor.g, baseColor.b);
        let c2 = new THREE.Color().setHSL((c1.getHSL({h:0,s:0,l:0}).h + 0.3 * emotionFactor.colorVariety + 0.1) % 1, 0.5 + 0.2 * Math.random(), 0.4 + 0.2 * Math.random());
        let c3 = new THREE.Color().setHSL((c1.getHSL({h:0,s:0,l:0}).h - 0.3 * emotionFactor.colorVariety - 0.1 + 1) % 1, 0.5 + 0.2 * Math.random(), 0.5 + 0.2 * Math.random());
        // 色の変化を滑らかに (Lerp)
        bgShaderMaterial.uniforms.uColor1.value.lerp(c1, 0.05);
        bgShaderMaterial.uniforms.uColor2.value.lerp(c2, 0.05);
        bgShaderMaterial.uniforms.uColor3.value.lerp(c3, 0.05);
    }

    // 音声パラメータ更新
    updateAudio(data, emotionFactor);
}

function flashEffect(colorName) { /* ... (既存のまま) ... */ }
function parseSessionColor(colorName) { /* ... (既存のまま) ... */ }
function getEmotionFactor(emotionName) { /* ... (既存のまま) ... */ }

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    if (bokehPass && bokehPass.renderTargetDepth) {
        bokehPass.renderTargetDepth.width = window.innerWidth * window.devicePixelRatio;
        bokehPass.renderTargetDepth.height = window.innerHeight * window.devicePixelRatio;
    }
    // 背景シェーダーのuResolutionはgl_FragCoordを使うのであれば更新が必要だが、
    // 現在はvUvを使っているので不要。
}

// 音声関連
function initAudio() {
    if (isAudioInitialized) return;
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        oscillator = audioContext.createOscillator();
        gainNode = audioContext.createGain();
        filterNode = audioContext.createBiquadFilter();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(220, audioContext.currentTime);
        
        filterNode.type = "lowpass";
        filterNode.frequency.setValueAtTime(1000, audioContext.currentTime);
        filterNode.Q.setValueAtTime(1, audioContext.currentTime);

        oscillator.connect(filterNode);
        filterNode.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime); // 初期ミュート
        oscillator.start();
        isAudioInitialized = true;
        console.log("Audio initialized.");
    } catch (e) {
        console.error("Error initializing audio:", e);
        alert("Web Audio API is not supported or an error occurred.");
    }
}

function updateAudio(data, emotionFactor) {
    if (!isAudioInitialized || !audioContext) return;

    const baseFreq = 110; // A2
    let targetFreq = baseFreq;
    
    if (data.temperature_celsius != null) {
        const tempNorm = (Math.min(35, Math.max(5, data.temperature_celsius)) - 5) / 30;
        targetFreq = baseFreq + tempNorm * 220; 
    }

    switch (data.sessionEmotion) {
        case "楽しい": 
            oscillator.type = 'sawtooth'; 
            filterNode.frequency.setTargetAtTime(1500 + emotionFactor.particleMovement * 500, audioContext.currentTime, 0.1);
            filterNode.Q.setTargetAtTime(2 + emotionFactor.sizeVariety, audioContext.currentTime, 0.1);
            break;
        case "悲しい": 
            oscillator.type = 'sine'; 
            targetFreq *= 0.8;
            filterNode.frequency.setTargetAtTime(500, audioContext.currentTime, 0.1);
            filterNode.Q.setTargetAtTime(0.5, audioContext.currentTime, 0.1);
            break;
        case "怒り":   
            oscillator.type = 'square'; 
            targetFreq *= 1.2; 
            filterNode.frequency.setTargetAtTime(800 + Math.random() * 400, audioContext.currentTime, 0.05);
            filterNode.Q.setTargetAtTime(5 + Math.random() * 5, audioContext.currentTime, 0.05);
            break;
        case "穏やか": 
            oscillator.type = 'triangle'; 
            filterNode.frequency.setTargetAtTime(1000, audioContext.currentTime, 0.1);
            filterNode.Q.setTargetAtTime(1, audioContext.currentTime, 0.1);
            break;
        default:     
            oscillator.type = 'sine';
            filterNode.frequency.setTargetAtTime(1000, audioContext.currentTime, 0.1);
            break;
    }
    oscillator.frequency.setTargetAtTime(targetFreq, audioContext.currentTime, 0.1);

    let targetGain = 0.03; // 基本音量をさらに小さく
    if (data.decibels != null) {
        const decibelNorm = Math.min(1, Math.max(0, (Math.abs(data.decibels) / 60))); // 0-60dB を 0-1
        targetGain += decibelNorm * 0.07; // 最大0.1
        filterNode.frequency.setTargetAtTime(filterNode.frequency.value * (1 + decibelNorm * 0.2), audioContext.currentTime, 0.05);
    }
    if (isPlaying) { // 再生中のみゲインを調整
      gainNode.gain.setTargetAtTime(Math.min(0.2, Math.max(0, targetGain)), audioContext.currentTime, 0.1);
    }


    if (data.photoTakenId === 1) {
        const clickOsc = audioContext.createOscillator();
        const clickGain = audioContext.createGain();
        clickOsc.type = 'triangle';
        clickOsc.frequency.setValueAtTime(1200, audioContext.currentTime);
        clickGain.gain.setValueAtTime(0.15, audioContext.currentTime); // Flash音量を少し下げる
        clickGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
        clickOsc.connect(clickGain);
        clickGain.connect(audioContext.destination);
        clickOsc.start(audioContext.currentTime);
        clickOsc.stop(audioContext.currentTime + 0.1);
    }
}

// シークバー関連
function handleSeekBarInput() {
    isSeeking = true;
    const seekTimeMs = parseFloat(seekBar.value);
    currentTimeDisplay.textContent = formatTime(seekTimeMs);
    // オプション: ドラッグ中に簡易プレビューする場合
    // if (sensorData.length > 0) {
    //     const targetCsvTimestamp = sensorData[0].timestamp + seekTimeMs;
    //     let tempIndex = 0;
    //     for (let i = 0; i < sensorData.length; i++) {
    //         if (sensorData[i].timestamp <= targetCsvTimestamp) tempIndex = i; else break;
    //     }
    //     if (sensorData[tempIndex]) updateVisuals(sensorData[tempIndex]);
    //     if (isPlaying) { /* No immediate rendering to avoid lag, or a throttled one */ }
    //     else { if (composer) composer.render(); else if (renderer) renderer.render(scene, camera); }
    // }
}

function handleSeekBarChange() {
    isSeeking = false;
    if (sensorData.length === 0) return;

    const seekTargetElapsedCsvTime = parseFloat(seekBar.value); //経過時間(ms)
    
    // 新しいcurrentIndexを探す
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
    
    if (sensorData[currentIndex]) {
      lastProcessedTimestamp = sensorData[currentIndex].timestamp;
      updateVisuals(sensorData[currentIndex]); // シーク後のデータを即時反映
    }

    // actualStartTimeを再計算して、次のanimateループから正しい位置で再生
    actualStartTime = performance.now() - (seekTargetElapsedCsvTime / playbackSpeed);

    if (isPlaying) {
        if (animationFrameId) cancelAnimationFrame(animationFrameId); // 現在のフレームをキャンセル
        animate(); // 新しい位置からアニメーションを再開
    } else {
        // 一時停止中の場合は、表示を更新して待機
        renderer.clear(); 
        renderer.render(backgroundScene, backgroundCamera); 
        composer.render();
    }
}

function formatTime(ms) {
    if (isNaN(ms) || ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// アプリケーション開始
init();
// 初期状態では何も描画されないので、一度手動で描画する
if (renderer && backgroundScene && backgroundCamera && scene && camera) {
    renderer.clear();
    renderer.render(backgroundScene, backgroundCamera);
    // 初回はcomposerなしで良いか、あるいはcomposer.render()する
    // ただし、sensorDataがまだないのでupdateVisualsは呼ばれない想定
    if (composer) composer.render(); else renderer.render(scene, camera);
} else {
    console.warn("Initial render skipped, components not ready.");
}
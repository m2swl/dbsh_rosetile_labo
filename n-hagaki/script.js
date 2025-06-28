// Import Three.js as an ES Module
import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';

// --- Constants and Enums ---
const Emotion = {
    Joy: 'Joy', Fun: 'Fun', Calm: 'Calm', Sad: 'Sad', Anger: 'Anger',
    Discomfort: 'Discomfort', Fear: 'Fear', Neutral: 'Neutral',
};
const EMOTION_COLORS = {
    [Emotion.Joy]: [30 / 360, 1.0, 0.55], // Orange
    [Emotion.Fun]: [43 / 360, 0.9, 0.52], // Yellow-Orange
    [Emotion.Calm]: [140 / 360, 0.6, 0.6], // Soft Green
    [Emotion.Sad]: [215 / 360, 0.8, 0.6], // Blue
    [Emotion.Anger]: [0 / 360, 0.9, 0.5], // Red
    [Emotion.Discomfort]: [271 / 360, 0.7, 0.55], // Purple
    [Emotion.Fear]: [290 / 360, 0.5, 0.4], // Dark Magenta
    [Emotion.Neutral]: [220 / 360, 0.08, 0.7], // Light Gray
};
const EMOTION_LABELS = {
    [Emotion.Joy]: 'うれしい (Joy)', [Emotion.Fun]: '楽しい (Fun)',
    [Emotion.Calm]: '穏やか (Calm)', [Emotion.Sad]: '悲しい (Sad)',
    [Emotion.Anger]: '怒り (Anger)', [Emotion.Discomfort]: '不快 (Discomfort)',
    [Emotion.Fear]: '恐ろしい (Fear)', [Emotion.Neutral]: 'なにもしない (Neutral)',
};

// --- State Variables ---
let settings = {
    micVolume: 1.5, totalSteps: 150, scatter: 0.8,
    emotion: Emotion.Calm, emotionIntensity: 7,
};

// --- Three.js Variables ---
let scene, camera, renderer, particles, particleMaterial, trailOverlay;
let particlePool = [];
const MAX_PARTICLES = 15000;
const clock = new THREE.Clock();

// --- Web Audio API Variables ---
let audioContext, analyserNode, audioDataArray;
let averageVolume = 0;

// --- DOM Elements ---
const canvasContainer = document.getElementById('canvas-container');
const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('start-button');
const errorMessage = document.getElementById('error-message');
const mainUI = document.getElementById('main-ui');
const settingsOpenButton = document.getElementById('settings-open-button');
const settingsCloseButton = document.getElementById('settings-close-button');
const settingsPanel = document.getElementById('settings-panel');
const captureButton = document.getElementById('capture-button');
const progressRing = document.querySelector('#progress-ring .progress-ring-circle');
const screenFlash = document.getElementById('screen-flash');
const toast = document.getElementById('toast');
const emotionSelect = document.getElementById('emotion');
const sliders = { /* ... as before ... */ };
const valueDisplays = { /* ... as before ... */ };
Object.assign(sliders, {
    micVolume: document.getElementById('micVolume'),
    totalSteps: document.getElementById('totalSteps'),
    scatter: document.getElementById('scatter'),
    emotionIntensity: document.getElementById('emotionIntensity'),
});
Object.assign(valueDisplays, {
    micVolume: document.getElementById('micVolume-value'),
    totalSteps: document.getElementById('totalSteps-value'),
    scatter: document.getElementById('scatter-value'),
    emotionIntensity: document.getElementById('emotionIntensity-value'),
});


// --- Interaction State ---
let longPressTimer;
let ringLength;
const LONG_PRESS_DURATION = 1000;

// --- Initial Setup ---
function init() {
    initUI();
    initScene();
    spawnFlower(0, 0); // Initial flower on start
    animate();
}

function initUI() {
    Object.entries(EMOTION_LABELS).forEach(([key, label]) => {
        const option = document.createElement('option');
        option.value = key; option.textContent = label;
        emotionSelect.appendChild(option);
    });
    for (const key in sliders) {
        sliders[key].value = settings[key];
        updateValueDisplay(key, settings[key]);
        sliders[key].addEventListener('input', (e) => {
            settings[key] = parseFloat(e.target.value);
            updateValueDisplay(key, settings[key]);
        });
    }
    emotionSelect.value = settings.emotion;
    emotionSelect.addEventListener('change', (e) => { settings.emotion = e.target.value; });

    settingsOpenButton.addEventListener('click', () => settingsPanel.classList.add('visible'));
    settingsCloseButton.addEventListener('click', () => settingsPanel.classList.remove('visible'));
    
    canvasContainer.addEventListener('pointerdown', (event) => {
        // Use a more robust method to calculate world coordinates
        const vec = new THREE.Vector3();
        vec.x = (event.clientX / window.innerWidth) * 2 - 1;
        vec.y = -(event.clientY / window.innerHeight) * 2 + 1;
        vec.z = 0.5;
        vec.unproject(camera);
        spawnFlower(vec.x, vec.y);
    });

    captureButton.addEventListener('mousedown', startLongPress);
    captureButton.addEventListener('mouseup', cancelLongPress);
    captureButton.addEventListener('mouseleave', cancelLongPress);
    captureButton.addEventListener('touchstart', startLongPress, { passive: true });
    captureButton.addEventListener('touchend', cancelLongPress);
    captureButton.addEventListener('click', handleShortPress);
}

function updateValueDisplay(key, value) {
    if (valueDisplays[key]) {
        valueDisplays[key].textContent = parseFloat(value).toFixed(1);
    }
}

async function initAudio() {
    if (audioContext) return;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // **CRITICAL FOR iOS:** Resume context after user interaction.
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        analyserNode = audioContext.createAnalyser();
        analyserNode.fftSize = 32;
        analyserNode.smoothingTimeConstant = 0.8;
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyserNode);
        audioDataArray = new Uint8Array(analyserNode.frequencyBinCount);
    } catch (err) {
        console.error('Microphone initialization failed:', err);
        let userMessage = 'マイクの初期化に失敗しました。';
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            userMessage = 'マイクへのアクセスが拒否されました。設定を確認してリロードしてください。';
        } else if (err.name === 'NotFoundError') {
            userMessage = '利用可能なマイクが見つかりませんでした。';
        }
        errorMessage.textContent = userMessage;
        throw err; // Propagate error to stop app start
    }
}

function updateVolume() {
    if (!analyserNode) return;
    analyserNode.getByteFrequencyData(audioDataArray);
    let sum = 0;
    for (const amplitude of audioDataArray) sum += amplitude;
    averageVolume = sum / audioDataArray.length;
}

function initScene() {
    scene = new THREE.Scene();
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 2.2; // Slightly larger frustum
    camera = new THREE.OrthographicCamera(frustumSize * aspect / -2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / -2, 1, 1000);
    camera.position.z = 5;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0xffffff, 1);
    renderer.autoClear = false;
    canvasContainer.appendChild(renderer.domElement);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_PARTICLES * 3), 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(MAX_PARTICLES * 3), 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(new Float32Array(MAX_PARTICLES), 1));
    
    particleMaterial = new THREE.PointsMaterial({
        map: createParticleTexture(), vertexColors: true, sizeAttenuation: true,
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    });

    particles = new THREE.Points(geometry, particleMaterial);
    scene.add(particles);

    trailOverlay = new THREE.Mesh(
        new THREE.PlaneGeometry(camera.right * 4, camera.top * 4), // Make it larger to avoid edge issues
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1 })
    );
    trailOverlay.position.z = -1;

    for (let i = 0; i < MAX_PARTICLES; i++) {
        particlePool.push({
            position: new THREE.Vector3(), velocity: new THREE.Vector3(), color: new THREE.Color(),
            age: 0, lifespan: 0, baseSize: 0, active: false,
        });
    }
    
    window.addEventListener('resize', onWindowResize, false);
}

function createParticleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
}

function onWindowResize() {
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 2.2;
    camera.left = frustumSize * aspect / -2;
    camera.right = frustumSize * aspect / 2;
    camera.top = frustumSize / 2;
    camera.bottom = frustumSize / -2;
    camera.updateProjectionMatrix();
    if(trailOverlay) trailOverlay.scale.set(camera.right * 4, camera.top * 4, 1);
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function spawnFlower(x, y) {
    const [hue, baseSat, baseLight] = EMOTION_COLORS[settings.emotion];
    const saturation = 0.4 + (baseSat - 0.4) * (settings.emotionIntensity / 10);
    const lightness = baseLight + 0.1;
    for (let i = 0; i < settings.totalSteps; i++) {
        const p = particlePool.find(p => !p.active);
        if (!p) continue;
        p.active = true;
        p.position.set(x, y, 0);
        const angle = Math.random() * Math.PI * 2;
        const speed = (Math.random() * 0.8 + 0.2) * settings.scatter;
        p.velocity.set(Math.cos(angle) * speed, Math.sin(angle) * speed, 0);
        p.color.setHSL(hue, saturation, lightness);
        p.age = 0;
        p.lifespan = Math.random() * 1.5 + 0.5;
        p.baseSize = Math.random() * 0.05 + 0.02;
    }
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    updateVolume();
    
    renderer.render(trailOverlay, camera);

    let activeCount = 0;
    const positions = particles.geometry.attributes.position.array;
    const colors = particles.geometry.attributes.color.array;
    const sizes = particles.geometry.attributes.size.array;

    for (const p of particlePool) {
        if (!p.active) continue;
        p.age += delta;
        if (p.age > p.lifespan) { p.active = false; continue; }

        p.velocity.multiplyScalar(0.98);
        p.position.addScaledVector(p.velocity, delta);

        const i = activeCount;
        p.position.toArray(positions, i * 3);
        p.color.toArray(colors, i * 3);
        const micEffect = 1.0 + (averageVolume / 128) * settings.micVolume;
        sizes[i] = Math.max(0.001, p.baseSize * micEffect * (1.0 - p.age / p.lifespan));

        activeCount++;
    }

    particles.geometry.setDrawRange(0, activeCount);
    particles.geometry.attributes.position.needsUpdate = true;
    particles.geometry.attributes.color.needsUpdate = true;
    particles.geometry.attributes.size.needsUpdate = true;
    
    renderer.render(scene, camera);
}

// --- Capture Logic ---
function handleShortPress(e) {
    if(e.detail === 0) return;
    screenFlash.classList.add('flash');
    setTimeout(() => screenFlash.classList.remove('flash'), 400);
    showToast();
}

function startLongPress(e) {
    e.preventDefault();
    if (!ringLength) {
        ringLength = progressRing.getTotalLength();
        if (ringLength === 0) return; // Still not rendered, abort
        progressRing.style.strokeDasharray = ringLength;
        progressRing.style.strokeDashoffset = ringLength;
    }
    progressRing.style.transition = 'stroke-dashoffset 1s linear';
    progressRing.style.strokeDashoffset = '0';
    longPressTimer = setTimeout(() => {
        saveScreenshot();
        cancelLongPress();
    }, LONG_PRESS_DURATION);
}

function cancelLongPress() {
    clearTimeout(longPressTimer);
    if (ringLength) {
        progressRing.style.transition = 'stroke-dashoffset 0.2s ease-out';
        progressRing.style.strokeDashoffset = ringLength;
    }
}

function saveScreenshot() {
    const dataUrl = renderer.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `particle-art-${new Date().toISOString()}.png`;
    link.click();
}

function showToast() {
    toast.classList.remove('hidden');
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.classList.add('hidden'), 300);
    }, 2000);
}

// --- App Start ---
startButton.addEventListener('click', async () => {
    try {
        await initAudio();
        startScreen.style.display = 'none';
        mainUI.classList.remove('hidden');
        init();
    } catch (e) {
        // Error message is already displayed by initAudio
        startButton.disabled = true; // Prevent further clicks
    }
});
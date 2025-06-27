document.addEventListener('DOMContentLoaded', () => {
    // --- Constants ---
    const Emotion = {
        Joy: 'Joy', Fun: 'Fun', Calm: 'Calm', Sad: 'Sad', Anger: 'Anger',
        Discomfort: 'Discomfort', Fear: 'Fear', Neutral: 'Neutral',
    };

    const EMOTION_COLORS = {
        [Emotion.Joy]: [30 / 360, 1.0, 0.5],
        [Emotion.Fun]: [43 / 360, 0.9, 0.52],
        [Emotion.Calm]: [78 / 360, 0.75, 0.69],
        [Emotion.Sad]: [215 / 360, 0.9, 0.51],
        [Emotion.Anger]: [0 / 360, 0.89, 0.48],
        [Emotion.Discomfort]: [271 / 360, 0.78, 0.53],
        [Emotion.Fear]: [145 / 360, 0.6, 0.5],
        [Emotion.Neutral]: [220 / 360, 0.08, 0.5],
    };

    const EMOTION_LABELS = {
        [Emotion.Joy]: 'うれしい (Joy)', [Emotion.Fun]: '楽しい (Fun)',
        [Emotion.Calm]: '穏やか (Calm)', [Emotion.Sad]: '悲しい (Sad)',
        [Emotion.Anger]: '怒り (Anger)', [Emotion.Discomfort]: '不快 (Discomfort)',
        [Emotion.Fear]: '恐ろしい (Fear)', [Emotion.Neutral]: 'なにもしない (Neutral)',
    };

    // --- State ---
    let settings = {
        micVolume: 1.0, totalSteps: 2000, scatter: 5,
        temperature: 0.5, emotion: Emotion.Calm, emotionIntensity: 7,
    };
    let orientation = { alpha: 0, beta: 90, gamma: 0 };
    const LERP_FACTOR = 0.1; // Smoothing factor

    // --- Three.js variables ---
    let scene, camera, renderer, particlesMesh, particleTexture;

    // --- DOM Elements ---
    const startScreen = document.getElementById('start-screen');
    const mainUI = document.getElementById('main-ui');
    const canvasContainer = document.getElementById('canvas-container');
    const startButton = document.getElementById('start-button');
    const errorMessage = document.getElementById('error-message');
    const captureButton = document.getElementById('capture-button');
    const settingsToggle = document.getElementById('settings-toggle');
    const controlsPanel = document.getElementById('controls-panel');
    const emotionSelect = document.getElementById('emotion');
    const sliders = {
        micVolume: document.getElementById('micVolume'),
        totalSteps: document.getElementById('totalSteps'),
        scatter: document.getElementById('scatter'),
        temperature: document.getElementById('temperature'),
        emotionIntensity: document.getElementById('emotionIntensity'),
    };
    const valueDisplays = {
        micVolume: document.getElementById('micVolume-value'),
        totalSteps: document.getElementById('totalSteps-value'),
        scatter: document.getElementById('scatter-value'),
        temperature: document.getElementById('temperature-value'),
        emotionIntensity: document.getElementById('emotionIntensity-value'),
    };

    // --- Device Orientation ---
    const requestPermission = async () => {
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            try {
                const permissionState = await DeviceOrientationEvent.requestPermission();
                if (permissionState === 'granted') return true;
            } catch (error) {
                console.error("Device orientation permission request failed.", error);
                return false;
            }
        } else {
            return true; // For browsers that don't require permission
        }
        return false;
    };

    const handleDeviceOrientation = (event) => {
        orientation = {
            alpha: event.alpha !== null ? (orientation.alpha * (1 - LERP_FACTOR) + event.alpha * LERP_FACTOR) : orientation.alpha,
            beta: event.beta !== null ? (orientation.beta * (1 - LERP_FACTOR) + event.beta * LERP_FACTOR) : orientation.beta,
            gamma: event.gamma !== null ? (orientation.gamma * (1 - LERP_FACTOR) + event.gamma * LERP_FACTOR) : orientation.gamma,
        };
    };

    // --- Particle Texture ---
    const createParticleTexture = () => {
        // グラデーションのない、くっきりした円のSVGに変更
        const particleTextureSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="white"/></svg>`;
        const particleTextureUrl = `data:image/svg+xml;base64,${btoa(particleTextureSVG)}`;
        return new THREE.TextureLoader().load(particleTextureUrl);
    };

    // --- Particles Logic ---
    function createOrUpdateParticles() {
        if (particlesMesh) {
            scene.remove(particlesMesh);
            particlesMesh.geometry.dispose();
            particlesMesh.material.dispose();
        }

        const { totalSteps, scatter, emotion, emotionIntensity, temperature, micVolume } = settings;
        const particlesCount = Math.floor(totalSteps);
        const positions = new Float32Array(particlesCount * 3);
        const colors = new Float32Array(particlesCount * 3);
        const color = new THREE.Color();
        const [hue, baseSat, baseLight] = EMOTION_COLORS[emotion];
        
        const saturation = 0.1 + (baseSat - 0.1) * (emotionIntensity / 10);
        const lightness = baseLight + (temperature * 0.2);

        for (let i = 0; i < particlesCount; i++) {
            const theta = Math.random() * 2 * Math.PI;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = Math.pow(Math.random(), 0.7) * scatter;
            positions.set([r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi)], i * 3);
            color.setHSL(hue, saturation, lightness);
            colors.set([color.r, color.g, color.b], i * 3);
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: micVolume * 0.05,
            vertexColors: true,
            map: particleTexture,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.7, // 全体を半透明にする
            alphaTest: 0.5, // 輪郭をくっきりさせる
            depthWrite: false,
            blending: THREE.NormalBlending, // 通常の重ね合わせに変更
        });

        particlesMesh = new THREE.Points(geometry, material);
        scene.add(particlesMesh);
    }
    
    // --- Scene Setup ---
    function initScene() {
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 0.1;

        renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        canvasContainer.appendChild(renderer.domElement);

        scene.add(new THREE.AmbientLight(0x404040, 0.5));
        const pointLight = new THREE.PointLight(0xffffff, 1, 100);
        pointLight.position.set(10, 10, 10);
        scene.add(pointLight);
        
        particleTexture = createParticleTexture();
        createOrUpdateParticles();

        window.addEventListener('resize', onWindowResize, false);

        animate();
    }

    // --- Animation Loop ---
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    const q0 = new THREE.Quaternion();
    const q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));

    function animate() {
        requestAnimationFrame(animate);

        // Particle rotation
        if (particlesMesh) {
            particlesMesh.rotation.y += 0.0005;
        }

        // Camera orientation
        if (orientation.alpha !== null && orientation.beta !== null && orientation.gamma !== null) {
            const alpha = THREE.MathUtils.degToRad(orientation.alpha);
            const beta = THREE.MathUtils.degToRad(orientation.beta);
            const gamma = THREE.MathUtils.degToRad(orientation.gamma);

            euler.set(beta, alpha, -gamma, 'YXZ');
            camera.quaternion.setFromEuler(euler);
            camera.quaternion.multiply(q1);
            
            const screenOrientation = window.screen.orientation.angle;
            q0.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -screenOrientation * Math.PI / 180);
            camera.quaternion.multiply(q0);
        }

        renderer.render(scene, camera);
    }
    
    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    // --- UI and Event Handling ---
    function updateValueDisplay(key, value) {
        let displayValue = value;
        if (typeof value === 'number') {
            displayValue = value.toFixed(key === 'temperature' || key === 'micVolume' || key === 'scatter' ? 2 : 0);
        }
        if (key === 'temperature') displayValue += "°C";
        
        if (valueDisplays[key]) {
             valueDisplays[key].textContent = displayValue;
        }
    }

    function initUI() {
        // Populate emotion select
        Object.entries(EMOTION_LABELS).forEach(([key, label]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = label;
            if(key === settings.emotion) option.selected = true;
            emotionSelect.appendChild(option);
        });

        // Initialize sliders and value displays
        for (const key in sliders) {
            sliders[key].value = settings[key];
            updateValueDisplay(key, settings[key]);

            sliders[key].addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                settings[key] = value;
                updateValueDisplay(key, value);
                
                // Update particles
                if (key === 'micVolume') {
                    if (particlesMesh) particlesMesh.material.size = value * 0.05;
                } else {
                    createOrUpdateParticles();
                }
            });
        }
        
        emotionSelect.addEventListener('change', (e) => {
           settings.emotion = e.target.value;
           createOrUpdateParticles();
        });

        // Panel toggle for mobile
        controlsPanel.classList.add(window.innerWidth < 768 ? 'closed' : 'open');
        settingsToggle.addEventListener('click', () => {
            controlsPanel.classList.toggle('open');
            controlsPanel.classList.toggle('closed');
        });

        // Capture
        captureButton.addEventListener('click', () => {
            // Render one more frame to ensure it's up to date
            renderer.render(scene, camera);
            const dataUrl = renderer.domElement.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `emotional-sky-${new Date().toISOString()}.png`;
            link.click();
        });
    }

    // --- App Start ---
    startButton.addEventListener('click', async () => {
        const granted = await requestPermission();
        if (granted) {
            startScreen.style.display = 'none';
            mainUI.style.display = 'block';
            canvasContainer.style.display = 'block';
            window.addEventListener('deviceorientation', handleDeviceOrientation);
            initScene();
        } else {
            errorMessage.textContent = "Device orientation access was denied. Please grant permission in your browser settings to continue.";
        }
    });

    initUI();
});
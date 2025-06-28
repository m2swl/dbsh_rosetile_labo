document.addEventListener('DOMContentLoaded', () => {
    // --- Constants ---
    const Emotion = {
        Joy: 'Joy', Fun: 'Fun', Calm: 'Calm', Sad: 'Sad', Anger: 'Anger',
        Discomfort: 'Discomfort', Fear: 'Fear', Neutral: 'Neutral',
    };

    const EMOTION_COLORS = { /* (変更なし) */
        [Emotion.Joy]: [30 / 360, 1.0, 0.5], [Emotion.Fun]: [43 / 360, 0.9, 0.52],
        [Emotion.Calm]: [78 / 360, 0.75, 0.69], [Emotion.Sad]: [215 / 360, 0.9, 0.51],
        [Emotion.Anger]: [0 / 360, 0.89, 0.48], [Emotion.Discomfort]: [271 / 360, 0.78, 0.53],
        [Emotion.Fear]: [145 / 360, 0.6, 0.5], [Emotion.Neutral]: [220 / 360, 0.08, 0.5],
    };

    const EMOTION_LABELS = { /* (変更なし) */
        [Emotion.Joy]: 'うれしい (Joy)', [Emotion.Fun]: '楽しい (Fun)',
        [Emotion.Calm]: '穏やか (Calm)', [Emotion.Sad]: '悲しい (Sad)',
        [Emotion.Anger]: '怒り (Anger)', [Emotion.Discomfort]: '不快 (Discomfort)',
        [Emotion.Fear]: '恐ろしい (Fear)', [Emotion.Neutral]: 'なにもしない (Neutral)',
    };
    
    // 追加: 感情ごとの動きのパラメータ
    const EMOTION_MOVEMENT_PARAMS = {
        [Emotion.Joy]:      { speed: 0.8, sway: 0.8, lifespan: [5, 9], size: 1.2 },
        [Emotion.Fun]:      { speed: 1.0, sway: 1.2, lifespan: [4, 8], size: 1.1 },
        [Emotion.Calm]:     { speed: 0.3, sway: 0.2, lifespan: [10, 15], size: 1.0 },
        [Emotion.Sad]:      { speed: 0.2, sway: 0.3, lifespan: [12, 18], size: 0.8 },
        [Emotion.Anger]:    { speed: 2.5, sway: 0.1, lifespan: [2, 4], size: 1.3 },
        [Emotion.Discomfort]:{ speed: 0.5, sway: 2.0, lifespan: [8, 12], size: 0.9 },
        [Emotion.Fear]:     { speed: 1.2, sway: 3.0, lifespan: [6, 10], size: 1.0 },
        [Emotion.Neutral]:  { speed: 0.4, sway: 0.4, lifespan: [9, 14], size: 1.0 },
    };

    // --- State ---
    let settings = {
        micVolume: 1.5, totalSteps: 1500, scatter: 5,
        temperature: 0.5, emotion: Emotion.Calm, emotionIntensity: 7,
    };
    let orientation = { alpha: 0, beta: 90, gamma: 0 };
    const LERP_FACTOR = 0.1;

    // --- Three.js variables ---
    let scene, camera, renderer, clock;
    let particleGroups = []; // 変更: 複数のパーティクルグループを管理
    let particleTextures = []; // 変更: 複数のテクスチャを保持

    // --- DOM Elements ---
    // (変更なし)
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
    const requestPermission = async () => { /* (変更なし) */
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            try {
                const permissionState = await DeviceOrientationEvent.requestPermission();
                if (permissionState === 'granted') return true;
            } catch (error) {
                console.error("Device orientation permission request failed.", error);
                return false;
            }
        } else { return true; }
        return false;
    };
    const handleDeviceOrientation = (event) => { /* (変更なし) */
        orientation = {
            alpha: event.alpha !== null ? (orientation.alpha * (1 - LERP_FACTOR) + event.alpha * LERP_FACTOR) : orientation.alpha,
            beta: event.beta !== null ? (orientation.beta * (1 - LERP_FACTOR) + event.beta * LERP_FACTOR) : orientation.beta,
            gamma: event.gamma !== null ? (orientation.gamma * (1 - LERP_FACTOR) + event.gamma * LERP_FACTOR) : orientation.gamma,
        };
    };

    // --- Particle Texture ---
    // 変更: 複数のテクスチャを生成
    const createParticleTextures = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        const textures = [];

        // 1. くっきりした円
        ctx.clearRect(0, 0, 64, 64);
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(32, 32, 30, 0, Math.PI * 2);
        ctx.fill();
        textures.push(new THREE.CanvasTexture(canvas.cloneNode(true)));

        // 2. ぼやけた円
        ctx.clearRect(0, 0, 64, 64);
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);
        textures.push(new THREE.CanvasTexture(canvas.cloneNode(true)));

        // 3. 十字のきらめき
        ctx.clearRect(0, 0, 64, 64);
        ctx.fillStyle = 'white';
        ctx.fillRect(28, 10, 8, 44);
        ctx.fillRect(10, 28, 44, 8);
        textures.push(new THREE.CanvasTexture(canvas.cloneNode(true)));

        return textures;
    };


    function createOrUpdateParticles() {
        // 既存のパーティクルをシーンから削除
        particleGroups.forEach(group => scene.remove(group.mesh));
        particleGroups = [];

        const { totalSteps, emotion, emotionIntensity, temperature, micVolume, scatter } = settings;
        const particlesPerShape = Math.floor(totalSteps / particleTextures.length);
        if (particlesPerShape === 0) return;

        const [hue, baseSat, baseLight] = EMOTION_COLORS[emotion];
        const saturation = 0.1 + (baseSat - 0.1) * (emotionIntensity / 10);
        const lightness = baseLight + (temperature * 0.2);
        const movementParams = EMOTION_MOVEMENT_PARAMS[emotion];

        particleTextures.forEach(texture => {
            const positions = new Float32Array(particlesPerShape * 3);
            const colors = new Float32Array(particlesPerShape * 3);
            const customData = []; // 個々のパーティクルの情報を格納

            for (let i = 0; i < particlesPerShape; i++) {
                const color = new THREE.Color();
                color.setHSL(hue, saturation, lightness);
                colors.set([color.r, color.g, color.b], i * 3);

                const sizeScale = (Math.random() * 0.8 + 0.6) * movementParams.size;
                const life = THREE.MathUtils.randFloat(movementParams.lifespan[0], movementParams.lifespan[1]);

                customData[i] = {
                    initialPosition: new THREE.Vector3(
                        (Math.random() - 0.5) * scatter * 2,
                        -scatter / 2 - Math.random() * (scatter),
                        (Math.random() - 0.5) * scatter * 2
                    ),
                    velocity: new THREE.Vector3(0, (Math.random() * 0.5 + 0.5) * movementParams.speed * (scatter/5), 0),
                    lifespan: life,
                    age: -Math.random() * life, // 開始タイミングをずらす
                    size: sizeScale,
                    swayFactor: (Math.random() - 0.5) * 2, // 揺れの方向と強さ
                };
                positions.set([customData[i].initialPosition.x, customData[i].initialPosition.y, customData[i].initialPosition.z], i * 3);
            }

            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

            const material = new THREE.PointsMaterial({
                size: micVolume * 0.15, //基準サイズを調整
                vertexColors: true,
                map: texture,
                sizeAttenuation: true,
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending, // 光が重なるような表現に
            });

            const points = new THREE.Points(geometry, material);
            const group = { mesh: points, data: customData };
            particleGroups.push(group);
            scene.add(points);
        });
    }
    
    // --- Scene Setup ---
    function initScene() {
        clock = new THREE.Clock();
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 8; // カメラを引く

        renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
        renderer.setClearColor(0xffffff);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        canvasContainer.appendChild(renderer.domElement);

        scene.add(new THREE.AmbientLight(0xcccccc, 1.0));
        
        particleTextures = createParticleTextures();
        createOrUpdateParticles();

        window.addEventListener('resize', onWindowResize, false);
        animate();
    }

    // --- Animation Loop ---
    function animate() {
        requestAnimationFrame(animate);
        const delta = clock.getDelta();
        const movementParams = EMOTION_MOVEMENT_PARAMS[settings.emotion];

        particleGroups.forEach(group => {
            const positions = group.mesh.geometry.attributes.position.array;
            const opacities = group.mesh.material;
            const FADE_DURATION = 1.5;

            let totalAge = 0;
            for (let i = 0; i < group.data.length; i++) {
                const p = group.data[i];
                p.age += delta;
                totalAge += p.age;
                
                if (p.age > p.lifespan) {
                    p.age = -Math.random() * p.lifespan / 2;
                    positions[i * 3] = p.initialPosition.x;
                    positions[i * 3 + 1] = p.initialPosition.y;
                    positions[i * 3 + 2] = p.initialPosition.z;
                    continue;
                }
                if (p.age < 0) continue;

                // 揺れの計算
                const sway = Math.sin(p.age * 0.5 * movementParams.speed) * p.swayFactor * movementParams.sway * settings.scatter / 10;
                
                positions[i * 3] += sway * delta;
                positions[i * 3 + 1] += p.velocity.y * delta;
                positions[i * 3 + 2] += sway * delta / 2; // Z方向にも少し揺れ
            }

            group.mesh.geometry.attributes.position.needsUpdate = true;
            // フェードイン・アウトはマテリアル全体のOpacityで簡易的に表現
            const averageAgeRatio = (totalAge / group.data.length) / group.data[0].lifespan;
            opacities.opacity = Math.sin(averageAgeRatio * Math.PI) * 0.8;
        });

        if (orientation.alpha !== null) {
            const alpha = THREE.MathUtils.degToRad(orientation.alpha);
            const beta = THREE.MathUtils.degToRad(orientation.beta);
            const gamma = THREE.MathUtils.degToRad(orientation.gamma);
            const euler = new THREE.Euler(beta, alpha, -gamma, 'YXZ');
            const q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
            const q0 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -window.screen.orientation.angle * Math.PI / 180);
            camera.quaternion.setFromEuler(euler).multiply(q1).multiply(q0);
        }

        renderer.render(scene, camera);
    }
    
    function onWindowResize() { /* (変更なし) */
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function updateValueDisplay(key, value) { /* (変更なし) */
        let displayValue = value;
        if (typeof value === 'number') {
            displayValue = value.toFixed(key === 'temperature' || key === 'micVolume' || key === 'scatter' ? 2 : 0);
        }
        if (valueDisplays[key]) {
             valueDisplays[key].textContent = displayValue;
        }
    }

    function initUI() {
        Object.entries(EMOTION_LABELS).forEach(([key, label]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = label;
            if(key === settings.emotion) option.selected = true;
            emotionSelect.appendChild(option);
        });

        for (const key in sliders) {
            sliders[key].value = settings[key];
            updateValueDisplay(key, settings[key]);

            sliders[key].addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                settings[key] = value;
                updateValueDisplay(key, value);
                
                if (key === 'micVolume') {
                    // 変更: 全てのパーティクルグループのサイズを更新
                    particleGroups.forEach(group => {
                        group.mesh.material.size = value * 0.15;
                    });
                } else {
                    createOrUpdateParticles();
                }
            });
        }
        
        emotionSelect.addEventListener('change', (e) => {
           settings.emotion = e.target.value;
           createOrUpdateParticles();
        });

        controlsPanel.classList.add(window.innerWidth < 768 ? 'closed' : 'open');
        settingsToggle.addEventListener('click', () => {
            controlsPanel.classList.toggle('open');
            controlsPanel.classList.toggle('closed');
        });

        captureButton.addEventListener('click', () => {
            renderer.render(scene, camera);
            const dataUrl = renderer.domElement.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `emotional-sky-${new Date().toISOString()}.png`;
            link.click();
        });
    }

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
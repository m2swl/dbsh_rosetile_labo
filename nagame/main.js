// nagame/main.js

// グローバル変数
let scene, camera, renderer;
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
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

// このシェーダーはユニフォーム名 uEmotionSpeed, uEmotionIntensity, uColorVariety を使用します
// ... (main.js の他の部分は変更なし) ...

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

    // HSL to RGB and RGB to HSL functions (GLSL ES 3.0 compatible)
    // These might be useful for subtle adjustments but avoid large hue shifts if base color is primary
    vec3 rgbToHsl(vec3 color) {
        float maxC = max(max(color.r, color.g), color.b);
        float minC = min(min(color.r, color.g), color.b);
        float h = 0.0, s = 0.0, l = (maxC + minC) / 2.0;
        if (maxC == minC) {
            h = s = 0.0; // achromatic
        } else {
            float d = maxC - minC;
            s = l > 0.5 ? d / (2.0 - maxC - minC) : d / (maxC + minC);
            if (maxC == color.r) h = (color.g - color.b) / d + (color.g < color.b ? 6.0 : 0.0);
            else if (maxC == color.g) h = (color.b - color.r) / d + 2.0;
            else if (maxC == color.b) h = (color.r - color.g) / d + 4.0;
            h /= 6.0;
        }
        return vec3(h, s, l);
    }

    vec3 hslToRgb(vec3 hsl) {
        vec3 rgb;
        float h = hsl.x;
        float s = hsl.y;
        float l = hsl.z;
        if (s == 0.0) {
            rgb = vec3(l); 
        } else {
            float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
            float p = 2.0 * l - q;
            float r_temp, g_temp, b_temp;
            float t_r = h + 1.0/3.0;
            if (t_r < 0.0) t_r += 1.0; if (t_r > 1.0) t_r -= 1.0;
            if (t_r < 1.0/6.0) r_temp = p + (q - p) * 6.0 * t_r;
            else if (t_r < 1.0/2.0) r_temp = q;
            else if (t_r < 2.0/3.0) r_temp = p + (q - p) * (2.0/3.0 - t_r) * 6.0;
            else r_temp = p;
            float t_g = h;
            if (t_g < 0.0) t_g += 1.0; if (t_g > 1.0) t_g -= 1.0;
            if (t_g < 1.0/6.0) g_temp = p + (q - p) * 6.0 * t_g;
            else if (t_g < 1.0/2.0) g_temp = q;
            else if (t_g < 2.0/3.0) g_temp = p + (q - p) * (2.0/3.0 - t_g) * 6.0;
            else g_temp = p;
            float t_b = h - 1.0/3.0;
            if (t_b < 0.0) t_b += 1.0; if (t_b > 1.0) t_b -= 1.0;
            if (t_b < 1.0/6.0) b_temp = p + (q - p) * 6.0 * t_b;
            else if (t_b < 1.0/2.0) b_temp = q;
            else if (t_b < 2.0/3.0) b_temp = p + (q - p) * (2.0/3.0 - t_b) * 6.0;
            else b_temp = p;
            rgb = vec3(r_temp, g_temp, b_temp);
        }
        return rgb;
    }


    void main() {
        vec2 uv = vUv;
        float time = uTime * (0.05 + uEmotionSpeed * 0.1); // 時間進行を少し抑え、感情速度の影響を調整

        // uBaseColor (RGB) を基本とする
        vec3 baseRgb = uBaseColor;

        // color1: uBaseColor を少し暗く、または彩度を落とすなどのバリエーション
        // uColorVariety で uBaseColor からのオフセットを調整
        float offset1 = (noise(uv * 1.2 + time * 0.08) - 0.5) * (0.1 + uColorVariety * 0.2) * uEmotionIntensity;
        vec3 color1 = clamp(baseRgb + vec3(offset1), 0.0, 1.0);
        // さらに彩度や明度を微調整するなら HSL 変換も使える
        // vec3 hsl1 = rgbToHsl(color1);
        // hsl1.y *= (0.8 + uEmotionIntensity * 0.1); // 彩度調整
        // hsl1.z *= (0.9 + (noise(uv * 1.0 - time * 0.05) - 0.5) * 0.1); // 明度調整
        // color1 = hslToRgb(clamp(hsl1, vec3(0.0), vec3(1.0)));


        // color2: uBaseColor を少し明るく、または別の方向にオフセット
        float offset2 = (noise(uv * 1.1 - time * 0.07) - 0.5) * (0.15 + uColorVariety * 0.25) * uEmotionIntensity;
        vec3 color2 = clamp(baseRgb + vec3(offset2, -offset2 * 0.5, offset1 * 0.3), 0.0, 1.0); // 各チャンネルに異なるオフセット
        // vec3 hsl2 = rgbToHsl(color2);
        // hsl2.y *= (1.0 - uEmotionIntensity * 0.1);
        // hsl2.z = min(1.0, hsl2.z + 0.1 + (noise(uv * 0.9 + time * 0.06) - 0.5) * 0.1);
        // color2 = hslToRgb(clamp(hsl2, vec3(0.0), vec3(1.0)));


        // FBMパターンとミキシング
        float patternScale = 0.7 + uEmotionIntensity * 1.0; 
        float fbmTimeX = time * (0.1 + uEmotionSpeed * 0.1);
        float fbmTimeY = time * (0.08 + uEmotionSpeed * 0.08);
        float fbmPattern = fbm(uv * patternScale + vec2(fbmTimeX, fbmTimeY));
        
        vec3 blendedColor = mix(color1, color2, smoothstep(0.3, 0.7, fbmPattern)); // mix範囲を標準的に

        // ハイライト
        vec2 highlightOffset = vec2(sin(time * (0.25 + uEmotionSpeed * 0.08) + uEmotionIntensity * 0.3) * 0.3, 
                                    cos(time * (0.18 + uEmotionSpeed * 0.06) - uEmotionIntensity * 0.25) * 0.3);
        float distToHighlight = length(uv - (vec2(0.5, 0.5) + highlightOffset));
        float highlightEffect = smoothstep(0.7, 0.05, distToHighlight) * uHighlightIntensity * 2.0; 
        
        vec3 finalColor = mix(blendedColor, vec3(0.95, 0.95, 0.98), highlightEffect); // ハイライト色を白に近い色に

        // Vignette
        float vigStrength = 0.3 + uEmotionIntensity * 0.2; 
        float vig = smoothstep(1.0, vigStrength, length(uv - vec2(0.5)));
        finalColor *= vig;
        
        // 全体のコントラストと明るさを微調整
        finalColor = pow(finalColor, vec3(0.9)); 
        finalColor = clamp(finalColor + uHighlightIntensity * 0.05, 0.0, 1.0); // ハイライト強度で全体も少し明るく

        gl_FragColor = vec4(finalColor, 1.0);
    }
`;

// ... (main.js の他の部分は前回のままでOK) ...


// 初期化処理
function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 1.0; // 背景シェーダーがメインなので、カメラはかなり手前

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.autoClear = false;
    vizContainer.appendChild(renderer.domElement);

    backgroundScene = new THREE.Scene();
    backgroundCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const bgPlaneGeo = new THREE.PlaneGeometry(2, 2);
    bgShaderMaterial = new THREE.ShaderMaterial({
        vertexShader: backgroundVertexShader,
        fragmentShader: backgroundFragmentShader,
        uniforms: {
            uTime: { value: 0.0 },
            uBaseColor: { value: new THREE.Color(0.2, 0.3, 0.7) }, // 初期ベースカラー (RGB)
            uHighlightIntensity: { value: 0.1 },                 // 初期ハイライト強度
            uEmotionSpeed: { value: 0.5 },                       // 感情による速度係数 (初期値を少し抑えめに)
            uEmotionIntensity: { value: 0.3 },                   // 感情による変化の強さ係数 (初期値を少し抑えめに)
            uColorVariety: { value: 0.2 }                        // 感情による色の多様性 (初期値を少し抑えめに)
        },
        depthTest: false,
        depthWrite: false
    });
    const bgMesh = new THREE.Mesh(bgPlaneGeo, bgShaderMaterial);
    backgroundScene.add(bgMesh);

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
        csvFileNameDisplay.textContent = file.name;
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
                    resetAnimation();
                    playButton.disabled = false;
                    resetButton.disabled = false;
                    seekBar.disabled = false;
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

function playAnimation() {
    if (sensorData.length === 0 || currentIndex >= sensorData.length) return;
    if (!isAudioInitialized) initAudio();
    if (audioContext && audioContext.state === 'suspended') audioContext.resume();
    if (gainNode) gainNode.gain.setTargetAtTime(0.05, audioContext.currentTime, 0.1);

    isPlaying = true;
    playButton.disabled = true;
    pauseButton.disabled = false;
    const csvTimeOffset = parseFloat(seekBar.value);
    actualStartTime = performance.now() - (csvTimeOffset / playbackSpeed);
    
    if (bgShaderMaterial && bgShaderMaterial.uniforms.uTime.lastTime === undefined && currentIndex > 0) {
        // 再開時に lastTime が未定義の場合、現在の時刻で初期化
        bgShaderMaterial.uniforms.uTime.lastTime = performance.now();
    } else if (currentIndex === 0) {
         // 最初から再生の場合も lastTime をリセットまたは初期化
        if(bgShaderMaterial) delete bgShaderMaterial.uniforms.uTime.lastTime;
    }


    animationFrameId = requestAnimationFrame(animate);
}

function pauseAnimation() {
    isPlaying = false;
    playButton.disabled = false;
    pauseButton.disabled = true;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
    if (gainNode) gainNode.gain.setTargetAtTime(0, audioContext.currentTime, 0.1);
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
        if (bgShaderMaterial) {
            bgShaderMaterial.uniforms.uBaseColor.value.setRGB(0.2, 0.3, 0.7);
            bgShaderMaterial.uniforms.uHighlightIntensity.value = 0.1;
            bgShaderMaterial.uniforms.uEmotionSpeed.value = 0.5;
            bgShaderMaterial.uniforms.uEmotionIntensity.value = 0.3;
            bgShaderMaterial.uniforms.uColorVariety.value = 0.2;
            bgShaderMaterial.uniforms.uTime.value = 0.0;
            delete bgShaderMaterial.uniforms.uTime.lastTime;
        }
    }
    resetButton.disabled = true;
    if (renderer && backgroundScene && backgroundCamera) {
        renderer.clear();
        renderer.render(backgroundScene, backgroundCamera);
    }
}

function animate() {
    if (!isPlaying) return;
    animationFrameId = requestAnimationFrame(animate);

    const performanceNow = performance.now();
    const performanceElapsed = performanceNow - actualStartTime;
    const currentCsvTimestampTarget = sensorData[0].timestamp + (performanceElapsed * playbackSpeed);

    while (currentIndex < sensorData.length - 1 && sensorData[currentIndex + 1].timestamp <= currentCsvTimestampTarget) {
        currentIndex++;
    }
    
    const currentRow = sensorData[currentIndex];
    if (currentRow) {
        updateVisuals(currentRow);
        lastProcessedTimestamp = currentRow.timestamp;
    }
    
    if (bgShaderMaterial) {
        const lastTime = bgShaderMaterial.uniforms.uTime.lastTime || performanceNow;
        const deltaTime = (performanceNow - lastTime) / 1000.0; // デルタタイムを秒で計算
        bgShaderMaterial.uniforms.uTime.value += deltaTime; // playbackSpeedの影響はシェーダー内でuEmotionSpeed等で間接的に制御
        bgShaderMaterial.uniforms.uTime.lastTime = performanceNow;
        if(isNaN(bgShaderMaterial.uniforms.uTime.value)) bgShaderMaterial.uniforms.uTime.value = 0;
    }

    if (sensorData.length > 0 && !isSeeking) {
        const elapsedCsvTime = currentCsvTimestampTarget - sensorData[0].timestamp;
        seekBar.value = Math.max(0, Math.min(parseFloat(seekBar.max), elapsedCsvTime));
        currentTimeDisplay.textContent = formatTime(elapsedCsvTime);
    }
    
    renderer.clear();
    renderer.render(backgroundScene, backgroundCamera);

    if (currentIndex >= sensorData.length - 1 && currentCsvTimestampTarget >= sensorData[sensorData.length-1].timestamp) {
        pauseAnimation();
        resetButton.disabled = false;
        seekBar.value = seekBar.max;
        currentTimeDisplay.textContent = totalTimeDisplay.textContent;
    }
}

function updateVisuals(data) {
    if (!data) return;

    let dataStr = "";
    const keysToShow = ['timestamp', 'sessionColor', 'sessionEmotion', 'temperature_celsius', 'illuminance', 'decibels', 'accelY', 'steps_in_interval']; // orient系はカメラに使わないので一旦除外
    for(const key of keysToShow){
        if(data[key] !== undefined){
            let value = data[key];
            if (typeof value === 'number' && !Number.isInteger(value)) {
                value = value.toFixed(2);
            }
            dataStr += `${key}: ${value}\n`;
        }
    }
    currentDataDisplay.innerHTML = `<pre>${dataStr}</pre>`;

    let baseColorData = parseSessionColor(data.sessionColor);
    if (!baseColorData || typeof baseColorData.r === 'undefined') {
        baseColorData = { r: 0.4, g: 0.4, b: 0.6 };
    }
    let emotionFactor = getEmotionFactor(data.sessionEmotion);
    if (!emotionFactor || typeof emotionFactor.speedFactor === 'undefined') {
        emotionFactor = { speedFactor: 1.0, colorVariety: 1.0, sizeVariety: 1.0, particleMovement: 1.0, apertureFactor: 1.0 };
    }

    if (bgShaderMaterial) {
        const targetBaseColor = new THREE.Color(baseColorData.r, baseColorData.g, baseColorData.b);
        bgShaderMaterial.uniforms.uBaseColor.value.lerp(targetBaseColor, 0.25); // lerpを少し強く

        let highlight = 0.05; // 基本強度を低めに
        if (data.illuminance != null) {
            // illuminanceの影響をよりダイナミックに（例：対数的に反応するなど工夫も可能）
            highlight += Math.min(1.0, data.illuminance / 400.0) * 1.2; // 400ルクスで最大効果、影響度UP
        }
        if (data.decibels != null) {
            // デシベルがマイナスの場合も考慮し、絶対値やマッピングで調整
            const decibelEffect = (Math.max(0, Math.min(60, data.decibels + 30)) / 60.0); // -30dBを0、30dBを1にマッピング
            highlight += decibelEffect * 0.4;
        }
        bgShaderMaterial.uniforms.uHighlightIntensity.value = THREE.MathUtils.lerp(
            bgShaderMaterial.uniforms.uHighlightIntensity.value,
            Math.max(0.0, Math.min(2.0, highlight)), // 最大値を2.0に
            0.25 // lerpを少し強く
        );
        
        // speedFactor を playbackSpeed と掛け合わせることで、CSVの再生速度と感情の速度を両方反映
        const effectiveSpeed = emotionFactor.speedFactor * playbackSpeed;
        bgShaderMaterial.uniforms.uEmotionSpeed.value = THREE.MathUtils.lerp(
            bgShaderMaterial.uniforms.uEmotionSpeed.value,
            effectiveSpeed, // 感情x再生速度
            0.25
        );
        // particleMovement を EmotionIntensity に強く反映
        bgShaderMaterial.uniforms.uEmotionIntensity.value = THREE.MathUtils.lerp(
            bgShaderMaterial.uniforms.uEmotionIntensity.value,
            (emotionFactor.particleMovement * 0.6 + 0.2), // 0.2～1.4 程度 (particleMovementが2.5の場合)
            0.25
        );
        // colorVariety をより広範囲に
        bgShaderMaterial.uniforms.uColorVariety.value = THREE.MathUtils.lerp(
            bgShaderMaterial.uniforms.uColorVariety.value,
            emotionFactor.colorVariety * 0.4, // 0.12～0.76 程度 (colorVarietyが1.9の場合)
            0.25
        );
    }
    
    if (data.photoTakenId === 1) {
        if (bgShaderMaterial) {
            const currentHighlight = bgShaderMaterial.uniforms.uHighlightIntensity.value;
            // フラッシュは既存のハイライトに加算し、さらに強くする
            bgShaderMaterial.uniforms.uHighlightIntensity.value = Math.min(3.0, currentHighlight + 1.5); // 最大3.0
            setTimeout(() => {
                if (bgShaderMaterial) {
                    bgShaderMaterial.uniforms.uHighlightIntensity.value = currentHighlight;
                }
            }, 150); // フラッシュ時間
        }
    }
    updateAudio(data, emotionFactor);
}

function parseSessionColor(colorName) { 
    switch (colorName) {
        case "黄": return { r: 0.95, g: 0.8, b: 0.2 }; // 少し調整
        case "赤": return { r: 0.95, g: 0.2, b: 0.2 }; // 少し調整
        case "青": return { r: 0.2, g: 0.5, b: 0.95 }; // 少し調整
        case "緑": return { r: 0.2, g: 0.9, b: 0.3 }; // 少し調整
        case "紫": return { r: 0.7, g: 0.3, b: 0.9 }; // 少し調整
        default: return { r: 0.5, g: 0.5, b: 0.7 }; // デフォルト調整
    }
}

function getEmotionFactor(emotionName) { 
    // 各係数の影響度を上げる
    switch (emotionName) {
        case "楽しい": return { speedFactor: 1.6, colorVariety: 2.2, sizeVariety: 1.3, particleMovement: 1.8, apertureFactor: 1.2 };
        case "悲しい": return { speedFactor: 0.5, colorVariety: 0.2, sizeVariety: 0.7, particleMovement: 0.3, apertureFactor: 0.7 };
        case "怒り":   return { speedFactor: 2.5, colorVariety: 1.5, sizeVariety: 1.6, particleMovement: 2.8, apertureFactor: 1.5 };
        case "穏やか": return { speedFactor: 0.7, colorVariety: 0.6, sizeVariety: 0.9, particleMovement: 0.7, apertureFactor: 0.9 };
        default:     return { speedFactor: 1.0, colorVariety: 1.0, sizeVariety: 1.0, particleMovement: 1.0, apertureFactor: 1.0 };
    }
}

function onWindowResize() {
    if (camera && renderer && backgroundCamera) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

function initAudio() {
    if (isAudioInitialized) return;
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        oscillator = audioContext.createOscillator();
        gainNode = audioContext.createGain();
        filterNode = audioContext.createBiquadFilter();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
        filterNode.type = "lowpass";
        filterNode.frequency.setValueAtTime(2500, audioContext.currentTime); // フィルターカットオフを上げる
        filterNode.Q.setValueAtTime(0.8, audioContext.currentTime); // Q値を少し下げる
        oscillator.connect(filterNode);
        filterNode.connect(gainNode);
        gainNode.connect(audioContext.destination);
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        oscillator.start();
        isAudioInitialized = true;
    } catch (e) {
        console.error("Error initializing audio:", e);
    }
}

function updateAudio(data, emotionFactor) {
    if (!isAudioInitialized || !audioContext || !oscillator || !filterNode || !gainNode) return; // Ensure all nodes exist

    const baseFreq = 880;
    let targetFreq = baseFreq;
    
    if (data.temperature_celsius != null) {
        const tempNorm = (Math.min(35, Math.max(5, data.temperature_celsius)) - 5) / 30;
        targetFreq = baseFreq + tempNorm * 330; // 温度による周波数変化を大きく
    }

    const effectiveSpeed = emotionFactor.speedFactor * playbackSpeed; // 再生速度も音の変化に影響

    switch (data.sessionEmotion) {
        case "楽しい": 
            oscillator.type = 'sawtooth'; 
            filterNode.frequency.setTargetAtTime(3500 + emotionFactor.particleMovement * 600 * effectiveSpeed, audioContext.currentTime, 0.05);
            filterNode.Q.setTargetAtTime(1.2 + emotionFactor.sizeVariety * 0.6, audioContext.currentTime, 0.05);
            break;
        case "悲しい": 
            oscillator.type = 'sine'; 
            targetFreq *= (0.9 / effectiveSpeed); // 再生速度が速いとさらに低くならないように調整
            filterNode.frequency.setTargetAtTime(800 / effectiveSpeed, audioContext.currentTime, 0.1);
            filterNode.Q.setTargetAtTime(0.7, audioContext.currentTime, 0.1);
            break;
        case "怒り":   
            oscillator.type = 'square'; 
            targetFreq *= (1.1 * effectiveSpeed);
            filterNode.frequency.setTargetAtTime(1200 + Math.random() * 600 * effectiveSpeed, audioContext.currentTime, 0.03);
            filterNode.Q.setTargetAtTime(4 + Math.random() * 3, audioContext.currentTime, 0.03);
            break;
        case "穏やか": 
            oscillator.type = 'triangle'; 
            filterNode.frequency.setTargetAtTime(1800 * Math.sqrt(effectiveSpeed), audioContext.currentTime, 0.1); // 速度で少し変わる
            filterNode.Q.setTargetAtTime(0.9, audioContext.currentTime, 0.1);
            break;
        default:     
            oscillator.type = 'sine';
            filterNode.frequency.setTargetAtTime(2200 * Math.sqrt(effectiveSpeed), audioContext.currentTime, 0.1);
            break;
    }
    oscillator.frequency.setTargetAtTime(Math.max(20, Math.min(20000, targetFreq)), audioContext.currentTime, 0.05); // 周波数範囲制限

    let targetGain = 0.02; // 基本ゲインを少し下げる
    if (data.decibels != null) {
        const decibelEffect = (Math.max(0, Math.min(70, data.decibels + 40)) / 70.0); // -40dBを0, 30dBを1
        targetGain += decibelEffect * 0.08; 
        filterNode.frequency.setTargetAtTime(Math.max(100, filterNode.frequency.value * (1 + decibelEffect * 0.15)), audioContext.currentTime, 0.03);
    }
    if (isPlaying) {
      gainNode.gain.setTargetAtTime(Math.min(0.12, Math.max(0, targetGain)), audioContext.currentTime, 0.05); // 最大ゲインを少し下げる
    }

    if (data.photoTakenId === 1) {
        const clickOsc = audioContext.createOscillator();
        const clickGain = audioContext.createGain();
        clickOsc.type = 'triangle';
        clickOsc.frequency.setValueAtTime(1800, audioContext.currentTime);
        clickGain.gain.setValueAtTime(0.12, audioContext.currentTime);
        clickGain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.07);
        clickOsc.connect(clickGain);
        clickGain.connect(audioContext.destination);
        clickOsc.start(audioContext.currentTime);
        clickOsc.stop(audioContext.currentTime + 0.07);
    }
}

function handleSeekBarInput() {
    isSeeking = true;
    const seekTimeMs = parseFloat(seekBar.value);
    currentTimeDisplay.textContent = formatTime(seekTimeMs);
}

function handleSeekBarChange() {
    isSeeking = false;
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
    
    if (sensorData[currentIndex]) {
      lastProcessedTimestamp = sensorData[currentIndex].timestamp;
      updateVisuals(sensorData[currentIndex]); // 即時反映
    }

    actualStartTime = performance.now() - (seekTargetElapsedCsvTime / playbackSpeed);
    if (bgShaderMaterial) {
        bgShaderMaterial.uniforms.uTime.lastTime = performance.now(); // シーク時もlastTimeを更新
    }

    if (isPlaying) {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        animationFrameId = requestAnimationFrame(animate);
    } else {
        if (renderer && backgroundScene && backgroundCamera) {
            renderer.clear();
            renderer.render(backgroundScene, backgroundCamera);
        }
    }
}

function formatTime(ms) {
    if (isNaN(ms) || ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

init();
if (renderer && backgroundScene && backgroundCamera) {
    renderer.clear();
    renderer.render(backgroundScene, backgroundCamera);
} else {
    console.warn("Initial render skipped.");
}
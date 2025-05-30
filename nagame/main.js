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

// 状態変数
let darkModeEnabled = false;
let customizationPanelVisible = false;
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
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 1.0; // 背景シェーダーがメインなので、カメラはかなり手前

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.autoClear = false; // 背景レンダリング後にメインシーンを重ねる場合に必要だが、今回は背景のみなので不要かも。念のため残す
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
            uEmotionSpeed: { value: 0.5 },                       // 感情による速度係数
            uEmotionIntensity: { value: 0.3 },                   // 感情による変化の強さ係数
            uColorVariety: { value: 0.2 }                        // 感情による色の多様性
        },
        depthTest: false,
        depthWrite: false
    });
    const bgMesh = new THREE.Mesh(bgPlaneGeo, bgShaderMaterial);
    backgroundScene.add(bgMesh);

    // イベントリスナー設定
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

    // 新しいイベントリスナー
    toggleDarkModeButton.addEventListener('click', toggleDarkMode);
    toggleCustomizationButton.addEventListener('click', toggleCustomizationPanel);
    intensityMultiplierSlider.addEventListener('input', updateMultiplierDisplay);
    varietyMultiplierSlider.addEventListener('input', updateMultiplierDisplay);
    highlightMultiplierSlider.addEventListener('input', updateMultiplierDisplay);

    // 初期テーマ設定 (システム設定優先)
    setInitialTheme();

    // 初期レンダリング
    if (renderer && backgroundScene && backgroundCamera) {
         renderer.render(backgroundScene, backgroundCamera);
     } else {
         console.warn("Initial render skipped.");
     }
    onWindowResize(); // 初期サイズ調整
}

function setInitialTheme() {
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    darkModeEnabled = prefersDarkMode;
    document.documentElement.setAttribute('data-theme', darkModeEnabled ? 'dark' : 'light');
    // アイコンの表示を更新 (これはCSSで制御することも可能だがJSでも)
    toggleDarkModeButton.querySelector('.material-symbols-outlined').textContent = darkModeEnabled ? 'light_mode' : 'dark_mode';
}

function toggleDarkMode() {
    darkModeEnabled = !darkModeEnabled;
    document.documentElement.setAttribute('data-theme', darkModeEnabled ? 'dark' : 'light');
    // アイコンの表示を更新
     toggleDarkModeButton.querySelector('.material-symbols-outlined').textContent = darkModeEnabled ? 'light_mode' : 'dark_mode';
}

function toggleCustomizationPanel() {
    customizationPanelVisible = !customizationPanelVisible;
    customizationPanel.classList.toggle('hidden', !customizationPanelVisible);
}

function updateMultiplierDisplay(event) {
    const slider = event.target;
    const valueDisplay = document.getElementById(slider.id.replace('Multiplier', 'Value'));
    const value = parseFloat(slider.value);
    valueDisplay.textContent = `${value.toFixed(1)}x`;

    // グローバル変数にも反映
    if (slider.id === 'intensityMultiplier') manualIntensityMultiplier = value;
    if (slider.id === 'varietyMultiplier') manualVarietyMultiplier = value;
    if (slider.id === 'highlightMultiplier') manualHighlightMultiplier = value;

    // シークバー操作中や再生中でない場合、即時反映のためにupdateVisualsを呼ぶ
    if (!isPlaying && !isSeeking && sensorData.length > 0) {
        const currentRow = sensorData[currentIndex];
         if (currentRow) {
             // multiplierだけ適用して描画更新
             updateVisuals(currentRow, { applyManualMultipliersOnly: true });
             renderer.clear();
             renderer.render(backgroundScene, backgroundCamera);
         }
    }
}


function handleFileLoad(event) {
    const file = event.target.files[0];
    if (file) {
        csvFileNameDisplay.textContent = file.name;
        Papa.parse(file, {
            header: true, dynamicTyping: true, skipEmptyLines: true,
            complete: function(results) {
                // timestampがnullでない、数値である、他の主要な列（例：sessionColor, sessionEmotion）が存在するか確認
                sensorData = results.data.filter(row =>
                    row.timestamp != null && typeof row.timestamp === 'number' &&
                    row.sessionColor != null && row.sessionEmotion != null
                );
                if (sensorData.length > 0) {
                    sensorData.sort((a, b) => a.timestamp - b.timestamp);
                    const firstTs = sensorData[0].timestamp;
                    const lastTs = sensorData[sensorData.length - 1].timestamp;
                    const totalDurationMs = lastTs - firstTs;

                    // データが存在しない場合や無効なdurationの場合のチェック
                    if (totalDurationMs <= 0 || isNaN(totalDurationMs)) {
                         alert("データが短すぎるか、無効なタイムスタンプ範囲です。");
                         resetStateAfterLoadError();
                         return;
                    }


                    seekBar.max = totalDurationMs;
                    seekBar.value = 0;
                    totalTimeDisplay.textContent = formatTime(totalDurationMs);
                    currentTimeDisplay.textContent = formatTime(0);
                    
                    resetAnimation(); // データのロード完了時にリセット
                    playButton.disabled = false;
                    resetButton.disabled = false;
                    seekBar.disabled = false;

                    // 初期vis/audioパラメータ設定
                    if (sensorData.length > 0) {
                        updateVisuals(sensorData[0]); // 最初のデータで表示を初期化
                        // updateAudioも最初のデータで初期化 (isPlaying=falseなので音は出ないがパラメータは設定される)
                        const initialEmotionFactor = getEmotionFactor(sensorData[0].sessionEmotion);
                        updateAudio(sensorData[0], initialEmotionFactor);
                    }

                } else {
                    alert("有効なデータが見つかりませんでした。タイムスタンプ、sessionColor, sessionEmotion列などを確認してください。");
                    resetStateAfterLoadError();
                }
            },
            error: function(error) {
                console.error("CSV Parse Error:", error);
                alert("CSVファイルのパースに失敗しました。");
                resetStateAfterLoadError();
            }
        });
    }
}

function resetStateAfterLoadError() {
    sensorData = [];
    csvFileNameDisplay.textContent = "N/A";
    currentDataDisplay.innerHTML = "";
    totalTimeDisplay.textContent = formatTime(0);
    currentTimeDisplay.textContent = formatTime(0);
    seekBar.max = 0;
    seekBar.value = 0;
    seekBar.disabled = true;
    playButton.disabled = true;
    pauseButton.disabled = true;
    resetButton.disabled = true;
    isPlaying = false;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
    // シェーダーユニフォームもリセット
    if (bgShaderMaterial) {
        bgShaderMaterial.uniforms.uBaseColor.value.setRGB(0.2, 0.3, 0.7);
        bgShaderMaterial.uniforms.uHighlightIntensity.value = 0.1;
        bgShaderMaterial.uniforms.uEmotionSpeed.value = 0.5;
        bgShaderMaterial.uniforms.uEmotionIntensity.value = 0.3;
        bgShaderMaterial.uniforms.uColorVariety.value = 0.2;
        bgShaderMaterial.uniforms.uTime.value = 0.0;
        delete bgShaderMaterial.uniforms.uTime.lastTime;
    }
    // オーディオもリセット
    if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().then(() => {
            isAudioInitialized = false;
             currentAudioParams = { frequency: 440, filterFreq: 2500, filterQ: 1, gain: 0 };
        });
    } else {
         isAudioInitialized = false;
          currentAudioParams = { frequency: 440, filterFreq: 2500, filterQ: 1, gain: 0 };
    }
     // 初期レンダリングで画面をデフォルトに戻す
     if (renderer && backgroundScene && backgroundCamera) {
         renderer.render(backgroundScene, backgroundCamera);
     }
}


function playAnimation() {
    if (sensorData.length === 0 || currentIndex >= sensorData.length) return;
    if (!isAudioInitialized) initAudio();

    // オーディオコンテキストが一時停止している場合、再開
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
             // ゲインをフェードイン
            if (gainNode) gainNode.gain.setTargetAtTime(0.08, audioContext.currentTime, 0.1); // 最大ゲインを少し上げる
        });
    } else {
         // 最初からの再生、または一時停止からの再開だがstateがsuspendedでない場合
         if (gainNode) gainNode.gain.setTargetAtTime(0.08, audioContext.currentTime, 0.1);
    }


    isPlaying = true;
    playButton.disabled = true;
    pauseButton.disabled = false;

    // 現在のシークバーの値に基づいてアニメーション開始時刻を調整
    const currentElapsedCsvTime = parseFloat(seekBar.value); // ミリ秒
    // performance.now() はミリ秒、currentElapsedCsvTime もミリ秒
    // actualStartTime は performance.now() の値
    // 経過ミリ秒 = (performance.now() - actualStartTime) * playbackSpeed
    // currentElapsedCsvTime = (performanceNow - actualStartTime) * playbackSpeed
    // currentElapsedCsvTime / playbackSpeed = performanceNow - actualStartTime
    // actualStartTime = performanceNow - (currentElapsedCsvTime / playbackSpeed)
    actualStartTime = performance.now() - (currentElapsedCsvTime / playbackSpeed);

    // shader uTime の継続処理
    // 再開時に shader time の lastTime を現在の performance.now() に設定
    if (bgShaderMaterial && bgShaderMaterial.uniforms.uTime) {
       bgShaderMaterial.uniforms.uTime.lastTime = performance.now();
       // uTime.value 自体はアニメーションループで delta time が加算され続けるので、
       // ここでリセットしたり大きく調整したりする必要はない。
       // シークバー操作時は handleSeekBarChange で uTime.value がリセットされている。
    }


    if (!animationFrameId) { // requestAnimationFrameがまだ開始されていない場合のみ
        animationFrameId = requestAnimationFrame(animate);
    }
}

function pauseAnimation() {
    if (!isPlaying) return; // 既に一時停止中の場合は何もしない

    isPlaying = false;
    playButton.disabled = false;
    pauseButton.disabled = true;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = null;

    // ゲインをフェードアウトして音を止める
    if (gainNode && audioContext) {
        gainNode.gain.setTargetAtTime(0, audioContext.currentTime, 0.1);
    }

    // AudioContextを一時停止してリソースを節約
    if (audioContext && audioContext.state === 'running') {
       audioContext.suspend();
    }
}

function resetAnimation() {
    pauseAnimation(); // 再生中なら一時停止

    currentIndex = 0;
    seekBar.value = 0;
    currentTimeDisplay.textContent = formatTime(0);

    if (sensorData.length > 0) {
        lastProcessedTimestamp = sensorData[0].timestamp;
        updateVisuals(sensorData[0]); // 最初のフレームの表示に更新
        playButton.disabled = false;
         // オーディオパラメータも最初のフレームにリセット (音は出さない)
        const initialEmotionFactor = getEmotionFactor(sensorData[0].sessionEmotion);
        updateAudio(sensorData[0], initialEmotionFactor); // updateAudio内でgainNodeが0になるように制御されているはず
    } else {
        // データがない場合の状態リセットはhandleFileLoadのエラー処理にまとめる
         resetStateAfterLoadError();
         return; // 処理を終了
    }

    // シェーダーのuTimeをリセット
    if (bgShaderMaterial && bgShaderMaterial.uniforms.uTime) {
        bgShaderMaterial.uniforms.uTime.value = 0.0;
        delete bgShaderMaterial.uniforms.uTime.lastTime; // lastTimeを削除して次回のanimateで再初期化させる
    }

    resetButton.disabled = true; // リセットボタンは押せない状態に
     // シークバー操作中でなければ表示更新
     if (!isSeeking && renderer && backgroundScene && backgroundCamera) {
         renderer.clear();
         renderer.render(backgroundScene, backgroundCamera);
     }
}

function animate() {
    if (!isPlaying) {
         animationFrameId = null; // ループを停止したことを明示
         return;
    }
    animationFrameId = requestAnimationFrame(animate);

    const performanceNow = performance.now();
    const performanceElapsed = performanceNow - actualStartTime;
    // ターゲットとするCSVの経過時間 (ミリ秒)
    const currentCsvElapsedTarget = (performanceElapsed * playbackSpeed);
    // ターゲットとするCSVの絶対タイムスタンプ (ミリ秒)
    const currentCsvTimestampTarget = sensorData[0].timestamp + currentCsvElapsedTarget;

    // currentIndexを更新: ターゲットタイムスタンプ以下の最後のデータポイントを探す
    let nextIndex = currentIndex;
    while (nextIndex < sensorData.length - 1 && sensorData[nextIndex + 1].timestamp <= currentCsvTimestampTarget) {
        nextIndex++;
    }

    // currentIndexが更新された場合、または強制更新が必要な場合にVisuals/Audioを更新
    // isSeeking中はanimateが呼ばれないが、シーク終了時にhandleSeekBarChangeでupdateVisualsが呼ばれる
    if (nextIndex !== currentIndex || currentIndex === 0) { // 最初のフレームは必ず更新
        currentIndex = nextIndex;
        const currentRow = sensorData[currentIndex];
        if (currentRow) {
            updateVisuals(currentRow);
             // updateAudio もここで呼ぶ
            const emotionFactor = getEmotionFactor(currentRow.sessionEmotion);
            updateAudio(currentRow, emotionFactor);

            lastProcessedTimestamp = currentRow.timestamp; // 更新されたタイムスタンプを記録
        }
    }


    // シェーダーのuTimeを更新
    if (bgShaderMaterial && bgShaderMaterial.uniforms.uTime) {
        const lastTime = bgShaderMaterial.uniforms.uTime.lastTime || performanceNow; // 初回またはリセット後のためのフォールバック
        const deltaTime = (performanceNow - lastTime) / 1000.0; // デルタタイムを秒で計算
        // uTimeは累積時間なので、デルタタイムを加算
        bgShaderMaterial.uniforms.uTime.value += deltaTime;
        bgShaderMaterial.uniforms.uTime.lastTime = performanceNow;
        // NaNチェック (まれに発生しうる)
        if(isNaN(bgShaderMaterial.uniforms.uTime.value)) bgShaderMaterial.uniforms.uTime.value = 0;
    }


    // シークバーと時間の表示を更新
    if (!isSeeking && sensorData.length > 0) {
        // シークバーは経過時間 (ms) を反映
        seekBar.value = Math.max(0, Math.min(parseFloat(seekBar.max), currentCsvElapsedTarget));
        currentTimeDisplay.textContent = formatTime(currentCsvElapsedTarget);
    }

    // 描画
    renderer.clear(); // 毎フレームクリア
    renderer.render(backgroundScene, backgroundCamera); // 背景をレンダリング

    // アニメーション終了判定
    if (currentIndex >= sensorData.length - 1 && currentCsvTimestampTarget >= sensorData[sensorData.length-1].timestamp) {
        pauseAnimation(); // 一時停止
        resetButton.disabled = false; // リセットボタンを有効化
        // 終了時にシークバーと時間を正確に表示
        seekBar.value = seekBar.max;
        currentTimeDisplay.textContent = totalTimeDisplay.textContent;
    }
}

// updateVisuals 関数の引数にオプションを追加
function updateVisuals(data, options = {}) {
    if (!data || !bgShaderMaterial) return;

    // デフォルトオプション
    const defaultOptions = {
        applyManualMultipliersOnly: false // trueの場合、CSVデータに基づく変動はスキップし、manual multiplierだけを適用
    };
    const finalOptions = { ...defaultOptions, ...options };

    // データ表示を更新
    if (!finalOptions.applyManualMultipliersOnly) {
        let dataStr = "";
        // 表示したいキーリスト。orient系は今回は除外したまま
        const keysToShow = ['timestamp', 'sessionColor', 'sessionEmotion', 'temperature_celsius', 'illuminance', 'decibels', 'accelY', 'steps_in_interval', 'photoTakenId'];
        for(const key of keysToShow){
            if(data[key] !== undefined && data[key] !== null){ // nullまたはundefinedでないことを確認
                let value = data[key];
                 if (typeof value === 'number') {
                    if (!Number.isInteger(value)) {
                        value = value.toFixed(2); // 小数点以下2桁に丸め
                    }
                    // temperature_celsius と decibels に単位を追加
                    if(key === 'temperature_celsius') value += ' °C';
                    if(key === 'decibels') value += ' dB';
                }
                dataStr += `${key}: ${value}\n`;
            }
        }
        currentDataDisplay.innerHTML = `<pre>${dataStr}</pre>`;
    }


    // --- シェーダーユニフォームの更新 ---
    // 補間を強くして変化を滑らかにする
    const lerpFactor = isPlaying ? 0.15 : 1.0; // 再生中は滑らかに、停止中は即時反映

    if (!finalOptions.applyManualMultipliersOnly) {
        // CSVデータに基づく値を取得/計算
        let baseColorData = parseSessionColor(data.sessionColor);
        if (!baseColorData || typeof baseColorData.r === 'undefined') {
            baseColorData = { r: 0.4, g: 0.4, b: 0.6 }; // デフォルト色
        }
        const targetBaseColor = new THREE.Color(baseColorData.r, baseColorData.g, baseColorData.b);
        bgShaderMaterial.uniforms.uBaseColor.value.lerp(targetBaseColor, lerpFactor);


        let dataHighlight = 0.05; // 基本強度
        if (data.illuminance != null && typeof data.illuminance === 'number') {
             // illuminanceの影響度を上げる（例：対数的に反応するなど工夫も可能）
             // 対数スケールでマッピング (0-10000ルクス想定)
             const minLogLux = Math.log(1); // 仮に1ルクスから
             const maxLogLux = Math.log(10001); // 10000ルクスまで
             const logLux = Math.log(Math.max(1, data.illuminance + 1)); // 0ルクスでもlog(1)=0になるように+1
             const luxNorm = Math.min(1.0, Math.max(0.0, (logLux - minLogLux) / (maxLogLux - minLogLux)));
             dataHighlight += luxNorm * 1.5; // 影響度をさらに上げる (最大1.5加算)
        }
        if (data.decibels != null && typeof data.decibels === 'number') {
            // デシベルがマイナスの場合も考慮し、絶対値やマッピングで調整
            // -40dB を 0, 0dB を 0.5, 30dB を 1 にマッピングする例
            const decibelNorm = Math.min(1.0, Math.max(0.0, (data.decibels + 40) / 70.0));
            dataHighlight += decibelNorm * 0.6; // 影響度を上げる (最大0.6加算)
        }
         // マニュアル乗数を適用
        const finalHighlight = Math.max(0.0, Math.min(3.0, dataHighlight * manualHighlightMultiplier)); // 最大値を調整
        bgShaderMaterial.uniforms.uHighlightIntensity.value = THREE.MathUtils.lerp(
             bgShaderMaterial.uniforms.uHighlightIntensity.value,
             finalHighlight,
             lerpFactor
         );

        let emotionFactor = getEmotionFactor(data.sessionEmotion);
        if (!emotionFactor || typeof emotionFactor.speedFactor === 'undefined') {
            emotionFactor = { speedFactor: 1.0, colorVariety: 1.0, sizeVariety: 1.0, particleMovement: 1.0, apertureFactor: 1.0 };
        }

        // speedFactor を playbackSpeed と掛け合わせることで、CSVの再生速度と感情の速度を両方反映
        // uEmotionSpeed はシェーダー内の時間進行に直接影響
        const effectiveSpeed = emotionFactor.speedFactor * playbackSpeed;
        bgShaderMaterial.uniforms.uEmotionSpeed.value = THREE.MathUtils.lerp(
            bgShaderMaterial.uniforms.uEmotionSpeed.value,
            effectiveSpeed,
            lerpFactor
        );

        // particleMovement を EmotionIntensity に反映させつつ、マニュアル乗数を適用
        // uEmotionIntensity は色の変化、FBMスケール、ビネット強度に影響
        const dataIntensity = (emotionFactor.particleMovement * 0.7 + 0.1); // 0.1～1.85 程度 (particleMovementが2.5の場合)
        const finalIntensity = dataIntensity * manualIntensityMultiplier;
        bgShaderMaterial.uniforms.uEmotionIntensity.value = THREE.MathUtils.lerp(
            bgShaderMaterial.uniforms.uEmotionIntensity.value,
            Math.max(0.1, Math.min(2.0, finalIntensity)), // 最小値を設定、最大値を調整
            lerpFactor
        );

        // colorVariety を uColorVariety に反映させつつ、マニュアル乗数を適用
        // uColorVariety は色の多様性、color1/color2のオフセット範囲に影響
        const dataVariety = emotionFactor.colorVariety * 0.5; // 0.1～0.95 程度 (colorVarietyが1.9の場合)
        const finalVariety = dataVariety * manualVarietyMultiplier;
        bgShaderMaterial.uniforms.uColorVariety.value = THREE.MathUtils.lerp(
            bgShaderMaterial.uniforms.uColorVariety.value,
            Math.max(0.1, Math.min(1.5, finalVariety)), // 最小値を設定、最大値を調整
            lerpFactor
        );

    } else {
         // applyManualMultipliersOnly が true の場合、現在のデータ値は使わず、
         // 現在のシェーダーユニフォーム値にマニュアル乗数のみを適用して lerp する
         // これはシークや停止中にスライダーを動かした時に表示を更新するために使う
         const currentIntensity = bgShaderMaterial.uniforms.uEmotionIntensity.value;
         const currentVariety = bgShaderMaterial.uniforms.uColorVariety.value;
         const currentHighlight = bgShaderMaterial.uniforms.uHighlightIntensity.value;
         const currentSpeed = bgShaderMaterial.uniforms.uEmotionSpeed.value; // スピードも手動調整の影響を受けるようにする？

         // 現在の値に直接乗数を適用してターゲット値を計算
         // ただし lerp は既存の値から新しいターゲット値への補間なので、
         // ここでのlerpFactorは即時反映させたい場合は1.0にすべき。
         // このパスは再生中でない場合に呼ばれる想定なので、lerpFactorは1.0で良い
         const lerpFactorManual = 1.0; // マニュアル操作時は即時反映

         // uEmotionSpeed は playbackSpeed と感情の両方に影響されるが、マニュアル調整の対象外とする
         // その代わり uTime の進行速度が uEmotionSpeed に影響される

         const targetIntensity = Math.max(0.1, Math.min(2.0, (currentIntensity / (manualIntensityMultiplier || 1.0)) * manualIntensityMultiplier)); // 現在値を元に乗数を再計算
         const targetVariety = Math.max(0.1, Math.min(1.5, (currentVariety / (manualVarietyMultiplier || 1.0)) * manualVarietyMultiplier));
         const targetHighlight = Math.max(0.0, Math.min(3.0, (currentHighlight / (manualHighlightMultiplier || 1.0)) * manualHighlightMultiplier));

          // 現在の値から新しいターゲット値へ補間 (実質即時反映)
         bgShaderMaterial.uniforms.uEmotionIntensity.value = THREE.MathUtils.lerp(currentIntensity, targetIntensity, lerpFactorManual);
         bgShaderMaterial.uniforms.uColorVariety.value = THREE.MathUtils.lerp(currentVariety, targetVariety, lerpFactorManual);
         bgShaderMaterial.uniforms.uHighlightIntensity.value = THREE.MathUtils.lerp(currentHighlight, targetHighlight, lerpFactorManual);

         // uEmotionSpeed はデータと playbackSpeed に依存するため、マニュアル操作では変更しない
         // shader の時間進行に uEmotionSpeed が影響するので、playbackSpeed の変更はここでなくても animate で反映される
    }


    // 写真撮影時のフラッシュエフェクト
    if (data.photoTakenId === 1) {
        if (bgShaderMaterial) {
             // データに基づくハイライト値 + マニュアル乗数適用後の値を取得
            const currentCalculatedHighlight = bgShaderMaterial.uniforms.uHighlightIntensity.value;
            // フラッシュは一時的にハイライト強度を既存の値に加算して強くする
            const flashBoost = 1.5; // フラッシュによる追加強度
            const flashTargetHighlight = Math.min(3.5, currentCalculatedHighlight + flashBoost); // 最大値を少し上げる
            const flashDuration = 150; // ミリ秒

            // アニメーションループ内で処理されている場合、renderer.renderはループが担当
            // 停止中に呼ばれた場合はここでレンダリングをトリガーする必要がある
            const needsRender = !isPlaying && !isSeeking;

            if (needsRender) renderer.clear(); // 停止中は手動クリア

            // フェードイン/アウトでフラッシュ効果を滑らかに
            const flashInDuration = flashDuration * 0.3; // フェードイン短め
            const flashOutDuration = flashDuration * 0.7; // フェードアウト長め

            // 一時的に強度を上げて、タイマーで戻す
            bgShaderMaterial.uniforms.uHighlightIntensity.value = flashTargetHighlight;
            if (needsRender) renderer.render(backgroundScene, backgroundCamera); // 強度変更後のレンダリング

            setTimeout(() => {
                 if (bgShaderMaterial) {
                    // 元のハイライト値に戻す (lerpで滑らかに)
                    bgShaderMaterial.uniforms.uHighlightIntensity.value = THREE.MathUtils.lerp(
                         bgShaderMaterial.uniforms.uHighlightIntensity.value,
                         currentCalculatedHighlight,
                         1.0 // 即時補完に近い感じで戻す
                     );
                     if (needsRender) {
                        renderer.clear();
                        renderer.render(backgroundScene, backgroundCamera); // 戻した後のレンダリング
                     }
                 }
            }, flashDuration);

        }
    }
    // オーディオ更新はupdateVisuals内で呼ばれるようになったので削除
    // updateAudio(data, emotionFactor); // これを animate ループ内で呼ぶように変更
}

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
    if (camera && renderer && backgroundCamera) {
        const width = window.innerWidth;
        const height = window.innerHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        // 背景用カメラはOrthographicなので aspect 比率ではなく直接サイズを調整する
        // ただし、背景Planeが固定サイズ(-1 to 1)でカメラも固定(-1 to 1)なので調整は不要
        // backgroundCamera.left = -width / height;
        // backgroundCamera.right = width / height;
        // backgroundCamera.updateProjectionMatrix();

        renderer.setSize(width, height);
        if (bgShaderMaterial) {
             // シェーダー内で画面サイズを考慮する場合 (今回はUV座標使用のため不要だが、将来のために)
             // bgShaderMaterial.uniforms.iResolution.value.set(width, height, 1);
        }
         // リサイズ後に表示を更新
         if (sensorData.length > 0 && currentIndex >= 0) {
              updateVisuals(sensorData[currentIndex]); // 現在のデータで表示パラメータを更新
              if (!isPlaying && !isSeeking) { // 再生中でなければ手動でレンダリング
                  renderer.clear();
                  renderer.render(backgroundScene, backgroundCamera);
              }
         } else { // データがない場合はデフォルト画面をレンダリング
             if (renderer && backgroundScene && backgroundCamera) {
                 renderer.clear();
                 renderer.render(backgroundScene, backgroundCamera);
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
        // オーディオが無効、またはコンテキストが閉じられている場合は何もしない
        // ただし、オーディオが suspended の場合はパラメータ更新は行う (resume時に反映される可能性があるため)
         if (!isAudioInitialized || audioContext.state === 'closed') return;
    }

    const currentTime = audioContext.currentTime;
    const smoothTime = 0.1; // パラメータ変化の滑らかさ (秒)

    // データに基づくパラメータ計算
    let targetFreq = 440; // デフォルト周波数 (A4)
    let targetFilterFreq = 2500; // デフォルトフィルター周波数
    let targetFilterQ = 1; // デフォルトQ値
    let targetGain = isPlaying ? 0.02 : 0; // 基本ゲイン (再生中のみ音を出す)

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
            oscillator.type = 'triangle'; // より柔らかい音色
            targetFreq *= (1.0 + effectiveSpeed * 0.2); // 速度で少しピッチ上昇
            targetFilterFreq = 3000 + emotionFactor.particleMovement * 800 * effectiveSpeed;
            targetFilterQ = 1.5 + emotionFactor.sizeVariety * 0.5;
            targetGain += emotionFactor.apertureFactor * 0.02; // ゲインも少し上昇
            break;
        case "悲しい":
            oscillator.type = 'sine';
            targetFreq *= (0.8 / Math.sqrt(effectiveSpeed)); // 速度が速いほどピッチ低下を抑える
            targetFilterFreq = 600 + emotionFactor.colorVariety * 300 / effectiveSpeed; // 速度が遅いほどフィルターが狭まる
            targetFilterQ = 0.9;
            targetGain *= 0.5; // ゲイン低下
            break;
        case "怒り":
            oscillator.type = 'sawtooth'; // より鋭い音色
            targetFreq *= (1.2 * effectiveSpeed); // 速度でピッチ上昇
            targetFilterFreq = 1500 + Math.random() * 1000 * effectiveSpeed; // ランダム性を加える
            targetFilterQ = 3 + Math.random() * 2; // Q値を高く
            targetGain += emotionFactor.apertureFactor * 0.05; // ゲイン上昇
            break;
        case "穏やか":
            oscillator.type = 'sine'; // 穏やかな音色
            targetFreq *= (1.0 / Math.sqrt(effectiveSpeed)); // 速度が速いほどピッチ低下を抑える
            targetFilterFreq = 2000 * Math.sqrt(effectiveSpeed);
            targetFilterQ = 1.2;
            targetGain *= 0.8; // ゲインを少し抑える
            break;
        default: // その他/デフォルト
            oscillator.type = 'sine';
            targetFilterFreq = 2200 * Math.sqrt(effectiveSpeed);
            targetFilterQ = 1.0;
             targetGain *= 0.9;
            break;
    }

    // パラメータを更新 (setTargetAtTimeで滑らかに)
    // 周波数範囲を制限
    const finalFreq = Math.max(50, Math.min(10000, targetFreq));
    if (finalFreq !== currentAudioParams.frequency) {
        oscillator.frequency.setTargetAtTime(finalFreq, currentTime, smoothTime);
        currentAudioParams.frequency = finalFreq;
    }

     const finalFilterFreq = Math.max(100, Math.min(8000, targetFilterFreq)); // フィルター周波数範囲制限
    if (finalFilterFreq !== currentAudioParams.filterFreq) {
        filterNode.frequency.setTargetAtTime(finalFilterFreq, currentTime, smoothTime);
        currentAudioParams.filterFreq = finalFilterFreq;
    }

    const finalFilterQ = Math.max(0.1, Math.min(10, targetFilterQ)); // Q値範囲制限
    if (finalFilterQ !== currentAudioParams.filterQ) {
        filterNode.Q.setTargetAtTime(finalFilterQ, currentTime, smoothTime);
         currentAudioParams.filterQ = finalFilterQ;
    }

    // ゲイン範囲を制限し、再生状態を考慮
    const finalGain = isPlaying ? Math.min(0.15, Math.max(0, targetGain)) : 0; // 最大ゲイン調整, 非再生時は0
    if (finalGain !== currentAudioParams.gain) {
        gainNode.gain.setTargetAtTime(finalGain, currentTime, smoothTime);
        currentAudioParams.gain = finalGain;
    }


    // steps_in_interval があれば短い効果音を追加
    if (data.steps_in_interval > 0 && typeof data.steps_in_interval === 'number') {
        // ステップ数に応じて短いパーカッシブな音を生成
        // 前回のステップ処理から一定時間経過しているかチェックする方が良いかもしれない
        if (!updateAudio.lastStepTime || (currentTime - updateAudio.lastStepTime > 0.1)) { // 短いクールダウン
             const stepOsc = audioContext.createOscillator();
             const stepGain = audioContext.createGain();
             const stepFilter = audioContext.createBiquadFilter();

             stepOsc.type = 'triangle';
             const stepPitch = 400 + Math.random() * 400 + data.steps_in_interval * 20; // ステップ数でピッチを少し上げる
             stepOsc.frequency.setValueAtTime(stepPitch, currentTime);

             stepFilter.type = 'bandpass'; // バンドパスフィルター
             const filterCenterFreq = 800 + data.steps_in_interval * 50;
             stepFilter.frequency.setValueAtTime(filterCenterFreq, currentTime);
             stepFilter.Q.setValueAtTime(5 + data.steps_in_interval * 0.5, currentTime);

             stepGain.gain.setValueAtTime(0.05 * Math.min(data.steps_in_interval / 5, 1), currentTime); // ステップ数でゲイン調整 (最大5ステップでフルゲイン)
             stepGain.gain.exponentialRampToValueAtTime(0.0001, currentTime + 0.15); // 短い減衰

             stepOsc.connect(stepFilter);
             stepFilter.connect(stepGain);
             stepGain.connect(audioContext.destination);

             stepOsc.start(currentTime);
             stepOsc.stop(currentTime + 0.15); // 短い音

             updateAudio.lastStepTime = currentTime; // 最終ステップ処理時間を記録
        }
    }


    // photoTakenId があれば短いクリック音を追加
    if (data.photoTakenId === 1 && typeof data.photoTakenId === 'number') {
         // 前回の写真処理から一定時間経過しているかチェック
         if (!updateAudio.lastPhotoTime || (currentTime - updateAudio.lastPhotoTime > 0.5)) { // 短いクールダウン
            const clickOsc = audioContext.createOscillator();
            const clickGain = audioContext.createGain();
            const clickFilter = audioContext.createBiquadFilter(); // フィルターを追加

            clickOsc.type = 'square'; // クリック感のある波形
            clickOsc.frequency.setValueAtTime(2500, currentTime); // 高めの周波数

            clickFilter.type = 'highpass'; // ハイパスフィルターで低音をカット
            clickFilter.frequency.setValueAtTime(1500, currentTime);
            clickFilter.Q.setValueAtTime(1.0, currentTime);

            clickGain.gain.setValueAtTime(0.15, currentTime); // 少し大きめのゲイン
            clickGain.gain.exponentialRampToValueAtTime(0.0001, currentTime + 0.1); // 短い減衰

            clickOsc.connect(clickFilter); // オシレーター -> フィルター
            clickFilter.connect(clickGain); // フィルター -> ゲイン
            clickGain.connect(audioContext.destination);

            clickOsc.start(currentTime);
            clickOsc.stop(currentTime + 0.1); // 短い音

            updateAudio.lastPhotoTime = currentTime; // 最終写真処理時間を記録
         }
    }
}
// updateAudio 関数の静的プロパティを初期化
updateAudio.lastStepTime = 0;
updateAudio.lastPhotoTime = 0;


function handleSeekBarInput() {
    isSeeking = true;
    const seekTimeMs = parseFloat(seekBar.value);
    currentTimeDisplay.textContent = formatTime(seekTimeMs);

    // シークバー移動中も表示を更新するために updateVisuals を呼ぶ
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
         // 仮のcurrentIndexでupdateVisualsを呼び出し、表示のみ更新
         // オーディオパラメータも更新されるが、isSeeking中はgainが0なので音は出ない
         updateVisuals(sensorData[tempIndex]);
         // シークバー移動中はanimateループが停止している可能性があるので、手動でレンダリング
         renderer.clear();
         renderer.render(backgroundScene, backgroundCamera);
    }
}

function handleSeekBarChange() {
    isSeeking = false;
    if (sensorData.length === 0) return;

    const seekTargetElapsedCsvTime = parseFloat(seekBar.value); // シーク完了時の経過時間 (ms)
    const seekTargetAbsoluteCsvTime = sensorData[0].timestamp + seekTargetElapsedCsvTime; // シーク完了時の絶対タイムスタンプ

    let newIndex = 0;
    // シークした位置に対応するcurrentIndexを見つける
    for (let i = 0; i < sensorData.length; i++) {
        if (sensorData[i].timestamp <= seekTargetAbsoluteCsvTime) {
            newIndex = i;
        } else {
            break;
        }
    }
    currentIndex = newIndex; // currentIndexを更新

    // アニメーション開始時刻を再計算して、シーク位置から再生が始まるようにする
    // 経過ミリ秒 = (performance.now() - actualStartTime) * playbackSpeed
    // seekTargetElapsedCsvTime = (performanceNow_at_seek_end - actualStartTime) * playbackSpeed
    // actualStartTime = performanceNow_at_seek_end - (seekTargetElapsedCsvTime / playbackSpeed)
    actualStartTime = performance.now() - (seekTargetElapsedCsvTime / playbackSpeed);

    // シークした位置のデータで表示とオーディオを即時更新
    if (sensorData[currentIndex]) {
      lastProcessedTimestamp = sensorData[currentIndex].timestamp;
      updateVisuals(sensorData[currentIndex]);
       const emotionFactor = getEmotionFactor(sensorData[currentIndex].sessionEmotion);
       updateAudio(sensorData[currentIndex], emotionFactor); // オーディオパラメータも更新
    }

    // シェーダーのuTimeもシーク位置に合わせてリセットまたは調整する必要があるか？
    // uTimeは単に時間経過によるアニメーション用なので、シーク時はリセットで良い
    if (bgShaderMaterial && bgShaderMaterial.uniforms.uTime) {
        bgShaderMaterial.uniforms.uTime.value = 0.0; // シーク時はshader timeをリセット
        delete bgShaderMaterial.uniforms.uTime.lastTime; // 次のanimateでlastTimeが再初期化されるように削除
    }


    // 再生中だった場合はアニメーションを再開
    if (isPlaying) {
        if (animationFrameId) cancelAnimationFrame(animationFrameId); // 念のため既存のアニメーションフレームをキャンセル
        animationFrameId = requestAnimationFrame(animate); // 新しい位置から再開
         // オーディオを再開/フェードイン
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                 if (gainNode) gainNode.gain.setTargetAtTime(Math.min(0.15, Math.max(0, currentAudioParams.gain)), audioContext.currentTime, 0.1);
            });
        } else if (gainNode) {
             gainNode.gain.setTargetAtTime(Math.min(0.15, Math.max(0, currentAudioParams.gain)), audioContext.currentTime, 0.1);
        }

    } else {
        // 再生中でない場合は、シーク位置で一度レンダリングして表示を更新
        if (renderer && backgroundScene && backgroundCamera) {
            renderer.clear();
            renderer.render(backgroundScene, backgroundCamera);
        }
         // 再生中でない場合もオーディオのパラメータは更新されるが、ゲインは0になっているはず
    }
}

function formatTime(ms) {
    if (isNaN(ms) || ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    // ミリ秒も表示する場合はこちら
    // const milliseconds = Math.floor((ms % 1000) / 10); // 1/100秒まで
    // return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
     return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// ウィンドウリサイズイベントリスナーを追加
window.addEventListener('resize', onWindowResize);

// 初期化処理を呼び出し
init();
// 初回のレンダリングはinitの中で行うように変更
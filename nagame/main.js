// nagame/main.js

// グローバル変数
let scene, camera, renderer, composer, bokehPass;
let particles;
let sensorData = [];
let currentIndex = 0;
let animationStartTime = 0; // CSVの最初のタイムスタンプを再生開始時の基準とするためのもの
let lastProcessedTimestamp = 0; // 最後に処理したCSVのタイムスタンプ
let playbackSpeed = 1.0;
let isPlaying = false;
let animationFrameId;

const PARTICLE_COUNT = 500; // 表示するパーティクルの基本数

// DOM要素
const csvFileInput = document.getElementById('csvFile');
const playButton = document.getElementById('playButton');
const pauseButton = document.getElementById('pauseButton');
const resetButton = document.getElementById('resetButton');
const speedControl = document.getElementById('speedControl');
const speedValueDisplay = document.getElementById('speedValue');
const vizContainer = document.getElementById('visualizationContainer');

// 初期化処理
function init() {
    // Three.js シーン設定
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2a); // 少し暗めの背景色

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 50;

    renderer = new THREE.WebGLRenderer({ antialias: true }); //アンチエイリアス有効化
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    vizContainer.appendChild(renderer.domElement);

    // パーティクル初期化
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);
    // 各パーティクルの初期状態やアニメーション用の追加属性
    const customAttributes = {
        startTimeOffset: new Float32Array(PARTICLE_COUNT), // 各パーティクルのアニメーション開始オフセット
        velocity: new Float32Array(PARTICLE_COUNT * 3)      // 各パーティクルの基本速度
    };


    for (let i = 0; i < PARTICLE_COUNT; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 150; // X
        positions[i * 3 + 1] = (Math.random() - 0.5) * 150; // Y
        positions[i * 3 + 2] = (Math.random() - 0.5) * 100 - 50; // Z (カメラの手前から奥まで)

        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 1.0;
        colors[i * 3 + 2] = 1.0;

        sizes[i] = Math.random() * 8 + 3; // サイズを少し大きめに

        customAttributes.startTimeOffset[i] = Math.random() * 5000; // 0-5秒のランダムオフセット
        customAttributes.velocity[i*3] = (Math.random() - 0.5) * 0.05;
        customAttributes.velocity[i*3+1] = (Math.random() - 0.5) * 0.05 + 0.05; // 少し上昇する傾向
        customAttributes.velocity[i*3+2] = (Math.random() - 0.5) * 0.02;
    }
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    particleGeometry.setAttribute('startTimeOffset', new THREE.BufferAttribute(customAttributes.startTimeOffset, 1));
    particleGeometry.setAttribute('velocity', new THREE.BufferAttribute(customAttributes.velocity, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
        size: 1, // BufferAttributeでサイズ指定するため基本サイズは1
        map: new THREE.TextureLoader().load('assets/particle.png'), // パスを確認
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false, // AdditiveBlendingと併用する場合はfalseが良いことが多い
        transparent: true,
        sizeAttenuation: true,
        opacity: 0.8 // 少し透明度を持たせる
    });

    particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // ポストプロセッシング (ボケ効果)
    const renderPass = new THREE.RenderPass(scene, camera);
    bokehPass = new THREE.BokehPass(scene, camera, {
        focus: 30.0,      // 初期フォーカス位置
        aperture: 0.0002, // ボケの強さ (値が小さいほど強い)
        maxblur: 0.008,   // 最大のボケ量
        width: window.innerWidth,
        height: window.innerHeight
    });

    composer = new THREE.EffectComposer(renderer);
    composer.addPass(renderPass);
    composer.addPass(bokehPass);

    // ウィンドウリサイズ対応
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
}

function handleFileLoad(event) {
    const file = event.target.files[0];
    if (file) {
        Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: function(results) {
                sensorData = results.data.filter(row => row.timestamp != null && typeof row.timestamp === 'number');
                if (sensorData.length > 0) {
                    sensorData.sort((a, b) => a.timestamp - b.timestamp);
                    lastProcessedTimestamp = sensorData[0].timestamp;
                    playButton.disabled = false;
                    resetButton.disabled = false;
                    currentIndex = 0;
                    console.log("CSV data loaded and parsed:", sensorData.length, "rows");
                    updateVisuals(sensorData[0]); // 最初のデータで初期描画
                } else {
                    alert("有効なデータが見つかりませんでした。タイムスタンプ列を確認してください。");
                }
            },
            error: function(error) {
                console.error("CSV Parse Error:", error);
                alert("CSVファイルのパースに失敗しました。");
            }
        });
    }
}

let actualStartTime = 0; // 実際の再生開始時刻 (performance.now())

function playAnimation() {
    if (sensorData.length === 0 || currentIndex >= sensorData.length) return;
    isPlaying = true;
    playButton.disabled = true;
    pauseButton.disabled = false;

    // 再生開始時のタイムスタンプオフセットを計算
    // currentIndexのデータがCSVの開始からどれだけ経過しているか
    const csvTimeOffset = sensorData[currentIndex].timestamp - sensorData[0].timestamp;
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
}

function resetAnimation() {
    pauseAnimation();
    currentIndex = 0;
    if (sensorData.length > 0) {
        lastProcessedTimestamp = sensorData[0].timestamp;
        updateVisuals(sensorData[0]);
        playButton.disabled = false;
    } else {
        playButton.disabled = true;
    }
    resetButton.disabled = true; // リセット後は一度無効化
    if (composer) composer.render(); else if (renderer) renderer.render(scene, camera);
}


function animate() {
    if (!isPlaying) return;

    animationFrameId = requestAnimationFrame(animate);

    const performanceElapsed = performance.now() - actualStartTime; // PC時間での経過時間
    const currentCsvTimestampTarget = sensorData[0].timestamp + (performanceElapsed * playbackSpeed);

    // 次のデータポイントに進む
    let advanced = false;
    while (currentIndex < sensorData.length - 1 && sensorData[currentIndex + 1].timestamp <= currentCsvTimestampTarget) {
        currentIndex++;
        advanced = true;
    }
    
    const currentRow = sensorData[currentIndex];
    if (currentRow) {
        // if (advanced || currentIndex === 0) { // データが変わった時だけ更新、または常に更新
             updateVisuals(currentRow);
        // }
        lastProcessedTimestamp = currentRow.timestamp;
    }

    // パーティクルの自然な動き
    const positions = particles.geometry.attributes.position.array;
    const velocities = particles.geometry.attributes.velocity.array;
    const baseSizes = particles.geometry.attributes.size.array; // 元のサイズを保持

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        positions[i * 3] += velocities[i * 3] * playbackSpeed;
        positions[i * 3 + 1] += velocities[i * 3 + 1] * playbackSpeed;
        positions[i * 3 + 2] += velocities[i * 3 + 2] * playbackSpeed;

        // 画面外に出たら反対側やランダムな位置に戻す（より自然なループ）
        if (positions[i * 3 + 1] > 75) { // 上に出たら
            positions[i * 3 + 1] = -75; // 下から
            positions[i * 3] = (Math.random() - 0.5) * 150; // X位置リセット
        } else if (positions[i * 3 + 1] < -75) { // 下に出たら
            positions[i * 3 + 1] = 75; // 上から
            positions[i * 3] = (Math.random() - 0.5) * 150;
        }
        if (positions[i * 3] > 75) positions[i * 3] = -75;
        if (positions[i * 3] < -75) positions[i * 3] = 75;
        if (positions[i * 3 + 2] > camera.position.z) positions[i * 3 + 2] = -50 + Math.random()*10; // 奥に行ったら手前
        if (positions[i * 3 + 2] < -50) positions[i * 3 + 2] = camera.position.z - 10 + Math.random()*10; // 手前に来すぎたら奥
    }
    particles.geometry.attributes.position.needsUpdate = true;
    
    composer.render();

    if (currentIndex >= sensorData.length - 1 && currentCsvTimestampTarget >= sensorData[sensorData.length-1].timestamp) {
        pauseAnimation();
        resetButton.disabled = false; //最後まで再生したらリセット可能に
        console.log("Playback finished.");
    }
}


function updateVisuals(data) {
    if (!data || !particles) return;

    const colors = particles.geometry.attributes.color.array;
    const sizes = particles.geometry.attributes.size.array; // これは PointsMaterial.size に乗算される係数として使うか、シェーダーで直接使う

    const baseColor = parseSessionColor(data.sessionColor);
    const emotionFactor = getEmotionFactor(data.sessionEmotion);

    // 全体の明るさや雰囲気を調整
    const globalBrightness = data.illuminance != null ? Math.min(1, Math.max(0.1, (data.illuminance / 500))) : 0.7; // 0ルクスで暗すぎないように

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        // 色
        let r = baseColor.r, g = baseColor.g, b = baseColor.b;
        
        // 温度で色温度を少し変える
        if (data.temperature_celsius != null) {
            const tempNorm = (Math.min(35, Math.max(5, data.temperature_celsius)) - 5) / 30; // 5-35度を0-1に
            r = r * (0.8 + tempNorm * 0.4); // 高温で赤み増
            b = b * (1.2 - tempNorm * 0.4); // 低温で青み増
        }

        // accelYで輝度をわずかに変える (例: 上を向くと明るくなるなど)
        const accelYNorm = data.accelY != null ? (data.accelY + 10) / 20 : 0.5; // -10 to 10 を 0 to 1 に
        const brightnessFluctuation = 0.8 + accelYNorm * 0.4;
        
        colors[i * 3] = Math.max(0, Math.min(1, r * globalBrightness * brightnessFluctuation * (0.8 + (Math.random()-0.5)*0.3*emotionFactor.colorVariety) ));
        colors[i * 3 + 1] = Math.max(0, Math.min(1, g * globalBrightness * brightnessFluctuation * (0.8 + (Math.random()-0.5)*0.3*emotionFactor.colorVariety) ));
        colors[i * 3 + 2] = Math.max(0, Math.min(1, b * globalBrightness * brightnessFluctuation * (0.8 + (Math.random()-0.5)*0.3*emotionFactor.colorVariety) ));

        // サイズ
        let baseSize = particles.geometry.attributes.size.array[i]; // 初期ランダムサイズ
        let decibelFactor = data.decibels != null ? Math.max(0.5, Math.min(2.5, (Math.abs(data.decibels) / 25))) : 1; // 大きな音でサイズ増
        decibelFactor *= emotionFactor.sizeVariety;
        sizes[i] = baseSize * decibelFactor * (data.steps_in_interval > 0 ? 1.3 : 1);
        sizes[i] = Math.max(1.0, Math.min(20.0, sizes[i]));
    }

    particles.geometry.attributes.color.needsUpdate = true;
    particles.material.needsUpdate = true; // size属性をシェーダーに反映させるため (カスタムシェーダーでない場合、PointsMaterialのsizeは均一)
                                            // 個別サイズはカスタムシェーダーか、sizeアトリビュートを読むシェーダーが必要
                                            // Three.js r128のPointsMaterialはsizeアトリビュートを直接読まない。マテリアルのsizeプロパティで一括変更。
                                            // 個別サイズを反映させるにはカスタムシェーダーが必要だが、まずは平均サイズをマテリアルで調整する。
    const avgSize = sizes.reduce((a,b) => a+b, 0) / sizes.length;
    particles.material.size = Math.max(1, Math.min(15, avgSize / 2)); // マテリアルのsizeプロパティで調整

    // ボケ効果
    bokehPass.materialBokeh.uniforms['focus'].value = data.orientBeta != null ? THREE.MathUtils.mapLinear(data.orientBeta, -90, 90, 10, 70) : 30;
    bokehPass.materialBokeh.uniforms['aperture'].value = data.decibels != null ? Math.max(0.00001, Math.min(0.001, Math.abs(data.decibels) / 40000 * emotionFactor.apertureFactor)) : 0.0002;
    bokehPass.materialBokeh.uniforms['maxblur'].value = data.gyroAlpha != null ? Math.max(0.001, Math.min(0.02, Math.abs(data.gyroAlpha) / 360 * 0.015)) : 0.008;
    
    // カメラの動き (orientAlpha, orientBeta, orientGamma を使う)
    // orientAlpha (ヨー): Y軸回転 / orientBeta (ピッチ): X軸回転 / orientGamma (ロール): Z軸回転
    if (data.orientAlpha != null) {
        camera.rotation.y = THREE.MathUtils.degToRad(data.orientAlpha / 2); // 変化を控えめに
    }
    if (data.orientBeta != null) {
        camera.rotation.x = THREE.MathUtils.degToRad(data.orientBeta / 3);
    }
    if (data.orientGamma != null) {
        camera.rotation.z = THREE.MathUtils.degToRad(data.orientGamma / 3);
    }
    camera.lookAt(scene.position); //常に中心を見るように

    // photoTakenIdでフラッシュ
    if (data.photoTakenId === 1) {
        flashEffect(data.sessionColor);
    }
}

function flashEffect(colorName) {
    const flashColor = parseSessionColor(colorName);
    const originalBg = scene.background.clone();
    scene.background = new THREE.Color(flashColor.r, flashColor.g, flashColor.b);
    
    // パーティクルも一瞬明るくする
    const originalParticleOpacity = particles.material.opacity;
    particles.material.opacity = 1.0;

    setTimeout(() => {
        scene.background = originalBg;
        particles.material.opacity = originalParticleOpacity;
    }, 120);
}

function parseSessionColor(colorName) {
    switch (colorName) {
        case "黄": return { r: 0.9, g: 0.7, b: 0.1 };
        case "赤": return { r: 0.9, g: 0.1, b: 0.1 };
        case "青": return { r: 0.1, g: 0.4, b: 0.9 };
        case "緑": return { r: 0.1, g: 0.9, b: 0.2 };
        case "紫": return { r: 0.6, g: 0.2, b: 0.8 };
        default: return { r: 0.7, g: 0.7, b: 0.7 };
    }
}

function getEmotionFactor(emotionName) {
    switch (emotionName) {
        case "楽しい": return { speedFactor: 1.3, colorVariety: 1.8, sizeVariety: 1.3, particleMovement: 1.5, apertureFactor: 1.2 };
        case "悲しい": return { speedFactor: 0.7, colorVariety: 0.4, sizeVariety: 0.7, particleMovement: 0.4, apertureFactor: 0.7 };
        case "怒り":   return { speedFactor: 1.8, colorVariety: 1.0, sizeVariety: 1.6, particleMovement: 2.2, apertureFactor: 1.5 };
        case "穏やか": return { speedFactor: 0.9, colorVariety: 0.8, sizeVariety: 0.9, particleMovement: 0.8, apertureFactor: 0.9 };
        default:     return { speedFactor: 1.0, colorVariety: 1.0, sizeVariety: 1.0, particleMovement: 1.0, apertureFactor: 1.0 };
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    if (bokehPass && bokehPass.renderTargetDepth) { // bokehPassが初期化されているか確認
        bokehPass.renderTargetDepth.width = window.innerWidth * window.devicePixelRatio;
        bokehPass.renderTargetDepth.height = window.innerHeight * window.devicePixelRatio;
    }
}

// アプリケーション開始
init();
// MWC Components, DOM Elements, etc.
const body = document.body;
const themeSwitch = document.getElementById('themeSwitch');

// Page containers
const recordPage = document.getElementById('recordPage');
const historyPage = document.getElementById('historyPage');
const navRecordTab = document.getElementById('navRecordTab');
const navHistoryTab = document.getElementById('navHistoryTab');

// Recording Elements
const sensorPermissionIconButton = document.getElementById('sensorPermissionIconButton');
const startRecordingIconButton = document.getElementById('startRecordingIconButton');
const stopRecordingIconButton = document.getElementById('stopRecordingIconButton');
const downloadCSVIconButton = document.getElementById('downloadCSVIconButton');
const recordingStatusEl = document.getElementById('recordingStatus');

// Sensor UI Elements (existing)
const orientationCube = document.getElementById('orientationCube');
const orientAlphaEl = document.getElementById('orient-alpha');
const orientBetaEl = document.getElementById('orient-beta');
const orientGammaEl = document.getElementById('orient-gamma');
const orientStatusEl = document.getElementById('orient-status');
const accelXEl = document.getElementById('accel-x');
const accelYEl = document.getElementById('accel-y');
const accelZEl = document.getElementById('accel-z');
const accelStatusEl = document.getElementById('accel-status');
const accelBarX = document.getElementById('accel-bar-x');
const accelBarY = document.getElementById('accel-bar-y');
const accelBarZ = document.getElementById('accel-bar-z');
const BAR_MAX_ACCEL = 20;
const gyroAlphaEl = document.getElementById('gyro-alpha');
const gyroBetaEl = document.getElementById('gyro-beta');
const gyroGammaEl = document.getElementById('gyro-gamma');
const gyroStatusEl = document.getElementById('gyro-status');
const lightValueEl = document.getElementById('light-value');
const lightStatusEl = document.getElementById('light-status');
const lightIconSun = document.getElementById('light-icon-sun');
const lightIconMoon = document.getElementById('light-icon-moon');
const micDbfsEl = document.getElementById('mic-dbfs');
const micStatusEl = document.getElementById('mic-status');
const micLevelBar = document.getElementById('micLevelBar');
const cameraPreview = document.getElementById('cameraPreview');
const photoCanvas = document.getElementById('photoCanvas');
const takePictureButton = document.getElementById('takePictureButton');
const cameraStatusEl = document.getElementById('camera-status');
const lastPhotoPreviewContainer = document.getElementById('lastPhotoPreviewContainer');

// Geolocation & Weather UI Elements
const geoLatEl = document.getElementById('geo-lat');
const geoLonEl = document.getElementById('geo-lon');
const geoAccEl = document.getElementById('geo-acc');
const geoAltEl = document.getElementById('geo-alt');
const geoSpeedEl = document.getElementById('geo-speed');
const geoHeadEl = document.getElementById('geo-head');
const geoAddressEl = document.getElementById('geo-address'); // New
const geoAddressStatusEl = document.getElementById('geo-address-status'); // New
const geoStatusEl = document.getElementById('geo-status');
const weatherTempEl = document.getElementById('weather-temp');
const weatherStatusEl = document.getElementById('weather-status');

// Pedometer UI Elements
const pedometerStepsEl = document.getElementById('pedometer-steps');
const pedometerStatusEl = document.getElementById('pedometer-status');


// History Page Elements
const noHistoryText = document.getElementById('noHistoryText');
const historyListContainer = document.getElementById('historyListContainer');
const historyDetailView = document.getElementById('historyDetailView');
const historyDetailTitle = document.getElementById('historyDetailTitle');
const backToHistoryListButton = document.getElementById('backToHistoryListButton');
const historyChartCanvas = document.getElementById('historyChart');
const historyPhotosContainer = document.getElementById('historyPhotosContainer');
const exportHistoryCSVButton = document.getElementById('exportHistoryCSVButton');
let historyChartInstance = null;

// Delete Dialog
const deleteConfirmDialog = document.getElementById('deleteConfirmDialog');
const confirmDeleteButton = document.getElementById('confirmDeleteButton');
const deleteDialogSessionInfo = document.getElementById('deleteDialogSessionInfo');
let sessionIdToDelete = null;

// --- Global State ---
let isRecording = false;
let currentRecordingData = [];
let currentRecordingPhotos = [];
let recordingIntervalId = null;
const RECORDING_INTERVAL_MS = 100;

let currentSensorValues = {
    timestamp: null,
    accelX: null, accelY: null, accelZ: null,
    orientAlpha: null, orientBeta: null, orientGamma: null,
    gyroAlpha: null, gyroBeta: null, gyroGamma: null,
    illuminance: null,
    decibels: null,
    latitude: null, longitude: null, gpsAccuracy: null, altitude: null, speed: null, heading: null,
    address: null, // For reverse geocoded address
    temperature_celsius: null,
    steps_interval: 0,
    photoTakenId: null
};

let allRecordedSessions = [];

// Audio Variables
let audioContext = null;
let analyserNode = null;
let microphoneStream = null;
let micPermissionGranted = false;

// Camera Variables
let cameraStream = null;
let cameraPermissionGranted = false;

// Geolocation Variables
let geolocationPermissionGranted = false;
let geoWatchId = null;
let lastWeatherFetchTime = 0;
const WEATHER_FETCH_INTERVAL_MS = 10 * 60 * 1000;
let lastFetchedAddressCoords = { lat: null, lon: null }; // For reverse geocoding frequency
let lastReverseGeocodeFetchTime = 0;
const REVERSE_GEOCODE_INTERVAL_MS = 15000; // Min 15s between reverse geocode calls
const REVERSE_GEOCODE_MIN_COORD_CHANGE = 0.0005; // Approx 50m latitude/longitude change

// Pedometer Variables
let currentSessionTotalSteps = 0;
let pedometer_last_accel_mag = 0;
let pedometer_trending_up = false;
let pedometer_last_step_time = 0;
const PEDOMETER_MAGNITUDE_HIGH_THRESHOLD = 11.5;
const PEDOMETER_MIN_TIME_BETWEEN_STEPS_MS = 280;


// --- Theme Switch Logic (same as before) ---
function applyTheme(theme) {
    body.dataset.theme = theme;
    localStorage.setItem('theme', theme);
    if (themeSwitch) {
        themeSwitch.selected = (theme === 'dark');
        themeSwitch.ariaLabel = theme === 'dark' ? 'ライトテーマに切り替え' : 'ダークテーマに切り替え';
    }
}
const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
const savedTheme = localStorage.getItem('theme');
const currentTheme = savedTheme || (prefersDarkScheme.matches ? 'dark' : 'light');
applyTheme(currentTheme);
prefersDarkScheme.addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
        applyTheme(e.matches ? 'dark' : 'light');
    }
});
if (themeSwitch) {
    themeSwitch.addEventListener('change', () => {
        applyTheme(themeSwitch.selected ? 'dark' : 'light');
    });
}

// --- Page Navigation Logic (same as before) ---
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active-page'));
    document.getElementById(pageId).classList.add('active-page');
    if (pageId === 'historyPage') {
        loadAndDisplayHistory();
    }
}
navRecordTab.addEventListener('click', () => showPage('recordPage'));
navHistoryTab.addEventListener('click', () => showPage('historyPage'));
navRecordTab.active = true;


// --- Sensor Permission and Initialization (same as before, with updates) ---
let motionPermissionGranted = false;
let orientationPermissionGranted = false;
let sensorsInitialized = false;
let anySensorSupported = false;

const needsExplicitPermission = (window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function') ||
                            (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') ||
                            (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) ||
                            (navigator.geolocation);

function updateRecordingButtonState() {
    if (!startRecordingIconButton) return;
    const permissionIconEl = sensorPermissionIconButton ? sensorPermissionIconButton.querySelector('md-icon') : null;

    const allCorePermissionsGranted = motionPermissionGranted && orientationPermissionGranted && micPermissionGranted && cameraPermissionGranted && geolocationPermissionGranted;
    const canRunWithoutExplicitRequestAPI = !needsExplicitPermission && anySensorSupported;

    if (needsExplicitPermission && !(motionPermissionGranted && orientationPermissionGranted && micPermissionGranted && cameraPermissionGranted && geolocationPermissionGranted) && sensorPermissionIconButton) {
        sensorPermissionIconButton.style.display = 'inline-flex';
        sensorPermissionIconButton.disabled = false;
        if (permissionIconEl) permissionIconEl.textContent = 'lock';
    } else if (sensorPermissionIconButton) {
        sensorPermissionIconButton.style.display = 'inline-flex';
        sensorPermissionIconButton.disabled = true;
        if (permissionIconEl) permissionIconEl.textContent = (allCorePermissionsGranted || anySensorSupported || canRunWithoutExplicitRequestAPI) ? 'lock_open' : 'lock';
    }

    const essentialSensorsReady = sensorsInitialized &&
                                  (anySensorSupported || motionPermissionGranted || orientationPermissionGranted || micPermissionGranted || geolocationPermissionGranted);

    startRecordingIconButton.disabled = !essentialSensorsReady || isRecording;
    stopRecordingIconButton.disabled = !essentialSensorsReady || !isRecording;
    downloadCSVIconButton.disabled = !essentialSensorsReady || isRecording || currentRecordingData.length === 0;
    takePictureButton.disabled = !cameraPermissionGranted || !cameraStream;

    if (isRecording) {
        recordingStatusEl.textContent = `記録中... (${currentRecordingData.length}件)`;
    } else if (currentRecordingData.length > 0) {
        recordingStatusEl.textContent = `記録停止。${currentRecordingData.length}件。CSVダウンロード可。`;
    } else if (essentialSensorsReady) {
        recordingStatusEl.textContent = "センサー監視中。記録を開始できます。";
    } else if (sensorsInitialized && !anySensorSupported && !allCorePermissionsGranted) {
        recordingStatusEl.textContent = "利用可能なセンサーがありません。";
    } else if (needsExplicitPermission && !allCorePermissionsGranted) {
        let missingPerms = [];
        if (!motionPermissionGranted && (window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function') ) missingPerms.push("動作");
        if (!orientationPermissionGranted && (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') ) missingPerms.push("向き");
        if (!micPermissionGranted && (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) ) missingPerms.push("マイク");
        if (!cameraPermissionGranted && (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) ) missingPerms.push("カメラ");
        if (!geolocationPermissionGranted && navigator.geolocation) missingPerms.push("位置情報");
        if (missingPerms.length > 0) {
            recordingStatusEl.textContent = `左のアイコンから${missingPerms.join('/')}アクセスを許可してください。`;
        } else {
             recordingStatusEl.textContent = "センサー準備中または利用不可。"; // Fallback if no specific permission is obviously missing from the list
        }
    } else {
        recordingStatusEl.textContent = "センサー準備中または利用不可。";
    }
}

async function initializeSensors() {
    if (sensorsInitialized) return;

    if (motionPermissionGranted || (window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission !== 'function')) {
        window.addEventListener('devicemotion', handleMotionEvent, { passive: true });
        accelStatusEl.textContent = "監視中..."; gyroStatusEl.textContent = "監視中...";
        pedometerStatusEl.textContent = "監視中...";
        if(!motionPermissionGranted) motionPermissionGranted = true;
    } else if (!window.DeviceMotionEvent) {
        accelStatusEl.textContent = '加速度センサー非対応'; accelStatusEl.classList.add('not-supported');
        gyroStatusEl.textContent = 'ジャイロスコープ非対応'; gyroStatusEl.classList.add('not-supported');
        pedometerStatusEl.textContent = '加速度センサー非対応'; pedometerStatusEl.classList.add('not-supported');
    } else { // Needs permission
         accelStatusEl.textContent = "アイコンから許可"; gyroStatusEl.textContent = "アイコンから許可";
         pedometerStatusEl.textContent = "アイコンから許可";
    }

    if (orientationPermissionGranted || (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission !== 'function')) {
        window.addEventListener('deviceorientation', handleOrientationEvent, { passive: true });
        orientStatusEl.textContent = "監視中...";
        if(!orientationPermissionGranted) orientationPermissionGranted = true;
    } else if(!window.DeviceOrientationEvent) {
        orientStatusEl.textContent = '向きセンサー非対応'; orientStatusEl.classList.add('not-supported');
    } else { // Needs permission
         orientStatusEl.textContent = "アイコンから許可";
    }

    initializeLightSensor();
    initializeMicrophone();
    initializeCamera();
    initializeGeolocation();

    sensorsInitialized = true;
    updateRecordingButtonState();
}

async function requestAllPermissions() {
    const promises = [];
    if (window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function' && !motionPermissionGranted) {
        promises.push(
            DeviceMotionEvent.requestPermission().then(state => {
                if (state === 'granted') motionPermissionGranted = true;
                else { accelStatusEl.textContent = '加速度アクセス拒否'; gyroStatusEl.textContent = 'ジャイロアクセス拒否'; pedometerStatusEl.textContent = '加速度アクセス拒否';}
            }).catch(err => { console.error("Motion Err:", err); accelStatusEl.textContent = '加速度エラー'; gyroStatusEl.textContent = 'ジャイロエラー'; pedometerStatusEl.textContent = '加速度エラー';})
        );
    }
    if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function' && !orientationPermissionGranted) {
        promises.push(
            DeviceOrientationEvent.requestPermission().then(state => {
                if (state === 'granted') orientationPermissionGranted = true;
                else { orientStatusEl.textContent = '向きアクセス拒否'; }
            }).catch(err => { console.error("Orientation Err:", err); orientStatusEl.textContent = '向きエラー';})
        );
    }

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        // Initialize Mic & Camera will handle prompting if not granted
        if (!micPermissionGranted) promises.push(initializeMicrophone(true));
        if (!cameraPermissionGranted) promises.push(initializeCamera(true));
    }

    if (navigator.geolocation && !geolocationPermissionGranted) {
         // Initialize Geolocation will handle prompting if not granted
        promises.push(initializeGeolocation(true));
    }

    if (promises.length > 0) {
        await Promise.allSettled(promises);
    }
    initializeSensors(); // Re-run initialization to start listeners for newly granted sensors
}

if (needsExplicitPermission) {
    if (sensorPermissionIconButton) {
        sensorPermissionIconButton.addEventListener('click', requestAllPermissions);
    }
     accelStatusEl.textContent = "アイコンから許可"; gyroStatusEl.textContent = "アイコンから許可";
     orientStatusEl.textContent = "アイコンから許可"; micStatusEl.textContent = "アイコンから許可";
     cameraStatusEl.textContent = "アイコンから許可"; geoStatusEl.textContent = "アイコンから許可";
     pedometerStatusEl.textContent = "アイコンから許可";
     geoAddressStatusEl.textContent = "GPS許可後";
} else {
    if(sensorPermissionIconButton) sensorPermissionIconButton.style.display = 'none';
    motionPermissionGranted = !!window.DeviceMotionEvent;
    orientationPermissionGranted = !!window.DeviceOrientationEvent;
    initializeSensors(); // Initialize directly if no explicit permission needed or already granted
}


// --- Sensor Event Handlers (motion, orientation, light, mic, camera same as before) ---
function handleMotionEvent(event) {
    if (!motionPermissionGranted && !(window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission !== 'function')) return;
    anySensorSupported = true;
    let currentAccelX = null, currentAccelY = null, currentAccelZ = null;

    if (event.accelerationIncludingGravity) {
        const { x, y, z } = event.accelerationIncludingGravity;
        currentSensorValues.accelX = x; currentSensorValues.accelY = y; currentSensorValues.accelZ = z;
        currentAccelX = x; currentAccelY = y; currentAccelZ = z;
        accelXEl.textContent = x ? x.toFixed(2) : '-'; accelYEl.textContent = y ? y.toFixed(2) : '-'; accelZEl.textContent = z ? z.toFixed(2) : '-';
        requestAnimationFrame(() => {
            accelBarX.style.height = `${Math.min(100, (Math.abs(x || 0) / BAR_MAX_ACCEL) * 100)}%`;
            accelBarY.style.height = `${Math.min(100, (Math.abs(y || 0) / BAR_MAX_ACCEL) * 100)}%`;
            accelBarZ.style.height = `${Math.min(100, (Math.abs(z || 0) / BAR_MAX_ACCEL) * 100)}%`;
        });
        if (accelStatusEl.textContent !== "監視中...") accelStatusEl.textContent = "監視中...";
    }
    if (event.rotationRate) {
        const { alpha, beta, gamma } = event.rotationRate;
        currentSensorValues.gyroAlpha = alpha; currentSensorValues.gyroBeta = beta; currentSensorValues.gyroGamma = gamma;
        gyroAlphaEl.textContent = alpha ? alpha.toFixed(2) : '-'; gyroBetaEl.textContent = beta ? beta.toFixed(2) : '-'; gyroGammaEl.textContent = gamma ? gamma.toFixed(2) : '-';
         if (gyroStatusEl.textContent !== "監視中...") gyroStatusEl.textContent = "監視中...";
    }


    if (currentAccelX !== null && currentAccelY !== null && currentAccelZ !== null) {
        const mag = Math.sqrt(currentAccelX**2 + currentAccelY**2 + currentAccelZ**2);
        currentSensorValues.steps_interval = 0;

        if (isRecording) {
            const now = Date.now();
            if (mag > pedometer_last_accel_mag) {
                pedometer_trending_up = true;
            } else if (mag < pedometer_last_accel_mag && pedometer_trending_up) {
                if (pedometer_last_accel_mag > PEDOMETER_MAGNITUDE_HIGH_THRESHOLD &&
                    (now - pedometer_last_step_time) > PEDOMETER_MIN_TIME_BETWEEN_STEPS_MS) {
                    currentSessionTotalSteps++;
                    currentSensorValues.steps_interval = 1;
                    pedometer_last_step_time = now;
                    if (pedometerStepsEl) pedometerStepsEl.textContent = currentSessionTotalSteps;
                }
                pedometer_trending_up = false;
            }
            pedometer_last_accel_mag = mag;
        }
        if (pedometerStatusEl.textContent !== "監視中...") pedometerStatusEl.textContent = "監視中...";
    } else if (motionPermissionGranted && pedometerStatusEl.textContent === "監視中..." && !event.accelerationIncludingGravity) {
         pedometerStatusEl.textContent = "加速度データなし";
    }
     updateRecordingButtonState(); // Update button state based on sensor readiness
}
function handleOrientationEvent(event) {
    if (!orientationPermissionGranted && !(window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission !== 'function')) return;
    anySensorSupported = true;
    const { alpha, beta, gamma } = event;
    currentSensorValues.orientAlpha = alpha; currentSensorValues.orientBeta = beta; currentSensorValues.orientGamma = gamma;
    orientAlphaEl.textContent = alpha ? alpha.toFixed(1) : '-'; orientBetaEl.textContent = beta ? beta.toFixed(1) : '-'; orientGammaEl.textContent = gamma ? gamma.toFixed(1) : '-';
    if (beta !== null && gamma !== null && alpha !== null) {
        requestAnimationFrame(() => {
             // Adjust orientation values for more intuitive cube rotation relative to screen
             // Beta: pitch (X-axis) -> maps to rotateX
             // Gamma: roll (Y-axis) -> maps to rotateY
             // Alpha: yaw (Z-axis) -> maps to rotateZ (compensating for coordinate system differences)
             const zRot = alpha !== null ? 360 - alpha : 0; // Adjust Z-axis rotation direction if needed
             const xRot = beta !== null ? beta : 0;
             const yRot = gamma !== null ? -gamma : 0; // Adjust Y-axis rotation direction if needed

            orientationCube.style.transform = `rotateX(${xRot.toFixed(1)}deg) rotateY(${yRot.toFixed(1)}deg) rotateZ(${zRot.toFixed(1)}deg)`;
        });
    }
    if (orientStatusEl.textContent !== "監視中...") orientStatusEl.textContent = "監視中...";
    updateRecordingButtonState(); // Update button state based on sensor readiness
}
function initializeLightSensor() {
    if (!('AmbientLightSensor' in window)) {
        lightStatusEl.textContent = '光センサー API 非対応'; lightStatusEl.classList.add('not-supported');
        currentSensorValues.illuminance = null; updateRecordingButtonState(); return;
    }
    lightStatusEl.textContent = "アクセス許可待機中...";
    const startSensor = () => {
        try {
            const sensor = new AmbientLightSensor({ frequency: 1 });
            sensor.addEventListener('reading', () => {
                anySensorSupported = true;
                const illuminance = sensor.illuminance;
                currentSensorValues.illuminance = illuminance;
                lightValueEl.textContent = illuminance ? illuminance.toFixed(0) : '-';
                lightStatusEl.textContent = "監視中..."; lightStatusEl.classList.remove('error', 'not-supported');
                if (illuminance === null || typeof illuminance === 'undefined') {}
                else if (illuminance > 100) { lightIconSun.style.display = 'inline-block'; lightIconMoon.style.display = 'none'; }
                else if (illuminance < 10) { lightIconSun.style.display = 'none'; lightIconMoon.style.display = 'inline-block'; }
                else { lightIconSun.style.display = 'none'; lightIconMoon.style.display = 'none'; }
                updateRecordingButtonState();
            });
            sensor.addEventListener('error', event => {
                console.error('Light sensor error:', event.error.name, event.error.message);
                lightStatusEl.textContent = `光センサーエラー: ${event.error.name}`; lightStatusEl.classList.add('error');
                currentSensorValues.illuminance = null; updateRecordingButtonState();
            });
            sensor.start();
        } catch (error) {
            console.error('Failed to start light sensor:', error);
            lightStatusEl.textContent = `光センサー開始失敗: ${error.name}`; lightStatusEl.classList.add('error');
            currentSensorValues.illuminance = null; updateRecordingButtonState();
        }
    };
    if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: 'ambient-light-sensor' })
            .then(permissionStatus => {
                if (permissionStatus.state === 'granted') startSensor();
                else if (permissionStatus.state === 'prompt') lightStatusEl.textContent = '光センサー: ブラウザが許可を求めています。';
                else { lightStatusEl.textContent = '光センサーアクセス拒否'; lightStatusEl.classList.add('error'); }
                permissionStatus.onchange = () => { if (permissionStatus.state === 'granted') startSensor(); else if (permissionStatus.state !== 'prompt') { lightStatusEl.textContent = '光センサーアクセス拒否'; lightStatusEl.classList.add('error');} updateRecordingButtonState(); };
                if (permissionStatus.state !== 'granted') updateRecordingButtonState();
            })
            .catch(e => { console.warn("Ambient Light Sensor permission query failed, attempting to start directly.", e); startSensor(); });
    } else { startSensor(); }
}
async function initializeMicrophone(forcePermissionRequest = false) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        micStatusEl.textContent = 'マイク API 非対応'; micStatusEl.classList.add('not-supported');
        micPermissionGranted = false; updateRecordingButtonState(); return Promise.resolve();
    }
    if (microphoneStream && !forcePermissionRequest) return Promise.resolve();

    micStatusEl.textContent = "マイクアクセス許可待機中...";
    try {
        microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        micPermissionGranted = true; anySensorSupported = true;
        micStatusEl.textContent = "監視中..."; micStatusEl.classList.remove('error', 'not-supported');
        audioContext = new (window.AudioContext || window.webkitAudioContext)();

        if (audioContext.state === 'suspended') {
            await audioContext.resume().catch(e => console.error("[Mic] Error resuming AudioContext on init:", e));
        }

        analyserNode = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(microphoneStream);
        source.connect(analyserNode);
        analyserNode.fftSize = 256;
        const bufferLength = analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        function getDecibels() {
            if (!micPermissionGranted || !analyserNode || !audioContext || audioContext.state === 'closed') { // Check closed state too
                currentSensorValues.decibels = null; micDbfsEl.textContent = "-"; micLevelBar.style.width = `0%`; return;
            }
            if (audioContext.state === 'suspended') {
                audioContext.resume().then(() => { if (audioContext.state === 'running') requestAnimationFrame(getDecibels); })
                                   .catch(e => console.error("[Mic] Error resuming AudioContext in getDecibels:", e));
                return;
            }

            analyserNode.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
            let average = sum / bufferLength;
            // Convert average (0-255) to a pseudo dBFS scale (-60 to 0 or slightly above)
            // This is a simplification; true dBFS requires RMS calculation.
            // Using a logarithmic scale approximation might be better, but this linear one matches the bar.
            // Let's map 0-255 to roughly -60dB to 0dB or higher if clipping.
            let pseudoDbFs;
            if (average === 0) {
                 pseudoDbFs = -Infinity;
            } else {
                // A simple power-law approximation or look-up table would be more accurate.
                // Let's use a log scale mapping roughly: 1 -> -40dB, 10 -> -20dB, 100 -> 0dB
                // This is still not accurate dBFS but better than linear for perception.
                 const normalized = average / 255.0; // Normalize 0-1
                 pseudoDbFs = 20 * Math.log10(normalized); // dB relative to max (approx 0 dBFS)
                 pseudoDbFs = Math.max(-60, pseudoDbFs); // Clamp minimum displayed dBFS
            }


            currentSensorValues.decibels = pseudoDbFs;
            micDbfsEl.textContent = isFinite(pseudoDbFs) ? pseudoDbFs.toFixed(1) : '-∞';

             // Bar level based on the 0-255 average, but map it visually
            let levelPercent = Math.min(100, Math.max(0, (average / 150) * 100)); // Map 0-150 to 0-100% for bar
            micLevelBar.style.width = `${levelPercent}%`;
            micLevelBar.style.backgroundColor = (isFinite(pseudoDbFs) && pseudoDbFs > -20) ? 'var(--md-sys-color-error)' : ((isFinite(pseudoDbFs) && pseudoDbFs > -40) ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-secondary-container)');


            if (audioContext.state === 'running') requestAnimationFrame(getDecibels);
        }
        if (audioContext.state === 'running') requestAnimationFrame(getDecibels);
        updateRecordingButtonState();
        return Promise.resolve();
    } catch (err) {
        console.error("[Mic] Microphone access error:", err);
         // Check if the error is a permission denied error specifically
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
           micStatusEl.textContent = 'マイクアクセス拒否';
        } else {
           micStatusEl.textContent = `マイクエラー: ${err.name}`;
        }
        micStatusEl.classList.add('error');
        micPermissionGranted = false; updateRecordingButtonState(); return Promise.reject(err);
    }
}
async function initializeCamera(forcePermissionRequest = false) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        cameraStatusEl.textContent = 'カメラ API 非対応'; cameraStatusEl.classList.add('not-supported');
        cameraPermissionGranted = false; updateRecordingButtonState(); return Promise.resolve();
    }
    // If stream exists and no force request, return existing stream
    if (cameraStream && !forcePermissionRequest) {
         cameraStatusEl.textContent = "カメラ準備完了。撮影できます。"; cameraStatusEl.classList.remove('error', 'not-supported');
         cameraPreview.srcObject = cameraStream;
         cameraPreview.style.display = 'block';
         updateRecordingButtonState();
         return Promise.resolve();
    }
     // Stop existing stream if forcing a new request
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
        cameraPreview.srcObject = null;
         cameraPreview.style.display = 'none';
         cameraPermissionGranted = false;
    }


    cameraStatusEl.textContent = "カメラアクセス許可待機中...";
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        cameraPermissionGranted = true; anySensorSupported = true;
        cameraStatusEl.textContent = "カメラ準備完了。撮影できます。"; cameraStatusEl.classList.remove('error', 'not-supported');
        cameraPreview.srcObject = cameraStream;
        cameraPreview.style.display = 'block';
        updateRecordingButtonState();
        return Promise.resolve();
    } catch (err) {
        console.error("Camera access error:", err);
         // Check if the error is a permission denied error specifically
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
           cameraStatusEl.textContent = 'カメラアクセス拒否';
        } else {
           cameraStatusEl.textContent = `カメラエラー: ${err.name}`;
        }
        cameraStatusEl.classList.add('error');
        cameraPreview.style.display = 'none';
        cameraPermissionGranted = false;
        updateRecordingButtonState();
        return Promise.reject(err);
    }
}
takePictureButton.addEventListener('click', () => {
    if (!cameraStream || !cameraPermissionGranted) {
        alert("カメラが利用できません。"); return;
    }
    const videoTracks = cameraStream.getVideoTracks();
    if (videoTracks.length === 0 || !videoTracks[0].enabled) {
         alert("有効なビデオトラックがありません。カメラがオフになっているか、エラーが発生しています。");
         console.error("No enabled video tracks found.");
         return;
    }
    const trackSettings = videoTracks[0].getSettings();
    // Ensure canvas dimensions match video feed for correct aspect ratio
    photoCanvas.width = trackSettings.width || cameraPreview.videoWidth;
    photoCanvas.height = trackSettings.height || cameraPreview.videoHeight;

    const context = photoCanvas.getContext('2d');
    // Draw the current frame from the video element
    context.drawImage(cameraPreview, 0, 0, photoCanvas.width, photoCanvas.height);
    const dataUrl = photoCanvas.toDataURL('image/jpeg', 0.8);

    const photoTimestamp = Date.now();
    currentRecordingPhotos.push({ timestamp: photoTimestamp, dataUrl: dataUrl });

    lastPhotoPreviewContainer.innerHTML = `<img src="${dataUrl}" alt="撮影した写真" style="max-width:100px; max-height:100px; border:1px solid var(--md-sys-color-outline); border-radius:4px;"> <p style="font-size:0.7em; color: var(--md-sys-color-secondary);">${new Date(photoTimestamp).toLocaleTimeString()}に撮影</p>`;

    if (isRecording) currentSensorValues.photoTakenId = photoTimestamp;
    cameraStatusEl.textContent = `${new Date(photoTimestamp).toLocaleTimeString()} に写真を撮影しました。`;
});


// --- Geolocation, Reverse Geocoding & Weather Logic ---
async function initializeGeolocation(forcePermissionRequest = false) {
    if (!('geolocation' in navigator)) {
        geoStatusEl.textContent = '位置情報 API 非対応'; geoStatusEl.classList.add('not-supported');
        geoAddressStatusEl.textContent = '位置情報 API 非対応';
        return Promise.resolve();
    }

    const handlePosition = (position) => {
        geolocationPermissionGranted = true; anySensorSupported = true;
        geoStatusEl.textContent = "監視中..."; geoStatusEl.classList.remove('error', 'not-supported');

        const { latitude, longitude, accuracy, altitude, speed, heading } = position.coords;
        currentSensorValues.latitude = latitude;
        currentSensorValues.longitude = longitude;
        currentSensorValues.gpsAccuracy = accuracy;
        currentSensorValues.altitude = altitude;
        currentSensorValues.speed = speed;
        currentSensorValues.heading = heading;

        geoLatEl.textContent = latitude !== null ? latitude.toFixed(5) : '-';
        geoLonEl.textContent = longitude !== null ? longitude.toFixed(5) : '-';
        geoAccEl.textContent = accuracy !== null ? accuracy.toFixed(1) : '-';
        geoAltEl.textContent = altitude !== null ? altitude.toFixed(1) : '-';
        geoSpeedEl.textContent = speed !== null ? speed.toFixed(1) : '-';
        geoHeadEl.textContent = heading !== null ? heading.toFixed(1) : '-';

        // Fetch reverse geocode and weather if new significant position
        const now = Date.now();
        const ScoordLatChanged = Math.abs(latitude - (lastFetchedAddressCoords.lat || 0)) > REVERSE_GEOCODE_MIN_COORD_CHANGE;
        const ScoordLonChanged = Math.abs(longitude - (lastFetchedAddressCoords.lon || 0)) > REVERSE_GEOCODE_MIN_COORD_CHANGE;

        if (latitude !== null && longitude !== null) {
            if ((ScoordLatChanged || ScoordLonChanged || currentSensorValues.address === null) && // Also refetch if address was previously null
                (now - lastReverseGeocodeFetchTime > REVERSE_GEOCODE_INTERVAL_MS)) {
                fetchReverseGeocode(latitude, longitude);
                lastFetchedAddressCoords = { lat: latitude, lon: longitude };
                lastReverseGeocodeFetchTime = now;
            }
            fetchWeatherData(latitude, longitude); // Weather can be fetched more often if needed (throttled internally)
        }
        updateRecordingButtonState();
    };

    const handleError = (error) => {
        console.error('Geolocation error:', error);
        let message = 'GPSエラー';
        if (error.code === 1) message = 'GPSアクセス拒否';
        else if (error.code === 2) message = 'GPS位置取得不能';
        else if (error.code === 3) message = 'GPSタイムアウト';
        geoStatusEl.textContent = message; geoStatusEl.classList.add('error');
         // Keep previous address/weather if available, just update status
        geoAddressStatusEl.textContent = message;
        geolocationPermissionGranted = false;
         // Do NOT clear lat/lon in currentSensorValues on error, keep last known good.
         // Only clear if it was null before the error.
         if(currentSensorValues.latitude === null) geoLatEl.textContent = '-';
         if(currentSensorValues.longitude === null) geoLonEl.textContent = '-';
         geoAccEl.textContent = '-';
         geoAltEl.textContent = '-';
         geoSpeedEl.textContent = '-';
         geoHeadEl.textContent = '-';

        updateRecordingButtonState();
    };

    if (forcePermissionRequest || !geolocationPermissionGranted) {
         // Request permission via getCurrentPosition first as it often triggers the OS prompt
         geoStatusEl.textContent = "GPSアクセス許可待機中...";
         geoAddressStatusEl.textContent = "GPSアクセス許可待機中...";
         return new Promise((resolve, reject) => {
             navigator.geolocation.getCurrentPosition(
                 (position) => {
                     // Got permission, now start watching
                     handlePosition(position);
                     if (geoWatchId) navigator.geolocation.clearWatch(geoWatchId); // Clear any old watches
                     geoWatchId = navigator.geolocation.watchPosition(handlePosition, handleError, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
                     resolve();
                 },
                 (error) => {
                     // Permission denied or other error
                     handleError(error);
                     reject(error);
                 },
                 { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 } // Use longer timeout for initial get
             );
         });
    } else if (geolocationPermissionGranted && !geoWatchId) {
         // Permission already granted, just start watching if not already
         geoWatchId = navigator.geolocation.watchPosition(handlePosition, handleError, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
         // Also fetch current position immediately if watch takes time
         navigator.geolocation.getCurrentPosition(handlePosition, handleError, { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 });
    }
    return Promise.resolve(); // Return resolved promise if already watching
}


async function fetchReverseGeocode(latitude, longitude) {
    if (latitude === null || longitude === null) return;
    geoAddressStatusEl.textContent = "住所情報取得中...";
    geoAddressEl.textContent = "-"; // Clear previous address while fetching
    currentSensorValues.address = null;
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=ja,en`;
        console.log("Requesting RevGeo:", url);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Nominatim API error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        console.log("RevGeo Data:", data);
        if (data && data.display_name) {
            currentSensorValues.address = data.display_name;
            geoAddressEl.textContent = data.display_name;
            geoAddressStatusEl.textContent = `最終更新: ${new Date().toLocaleTimeString()}`;
        } else {
            geoAddressEl.textContent = "取得失敗";
            geoAddressStatusEl.textContent = "住所情報なし";
            currentSensorValues.address = null;
        }
    } catch (error) {
        console.error("Failed to fetch reverse geocode data:", error);
        geoAddressEl.textContent = "取得エラー";
        geoAddressStatusEl.textContent = "住所情報取得エラー";
        currentSensorValues.address = null;
    }
}

async function fetchWeatherData(latitude, longitude) {
    if (latitude === null || longitude === null) return;
    updateSensorStatus(weatherStatusEl, "天気情報取得中...");
    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude.toFixed(4)}&longitude=${longitude.toFixed(4)}¤t_weather=true&timezone=auto`;
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`Weather API error: ${response.status}`);
        const data = await response.json();
        if (data && data.current_weather && typeof data.current_weather.temperature !== 'undefined') {
            currentSensorValues.temperature_celsius = data.current_weather.temperature;
            const tempStr = data.current_weather.temperature.toFixed(1);
            if(weatherTempEl) weatherTempEl.textContent = tempStr;
            if(weatherTempDetailEl) weatherTempDetailEl.textContent = tempStr;
            lastWeatherFetchTime = Date.now();
            updateSensorStatus(weatherStatusEl, `最終更新: ${new Date(lastWeatherFetchTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
        } else {
            updateSensorStatus(weatherStatusEl, "天気データなし");
        }
    } catch (error) {
        console.error("Failed to fetch weather data:", error);
        updateSensorStatus(weatherStatusEl, "天気情報取得失敗", "error");
    }
}



// --- Recording Logic (startRecording updates, others same) ---
function recordCurrentData() {
    if (!isRecording) return;
    const now = Date.now();
    // Create a clean snapshot, not referencing the global mutable object directly
    let dataToRecord = {
        timestamp: now,
        accelX: currentSensorValues.accelX,
        accelY: currentSensorValues.accelY,
        accelZ: currentSensorValues.accelZ,
        orientAlpha: currentSensorValues.orientAlpha,
        orientBeta: currentSensorValues.orientBeta,
        orientGamma: currentSensorValues.orientGamma,
        gyroAlpha: currentSensorValues.gyroAlpha,
        gyroBeta: currentSensorValues.gyroBeta,
        gyroGamma: currentSensorValues.gyroGamma,
        illuminance: currentSensorValues.illuminance,
        decibels: currentSensorValues.decibels,
        latitude: currentSensorValues.latitude,
        longitude: currentSensorValues.longitude,
        gpsAccuracy: currentSensorValues.gpsAccuracy,
        altitude: currentSensorValues.altitude,
        speed: currentSensorValues.speed,
        heading: currentSensorValues.heading,
         // Address is not typically recorded per interval, but temperature is
        temperature_celsius: currentSensorValues.temperature_celsius,
        steps_interval: currentSensorValues.steps_interval, // This resets after recording
        photoTakenId: currentSensorValues.photoTakenId // This resets after recording
    };

    currentRecordingData.push(dataToRecord);

    // Reset interval-specific values after recording them
    currentSensorValues.photoTakenId = null;
    currentSensorValues.steps_interval = 0;

    if (currentRecordingData.length % 10 === 0) {
        recordingStatusEl.textContent = `記録中... (${currentRecordingData.length}件)`;
    }
}

function startRecording() {
    if (!sensorsInitialized || (!anySensorSupported && !motionPermissionGranted && !orientationPermissionGranted && !micPermissionGranted && !geolocationPermissionGranted)) {
         // Check if the sensorPermissionIconButton is visible and enabled, suggesting permissions are needed
         if (sensorPermissionIconButton && !sensorPermissionIconButton.disabled) {
              alert("センサー利用の許可が必要です。左のアイコンをタップして許可してください。");
         } else {
             alert("利用可能なセンサーがないか、センサーの初期化に失敗しました。");
         }
        return;
    }
    isRecording = true;
    currentRecordingData = [];
    currentRecordingPhotos = [];
    lastPhotoPreviewContainer.innerHTML = "";

    currentSessionTotalSteps = 0;
    pedometerStepsEl.textContent = '0';
    pedometer_last_accel_mag = 0;
    pedometer_trending_up = false;
    pedometer_last_step_time = 0;

    // Weather and address are fetched/updated by their respective mechanisms if GPS is available
    // No need to explicitly reset currentSensorValues.address or temperature here,
    // as they reflect the latest fetched values.
    lastWeatherFetchTime = 0; // Allow immediate weather fetch if GPS is good
    if (currentSensorValues.latitude !== null && currentSensorValues.longitude !== null) {
        fetchWeatherData(currentSensorValues.latitude, currentSensorValues.longitude);
        // Reverse geocode might also be triggered by handlePosition if conditions met
    } else if(geolocationPermissionGranted) {
         weatherStatusEl.textContent = "GPS位置情報取得後に更新";
         geoAddressStatusEl.textContent = "GPS位置情報取得後に更新";
         weatherTempEl.textContent = "-";
         geoAddressEl.textContent = "-";
    } else {
         weatherStatusEl.textContent = "GPSアクセスが必要です";
         geoAddressStatusEl.textContent = "GPSアクセスが必要です";
         weatherTempEl.textContent = "-";
         geoAddressEl.textContent = "-";
    }


    if (recordingIntervalId) clearInterval(recordingIntervalId);
    recordingIntervalId = setInterval(recordCurrentData, RECORDING_INTERVAL_MS);
    updateRecordingButtonState();
    // downloadCSVIconButton.disabled is handled by updateRecordingButtonState
}

function stopRecording() {
    isRecording = false;
    if (recordingIntervalId) {
        clearInterval(recordingIntervalId);
        recordingIntervalId = null;
    }

    if (currentRecordingData.length > 0) {
         // Filter out initial null/zero values if needed before saving, but probably better to keep raw data
        const session = {
            id: Date.now(),
            startTime: currentRecordingData[0].timestamp,
            endTime: currentRecordingData[currentRecordingData.length - 1].timestamp,
            data: [...currentRecordingData], // Store a copy
            photos: [...currentRecordingPhotos], // Store a copy
            totalSteps: currentSessionTotalSteps
        };
        allRecordedSessions.push(session);
        saveHistoryToLocalStorage();
        recordingStatusEl.textContent = `記録を停止しました。${currentRecordingData.length}件のデータを記録。履歴に追加されました。`;
    } else {
        recordingStatusEl.textContent = `記録を停止しました。データはありませんでした。`;
    }
    updateRecordingButtonState();
}

function downloadCSV(dataToExport, filenamePrefix = "sensor_data_current") {
    if (!dataToExport || dataToExport.length === 0) {
        alert("記録データがありません。");
        return;
    }
    // CSV Header now includes temperature and steps_in_interval. Address is not included in CSV.
    const header = "timestamp,accelX,accelY,accelZ,orientAlpha,orientBeta,orientGamma,gyroAlpha,gyroBeta,gyroGamma,illuminance,decibels,latitude,longitude,gpsAccuracy,altitude,speed,heading,temperature_celsius,steps_in_interval,photoTakenId";
    const rows = dataToExport.map(row => {
        // Ensure photoTakenId is only included if it was actually set for that timestamp interval
         const photoId = row.photoTakenId ? row.photoTakenId : ''; // Output empty string if null/undefined

        return [
            row.timestamp,
            row.accelX !== null ? row.accelX.toFixed(3) : '',
            row.accelY !== null ? row.accelY.toFixed(3) : '',
            row.accelZ !== null ? row.accelZ.toFixed(3) : '',
            row.orientAlpha !== null ? row.orientAlpha.toFixed(2) : '',
            row.orientBeta !== null ? row.orientBeta.toFixed(2) : '',
            row.orientGamma !== null ? row.orientGamma.toFixed(2) : '',
            row.gyroAlpha !== null ? row.gyroAlpha.toFixed(3) : '',
            row.gyroBeta !== null ? row.gyroBeta.toFixed(3) : '',
            row.gyroGamma !== null ? row.gyroGamma.toFixed(3) : '',
            row.illuminance !== null ? row.illuminance.toFixed(0) : '',
            row.decibels !== null && isFinite(row.decibels) ? row.decibels.toFixed(1) : '',
            row.latitude !== null ? row.latitude.toFixed(6) : '',
            row.longitude !== null ? row.longitude.toFixed(6) : '',
            row.gpsAccuracy !== null ? row.gpsAccuracy.toFixed(1) : '',
            row.altitude !== null ? row.altitude.toFixed(1) : '',
            row.speed !== null ? row.speed.toFixed(2) : '',
            row.heading !== null ? row.heading.toFixed(1) : '',
            row.temperature_celsius !== null ? row.temperature_celsius.toFixed(1) : '',
            row.steps_interval !== null ? row.steps_interval : '0', // Ensure 0 if null
            photoId
        ].join(',');
    });

    const csvContent = header + "\n" + rows.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    const now = new Date(dataToExport[0].timestamp);
    const timestampStr = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}${now.getSeconds().toString().padStart(2,'0')}`;
    link.setAttribute("href", url);
    link.setAttribute("download", `${filenamePrefix}_${timestampStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    if (filenamePrefix === "sensor_data_current") {
        recordingStatusEl.textContent = `CSVファイルをダウンロードしました。 (${dataToExport.length}件)`;
    }
}
if(startRecordingIconButton) startRecordingIconButton.addEventListener('click', startRecording);
if(stopRecordingIconButton) stopRecordingIconButton.addEventListener('click', stopRecording);
if(downloadCSVIconButton) downloadCSVIconButton.addEventListener('click', () => downloadCSV(currentRecordingData, "sensor_data_current"));

// --- History Logic (same as before for save/load/delete, display updated) ---
const HISTORY_STORAGE_KEY = 'sensorDemoProHistory_v2';

function saveHistoryToLocalStorage() {
    try {
         // Only save essential data to avoid bloating storage with Data URLs if not needed on history page
         const simplifiedSessions = allRecordedSessions.map(session => ({
              id: session.id,
              startTime: session.startTime,
              endTime: session.endTime,
              data: session.data, // Keep sensor data
              photos: session.photos.map(photo => ({ // Keep photo data URLs
                   timestamp: photo.timestamp,
                   dataUrl: photo.dataUrl
              })),
              totalSteps: session.totalSteps
         }));
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(simplifiedSessions));
    } catch (e) {
        console.error("Error saving history to localStorage:", e);
        // Check if error is due to QuotaExceededError
        if (e.name === 'QuotaExceededError') {
             alert("履歴の保存に失敗しました。ストレージ容量が不足しています。古い履歴を削除してください。");
        } else {
             alert("履歴の保存に失敗しました。");
        }
    }
}
function loadHistoryFromLocalStorage() {
    const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (storedHistory) {
        try {
            allRecordedSessions = JSON.parse(storedHistory);
            // Ensure photos array exists and totalSteps exists for older data
            allRecordedSessions.forEach(session => {
                if (!session.photos) session.photos = [];
                if (typeof session.totalSteps === 'undefined') session.totalSteps = 0;
                 // Ensure data array exists
                if (!session.data) session.data = [];
            });
        } catch (e) {
            console.error("Error parsing history from localStorage:", e);
            allRecordedSessions = []; // Clear history on parse error
             alert("履歴データの読み込みに失敗しました。履歴をクリアします。"); // Notify user
        }
    } else {
        allRecordedSessions = [];
    }
}

function displayHistoryList() {
    historyListContainer.innerHTML = '';
    historyDetailView.style.display = 'none';
    historyListContainer.style.display = 'block';

    if (allRecordedSessions.length === 0) {
        noHistoryText.style.display = 'block'; return;
    }
    noHistoryText.style.display = 'none';
    allRecordedSessions.sort((a, b) => b.id - a.id);

    allRecordedSessions.forEach(session => {
        const sessionCard = document.createElement('md-elevated-card');
        sessionCard.style.marginBottom = '12px';
         // Add a class for styling the card itself in history
         sessionCard.classList.add('history-card');
        const startTime = new Date(session.startTime);
        const durationMs = session.endTime - session.startTime;
        const durationSec = Math.floor(durationMs / 1000);
        const durationMin = Math.floor(durationSec / 60);
        const formattedStartTime = startTime.toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

        // Find the first recorded temperature value that is not null
        let firstTempEntry = session.data.find(d => d.temperature_celsius !== null && typeof d.temperature_celsius === 'number');
        let tempString = firstTempEntry ? `${firstTempEntry.temperature_celsius.toFixed(1)}°C` : "記録なし";


        let content = `
            <div style="padding: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <h4 style="margin-top:0; margin-bottom: 8px; font-size: 1.1em; flex-grow: 1;">記録: ${formattedStartTime}</h4>
                    <md-icon-button class="delete-session-button" data-session-id="${session.id}" aria-label="この記録を削除">
                        <md-icon>delete</md-icon>
                    </md-icon-button>
                </div>
                <p style="font-size: 0.9em; margin: 4px 0;">
                    <md-icon style="font-size: 1.1em; vertical-align: middle; margin-right: 4px;">timer</md-icon>
                    記録時間: ${durationMin}分 ${durationSec % 60}秒
                </p>
                <p style="font-size: 0.9em; margin: 4px 0;">
                    <md-icon style="font-size: 1.1em; vertical-align: middle; margin-right: 4px;">list_alt</md-icon>
                    データ点数: ${session.data.length}件
                </p>
                <p style="font-size: 0.9em; margin: 4px 0;">
                    <md-icon style="font-size: 1.1em; vertical-align: middle; margin-right: 4px;">photo_library</md-icon>
                    写真枚数: ${session.photos ? session.photos.length : 0}枚
                </p>
                <p style="font-size: 0.9em; margin: 4px 0;">
                    <md-icon style="font-size: 1.1em; vertical-align: middle; margin-right: 4px;">directions_walk</md-icon>
                    推定歩数: ${session.totalSteps || 0} 歩
                </p>
                 <p style="font-size: 0.9em; margin: 4px 0;">
                    <md-icon style="font-size: 1.1em; vertical-align: middle; margin-right: 4px;">thermostat</md-icon>
                    開始時気温 (目安): ${tempString}
                </p>
            </div>
        `;
        sessionCard.innerHTML = content;
        sessionCard.addEventListener('click', (event) => {
             // Only navigate if click is not on the delete button
            if (!event.target.closest('.delete-session-button')) displayHistoryDetail(session.id);
        });
        const deleteButton = sessionCard.querySelector('.delete-session-button');
        deleteButton.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent card click event
            promptDeleteSession(session.id, formattedStartTime);
        });
        historyListContainer.appendChild(sessionCard);
    });
}

function promptDeleteSession(sessionId, sessionStartTimeFormatted) {
    sessionIdToDelete = sessionId;
    deleteDialogSessionInfo.textContent = `記録日時: ${sessionStartTimeFormatted}`;
    deleteConfirmDialog.show();
}
async function deleteSession(sessionId) {
    allRecordedSessions = allRecordedSessions.filter(session => session.id !== sessionId);
    saveHistoryToLocalStorage();
    displayHistoryList(); // Re-render the list
     // If currently viewing the deleted session detail, go back to list view
    if (historyDetailView.style.display === 'block' && sessionIdToDelete === sessionId) {
         historyDetailView.style.display = 'none';
         historyListContainer.style.display = 'block';
    }
    sessionIdToDelete = null; // Reset delete state
}
confirmDeleteButton.addEventListener('click', () => {
     // Dialog closes automatically when button with form="dialog" is clicked
    if (sessionIdToDelete !== null) {
        // Give dialog a moment to potentially close before deleting? No, just delete directly.
        deleteSession(sessionIdToDelete);
    }
     // The closed event listener will handle resetting sessionIdToDelete
});
deleteConfirmDialog.addEventListener('closed', (event) => {
     // The deleteSession function already handles resetting sessionIdToDelete after deletion
     // Only reset here if dialog was cancelled or closed in some other way without deleting
    if (event.detail.action === 'cancel' || event.detail.action === 'close') {
         sessionIdToDelete = null;
    }
     // If action was 'delete', sessionIdToDelete is already handled by deleteSession
});

function displayHistoryDetail(sessionId) {
    const session = allRecordedSessions.find(s => s.id === sessionId);
    if (!session) {
        console.error("Session not found:", sessionId);
        displayHistoryList(); // Fallback to list if session not found
        return;
    }

    historyListContainer.style.display = 'none';
    historyDetailView.style.display = 'block';
    const startTime = new Date(session.startTime);
    const formattedStartTime = startTime.toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    historyDetailTitle.textContent = `記録詳細: ${formattedStartTime} (歩数: ${session.totalSteps || 0}歩)`;

    historyPhotosContainer.innerHTML = '';
    if (session.photos && session.photos.length > 0) {
        session.photos.forEach(photo => {
            const img = document.createElement('img');
            img.src = photo.dataUrl;
            img.alt = `Photo from ${new Date(photo.timestamp).toLocaleTimeString()}`;
            img.style.maxWidth = '100px'; img.style.maxHeight = '100px';
            img.style.borderRadius = '4px'; img.style.border = '1px solid var(--md-sys-color-outline)';
            // Optional: Add click handler to view full image
            img.style.cursor = 'pointer';
            img.onclick = () => { window.open(photo.dataUrl, '_blank'); };
            historyPhotosContainer.appendChild(img);
        });
    } else {
        historyPhotosContainer.innerHTML = '<p style="font-size:0.9em; color:var(--md-sys-color-on-surface-variant);">この記録中に撮影された写真はありません。</p>';
    }

    exportHistoryCSVButton.onclick = () => downloadCSV(session.data, `sensor_data_history_${session.id}`);

    if (historyChartInstance) historyChartInstance.destroy();
     // Ensure canvas exists and is in the DOM
    if (!historyChartCanvas) {
        console.error("History chart canvas element not found!");
        return;
    }
    const ctx = historyChartCanvas.getContext('2d');
     if (!ctx) {
        console.error("Could not get 2D context for history chart canvas!");
        return;
    }

    // Filter data to include only rows with actual sensor readings
    const dataPointsWithReadings = session.data.filter(d =>
         d.accelX !== null || d.accelY !== null || d.accelZ !== null ||
         d.orientAlpha !== null || d.orientBeta !== null || d.orientGamma !== null ||
         d.gyroAlpha !== null || d.gyroBeta !== null || d.gyroGamma !== null ||
         d.illuminance !== null || d.decibels !== null ||
         d.latitude !== null || d.longitude !== null || d.altitude !== null || d.speed !== null || d.heading !== null ||
         d.temperature_celsius !== null || d.steps_interval !== null || d.photoTakenId !== null
    );

    if (dataPointsWithReadings.length < 2) { // Chart needs at least 2 points to draw a line
         historyChartCanvas.style.display = 'none';
         // Display a message instead
         const noDataMessage = document.createElement('p');
         noDataMessage.textContent = "グラフ表示に必要なセンサーデータが不足しています。";
         noDataMessage.style.textAlign = 'center';
         noDataMessage.style.color = 'var(--md-sys-color-on-surface-variant)';
         historyChartCanvas.parentNode.insertBefore(noDataMessage, historyChartCanvas);
         return;
    } else {
         historyChartCanvas.style.display = 'block'; // Ensure canvas is visible if data exists
         // Remove any previous "no data" message
         const previousMessage = historyChartCanvas.previousElementSibling;
         if(previousMessage && previousMessage.textContent.includes("グラフ表示に必要なセンサーデータ")) {
             previousMessage.remove();
         }
    }


    const labels = dataPointsWithReadings.map(d => new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 1 }));

    const datasets = [];
    // Add datasets only if there's at least one non-null value for that sensor type in the filtered data
    if (dataPointsWithReadings.some(d => d.accelX !== null)) datasets.push({ label: 'Accel X', data: dataPointsWithReadings.map(d => d.accelX), borderColor: 'red', fill: false, tension: 0.1, hidden: true });
    if (dataPointsWithReadings.some(d => d.accelY !== null)) datasets.push({ label: 'Accel Y', data: dataPointsWithReadings.map(d => d.accelY), borderColor: 'green', fill: false, tension: 0.1, hidden: true });
    if (dataPointsWithReadings.some(d => d.accelZ !== null)) datasets.push({ label: 'Accel Z', data: dataPointsWithReadings.map(d => d.accelZ), borderColor: 'blue', fill: false, tension: 0.1 });
    if (dataPointsWithReadings.some(d => d.gyroAlpha !== null)) datasets.push({ label: 'Gyro Alpha (Z)', data: dataPointsWithReadings.map(d => d.gyroAlpha), borderColor: 'purple', fill: false, tension: 0.1, hidden: true });
     if (dataPointsWithReadings.some(d => d.gyroBeta !== null)) datasets.push({ label: 'Gyro Beta (X)', data: dataPointsWithReadings.map(d => d.gyroBeta), borderColor: 'orange', fill: false, tension: 0.1, hidden: true });
    if (dataPointsWithReadings.some(d => d.gyroGamma !== null)) datasets.push({ label: 'Gyro Gamma (Y)', data: dataPointsWithReadings.map(d => d.gyroGamma), borderColor: 'cyan', fill: false, tension: 0.1, hidden: true });
    if (dataPointsWithReadings.some(d => d.illuminance !== null)) datasets.push({ label: 'Illuminance (lux)', data: dataPointsWithReadings.map(d => d.illuminance), borderColor: 'teal', fill: false, tension: 0.1, yAxisID: 'yLux', hidden: true });
    if (dataPointsWithReadings.some(d => d.decibels !== null && isFinite(d.decibels))) datasets.push({ label: 'Decibels (dBFS)', data: dataPointsWithReadings.map(d => isFinite(d.decibels) ? d.decibels : null), borderColor: 'magenta', fill: false, tension: 0.1, yAxisID: 'yDb', hidden: false });
     if (dataPointsWithReadings.some(d => d.latitude !== null)) datasets.push({ label: 'Latitude', data: dataPointsWithReadings.map(d => d.latitude), borderColor: 'darkgreen', fill: false, tension: 0.1, yAxisID: 'yGeo', hidden: true });
     if (dataPointsWithReadings.some(d => d.longitude !== null)) datasets.push({ label: 'Longitude', data: dataPointsWithReadings.map(d => d.longitude), borderColor: 'darkblue', fill: false, tension: 0.1, yAxisID: 'yGeo', hidden: true });
     if (dataPointsWithReadings.some(d => d.gpsAccuracy !== null)) datasets.push({ label: 'GPS Accuracy (m)', data: dataPointsWithReadings.map(d => d.gpsAccuracy), borderColor: 'grey', fill: false, tension: 0.1, yAxisID: 'yAcc', hidden: true }); // Use different axis for accuracy
    if (dataPointsWithReadings.some(d => d.altitude !== null)) datasets.push({ label: 'Altitude (m)', data: dataPointsWithReadings.map(d => d.altitude), borderColor: 'brown', fill: false, tension: 0.1, yAxisID: 'yAlt', hidden: false });
     if (dataPointsWithReadings.some(d => d.speed !== null)) datasets.push({ label: 'Speed (m/s)', data: dataPointsWithReadings.map(d => d.speed), borderColor: 'navy', fill: false, tension: 0.1, yAxisID: 'ySpeed', hidden: true });
     if (dataPointsWithReadings.some(d => d.heading !== null)) datasets.push({ label: 'Heading (°)', data: dataPointsWithReadings.map(d => d.heading), borderColor: 'olive', fill: false, tension: 0.1, yAxisID: 'yHeading', hidden: true });
    if (dataPointsWithReadings.some(d => d.temperature_celsius !== null)) datasets.push({ label: 'Temperature (°C)', data: dataPointsWithReadings.map(d => d.temperature_celsius), borderColor: 'coral', fill: false, tension: 0.1, yAxisID: 'yTemp', hidden: false });
    if (dataPointsWithReadings.some(d => d.steps_interval > 0)) datasets.push({ label: 'Steps (Interval)', data: dataPointsWithReadings.map(d => d.steps_interval), borderColor: 'lime', fill: false, stepped: true, tension: 0, yAxisID: 'ySteps', hidden: true, pointRadius: 0 }); // Stepped line for events

    const axes = {
        x: { title: { display: true, text: 'Time' } },
        y: { title: { display: true, text: 'Motion/Orientation (°/s, m/s², °)' } }, // Default Y axis
    };

    // Add Y-axes only if corresponding data exists
    if (datasets.some(d => d.yAxisID === 'yLux')) axes.yLux = { type: 'linear', display: true, position: 'right', title: {display: true, text: 'Lux'}, grid: { drawOnChartArea: false, } };
    if (datasets.some(d => d.yAxisID === 'yDb')) axes.yDb = { type: 'linear', display: true, position: 'right', title: {display: true, text: 'dBFS'}, grid: { drawOnChartArea: false, } };
    if (datasets.some(d => d.yAxisID === 'yAlt')) axes.yAlt = { type: 'linear', display: true, position: 'right', title: {display: true, text: 'Altitude (m)'}, grid: { drawOnChartArea: false, } };
    if (datasets.some(d => d.yAxisID === 'yTemp')) axes.yTemp = { type: 'linear', display: true, position: 'right', title: {display: true, text: 'Temp (°C)'}, grid: { drawOnChartArea: false, } };
    if (datasets.some(d => d.yAxisID === 'yGeo')) axes.yGeo = { type: 'linear', display: true, position: 'right', title: {display: true, text: 'Geo (Lat/Lon)'}, grid: { drawOnChartArea: false, } };
     if (datasets.some(d => d.yAxisID === 'yAcc')) axes.yAcc = { type: 'linear', display: true, position: 'right', title: {display: true, text: 'Accuracy (m)'}, grid: { drawOnChartArea: false, } };
     if (datasets.some(d => d.yAxisID === 'ySpeed')) axes.ySpeed = { type: 'linear', display: true, position: 'right', title: {display: true, text: 'Speed (m/s)'}, grid: { drawOnChartArea: false, } };
     if (datasets.some(d => d.yAxisID === 'yHeading')) axes.yHeading = { type: 'linear', display: true, position: 'right', title: {display: true, text: 'Heading (°)'}, grid: { drawOnChartArea: false, } };
     if (datasets.some(d => d.yAxisID === 'ySteps')) axes.ySteps = { type: 'linear', display: true, position: 'right', title: {display: true, text: 'Steps (Interval)'}, beginAtZero: true, grid: { drawOnChartArea: false, }, ticks: { stepSize: 1 } };


    historyChartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: axes,
            plugins: { legend: { position: 'top' } },
             animation: false, // Disable animation for faster rendering
        }
    });
}

backToHistoryListButton.addEventListener('click', displayHistoryList);
function loadAndDisplayHistory() {
    loadHistoryFromLocalStorage();
    displayHistoryList();
}

// --- Initial Setup ---
loadHistoryFromLocalStorage();
updateRecordingButtonState();
showPage('recordPage');
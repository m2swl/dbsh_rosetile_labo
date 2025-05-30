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

// Sensor UI Elements
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
const BAR_MAX_ACCEL = 20; // m/s^2, for visualization scaling

const gyroCard = document.querySelector('#recordPage md-card:nth-of-type(3)');
const gyroAlphaEl = gyroCard.querySelector('#gyro-alpha');
const gyroBetaEl = gyroCard.querySelector('#gyro-beta'); // Summary element
const gyroBetaDetailEl = gyroCard.querySelector('#gyro-beta-detail');
const gyroGammaEl = gyroCard.querySelector('#gyro-gamma');
const gyroStatusEl = gyroCard.querySelector('#gyro-status');

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

const geoCard = document.querySelector('#recordPage md-card:nth-of-type(7)');
const geoLatEl = geoCard.querySelector('#geo-lat');
const geoLonEl = geoCard.querySelector('#geo-lon');
const geoAddressEl = geoCard.querySelector('#geo-address');
const weatherTempEl = geoCard.querySelector('#weather-temp');
const geoLatDetailEl = geoCard.querySelector('#geo-lat-detail');
const geoLonDetailEl = geoCard.querySelector('#geo-lon-detail');
const geoAccEl = geoCard.querySelector('#geo-acc');
const geoAltEl = geoCard.querySelector('#geo-alt');
const geoSpeedEl = geoCard.querySelector('#geo-speed');
const geoHeadEl = geoCard.querySelector('#geo-head');
const geoAddressDetailEl = geoCard.querySelector('#geo-address-detail');
const weatherTempDetailEl = geoCard.querySelector('#weather-temp-detail');
const geoAddressStatusEl = geoCard.querySelector('#geo-address-status');
const geoStatusEl = geoCard.querySelector('#geo-status');
const weatherStatusEl = geoCard.querySelector('#weather-status');

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

// Dialogs
const deleteConfirmDialog = document.getElementById('deleteConfirmDialog');
const confirmDeleteButton = document.getElementById('confirmDeleteButton');
const deleteDialogSessionInfo = document.getElementById('deleteDialogSessionInfo');
let sessionIdToDelete = null;

const recordingTagsDialog = document.getElementById('recordingTagsDialog');
const recordingTagsForm = document.getElementById('recordingTagsForm');


// --- Global State ---
let isRecording = false;
let currentRecordingStartTime = null;
let currentRecordingData = [];
let currentRecordingPhotos = [];
let recordingIntervalId = null;
const RECORDING_INTERVAL_MS = 100; // 10Hz

let currentSensorValues = {
    timestamp: null,
    accelX: null, accelY: null, accelZ: null,
    orientAlpha: null, orientBeta: null, orientGamma: null,
    gyroAlpha: null, gyroBeta: null, gyroGamma: null,
    illuminance: null,
    decibels: null,
    latitude: null, longitude: null, gpsAccuracy: null, altitude: null, speed: null, heading: null,
    address: null,
    temperature_celsius: null,
    steps_interval: 0,
    photoTakenId: null
};

let allRecordedSessions = []; // Holds all saved sessions

// Permission State
let allPermissionsAttempted = false; // Flag to indicate if the main permission request has been made
let motionPermissionGranted = false;
let orientationPermissionGranted = false;
let micPermissionGranted = false;
let cameraPermissionGranted = false;
let geolocationPermissionGranted = false;
let lightSensorPermissionGranted = false; // AmbientLightSensor permission state


// Audio Variables
let audioContext = null;
let analyserNode = null;
let microphoneStream = null;
let micVizLoopId = null;

// Camera Variables
let cameraStream = null;

// Geolocation Variables
let geoWatchId = null;
let lastWeatherFetchTime = 0;
const WEATHER_FETCH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
let lastFetchedAddressCoords = { lat: null, lon: null };
let lastReverseGeocodeFetchTime = 0;
const REVERSE_GEOCODE_INTERVAL_MS = 30 * 1000; // 30 seconds
const REVERSE_GEOCODE_MIN_COORD_CHANGE = 0.0001; // Approx 11 meters

// Pedometer Variables
let currentSessionTotalSteps = 0;
let pedometer_last_accel_mag = 0;
let pedometer_trending_up = false;
let pedometer_last_step_time = 0;
const PEDOMETER_MAGNITUDE_HIGH_THRESHOLD = 11.0; // Adjusted threshold
const PEDOMETER_MIN_TIME_BETWEEN_STEPS_MS = 250; // Min ms between steps


// --- Theme Switch Logic ---
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

// --- Page Navigation Logic ---
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active-page'));
    document.getElementById(pageId).classList.add('active-page');

    navRecordTab.active = (pageId === 'recordPage');
    navHistoryTab.active = (pageId === 'historyPage');

    if (pageId === 'historyPage') {
        loadAndDisplayHistory();
    } else {
        if (historyChartInstance) {
            historyChartInstance.destroy();
            historyChartInstance = null;
        }
        historyDetailView.style.display = 'none';
        historyListContainer.style.display = 'block';
    }
}
navRecordTab.addEventListener('click', () => showPage('recordPage'));
navHistoryTab.addEventListener('click', () => showPage('historyPage'));


// --- Sensor Permission and Initialization ---

// Helper to update individual sensor status text
function updateSensorStatus(element, message, type = 'info') {
    if (element) {
        element.textContent = message;
        element.classList.remove('error', 'not-supported', 'pending');
        if (type === 'error') element.classList.add('error');
        else if (type === 'not-supported') element.classList.add('not-supported');
        else if (type === 'pending') element.classList.add('pending');
    }
}

// Centralized permission request logic
sensorPermissionIconButton.addEventListener('click', async () => {
    if (allPermissionsAttempted && (motionPermissionGranted || orientationPermissionGranted || micPermissionGranted || cameraPermissionGranted || geolocationPermissionGranted || lightSensorPermissionGranted)) {
        // If already attempted and some granted, perhaps refresh or show status.
        // For now, we assume a single comprehensive attempt.
        console.log("Permissions already attempted. Refresh page to try again or check individual sensor states.");
        return;
    }

    recordingStatusEl.textContent = "センサーアクセス許可をリクエスト中...";
    sensorPermissionIconButton.disabled = true;

    // --- Motion & Orientation (iOS specific primarily) ---
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        try {
            const state = await DeviceMotionEvent.requestPermission();
            if (state === 'granted') {
                motionPermissionGranted = true;
                orientationPermissionGranted = true; // Often linked
                updateSensorStatus(accelStatusEl, "アクセス許可済み");
                updateSensorStatus(gyroStatusEl, "アクセス許可済み");
                updateSensorStatus(pedometerStatusEl, "アクセス許可済み");
                updateSensorStatus(orientStatusEl, "アクセス許可済み");
                window.addEventListener('devicemotion', handleMotionEvent, { passive: true });
                window.addEventListener('deviceorientation', handleOrientationEvent, { passive: true });
            } else {
                updateSensorStatus(accelStatusEl, "動作センサーアクセス拒否", "error");
                updateSensorStatus(gyroStatusEl, "ジャイロセンサーアクセス拒否", "error");
                updateSensorStatus(pedometerStatusEl, "動作センサーアクセス拒否", "error");
                updateSensorStatus(orientStatusEl, "向きセンサーアクセス拒否", "error");
            }
        } catch (err) {
            console.error("DeviceMotion/Orientation permission error:", err);
            updateSensorStatus(accelStatusEl, "動作センサー許可エラー", "error");
            updateSensorStatus(orientStatusEl, "向きセンサー許可エラー", "error");
        }
    } else {
        // For browsers without requestPermission (e.g., Android Chrome), assume granted if API exists
        if (typeof DeviceMotionEvent !== 'undefined') {
            motionPermissionGranted = true;
            window.addEventListener('devicemotion', handleMotionEvent, { passive: true });
        } else {
            updateSensorStatus(accelStatusEl, "加速度センサー非対応", "not-supported");
            updateSensorStatus(gyroStatusEl, "ジャイロスコープ非対応", "not-supported");
            updateSensorStatus(pedometerStatusEl, "加速度センサー非対応", "not-supported");
        }
        if (typeof DeviceOrientationEvent !== 'undefined') {
            orientationPermissionGranted = true;
            window.addEventListener('deviceorientation', handleOrientationEvent, { passive: true });
        } else {
            updateSensorStatus(orientStatusEl, "向きセンサー非対応", "not-supported");
        }
    }

    // --- Microphone ---
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
            microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            micPermissionGranted = true;
            initializeMicrophoneVisuals();
            updateSensorStatus(micStatusEl, "アクセス許可済み");
        } catch (err) {
            console.error("Microphone permission error:", err);
            micPermissionGranted = false;
            updateSensorStatus(micStatusEl, `マイクアクセス拒否: ${err.name}`, "error");
        }
    } else {
        updateSensorStatus(micStatusEl, "マイク API 非対応", "not-supported");
    }

    // --- Camera ---
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
            cameraPermissionGranted = true;
            cameraPreview.srcObject = cameraStream;
            cameraPreview.style.display = 'block';
            updateSensorStatus(cameraStatusEl, "アクセス許可済み");
        } catch (err) {
            console.error("Camera permission error:", err);
            cameraPermissionGranted = false;
            updateSensorStatus(cameraStatusEl, `カメラアクセス拒否: ${err.name}`, "error");
        }
    } else {
        updateSensorStatus(cameraStatusEl, "カメラ API 非対応", "not-supported");
    }

    // --- Geolocation ---
    if ('geolocation' in navigator) {
        try {
            // Requesting current position effectively asks for permission
            await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        geolocationPermissionGranted = true;
                        initializeGeolocationWatcher(position); // Start watching after initial grant
                        resolve(position);
                    },
                    (error) => {
                        geolocationPermissionGranted = false;
                        handleGeolocationError(error);
                        reject(error);
                    },
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                );
            });
        } catch (err) {
            // Error already handled by handleGeolocationError
        }
    } else {
        updateSensorStatus(geoStatusEl, "位置情報 API 非対応", "not-supported");
    }

    // --- Ambient Light Sensor (Generic Model) ---
    await initializeLightSensor(); // This handles its own permission query and start logic

    allPermissionsAttempted = true;
    updateRecordingButtonState();
});


function initializeSensorDisplay() {
    // Set initial "pending" or "not supported" messages for sensors
    // Motion & Orientation
    if (typeof DeviceMotionEvent === 'undefined') {
        updateSensorStatus(accelStatusEl, "加速度センサー非対応", "not-supported");
        updateSensorStatus(gyroStatusEl, "ジャイロスコープ非対応", "not-supported");
        updateSensorStatus(pedometerStatusEl, "加速度センサー非対応", "not-supported");
    } else if (!motionPermissionGranted && typeof DeviceMotionEvent.requestPermission === 'function') {
        updateSensorStatus(accelStatusEl, "許可が必要", "pending");
        updateSensorStatus(gyroStatusEl, "許可が必要", "pending");
        updateSensorStatus(pedometerStatusEl, "許可が必要", "pending");
    }
    if (typeof DeviceOrientationEvent === 'undefined') {
        updateSensorStatus(orientStatusEl, "向きセンサー非対応", "not-supported");
    } else if (!orientationPermissionGranted && typeof DeviceOrientationEvent.requestPermission === 'function') {
        updateSensorStatus(orientStatusEl, "許可が必要", "pending");
    }

    // Microphone
    if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
        updateSensorStatus(micStatusEl, "マイク API 非対応", "not-supported");
    } else if (!micPermissionGranted) {
        updateSensorStatus(micStatusEl, "許可が必要", "pending");
    }

    // Camera
    if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
        updateSensorStatus(cameraStatusEl, "カメラ API 非対応", "not-supported");
    } else if (!cameraPermissionGranted) {
        updateSensorStatus(cameraStatusEl, "許可が必要", "pending");
    }

    // Geolocation
    if (!('geolocation' in navigator)) {
        updateSensorStatus(geoStatusEl, "位置情報 API 非対応", "not-supported");
        updateSensorStatus(geoAddressStatusEl, "-");
        updateSensorStatus(weatherStatusEl, "GPSアクセスが必要です");
    } else if (!geolocationPermissionGranted) {
        updateSensorStatus(geoStatusEl, "許可が必要", "pending");
        updateSensorStatus(geoAddressStatusEl, "許可が必要");
        updateSensorStatus(weatherStatusEl, "GPSアクセスが必要です");
    }

    // Light Sensor
    if (!('AmbientLightSensor' in window)) {
        updateSensorStatus(lightStatusEl, "光センサー API 非対応", "not-supported");
    } else if (!lightSensorPermissionGranted && navigator.permissions && navigator.permissions.query) {
        // Check its specific permission state later in initializeLightSensor
        updateSensorStatus(lightStatusEl, "初期化中...", "pending");
    } else {
        updateSensorStatus(lightStatusEl, "初期化中...");
    }

    updateRecordingButtonState();
}


function updateRecordingButtonState() {
    const permissionIconEl = sensorPermissionIconButton.querySelector('md-icon');
    const canRequestAnyPermission = (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function' && !motionPermissionGranted) ||
                                  (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && (!micPermissionGranted || !cameraPermissionGranted)) ||
                                  ('geolocation' in navigator && !geolocationPermissionGranted) ||
                                  ('AmbientLightSensor' in window && !lightSensorPermissionGranted && navigator.permissions && navigator.permissions.query); // Light sensor permission needs query

    if (!allPermissionsAttempted && canRequestAnyPermission) {
        sensorPermissionIconButton.disabled = false;
        permissionIconEl.textContent = 'lock';
        recordingStatusEl.textContent = "左の🔒アイコンからセンサーアクセスを許可してください。";
    } else {
        sensorPermissionIconButton.disabled = true;
        permissionIconEl.textContent = 'lock_open';
        // If no more explicit permissions can be requested, or all attempted
        if (!isRecording && allRecordedSessions.length > 0) {
             const lastSession = allRecordedSessions.reduce((latest, session) => session.id > latest.id ? session : latest, allRecordedSessions[0]);
             if (lastSession && lastSession.tags && lastSession.tags.color !== '未選択') {
                 const sessionSavedTime = new Date(lastSession.id).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                 recordingStatusEl.textContent = `記録停止済。履歴保存(${sessionSavedTime})。CSV可。`;
             } else {
                 recordingStatusEl.textContent = `記録停止済。データ破棄。CSV可。`;
             }
        } else if (!isRecording) {
             recordingStatusEl.textContent = "待機中...";
        }
    }

    // Determine if any sensor is actively providing data (or can)
    const anySensorActiveOrGranted = motionPermissionGranted || orientationPermissionGranted || micPermissionGranted || cameraPermissionGranted || geolocationPermissionGranted || lightSensorPermissionGranted;

    startRecordingIconButton.disabled = isRecording || !anySensorActiveOrGranted;
    stopRecordingIconButton.disabled = !isRecording;
    downloadCSVIconButton.disabled = isRecording || allRecordedSessions.length === 0;
    takePictureButton.disabled = isRecording || !cameraPermissionGranted;

    if (isRecording) {
        recordingStatusEl.textContent = `記録中... (${currentRecordingData.length}件)`;
    }
}

// --- Sensor Event Handlers ---
function handleMotionEvent(event) {
    if (!motionPermissionGranted) return;

    if (event.accelerationIncludingGravity) {
        const { x, y, z } = event.accelerationIncludingGravity;
        currentSensorValues.accelX = x; currentSensorValues.accelY = y; currentSensorValues.accelZ = z;
        accelXEl.textContent = x !== null ? x.toFixed(2) : '-';
        accelYEl.textContent = y !== null ? y.toFixed(2) : '-';
        accelZEl.textContent = z !== null ? z.toFixed(2) : '-';
        requestAnimationFrame(() => {
            accelBarX.style.height = `${Math.min(100, (Math.abs(x || 0) / BAR_MAX_ACCEL) * 100)}%`;
            accelBarY.style.height = `${Math.min(100, (Math.abs(y || 0) / BAR_MAX_ACCEL) * 100)}%`;
            accelBarZ.style.height = `${Math.min(100, (Math.abs(z || 0) / BAR_MAX_ACCEL) * 100)}%`;
        });
        if (accelStatusEl.textContent !== "監視中...") updateSensorStatus(accelStatusEl, "監視中...");

        // Pedometer
        const mag = Math.sqrt((x || 0)**2 + (y || 0)**2 + (z || 0)**2);
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
                    pedometerStepsEl.textContent = currentSessionTotalSteps;
                }
                pedometer_trending_up = false;
            }
            pedometer_last_accel_mag = mag;
        }
         if (pedometerStatusEl.textContent !== "監視中...") updateSensorStatus(pedometerStatusEl, "監視中...");
    }

    if (event.rotationRate) {
        const { alpha, beta, gamma } = event.rotationRate;
        currentSensorValues.gyroAlpha = alpha; currentSensorValues.gyroBeta = beta; currentSensorValues.gyroGamma = gamma;
        if (gyroAlphaEl) gyroAlphaEl.textContent = alpha !== null ? alpha.toFixed(2) : '-';
        if (gyroBetaEl) gyroBetaEl.textContent = beta !== null ? beta.toFixed(2) : '-';
        if (gyroBetaDetailEl) gyroBetaDetailEl.textContent = beta !== null ? beta.toFixed(2) : '-';
        if (gyroGammaEl) gyroGammaEl.textContent = gamma !== null ? gamma.toFixed(2) : '-';
        if (gyroStatusEl.textContent !== "監視中...") updateSensorStatus(gyroStatusEl, "監視中...");
    }
}

function handleOrientationEvent(event) {
    if (!orientationPermissionGranted) return;
    const { alpha, beta, gamma } = event;
    if (alpha !== null || beta !== null || gamma !== null) {
        currentSensorValues.orientAlpha = alpha; currentSensorValues.orientBeta = beta; currentSensorValues.orientGamma = gamma;
        orientAlphaEl.textContent = alpha !== null ? alpha.toFixed(1) : '-';
        orientBetaEl.textContent = beta !== null ? beta.toFixed(1) : '-';
        orientGammaEl.textContent = gamma !== null ? gamma.toFixed(1) : '-';
        requestAnimationFrame(() => {
            orientationCube.style.transform = `rotateZ(${(alpha || 0).toFixed(1)}deg) rotateX(${(beta || 0).toFixed(1)}deg) rotateY(${(gamma || 0).toFixed(1)}deg)`;
        });
        if (orientStatusEl.textContent !== "監視中...") updateSensorStatus(orientStatusEl, "監視中...");
    }
}

async function initializeLightSensor() {
    if (!('AmbientLightSensor' in window)) {
        updateSensorStatus(lightStatusEl, "光センサー API 非対応", "not-supported");
        return;
    }

    const startTheSensor = () => {
        try {
            const sensor = new AmbientLightSensor({ frequency: 1 });
            sensor.onreading = () => {
                lightSensorPermissionGranted = true; // Implied if reading
                const illuminance = sensor.illuminance;
                currentSensorValues.illuminance = illuminance;
                lightValueEl.textContent = illuminance !== null ? illuminance.toFixed(0) : '-';
                updateSensorStatus(lightStatusEl, "監視中...");
                lightIconSun.style.display = (illuminance !== null && illuminance > 100) ? 'inline-block' : 'none';
                lightIconMoon.style.display = (illuminance !== null && illuminance < 10) ? 'inline-block' : 'none';
            };
            sensor.onerror = event => {
                console.error('Light sensor error:', event.error.name, event.error.message);
                lightSensorPermissionGranted = false;
                if (event.error.name === 'NotAllowedError') {
                    updateSensorStatus(lightStatusEl, '光センサーアクセス拒否', "error");
                } else {
                    updateSensorStatus(lightStatusEl, `光センサーエラー: ${event.error.name}`, "error");
                }
                updateRecordingButtonState();
            };
            sensor.start();
        } catch (error) {
            console.error('Failed to start light sensor:', error);
            lightSensorPermissionGranted = false;
            updateSensorStatus(lightStatusEl, `光センサー開始失敗: ${error.name}`, "error");
            updateRecordingButtonState();
        }
    };

    if (navigator.permissions && navigator.permissions.query) {
        try {
            const permissionStatus = await navigator.permissions.query({ name: 'ambient-light-sensor' });
            lightSensorPermissionGranted = (permissionStatus.state === 'granted');
            if (permissionStatus.state === 'granted') {
                startTheSensor();
            } else if (permissionStatus.state === 'prompt') {
                updateSensorStatus(lightStatusEl, '許可を待っています...', "pending");
                // Some browsers might auto-prompt when sensor.start() is called.
                // Others require a user gesture for the prompt.
                // For simplicity, we'll let sensor.start() try.
                startTheSensor();
            } else { // denied
                updateSensorStatus(lightStatusEl, '光センサーアクセス拒否', "error");
            }
            permissionStatus.onchange = () => {
                lightSensorPermissionGranted = (permissionStatus.state === 'granted');
                if (permissionStatus.state === 'granted') startTheSensor();
                else if (permissionStatus.state === 'denied') updateSensorStatus(lightStatusEl, '光センサーアクセス拒否', "error");
                updateRecordingButtonState();
            };
        } catch (e) {
            console.warn("Ambient Light Sensor permission query failed, attempting to start directly.", e);
            startTheSensor(); // Fallback
        }
    } else {
        startTheSensor(); // No Permissions API, try to start directly
    }
}


function initializeMicrophoneVisuals() {
    if (!micPermissionGranted || !microphoneStream) return;
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyserNode = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(microphoneStream);
        source.connect(analyserNode);
        analyserNode.fftSize = 256; // Smaller FFT for faster response
        if (audioContext.state === 'suspended') {
            audioContext.resume().catch(e => console.error("Error resuming AudioContext:", e));
        }
        renderMicLevel();
    } catch (e) {
        console.error("Error setting up microphone visuals:", e);
        updateSensorStatus(micStatusEl, `マイク視覚化エラー: ${e.name}`, "error");
    }
}

function renderMicLevel() {
    if (!micPermissionGranted || !analyserNode || !audioContext || audioContext.state === 'closed') {
        currentSensorValues.decibels = null;
        micDbfsEl.textContent = "-";
        micLevelBar.style.width = `0%`;
        micLevelBar.style.backgroundColor = 'var(--md-sys-color-surface-variant)';
        if (micVizLoopId) cancelAnimationFrame(micVizLoopId);
        micVizLoopId = null;
        return;
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
             if (micVizLoopId) cancelAnimationFrame(micVizLoopId); // Cancel previous if any
             micVizLoopId = requestAnimationFrame(renderMicLevel);
        }).catch(e => console.error("Error resuming AudioContext in renderMicLevel:", e));
        return;
    }

    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserNode.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
    let average = bufferLength > 0 ? sum / bufferLength : 0;

    // Approximate dBFS (not accurate, but for visualization)
    let pseudoDbFs = average === 0 ? -Infinity : 20 * Math.log10(average / 255.0);
    pseudoDbFs = Math.max(-80, pseudoDbFs); // Clamp min

    currentSensorValues.decibels = isFinite(pseudoDbFs) ? pseudoDbFs : null;
    micDbfsEl.textContent = isFinite(pseudoDbFs) ? pseudoDbFs.toFixed(1) : '-∞';

    let levelPercent = Math.min(100, Math.max(0, (average / 150) * 100));
    micLevelBar.style.width = `${levelPercent}%`;
    micLevelBar.style.backgroundColor = (isFinite(pseudoDbFs) && pseudoDbFs > -15) ? 'var(--md-sys-color-error)' :
                                       ((isFinite(pseudoDbFs) && pseudoDbFs > -30) ? 'var(--md-sys-color-primary)' :
                                       'var(--md-sys-color-secondary-container)');

    micVizLoopId = requestAnimationFrame(renderMicLevel);
}

takePictureButton.addEventListener('click', () => {
    if (!cameraPermissionGranted || !cameraStream || isRecording) return;

    const videoTracks = cameraStream.getVideoTracks();
    if (videoTracks.length === 0 || !videoTracks[0].enabled) {
        console.error("No enabled video tracks."); return;
    }
    const trackSettings = videoTracks[0].getSettings();
    photoCanvas.width = trackSettings.width || cameraPreview.videoWidth;
    photoCanvas.height = trackSettings.height || cameraPreview.videoHeight;

    const context = photoCanvas.getContext('2d');
    context.drawImage(cameraPreview, 0, 0, photoCanvas.width, photoCanvas.height);
    const dataUrl = photoCanvas.toDataURL('image/jpeg', 0.8);
    const photoTimestamp = Date.now();

    currentRecordingPhotos.push({ timestamp: photoTimestamp, dataUrl: dataUrl });

    lastPhotoPreviewContainer.innerHTML = ''; // Clear previous
    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = `撮影写真 ${new Date(photoTimestamp).toLocaleTimeString()}`;
    img.style.cssText = 'max-width:100px; max-height:100px; border:1px solid var(--md-sys-color-outline); border-radius:4px; cursor:pointer;';
    img.onclick = () => window.open(dataUrl, '_blank');
    const p = document.createElement('p');
    p.style.cssText = 'font-size:0.7em; color:var(--md-sys-color-secondary); margin:4px 0 0 0;';
    p.textContent = `${new Date(photoTimestamp).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' })}に撮影`;
    lastPhotoPreviewContainer.appendChild(img);
    lastPhotoPreviewContainer.appendChild(p);

    if (isRecording) {
        currentSensorValues.photoTakenId = photoTimestamp;
    }
    updateSensorStatus(cameraStatusEl, `${new Date(photoTimestamp).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })} に写真を撮影`);
});

// --- Geolocation, Reverse Geocoding & Weather Logic ---
function initializeGeolocationWatcher(initialPosition) {
    if (!geolocationPermissionGranted) return;

    handleGeolocationPosition(initialPosition); // Process the initially granted position

    if (geoWatchId) navigator.geolocation.clearWatch(geoWatchId);
    geoWatchId = navigator.geolocation.watchPosition(
        handleGeolocationPosition,
        handleGeolocationError,
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 } // Allow slightly older position
    );
    updateSensorStatus(geoStatusEl, "監視中...");
}

function handleGeolocationPosition(position) {
    if (!geolocationPermissionGranted) geolocationPermissionGranted = true; // Should be, but ensure
    updateSensorStatus(geoStatusEl, "監視中...");

    const { latitude, longitude, accuracy, altitude, speed, heading } = position.coords;
    currentSensorValues.latitude = latitude; currentSensorValues.longitude = longitude;
    currentSensorValues.gpsAccuracy = accuracy; currentSensorValues.altitude = altitude;
    currentSensorValues.speed = speed; currentSensorValues.heading = heading;

    // Update UI for both summary and detail
    const latStr = latitude !== null ? latitude.toFixed(5) : '-';
    const lonStr = longitude !== null ? longitude.toFixed(5) : '-';
    if(geoLatEl) geoLatEl.textContent = latStr; if(geoLatDetailEl) geoLatDetailEl.textContent = latStr;
    if(geoLonEl) geoLonEl.textContent = lonStr; if(geoLonDetailEl) geoLonDetailEl.textContent = lonStr;

    if(geoAccEl) geoAccEl.textContent = accuracy !== null ? accuracy.toFixed(1) : '-';
    if(geoAltEl) geoAltEl.textContent = altitude !== null ? altitude.toFixed(1) : '-';
    if(geoSpeedEl) geoSpeedEl.textContent = speed !== null ? speed.toFixed(2) : '-';
    if(geoHeadEl) geoHeadEl.textContent = (heading !== null && !isNaN(heading)) ? heading.toFixed(1) : '-';

    const now = Date.now();
    const significantCoordChange = (latitude !== null && longitude !== null) &&
        (Math.abs(latitude - (lastFetchedAddressCoords.lat || 0)) > REVERSE_GEOCODE_MIN_COORD_CHANGE ||
         Math.abs(longitude - (lastFetchedAddressCoords.lon || 0)) > REVERSE_GEOCODE_MIN_COORD_CHANGE);

    if (latitude !== null && longitude !== null) {
        if (significantCoordChange || currentSensorValues.address === null || (now - lastReverseGeocodeFetchTime > REVERSE_GEOCODE_INTERVAL_MS)) {
            fetchReverseGeocode(latitude, longitude);
        }
        if (significantCoordChange || currentSensorValues.temperature_celsius === null || (now - lastWeatherFetchTime > WEATHER_FETCH_INTERVAL_MS)) {
            fetchWeatherData(latitude, longitude);
        }
    }
    updateRecordingButtonState();
}

function handleGeolocationError(error) {
    console.error('Geolocation error:', error);
    let message = 'GPSエラー';
    if (error.code === 1) { // PERMISSION_DENIED
        message = 'GPSアクセス拒否';
        geolocationPermissionGranted = false;
        if (geoWatchId) navigator.geolocation.clearWatch(geoWatchId);
        geoWatchId = null;
    }
    else if (error.code === 2) message = 'GPS位置取得不能';
    else if (error.code === 3) message = 'GPSタイムアウト';

    updateSensorStatus(geoStatusEl, message, "error");
    updateSensorStatus(geoAddressStatusEl, message);
    updateSensorStatus(weatherStatusEl, message);
    // Clear geo values
    currentSensorValues.latitude = null; currentSensorValues.longitude = null; /* ... and others */
    if(geoLatEl) geoLatEl.textContent = '-'; /* ... and other UI elements */
    updateRecordingButtonState();
}

async function fetchReverseGeocode(latitude, longitude) {
    if (latitude === null || longitude === null) return;
    updateSensorStatus(geoAddressStatusEl, "住所情報取得中...");
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude.toFixed(5)}&lon=${longitude.toFixed(5)}&accept-language=ja,en`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Nominatim API error: ${response.status}`);
        const data = await response.json();
        if (data && data.display_name) {
            currentSensorValues.address = data.display_name;
            if(geoAddressEl) geoAddressEl.textContent = data.display_name;
            if(geoAddressDetailEl) geoAddressDetailEl.textContent = data.display_name;
            lastReverseGeocodeFetchTime = Date.now();
            updateSensorStatus(geoAddressStatusEl, `最終更新: ${new Date(lastReverseGeocodeFetchTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
            lastFetchedAddressCoords = { lat: latitude, lon: longitude };
        } else {
            updateSensorStatus(geoAddressStatusEl, "住所情報なし");
        }
    } catch (error) {
        console.error("Failed to fetch reverse geocode:", error);
        updateSensorStatus(geoAddressStatusEl, "住所情報取得エラー", "error");
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


// --- Recording Logic ---
function recordCurrentData() {
    if (!isRecording) return;
    const now = Date.now();
    currentRecordingData.push({ ...currentSensorValues, timestamp: now });
    // Reset interval-specific values
    currentSensorValues.photoTakenId = null;
    currentSensorValues.steps_interval = 0;
    if (currentRecordingData.length % 10 === 0) { // Update status every second
        recordingStatusEl.textContent = `記録中... (${currentRecordingData.length}件)`;
    }
}

function startRecording() {
    if (isRecording) return;
    const anySensorReady = motionPermissionGranted || orientationPermissionGranted || micPermissionGranted || cameraPermissionGranted || geolocationPermissionGranted || lightSensorPermissionGranted;
    if (!anySensorReady) {
        alert("利用可能なセンサーがないか、センサーアクセスが許可されていません。");
        return;
    }

    isRecording = true;
    currentRecordingStartTime = Date.now();
    currentRecordingData = [];
    currentRecordingPhotos = [];
    lastPhotoPreviewContainer.innerHTML = "";

    currentSessionTotalSteps = 0;
    pedometerStepsEl.textContent = '0';
    pedometer_last_accel_mag = 0;
    pedometer_trending_up = false;
    pedometer_last_step_time = 0;

    if (recordingIntervalId) clearInterval(recordingIntervalId);
    recordingIntervalId = setInterval(recordCurrentData, RECORDING_INTERVAL_MS);
    updateRecordingButtonState();
}

// Store temporary data for dialog interaction
let tempSessionDataForDialog = null;
let tempSessionPhotosForDialog = null;
let tempSessionTotalStepsForDialog = null;
let tempSessionStartTimeForDialog = null;

function stopRecording() {
    if (!isRecording) return;
    isRecording = false;
    if (recordingIntervalId) {
        clearInterval(recordingIntervalId);
        recordingIntervalId = null;
    }

    // Store data to be processed by the dialog
    tempSessionDataForDialog = [...currentRecordingData];
    tempSessionPhotosForDialog = [...currentRecordingPhotos];
    tempSessionTotalStepsForDialog = currentSessionTotalSteps;
    tempSessionStartTimeForDialog = currentRecordingStartTime;


    // Clear current recording buffers
    currentRecordingData = [];
    currentRecordingPhotos = [];
    lastPhotoPreviewContainer.innerHTML = "";
    pedometerStepsEl.textContent = '0';
    currentSessionTotalSteps = 0; // Reset for next recording

    updateRecordingButtonState(); // Update button state first
    recordingStatusEl.textContent = "記録停止。タグ付けしてください...";


    if (tempSessionDataForDialog.length === 0 && tempSessionPhotosForDialog.length === 0) {
        recordingStatusEl.textContent = `記録停止。データなし。`;
        // Reset temp vars
        tempSessionDataForDialog = null;
        tempSessionPhotosForDialog = null;
        tempSessionTotalStepsForDialog = null;
        tempSessionStartTimeForDialog = null;
        return;
    }

    recordingTagsDialog.show();
}

// Handle dialog close (this is the new way)
recordingTagsDialog.addEventListener('close', (event) => {
    const action = event.target.returnValue; // MWC Dialog uses returnValue from form

    if (!tempSessionDataForDialog) { // Dialog closed without data (e.g. error or race condition)
        console.warn("Recording tags dialog closed but no temporary session data was found.");
        updateRecordingButtonState();
        return;
    }

    if (action === 'confirm') {
        const tags = {
            color: recordingTagsForm.color.value || '未選択',
            emotion: recordingTagsForm.emotion.value || '未選択',
            shape: recordingTagsForm.shape.value || '未選択'
        };
        recordingTagsForm.reset();

        const sessionId = Date.now();
        const sessionEndTime = tempSessionDataForDialog.length > 0 ? tempSessionDataForDialog[tempSessionDataForDialog.length - 1].timestamp : sessionId;

        const newSession = {
            id: sessionId,
            startTime: tempSessionStartTimeForDialog || sessionId,
            endTime: sessionEndTime,
            data: tempSessionDataForDialog,
            photos: tempSessionPhotosForDialog,
            totalSteps: tempSessionTotalStepsForDialog,
            tags: tags
        };

        allRecordedSessions.push(newSession);
        saveHistoryToLocalStorage();
        recordingStatusEl.textContent = `記録保存済 (${newSession.data.length}件)。CSVダウンロード可。`;

    } else { // Cancelled or dismissed
        recordingTagsForm.reset();
        recordingStatusEl.textContent = `記録停止。データ破棄(${tempSessionDataForDialog.length}件)。`;
    }

    // Clear temporary data
    tempSessionDataForDialog = null;
    tempSessionPhotosForDialog = null;
    tempSessionTotalStepsForDialog = null;
    tempSessionStartTimeForDialog = null;

    updateRecordingButtonState();
});


function downloadCSV(session, filenamePrefix = "sensor_data") {
    if (!session || ((!session.data || session.data.length === 0) && (!session.photos || session.photos.length === 0))) {
        alert("記録データがありません。"); return;
    }
    const header = "timestamp,accelX,accelY,accelZ,orientAlpha,orientBeta,orientGamma,gyroAlpha,gyroBeta,gyroGamma,illuminance,decibels,latitude,longitude,gpsAccuracy,altitude,speed,heading,temperature_celsius,steps_in_interval,photoTakenId,sessionColor,sessionEmotion,sessionShape";
    const rows = session.data.map(row => {
        const photoId = row.photoTakenId || '';
        const sTags = session.tags || {};
        return [
            row.timestamp, row.accelX, row.accelY, row.accelZ,
            row.orientAlpha, row.orientBeta, row.orientGamma,
            row.gyroAlpha, row.gyroBeta, row.gyroGamma,
            row.illuminance, row.decibels,
            row.latitude, row.longitude, row.gpsAccuracy, row.altitude, row.speed, row.heading,
            row.temperature_celsius, row.steps_interval, photoId,
            sTags.color || '未選択', sTags.emotion || '未選択', sTags.shape || '未選択'
        ].map(val => (val !== null && typeof val !== 'undefined') ? (typeof val === 'number' ? val.toFixed(typeof val === 'number' && val % 1 !== 0 ? 3 : 0) : String(val).replace(/"/g, '""')) : '').join(',');
    });
    const csvContent = header + "\n" + rows.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    const now = new Date(session.startTime);
    const tsStr = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}`;
    link.setAttribute("href", url);
    link.setAttribute("download", `${filenamePrefix}_${tsStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

startRecordingIconButton.addEventListener('click', startRecording);
stopRecordingIconButton.addEventListener('click', stopRecording);
downloadCSVIconButton.addEventListener('click', () => {
    if (allRecordedSessions.length > 0) {
        const lastSession = allRecordedSessions.reduce((latest, session) => session.id > latest.id ? session : latest, allRecordedSessions[0]);
        downloadCSV(lastSession, "sensor_data_last_session");
    } else {
        alert("ダウンロードできる記録がありません。");
    }
});


// --- History Logic ---
const HISTORY_STORAGE_KEY = 'sensorDemoProHistory_v4'; // Bump version for refined structure

function saveHistoryToLocalStorage() {
    try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(allRecordedSessions));
    } catch (e) {
        console.error("Error saving history:", e);
        if (e.name === 'QuotaExceededError') alert("履歴保存失敗: ストレージ容量不足");
    }
}

function loadHistoryFromLocalStorage() {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (stored) {
        try {
            allRecordedSessions = JSON.parse(stored).map(s => ({ // Basic validation/defaults
                ...s,
                id: Number(s.id) || Date.now(),
                startTime: Number(s.startTime) || Date.now(),
                endTime: Number(s.endTime) || Date.now(),
                data: Array.isArray(s.data) ? s.data : [],
                photos: Array.isArray(s.photos) ? s.photos.filter(p => p && p.dataUrl) : [],
                totalSteps: Number(s.totalSteps) || 0,
                tags: s.tags || { color: '未選択', emotion: '未選択', shape: '未選択' }
            }));
        } catch (e) {
            console.error("Error parsing history:", e);
            allRecordedSessions = [];
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
    allRecordedSessions.sort((a, b) => b.id - a.id); // Latest first

    allRecordedSessions.forEach(session => {
        const card = document.createElement('md-elevated-card');
        card.style.marginBottom = '12px';
        card.style.position = 'relative'; // For tag indicator
        const startTime = new Date(session.startTime);
        const durationMs = (session.endTime || session.startTime) - session.startTime;
        const durationSec = Math.max(0, Math.floor(durationMs / 1000));
        const formattedStartTime = startTime.toLocaleString('ja-JP', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' });
        const tags = session.tags || {};

        const tagIndicator = document.createElement('div');
        tagIndicator.className = 'history-tag-indicator';
        if (tags.color && tags.color !== '未選択') {
            tagIndicator.classList.add(`tag-color-${tags.color}`);
        } else {
             tagIndicator.classList.add(`tag-color-未選択`);
        }
        card.appendChild(tagIndicator);


        const contentDiv = document.createElement('div');
        contentDiv.style.padding = '16px';
        contentDiv.style.paddingLeft = '22px'; // Space for indicator

        contentDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <h4 style="margin-top:0; margin-bottom: 8px; font-size: 1.1em;">記録: ${formattedStartTime}</h4>
                <md-icon-button class="delete-session-button" data-session-id="${session.id}" aria-label="削除">
                    <md-icon>delete</md-icon>
                </md-icon-button>
            </div>
            <p><md-icon>timer</md-icon> 記録時間: ${Math.floor(durationSec/60)}分 ${durationSec%60}秒</p>
            <p><md-icon>list_alt</md-icon> データ: ${session.data.length}件, 写真: ${session.photos.length}枚</p>
            <p><md-icon>directions_walk</md-icon> 歩数: ${session.totalSteps || 0} 歩</p>
            <p><md-icon>label</md-icon> タグ: ${tags.color || 'N/A'}, ${tags.emotion || 'N/A'}, ${tags.shape || 'N/A'}</p>
        `;
        // Quick styling for p tags in history card
        contentDiv.querySelectorAll('p').forEach(p => {
            p.style.fontSize = '0.9em'; p.style.margin = '4px 0';
            const icon = p.querySelector('md-icon');
            if (icon) { icon.style.fontSize = '1.1em'; icon.style.verticalAlign = 'middle'; icon.style.marginRight = '4px';}
        });

        card.appendChild(contentDiv);
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.delete-session-button')) displayHistoryDetail(session.id);
        });
        card.querySelector('.delete-session-button').addEventListener('click', (e) => {
            e.stopPropagation();
            promptDeleteSession(session.id, formattedStartTime);
        });
        historyListContainer.appendChild(card);
    });
}

function promptDeleteSession(sessionId, sessionStartTimeFormatted) {
    sessionIdToDelete = sessionId;
    deleteDialogSessionInfo.textContent = `記録日時: ${sessionStartTimeFormatted}`;
    deleteConfirmDialog.show();
}
deleteConfirmDialog.addEventListener('close', (event) => {
    if (event.target.returnValue === 'delete' && sessionIdToDelete !== null) {
        allRecordedSessions = allRecordedSessions.filter(s => s.id !== sessionIdToDelete);
        saveHistoryToLocalStorage();
        if (historyDetailView.style.display === 'block' && historyDetailView.dataset.sessionId === String(sessionIdToDelete)) {
            historyDetailView.style.display = 'none'; // Go back to list
            if (historyChartInstance) historyChartInstance.destroy();
        }
        displayHistoryList();
    }
    sessionIdToDelete = null;
});


function displayHistoryDetail(sessionId) {
    const session = allRecordedSessions.find(s => s.id === sessionId);
    if (!session) { displayHistoryList(); return; }

    historyListContainer.style.display = 'none';
    historyDetailView.style.display = 'block';
    historyDetailView.dataset.sessionId = sessionId;
    const startTime = new Date(session.startTime);
    const tags = session.tags || {};
    historyDetailTitle.textContent = `記録詳細: ${startTime.toLocaleString('ja-JP')} (タグ: ${tags.color}, ${tags.emotion}, ${tags.shape})`;

    historyPhotosContainer.innerHTML = '';
    if (session.photos && session.photos.length > 0) {
        session.photos.forEach(photo => {
            const img = document.createElement('img');
            img.src = photo.dataUrl;
            img.alt = `Photo ${new Date(photo.timestamp).toLocaleTimeString()}`;
            img.style.cssText = 'max-width:100px; max-height:100px; border-radius:4px; border:1px solid var(--md-sys-color-outline); cursor:pointer;';
            img.onclick = () => window.open(photo.dataUrl, '_blank');
            historyPhotosContainer.appendChild(img);
        });
    } else {
        historyPhotosContainer.innerHTML = '<p style="font-size:0.9em; color:var(--md-sys-color-on-surface-variant);">写真なし</p>';
    }

    exportHistoryCSVButton.onclick = () => downloadCSV(session, `sensor_history_${session.id}`);

    if (historyChartInstance) historyChartInstance.destroy();
    const dataPointsForChart = session.data.filter(d => d && (
        (d.accelZ !== null && typeof d.accelZ === 'number') || (d.decibels !== null && isFinite(d.decibels)) || (d.temperature_celsius !== null && typeof d.temperature_celsius === 'number')
    ));

    if (dataPointsForChart.length < 2) {
        historyChartCanvas.style.display = 'none';
        const existingMsg = historyChartCanvas.previousElementSibling;
        if (existingMsg && existingMsg.classList.contains('chart-message')) {
            existingMsg.textContent = "グラフ表示に必要なデータが不足";
        } else {
             const noDataMsg = document.createElement('p');
             noDataMsg.textContent = "グラフ表示に必要なデータが不足";
             noDataMsg.className = 'chart-message'; // Add class for easy removal
             noDataMsg.style.textAlign = 'center';
             historyChartCanvas.parentNode.insertBefore(noDataMsg, historyChartCanvas);
        }
        return;
    } else {
        historyChartCanvas.style.display = 'block';
        const existingMsg = historyChartCanvas.previousElementSibling;
        if (existingMsg && existingMsg.classList.contains('chart-message')) existingMsg.remove();
    }


    const labels = dataPointsForChart.map(d => new Date(d.timestamp).toLocaleTimeString([], { second:'2-digit', fractionalSecondDigits:1 }));
    const datasets = [];
    if (dataPointsForChart.some(d => d.accelZ !== null)) datasets.push({ label: 'Accel Z', data: dataPointsForChart.map(d => d.accelZ), borderColor: 'rgba(75,192,192,0.8)', fill:false, yAxisID: 'yAccel' });
    if (dataPointsForChart.some(d => isFinite(d.decibels))) datasets.push({ label: '音量dBFS', data: dataPointsForChart.map(d => isFinite(d.decibels) ? d.decibels : null), borderColor: 'rgba(153,102,255,0.8)', fill:false, yAxisID: 'yDb' });
    if (dataPointsForChart.some(d => d.temperature_celsius !== null)) datasets.push({ label: '気温°C', data: dataPointsForChart.map(d => d.temperature_celsius), borderColor: 'rgba(255,99,71,0.8)', fill:false, yAxisID: 'yTemp' });

    historyChartInstance = new Chart(historyChartCanvas.getContext('2d'), {
        type: 'line', data: { labels, datasets },
        options: { responsive: true, maintainAspectRatio: false,
            scales: {
                x: { title: { display: true, text: '時間' } },
                yAccel: { type: 'linear', position: 'left', title: {display:true, text:'加速度(m/s²)'}},
                yDb: { type: 'linear', position: 'right', title: {display:true, text:'音量(dBFS)'}, grid:{drawOnChartArea:false}},
                yTemp: { type: 'linear', position: 'right', title: {display:true, text:'気温(°C)'}, grid:{drawOnChartArea:false,}, suggestedMin:0, suggestedMax: 40},
            }
        }
    });
}
backToHistoryListButton.addEventListener('click', displayHistoryList);

function loadAndDisplayHistory() {
    loadHistoryFromLocalStorage();
    displayHistoryList();
}

// --- Sensor Card Toggle Logic ---
document.querySelectorAll('.sensor-card-toggle').forEach(card => {
    card.addEventListener('click', (event) => {
        if (event.target.closest('md-icon-button, md-filled-button, a, select')) return;
        card.classList.toggle('card-expanded');
    });
});


// --- Initial Setup ---
document.addEventListener('DOMContentLoaded', () => {
    loadHistoryFromLocalStorage();
    initializeSensorDisplay(); // Sets initial status texts based on API availability
    showPage('recordPage');
});
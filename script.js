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

// Gyroscope elements - differentiate summary and detail
const gyroCard = document.querySelector('#recordPage md-card:nth-of-type(3)'); // Select the Gyro card
const gyroBetaEl = gyroCard.querySelector('#gyro-beta'); // Summary element
const gyroAlphaEl = gyroCard.querySelector('#gyro-alpha'); // Detail element
const gyroBetaDetailEl = gyroCard.querySelector('#gyro-beta-detail'); // Detail element
const gyroGammaEl = gyroCard.querySelector('#gyro-gamma'); // Detail element
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

// Geolocation & Weather UI Elements - differentiate summary and detail
const geoCard = document.querySelector('#recordPage md-card:nth-of-type(7)'); // Select the Geo/Weather card
const geoLatEl = geoCard.querySelector('#geo-lat'); // Summary element
const geoLonEl = geoCard.querySelector('#geo-lon'); // Summary element
const geoAddressEl = geoCard.querySelector('#geo-address'); // Summary element
const weatherTempEl = geoCard.querySelector('#weather-temp'); // Summary element

const geoLatDetailEl = geoCard.querySelector('#geo-lat-detail'); // Detail element
const geoLonDetailEl = geoCard.querySelector('#geo-lon-detail'); // Detail element
const geoAccEl = geoCard.querySelector('#geo-acc'); // Detail element
const geoAltEl = geoCard.querySelector('#geo-alt'); // Detail element
const geoSpeedEl = geoCard.querySelector('#geo-speed'); // Detail element
const geoHeadEl = geoCard.querySelector('#geo-head'); // Detail element
const geoAddressDetailEl = geoCard.querySelector('#geo-address-detail'); // Detail element
const weatherTempDetailEl = geoCard.querySelector('#weather-temp-detail'); // Detail element

const geoAddressStatusEl = geoCard.querySelector('#geo-address-status');
const geoStatusEl = geoCard.querySelector('#geo-status');
const weatherStatusEl = geoCard.querySelector('#weather-status');


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

// Dialogs
const deleteConfirmDialog = document.getElementById('deleteConfirmDialog');
const confirmDeleteButton = document.getElementById('confirmDeleteButton');
const deleteDialogSessionInfo = document.getElementById('deleteDialogSessionInfo');
let sessionIdToDelete = null;

const recordingTagsDialog = document.getElementById('recordingTagsDialog');


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
    address: null,
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
let lastFetchedAddressCoords = { lat: null, lon: null };
let lastReverseGeocodeFetchTime = 0;
const REVERSE_GEOCODE_INTERVAL_MS = 15000;
const REVERSE_GEOCODE_MIN_COORD_CHANGE = 0.0005;

// Pedometer Variables
let currentSessionTotalSteps = 0;
let pedometer_last_accel_mag = 0;
let pedometer_trending_up = false;
let pedometer_last_step_time = 0;
const PEDOMETER_MAGNITUDE_HIGH_THRESHOLD = 11.5;
const PEDOMETER_MIN_TIME_BETWEEN_STEPS_MS = 280;

// Permission & Init State
let motionPermissionGranted = false;
let orientationPermissionGranted = false;
let sensorsInitialized = false; // Flag indicating if we've attempted to start listeners/sensors
let anySensorListenerActive = false; // Flag indicating if at least one sensor listener is actively running/watching

const needsExplicitPermission = (window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function') ||
                            (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') ||
                            (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) ||
                            (navigator.geolocation) ||
                            ('AmbientLightSensor' in window && navigator.permissions && navigator.permissions.query);


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
    if (pageId === 'historyPage') {
        loadAndDisplayHistory();
    } else {
         // When navigating back to record page, destroy history chart if it exists
         if (historyChartInstance) {
              historyChartInstance.destroy();
              historyChartInstance = null;
               // Remove any "no data" message that might be lingering
              const previousMessage = historyChartCanvas?.previousElementSibling;
              if(previousMessage && previousMessage.textContent.includes("グラフ表示に必要なセンサーデータ")) {
                  previousMessage.remove();
              }
               const noCanvasMessage = historyDetailView?.querySelector('p')
               if(noCanvasMessage && (noCanvasMessage.textContent.includes("グラフ表示要素が見つかりません") || noCanvasMessage.textContent.includes("グラフ表示コンテキストの取得に失敗しました"))) {
                   noCanvasMessage.remove();
               }
         }
         // Ensure history detail view is hidden
         historyDetailView.style.display = 'none';
         historyListContainer.style.display = 'block'; // Always go back to list view first
    }
}
navRecordTab.addEventListener('click', () => showPage('recordPage'));
navHistoryTab.addEventListener('click', () => showPage('historyPage'));
navRecordTab.active = true;


// --- Sensor Permission and Initialization ---
function updateRecordingButtonState() {
    if (!startRecordingIconButton || !stopRecordingIconButton || !downloadCSVIconButton) return;

    const permissionIconEl = sensorPermissionIconButton ? sensorPermissionIconButton.querySelector('md-icon') : null;

     // Determine which permissions *can* be explicitly requested
     const canRequestMotion = (window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function' && !motionPermissionGranted);
     const canRequestOrientation = (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function' && !orientationPermissionGranted);
     const canRequestMedia = (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && (!micPermissionGranted || !cameraPermissionGranted));
     const canRequestGeolocation = (navigator.geolocation && !geolocationPermissionGranted);
     // Ambient light permission is tricky; query state changes but no standard requestPermission

    const permissionNeeded = canRequestMotion || canRequestOrientation || canRequestMedia || canRequestGeolocation;

    if (needsExplicitPermission && permissionNeeded && sensorPermissionIconButton) {
        sensorPermissionIconButton.style.display = 'inline-flex';
        sensorPermissionIconButton.disabled = false;
        if (permissionIconEl) permissionIconEl.textContent = 'lock';
        sensorPermissionIconButton.title = 'センサーアクセス許可をリクエスト';
    } else if (sensorPermissionIconButton) {
        // Hide if no explicit API exists, or disable if all *needed* explicit permissions are granted
         if (!needsExplicitPermission) {
              sensorPermissionIconButton.style.display = 'none';
         } else {
              sensorPermissionIconButton.style.display = 'inline-flex';
              sensorPermissionIconButton.disabled = true; // Disable if no explicit permission needed or all needed granted
              if (permissionIconEl) permissionIconEl.textContent = 'lock_open';
              sensorPermissionIconButton.title = 'センサーアクセスは許可済みまたは不要です';
         }
    }


    // Determine if recording *could* theoretically start (at least one sensor type is available or trying)
     // This doesn't mean permission is granted yet, just that the capability exists.
    const anySensorCapability = !!window.DeviceMotionEvent || !!window.DeviceOrientationEvent || 'AmbientLightSensor' in window || (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) || 'geolocation' in navigator;


    // Determine if essential sensors are ready for recording based on granted permissions.
    const essentialSensorsReady = (motionPermissionGranted || !(window.DeviceMotionEvent)) && // Motion/Orientation API exists OR permission granted if needed
                                  (orientationPermissionGranted || !(window.DeviceOrientationEvent)) &&
                                  ('AmbientLightSensor' in window ? true : true) && // Ambient Light doesn't require explicit requestPermission for 'ready' state check here
                                  (micPermissionGranted || !(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) && // Media API exists OR permission granted if needed
                                  (cameraPermissionGranted || !(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) &&
                                  (geolocationPermissionGranted || !('geolocation' in navigator)); // Geo API exists OR permission granted if needed


    // Check if *at least one* type of sensor listener is active.
    // This is a better indicator of readiness than just permission flags, as init might fail silently sometimes.
    anySensorListenerActive = (window.DeviceMotionEvent && (motionPermissionGranted || typeof DeviceMotionEvent.requestPermission !== 'function')) ||
                              (window.DeviceOrientationEvent && (orientationPermissionGranted || typeof DeviceOrientationEvent.requestPermission !== 'function')) ||
                              ('AmbientLightSensor' in window && lightStatusEl.textContent.includes("監視中")) ||
                              (micPermissionGranted && microphoneStream) ||
                              (cameraPermissionGranted && cameraStream) ||
                              (geolocationPermissionGranted && geoWatchId);


    startRecordingIconButton.disabled = !anySensorListenerActive || isRecording;
    stopRecordingIconButton.disabled = !anySensorListenerActive || !isRecording;
    downloadCSVIconButton.disabled = isRecording || allRecordedSessions.length === 0;

    takePictureButton.disabled = !cameraPermissionGranted || !cameraStream || isRecording; // Disable photo during recording

    if (isRecording) {
        recordingStatusEl.textContent = `記録中... (${currentRecordingData.length}件)`;
    } else if (allRecordedSessions.length > 0) {
         const lastSession = allRecordedSessions.reduce((latest, session) => session.id > latest.id ? session : latest, allRecordedSessions[0]); // Find the latest session by ID
         const dataCount = lastSession && lastSession.data ? lastSession.data.length : 0;
         // Check if tags were applied (dialog was confirmed). Assume '未選択' means cancelled/skipped.
         if (lastSession && lastSession.tags && lastSession.tags.color !== '未選択') {
              const sessionSavedTime = new Date(lastSession.id).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
             recordingStatusEl.textContent = `記録停止。履歴に${dataCount}件保存 (${sessionSavedTime})。CSVダウンロード可。`;
         } else {
              // This state is only possible if stopRecording was called but dialog was cancelled/skipped
             recordingStatusEl.textContent = `記録停止。データ(${dataCount}件)は破棄されました。`;
         }
    } else if (anySensorListenerActive) {
        recordingStatusEl.textContent = "センサー監視中。記録を開始できます。";
    } else if (sensorsInitialized && !anySensorListenerActive) {
         // Sensors were initialized, but none could start or get permission
        let statusMessages = [];
         if (!motionPermissionGranted && window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission !== 'function') statusMessages.push("動作センサー非対応");
         if (!orientationPermissionGranted && window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission !== 'function') statusMessages.push("向きセンサー非対応");
         if (!('AmbientLightSensor' in window)) statusMessages.push("光センサー非対応");
         if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) statusMessages.push("メディアAPI非対応");
         if (!('geolocation' in navigator)) statusMessages.push("GPS非対応");

         if (statusMessages.length > 0) {
             recordingStatusEl.textContent = statusMessages.join(" / ") + "。";
         } else {
             // Should not happen if initialization ran, but catch-all
              recordingStatusEl.textContent = "利用可能なセンサーがないか、初期化に失敗しました。";
         }

    } else if (needsExplicitPermission && permissionNeeded) {
         let missingPerms = [];
         // Only list permissions that *can* be explicitly requested and are not yet granted
         if (canRequestMotion) missingPerms.push("動作");
         if (canRequestOrientation) missingPerms.push("向き"); // Motion/Orientation often linked
         if (canRequestMedia) missingPerms.push("マイク/カメラ");
         if (canRequestGeolocation) missingPerms.push("位置情報");

         const updateStatusText = (perms) => {
              if (perms.length > 0 && sensorPermissionIconButton && !sensorPermissionIconButton.disabled) {
                   recordingStatusEl.textContent = `左の🔒アイコンから${perms.join('/')}アクセスを許可してください。`;
              } else if (anySensorListenerActive) {
                   recordingStatusEl.textContent = "センサー監視中。記録を開始できます。";
              }
              else {
                   // Fallback if permission is needed but button is disabled (already prompted?) or no specific prompt needed/available
                   recordingStatusEl.textContent = "センサー初期化中、または許可が必要です。";
              }
         };
         updateStatusText(missingPerms);

    } else {
        recordingStatusEl.textContent = "センサー初期化中...";
    }

     // Update individual sensor status elements if permission is required but not granted yet
     if (needsExplicitPermission && permissionNeeded) {
          if (canRequestMotion || canRequestOrientation) {
               accelStatusEl.textContent = "許可が必要"; accelStatusEl.classList.remove('error', 'not-supported');
               gyroStatusEl.textContent = "許可が必要"; gyroStatusEl.classList.remove('error', 'not-supported');
               orientStatusEl.textContent = "許可が必要"; orientStatusEl.classList.remove('error', 'not-supported');
               pedometerStatusEl.textContent = "許可が必要"; pedometerStatusEl.classList.remove('error', 'not-supported');
          }
           if (canRequestMedia) {
                micStatusEl.textContent = "許可が必要"; micStatusEl.classList.remove('error', 'not-supported');
                cameraStatusEl.textContent = "許可が必要"; cameraStatusEl.classList.remove('error', 'not-supported');
           }
            if (canRequestGeolocation) {
                geoStatusEl.textContent = "許可が必要"; geoStatusEl.classList.remove('error', 'not-supported');
                geoAddressStatusEl.textContent = "許可が必要";
                weatherStatusEl.textContent = "GPSアクセスが必要です";
            }
     } else if (!sensorsInitialized) {
          // If not initialized and no permission needed/requested, show initializing
          accelStatusEl.textContent = "初期化中..."; gyroStatusEl.textContent = "初期化中...";
          orientStatusEl.textContent = "初期化中..."; micStatusEl.textContent = "初期化中...";
          cameraStatusEl.textContent = "初期化中..."; geoStatusEl.textContent = "初期化中...";
          pedometerStatusEl.textContent = "初期化中...";
          lightStatusEl.textContent = "初期化中...";
          geoAddressStatusEl.textContent = "GPS許可後";
          weatherStatusEl.textContent = "GPS許可後";
     }
}

async function initializeSensors() {
    if (sensorsInitialized) return; // Only run the setup logic once

    // Add event listeners if API exists. They won't receive data until permission is granted if needed.
    if (window.DeviceMotionEvent) {
        window.addEventListener('devicemotion', handleMotionEvent, { passive: true });
        // Initial status set by updateRecordingButtonState or later when data arrives
         anySensorListenerActive = true; // Listener is active, waiting for data/permission
    } else {
        accelStatusEl.textContent = '加速度センサー非対応'; accelStatusEl.classList.add('not-supported');
        gyroStatusEl.textContent = 'ジャイロスコープ非対応'; gyroStatusEl.classList.add('not-supported');
        pedometerStatusEl.textContent = '加速度センサー非対応'; pedometerStatusEl.classList.add('not-supported');
    }

    if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', handleOrientationEvent, { passive: true });
        // Initial status set by updateRecordingButtonState or later when data arrives
         anySensorListenerActive = true; // Listener is active, waiting for data/permission
    } else {
        orientStatusEl.textContent = '向きセンサー非対応'; orientStatusEl.classList.add('not-supported');
    }

     // Initialize capabilities that might need permission or start automatically
    initializeLightSensor();
    initializeMicrophone();
    initializeCamera();
    initializeGeolocation(); // This starts watching if permission is already granted or doesn't need explicit prompt

    sensorsInitialized = true; // Mark initialization setup complete
    updateRecordingButtonState(); // Update button state based on initial permissions and listener status
}

async function requestAllPermissions() {
     if (!needsExplicitPermission) {
          console.log("Explicit permission request not needed in this environment.");
          updateRecordingButtonState(); // Just update state if button was somehow clicked
          return;
     }

     // Disable the button while requesting
     if(sensorPermissionIconButton) sensorPermissionIconButton.disabled = true;
     if(recordingStatusEl) recordingStatusEl.textContent = "アクセス許可をリクエスト中...";


     const results = [];

     // Request Motion and Orientation permissions if API exists and needed
     if (window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function' && !motionPermissionGranted) {
          results.push(
               DeviceMotionEvent.requestPermission()
               .then(state => {
                    if (state === 'granted') motionPermissionGranted = true;
                    console.log("DeviceMotionEvent permission state:", state);
               })
               .catch(err => console.error("DeviceMotionEvent permission failed:", err))
          );
     } else {
          // If API doesn't exist or no requestPermission, assume implicitly granted if DeviceMotionEvent exists
           if (window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission !== 'function') motionPermissionGranted = true;
     }

     if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function' && !orientationPermissionGranted) {
           results.push(
               DeviceOrientationEvent.requestPermission()
                .then(state => {
                    if (state === 'granted') orientationPermissionGranted = true;
                    console.log("DeviceOrientationEvent permission state:", state);
               })
               .catch(err => console.error("DeviceOrientationEvent permission failed:", err))
           );
     } else {
          // If API doesn't exist or no requestPermission, assume implicitly granted if DeviceOrientationEvent exists
           if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission !== 'function') orientationPermissionGranted = true;
     }

     // Request Media (Mic/Camera) and Geolocation permissions
     // These functions handle their own prompts and updates
     results.push(initializeMicrophone(true).catch(e => console.warn("Mic init failed after request:", e))); // Catch so Promise.allSettled doesn't stop
     results.push(initializeCamera(true).catch(e => console.warn("Camera init failed after request:", e)));
     results.push(initializeGeolocation(true).catch(e => console.warn("Geo init failed after request:", e)));

     // No explicit requestPermission for AmbientLightSensor usually, initializeLightSensor handles it.

     // Wait for all requests to finish (succeed or fail)
     await Promise.allSettled(results);

     console.log("Permission requests finished.");
     // Re-run initialization to start sensors based on the new permission states
     // initializeSensors() already called on load to set up listeners.
     // Now, just update states and re-attempt starts within specific sensor init functions if needed.
     updateRecordingButtonState(); // Final state update after all attempts
}

// --- Sensor Event Handlers ---
function handleMotionEvent(event) {
    // Check if event properties exist before using
    if (event.accelerationIncludingGravity) {
        const { x, y, z } = event.accelerationIncludingGravity;
        currentSensorValues.accelX = x; currentSensorValues.accelY = y; currentSensorValues.accelZ = z;
        accelXEl.textContent = x !== null ? x.toFixed(2) : '-'; accelYEl.textContent = y !== null ? y.toFixed(2) : '-'; accelZEl.textContent = z !== null ? z.toFixed(2) : '-';
        requestAnimationFrame(() => {
            // Clamp bar height to 100%
            accelBarX.style.height = `${Math.min(100, (Math.abs(x || 0) / BAR_MAX_ACCEL) * 100)}%`;
            accelBarY.style.height = `${Math.min(100, (Math.abs(y || 0) / BAR_MAX_ACCEL) * 100)}%`;
            accelBarZ.style.height = `${Math.min(100, (Math.abs(z || 0) / BAR_MAX_ACCEL) * 100)}%`;
        });
        accelStatusEl.textContent = "監視中..."; accelStatusEl.classList.remove('error', 'not-supported');
        anySensorListenerActive = true; // Indicate motion data is coming in
    } else if (window.DeviceMotionEvent && accelStatusEl.textContent.includes("監視中")) {
         // API exists and listener is active, but data is null for acceleration
         accelStatusEl.textContent = "加速度データなし"; accelStatusEl.classList.remove('error', 'not-supported');
         currentSensorValues.accelX = null; currentSensorValues.accelY = null; currentSensorValues.accelZ = null;
         accelXEl.textContent = '-'; accelYEl.textContent = '-'; accelZEl.textContent = '-';
         accelBarX.style.height = '0%'; accelBarY.style.height = '0%'; accelBarZ.style.height = '0%';
    }

    if (event.rotationRate) {
        const { alpha, beta, gamma } = event.rotationRate;
        currentSensorValues.gyroAlpha = alpha; currentSensorValues.gyroBeta = beta; currentSensorValues.gyroGamma = gamma;
        // Update both summary and detail elements
        if (gyroAlphaEl) gyroAlphaEl.textContent = alpha !== null ? alpha.toFixed(2) : '-';
        if (gyroBetaEl) gyroBetaEl.textContent = beta !== null ? beta.toFixed(2) : '-';
        if (gyroBetaDetailEl) gyroBetaDetailEl.textContent = beta !== null ? beta.toFixed(2) : '-';
        if (gyroGammaEl) gyroGammaEl.textContent = gamma !== null ? gamma.toFixed(2) : '-';

        gyroStatusEl.textContent = "監視中..."; gyroStatusEl.classList.remove('error', 'not-supported');
         anySensorListenerActive = true; // Indicate gyro data is coming in
    } else if (window.DeviceMotionEvent && gyroStatusEl.textContent.includes("監視中")){
         // API exists and listener is active, but data is null for rotation rate
         gyroStatusEl.textContent = "ジャイロデータなし"; gyroStatusEl.classList.remove('error', 'not-supported');
         currentSensorValues.gyroAlpha = null; currentSensorValues.gyroBeta = null; currentSensorValues.gyroGamma = null;
         if (gyroAlphaEl) gyroAlphaEl.textContent = '-'; if (gyroBetaEl) gyroBetaEl.textContent = '-'; if (gyroBetaDetailEl) gyroBetaDetailEl.textContent = '-'; if (gyroGammaEl) gyroGammaEl.textContent = '-';
    }


    // Pedometer logic using accelerationIncludingGravity
    if (event.accelerationIncludingGravity) {
        const { x, y, z } = event.accelerationIncludingGravity;
         // Ensure x, y, z are numbers, default to 0 if null
        const currentAccelX = x !== null ? x : 0;
        const currentAccelY = y !== null ? y : 0;
        const currentAccelZ = z !== null ? z : 0;

        const mag = Math.sqrt(currentAccelX**2 + currentAccelY**2 + currentAccelZ**2); // Fixed typo y**2**2
        currentSensorValues.steps_interval = 0; // Reset for this interval

        if (isRecording) {
            const now = Date.now();
            // Simple peak detection for steps
            if (mag > pedometer_last_accel_mag) {
                pedometer_trending_up = true;
            } else if (mag < pedometer_last_accel_mag && pedometer_trending_up) {
                // Found a peak, check if it's a step
                if (pedometer_last_accel_mag > PEDOMETER_MAGNITUDE_HIGH_THRESHOLD &&
                    (now - pedometer_last_step_time) > PEDOMETER_MIN_TIME_BETWEEN_STEPS_MS) {
                    currentSessionTotalSteps++;
                    currentSensorValues.steps_interval = 1; // Mark that a step occurred in this interval
                    pedometer_last_step_time = now;
                    if (pedometerStepsEl) pedometerStepsEl.textContent = currentSessionTotalSteps;
                }
                pedometer_trending_up = false;
            }
            pedometer_last_accel_mag = mag;
        }
        pedometerStatusEl.textContent = "監視中..."; pedometerStatusEl.classList.remove('error', 'not-supported');
         anySensorListenerActive = true; // Indicate accelerometer data is coming in
    } else if (window.DeviceMotionEvent && pedometerStatusEl.textContent.includes("監視中")){
         pedometerStatusEl.textContent = "加速度データなし"; pedometerStatusEl.classList.remove('error', 'not-supported');
         // No acceleration data, steps cannot be counted
    }
     // updateRecordingButtonState(); // No need to call here constantly, only on permission/init changes
}
function handleOrientationEvent(event) {
    // Check if event properties exist before using
     const alpha = event.alpha;
     const beta = event.beta;
     const gamma = event.gamma;

    if (alpha !== null || beta !== null || gamma !== null) {
        anySensorListenerActive = true; // Indicate orientation data is coming in

         // Store values, use null if event property is null
        currentSensorValues.orientAlpha = alpha;
        currentSensorValues.orientBeta = beta;
        currentSensorValues.orientGamma = gamma;

        orientAlphaEl.textContent = alpha !== null ? alpha.toFixed(1) : '-';
        orientBetaEl.textContent = beta !== null ? beta.toFixed(1) : '-';
        orientGammaEl.textContent = gamma !== null ? gamma.toFixed(1) : '-';

        requestAnimationFrame(() => {
             // Apply rotations, default to 0 if null for visualization
             const zRot = alpha !== null ? alpha : 0;
             const xRot = beta !== null ? beta : 0;
             const yRot = gamma !== null ? gamma : 0;

            // Apply rotations in a specific order (e.g., Y then X then Z) for consistent results
             orientationCube.style.transform = `rotateZ(${zRot.toFixed(1)}deg) rotateX(${xRot.toFixed(1)}deg) rotateY(${yRot.toFixed(1)}deg)`;
        });
         orientStatusEl.textContent = "監視中..."; orientStatusEl.classList.remove('error', 'not-supported');

    } else if (window.DeviceOrientationEvent && orientStatusEl.textContent.includes("監視中")) {
         orientStatusEl.textContent = "向きデータなし"; orientStatusEl.classList.remove('error', 'not-supported');
         currentSensorValues.orientAlpha = null; currentSensorValues.orientBeta = null; currentSensorValues.orientGamma = null;
         orientAlphaEl.textContent = '-'; orientBetaEl.textContent = '-'; orientGammaEl.textContent = '-';
    }
     // updateRecordingButtonState(); // No need to call here constantly
}
function initializeLightSensor() {
    if (!('AmbientLightSensor' in window)) {
        lightStatusEl.textContent = '光センサー API 非対応'; lightStatusEl.classList.add('not-supported');
        currentSensorValues.illuminance = null; updateRecordingButtonState(); return;
    }
     // Check if sensor is already running/initialized
    if (lightStatusEl.textContent.includes("監視中")) {
        anySensorListenerActive = true; // Mark as active if status indicates so
        updateRecordingButtonState();
        return;
    }

    lightStatusEl.textContent = "初期化中...";
    const startSensor = () => {
        try {
            // Ensure frequency is reasonable, 1 Hz is fine for display
            const sensor = new AmbientLightSensor({ frequency: 1 });
            sensor.addEventListener('reading', () => {
                anySensorListenerActive = true;
                const illuminance = sensor.illuminance;
                currentSensorValues.illuminance = illuminance;
                lightValueEl.textContent = illuminance !== null ? illuminance.toFixed(0) : '-';
                lightStatusEl.textContent = "監視中..."; lightStatusEl.classList.remove('error', 'not-supported');
                if (illuminance === null || typeof illuminance === 'undefined') {
                     lightIconSun.style.display = 'none'; lightIconMoon.style.display = 'none';
                } else if (illuminance > 100) { lightIconSun.style.display = 'inline-block'; lightIconMoon.style.display = 'none'; }
                else if (illuminance < 10) { lightIconSun.style.display = 'none'; lightIconMoon.style.display = 'inline-block'; }
                else { lightIconSun.style.display = 'none'; lightIconMoon.style.display = 'none'; }
                 // No need to call updateRecordingButtonState here, status text itself is enough live feedback
            });
            sensor.addEventListener('error', event => {
                console.error('Light sensor error:', event.error.name, event.error.message);
                 if (event.error.name === 'NotAllowedError' || event.error.name === 'PermissionDeniedError') {
                     lightStatusEl.textContent = '光センサーアクセス拒否';
                 } else {
                    lightStatusEl.textContent = `光センサーエラー: ${event.error.name}`;
                 }
                lightStatusEl.classList.add('error');
                currentSensorValues.illuminance = null; lightValueEl.textContent = '-';
                anySensorListenerActive = false; // Mark as inactive on error
                updateRecordingButtonState(); // Update button state on error
            });
            sensor.start();
             // Update button state after attempting start, as it might implicitly grant permission
             updateRecordingButtonState();

        } catch (error) {
            console.error('Failed to start light sensor:', error);
            lightStatusEl.textContent = `光センサー開始失敗: ${error.name}`; lightStatusEl.classList.add('error');
            currentSensorValues.illuminance = null; lightValueEl.textContent = '-';
            anySensorListenerActive = false; // Mark as inactive on failure
            updateRecordingButtonState(); // Update button state on failure
        }
    };
    // Check permission state first if API is available
    if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: 'ambient-light-sensor' })
            .then(permissionStatus => {
                 console.log("AmbientLightSensor permission state:", permissionStatus.state);
                if (permissionStatus.state === 'granted') {
                    startSensor();
                }
                else if (permissionStatus.state === 'prompt') {
                    lightStatusEl.textContent = '光センサー: ブラウザが許可を求めている可能性';
                    updateRecordingButtonState(); // Button state needs updating
                }
                else { // denied
                    lightStatusEl.textContent = '光センサーアクセス拒否'; lightStatusEl.classList.add('error');
                    anySensorListenerActive = false;
                    updateRecordingButtonState(); // Button state needs updating
                }
                // Listen for future permission changes (e.g., user clicks the lock icon and grants permission)
                permissionStatus.onchange = () => {
                     console.log("AmbientLightSensor permission changed:", permissionStatus.state);
                     if (permissionStatus.state === 'granted') startSensor();
                     else if (permissionStatus.state !== 'prompt') {
                         lightStatusEl.textContent = '光センサーアクセス拒否'; lightStatusEl.classList.add('error');
                         anySensorListenerActive = false;
                     }
                     updateRecordingButtonState(); // Button state needs updating
                };
            })
            .catch(e => { console.warn("Ambient Light Sensor permission query failed, attempting to start directly.", e); startSensor(); });
    } else {
         console.warn("Permissions API not available for AmbientLightSensor, attempting to start directly.");
         startSensor(); // Attempt to start directly if permissions API is not available
    }
}
async function initializeMicrophone(forcePermissionRequest = false) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        micStatusEl.textContent = 'マイク API 非対応'; micStatusEl.classList.add('not-supported');
        micPermissionGranted = false; anySensorListenerActive = false; updateRecordingButtonState(); return Promise.resolve();
    }
     // If stream exists and we aren't forcing a new request, keep it.
    if (microphoneStream && !forcePermissionRequest) {
         micPermissionGranted = true; anySensorListenerActive = true; // Ensure flags are set if stream exists
         micStatusEl.textContent = "監視中..."; micStatusEl.classList.remove('error', 'not-supported');
         // Ensure viz is running if context is ok
         if (audioContext && audioContext.state !== 'closed' && analyserNode) {
              // Check if the visualization loop is active. A simple check is the status text or micDbfsEl.
              // If it's not showing '--' or already showing numbers, assume it's running.
              if (micDbfsEl.textContent === '-') {
                  console.log("[Mic] Restarting viz loop.");
                  requestAnimationFrame(getDecibels); // Start the loop again
              }
         } else {
              // Reinitialize audio context and nodes if they are missing/closed
              try {
                   audioContext = new (window.AudioContext || window.webkitAudioContext)();
                   analyserNode = audioContext.createAnalyser();
                   const source = audioContext.createMediaStreamSource(microphoneStream);
                   source.connect(analyserNode);
                   analyserNode.fftSize = 256;
                    if (audioContext.state === 'suspended') {
                        audioContext.resume().catch(e => console.error("[Mic] Error resuming AudioContext on init:", e));
                    }
                   // Start viz loop
                   requestAnimationFrame(getDecibels);
               } catch (e) {
                   console.error("[Mic] Failed to reinitialize AudioContext/Analyser:", e);
                   micStatusEl.textContent = `マイクエラー: ${e.name}`; micStatusEl.classList.add('error');
                   micPermissionGranted = false; anySensorListenerActive = false;
               }
         }
         updateRecordingButtonState();
         return Promise.resolve();
    }

     // If watch is running but we force a new request or it shouldn't be running, clear it
    if (microphoneStream) {
         microphoneStream.getTracks().forEach(track => track.stop());
         microphoneStream = null;
    }
     // Close AudioContext if open
    if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(e => console.error("[Mic] Error closing AudioContext:", e));
    }
    audioContext = null;
    analyserNode = null;
    micPermissionGranted = false; // Reset state
    currentSensorValues.decibels = null; micDbfsEl.textContent = "-"; micLevelBar.style.width = `0%`; micLevelBar.style.backgroundColor = 'var(--md-sys-color-surface-variant)'; // Reset display
    anySensorListenerActive = false; // Reset state

    micStatusEl.textContent = forcePermissionRequest ? "マイクアクセス許可を求めています..." : "マイクアクセス許可待機中...";
    micStatusEl.classList.remove('error', 'not-supported'); // Clear previous states

    try {
        microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        micPermissionGranted = true; anySensorListenerActive = true;
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
            // Use a flag or check state explicitly
            if (!micPermissionGranted || !analyserNode || !audioContext || audioContext.state === 'closed' || !microphoneStream || microphoneStream.getTracks().every(track => !track.enabled)) {
                 currentSensorValues.decibels = null; micDbfsEl.textContent = "-"; micLevelBar.style.width = `0%`;
                 micLevelBar.style.backgroundColor = 'var(--md-sys-color-surface-variant)'; // Reset bar color
                 anySensorListenerActive = false; // Stop loop if sensor is off
                 updateRecordingButtonState(); // Update button state if sensor stops unexpectedly
                 return; // Stop the loop if context/nodes are gone or stream is inactive
            }
             // If audioContext is suspended, try to resume and re-request frame
            if (audioContext.state === 'suspended') {
                audioContext.resume().then(() => {
                    if (audioContext.state === 'running') requestAnimationFrame(getDecibels);
                }).catch(e => console.error("[Mic] Error resuming AudioContext in getDecibels:", e));
                return; // Wait for resume before getting data
            }

            analyserNode.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
            let average = sum / bufferLength;
            // Simple conversion: map 0-255 to -80dBFS to 0dBFS (this is a rough approximation)
            let pseudoDbFs = average === 0 ? -Infinity : 20 * Math.log10(average / 255.0);
            pseudoDbFs = Math.max(-80, pseudoDbFs); // Clamp minimum displayed dBFS


            currentSensorValues.decibels = isFinite(pseudoDbFs) ? pseudoDbFs : null;
            micDbfsEl.textContent = isFinite(pseudoDbFs) ? pseudoDbFs.toFixed(1) : '-∞';

             // Bar level based on the 0-255 average, scale it for visual effect
            let levelPercent = Math.min(100, Math.max(0, (average / 150) * 100)); // Map 0-150 to 0-100% for bar
            micLevelBar.style.width = `${levelPercent}%`;
            micLevelBar.style.backgroundColor = (isFinite(pseudoDbFs) && pseudoDbFs > -15) ? 'var(--md-sys-color-error)' : ((isFinite(pseudoDbFs) && pseudoDbFs > -30) ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-secondary-container)');


            requestAnimationFrame(getDecibels); // Continue the loop
        }
         // Start the visualization loop only if context is running
        if (audioContext.state === 'running' || audioContext.state === 'suspended') { // Start even if suspended, it will try to resume
             requestAnimationFrame(getDecibels);
             anySensorListenerActive = true; // Mark as active if starting viz loop
        } else {
             console.warn("[Mic] AudioContext is not in a state to start viz:", audioContext.state);
             anySensorListenerActive = false;
        }

        updateRecordingButtonState();
        return Promise.resolve(microphoneStream);
    } catch (err) {
        console.error("[Mic] Microphone access error:", err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
           micStatusEl.textContent = 'マイクアクセス拒否';
           micPermissionGranted = false;
        } else if (err.name === 'NotFoundError') {
             micStatusEl.textContent = 'マイクが見つかりません';
             micPermissionGranted = false;
        }
        else {
           micStatusEl.textContent = `マイクエラー: ${err.name}`;
            micPermissionGranted = false;
        }
        micStatusEl.classList.add('error');
        currentSensorValues.decibels = null; micDbfsEl.textContent = "-"; micLevelBar.style.width = `0%`; micLevelBar.style.backgroundColor = 'var(--md-sys-color-surface-variant)';
        anySensorListenerActive = false; // Mark as inactive on failure
        updateRecordingButtonState();
        return Promise.reject(err);
    }
}
async function initializeCamera(forcePermissionRequest = false) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        cameraStatusEl.textContent = 'カメラ API 非対応'; cameraStatusEl.classList.add('not-supported');
        cameraPermissionGranted = false; updateRecordingButtonState(); return Promise.resolve();
    }
    // If stream exists and no force request, return existing stream state
    if (cameraStream && !forcePermissionRequest) {
         cameraStatusEl.textContent = "カメラ準備完了。撮影できます。"; cameraStatusEl.classList.remove('error', 'not-supported');
         cameraPreview.srcObject = cameraStream;
         cameraPreview.style.display = 'block';
         cameraPermissionGranted = true; anySensorListenerActive = true; updateRecordingButtonState(); // Ensure flag is true if stream exists
         return Promise.resolve();
    }
     // Stop existing stream if forcing a new request or no stream exists but we are trying to initialize
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    cameraPreview.srcObject = null;
    cameraPreview.style.display = 'none';
    cameraPermissionGranted = false; // Reset state
    anySensorListenerActive = false; // Reset state


    cameraStatusEl.textContent = forcePermissionRequest ? "カメラアクセス許可を求めています..." : "カメラアクセス許可待機中...";
    cameraStatusEl.classList.remove('error', 'not-supported'); // Clear previous states

    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        cameraPermissionGranted = true; anySensorListenerActive = true;
        cameraStatusEl.textContent = "カメラ準備完了。撮影できます。"; cameraStatusEl.classList.remove('error', 'not-supported');
        cameraPreview.srcObject = cameraStream;
        cameraPreview.style.display = 'block';
        updateRecordingButtonState();
        return Promise.resolve(cameraStream);
    } catch (err) {
        console.error("Camera access error:", err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
           cameraStatusEl.textContent = 'カメラアクセス拒否';
           cameraPermissionGranted = false;
        } else if (err.name === 'NotFoundError') {
             cameraStatusEl.textContent = 'カメラが見つかりません';
             cameraPermissionGranted = false;
        }
        else {
           cameraStatusEl.textContent = `カメラエラー: ${err.name}`;
            cameraPermissionGranted = false;
        }
        cameraStatusEl.classList.add('error');
        cameraPreview.style.display = 'none';
        anySensorListenerActive = false; // Mark as inactive on failure
        updateRecordingButtonState();
        return Promise.reject(err);
    }
}
takePictureButton.addEventListener('click', () => {
    if (!cameraStream || !cameraPermissionGranted || isRecording) {
         if(isRecording) alert("記録中は写真を撮影できません。");
         else alert("カメラが利用できません。");
         return;
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

    // Clear previous previews and show the new one
    lastPhotoPreviewContainer.innerHTML = '';
    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = `撮影した写真 ${new Date(photoTimestamp).toLocaleTimeString()}`;
    img.style.maxWidth = '100px'; img.style.maxHeight = '100px';
    img.style.border = '1px solid var(--md-sys-color-outline)'; img.style.borderRadius = '4px';
    img.style.cursor = 'pointer';
    img.onclick = () => { window.open(dataUrl, '_blank'); };
     const timestampP = document.createElement('p');
    timestampP.style.fontSize = '0.7em'; timestampP.style.color = 'var(--md-sys-color-secondary)'; timestampP.style.margin = '4px 0 0 0';
    timestampP.textContent = `${new Date(photoTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}に撮影`;
    lastPhotoPreviewContainer.appendChild(img);
    lastPhotoPreviewContainer.appendChild(timestampP);


    // Mark the latest sensor value interval with the photo ID if recording is active
    // This needs to be done when the photo is taken, not just on recording start/stop.
    // However, we only record currentSensorValues periodically. The simplest is to
    // store the photo ID and attach it to the *next* recorded interval data point.
     if (isRecording) {
         currentSensorValues.photoTakenId = photoTimestamp;
     } else {
         // If not recording, just display the photo, don't associate with data
         // (currentSensorValues isn't being recorded anyway)
     }


    cameraStatusEl.textContent = `${new Date(photoTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} に写真を撮影しました。`;
});


// --- Geolocation, Reverse Geocoding & Weather Logic ---
async function initializeGeolocation(forcePermissionRequest = false) {
    if (!('geolocation' in navigator)) {
        geoStatusEl.textContent = '位置情報 API 非対応'; geoStatusEl.classList.add('not-supported');
        geoAddressStatusEl.textContent = '位置情報 API 非対応';
        geolocationPermissionGranted = false; updateRecordingButtonState(); return Promise.resolve();
    }
    // If watch is running and not forcing a new request, ensure status is correct and return
    if (geoWatchId && !forcePermissionRequest) {
         geolocationPermissionGranted = true; anySensorListenerActive = true; // Ensure flags are set if watch is active
         geoStatusEl.textContent = "監視中..."; geoStatusEl.classList.remove('error', 'not-supported');
         geoAddressStatusEl.textContent = currentSensorValues.address ? `最終更新: ${new Date(lastReverseGeocodeFetchTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : "場所情報取得中...";
         weatherStatusEl.textContent = currentSensorValues.temperature_celsius ? `最終更新: ${new Date(lastWeatherFetchTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : "天気情報取得中...";

         // Also attempt to fetch current position immediately if watch is already running (useful on init)
         navigator.geolocation.getCurrentPosition(handlePosition, handleError, { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 });
         updateRecordingButtonState(); // Update button state
         return Promise.resolve();
    }

     // If watch is running but we force a new request or it shouldn't be running, clear it
    if (geoWatchId) {
         navigator.geolocation.clearWatch(geoWatchId);
         geoWatchId = null;
         geolocationPermissionGranted = false; // Assume we need to re-confirm permission if forced
         anySensorListenerActive = false; // Assume listener stops
    }
     // Reset displayed values and current sensor values
    if(geoLatEl) geoLatEl.textContent = '-'; if(geoLonEl) geoLonEl.textContent = '-';
    if(geoLatDetailEl) geoLatDetailEl.textContent = '-'; if(geoLonDetailEl) geoLonDetailEl.textContent = '-';
    if(geoAccEl) geoAccEl.textContent = '-'; if(geoAltEl) geoAltEl.textContent = '-';
    if(geoSpeedEl) geoSpeedEl.textContent = '-'; if(geoHeadEl) geoHeadEl.textContent = '-';
    if(geoAddressEl) geoAddressEl.textContent = '-'; if(geoAddressDetailEl) geoAddressDetailEl.textContent = '-';
    if(weatherTempEl) weatherTempEl.textContent = '-'; if(weatherTempDetailEl) weatherTempDetailEl.textContent = '-';

    currentSensorValues.latitude = null; currentSensorValues.longitude = null;
    currentSensorValues.gpsAccuracy = null; currentSensorValues.altitude = null;
    currentSensorValues.speed = null; currentSensorValues.heading = null;
    currentSensorValues.address = null; currentSensorValues.temperature_celsius = null;


    const handlePosition = (position) => {
        geolocationPermissionGranted = true; anySensorListenerActive = true;
        geoStatusEl.textContent = "監視中..."; geoStatusEl.classList.remove('error', 'not-supported');

        const { latitude, longitude, accuracy, altitude, speed, heading } = position.coords;
        currentSensorValues.latitude = latitude;
        currentSensorValues.longitude = longitude;
        currentSensorValues.gpsAccuracy = accuracy;
        currentSensorValues.altitude = altitude;
        currentSensorValues.speed = speed;
        currentSensorValues.heading = heading;

        // Update both summary and detail elements
        if(geoLatEl) geoLatEl.textContent = latitude !== null ? latitude.toFixed(5) : '-';
        if(geoLonEl) geoLonEl.textContent = longitude !== null ? longitude.toFixed(5) : '-';
        if(geoLatDetailEl) geoLatDetailEl.textContent = latitude !== null ? latitude.toFixed(5) : '-';
        if(geoLonDetailEl) geoLonDetailEl.textContent = longitude !== null ? longitude.toFixed(5) : '-';

        if(geoAccEl) geoAccEl.textContent = accuracy !== null ? accuracy.toFixed(1) : '-';
        if(geoAltEl) geoAltEl.textContent = altitude !== null ? altitude !== null ? altitude.toFixed(1) : '-' : '-'; // Handle potential null
        if(geoSpeedEl) geoSpeedEl.textContent = speed !== null ? speed !== null ? speed.toFixed(2) : '-' : '-'; // Handle potential null
        if(geoHeadEl) geoHeadEl.textContent = heading !== null && !isNaN(heading) ? heading.toFixed(1) : '-'; // Handle null and NaN heading

        // Fetch reverse geocode and weather if new significant position or stale
        const now = Date.now();
        const latChanged = (latitude === null || lastFetchedAddressCoords.lat === null) || Math.abs(latitude - lastFetchedAddressCoords.lat) > REVERSE_GEOCODE_MIN_COORD_CHANGE;
        const lonChanged = (longitude === null || lastFetchedAddressCoords.lon === null) || Math.abs(longitude - lastFetchedAddressCoords.lon) > REVERSE_GEOCODE_MIN_COORD_CHANGE;


        if (latitude !== null && longitude !== null) {
            // Fetch address if coordinates changed significantly or it hasn't been fetched recently
            if ((latChanged || lonChanged || currentSensorValues.address === null) &&
                (now - lastReverseGeocodeFetchTime > REVERSE_GEOCODE_INTERVAL_MS)) {
                 console.log("[Geo] Coordinates changed or address stale, fetching address...");
                fetchReverseGeocode(latitude, longitude);
                lastFetchedAddressCoords = { lat: latitude, lon: longitude };
                // lastReverseGeocodeFetchTime is updated within fetchReverseGeocode on success
            } else if (currentSensorValues.address) {
                 // If coords haven't changed significantly and we have an address, just update status text time
                 geoAddressStatusEl.textContent = `最終更新: ${new Date(lastReverseGeocodeFetchTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            } else {
                 // If we have coordinates but no address, keep trying or show pending
                 geoAddressStatusEl.textContent = "場所情報取得中...";
            }

            // Fetch weather if coordinates changed significantly or enough time has passed
            if ((latChanged || lonChanged || currentSensorValues.temperature_celsius === null || (now - lastWeatherFetchTime > WEATHER_FETCH_INTERVAL_MS))) {
                 console.log("[Geo] Coordinates changed or weather stale, fetching weather...");
                 fetchWeatherData(latitude, longitude);
                 // lastWeatherFetchTime is updated within fetchWeatherData on success
            } else if (currentSensorValues.temperature_celsius !== null) {
                 // If coords haven't changed significantly and we have weather, just update status text time
                 weatherStatusEl.textContent = `最終更新: ${new Date(lastWeatherFetchTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            } else {
                 // If we have coordinates but no weather, keep trying or show pending
                 weatherStatusEl.textContent = "天気情報取得中...";
            }
        } else {
             // If coords are null, clear address/weather and update statuses
            currentSensorValues.address = null;
            currentSensorValues.temperature_celsius = null;
            if(geoAddressEl) geoAddressEl.textContent = '-';
            if(geoAddressDetailEl) geoAddressDetailEl.textContent = '-';
            if(weatherTempEl) weatherTempEl.textContent = '-';
             if(weatherTempDetailEl) weatherTempDetailEl.textContent = '-';
            geoAddressStatusEl.textContent = "GPS座標不明";
            weatherStatusEl.textContent = "GPS座標不明";
        }

        updateRecordingButtonState();
    };

    const handleError = (error) => {
        console.error('Geolocation error:', error);
        let message = 'GPSエラー';
        let detailMessage = 'GPSエラー';
        if (error.code === 1) {
             message = 'GPSアクセス拒否';
             detailMessage = 'GPSアクセス拒否';
             geolocationPermissionGranted = false; // Explicitly set false on denial
             anySensorListenerActive = false;
        }
        else if (error.code === 2) { message = 'GPS位置取得不能'; detailMessage = 'GPS位置取得不能'; }
        else if (error.code === 3) { message = 'GPSタイムアウト'; detailMessage = 'GPSタイムアウト'; }
        geoStatusEl.textContent = message; geoStatusEl.classList.add('error');
        geoAddressStatusEl.textContent = detailMessage;
        weatherStatusEl.textContent = detailMessage;
         // Clear dynamic fields on error
         if(geoLatEl) geoLatEl.textContent = '-';
         if(geoLonEl) geoLonEl.textContent = '-';
         if(geoLatDetailEl) geoLatDetailEl.textContent = '-';
         if(geoLonDetailEl) geoLonDetailEl.textContent = '-';
         if(geoAccEl) geoAccEl.textContent = '-';
         if(geoAltEl) geoAltEl.textContent = '-';
         if(geoSpeedEl) geoSpeedEl.textContent = '-';
         if(geoHeadEl) geoHeadEl.textContent = '-';
         if(geoAddressEl) geoAddressEl.textContent = '-';
         if(geoAddressDetailEl) geoAddressDetailEl.textContent = '-';
         if(weatherTempEl) weatherTempEl.textContent = '-';
          if(weatherTempDetailEl) weatherTempDetailEl.textContent = '-';

         currentSensorValues.latitude = null; currentSensorValues.longitude = null;
         currentSensorValues.gpsAccuracy = null; currentSensorValues.altitude = null;
         currentSensorValues.speed = null; currentSensorValues.heading = null;
         currentSensorValues.address = null; currentSensorValues.temperature_celsius = null;


        updateRecordingButtonState();
    };

     geoStatusEl.textContent = forcePermissionRequest ? "GPSアクセス許可を求めています..." : "GPS監視開始中...";
     geoAddressStatusEl.textContent = "GPSアクセス許可後";
     weatherStatusEl.textContent = "GPSアクセスが必要です";
     geoStatusEl.classList.remove('error', 'not-supported'); // Clear previous states

     // Always attempt to watch position if API is available. Permission handling is implicit in watchPosition.
     // If permission is already granted, it starts. If 'prompt', it prompts. If 'denied', it fails.
     // Using watchPosition ensures we get continuous updates.
     geoWatchId = navigator.geolocation.watchPosition(handlePosition, handleError, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }); // Increased timeout slightly
     anySensorListenerActive = true; // Assume listener is active, will update on error/success

     // We don't need to return a promise based on watchPosition here, as it's async and continuous.
     // The permission state and status updates happen via the callbacks.
     // For the explicit request case (`forcePermissionRequest`), the button handler waits for *other* promises (motion, media)
     // but geolocation watchPosition is fire-and-forget from the permission request perspective.

     // After starting watch, immediately check the permission state via Permissions API if available
     if (navigator.permissions && navigator.permissions.query) {
         navigator.permissions.query({ name: 'geolocation' }).then(p => {
             console.log("Geolocation permission state after watch start:", p.state);
             if (p.state === 'granted') geolocationPermissionGranted = true;
             else if (p.state === 'denied') geolocationPermissionGranted = false;
             updateRecordingButtonState(); // Update button state based on final known permission state
         }).catch(e => {
             console.warn("Geolocation permission query failed:", e);
             // If query fails, we rely on watchPosition callbacks to inform state.
             updateRecordingButtonState();
         });
     } else {
         // If Permissions API not available, rely solely on watchPosition callbacks
          updateRecordingButtonState();
     }
}


async function fetchReverseGeocode(latitude, longitude) {
    // Check if coordinates are valid numbers before fetching
    if (latitude === null || longitude === null || typeof latitude !== 'number' || typeof longitude !== 'number' || isNaN(latitude) || isNaN(longitude)) {
        console.warn("[RevGeo] Invalid coordinates, skipping fetch:", latitude, longitude);
         if(geoAddressEl) geoAddressEl.textContent = "-";
         if(geoAddressDetailEl) geoAddressDetailEl.textContent = "-";
         geoAddressStatusEl.textContent = "座標無効";
         currentSensorValues.address = null;
        return;
    }
    geoAddressStatusEl.textContent = "住所情報取得中...";
    // Do NOT clear currentSensorValues.address here, retain last good value until new one is fetched.
    // geoAddressEl.textContent and geoAddressDetailEl.textContent will be updated on success/failure.

    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude.toFixed(5)}&lon=${longitude.toFixed(5)}&accept-language=ja,en`;
        const response = await fetch(url);
        if (!response.ok) {
             const errorBody = await response.text().catch(() => "Unknown error body");
             console.error(`[RevGeo] API error: ${response.status} ${response.statusText}`, errorBody);
             throw new Error(`Nominatim API error: ${response.status}`);
        }
        const data = await response.json();
        if (data && data.display_name) {
            currentSensorValues.address = data.display_name;
            if(geoAddressEl) geoAddressEl.textContent = data.display_name;
            if(geoAddressDetailEl) geoAddressDetailEl.textContent = data.display_name;
            lastReverseGeocodeFetchTime = Date.now(); // Update time only on successful fetch
            geoAddressStatusEl.textContent = `最終更新: ${new Date(lastReverseGeocodeFetchTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } else {
            if(geoAddressEl) geoAddressEl.textContent = "取得失敗";
            if(geoAddressDetailEl) geoAddressDetailEl.textContent = "取得失敗";
            geoAddressStatusEl.textContent = "住所情報なし";
            currentSensorValues.address = null; // Clear value if fetch was OK but no display_name
        }
         geoAddressStatusEl.classList.remove('error');
    } catch (error) {
        console.error("[RevGeo] Failed to fetch reverse geocode data:", error);
        if(geoAddressEl) geoAddressEl.textContent = "取得エラー";
        if(geoAddressDetailEl) geoAddressDetailEl.textContent = "取得エラー";
        geoAddressStatusEl.textContent = "住所情報取得エラー";
        geoAddressStatusEl.classList.add('error');
        currentSensorValues.address = null; // Clear value on fetch error
    }
}

async function fetchWeatherData(latitude, longitude) {
    const now = Date.now();
    // Throttle requests
    if (now - lastWeatherFetchTime < WEATHER_FETCH_INTERVAL_MS) {
        return;
    }
     // Check if coordinates are valid numbers before fetching
    if (latitude === null || longitude === null || typeof latitude !== 'number' || typeof longitude !== 'number' || isNaN(latitude) || isNaN(longitude)) {
        console.warn("[Weather] Invalid coordinates, skipping fetch:", latitude, longitude);
        weatherStatusEl.textContent = "GPS座標不明"; weatherStatusEl.classList.add('error');
         if(weatherTempEl) weatherTempEl.textContent = "-";
          if(weatherTempDetailEl) weatherTempDetailEl.textContent = "-";
         currentSensorValues.temperature_celsius = null;
        return;
    }


    weatherStatusEl.textContent = "天気情報取得中..."; weatherStatusEl.classList.remove('error');
    // Using Open-Meteo.com - free, no key needed for basic weather.
    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude.toFixed(4)}&longitude=${longitude.toFixed(4)}&current_weather=true&timezone=auto`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            const errorText = await response.text().catch(() => "Unknown error body");
            console.error("[Weather] API error response text:", errorText);
            throw new Error(`API error: ${response.status}`);
        }
        const data = await response.json();

        if (data && data.current_weather && typeof data.current_weather.temperature !== 'undefined') {
            currentSensorValues.temperature_celsius = data.current_weather.temperature;
            if(weatherTempEl) weatherTempEl.textContent = data.current_weather.temperature.toFixed(1);
             if(weatherTempDetailEl) weatherTempDetailEl.textContent = data.current_weather.temperature.toFixed(1);
            weatherStatusEl.textContent = `最終更新: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            weatherStatusEl.classList.remove('error');
            lastWeatherFetchTime = now; // Update time only on successful fetch
        } else {
            console.warn("[Weather] Temperature data not found in response:", data);
            throw new Error("Temperature data not found in response.");
        }
    } catch (error) {
        console.error("[Weather] Failed to fetch weather data:", error);
        weatherStatusEl.textContent = "天気情報取得失敗"; weatherStatusEl.classList.add('error');
        if(weatherTempEl) weatherTempEl.textContent = "-";
         if(weatherTempDetailEl) weatherTempDetailEl.textContent = "-";
        // Do not clear currentSensorValues.temperature_celsius here, retain last known good value if any.
        // It will be overwritten on next successful fetch.
    }
}


// --- Recording Logic ---
function recordCurrentData() {
    if (!isRecording) return;
    const now = Date.now();
    // Create a clean snapshot
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
        steps_interval: currentSensorValues.steps_interval,
        photoTakenId: currentSensorValues.photoTakenId
    };

    currentRecordingData.push(dataToRecord);

    // Reset interval-specific values after they've been recorded once
    currentSensorValues.photoTakenId = null;
    currentSensorValues.steps_interval = 0;

    if (currentRecordingData.length % 10 === 0) {
        recordingStatusEl.textContent = `記録中... (${currentRecordingData.length}件)`;
    }
}

function startRecording() {
    if (!anySensorListenerActive) {
         if (needsExplicitPermission && sensorPermissionIconButton && !sensorPermissionIconButton.disabled) {
              alert("センサー利用の許可が必要です。左の🔒アイコンをタップして許可してください。");
         } else {
             alert("利用可能なセンサーがないか、センサーの初期化に失敗しています。ページをリロードしてみてください。");
         }
        return;
    }
     if (isRecording) return; // Prevent starting if already recording

    isRecording = true;
    currentRecordingData = [];
    currentRecordingPhotos = [];
    lastPhotoPreviewContainer.innerHTML = ""; // Clear photo preview from previous session

    // Reset pedometer for the new session
    currentSessionTotalSteps = 0;
    pedometerStepsEl.textContent = '0';
    pedometer_last_accel_mag = 0;
    pedometer_trending_up = false;
    pedometer_last_step_time = 0;

    // Reset interval-specific values in currentSensorValues
    currentSensorValues.photoTakenId = null;
    currentSensorValues.steps_interval = 0;


    // Weather and address are fetched/updated by their respective mechanisms if GPS is available
    // Ensure they are fetched/updated soon after recording starts if GPS is ready
    // Trigger immediate fetch attempts if GPS is potentially available
    if ('geolocation' in navigator) {
         lastWeatherFetchTime = 0; // Allow immediate weather fetch on start
         lastReverseGeocodeFetchTime = 0; // Allow immediate geocode fetch on start
         // The watchPosition handler will trigger fetches if coords are available
         // If coords are already available, the fetch will happen soon.
         // If not, they will happen once coords become available.
    }


    if (recordingIntervalId) clearInterval(recordingIntervalId); // Clear any stray interval
    recordingIntervalId = setInterval(recordCurrentData, RECORDING_INTERVAL_MS);
    updateRecordingButtonState();
}

function stopRecording() {
    if (!isRecording) return; // Only stop if recording is active
    isRecording = false;
    if (recordingIntervalId) {
        clearInterval(recordingIntervalId);
        recordingIntervalId = null;
    }

    // Capture the data and photos collected during this session BEFORE clearing the current buffers
     const sessionDataTemp = [...currentRecordingData];
     const sessionPhotosTemp = [...currentRecordingPhotos];
     const sessionTotalStepsTemp = currentSessionTotalSteps;

    // Clear buffers immediately so subsequent startRecording begins fresh
    currentRecordingData = [];
    currentRecordingPhotos = [];
    lastPhotoPreviewContainer.innerHTML = ""; // Clear photo preview

    // Reset pedometer display and counter for the *next* session
    pedometerStepsEl.textContent = '0';
    currentSessionTotalSteps = 0;

    // Reset pedometer internal state for the next recording session
    pedometer_last_accel_mag = 0;
    pedometer_trending_up = false;
    pedometer_last_step_time = 0;

     // Reset interval-specific values in currentSensorValues
     currentSensorValues.photoTakenId = null;
     currentSensorValues.steps_interval = 0;


    recordingStatusEl.textContent = "記録停止。タグ付けしてください...";
    updateRecordingButtonState(); // Update buttons state


     // If no data was recorded, skip the dialog and just update status/buttons
     if (sessionDataTemp.length === 0 && sessionPhotosTemp.length === 0) {
         recordingStatusEl.textContent = `記録を停止しました。データはありませんでした。`;
         updateRecordingButtonState();
         return;
     }


    // Show tag dialog
    recordingTagsDialog.show();

    // Handle dialog close (user clicked Save or Cancel)
    // Need to make sure this listener is only active *once* per stopRecording call
    // Remove any previous listener first to prevent duplicates if stop is called rapidly
    recordingTagsDialog.removeEventListener('closed', handleDialogClose);
    recordingTagsDialog.addEventListener('closed', handleDialogClose);

     function handleDialogClose(event) {
         // Use event.detail.action to determine which button was clicked ('confirm' or 'cancel')
         const action = event.detail.action;

         // IMPORTANT: Remove the listener *before* potentially showing another dialog or re-adding
         recordingTagsDialog.removeEventListener('closed', handleDialogClose);


        if (action === 'confirm') {
             const form = recordingTagsDialog.querySelector('#recordingTagsForm');
             const formData = new FormData(form);
             const sessionColor = formData.get('color') || '未選択';
             const sessionEmotion = formData.get('emotion') || '未選択';
             const sessionShape = formData.get('shape') || '未選択';
             form.reset(); // Reset form selections

             const sessionId = Date.now(); // Generate ID when saving
             const session = {
                 id: sessionId,
                 startTime: sessionDataTemp.length > 0 ? sessionDataTemp[0].timestamp : sessionId, // Use first data point time or dialog open time
                 endTime: sessionDataTemp.length > 0 ? sessionDataTemp[sessionDataTemp.length - 1].timestamp : sessionId, // Use last data point time or dialog open time
                 data: sessionDataTemp,
                 photos: sessionPhotosTemp,
                 totalSteps: sessionTotalStepsTemp,
                 tags: {
                     color: sessionColor,
                     emotion: sessionEmotion,
                     shape: sessionShape
                 }
             };

             allRecordedSessions.push(session);
             saveHistoryToLocalStorage(); // Save the new session to history

             recordingStatusEl.textContent = `記録を停止しました。${session.data.length}件のデータ、${session.photos.length}枚の写真を記録。履歴に追加されました。`;

        } else { // action === 'cancel' or dialog dismissed
              // Data was not saved to history
              recordingStatusEl.textContent = `記録を停止しました。データ(${sessionDataTemp.length}件)は破棄されました。`;
               const form = recordingTagsDialog.querySelector('#recordingTagsForm');
               form.reset(); // Reset form selections
        }

        updateRecordingButtonState(); // Update buttons now that recording is fully stopped and saved state is finalized
    }
}

function downloadCSV(session, filenamePrefix = "sensor_data") { // Accept session object now
    if (!session || (!session.data || session.data.length === 0) && (!session.photos || session.photos.length === 0)) {
        alert("記録データがありません。");
        return;
    }
    // CSV Header including session tags
    // Add columns for photo timestamps/IDs for alignment reference
    const header = "timestamp,accelX,accelY,accelZ,orientAlpha,orientBeta,orientGamma,gyroAlpha,gyroBeta,gyroGamma,illuminance,decibels,latitude,longitude,gpsAccuracy,altitude,speed,heading,temperature_celsius,steps_in_interval,photoTakenId,sessionColor,sessionEmotion,sessionShape";

    const rows = session.data.map(row => {
         const photoId = row.photoTakenId ? row.photoTakenId : '';
         // Include session tags in each row (repeat for every row)
         const sessionColor = session.tags?.color || '未選択';
         const sessionEmotion = session.tags?.emotion || '未選択';
         const sessionShape = session.tags?.shape || '未選択';

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
            row.altitude !== null ? row.altitude !== null ? row.altitude.toFixed(1) : '' : '',
            row.speed !== null ? row.speed !== null ? row.speed.toFixed(2) : '' : '',
            row.heading !== null && !isNaN(row.heading) ? row.heading.toFixed(1) : '', // Handle NaN heading
            row.temperature_celsius !== null ? row.temperature_celsius.toFixed(1) : '',
            row.steps_interval !== null ? row.steps_interval : '0',
            photoId,
             sessionColor,
             sessionEmotion,
             sessionShape
        ].map(value => `"${String(value).replace(/"/g, '""')}"`).join(','); // Basic CSV escaping
    });

     // Add photo data as separate rows? Or just use the photoTakenId?
     // For simplicity and linking to sensor data, just using photoTakenId seems fine for CSV.
     // If separate photo metadata rows are needed, that's a more complex structure.
     // Let's stick to sensor data with photo ID reference.

    const csvContent = header + "\n" + rows.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    const now = new Date(session.startTime);
    const timestampStr = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}${now.getSeconds().toString().padStart(2,'0')}`;
    link.setAttribute("href", url);
    link.setAttribute("download", `${filenamePrefix}_${timestampStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Status update after download on record page button
    if (filenamePrefix === "sensor_data_last") {
         // The status text is already updated by stopRecording/dialog close,
         // but we might add a temporary "Downloaded!" message if needed.
         // For now, just ensure button state is correct.
         updateRecordingButtonState();
    }
}
if(startRecordingIconButton) startRecordingIconButton.addEventListener('click', startRecording);
if(stopRecordingIconButton) stopRecordingIconButton.addEventListener('click', stopRecording);
if(downloadCSVIconButton) downloadCSVIconButton.addEventListener('click', () => {
     // Download button on record page downloads the *last saved* session in history
     if (allRecordedSessions.length > 0) {
          // Find the latest session in history (already sorted by ID/time in displayHistoryList, but re-find here)
          const lastSavedSession = allRecordedSessions.reduce((latest, session) => session.id > latest.id ? session : latest, allRecordedSessions[0]);
          downloadCSV(lastSavedSession, "sensor_data_last");
     } else {
          alert("ダウンロードできる記録データがありません。");
     }
});
if(sensorPermissionIconButton) {
     sensorPermissionIconButton.addEventListener('click', requestAllPermissions);
}


// --- History Logic ---
const HISTORY_STORAGE_KEY = 'sensorDemoProHistory_v3'; // Bump version due to adding tags and photo data URLs

function saveHistoryToLocalStorage() {
    try {
         // Store minimal data needed for history view, including tags, data, and photos
         const sessionsToStore = allRecordedSessions.map(session => ({
              id: session.id,
              startTime: session.startTime,
              endTime: session.endTime,
              data: session.data, // Keep sensor data
              photos: session.photos.map(photo => ({ // Keep photo data URLs
                   timestamp: photo.timestamp,
                   dataUrl: photo.dataUrl
              })),
              totalSteps: session.totalSteps,
              tags: session.tags || { color: '未選択', emotion: '未選択', shape: '未選択' } // Ensure tags exist
         }));
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(sessionsToStore));
         console.log(`History saved. ${allRecordedSessions.length} sessions.`);
    } catch (e) {
        console.error("Error saving history to localStorage:", e);
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
            // Ensure all necessary properties exist for older data formats and validate structure
            allRecordedSessions.forEach(session => {
                 // Ensure session ID is treated as a number for sorting
                 if (typeof session.id === 'string') session.id = parseInt(session.id, 10) || Date.now(); // Fallback if parse fails
                 // Ensure startTime is treated as a number
                 if (typeof session.startTime !== 'number') session.startTime = parseInt(session.startTime, 10) || session.id;

                if (!session.photos || !Array.isArray(session.photos)) session.photos = [];
                // Ensure photo objects have dataUrl
                 session.photos.forEach(photo => {
                     if (typeof photo.dataUrl !== 'string' || !photo.dataUrl.startsWith('data:')) {
                          console.warn("Discarding invalid photo data in history:", photo);
                         // Keep valid photos, discard invalid ones
                     }
                 });
                 session.photos = session.photos.filter(photo => typeof photo.dataUrl === 'string' && photo.dataUrl.startsWith('data:'));


                if (typeof session.totalSteps === 'undefined' || session.totalSteps === null || isNaN(session.totalSteps)) session.totalSteps = 0;
                if (!session.data || !Array.isArray(session.data)) session.data = []; // Ensure data is an array
                 // Validate data points (optional, but good for robustness)
                 session.data = session.data.filter(d => d !== null && typeof d === 'object' && typeof d.timestamp === 'number');

                 if (!session.tags || typeof session.tags !== 'object') session.tags = { color: '未選択', emotion: '未選択', shape: '未選択' }; // Add default tags if missing or wrong type
                 if (typeof session.tags.color === 'undefined' || session.tags.color === null) session.tags.color = '未選択';
                 if (typeof session.tags.emotion === 'undefined' || session.tags.emotion === null) session.tags.emotion = '未選択';
                 if (typeof session.tags.shape === 'undefined' || session.tags.shape === null) session.tags.shape = '未選択';
            });
             // Filter out potentially corrupt sessions (e.g., no id or start time after parsing)
            allRecordedSessions = allRecordedSessions.filter(session => session.id && typeof session.id === 'number' && session.startTime && typeof session.startTime === 'number');
             console.log(`History loaded. ${allRecordedSessions.length} sessions.`);

        } catch (e) {
            console.error("Error parsing history from localStorage:", e);
            allRecordedSessions = []; // Clear history on parse error
             alert("履歴データの読み込みに失敗しました。履歴をクリアします。");
        }
    } else {
        allRecordedSessions = [];
         console.log("No history found in localStorage.");
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
    allRecordedSessions.sort((a, b) => b.id - a.id); // Sort descending by timestamp (latest first)

    allRecordedSessions.forEach(session => {
        const sessionCard = document.createElement('md-elevated-card');
        sessionCard.style.marginBottom = '12px';
         sessionCard.classList.add('history-card'); // Add class for styling/selection
        const startTime = new Date(session.startTime);
        const endTime = session.endTime && session.endTime >= session.startTime ? session.endTime : session.startTime; // Handle sessions with only one point or end < start
        const durationMs = endTime - startTime;
        const durationSec = Math.max(0, Math.floor(durationMs / 1000)); // Ensure non-negative duration
        const durationMin = Math.floor(durationSec / 60);
        const formattedStartTime = startTime.toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

        // Find the first valid temperature entry for display
        let firstTempEntry = session.data.find(d => d.temperature_celsius !== null && typeof d.temperature_celsius === 'number' && !isNaN(d.temperature_celsius));
        let tempString = firstTempEntry ? `${firstTempEntry.temperature_celsius.toFixed(1)}°C` : "記録なし";

        // Ensure tags object exists and properties have default values
        const sessionTags = session.tags || { color: '未選択', emotion: '未選択', shape: '未選択' };
        const sessionColor = sessionTags.color || '未選択';
        const sessionEmotion = sessionTags.emotion || '未選択';
        const sessionShape = sessionTags.shape || '未選択';
        const tagString = `${sessionColor}, ${sessionEmotion}, ${sessionShape}`;

        // Create a tag indicator div
        const tagIndicator = document.createElement('div');
        tagIndicator.classList.add('history-tag-indicator');
         // Add color class based on color tag
         tagIndicator.classList.add(`tag-color-${sessionColor}`);


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
                    <md-icon style="font-size: 1.1em; vertical-align: middle; margin-right: 4px;">label</md-icon>
                    タグ: ${tagString}
                </p>
                 <p style="font-size: 0.9em; margin: 4px 0;">
                    <md-icon style="font-size: 1.1em; vertical-align: middle; margin-right: 4px;">thermostat</md-icon>
                    開始時気温 (目安): ${tempString}
                </p>
            </div>
        `;
        sessionCard.innerHTML = content;
         sessionCard.insertBefore(tagIndicator, sessionCard.firstChild); // Add indicator before content

        sessionCard.addEventListener('click', (event) => {
            // Check if the click target or any of its ancestors is the delete button or icon
            const target = event.target;
            if (target.closest('.delete-session-button') || target.closest('md-icon-button')) {
                 // Ignore clicks on the delete button
                 return;
            }
             // Handle card click for detail view
            displayHistoryDetail(session.id);
        });
        const deleteButton = sessionCard.querySelector('.delete-session-button');
        deleteButton.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent card click event from firing
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
// Using async/await for deleteSession to ensure state is updated before displayHistoryList
async function deleteSession(sessionId) {
     if (sessionId === null) return; // Prevent deleting null ID
     const initialCount = allRecordedSessions.length;
    allRecordedSessions = allRecordedSessions.filter(session => session.id !== sessionId);

     if (allRecordedSessions.length < initialCount) { // Only save if something was actually removed
         saveHistoryToLocalStorage();
     } else {
          console.warn(`Session with ID ${sessionId} not found for deletion.`);
     }


    // If currently viewing the deleted session detail, go back to list view
    if (historyDetailView.style.display === 'block' && historyDetailView.dataset.sessionId === String(sessionId)) {
         historyDetailView.style.display = 'none';
         historyListContainer.style.display = 'block';
          if (historyChartInstance) {
               historyChartInstance.destroy();
               historyChartInstance = null;
          }
          // Remove any "no data" message
          const previousMessage = historyChartCanvas?.previousElementSibling;
          if(previousMessage && previousMessage.textContent.includes("グラフ表示に必要なセンサーデータ")) {
              previousMessage.remove();
          }
          const noCanvasMessage = historyDetailView?.querySelector('p')
          if(noCanvasMessage && (noCanvasMessage.textContent.includes("グラフ表示要素が見つかりません") || noCanvasMessage.textContent.includes("グラフ表示コンテキストの取得に失敗しました"))) {
              noCanvasMessage.remove();
          }
    }
    displayHistoryList(); // Re-render the list
    updateRecordingButtonState(); // Update record page download button state
    sessionIdToDelete = null; // Reset delete state
}
confirmDeleteButton.addEventListener('click', () => {
    // Dialog closes automatically when button with form="dialog" is clicked
    if (sessionIdToDelete !== null) {
        deleteSession(sessionIdToDelete);
    }
});
deleteConfirmDialog.addEventListener('closed', (event) => {
    // Reset only if dialog was cancelled or closed in some way other than confirm
     if (event.detail.action === 'cancel' || event.detail.action === 'close') {
          sessionIdToDelete = null;
     }
});


function displayHistoryDetail(sessionId) {
    const session = allRecordedSessions.find(s => s.id === sessionId);
    if (!session) {
        console.error("Session not found:", sessionId);
        displayHistoryList(); // Fallback to list view
        return;
    }

    historyListContainer.style.display = 'none';
    historyDetailView.style.display = 'block';
    historyDetailView.dataset.sessionId = sessionId; // Store current session ID

    const startTime = new Date(session.startTime);
    const formattedStartTime = startTime.toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

    // Ensure tags exist and have default values
    const sessionTags = session.tags || { color: '未選択', emotion: '未選択', shape: '未選択' };
    const sessionColor = sessionTags.color || '未選択';
    const sessionEmotion = sessionTags.emotion || '未選択';
    const sessionShape = sessionTags.shape || '未選択';
    const tagString = `色: ${sessionColor}, 感情: ${sessionEmotion}, 形: ${sessionShape}`;


    historyDetailTitle.textContent = `記録詳細: ${formattedStartTime} (歩数: ${session.totalSteps || 0}歩, タグ: ${tagString})`;

    historyPhotosContainer.innerHTML = '';
    if (session.photos && session.photos.length > 0) {
        session.photos.forEach(photo => {
            const img = document.createElement('img');
            img.src = photo.dataUrl;
            img.alt = `Photo from ${new Date(photo.timestamp).toLocaleTimeString()}`;
            img.style.maxWidth = '100px'; img.style.maxHeight = '100px';
            img.style.borderRadius = '4px'; img.style.border = '1px solid var(--md-sys-color-outline-variant)';
            img.style.cursor = 'pointer';
            img.onclick = () => { window.open(photo.dataUrl, '_blank'); };
            historyPhotosContainer.appendChild(img);
        });
    } else {
        historyPhotosContainer.innerHTML = '<p style="font-size:0.9em; color:var(--md-sys-color-on-surface-variant);">この記録中に撮影された写真はありません。</p>';
    }

    exportHistoryCSVButton.onclick = () => downloadCSV(session, `sensor_data_history_${session.id}`);

    // Destroy existing chart before creating a new one
    if (historyChartInstance) historyChartInstance.destroy();

    // Ensure canvas exists and is in the DOM
    if (!historyChartCanvas) {
        console.error("History chart canvas element not found!");
        // Add a placeholder message
         let noCanvasMessage = historyDetailView.querySelector('p')
         if(noCanvasMessage && (noCanvasMessage.textContent.includes("グラフ表示要素が見つかりません") || noCanvasMessage.textContent.includes("グラフ表示コンテキストの取得に失敗しました"))) {
              // Message already exists, update if needed, or just leave it.
              noCanvasMessage.textContent = "グラフ表示要素が見つかりません。";
         } else {
              noCanvasMessage = document.createElement('p');
              noCanvasMessage.textContent = "グラフ表示要素が見つかりません。";
              noCanvasMessage.style.textAlign = 'center';
              noCanvasMessage.style.color = 'var(--md-sys-color-error)';
              // Find the h4 "センサーデータグラフ" and insert the message after it
               const chartTitle = historyDetailView.querySelector('h4');
              if (chartTitle) {
                 chartTitle.parentNode.insertBefore(noCanvasMessage, chartTitle.nextElementSibling);
              } else {
                   // Fallback if h4 title is not found
                   historyDetailView.insertBefore(noCanvasMessage, historyPhotosContainer);
              }
         }
        return;
    }
    const ctx = historyChartCanvas.getContext('2d');
     if (!ctx) {
        console.error("Could not get 2D context for history chart canvas!");
         let noCanvasMessage = historyDetailView.querySelector('p')
         if(noCanvasMessage && (noCanvasMessage.textContent.includes("グラフ表示要素が見つかりません") || noCanvasMessage.textContent.includes("グラフ表示コンテキストの取得に失敗しました"))) {
             noCanvasMessage.textContent = "グラフ表示コンテキストの取得に失敗しました。";
         } else {
              noCanvasMessage = document.createElement('p');
              noCanvasMessage.textContent = "グラフ表示コンテキストの取得に失敗しました。";
              noCanvasMessage.style.textAlign = 'center';
              noCanvasMessage.style.color = 'var(--md-sys-color-error)';
              const chartTitle = historyDetailView.querySelector('h4');
               if (chartTitle) {
                  chartTitle.parentNode.insertBefore(noCanvasMessage, chartTitle.nextElementSibling);
               } else {
                    historyDetailView.insertBefore(noCanvasMessage, historyPhotosContainer);
               }
         }
        return;
    }

    // Filter data for chart: only include points with *any* numerical sensor reading relevant to charts
    // This avoids plotting sparse data if only photos/location were captured briefly.
    const dataPointsForChart = session.data.filter(d =>
         d && typeof d === 'object' && ( // Ensure d is a valid object
             (d.accelX !== null && typeof d.accelX === 'number' && !isNaN(d.accelX)) ||
             (d.accelY !== null && typeof d.accelY === 'number' && !isNaN(d.accelY)) ||
             (d.accelZ !== null && typeof d.accelZ === 'number' && !isNaN(d.accelZ)) ||
             (d.orientAlpha !== null && typeof d.orientAlpha === 'number' && !isNaN(d.orientAlpha)) ||
             (d.orientBeta !== null && typeof d.orientBeta === 'number' && !isNaN(d.orientBeta)) ||
             (d.orientGamma !== null && typeof d.orientGamma === 'number' && !isNaN(d.orientGamma)) ||
             (d.gyroAlpha !== null && typeof d.gyroAlpha === 'number' && !isNaN(d.gyroAlpha)) ||
             (d.gyroBeta !== null && typeof d.gyroBeta === 'number' && !isNaN(d.gyroBeta)) ||
             (d.gyroGamma !== null && typeof d.gyroGamma === 'number' && !isNaN(d.gyroGamma)) ||
             (d.illuminance !== null && typeof d.illuminance === 'number' && !isNaN(d.illuminance)) ||
             (d.decibels !== null && isFinite(d.decibels)) || // isFinite checks for numbers excluding Infinity/NaN
             (d.latitude !== null && typeof d.latitude === 'number' && !isNaN(d.latitude)) ||
             (d.longitude !== null && typeof d.longitude === 'number' && !isNaN(d.longitude)) ||
             (d.altitude !== null && typeof d.altitude === 'number' && !isNaN(d.altitude)) ||
             (d.speed !== null && typeof d.speed === 'number' && !isNaN(d.speed)) ||
             (d.heading !== null && typeof d.heading === 'number' && !isNaN(d.heading)) || // Explicitly check for NaN heading
             (d.temperature_celsius !== null && typeof d.temperature_celsius === 'number' && !isNaN(d.temperature_celsius)) ||
              d.steps_interval > 0 || d.photoTakenId !== null // Include if step or photo occurred
         )
    );


    if (dataPointsForChart.length < 2) {
         historyChartCanvas.style.display = 'none';
         // Display a message instead
         let noDataMessage = historyDetailView.querySelector('p')
         // Check if the message already exists from a previous view or canvas error
         if(noDataMessage && (noDataMessage.textContent.includes("グラフ表示に必要な") || noDataMessage.textContent.includes("グラフ表示要素が見つかりません") || noDataMessage.textContent.includes("グラフ表示コンテキストの取得に失敗しました"))) {
             noDataMessage.textContent = "グラフ表示に必要なセンサーデータが不足しています。";
             noDataMessage.style.color = 'var(--md-sys-color-on-surface-variant)'; // Reset color if it was an error message
         } else {
              noDataMessage = document.createElement('p');
              noDataMessage.textContent = "グラフ表示に必要なセンサーデータが不足しています。";
              noDataMessage.style.textAlign = 'center';
              noDataMessage.style.color = 'var(--md-sys-color-on-surface-variant)';
               // Find the h4 "センサーデータグラフ" and insert the message after it
               const chartTitle = historyDetailView.querySelector('h4');
              if (chartTitle) {
                 chartTitle.parentNode.insertBefore(noDataMessage, chartTitle.nextElementSibling);
              } else {
                   // Fallback if h4 title is not found
                   historyDetailView.insertBefore(noDataMessage, historyPhotosContainer);
              }
         }

         return;
    } else {
         historyChartCanvas.style.display = 'block';
         // Remove any previous "no data" or error message related to the chart
         const chartTitle = historyDetailView.querySelector('h4');
         if (chartTitle) {
              let nextElement = chartTitle.nextElementSibling;
               // Check if the next element is one of our messages
               if (nextElement && (nextElement.textContent.includes("グラフ表示に必要な") || nextElement.textContent.includes("グラフ表示要素が見つかりません") || nextElement.textContent.includes("グラフ表示コンテキストの取得に失敗しました"))) {
                  nextElement.remove();
               }
         }
         // Also check directly before the canvas as a fallback
         const previousMessage = historyChartCanvas.previousElementSibling;
         if(previousMessage && (previousMessage.textContent.includes("グラフ表示に必要な") || previousMessage.textContent.includes("グラフ表示要素が見つかりません") || previousMessage.textContent.includes("グラフ表示コンテキストの取得に失敗しました"))) {
            previousMessage.remove();
         }
    }


    const labels = dataPointsForChart.map(d => new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 1 }));

    const datasets = [];
    // Add datasets only if there's at least one non-null/finite value for that sensor type in the *filtered* data
    // Default visibility (hidden: false) set for some key datasets
    if (dataPointsForChart.some(d => d && d.accelX !== null && typeof d.accelX === 'number' && !isNaN(d.accelX))) datasets.push({ label: 'Accel X', data: dataPointsForChart.map(d => d.accelX), borderColor: 'rgba(255, 99, 132, 0.8)', backgroundColor: 'rgba(255, 99, 132, 0.2)', fill: false, tension: 0.1, hidden: true, yAxisID: 'yMotion' });
    if (dataPointsForChart.some(d => d && d.accelY !== null && typeof d.accelY === 'number' && !isNaN(d.accelY))) datasets.push({ label: 'Accel Y', data: dataPointsForChart.map(d => d.accelY), borderColor: 'rgba(54, 162, 235, 0.8)', backgroundColor: 'rgba(54, 162, 235, 0.2)', fill: false, tension: 0.1, hidden: true, yAxisID: 'yMotion' });
    if (dataPointsForChart.some(d => d && d.accelZ !== null && typeof d.accelZ === 'number' && !isNaN(d.accelZ))) datasets.push({ label: 'Accel Z', data: dataPointsForChart.map(d => d.accelZ), borderColor: 'rgba(75, 192, 192, 0.8)', backgroundColor: 'rgba(75, 192, 192, 0.2)', fill: false, tension: 0.1, yAxisID: 'yMotion' }); // Default Visible
    if (dataPointsForChart.some(d => d && d.orientAlpha !== null && typeof d.orientAlpha === 'number' && !isNaN(d.orientAlpha))) datasets.push({ label: 'Orient Alpha (Z)', data: dataPointsForChart.map(d => d.orientAlpha), borderColor: 'rgba(153, 102, 255, 0.8)', backgroundColor: 'rgba(153, 102, 255, 0.2)', fill: false, tension: 0.1, hidden: true, yAxisID: 'yOrientation' });
     if (dataPointsForChart.some(d => d && d.orientBeta !== null && typeof d.orientBeta === 'number' && !isNaN(d.orientBeta))) datasets.push({ label: 'Orient Beta (X)', data: dataPointsForChart.map(d => d.orientBeta), borderColor: 'rgba(255, 159, 64, 0.8)', backgroundColor: 'rgba(255, 159, 64, 0.2)', fill: false, tension: 0.1, hidden: true, yAxisID: 'yOrientation' });
    if (dataPointsForChart.some(d => d && d.orientGamma !== null && typeof d.orientGamma === 'number' && !isNaN(d.orientGamma))) datasets.push({ label: 'Orient Gamma (Y)', data: dataPointsForChart.map(d => d.orientGamma), borderColor: 'rgba(201, 203, 207, 0.8)', backgroundColor: 'rgba(201, 203, 207, 0.2)', fill: false, tension: 0.1, hidden: true, yAxisID: 'yOrientation' });
    if (dataPointsForChart.some(d => d && d.gyroAlpha !== null && typeof d.gyroAlpha === 'number' && !isNaN(d.gyroAlpha))) datasets.push({ label: 'Gyro Alpha (Z)', data: dataPointsForChart.map(d => d.gyroAlpha), borderColor: 'rgba(255, 99, 132, 0.5)', backgroundColor: 'rgba(255, 99, 132, 0.1)', fill: false, tension: 0.1, hidden: true, yAxisID: 'yGyro' });
     if (dataPointsForChart.some(d => d && d.gyroBeta !== null && typeof d.gyroBeta === 'number' && !isNaN(d.gyroBeta))) datasets.push({ label: 'Gyro Beta (X)', data: dataPointsForChart.map(d => d.gyroBeta), borderColor: 'rgba(54, 162, 235, 0.5)', backgroundColor: 'rgba(54, 162, 235, 0.1)', fill: false, tension: 0.1, hidden: true, yAxisID: 'yGyro' });
    if (dataPointsForChart.some(d => d && d.gyroGamma !== null && typeof d.gyroGamma === 'number' && !isNaN(d.gyroGamma))) datasets.push({ label: 'Gyro Gamma (Y)', data: dataPointsForChart.map(d => d.gyroGamma), borderColor: 'rgba(75, 192, 192, 0.5)', backgroundColor: 'rgba(75, 192, 192, 0.1)', fill: false, tension: 0.1, hidden: true, yAxisID: 'yGyro' });
    if (dataPointsForChart.some(d => d && d.illuminance !== null && typeof d.illuminance === 'number' && !isNaN(d.illuminance))) datasets.push({ label: 'Illuminance (lux)', data: dataPointsForChart.map(d => d.illuminance), borderColor: 'rgba(255, 205, 86, 0.8)', backgroundColor: 'rgba(255, 205, 86, 0.2)', fill: false, tension: 0.1, yAxisID: 'yLux', hidden: true });
    if (dataPointsForChart.some(d => d && d.decibels !== null && isFinite(d.decibels))) datasets.push({ label: 'Decibels (dBFS)', data: dataPointsForChart.map(d => isFinite(d.decibels) ? d.decibels : null), borderColor: 'rgba(153, 102, 255, 0.8)', backgroundColor: 'rgba(153, 102, 255, 0.2)', fill: false, tension: 0.1, yAxisID: 'yDb' }); // Default Visible
     if (dataPointsForChart.some(d => d && d.latitude !== null && typeof d.latitude === 'number' && !isNaN(d.latitude))) datasets.push({ label: 'Latitude', data: dataPointsForChart.map(d => d.latitude), borderColor: 'rgba(0, 128, 0, 0.8)', backgroundColor: 'rgba(0, 128, 0, 0.2)', fill: false, tension: 0.1, yAxisID: 'yGeo', hidden: true });
     if (dataPointsForChart.some(d => d && d.longitude !== null && typeof d.longitude === 'number' && !isNaN(d.longitude))) datasets.push({ label: 'Longitude', data: dataPointsForChart.map(d => d.longitude), borderColor: 'rgba(0, 0, 128, 0.8)', backgroundColor: 'rgba(0, 0, 128, 0.2)', fill: false, tension: 0.1, yAxisID: 'yGeo', hidden: true });
     if (dataPointsForChart.some(d => d && d.gpsAccuracy !== null && typeof d.gpsAccuracy === 'number' && !isNaN(d.gpsAccuracy))) datasets.push({ label: 'GPS Accuracy (m)', data: dataPointsForChart.map(d => d.gpsAccuracy), borderColor: 'rgba(128, 128, 128, 0.8)', backgroundColor: 'rgba(128, 128, 128, 0.2)', fill: false, tension: 0.1, yAxisID: 'yAcc', hidden: true });
    if (dataPointsForChart.some(d => d && d.altitude !== null && typeof d.altitude === 'number' && !isNaN(d.altitude))) datasets.push({ label: 'Altitude (m)', data: dataPointsForChart.map(d => d.altitude), borderColor: 'rgba(139, 69, 19, 0.8)', backgroundColor: 'rgba(139, 69, 19, 0.2)', fill: false, tension: 0.1, yAxisID: 'yAlt' }); // Default Visible
     if (dataPointsForChart.some(d => d && d.speed !== null && typeof d.speed === 'number' && !isNaN(d.speed))) datasets.push({ label: 'Speed (m/s)', data: dataPointsForChart.map(d => d.speed), borderColor: 'rgba(0, 0, 255, 0.8)', backgroundColor: 'rgba(0, 0, 255, 0.2)', fill: false, tension: 0.1, yAxisID: 'ySpeed', hidden: true });
     if (dataPointsForChart.some(d => d && d.heading !== null && typeof d.heading === 'number' && !isNaN(d.heading))) datasets.push({ label: 'Heading (°)', data: dataPointsForChart.map(d => d.heading), borderColor: 'rgba(128, 128, 0, 0.8)', backgroundColor: 'rgba(128, 128, 0, 0.2)', fill: false, tension: 0.1, yAxisID: 'yHeading', hidden: true });
    if (dataPointsForChart.some(d => d && d.temperature_celsius !== null && typeof d.temperature_celsius === 'number' && !isNaN(d.temperature_celsius))) datasets.push({ label: 'Temperature (°C)', data: dataPointsForChart.map(d => d.temperature_celsius), borderColor: 'rgba(255, 99, 71, 0.8)', backgroundColor: 'rgba(255, 99, 71, 0.2)', fill: false, tension: 0.1, yAxisID: 'yTemp' }); // Default Visible
    // Steps as points or a stepped line
    const stepData = dataPointsForChart.map(d => d && d.steps_interval > 0 ? 1 : null); // Map steps_interval to 1 if step occurred, null otherwise
    // Only add step dataset if any step occurred in the filtered data
    if (stepData.some(v => v === 1)) datasets.push({ label: 'Steps (Event)', data: stepData, borderColor: 'rgba(50, 205, 50, 0.8)', backgroundColor: 'rgba(50, 205, 50, 0.8)', fill: false, stepped: 'middle', tension: 0, yAxisID: 'ySteps', pointRadius: 5, showLine: false, pointStyle: 'star' });

    // Add photo event markers
     const photoEventData = dataPointsForChart.map(d => d && d.photoTakenId !== null ? 1 : null);
     // Only add photo dataset if any photo occurred in the filtered data
     if (photoEventData.some(v => v === 1)) datasets.push({ label: 'Photo (Event)', data: photoEventData, borderColor: 'rgba(0, 191, 255, 0.8)', backgroundColor: 'rgba(0, 191, 255, 0.8)', fill: false, stepped: 'middle', tension: 0, yAxisID: 'ySteps', pointRadius: 5, showLine: false, pointStyle: 'rectRot' }); // Use same Y-axis as steps for events


    const axes = {
        x: { title: { display: true, text: 'Time' } },
         // Define common Y-axes and their scales. Only add to the final config if a dataset uses it.
         // Default Y axis for motion
        yMotion: { type: 'linear', display: 'auto', position: 'left', title: { display: true, text: 'Motion (m/s²)' }, beginAtZero: false },
         // Y axis for orientation
        yOrientation: { type: 'linear', display: 'auto', position: 'left', title: { display: true, text: 'Orientation (°)' }, beginAtZero: false },
         // Y axis for gyroscope
        yGyro: { type: 'linear', display: 'auto', position: 'left', title: { display: true, text: 'Gyroscope (°/s)' }, beginAtZero: false },
         // Y axis for light
        yLux: { type: 'linear', display: 'auto', position: 'right', title: { display: true, text: 'Lux' }, grid: { drawOnChartArea: false, } },
         // Y axis for decibels
        yDb: { type: 'linear', display: 'auto', position: 'right', title: { display: true, text: 'dBFS' }, grid: { drawOnChartArea: false, } },
         // Y axis for geolocation lat/lon
        yGeo: { type: 'linear', display: 'auto', position: 'right', title: { display: true, text: 'Geo (Lat/Lon)' }, grid: { drawOnChartArea: false, } },
         // Y axis for GPS Accuracy
        yAcc: { type: 'linear', display: 'auto', position: 'right', title: { display: true, text: 'Accuracy (m)' }, grid: { drawOnChartArea: false, reverse: true, beginAtZero: true } }, // Accuracy lower is better, start at zero
         // Y axis for Altitude
        yAlt: { type: 'linear', display: 'auto', position: 'right', title: { display: true, text: 'Altitude (m)' }, grid: { drawOnChartArea: false, } },
         // Y axis for Speed
        ySpeed: { type: 'linear', display: 'auto', position: 'right', title: { display: true, text: 'Speed (m/s)' }, grid: { drawOnChartArea: false, beginAtZero: true } },
         // Y axis for Heading
        yHeading: { type: 'linear', display: 'auto', position: 'right', title: { display: true, text: 'Heading (°)' }, grid: { drawOnChartArea: false, min: 0, max: 360 } },
         // Y axis for Temperature
        yTemp: { type: 'linear', display: 'auto', position: 'right', title: { display: true, text: 'Temp (°C)' }, grid: { drawOnChartArea: false, } },
         // Y axis for Steps (event marker) - Use 'linear' or 'category' depending on desired display. 'category' for just a marker line.
        ySteps: { type: 'category', display: 'auto', position: 'left', labels: ['Event'], title: { display: true, text: 'Events' }, grid: { drawOnChartArea: false, } }, // Use category axis for events


    };

     // Filter axes to include only those used by any dataset
     const axesConfig = { x: axes.x }; // Always include X axis
     datasets.forEach(dataset => {
          if (dataset.yAxisID && axes[dataset.yAxisID]) {
               if (!axesConfig[dataset.yAxisID]) {
                    axesConfig[dataset.yAxisID] = axes[dataset.yAxisID];
               }
               // Grid lines draw only for the first 'left' axis added that has data
               if (axesConfig[dataset.yAxisID].position === 'left' && datasets.filter(ds => ds.yAxisID === dataset.yAxisID).length > 0) {
                    if(axesConfig[dataset.yAxisID].grid) axesConfig[dataset.yAxisID].grid.drawOnChartArea = true;
               } else {
                   if(axesConfig[dataset.yAxisID].grid) axesConfig[dataset.yAxisID].grid.drawOnChartArea = false;
               }
          }
     });


    historyChartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false, // Allow chart to fill container height
            scales: axesConfig, // Use the filtered axes config
            plugins: {
                 legend: { position: 'top' },
                 tooltip: {
                      mode: 'index',
                      intersect: false,
                 }
            },
            hover: {
                 mode: 'nearest',
                 intersect: true
            },
             animation: false,
             // Optional: Add zoom/pan plugin if desired for better exploration of detailed data
             // plugins: { zoom: { ... } }
        }
    });
}

backToHistoryListButton.addEventListener('click', displayHistoryList);
function loadAndDisplayHistory() {
    loadHistoryFromLocalStorage();
    displayHistoryList();
     // Destroy chart instance when leaving the history detail view (handled by showPage now)
}

// --- Sensor Card Toggle Logic ---
document.querySelectorAll('.sensor-card-toggle').forEach(card => {
     card.addEventListener('click', (event) => {
         // Don't toggle if clicking an interactive element inside the card
         const target = event.target;
         if (target.closest('md-icon-button') || target.closest('md-filled-button') || target.closest('a') || target.closest('select')) { // Added select
             return;
         }
         // Toggle the 'card-expanded' class
         card.classList.toggle('card-expanded');
     });
});


// --- Initial Setup ---
loadHistoryFromLocalStorage(); // Load history on page load
initializeSensors(); // Attempt to initialize sensors based on environment/permissions
updateRecordingButtonState(); // Update button states based on initial sensor readiness
showPage('recordPage'); // Show the recording page by default

// Initial check and setup for permission button visibility/state
if (needsExplicitPermission && sensorPermissionIconButton) {
     // Button is initially disabled in HTML, update state based on query results
     // Permissions queries happen within the individual initialize functions,
     // and updateRecordingButtonState() is called after initializeSensors.
     // So the initial state should be correctly set after page load.
     console.log("Explicit permissions may be needed. Button will be enabled if promptable.");
} else if (sensorPermissionIconButton) {
     // No explicit permission API like requestPermission(), hide the button.
     sensorPermissionIconButton.style.display = 'none';
     console.log("Explicit permission request API not available. Permission button hidden.");
} else {
    console.warn("Sensor permission button element not found.");
}
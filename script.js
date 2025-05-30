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

    const allCorePermissionsGranted = (motionPermissionGranted || !(window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function')) &&
                                      (orientationPermissionGranted || !(window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function')) &&
                                      (micPermissionGranted || !(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) &&
                                      (cameraPermissionGranted || !(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) &&
                                      (geolocationPermissionGranted || !navigator.geolocation);

    const canRequestExplicitly = (window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function' && !motionPermissionGranted) ||
                                 (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function' && !orientationPermissionGranted) ||
                                 (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && (!micPermissionGranted || !cameraPermissionGranted)) ||
                                 (navigator.geolocation && !geolocationPermissionGranted);


    if (needsExplicitPermission && canRequestExplicitly && sensorPermissionIconButton) {
        sensorPermissionIconButton.style.display = 'inline-flex';
        sensorPermissionIconButton.disabled = false;
        if (permissionIconEl) permissionIconEl.textContent = 'lock';
        sensorPermissionIconButton.title = 'センサーアクセス許可をリクエスト';
    } else if (sensorPermissionIconButton) {
        sensorPermissionIconButton.style.display = 'inline-flex';
        sensorPermissionIconButton.disabled = true; // Disable button if no explicit permission needed or all needed granted
        if (permissionIconEl) permissionIconEl.textContent = 'lock_open';
        sensorPermissionIconButton.title = 'センサーアクセスは許可済みまたは不要です';
    } else if (!needsExplicitPermission && sensorPermissionIconButton) {
         sensorPermissionIconButton.style.display = 'none'; // Hide button if no explicit permission API exists
    }


    // Determine if essential sensors are ready for recording. At least one type should be available/granted.
    const essentialSensorsReady = sensorsInitialized &&
                                  (
                                      (window.DeviceMotionEvent && (motionPermissionGranted || typeof DeviceMotionEvent.requestPermission !== 'function')) ||
                                      (window.DeviceOrientationEvent && (orientationPermissionGranted || typeof DeviceOrientationEvent.requestPermission !== 'function')) ||
                                      (window.AmbientLightSensor) || // Light sensor doesn't use requestPermission() in the same way
                                      (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && (micPermissionGranted || cameraPermissionGranted)) ||
                                      (navigator.geolocation && geolocationPermissionGranted)
                                  );


    startRecordingIconButton.disabled = !essentialSensorsReady || isRecording;
    stopRecordingIconButton.disabled = !essentialSensorsReady || !isRecording;
    downloadCSVIconButton.disabled = isRecording || allRecordedSessions.length === 0;

    takePictureButton.disabled = !cameraPermissionGranted || !cameraStream || isRecording; // Disable photo during recording

    if (isRecording) {
        recordingStatusEl.textContent = `記録中... (${currentRecordingData.length}件)`;
    } else if (allRecordedSessions.length > 0) {
         // Check if the last session is complete (has tags) before saying it's save-ready
         const lastSession = allRecordedSessions[allRecordedSessions.length - 1];
         const dataCount = lastSession && lastSession.data ? lastSession.data.length : 0;
         // Check if tags were applied (dialog was confirmed)
         if (lastSession && lastSession.tags && lastSession.tags.color !== '未選択') { // Using color as a simple check for completion
             recordingStatusEl.textContent = `記録停止。履歴に${dataCount}件保存済み。CSVダウンロード可。`;
         } else {
              // This state is only possible if stopRecording was called but dialog was cancelled
             recordingStatusEl.textContent = `記録停止。データ(${dataCount}件)は破棄されました。`;
         }
    } else if (essentialSensorsReady) {
        recordingStatusEl.textContent = "センサー監視中。記録を開始できます。";
    } else if (sensorsInitialized && !essentialSensorsReady) {
         // This means sensors are initialized, but none of the 'essential' ones are available/granted
        recordingStatusEl.textContent = "利用可能なセンサーがありません。";
    } else if (needsExplicitPermission && canRequestExplicitly) {
        let missingPerms = [];
        if (!motionPermissionGranted && (window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function') ) missingPerms.push("動作");
        if (!orientationPermissionGranted && (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') ) missingPerms.push("向き");
        if (!micPermissionGranted && (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) ) missingPerms.push("マイク");
        if (!cameraPermissionGranted && (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) ) missingPerms.push("カメラ");
        if (!geolocationPermissionGranted && navigator.geolocation) missingPerms.push("位置情報");
         // Check AmbientLightSensor separately if query exists and is denied
         if ('AmbientLightSensor' in window && navigator.permissions && navigator.permissions.query) {
              navigator.permissions.query({ name: 'ambient-light-sensor' }).then(p => {
                   if (p.state === 'denied' && !missingPerms.includes("光")) { missingPerms.push("光"); updateStatusText(missingPerms); }
              });
         }

         const updateStatusText = (perms) => {
              if (perms.length > 0) {
                   recordingStatusEl.textContent = `左のアイコンから${perms.join('/')}アクセスを許可してください。`;
              } else {
                   // This case should ideally be caught by essentialSensorsReady
                   recordingStatusEl.textContent = "センサー準備中...";
              }
         };
         updateStatusText(missingPerms);

    } else {
        recordingStatusEl.textContent = "センサー準備中...";
    }
}

async function initializeSensors() {
    if (sensorsInitialized) return;

    // Add event listeners if API exists, regardless of permission state initially
    if (window.DeviceMotionEvent) {
        window.addEventListener('devicemotion', handleMotionEvent, { passive: true });
        accelStatusEl.textContent = "待機中..."; gyroStatusEl.textContent = "待機中...";
        pedometerStatusEl.textContent = "待機中...";
         anySensorSupported = true;
    } else {
        accelStatusEl.textContent = '加速度センサー非対応'; accelStatusEl.classList.add('not-supported');
        gyroStatusEl.textContent = 'ジャイロスコープ非対応'; gyroStatusEl.classList.add('not-supported');
        pedometerStatusEl.textContent = '加速度センサー非対応'; pedometerStatusEl.classList.add('not-supported');
    }

    if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', handleOrientationEvent, { passive: true });
        orientStatusEl.textContent = "待機中...";
         anySensorSupported = true;
    } else {
        orientStatusEl.textContent = '向きセンサー非対応'; orientStatusEl.classList.add('not-supported');
    }

    initializeLightSensor(); // Handles its own permission/support check
    initializeMicrophone(); // Handles its own permission/support check
    initializeCamera(); // Handles its own permission/support check
    initializeGeolocation(); // Handles its own permission/support check

    sensorsInitialized = true;
    updateRecordingButtonState();
}

async function requestAllPermissions() {
     // Check permissions first to see what needs prompting
     const permissionQueries = [];
     if (window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function') permissionQueries.push(navigator.permissions.query({ name: 'accelerometer' }));
     if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') {
          permissionQueries.push(navigator.permissions.query({ name: 'gyroscope' })); // Gyroscope permission often linked
          permissionQueries.push(navigator.permissions.query({ name: 'magnetometer' })); // Magnetometer permission often linked
     }
     if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
         permissionQueries.push(navigator.permissions.query({ name: 'microphone' }));
         permissionQueries.push(navigator.permissions.query({ name: 'camera' }));
     }
     if (navigator.geolocation) permissionQueries.push(navigator.permissions.query({ name: 'geolocation' }));
      if ('AmbientLightSensor' in window && navigator.permissions && navigator.permissions.query) permissionQueries.push(navigator.permissions.query({ name: 'ambient-light-sensor' }));


     const results = await Promise.allSettled(permissionQueries);

     const promisesToRequest = [];

     // Check results and queue explicit requests if needed
     results.forEach(result => {
          if (result.status === 'fulfilled' && result.value) {
               const name = result.value.name;
               const state = result.value.state;
               if (state === 'prompt') {
                    if (name === 'accelerometer' && window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function') {
                         promisesToRequest.push(
                              DeviceMotionEvent.requestPermission().then(s => { if(s === 'granted') motionPermissionGranted = true; })
                              .catch(err => console.error("Motion Permission Err:", err))
                         );
                    } else if ((name === 'gyroscope' || name === 'magnetometer') && window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') {
                         promisesToRequest.push(
                              DeviceOrientationEvent.requestPermission().then(s => { if(s === 'granted') orientationPermissionGranted = true; })
                              .catch(err => console.error("Orientation Permission Err:", err))
                         );
                    } else if (name === 'microphone' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia && !micPermissionGranted) {
                        // initializeMicrophone handles the prompt internally
                         promisesToRequest.push(initializeMicrophone(true));
                    } else if (name === 'camera' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia && !cameraPermissionGranted) {
                         // initializeCamera handles the prompt internally
                         promisesToRequest.push(initializeCamera(true));
                    } else if (name === 'geolocation' && navigator.geolocation && !geolocationPermissionGranted) {
                         // initializeGeolocation handles the prompt internally
                         promisesToRequest.push(initializeGeolocation(true));
                    }
                     // AmbientLightSensor doesn't have a standard requestPermission() linked to the query API state 'prompt'
               } else if (state === 'granted') {
                    // Update flags if already granted
                    if (name === 'accelerometer' || name === 'gyroscope' || name === 'magnetometer') motionPermissionGranted = true;
                    if (name === 'accelerometer' || name === 'gyroscope' || name === 'magnetometer') orientationPermissionGranted = true; // These often grant orientation too
                    if (name === 'microphone') micPermissionGranted = true;
                    if (name === 'camera') cameraPermissionGranted = true;
                    if (name === 'geolocation') geolocationPermissionGranted = true;
                    // Ambient light permission is queried but initialization handles the start which might trigger a micro-prompt
               } else if (state === 'denied') {
                    // Update status messages for denied permissions
                    if (name === 'accelerometer' || name === 'gyroscope' || name === 'magnetometer') { accelStatusEl.textContent = '動作アクセス拒否'; gyroStatusEl.textContent = 'ジャイロアクセス拒否'; pedometerStatusEl.textContent = '加速度アクセス拒否'; }
                    if (name === 'accelerometer' || name === 'gyroscope' || name === 'magnetometer') { orientStatusEl.textContent = '向きアクセス拒否'; }
                    if (name === 'microphone') { micStatusEl.textContent = 'マイクアクセス拒否'; }
                    if (name === 'camera') { cameraStatusEl.textContent = 'カメラアクセス拒否'; }
                    if (name === 'geolocation') { geoStatusEl.textContent = 'GPSアクセス拒否'; geoAddressStatusEl.textContent = 'GPSアクセス拒否'; }
                     if (name === 'ambient-light-sensor') { lightStatusEl.textContent = '光センサーアクセス拒否'; }

                    if (name === 'accelerometer' || name === 'gyroscope' || name === 'magnetometer') motionPermissionGranted = false;
                    if (name === 'accelerometer' || name === 'gyroscope' || name === 'magnetometer') orientationPermissionGranted = false;
                    if (name === 'microphone') micPermissionGranted = false;
                    if (name === 'camera') cameraPermissionGranted = false;
                    if (name === 'geolocation') geolocationPermissionGranted = false;
               }
          } else if (result.status === 'rejected') {
              // Query failed (e.g., sensor not supported, or permission name unknown)
              console.warn(`Permission query failed for ${result.reason}`);
              // Status messages for non-supported cases are handled in initializeSensors
          }
     });

     // Execute all explicit permission requests
     if (promisesToRequest.length > 0) {
        await Promise.allSettled(promisesToRequest);
     }

     // After attempts, re-run initialization to start sensors for newly granted permissions
     initializeSensors(); // This will re-check all permissions and start sensors if granted
     updateRecordingButtonState(); // Final state update
}

if (needsExplicitPermission) {
    if (sensorPermissionIconButton) {
        sensorPermissionIconButton.addEventListener('click', requestAllPermissions);
    }
     // Initial state: Assume permissions need requesting unless query says otherwise
     accelStatusEl.textContent = "アイコンから許可"; gyroStatusEl.textContent = "アイコンから許可";
     orientStatusEl.textContent = "アイコンから許可"; micStatusEl.textContent = "アイコンから許可";
     cameraStatusEl.textContent = "アイコンから許可"; geoStatusEl.textContent = "アイコンから許可";
     pedometerStatusEl.textContent = "アイコンから許可";
     geoAddressStatusEl.textContent = "GPS許可後";

     // Perform initial permission queries on load to update button/status before user clicks
     if (navigator.permissions && navigator.permissions.query) {
          navigator.permissions.query({ name: 'geolocation' }).then(p => { if(p.state === 'granted') geolocationPermissionGranted = true; updateRecordingButtonState(); initializeSensors(); });
          navigator.permissions.query({ name: 'camera' }).then(p => { if(p.state === 'granted') cameraPermissionGranted = true; updateRecordingButtonState(); initializeSensors(); });
           navigator.permissions.query({ name: 'microphone' }).then(p => { if(p.state === 'granted') micPermissionGranted = true; updateRecordingButtonState(); initializeSensors(); });
           // Motion/Orientation queries might not exist or reflect the DeviceOrientation/MotionEvent API prompt state.
           // We primarily rely on the requestPermission() outcome or lack thereof.
            if (window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission !== 'function') motionPermissionGranted = true;
            if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission !== 'function') orientationPermissionGranted = true;
            updateRecordingButtonState();
            initializeSensors(); // Initialize sensors based on initial known states
     } else {
         // If Permissions API is not available, we still need to try initializing sensors directly
         // which might trigger prompts.
         initializeSensors();
     }

} else {
    // No explicit permission API like requestPermission() exists for Motion/Orientation
    // For media/geo, getUserMedia/watchPosition still might prompt/fail.
    // Assume motion/orientation are available if API exists.
    if(sensorPermissionIconButton) sensorPermissionIconButton.style.display = 'none';
    motionPermissionGranted = !!window.DeviceMotionEvent;
    orientationPermissionGranted = !!window.DeviceOrientationEvent;
    // Initialize directly and update states based on success/failure
    initializeSensors();
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
        anySensorSupported = true; // Indicate motion data is coming in
    } else if (window.DeviceMotionEvent && accelStatusEl.textContent === "監視中...") {
         // API exists and listener is active, but data is null
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
         anySensorSupported = true; // Indicate gyro data is coming in
    } else if (window.DeviceMotionEvent && gyroStatusEl.textContent === "監視中..."){
         // API exists and listener is active, but data is null
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

        const mag = Math.sqrt(currentAccelX**2 + currentAccelY**2**2 + currentAccelZ**2); // Fixed typo y**2
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
         anySensorSupported = true; // Indicate accelerometer data is coming in
    } else if (window.DeviceMotionEvent && pedometerStatusEl.textContent === "監視中..."){
         pedometerStatusEl.textContent = "加速度データなし"; pedometerStatusEl.classList.remove('error', 'not-supported');
         // No acceleration data, steps cannot be counted
    }
     updateRecordingButtonState(); // Update state after potential permission checks from events
}
function handleOrientationEvent(event) {
    // Check if event properties exist before using
     const alpha = event.alpha;
     const beta = event.beta;
     const gamma = event.gamma;

    if (alpha !== null || beta !== null || gamma !== null) {
        anySensorSupported = true; // Indicate orientation data is coming in

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

    } else if (window.DeviceOrientationEvent && orientStatusEl.textContent === "監視中...") {
         orientStatusEl.textContent = "向きデータなし"; orientStatusEl.classList.remove('error', 'not-supported');
         currentSensorValues.orientAlpha = null; currentSensorValues.orientBeta = null; currentSensorValues.orientGamma = null;
         orientAlphaEl.textContent = '-'; orientBetaEl.textContent = '-'; orientGammaEl.textContent = '-';
    }
     updateRecordingButtonState(); // Update state after potential permission checks from events
}
function initializeLightSensor() {
    if (!('AmbientLightSensor' in window)) {
        lightStatusEl.textContent = '光センサー API 非対応'; lightStatusEl.classList.add('not-supported');
        currentSensorValues.illuminance = null; updateRecordingButtonState(); return;
    }
    lightStatusEl.textContent = "初期化中...";
    const startSensor = () => {
        try {
            // Ensure frequency is reasonable, 1 Hz is fine for display
            const sensor = new AmbientLightSensor({ frequency: 1 });
            sensor.addEventListener('reading', () => {
                anySensorSupported = true;
                const illuminance = sensor.illuminance;
                currentSensorValues.illuminance = illuminance;
                lightValueEl.textContent = illuminance !== null ? illuminance.toFixed(0) : '-';
                lightStatusEl.textContent = "監視中..."; lightStatusEl.classList.remove('error', 'not-supported');
                if (illuminance === null || typeof illuminance === 'undefined') {
                     lightIconSun.style.display = 'none'; lightIconMoon.style.display = 'none';
                } else if (illuminance > 100) { lightIconSun.style.display = 'inline-block'; lightIconMoon.style.display = 'none'; }
                else if (illuminance < 10) { lightIconSun.style.display = 'none'; lightIconMoon.style.display = 'inline-block'; }
                else { lightIconSun.style.display = 'none'; lightIconMoon.style.display = 'none'; }
                updateRecordingButtonState();
            });
            sensor.addEventListener('error', event => {
                console.error('Light sensor error:', event.error.name, event.error.message);
                 if (event.error.name === 'NotAllowedError' || event.error.name === 'PermissionDeniedError') {
                     lightStatusEl.textContent = '光センサーアクセス拒否';
                 } else {
                    lightStatusEl.textContent = `光センサーエラー: ${event.error.name}`;
                 }
                lightStatusEl.classList.add('error');
                currentSensorValues.illuminance = null; lightValueEl.textContent = '-'; updateRecordingButtonState();
            });
            sensor.start();
             // Check permission state after attempting to start, as start might implicitly prompt
             if (navigator.permissions && navigator.permissions.query) {
                  navigator.permissions.query({ name: 'ambient-light-sensor' }).then(p => {
                       if (p.state === 'denied') { lightStatusEl.textContent = '光センサーアクセス拒否'; lightStatusEl.classList.add('error'); }
                       updateRecordingButtonState();
                  });
             } else { // If permissions API isn't available, assume permission is implicit or failed on start()
                 lightStatusEl.textContent = "監視中 (許可確認不可)";
             }

        } catch (error) {
            console.error('Failed to start light sensor:', error);
            lightStatusEl.textContent = `光センサー開始失敗: ${error.name}`; lightStatusEl.classList.add('error');
            currentSensorValues.illuminance = null; lightValueEl.textContent = '-'; updateRecordingButtonState();
        }
    };
    // Check permission state first if API is available
    if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: 'ambient-light-sensor' })
            .then(permissionStatus => {
                if (permissionStatus.state === 'granted') startSensor();
                else if (permissionStatus.state === 'prompt') lightStatusEl.textContent = '光センサー: ブラウザが許可を求めています。';
                else { lightStatusEl.textContent = '光センサーアクセス拒否'; lightStatusEl.classList.add('error'); updateRecordingButtonState(); }
                permissionStatus.onchange = () => {
                     if (permissionStatus.state === 'granted') startSensor();
                     else if (permissionStatus.state !== 'prompt') { lightStatusEl.textContent = '光センサーアクセス拒否'; lightStatusEl.classList.add('error');}
                     updateRecordingButtonState();
                };
                if (permissionStatus.state !== 'granted') updateRecordingButtonState();
            })
            .catch(e => { console.warn("Ambient Light Sensor permission query failed, attempting to start directly.", e); startSensor(); });
    } else { startSensor(); } // Attempt to start directly if permissions API is not available
}
async function initializeMicrophone(forcePermissionRequest = false) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        micStatusEl.textContent = 'マイク API 非対応'; micStatusEl.classList.add('not-supported');
        micPermissionGranted = false; anySensorSupported = false; updateRecordingButtonState(); return Promise.resolve();
    }
    // If an existing stream is running and we aren't forcing a new request, keep it.
    if (microphoneStream && !forcePermissionRequest) {
         micPermissionGranted = true; anySensorSupported = true; // Ensure flags are set if stream exists
         micStatusEl.textContent = "監視中..."; micStatusEl.classList.remove('error', 'not-supported');
         // Ensure viz is running if context is ok
         if (audioContext && audioContext.state !== 'closed' && analyserNode) {
             // Need a way to restart viz loop if it stopped. Simple check:
             // If micDbfsEl shows '-', the viz loop might not be running.
             if (micDbfsEl.textContent === '-') {
                 console.log("[Mic] Restarting viz loop.");
                 // Reconnect source if necessary (might not be needed)
                 // audioContext.createMediaStreamSource(microphoneStream).connect(analyserNode);
                 requestAnimationFrame(getDecibels); // Start the loop again
             }
         } else {
              // Reinitialize audio context and nodes if they are missing/closed
              audioContext = new (window.AudioContext || window.webkitAudioContext)();
              analyserNode = audioContext.createAnalyser();
               const source = audioContext.createMediaStreamSource(microphoneStream);
               source.connect(analyserNode);
               analyserNode.fftSize = 256;
               // Start viz loop
               requestAnimationFrame(getDecibels);
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

    micStatusEl.textContent = forcePermissionRequest ? "マイクアクセス許可を求めています..." : "マイクアクセス許可待機中...";
    micStatusEl.classList.remove('error', 'not-supported'); // Clear previous states

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
            // Use a flag or check state explicitly
            if (!micPermissionGranted || !analyserNode || !audioContext || audioContext.state === 'closed') {
                 currentSensorValues.decibels = null; micDbfsEl.textContent = "-"; micLevelBar.style.width = `0%`;
                 micLevelBar.style.backgroundColor = 'var(--md-sys-color-surface-variant)'; // Reset bar color
                 return; // Stop the loop if context/nodes are gone
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
        } else {
             console.warn("[Mic] AudioContext is not in a state to start viz:", audioContext.state);
        }

        updateRecordingButtonState();
        return Promise.resolve(microphoneStream);
    } catch (err) {
        console.error("[Mic] Microphone access error:", err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
           micStatusEl.textContent = 'マイクアクセス拒否';
           micPermissionGranted = false; anySensorSupported = false;
        } else if (err.name === 'NotFoundError') {
             micStatusEl.textContent = 'マイクが見つかりません';
             micPermissionGranted = false; anySensorSupported = false;
        }
        else {
           micStatusEl.textContent = `マイクエラー: ${err.name}`;
           micPermissionGranted = false; anySensorSupported = false;
        }
        micStatusEl.classList.add('error');
        currentSensorValues.decibels = null; micDbfsEl.textContent = "-"; micLevelBar.style.width = `0%`; micLevelBar.style.backgroundColor = 'var(--md-sys-color-surface-variant)';
        updateRecordingButtonState();
        return Promise.reject(err);
    }
}
async function initializeCamera(forcePermissionRequest = false) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        cameraStatusEl.textContent = 'カメラ API 非対応'; cameraStatusEl.classList.add('not-supported');
        cameraPermissionGranted = false; anySensorSupported = false; updateRecordingButtonState(); return Promise.resolve();
    }
    // If stream exists and no force request, return existing stream state
    if (cameraStream && !forcePermissionRequest) {
         cameraStatusEl.textContent = "カメラ準備完了。撮影できます。"; cameraStatusEl.classList.remove('error', 'not-supported');
         cameraPreview.srcObject = cameraStream;
         cameraPreview.style.display = 'block';
         cameraPermissionGranted = true; updateRecordingButtonState(); // Ensure flag is true if stream exists
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


    cameraStatusEl.textContent = forcePermissionRequest ? "カメラアクセス許可を求めています..." : "カメラアクセス許可待機中...";
    cameraStatusEl.classList.remove('error', 'not-supported'); // Clear previous states

    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        cameraPermissionGranted = true; anySensorSupported = true;
        cameraStatusEl.textContent = "カメラ準備完了。撮影できます。"; cameraStatusEl.classList.remove('error', 'not-supported');
        cameraPreview.srcObject = cameraStream;
        cameraPreview.style.display = 'block';
        updateRecordingButtonState();
        return Promise.resolve(cameraStream);
    } catch (err) {
        console.error("Camera access error:", err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
           cameraStatusEl.textContent = 'カメラアクセス拒否';
           cameraPermissionGranted = false; anySensorSupported = false;
        } else if (err.name === 'NotFoundError') {
             cameraStatusEl.textContent = 'カメラが見つかりません';
             cameraPermissionGranted = false; anySensorSupported = false;
        }
        else {
           cameraStatusEl.textContent = `カメラエラー: ${err.name}`;
            cameraPermissionGranted = false; anySensorSupported = false;
        }
        cameraStatusEl.classList.add('error');
        cameraPreview.style.display = 'none';
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
    timestampP.textContent = `${new Date(photoTimestamp).toLocaleTimeString()}に撮影`;
    lastPhotoPreviewContainer.appendChild(img);
    lastPhotoPreviewContainer.appendChild(timestampP);


    // Mark the latest sensor value interval with the photo ID if recording is active
    // This needs to be done when the photo is taken, not just on recording start/stop.
    // However, we only record currentSensorValues periodically. The simplest is to
    // store the photo ID and attach it to the *next* recorded interval data point.
    currentSensorValues.photoTakenId = photoTimestamp;


    cameraStatusEl.textContent = `${new Date(photoTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} に写真を撮影しました。`;
});


// --- Geolocation, Reverse Geocoding & Weather Logic ---
async function initializeGeolocation(forcePermissionRequest = false) {
    if (!('geolocation' in navigator)) {
        geoStatusEl.textContent = '位置情報 API 非対応'; geoStatusEl.classList.add('not-supported');
        geoAddressStatusEl.textContent = '位置情報 API 非対応';
        geolocationPermissionGranted = false; anySensorSupported = false; updateRecordingButtonState(); return Promise.resolve();
    }
    // If watch is running and not forcing a new request, ensure status is correct and return
    if (geolocationPermissionGranted && geoWatchId && !forcePermissionRequest) {
         geoStatusEl.textContent = "監視中..."; geoStatusEl.classList.remove('error', 'not-supported');
         geoAddressStatusEl.textContent = currentSensorValues.address ? `最終更新: ${new Date(lastReverseGeocodeFetchTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : "場所情報取得中...";
         weatherStatusEl.textContent = currentSensorValues.temperature_celsius ? `最終更新: ${new Date(lastWeatherFetchTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : "天気情報取得中...";

         // Also attempt to fetch current position immediately if watch is already running (useful on init)
         navigator.geolocation.getCurrentPosition(handlePosition, handleError, { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 });
         return Promise.resolve();
    }

     // If watch is running but we force a new request or it shouldn't be running, clear it
    if (geoWatchId) {
         navigator.geolocation.clearWatch(geoWatchId);
         geoWatchId = null;
         geolocationPermissionGranted = false; // Assume we need to re-confirm permission
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

        // Update both summary and detail elements
        if(geoLatEl) geoLatEl.textContent = latitude !== null ? latitude.toFixed(5) : '-';
        if(geoLonEl) geoLonEl.textContent = longitude !== null ? longitude.toFixed(5) : '-';
        if(geoLatDetailEl) geoLatDetailEl.textContent = latitude !== null ? latitude.toFixed(5) : '-';
        if(geoLonDetailEl) geoLonDetailEl.textContent = longitude !== null ? longitude.toFixed(5) : '-';

        if(geoAccEl) geoAccEl.textContent = accuracy !== null ? accuracy.toFixed(1) : '-';
        if(geoAltEl) geoAltEl.textContent = altitude !== null ? altitude.toFixed(1) : '-';
        if(geoSpeedEl) geoSpeedEl.textContent = speed !== null ? speed.toFixed(2) : '-';
        if(geoHeadEl) geoHeadEl.textContent = heading !== null ? heading !== null && !isNaN(heading) ? heading.toFixed(1) : '-' : '-'; // Handle NaN heading

        // Fetch reverse geocode and weather if new significant position or stale
        const now = Date.now();
        const latChanged = Math.abs(latitude - (lastFetchedAddressCoords.lat || 0)) > REVERSE_GEOCODE_MIN_COORD_CHANGE;
        const lonChanged = Math.abs(longitude - (lastFetchedAddressCoords.lon || 0)) > REVERSE_GEOCODE_MIN_COORD_CHANGE;

        if (latitude !== null && longitude !== null) {
            // Fetch address if coordinates changed significantly or it hasn't been fetched recently
            if ((latChanged || lonChanged || currentSensorValues.address === null) &&
                (now - lastReverseGeocodeFetchTime > REVERSE_GEOCODE_INTERVAL_MS)) {
                 console.log("[Geo] Coordinates changed or stale, fetching address...");
                fetchReverseGeocode(latitude, longitude);
                lastFetchedAddressCoords = { lat: latitude, lon: longitude };
                lastReverseGeocodeFetchTime = now; // Update last fetch time only on attempt
            } else if (currentSensorValues.address) {
                 // If coords haven't changed significantly and we have an address, just update status text time
                 geoAddressStatusEl.textContent = `最終更新: ${new Date(lastReverseGeocodeFetchTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            }

            // Fetch weather if coordinates changed significantly or enough time has passed
            if ((latChanged || lonChanged || currentSensorValues.temperature_celsius === null || (now - lastWeatherFetchTime > WEATHER_FETCH_INTERVAL_MS))) {
                 console.log("[Geo] Coordinates changed or weather stale, fetching weather...");
                 fetchWeatherData(latitude, longitude);
                 // lastWeatherFetchTime is updated within fetchWeatherData on success
            } else if (currentSensorValues.temperature_celsius !== null) {
                 // If coords haven't changed significantly and we have weather, just update status text time
                 weatherStatusEl.textContent = `最終更新: ${new Date(lastWeatherFetchTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
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
        if (error.code === 1) {
             message = 'GPSアクセス拒否';
             geolocationPermissionGranted = false; // Explicitly set false on denial
             anySensorSupported = false;
        }
        else if (error.code === 2) message = 'GPS位置取得不能';
        else if (error.code === 3) message = 'GPSタイムアウト';
        geoStatusEl.textContent = message; geoStatusEl.classList.add('error');
        geoAddressStatusEl.textContent = message;
        weatherStatusEl.textContent = message;
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

    if (forcePermissionRequest || !geolocationPermissionGranted) {
         geoStatusEl.textContent = forcePermissionRequest ? "GPSアクセス許可を求めています..." : "GPSアクセス許可待機中...";
         geoAddressStatusEl.textContent = "GPSアクセス許可待機中...";
         weatherStatusEl.textContent = "GPSアクセスが必要です";

         return new Promise((resolve, reject) => {
             // Using getCurrentPosition first can trigger the permission prompt on some browsers
             navigator.geolocation.getCurrentPosition(
                 (position) => {
                     // Permission granted, and got initial position. Now start watching.
                     handlePosition(position); // Process the initial position
                     if (geoWatchId) navigator.geolocation.clearWatch(geoWatchId); // Clear any old watches
                     geoWatchId = navigator.geolocation.watchPosition(handlePosition, handleError, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
                     resolve();
                 },
                 (error) => {
                     // Permission denied or other error during initial get
                     handleError(error);
                     reject(error);
                 },
                 { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 } // Use longer timeout for initial get
             );
         });
    } else { // Permission seems granted or not explicitly needed, try starting watch directly
         geoStatusEl.textContent = "GPS監視開始中..."; geoStatusEl.classList.remove('error', 'not-supported');
         geoWatchId = navigator.geolocation.watchPosition(handlePosition, handleError, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
         // Also fetch current position immediately
         navigator.geolocation.getCurrentPosition(handlePosition, handleError, { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 });
         return Promise.resolve();
    }
}


async function fetchReverseGeocode(latitude, longitude) {
    if (latitude === null || longitude === null || typeof latitude !== 'number' || typeof longitude !== 'number') return;
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
    if (latitude === null || longitude === null || typeof latitude !== 'number' || typeof longitude !== 'number') {
        weatherStatusEl.textContent = "GPS座標不明"; weatherStatusEl.classList.add('error');
        console.warn("[Weather] Invalid coordinates for weather fetch:", latitude, longitude);
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
    if (!sensorsInitialized || (!anySensorSupported && !motionPermissionGranted && !orientationPermissionGranted && !micPermissionGranted && !geolocationPermissionGranted)) {
         if (sensorPermissionIconButton && !sensorPermissionIconButton.disabled && needsExplicitPermission) {
              alert("センサー利用の許可が必要です。左のアイコンをタップして許可してください。");
         } else {
             alert("利用可能なセンサーがないか、センサーの初期化に失敗しました。");
         }
        return;
    }
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
    lastWeatherFetchTime = 0; // Allow immediate weather fetch on start
    lastReverseGeocodeFetchTime = 0; // Allow immediate geocode fetch on start
    if (geolocationPermissionGranted && currentSensorValues.latitude !== null && currentSensorValues.longitude !== null) {
        fetchWeatherData(currentSensorValues.latitude, currentSensorValues.longitude);
        fetchReverseGeocode(currentSensorValues.latitude, currentSensorValues.longitude);
    } else if(geolocationPermissionGranted) {
         weatherStatusEl.textContent = "GPS位置情報取得後に更新";
         geoAddressStatusEl.textContent = "GPS位置情報取得後に更新";
         if(weatherTempEl) weatherTempEl.textContent = "-";
          if(weatherTempDetailEl) weatherTempDetailEl.textContent = "-";
         if(geoAddressEl) geoAddressEl.textContent = "-";
          if(geoAddressDetailEl) geoAddressDetailEl.textContent = "-";
    } else {
         weatherStatusEl.textContent = "GPSアクセスが必要です";
         geoAddressStatusEl.textContent = "GPSアクセスが必要です";
         if(weatherTempEl) weatherTempEl.textContent = "-";
          if(weatherTempDetailEl) weatherTempDetailEl.textContent = "-";
         if(geoAddressEl) geoAddressEl.textContent = "-";
          if(geoAddressDetailEl) geoAddressDetailEl.textContent = "-";
    }


    if (recordingIntervalId) clearInterval(recordingIntervalId);
    recordingIntervalId = setInterval(recordCurrentData, RECORDING_INTERVAL_MS);
    updateRecordingButtonState();
}

function stopRecording() {
    if (!isRecording) return;
    isRecording = false;
    if (recordingIntervalId) {
        clearInterval(recordingIntervalId);
        recordingIntervalId = null;
    }

     const sessionDataTemp = [...currentRecordingData];
     const sessionPhotosTemp = [...currentRecordingPhotos];
     const sessionTotalStepsTemp = currentSessionTotalSteps;

    // Clear buffers immediately so subsequent startRecording begins fresh
    currentRecordingData = [];
    currentRecordingPhotos = [];
    lastPhotoPreviewContainer.innerHTML = ""; // Clear photo preview

    // Reset pedometer display and counter
    pedometerStepsEl.textContent = '0';
    currentSessionTotalSteps = 0;

    // Reset pedometer internal state for the next recording session
    pedometer_last_accel_mag = 0;
    pedometer_trending_up = false;
    pedometer_last_step_time = 0;

    recordingStatusEl.textContent = "記録停止。タグ付けしてください...";
    updateRecordingButtonState(); // Update buttons state

     // If no data was recorded, skip the dialog and just update status/buttons
     if (sessionDataTemp.length === 0) {
         recordingStatusEl.textContent = `記録を停止しました。データはありませんでした。`;
         updateRecordingButtonState();
         return;
     }


    // Show tag dialog
    recordingTagsDialog.show();

    // Handle dialog close (user clicked Save or Cancel)
    const handleDialogClose = (event) => {
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
                 startTime: sessionDataTemp[0].timestamp,
                 endTime: sessionDataTemp[sessionDataTemp.length - 1].timestamp,
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

             recordingStatusEl.textContent = `記録を停止しました。${session.data.length}件のデータを記録。履歴に追加されました。`;

        } else { // action === 'cancel' or dialog dismissed
              // Data was not saved to history
              recordingStatusEl.textContent = `記録を停止しました。データ(${sessionDataTemp.length}件)は破棄されました。`;
               const form = recordingTagsDialog.querySelector('#recordingTagsForm');
               form.reset(); // Reset form selections
        }

        updateRecordingButtonState(); // Update buttons now that recording is fully stopped and saved state is finalized
    };

    recordingTagsDialog.addEventListener('closed', handleDialogClose);
}

function downloadCSV(session, filenamePrefix = "sensor_data") { // Accept session object now
    if (!session || !session.data || session.data.length === 0) {
        alert("記録データがありません。");
        return;
    }
    // CSV Header including session tags
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
            row.altitude !== null ? row.altitude.toFixed(1) : '',
            row.speed !== null ? row.speed.toFixed(2) : '',
            row.heading !== null ? row.heading !== null && !isNaN(row.heading) ? row.heading.toFixed(1) : '' : '', // Handle NaN heading
            row.temperature_celsius !== null ? row.temperature_celsius.toFixed(1) : '',
            row.steps_interval !== null ? row.steps_interval : '0',
            photoId,
             sessionColor,
             sessionEmotion,
             sessionShape
        ].map(value => `"${String(value).replace(/"/g, '""')}"`).join(','); // Basic CSV escaping
    });

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
    if (filenamePrefix === "sensor_data_last") { // Only update record page status for the main download button
        // Status already updated by stopRecording/dialog close
        // recordingStatusEl.textContent = `CSVファイルをダウンロードしました。 (${session.data.length}件)`;
        // updateRecordingButtonState(); // Ensure download button state is correct after download
    }
}
if(startRecordingIconButton) startRecordingIconButton.addEventListener('click', startRecording);
if(stopRecordingIconButton) stopRecordingIconButton.addEventListener('click', stopRecording);
if(downloadCSVIconButton) downloadCSVIconButton.addEventListener('click', () => {
     // Download button on record page downloads the *last saved* session in history
     // Only download if history is not empty and the last session has data
     if (allRecordedSessions.length > 0 && allRecordedSessions[allRecordedSessions.length - 1].data.length > 0) {
          // Find the latest session in history (already sorted by ID/time)
          const lastSavedSession = allRecordedSessions.reduce((latest, session) => session.id > latest.id ? session : latest, allRecordedSessions[0]);
          downloadCSV(lastSavedSession, "sensor_data_last");
     } else {
          alert("ダウンロードできる記録データがありません。");
     }
});

// --- History Logic ---
const HISTORY_STORAGE_KEY = 'sensorDemoProHistory_v3'; // Bump version due to adding tags

function saveHistoryToLocalStorage() {
    try {
         // Store minimal data needed for history view, including tags
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
              tags: session.tags || { color: '未選択', emotion: '未選択', shape: '未選択' }
         }));
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(sessionsToStore));
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
                if (!session.photos) session.photos = [];
                if (typeof session.totalSteps === 'undefined') session.totalSteps = 0;
                if (!session.data || !Array.isArray(session.data)) session.data = []; // Ensure data is an array
                 if (!session.tags || typeof session.tags !== 'object') session.tags = { color: '未選択', emotion: '未選択', shape: '未選択' }; // Add default tags if missing or wrong type
                 if (typeof session.tags.color === 'undefined') session.tags.color = '未選択';
                 if (typeof session.tags.emotion === 'undefined') session.tags.emotion = '未選択';
                 if (typeof session.tags.shape === 'undefined') session.tags.shape = '未選択';
            });
             // Filter out potentially corrupt sessions (e.g., no id or start time)
            allRecordedSessions = allRecordedSessions.filter(session => session.id && session.startTime);

        } catch (e) {
            console.error("Error parsing history from localStorage:", e);
            allRecordedSessions = []; // Clear history on parse error
             alert("履歴データの読み込みに失敗しました。履歴をクリアします。");
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
    allRecordedSessions.sort((a, b) => b.id - a.id); // Sort descending by timestamp (latest first)

    allRecordedSessions.forEach(session => {
        const sessionCard = document.createElement('md-elevated-card');
        sessionCard.style.marginBottom = '12px';
         sessionCard.classList.add('history-card'); // Add class for styling/selection
        const startTime = new Date(session.startTime);
        const endTime = session.endTime || session.startTime; // Handle sessions with only one point
        const durationMs = endTime - startTime;
        const durationSec = Math.max(0, Math.floor(durationMs / 1000)); // Ensure non-negative duration
        const durationMin = Math.floor(durationSec / 60);
        const formattedStartTime = startTime.toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

        let firstTempEntry = session.data.find(d => d.temperature_celsius !== null && typeof d.temperature_celsius === 'number');
        let tempString = firstTempEntry ? `${firstTempEntry.temperature_celsius.toFixed(1)}°C` : "記録なし";

        const sessionColor = session.tags?.color || '未選択';
        const sessionEmotion = session.tags?.emotion || '未選択';
        const sessionShape = session.tags?.shape || '未選択';
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

    const sessionColor = session.tags?.color || '未選択';
    const sessionEmotion = session.tags?.emotion || '未選択';
    const sessionShape = session.tags?.shape || '未選択';
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
         const noCanvasMessage = document.createElement('p');
         noCanvasMessage.textContent = "グラフ表示要素が見つかりません。";
         noCanvasMessage.style.textAlign = 'center';
         noCanvasMessage.style.color = 'var(--md-sys-color-error)';
         historyDetailView.insertBefore(noCanvasMessage, historyPhotosContainer.previousElementSibling); // Insert before photo container
        return;
    }
    const ctx = historyChartCanvas.getContext('2d');
     if (!ctx) {
        console.error("Could not get 2D context for history chart canvas!");
         const noCanvasMessage = document.createElement('p');
         noCanvasMessage.textContent = "グラフ表示コンテキストの取得に失敗しました。";
         noCanvasMessage.style.textAlign = 'center';
         noCanvasMessage.style.color = 'var(--md-sys-color-error)';
          historyDetailView.insertBefore(noCanvasMessage, historyPhotosContainer.previousElementSibling);
        return;
    }

    // Filter data for chart: only include points with *any* numerical sensor reading relevant to charts
    // This avoids plotting sparse data if only photos/location were captured briefly.
    const dataPointsForChart = session.data.filter(d =>
         d.accelX !== null && typeof d.accelX === 'number' || d.accelY !== null && typeof d.accelY === 'number' || d.accelZ !== null && typeof d.accelZ === 'number' ||
         d.orientAlpha !== null && typeof d.orientAlpha === 'number' || d.orientBeta !== null && typeof d.orientBeta === 'number' || d.orientGamma !== null && typeof d.orientGamma === 'number' ||
         d.gyroAlpha !== null && typeof d.gyroAlpha === 'number' || d.gyroBeta !== null && typeof d.gyroBeta === 'number' || d.gyroGamma !== null && typeof d.gyroGamma === 'number' ||
         d.illuminance !== null && typeof d.illuminance === 'number' || (d.decibels !== null && isFinite(d.decibels)) ||
         d.latitude !== null && typeof d.latitude === 'number' || d.longitude !== null && typeof d.longitude === 'number' || d.altitude !== null && typeof d.altitude === 'number' || d.speed !== null && typeof d.speed === 'number' || (d.heading !== null && typeof d.heading === 'number' && !isNaN(d.heading)) ||
         d.temperature_celsius !== null && typeof d.temperature_celsius === 'number' || d.steps_interval > 0 || d.photoTakenId !== null // Include if step or photo occurred
    );


    if (dataPointsForChart.length < 2) {
         historyChartCanvas.style.display = 'none';
         // Display a message instead
         const noDataMessage = document.createElement('p');
         noDataMessage.textContent = "グラフ表示に必要なセンサーデータが不足しています。";
         noDataMessage.style.textAlign = 'center';
         noDataMessage.style.color = 'var(--md-sys-color-on-surface-variant)';
         // Check if a message already exists before adding
         // Find the h4 "センサーデータグラフ" and insert the message after it
         const chartTitle = historyDetailView.querySelector('h4');
         if (chartTitle && chartTitle.textContent.includes("センサーデータグラフ")) {
              const nextElement = chartTitle.nextElementSibling;
              if (!nextElement || !nextElement.textContent.includes("グラフ表示に必要な")) {
                 chartTitle.parentNode.insertBefore(noDataMessage, nextElement);
              }
         } else {
              // Fallback if h4 title is not found
              if (!historyChartCanvas.previousElementSibling || !historyChartCanvas.previousElementSibling.textContent.includes("グラフ表示に必要な")) {
                 historyChartCanvas.parentNode.insertBefore(noDataMessage, historyChartCanvas);
              }
         }

         return;
    } else {
         historyChartCanvas.style.display = 'block';
         // Remove any previous "no data" message
         const chartTitle = historyDetailView.querySelector('h4');
         if (chartTitle) {
              const nextElement = chartTitle.nextElementSibling;
               if (nextElement && nextElement.textContent.includes("グラフ表示に必要なセンサーデータ")) {
                  nextElement.remove();
               }
         } else {
              const previousMessage = historyChartCanvas.previousElementSibling;
              if(previousMessage && previousMessage.textContent.includes("グラフ表示に必要なセンサーデータ")) {
                 previousMessage.remove();
              }
         }

    }


    const labels = dataPointsForChart.map(d => new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 1 }));

    const datasets = [];
    // Add datasets only if there's at least one non-null/finite value for that sensor type in the *filtered* data
    // Default visibility (hidden: false) set for some key datasets
    if (dataPointsForChart.some(d => d.accelX !== null && typeof d.accelX === 'number')) datasets.push({ label: 'Accel X', data: dataPointsForChart.map(d => d.accelX), borderColor: 'rgba(255, 99, 132, 0.8)', backgroundColor: 'rgba(255, 99, 132, 0.2)', fill: false, tension: 0.1, hidden: true, yAxisID: 'yMotion' });
    if (dataPointsForChart.some(d => d.accelY !== null && typeof d.accelY === 'number')) datasets.push({ label: 'Accel Y', data: dataPointsForChart.map(d => d.accelY), borderColor: 'rgba(54, 162, 235, 0.8)', backgroundColor: 'rgba(54, 162, 235, 0.2)', fill: false, tension: 0.1, hidden: true, yAxisID: 'yMotion' });
    if (dataPointsForChart.some(d => d.accelZ !== null && typeof d.accelZ === 'number')) datasets.push({ label: 'Accel Z', data: dataPointsForChart.map(d => d.accelZ), borderColor: 'rgba(75, 192, 192, 0.8)', backgroundColor: 'rgba(75, 192, 192, 0.2)', fill: false, tension: 0.1, yAxisID: 'yMotion' }); // Default Visible
    if (dataPointsForChart.some(d => d.orientAlpha !== null && typeof d.orientAlpha === 'number')) datasets.push({ label: 'Orient Alpha (Z)', data: dataPointsForChart.map(d => d.orientAlpha), borderColor: 'rgba(153, 102, 255, 0.8)', backgroundColor: 'rgba(153, 102, 255, 0.2)', fill: false, tension: 0.1, hidden: true, yAxisID: 'yOrientation' });
     if (dataPointsForChart.some(d => d.orientBeta !== null && typeof d.orientBeta === 'number')) datasets.push({ label: 'Orient Beta (X)', data: dataPointsForChart.map(d => d.orientBeta), borderColor: 'rgba(255, 159, 64, 0.8)', backgroundColor: 'rgba(255, 159, 64, 0.2)', fill: false, tension: 0.1, hidden: true, yAxisID: 'yOrientation' });
    if (dataPointsForChart.some(d => d.orientGamma !== null && typeof d.orientGamma === 'number')) datasets.push({ label: 'Orient Gamma (Y)', data: dataPointsForChart.map(d => d.orientGamma), borderColor: 'rgba(201, 203, 207, 0.8)', backgroundColor: 'rgba(201, 203, 207, 0.2)', fill: false, tension: 0.1, hidden: true, yAxisID: 'yOrientation' });
    if (dataPointsForChart.some(d => d.gyroAlpha !== null && typeof d.gyroAlpha === 'number')) datasets.push({ label: 'Gyro Alpha (Z)', data: dataPointsForChart.map(d => d.gyroAlpha), borderColor: 'rgba(255, 99, 132, 0.5)', backgroundColor: 'rgba(255, 99, 132, 0.1)', fill: false, tension: 0.1, hidden: true, yAxisID: 'yGyro' });
     if (dataPointsForChart.some(d => d.gyroBeta !== null && typeof d.gyroBeta === 'number')) datasets.push({ label: 'Gyro Beta (X)', data: dataPointsForChart.map(d => d.gyroBeta), borderColor: 'rgba(54, 162, 235, 0.5)', backgroundColor: 'rgba(54, 162, 235, 0.1)', fill: false, tension: 0.1, hidden: true, yAxisID: 'yGyro' });
    if (dataPointsForChart.some(d => d.gyroGamma !== null && typeof d.gyroGamma === 'number')) datasets.push({ label: 'Gyro Gamma (Y)', data: dataPointsForChart.map(d => d.gyroGamma), borderColor: 'rgba(75, 192, 192, 0.5)', backgroundColor: 'rgba(75, 192, 192, 0.1)', fill: false, tension: 0.1, hidden: true, yAxisID: 'yGyro' });
    if (dataPointsForChart.some(d => d.illuminance !== null && typeof d.illuminance === 'number')) datasets.push({ label: 'Illuminance (lux)', data: dataPointsForChart.map(d => d.illuminance), borderColor: 'rgba(255, 205, 86, 0.8)', backgroundColor: 'rgba(255, 205, 86, 0.2)', fill: false, tension: 0.1, yAxisID: 'yLux', hidden: true });
    if (dataPointsForChart.some(d => d.decibels !== null && isFinite(d.decibels))) datasets.push({ label: 'Decibels (dBFS)', data: dataPointsForChart.map(d => isFinite(d.decibels) ? d.decibels : null), borderColor: 'rgba(153, 102, 255, 0.8)', backgroundColor: 'rgba(153, 102, 255, 0.2)', fill: false, tension: 0.1, yAxisID: 'yDb' }); // Default Visible
     if (dataPointsForChart.some(d => d.latitude !== null && typeof d.latitude === 'number')) datasets.push({ label: 'Latitude', data: dataPointsForChart.map(d => d.latitude), borderColor: 'rgba(0, 128, 0, 0.8)', backgroundColor: 'rgba(0, 128, 0, 0.2)', fill: false, tension: 0.1, yAxisID: 'yGeo', hidden: true });
     if (dataPointsForChart.some(d => d.longitude !== null && typeof d.longitude === 'number')) datasets.push({ label: 'Longitude', data: dataPointsForChart.map(d => d.longitude), borderColor: 'rgba(0, 0, 128, 0.8)', backgroundColor: 'rgba(0, 0, 128, 0.2)', fill: false, tension: 0.1, yAxisID: 'yGeo', hidden: true });
     if (dataPointsForChart.some(d => d.gpsAccuracy !== null && typeof d.gpsAccuracy === 'number')) datasets.push({ label: 'GPS Accuracy (m)', data: dataPointsForChart.map(d => d.gpsAccuracy), borderColor: 'rgba(128, 128, 128, 0.8)', backgroundColor: 'rgba(128, 128, 128, 0.2)', fill: false, tension: 0.1, yAxisID: 'yAcc', hidden: true });
    if (dataPointsForChart.some(d => d.altitude !== null && typeof d.altitude === 'number')) datasets.push({ label: 'Altitude (m)', data: dataPointsForChart.map(d => d.altitude), borderColor: 'rgba(139, 69, 19, 0.8)', backgroundColor: 'rgba(139, 69, 19, 0.2)', fill: false, tension: 0.1, yAxisID: 'yAlt' }); // Default Visible
     if (dataPointsForChart.some(d => d.speed !== null && typeof d.speed === 'number')) datasets.push({ label: 'Speed (m/s)', data: dataPointsForChart.map(d => d.speed), borderColor: 'rgba(0, 0, 255, 0.8)', backgroundColor: 'rgba(0, 0, 255, 0.2)', fill: false, tension: 0.1, yAxisID: 'ySpeed', hidden: true });
     if (dataPointsForChart.some(d => d.heading !== null && typeof d.heading === 'number' && !isNaN(d.heading))) datasets.push({ label: 'Heading (°)', data: dataPointsForChart.map(d => d.heading), borderColor: 'rgba(128, 128, 0, 0.8)', backgroundColor: 'rgba(128, 128, 0, 0.2)', fill: false, tension: 0.1, yAxisID: 'yHeading', hidden: true });
    if (dataPointsForChart.some(d => d.temperature_celsius !== null && typeof d.temperature_celsius === 'number')) datasets.push({ label: 'Temperature (°C)', data: dataPointsForChart.map(d => d.temperature_celsius), borderColor: 'rgba(255, 99, 71, 0.8)', backgroundColor: 'rgba(255, 99, 71, 0.2)', fill: false, tension: 0.1, yAxisID: 'yTemp' }); // Default Visible
    // Steps as points or a stepped line
    const stepData = dataPointsForChart.map(d => d.steps_interval > 0 ? 1 : null); // Map steps_interval to 1 if step occurred, null otherwise
    // Only add step dataset if any step occurred in the filtered data
    if (stepData.some(v => v === 1)) datasets.push({ label: 'Steps (Event)', data: stepData, borderColor: 'rgba(50, 205, 50, 0.8)', backgroundColor: 'rgba(50, 205, 50, 0.8)', fill: false, stepped: 'middle', tension: 0, yAxisID: 'ySteps', pointRadius: 5, showLine: false, pointStyle: 'star' });


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
         // Y axis for Steps (event marker)
        ySteps: { type: 'category', display: 'auto', position: 'left', labels: ['Step'], title: { display: true, text: 'Steps' }, grid: { drawOnChartArea: false, } }, // Use category axis for events


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
     // Destroy chart instance when leaving the history detail view
    if (historyDetailView.style.display !== 'block' && historyChartInstance) {
        historyChartInstance.destroy();
        historyChartInstance = null;
         // Remove any "no data" message that might be lingering
         const previousMessage = historyChartCanvas?.previousElementSibling;
         if(previousMessage && previousMessage.textContent.includes("グラフ表示に必要なセンサーデータ")) {
             previousMessage.remove();
         }
          const noCanvasMessage = historyDetailView.querySelector('p')
          if(noCanvasMessage && (noCanvasMessage.textContent.includes("グラフ表示要素が見つかりません") || noCanvasMessage.textContent.includes("グラフ表示コンテキストの取得に失敗しました"))) {
              noCanvasMessage.remove();
          }
    }
}

// --- Sensor Card Toggle Logic ---
document.querySelectorAll('.sensor-card-toggle').forEach(card => {
     card.addEventListener('click', (event) => {
         // Don't toggle if clicking an interactive element inside the card
         const target = event.target;
         if (target.closest('md-icon-button') || target.closest('md-filled-button') || target.closest('a')) {
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

// Ensure buttons reflect state correctly after load
// This is handled by updateRecordingButtonState, called after loadHistory and initSensors
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM要素の取得 ---
    const navItems = document.querySelectorAll('.nav-item');
    const screens = document.querySelectorAll('.screen');
    const generateButton = document.getElementById('generate-button');
    const saveButton = document.getElementById('save-button');
    const canvas = document.getElementById('postcard-canvas');
    const ctx = canvas.getContext('2d');
    const galleryGrid = document.getElementById('gallery-grid');
    const noGalleryMessage = document.getElementById('no-gallery-message');
    const openSettings = document.getElementById('open-settings');
    const controlsCard = document.getElementById('controls-card');

    // --- 入力フォーム ---
    const emotionSelect = document.getElementById('emotion');
    const moodInput = document.getElementById('mood');
    const moodValue = document.getElementById('mood-value');
    const stepsInput = document.getElementById('steps');
    const hertzInput = document.getElementById('hertz');
    const hertzValue = document.getElementById('hertz-value');
    const maxTempInput = document.getElementById('maxTemp');
    const minTempInput = document.getElementById('minTemp');
    const dateTextInput = document.getElementById('dateText');

    // --- 定数と設定 ---
    canvas.width = 1000;
    canvas.height = 1480;

    // 感情ごとの16進数カラーコード
    const emotionColors = {
        'うれしい': '#ff8005',
        '楽しい': '#f2b40c',
        '穏やか': '#94e020',
        '悲しい': '#1374f0',
        '怒り': '#e60d0d',
        '不快': '#5c19e6',
        '恐ろしい': '#33cc70',
        'なにもしない': '#737c8c'
    };

    // --- ヘルパー関数 (Processing互換) ---
    const random = (min, max) => min + Math.random() * (max - min);
    const map = (n, start1, stop1, start2, stop2) => ((n - start1) / (stop1 - start1)) * (stop2 - start2) + start2;
    const constrain = (n, low, high) => Math.max(Math.min(n, high), low);
    
    // Box-Muller transform for gaussian random distribution
    let spareRandom = null;
    function randomGaussian() {
        if (spareRandom !== null) {
            const val = spareRandom;
            spareRandom = null;
            return val;
        }
        let u, v, s;
        do {
            u = Math.random() * 2 - 1;
            v = Math.random() * 2 - 1;
            s = u * u + v * v;
        } while (s >= 1 || s === 0);
        s = Math.sqrt(-2.0 * Math.log(s) / s);
        spareRandom = v * s;
        return u * s;
    }

    // --- イベントリスナー ---
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetScreenId = item.getAttribute('data-screen');
            screens.forEach(screen => screen.classList.toggle('active', screen.id === targetScreenId));
            navItems.forEach(nav => nav.classList.toggle('active', nav.getAttribute('data-screen') === targetScreenId));
            if (targetScreenId === 'screen-gallery') loadGallery();
        });
    });

    generateButton.addEventListener('click', generateArtwork);
    saveButton.addEventListener('click', saveToGallery);

    moodInput.addEventListener('input', () => moodValue.textContent = moodInput.value);
    hertzInput.addEventListener('input', () => hertzValue.textContent = hertzInput.value);

    openSettings.addEventListener('click', () => {
        controlsCard.style.display = 'block';
        controlsCard.classList.add('show');
    });

    // 外側クリックやEscで閉じる
    document.addEventListener('mousedown', (e) => {
        if (controlsCard.style.display === 'block' && !controlsCard.contains(e.target) && e.target !== openSettings) {
            controlsCard.style.display = 'none';
            controlsCard.classList.remove('show');
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && controlsCard.style.display === 'block') {
            controlsCard.style.display = 'none';
            controlsCard.classList.remove('show');
        }
    });

    // --- メイン描画関数 ---
    function generateArtwork() {
        // 1. 入力値を取得
        const emotion = emotionSelect.value;
        const mood = parseInt(moodInput.value, 10);
        const steps = parseInt(stepsInput.value, 10);
        const hertz = parseFloat(hertzInput.value);
        const maxTemp = parseFloat(maxTempInput.value);
        const minTemp = parseFloat(minTempInput.value);
        const dateText = dateTextInput.value;

        // 2. 描画パラメータを計算
        const tempRange = constrain(maxTemp - minTemp, 0, 20);
        
        // ★ 感情に基づいて基本の色を決定
        let baseColor = emotionColors[emotion];
        if (!baseColor) baseColor = '#737c8c'; // 万一未定義ならグレー

        const blobCount = Math.floor(map(steps, 0, 20000, 40, 200));
        const softness = map(hertz, 40, 60, 10, 40);
        const maxBlobSize = map(mood, 1, 10, 80, 200);

        // 3. 描画開始
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // 背景
        ctx.fillStyle = '#FCFAF5'; // 和紙っぽいベージュ (HSB(36, 10, 98))
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // ブロブ描画
        for (let i = 0; i < blobCount; i++) {
            const cx = canvas.width * randomGaussian() * 0.2 + canvas.width / 2;
            const cy = canvas.height * randomGaussian() * 0.2 + canvas.height / 2;

            const blobSize = random(maxBlobSize * 0.4, maxBlobSize);
            // 色をHSLでランダムに揺らす（明度・彩度のみ）
            let h, s, l;
            if (baseColor) {
                // HEX→HSL変換
                [h, s, l] = hexToHSL(baseColor);
                s = random(s * 0.8, s * 1.1); // 彩度を少し揺らす
                l = random(l * 0.8, l * 1.1); // 明度を少し揺らす
            } else {
                h = 220; s = 15; l = 60;
            }
            for (let j = 0; j < Math.floor(random(4, 8)); j++) {
                const r = blobSize * random(0.4, 1.0);
                const alpha = map(j, 0, 10, 0.06, 0.01) * 2;
                ctx.fillStyle = `hsla(${h}, ${s}%, ${l}%, ${alpha})`;
                ctx.beginPath();
                ctx.ellipse(
                    cx + random(-softness, softness),
                    cy + random(-softness, softness),
                    r / 2,
                    (r * random(0.6, 1.2)) / 2,
                    0, 0, Math.PI * 2
                );
                ctx.fill();
            }
        }
        
        // 紙テクスチャ
        ctx.globalCompositeOperation = 'multiply';
        // 粒子ノイズ
        for (let i = 0; i < 6000; i++) {
            const x = random(0, canvas.width);
            const y = random(0, canvas.height);
            const g = random(85, 100);
            const a = random(1, 4) / 100;
            ctx.fillStyle = `hsla(36, 10%, ${g}%, ${a})`;
            ctx.fillRect(x, y, 1, 1);
        }
        // 繊維っぽい細線
        for (let i = 0; i < 200; i++) {
            const x = random(0, canvas.width);
            const y = random(0, canvas.height);
            const len = random(10, 40);
            ctx.strokeStyle = `hsla(36, 5%, 80%, 0.03)`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + len);
            ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over'; // ブレンドモードを戻す

        // 墨で日付
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.font = "42px 'Noto Sans JP', sans-serif";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(dateText, canvas.width / 2, canvas.height - 80);
    }
    
    // --- ギャラリー機能 ---
    function saveToGallery() {
        const imageDataUrl = canvas.toDataURL('image/png');
        let gallery = JSON.parse(localStorage.getItem('postcardGallery')) || [];
        gallery.unshift(imageDataUrl);
        localStorage.setItem('postcardGallery', JSON.stringify(gallery));
        alert('ギャラリーに保存しました！');
    }

    function loadGallery() {
        galleryGrid.innerHTML = '';
        const gallery = JSON.parse(localStorage.getItem('postcardGallery')) || [];
        noGalleryMessage.style.display = gallery.length === 0 ? 'block' : 'none';
        
        gallery.forEach(imageDataUrl => {
            const card = document.createElement('div');
            card.className = 'gallery-card';
            const img = document.createElement('img');
            img.src = imageDataUrl;
            img.alt = '保存されたはがき';
            card.appendChild(img);
            galleryGrid.appendChild(card);
        });
    }

    // HEX→HSL変換関数を追加
    function hexToHSL(H) {
        // HEX→RGB
        let r = 0, g = 0, b = 0;
        if (H.length == 4) {
            r = "0x" + H[1] + H[1];
            g = "0x" + H[2] + H[2];
            b = "0x" + H[3] + H[3];
        } else if (H.length == 7) {
            r = "0x" + H[1] + H[2];
            g = "0x" + H[3] + H[4];
            b = "0x" + H[5] + H[6];
        }
        r /= 255; g /= 255; b /= 255;
        let max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        if (max == min) {
            h = s = 0; // achromatic
        } else {
            let d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
    }

    // --- 初期化処理 ---
    generateArtwork();
});
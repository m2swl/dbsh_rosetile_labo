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

    // 入力フォーム
    const stepsInput = document.getElementById('steps');
    const tempInput = document.getElementById('temp');
    const emotionSelect = document.getElementById('emotion');
    const degreeInput = document.getElementById('degree');
    const degreeValue = document.getElementById('degree-value');

    // 感情と色のマッピング
    const emotionColors = {
        '楽しい': '255, 204, 0',    // 黄
        'うれしい': '255, 153, 130', // オレンジ
        '穏やか': '143, 235, 115', // 黄緑
        '悲しい': '73, 133, 206',   // 青
        '怒り': '217, 50, 50',    // 赤
        '不快': '96, 70, 175',    // 紫
        '恐ろしい': '46, 140, 81',    // 緑
        'なにもしない': '220, 220, 220', // 白に近いグレー
    };

    // --- 初期設定 ---
    // Canvasの解像度を設定 (表示サイズと合わせる)
    canvas.width = 400;
    canvas.height = 592; // 10:14.8 の比率


    // --- イベントリスナー ---
    // タブ切り替え
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetScreenId = item.getAttribute('data-screen');

            screens.forEach(screen => {
                screen.classList.toggle('active', screen.id === targetScreenId);
            });

            navItems.forEach(nav => {
                nav.classList.toggle('active', nav.getAttribute('data-screen') === targetScreenId);
            });
            
            if (targetScreenId === 'screen-gallery') {
                loadGallery();
            }
        });
    });

    // 生成ボタン
    generateButton.addEventListener('click', generateArtwork);
    
    // 保存ボタン
    saveButton.addEventListener('click', saveToGallery);

    // 度合いスライダーの値表示を更新
    degreeInput.addEventListener('input', () => {
        degreeValue.textContent = degreeInput.value;
    });


    // --- 関数 ---
    /**
     * 入力値に基づいてアートワークを生成しCanvasに描画する
     */
    function generateArtwork() {
        // 1. 入力値を取得
        const steps = parseInt(stepsInput.value, 10);
        const temp = parseInt(tempInput.value, 10);
        const emotion = emotionSelect.value;
        const degree = parseInt(degreeInput.value, 10);

        // 2. 描画パラメータを計算
        const numCircles = Math.max(50, Math.floor(steps / 20)); // 丸の総数
        const baseColor = emotionColors[emotion]; // 基本色(RGB)
        
        // 気温に応じて鮮やかさを調整 (-10℃で50%, 40℃で150%)
        const saturation = Math.round(((temp + 10) / 50) * 100 + 50); 
        ctx.filter = `saturate(${saturation}%)`;

        // 3. Canvasをクリア
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // 背景色を少し暗く設定
        ctx.fillStyle = '#f0f4f8';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 4. 丸を描画
        for (let i = 0; i < numCircles; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            
            // 度合いに応じて丸の濃淡（アルファ値）とサイズを調整
            const alpha = 0.1 + (degree / 10) * 0.4 + Math.random() * 0.3; // 0.1-0.8
            const radius = 10 + (degree / 10) * 20 + Math.random() * 20; // 10-50

            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2, false);
            ctx.fillStyle = `rgba(${baseColor}, ${alpha})`;
            ctx.fill();
        }
        
        // フィルターをリセット
        ctx.filter = 'none';
    }

    /**
     * 現在のCanvasの内容を画像としてローカルストレージに保存する
     */
    function saveToGallery() {
        const imageDataUrl = canvas.toDataURL('image/png');
        
        // ローカルストレージから既存のギャラリーデータを取得
        let gallery = JSON.parse(localStorage.getItem('postcardGallery')) || [];
        
        // 新しい画像データを先頭に追加
        gallery.unshift(imageDataUrl);
        
        // ローカルストレージに保存
        localStorage.setItem('postcardGallery', JSON.stringify(gallery));
        
        alert('ギャラリーに保存しました！');
    }

    /**
     * ローカルストレージからギャラリーを読み込んで表示する
     */
    function loadGallery() {
        galleryGrid.innerHTML = ''; // グリッドをクリア
        const gallery = JSON.parse(localStorage.getItem('postcardGallery')) || [];

        if (gallery.length === 0) {
            noGalleryMessage.style.display = 'block';
        } else {
            noGalleryMessage.style.display = 'none';
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
    }


    // --- 初期化処理 ---
    // ページ読み込み時に一度アートワークを生成して表示
    generateArtwork();
});
/**
 * FukuwaraiScene - 福笑いミニゲームのメインシーン（UI改善版）
 * 
 * 機能:
 * - パーツのドラッグ＆ドロップ
 * - パーツの無段階回転（スライダー）
 * - 見本表示機能
 * - 画像シェア機能
 * - タイトル画面
 * - 改善されたUI
 */
export default class FukuwaraiScene extends Phaser.Scene {
    constructor() {
        super({ key: 'FukuwaraiScene' });

        this.gameState = 'TITLE';  // TITLE | LOADING | PREVIEW | PLAYING | JUDGING | RESULT
        this.config = null;

        // ゲームオブジェクト
        this.faceBase = null;
        this.completeImage = null;
        this.parts = [];
        this.selectedPart = null;

        // UI要素
        this.titleScreen = null;
        this.startButton = null;
        this.judgeButton = null;
        this.retryButton = null;
        this.shareButton = null;
        this.showGuideButton = null;
        this.resultText = null;
        this.titleText = null;
        this.instructionText = null;
        this.selectionIndicator = null;
        this.decorations = [];

        // 回転UI
        this.rotationSliderBg = null;
        this.rotationSliderHandle = null;
        this.rotationLabel = null;

        // サウンド
        this.bgm = null;
        this.placeSE = null;

        this.score = 0;
        this.scoreRank = '';
        this.isGuideVisible = false;
    }

    preload() {
        const loadingText = this.add.text(
            this.scale.width / 2,
            this.scale.height / 2,
            '🎭 Loading...',
            { fontSize: '36px', color: '#333333', fontFamily: 'Arial, sans-serif' }
        ).setOrigin(0.5);

        this.load.json('fukuwarai_config', 'assets/data/fukuwarai_tartman.json');

        this.load.image('tartman_face', 'assets/images/IMG_4566.png');
        this.load.image('tartman_eye_right', 'assets/images/無題131_20251204190306.png');
        this.load.image('tartman_eye_left', 'assets/images/無題131_20251204190321.png');
        this.load.image('tartman_nose', 'assets/images/無題131_20251204190337.png');
        this.load.image('tartman_mouth', 'assets/images/無題131_20251204190400.png');
        this.load.image('tartman_complete', 'assets/images/無題131_20251204190653.png');

        // サウンド読み込み
        this.load.audio('bgm_cafe', 'assets/cafe.mp3');
        this.load.audio('se_place', 'assets/gyakuten_popopo.mp3');

        this.load.on('complete', () => {
            loadingText.destroy();
        });
    }

    create() {
        this.config = this.cache.json.get('fukuwarai_config');

        // グラデーション背景
        this.createBackground();

        // 装飾
        this.createDecorations();

        // タイトル画面を表示
        this.showTitleScreen();
    }

    /**
     * グラデーション風背景
     */
    createBackground() {
        const graphics = this.add.graphics();

        // グラデーション風の背景（上から下へ）
        const colors = [0xFFF8E1, 0xFFECB3, 0xFFE082];
        const height = this.scale.height / colors.length;

        colors.forEach((color, index) => {
            graphics.fillStyle(color, 1);
            graphics.fillRect(0, index * height, this.scale.width, height + 1);
        });
    }

    /**
     * 装飾要素
     */
    createDecorations() {
        // 左上の桜?
        const sakura1 = this.add.text(30, 30, '🌸', { fontSize: '40px' });
        const sakura2 = this.add.text(80, 60, '🌸', { fontSize: '30px' });

        // 右上
        const sakura3 = this.add.text(this.scale.width - 60, 30, '🌸', { fontSize: '40px' });
        const sakura4 = this.add.text(this.scale.width - 100, 70, '🌸', { fontSize: '25px' });

        this.decorations = [sakura1, sakura2, sakura3, sakura4];

        // ゆらゆらアニメーション
        this.decorations.forEach((deco, i) => {
            this.tweens.add({
                targets: deco,
                y: deco.y + 10,
                duration: 1500 + i * 200,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        });
    }

    /**
     * タイトル画面表示
     */
    showTitleScreen() {
        this.gameState = 'TITLE';
        this.difficulty = 'normal';  // easy | normal | hard

        // タイトルコンテナ
        this.titleScreen = this.add.container(this.scale.width / 2, 0);

        // メインタイトル
        const mainTitle = this.add.text(0, 150, '🎭 福笑い 🎭', {
            fontSize: '64px',
            fontFamily: 'Arial, sans-serif',
            color: '#D84315',
            stroke: '#ffffff',
            strokeThickness: 6
        }).setOrigin(0.5);

        // サブタイトル
        const subTitle = this.add.text(0, 220, `～${this.config.character}編～`, {
            fontSize: '36px',
            fontFamily: 'Arial, sans-serif',
            color: '#5D4037'
        }).setOrigin(0.5);

        // 難易度選択テキスト
        const difficultyLabel = this.add.text(0, 300, '難易度を選んでね：', {
            fontSize: '24px',
            fontFamily: 'Arial, sans-serif',
            color: '#666666'
        }).setOrigin(0.5);

        // 難易度ボタン（やさしい）
        const easyBtn = this.createDifficultyButton(
            -180, 370, '😊 やさしい', 0x8BC34A,
            () => this.setDifficulty('easy')
        );

        // 難易度ボタン（ふつう）
        const normalBtn = this.createDifficultyButton(
            0, 370, '😐 ふつう', 0xFF9800,
            () => this.setDifficulty('normal')
        );

        // 難易度ボタン（むずかしい）
        const hardBtn = this.createDifficultyButton(
            180, 370, '😈 むずかしい', 0xF44336,
            () => this.setDifficulty('hard')
        );

        this.difficultyButtons = { easy: easyBtn, normal: normalBtn, hard: hardBtn };
        this.updateDifficultyButtons();

        // スタートボタン
        this.startButton = this.createStyledButton(
            0, 480,
            '🎮 スタート',
            0x4CAF50,
            () => this.startGame()
        );

        // 難易度説明
        this.difficultyDesc = this.add.text(0, 560,
            '見本を3秒間覚えて\nパーツを動かすと見本が消えるよ',
            {
                fontSize: '20px',
                fontFamily: 'Arial, sans-serif',
                color: '#795548',
                align: 'center',
                lineSpacing: 6,
                backgroundColor: '#ffffff80',
                padding: { x: 15, y: 10 }
            }
        ).setOrigin(0.5);

        // ルール説明
        const rules = this.add.text(0, 680,
            '📌 ルール\n' +
            '1. パーツをドラッグで移動\n' +
            '2. スライダーで回転調整\n' +
            '3. 判定ボタンで結果発表！',
            {
                fontSize: '20px',
                fontFamily: 'Arial, sans-serif',
                color: '#795548',
                align: 'center',
                lineSpacing: 6,
                backgroundColor: '#ffffff80',
                padding: { x: 15, y: 10 }
            }
        ).setOrigin(0.5);

        this.titleScreen.add([mainTitle, subTitle, difficultyLabel, easyBtn, normalBtn, hardBtn, this.startButton, this.difficultyDesc, rules]);

        // タイトルアニメーション
        this.tweens.add({
            targets: mainTitle,
            scale: 1.05,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    /**
     * 難易度ボタンを作成
     */
    createDifficultyButton(x, y, text, color, callback) {
        const button = this.add.container(x, y);

        const bg = this.add.graphics();
        bg.fillStyle(color, 1);
        bg.fillRoundedRect(-75, -25, 150, 50, 10);

        const label = this.add.text(0, 0, text, {
            fontSize: '20px',
            fontFamily: 'Arial, sans-serif',
            color: '#ffffff'
        }).setOrigin(0.5);

        button.add([bg, label]);
        button.setData('bg', bg);
        button.setData('color', color);

        const hitArea = this.add.rectangle(0, 0, 150, 50, 0x000000, 0);
        hitArea.setInteractive({ useHandCursor: true });
        button.add(hitArea);

        hitArea.on('pointerdown', callback);

        return button;
    }

    /**
     * 難易度を設定
     */
    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        this.updateDifficultyButtons();

        // 説明文を更新
        const descriptions = {
            'easy': '常に見本が表示されるよ！',
            'normal': '見本を3秒間覚えて\nパーツを動かすと見本が消えるよ',
            'hard': '見本なし！記憶力が試される！'
        };
        this.difficultyDesc.setText(descriptions[difficulty]);
    }

    /**
     * 難易度ボタンの見た目を更新
     */
    updateDifficultyButtons() {
        Object.entries(this.difficultyButtons).forEach(([key, btn]) => {
            const bg = btn.getData('bg');
            const color = btn.getData('color');
            bg.clear();

            if (key === this.difficulty) {
                // 選択中
                bg.lineStyle(4, 0xFFFFFF, 1);
                bg.fillStyle(color, 1);
                bg.fillRoundedRect(-75, -25, 150, 50, 10);
                bg.strokeRoundedRect(-75, -25, 150, 50, 10);
                btn.setScale(1.1);
            } else {
                // 非選択
                bg.fillStyle(color, 0.6);
                bg.fillRoundedRect(-75, -25, 150, 50, 10);
                btn.setScale(1);
            }
        });
    }

    /**
     * スタイル付きボタンを作成
     */
    createStyledButton(x, y, text, color, callback) {
        const button = this.add.container(x, y);

        // ボタン背景（影）
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.3);
        shadow.fillRoundedRect(-120, -28, 240, 60, 15);
        shadow.x = 4;
        shadow.y = 4;

        // ボタン背景
        const bg = this.add.graphics();
        bg.fillStyle(color, 1);
        bg.fillRoundedRect(-120, -28, 240, 56, 15);

        // ボタンハイライト
        const highlight = this.add.graphics();
        highlight.fillStyle(0xffffff, 0.3);
        highlight.fillRoundedRect(-115, -25, 230, 25, 10);

        // テキスト
        const label = this.add.text(0, 0, text, {
            fontSize: '32px',
            fontFamily: 'Arial, sans-serif',
            color: '#ffffff'
        }).setOrigin(0.5);

        button.add([shadow, bg, highlight, label]);

        // インタラクティブ領域
        const hitArea = this.add.rectangle(0, 0, 240, 56, 0x000000, 0);
        hitArea.setInteractive({ useHandCursor: true });
        button.add(hitArea);

        // ホバー効果
        hitArea.on('pointerover', () => {
            button.setScale(1.05);
        });

        hitArea.on('pointerout', () => {
            button.setScale(1);
        });

        hitArea.on('pointerdown', () => {
            button.setScale(0.95);
            callback();
        });

        return button;
    }

    /**
     * ゲーム開始
     */
    startGame() {
        // タイトル画面を非表示
        this.tweens.add({
            targets: this.titleScreen,
            alpha: 0,
            y: -100,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                this.titleScreen.setVisible(false);
                this.initializeGame();
            }
        });
    }

    /**
     * ゲーム初期化
     */
    initializeGame() {
        this.selectionIndicator = this.add.graphics();

        // ★ サウンド初期化
        this.bgm = this.sound.add('bgm_cafe', { loop: true, volume: 0.5 });
        this.placeSE = this.sound.add('se_place', { volume: 0.7 });

        // BGM再生開始
        this.bgm.play();

        this.createFaceBase();
        this.createCompleteImage();
        this.createParts();
        this.createGameUI();
        this.createRotationSlider();

        this.startPreview();
    }

    createFaceBase() {
        this.faceBase = this.add.image(
            this.scale.width / 2,
            this.scale.height / 2 - 100,
            this.config.face_base
        );
        const maxWidth = 500;
        const scale = Math.min(maxWidth / this.faceBase.width, 1);
        this.faceBase.setScale(scale);
        this.faceBase.setAlpha(0);
    }

    createCompleteImage() {
        this.completeImage = this.add.image(
            this.scale.width / 2,
            this.scale.height / 2 - 100,
            'tartman_complete'
        );
        const targetWidth = this.faceBase.width * this.faceBase.scale;
        const completeScale = targetWidth / this.completeImage.width;
        this.completeImage.setScale(completeScale);
        this.completeImage.setAlpha(0);
        this.completeImage.setDepth(100);
    }

    createParts() {
        this.config.parts.forEach((partConfig, index) => {
            const part = this.add.image(
                partConfig.start_x,
                partConfig.start_y,
                partConfig.texture
            );

            part.setData('id', partConfig.id);
            part.setData('correct_x', partConfig.correct_x);
            part.setData('correct_y', partConfig.correct_y);
            part.setData('start_x', partConfig.start_x);
            part.setData('start_y', partConfig.start_y);
            part.setData('placed', false);

            const randomAngle = Phaser.Math.Between(-180, 180);
            part.setAngle(randomAngle);
            part.setData('start_angle', randomAngle);

            part.setInteractive({ draggable: true });
            part.setScale(1.0);

            part.on('pointerdown', () => {
                if (this.gameState !== 'PLAYING') return;
                this.selectPart(part);
            });

            part.on('dragstart', () => {
                if (this.gameState !== 'PLAYING') return;
                this.selectPart(part);
                part.setScale(1.1);
                this.children.bringToTop(part);

                // ★ normalモード: パーツ操作で見本を消す
                if (this.difficulty === 'normal' && this.isGuideVisible) {
                    this.hideGuideSoft();
                    if (this.guideTimer) {
                        this.guideTimer.remove();
                    }
                }
            });

            part.on('drag', (pointer, dragX, dragY) => {
                if (this.gameState !== 'PLAYING') return;
                part.x = dragX;
                part.y = dragY;
                this.updateSelectionIndicator();
            });

            part.on('dragend', () => {
                if (this.gameState !== 'PLAYING') return;
                part.setScale(1.0);
                part.setData('placed', true);
                // パーツ設置SE
                if (this.placeSE) {
                    this.placeSE.play();
                }
            });

            this.parts.push(part);
        });
    }

    selectPart(part) {
        this.selectedPart = part;
        this.updateSelectionIndicator();
        this.updateSliderPosition();
        this.children.bringToTop(part);
        this.children.bringToTop(this.selectionIndicator);
    }

    updateSelectionIndicator() {
        this.selectionIndicator.clear();

        if (this.selectedPart && this.gameState === 'PLAYING') {
            const part = this.selectedPart;
            const bounds = part.getBounds();

            this.selectionIndicator.lineStyle(4, 0x4CAF50, 1);
            this.selectionIndicator.strokeRoundedRect(
                bounds.x - 8,
                bounds.y - 8,
                bounds.width + 16,
                bounds.height + 16,
                8
            );
        }
    }

    createRotationSlider() {
        const sliderY = this.scale.height - 280;
        const sliderWidth = 300;
        const sliderX = this.scale.width / 2;

        this.rotationLabel = this.add.text(
            sliderX, sliderY - 35,
            '🔄 回転: 0°',
            {
                fontSize: '24px',
                fontFamily: 'Arial, sans-serif',
                color: '#5D4037',
                backgroundColor: '#ffffff80',
                padding: { x: 10, y: 5 }
            }
        ).setOrigin(0.5);
        this.rotationLabel.setVisible(false);

        this.rotationSliderBg = this.add.graphics();
        this.rotationSliderBg.fillStyle(0xBDBDBD, 1);
        this.rotationSliderBg.fillRoundedRect(sliderX - sliderWidth / 2, sliderY, sliderWidth, 24, 12);
        // トラック内側のグラデーション風
        this.rotationSliderBg.fillStyle(0x9E9E9E, 1);
        this.rotationSliderBg.fillRoundedRect(sliderX - sliderWidth / 2 + 2, sliderY + 2, sliderWidth - 4, 20, 10);
        this.rotationSliderBg.setVisible(false);

        // ハンドル（より大きく見やすく）
        this.rotationSliderHandle = this.add.circle(sliderX, sliderY + 12, 24, 0x7B1FA2);
        this.rotationSliderHandle.setStrokeStyle(4, 0xffffff);
        this.rotationSliderHandle.setInteractive({ draggable: true });
        this.rotationSliderHandle.setVisible(false);

        this.rotationSliderHandle.on('drag', (pointer, dragX, dragY) => {
            if (this.gameState !== 'PLAYING' || !this.selectedPart) return;

            const minX = sliderX - sliderWidth / 2;
            const maxX = sliderX + sliderWidth / 2;
            const clampedX = Phaser.Math.Clamp(dragX, minX, maxX);

            this.rotationSliderHandle.x = clampedX;

            const ratio = (clampedX - minX) / sliderWidth;
            const angle = Math.round((ratio * 360) - 180);

            this.selectedPart.setAngle(angle);
            this.rotationLabel.setText(`🔄 回転: ${angle}°`);
            this.updateSelectionIndicator();
        });
    }

    updateSliderPosition() {
        if (!this.selectedPart) return;

        const sliderWidth = 300;
        const sliderX = this.scale.width / 2;
        const minX = sliderX - sliderWidth / 2;

        let angle = this.selectedPart.angle;
        while (angle > 180) angle -= 360;
        while (angle < -180) angle += 360;

        const ratio = (angle + 180) / 360;
        const handleX = minX + (ratio * sliderWidth);

        this.rotationSliderHandle.x = handleX;
        this.rotationLabel.setText(`🔄 回転: ${Math.round(angle)}°`);
    }

    createGameUI() {
        // タイトル（ゲーム中）
        this.titleText = this.add.text(
            this.scale.width / 2, 45,
            `${this.config.character}の福笑い`,
            {
                fontSize: '40px',
                fontFamily: 'Arial, sans-serif',
                color: '#D84315',
                stroke: '#ffffff',
                strokeThickness: 4
            }
        ).setOrigin(0.5);

        // 説明テキスト
        this.instructionText = this.add.text(
            this.scale.width / 2,
            this.scale.height - 50,
            '',
            {
                fontSize: '26px',
                fontFamily: 'Arial, sans-serif',
                color: '#5D4037',
                backgroundColor: '#ffffff80',
                padding: { x: 15, y: 8 }
            }
        ).setOrigin(0.5);

        // 見本ボタン
        this.showGuideButton = this.createSmallButton(
            this.scale.width - 70, 100,
            '👁 見本', 0xFF9800,
            () => this.toggleGuide()
        );
        this.showGuideButton.setVisible(false);

        // 判定ボタン
        this.judgeButton = this.createStyledButton(
            this.scale.width / 2,
            this.scale.height - 130,
            '🎯 判定！',
            0x4CAF50,
            () => this.onJudge()
        );
        this.judgeButton.setVisible(false);

        // 結果画面用ボタン
        this.retryButton = this.createStyledButton(
            this.scale.width / 2 - 130,
            this.scale.height - 60,
            '🔄 もう一度',
            0x2196F3,
            () => this.retry()
        );
        this.retryButton.setVisible(false);

        this.shareButton = this.createStyledButton(
            this.scale.width / 2 + 130,
            this.scale.height - 60,
            '📤 シェア',
            0xE91E63,
            () => this.shareResult()
        );
        this.shareButton.setVisible(false);

        // 結果テキスト
        this.resultText = this.add.text(
            this.scale.width / 2, 130, '',
            {
                fontSize: '56px',
                fontFamily: 'Arial, sans-serif',
                color: '#FF5722',
                stroke: '#ffffff',
                strokeThickness: 6,
                align: 'center'
            }
        ).setOrigin(0.5);
        this.resultText.setVisible(false);
    }

    createSmallButton(x, y, text, color, callback) {
        const button = this.add.text(x, y, text, {
            fontSize: '22px',
            fontFamily: 'Arial, sans-serif',
            color: '#ffffff',
            backgroundColor: `#${color.toString(16)}`,
            padding: { x: 12, y: 8 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        button.on('pointerover', () => button.setScale(1.1));
        button.on('pointerout', () => button.setScale(1));
        button.on('pointerdown', callback);

        return button;
    }

    async shareResult() {
        this.retryButton.setVisible(false);
        this.shareButton.setVisible(false);
        this.resultText.setVisible(false);
        this.titleText.setVisible(false);

        // 装飾を非表示
        this.decorations.forEach(d => d.setVisible(false));

        this.game.renderer.snapshot(async (image) => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = image.width;
                canvas.height = image.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(image, 0, 0);

                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

                try {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]);
                    alert('画像をクリップボードにコピーしました！\n挨拶雑談チャンネルにシェアしよう！ 🎉');
                } catch (clipboardError) {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `fukuwarai_${this.config.character}_${this.score}点.png`;
                    a.click();
                    URL.revokeObjectURL(url);
                    alert('画像をダウンロードしました！\n挨拶雑談チャンネルにシェアしよう！ 🎉');
                }
            } catch (error) {
                console.error('シェアエラー:', error);
                alert('シェアに失敗しました。');
            }

            this.retryButton.setVisible(true);
            this.shareButton.setVisible(true);
            this.resultText.setVisible(true);
            this.titleText.setVisible(true);
            this.decorations.forEach(d => d.setVisible(true));
        });
    }

    toggleGuide() {
        this.isGuideVisible = !this.isGuideVisible;

        if (this.isGuideVisible) {
            this.completeImage.setAlpha(0.5);
            this.showGuideButton.setText('👁 非表示');
            this.showGuideButton.setStyle({ backgroundColor: '#E65100' });
        } else {
            this.completeImage.setAlpha(0);
            this.showGuideButton.setText('👁 見本');
            this.showGuideButton.setStyle({ backgroundColor: '#FF9800' });
        }
    }

    startPreview() {
        this.gameState = 'PREVIEW';
        this.showGuideButton.setVisible(false);
        this.rotationLabel.setVisible(false);
        this.rotationSliderBg.setVisible(false);
        this.rotationSliderHandle.setVisible(false);
        this.judgeButton.setVisible(false);

        // 難易度: hard は見本なしで即プレイ開始
        if (this.difficulty === 'hard') {
            this.instructionText.setText('😈 見本なし！頑張って！');
            this.time.delayedCall(1000, () => {
                this.startPlaying();
            });
            return;
        }

        // easy/normal はプレビュー表示
        this.instructionText.setText('👀 顔をよく覚えてね！');

        this.tweens.add({
            targets: this.faceBase,
            alpha: 1,
            duration: 500,
            ease: 'Power2'
        });

        let countdown = 3;
        const countdownText = this.add.text(
            this.scale.width / 2,
            this.scale.height / 2 - 100,
            countdown.toString(),
            {
                fontSize: '120px',
                fontFamily: 'Arial, sans-serif',
                color: '#FF5722',
                stroke: '#ffffff',
                strokeThickness: 8
            }
        ).setOrigin(0.5).setAlpha(0);

        this.time.addEvent({
            delay: 1000,
            callback: () => {
                countdown--;
                if (countdown > 0) {
                    countdownText.setText(countdown.toString());
                    countdownText.setAlpha(1);
                    this.tweens.add({
                        targets: countdownText,
                        alpha: 0,
                        scale: 1.5,
                        duration: 800,
                        ease: 'Power2'
                    });
                } else {
                    countdownText.destroy();
                    this.startPlaying();
                }
            },
            repeat: 2
        });
    }

    startPlaying() {
        this.gameState = 'PLAYING';
        this.instructionText.setText('🎯 パーツを配置＆回転させよう！');

        // 顔ベースは常にフェードアウト
        this.tweens.add({
            targets: this.faceBase,
            alpha: 0,
            duration: 300,
            ease: 'Power2'
        });

        this.parts.forEach(part => {
            this.tweens.add({
                targets: part,
                scale: 1.1,
                yoyo: true,
                duration: 200,
                ease: 'Bounce'
            });
        });

        this.judgeButton.setVisible(true);
        this.rotationLabel.setVisible(true);
        this.rotationSliderBg.setVisible(true);
        this.rotationSliderHandle.setVisible(true);

        // ★ 難易度別の見本表示
        if (this.difficulty === 'easy') {
            // easy: 常に見本表示
            this.completeImage.setAlpha(0.4);
            this.showGuideButton.setVisible(false);
            this.instructionText.setText('😊 見本を見ながら配置しよう！');
        } else if (this.difficulty === 'normal') {
            // normal: 3秒間見本表示、パーツ操作で消える
            this.completeImage.setAlpha(0.4);
            this.showGuideButton.setVisible(true);
            this.isGuideVisible = true;
            this.showGuideButton.setText('👁 非表示');
            this.showGuideButton.setStyle({ backgroundColor: '#E65100' });

            // 3秒後に自動で消える
            this.guideTimer = this.time.delayedCall(3000, () => {
                if (this.isGuideVisible && this.gameState === 'PLAYING') {
                    this.hideGuideSoft();
                }
            });
        } else {
            // hard: 見本なし
            this.completeImage.setAlpha(0);
            this.showGuideButton.setVisible(false);
        }

        if (this.parts.length > 0) {
            this.selectPart(this.parts[0]);
        }
    }

    /**
     * 見本をソフトに非表示（UIは変更しない）
     */
    hideGuideSoft() {
        this.tweens.add({
            targets: this.completeImage,
            alpha: 0,
            duration: 500,
            ease: 'Power2'
        });
        this.isGuideVisible = false;
        this.showGuideButton.setText('👁 見本');
        this.showGuideButton.setStyle({ backgroundColor: '#FF9800' });
    }

    onJudge() {
        if (this.gameState !== 'PLAYING') return;

        this.gameState = 'JUDGING';
        this.judgeButton.setVisible(false);
        this.showGuideButton.setVisible(false);
        this.rotationLabel.setVisible(false);
        this.rotationSliderBg.setVisible(false);
        this.rotationSliderHandle.setVisible(false);
        this.selectionIndicator.clear();
        this.completeImage.setAlpha(0);
        this.isGuideVisible = false;
        this.instructionText.setText('⏳ 判定中...');

        this.tweens.add({
            targets: this.faceBase,
            alpha: 1,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                this.calculateScore();
                this.showResult();
            }
        });
    }

    calculateScore() {
        let totalDistance = 0;
        let totalRotationError = 0;
        let maxPossibleDistance = 0;

        // 各パーツの評価を保存
        this.partEvaluations = [];

        const faceScale = this.faceBase.scale;
        const faceWidth = this.faceBase.width * faceScale;
        const faceHeight = this.faceBase.height * faceScale;

        this.parts.forEach(part => {
            const correctX = part.getData('correct_x');
            const correctY = part.getData('correct_y');

            const targetX = this.faceBase.x - (faceWidth / 2) + (correctX * faceScale);
            const targetY = this.faceBase.y - (faceHeight / 2) + (correctY * faceScale);

            const distance = Phaser.Math.Distance.Between(part.x, part.y, targetX, targetY);

            let rotationError = Math.abs(part.angle % 360);
            if (rotationError > 180) rotationError = 360 - rotationError;

            // パーツごとの評価
            let partRating;
            const combinedError = distance + rotationError * 0.5;
            if (combinedError < 30) {
                partRating = '🎯 完璧';
            } else if (combinedError < 80) {
                partRating = '⭐ 良い';
            } else if (combinedError < 150) {
                partRating = '👍 惜しい';
            } else {
                partRating = '😅 ズレ';
            }

            this.partEvaluations.push({
                id: part.getData('id'),
                rating: partRating,
                distance: Math.round(distance),
                rotation: Math.round(rotationError)
            });

            totalDistance += distance;
            totalRotationError += rotationError;
            maxPossibleDistance += 300;
        });

        const positionScore = Math.max(0, Math.round((1 - totalDistance / maxPossibleDistance) * 70));
        const maxRotationError = this.parts.length * 180;
        const rotationScore = Math.max(0, Math.round((1 - totalRotationError / maxRotationError) * 30));

        this.score = positionScore + rotationScore;

        // ハイスコア保存
        this.checkHighScore();

        if (this.score >= 90) {
            this.scoreRank = '🎉 完璧！';
        } else if (this.score >= 70) {
            this.scoreRank = '⭐ すごい！';
        } else if (this.score >= 50) {
            this.scoreRank = '👍 おしい！';
        } else {
            this.scoreRank = '😆 面白い顔！';
        }
    }

    /**
     * ハイスコアチェック＆保存
     */
    checkHighScore() {
        const storageKey = `fukuwarai_highscore_${this.config.character}`;
        const currentHighScore = parseInt(localStorage.getItem(storageKey) || '0', 10);

        this.isNewHighScore = false;
        if (this.score > currentHighScore) {
            localStorage.setItem(storageKey, this.score.toString());
            this.isNewHighScore = true;
            this.highScore = this.score;
        } else {
            this.highScore = currentHighScore;
        }
    }

    showResult() {
        this.gameState = 'RESULT';
        this.instructionText.setVisible(false);

        // メイン結果テキスト
        let resultString = `${this.scoreRank}\nスコア: ${this.score}点`;

        // ハイスコア表示
        if (this.isNewHighScore) {
            resultString += '\n🏆 NEW RECORD!';
        } else {
            resultString += `\n🏆 Best: ${this.highScore}点`;
        }

        this.resultText.setText(resultString);
        this.resultText.setVisible(true);

        this.resultText.setScale(0);
        this.tweens.add({
            targets: this.resultText,
            scale: 1,
            duration: 600,
            ease: 'Back.easeOut'
        });

        // パーツごとの評価表示
        this.showPartEvaluations();

        this.retryButton.setVisible(true);
        this.shareButton.setVisible(true);
    }

    /**
     * パーツごとの評価を表示
     */
    showPartEvaluations() {
        // 既存の評価テキストを削除
        if (this.partEvalTexts) {
            this.partEvalTexts.forEach(t => t.destroy());
        }
        this.partEvalTexts = [];

        const partNames = {
            'eye_left': '左目',
            'eye_right': '右目',
            'nose': '鼻',
            'mouth': '口'
        };

        const startY = 220;
        this.partEvaluations.forEach((evalData, index) => {
            const partName = partNames[evalData.id] || evalData.id;
            const text = this.add.text(
                this.scale.width / 2,
                startY + index * 35,
                `${partName}: ${evalData.rating}`,
                {
                    fontSize: '24px',
                    fontFamily: 'Arial, sans-serif',
                    color: '#5D4037',
                    backgroundColor: '#ffffff80',
                    padding: { x: 10, y: 4 }
                }
            ).setOrigin(0.5);

            // フェードインアニメーション
            text.setAlpha(0);
            this.tweens.add({
                targets: text,
                alpha: 1,
                y: text.y - 10,
                duration: 300,
                delay: 200 + index * 100,
                ease: 'Power2'
            });

            this.partEvalTexts.push(text);
        });
    }

    retry() {
        this.gameState = 'PREVIEW';
        this.selectedPart = null;
        this.isGuideVisible = false;

        this.parts.forEach(part => {
            part.x = part.getData('start_x');
            part.y = part.getData('start_y');
            const randomAngle = Phaser.Math.Between(-180, 180);
            part.setAngle(randomAngle);
            part.setData('start_angle', randomAngle);
            part.setData('placed', false);
        });

        this.resultText.setVisible(false);
        this.retryButton.setVisible(false);
        this.shareButton.setVisible(false);
        this.selectionIndicator.clear();
        this.completeImage.setAlpha(0);
        this.instructionText.setVisible(true);

        // パーツ評価テキストを削除
        if (this.partEvalTexts) {
            this.partEvalTexts.forEach(t => t.destroy());
            this.partEvalTexts = [];
        }

        this.faceBase.setAlpha(0);

        this.startPreview();
    }
}

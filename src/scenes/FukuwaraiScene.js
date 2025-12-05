/**
 * FukuwaraiScene - 福笑いミニゲームのメインシーン（独立版）
 * 
 * 機能:
 * - パーツのドラッグ＆ドロップ
 * - パーツの回転（ランダム初期回転 + 回転ボタン）
 * - スコア計算
 * 
 * ゲームフロー:
 * 1. PREVIEW: 顔の輪郭を表示（数秒間）
 * 2. PLAYING: 輪郭が消え、パーツをドラッグで配置・回転
 * 3. JUDGING: 判定ボタン押下で輪郭再表示、スコア計算
 * 4. RESULT: 結果表示、リトライ可能
 */
export default class FukuwaraiScene extends Phaser.Scene {
    constructor() {
        super({ key: 'FukuwaraiScene' });

        // ゲーム状態
        this.gameState = 'LOADING';

        // 設定データ
        this.config = null;

        // ゲームオブジェクト
        this.faceBase = null;
        this.parts = [];
        this.selectedPart = null;  // 選択中のパーツ
        this.judgeButton = null;
        this.retryButton = null;
        this.rotateLeftButton = null;   // 左回転ボタン
        this.rotateRightButton = null;  // 右回転ボタン
        this.resultText = null;
        this.titleText = null;
        this.instructionText = null;
        this.selectionIndicator = null; // 選択表示用

        // スコア
        this.score = 0;
        this.scoreRank = '';
    }

    preload() {
        // ローディング表示
        const loadingText = this.add.text(
            this.scale.width / 2,
            this.scale.height / 2,
            'Loading...',
            { fontSize: '32px', color: '#333333' }
        ).setOrigin(0.5);

        // 設定JSONを読み込み
        this.load.json('fukuwarai_config', 'assets/data/fukuwarai_tartman.json');

        // 福笑い用の画像を直接読み込み
        this.load.image('tartman_face', 'assets/images/IMG_4566.png');
        this.load.image('tartman_eye_right', 'assets/images/無題131_20251204190306.png');
        this.load.image('tartman_eye_left', 'assets/images/無題131_20251204190321.png');
        this.load.image('tartman_nose', 'assets/images/無題131_20251204190337.png');
        this.load.image('tartman_mouth', 'assets/images/無題131_20251204190400.png');
        this.load.image('tartman_complete', 'assets/images/無題131_20251204190653.png');

        this.load.on('complete', () => {
            loadingText.destroy();
        });
    }

    create() {
        this.config = this.cache.json.get('fukuwarai_config');

        this.cameras.main.setBackgroundColor('#f5f5dc');

        // タイトル
        this.titleText = this.add.text(
            this.scale.width / 2,
            50,
            `${this.config.character}の福笑い`,
            {
                fontSize: '48px',
                fontFamily: 'Arial, sans-serif',
                color: '#333333'
            }
        ).setOrigin(0.5);

        // 選択インジケーター（パーツの周りに表示する枠）
        this.selectionIndicator = this.add.graphics();

        // 顔ベースを作成
        this.createFaceBase();

        // パーツを作成
        this.createParts();

        // UIを作成
        this.createUI();

        // プレビュー開始
        this.startPreview();
    }

    /**
     * 顔のベース（輪郭）を作成
     */
    createFaceBase() {
        this.faceBase = this.add.image(
            this.scale.width / 2,
            this.scale.height / 2 - 150,
            this.config.face_base
        );
        const maxWidth = 400;
        const scale = maxWidth / this.faceBase.width;
        this.faceBase.setScale(scale);
        this.faceBase.setAlpha(0);
    }

    /**
     * ドラッグ可能なパーツを作成
     */
    createParts() {
        this.config.parts.forEach((partConfig, index) => {
            const part = this.add.image(
                partConfig.start_x,
                partConfig.start_y,
                partConfig.texture
            );

            // パーツにデータを保持
            part.setData('id', partConfig.id);
            part.setData('correct_x', partConfig.correct_x);
            part.setData('correct_y', partConfig.correct_y);
            part.setData('start_x', partConfig.start_x);
            part.setData('start_y', partConfig.start_y);
            part.setData('placed', false);

            // ★ ランダム回転を設定（-180° 〜 +180°）
            const randomAngle = Phaser.Math.Between(-180, 180);
            part.setAngle(randomAngle);
            part.setData('start_angle', randomAngle);

            // ドラッグ可能にする
            part.setInteractive({ draggable: true });

            const partScale = 1.0;
            part.setScale(partScale);

            // クリックで選択
            part.on('pointerdown', () => {
                if (this.gameState !== 'PLAYING') return;
                this.selectPart(part);
            });

            // ドラッグイベント
            part.on('dragstart', () => {
                if (this.gameState !== 'PLAYING') return;
                this.selectPart(part);
                part.setScale(partScale * 1.1);
                this.children.bringToTop(part);
            });

            part.on('drag', (pointer, dragX, dragY) => {
                if (this.gameState !== 'PLAYING') return;
                part.x = dragX;
                part.y = dragY;
                this.updateSelectionIndicator();
            });

            part.on('dragend', () => {
                if (this.gameState !== 'PLAYING') return;
                part.setScale(partScale);
                part.setData('placed', true);
            });

            this.parts.push(part);
        });
    }

    /**
     * パーツを選択
     */
    selectPart(part) {
        this.selectedPart = part;
        this.updateSelectionIndicator();
        this.children.bringToTop(part);
        this.children.bringToTop(this.selectionIndicator);
    }

    /**
     * 選択インジケーターを更新
     */
    updateSelectionIndicator() {
        this.selectionIndicator.clear();

        if (this.selectedPart && this.gameState === 'PLAYING') {
            const part = this.selectedPart;
            const bounds = part.getBounds();

            this.selectionIndicator.lineStyle(3, 0x4CAF50, 1);
            this.selectionIndicator.strokeRect(
                bounds.x - 5,
                bounds.y - 5,
                bounds.width + 10,
                bounds.height + 10
            );
        }
    }

    /**
     * UIボタンを作成
     */
    createUI() {
        // 説明テキスト
        this.instructionText = this.add.text(
            this.scale.width / 2,
            this.scale.height - 50,
            '顔をよく覚えてね！',
            {
                fontSize: '28px',
                fontFamily: 'Arial, sans-serif',
                color: '#666666'
            }
        ).setOrigin(0.5);

        // ★ 回転ボタン（左回転）
        this.rotateLeftButton = this.add.text(
            this.scale.width / 2 - 100,
            this.scale.height - 200,
            '↺ 左',
            {
                fontSize: '32px',
                fontFamily: 'Arial, sans-serif',
                color: '#ffffff',
                backgroundColor: '#9C27B0',
                padding: { x: 20, y: 10 }
            }
        ).setOrigin(0.5).setInteractive();

        this.rotateLeftButton.on('pointerdown', () => this.rotatePart(-45));
        this.rotateLeftButton.on('pointerover', () => this.rotateLeftButton.setStyle({ backgroundColor: '#7B1FA2' }));
        this.rotateLeftButton.on('pointerout', () => this.rotateLeftButton.setStyle({ backgroundColor: '#9C27B0' }));
        this.rotateLeftButton.setVisible(false);

        // ★ 回転ボタン（右回転）
        this.rotateRightButton = this.add.text(
            this.scale.width / 2 + 100,
            this.scale.height - 200,
            '右 ↻',
            {
                fontSize: '32px',
                fontFamily: 'Arial, sans-serif',
                color: '#ffffff',
                backgroundColor: '#9C27B0',
                padding: { x: 20, y: 10 }
            }
        ).setOrigin(0.5).setInteractive();

        this.rotateRightButton.on('pointerdown', () => this.rotatePart(45));
        this.rotateRightButton.on('pointerover', () => this.rotateRightButton.setStyle({ backgroundColor: '#7B1FA2' }));
        this.rotateRightButton.on('pointerout', () => this.rotateRightButton.setStyle({ backgroundColor: '#9C27B0' }));
        this.rotateRightButton.setVisible(false);

        // 判定ボタン
        this.judgeButton = this.add.text(
            this.scale.width / 2,
            this.scale.height - 120,
            '🎯 判定！',
            {
                fontSize: '36px',
                fontFamily: 'Arial, sans-serif',
                color: '#ffffff',
                backgroundColor: '#4CAF50',
                padding: { x: 30, y: 15 }
            }
        ).setOrigin(0.5).setInteractive();

        this.judgeButton.on('pointerdown', () => this.onJudge());
        this.judgeButton.on('pointerover', () => this.judgeButton.setStyle({ backgroundColor: '#45a049' }));
        this.judgeButton.on('pointerout', () => this.judgeButton.setStyle({ backgroundColor: '#4CAF50' }));
        this.judgeButton.setVisible(false);

        // リトライボタン
        this.retryButton = this.add.text(
            this.scale.width / 2,
            this.scale.height - 50,
            '🔄 もう一度',
            {
                fontSize: '32px',
                fontFamily: 'Arial, sans-serif',
                color: '#ffffff',
                backgroundColor: '#2196F3',
                padding: { x: 25, y: 12 }
            }
        ).setOrigin(0.5).setInteractive();

        this.retryButton.on('pointerdown', () => this.retry());
        this.retryButton.on('pointerover', () => this.retryButton.setStyle({ backgroundColor: '#1976D2' }));
        this.retryButton.on('pointerout', () => this.retryButton.setStyle({ backgroundColor: '#2196F3' }));
        this.retryButton.setVisible(false);

        // 結果テキスト
        this.resultText = this.add.text(
            this.scale.width / 2,
            150,
            '',
            {
                fontSize: '48px',
                fontFamily: 'Arial, sans-serif',
                color: '#FF5722',
                stroke: '#ffffff',
                strokeThickness: 4
            }
        ).setOrigin(0.5);
        this.resultText.setVisible(false);
    }

    /**
     * ★ パーツを回転
     */
    rotatePart(angle) {
        if (this.selectedPart && this.gameState === 'PLAYING') {
            // 回転アニメーション
            this.tweens.add({
                targets: this.selectedPart,
                angle: this.selectedPart.angle + angle,
                duration: 150,
                ease: 'Power2',
                onUpdate: () => this.updateSelectionIndicator(),
                onComplete: () => this.updateSelectionIndicator()
            });
        }
    }

    /**
     * プレビューフェーズ開始
     */
    startPreview() {
        this.gameState = 'PREVIEW';
        this.instructionText.setText('顔をよく覚えてね！');
        this.rotateLeftButton.setVisible(false);
        this.rotateRightButton.setVisible(false);

        // 顔をフェードイン
        this.tweens.add({
            targets: this.faceBase,
            alpha: 1,
            duration: 500,
            ease: 'Power2'
        });

        // カウントダウン表示
        let countdown = 3;
        const countdownText = this.add.text(
            this.scale.width / 2,
            this.scale.height / 2 - 150,
            countdown.toString(),
            {
                fontSize: '100px',
                fontFamily: 'Arial, sans-serif',
                color: '#FF5722'
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

    /**
     * プレイフェーズ開始
     */
    startPlaying() {
        this.gameState = 'PLAYING';
        this.instructionText.setText('パーツを配置して回転させよう！');

        // 顔をフェードアウト
        this.tweens.add({
            targets: this.faceBase,
            alpha: 0,
            duration: 300,
            ease: 'Power2'
        });

        // パーツをアクティブ化
        this.parts.forEach(part => {
            this.tweens.add({
                targets: part,
                scale: part.scale * 1.05,
                yoyo: true,
                duration: 200,
                ease: 'Bounce'
            });
        });

        // ボタン表示
        this.judgeButton.setVisible(true);
        this.rotateLeftButton.setVisible(true);
        this.rotateRightButton.setVisible(true);

        // 最初のパーツを選択
        if (this.parts.length > 0) {
            this.selectPart(this.parts[0]);
        }
    }

    /**
     * 判定フェーズ
     */
    onJudge() {
        if (this.gameState !== 'PLAYING') return;

        this.gameState = 'JUDGING';
        this.judgeButton.setVisible(false);
        this.rotateLeftButton.setVisible(false);
        this.rotateRightButton.setVisible(false);
        this.selectionIndicator.clear();
        this.instructionText.setText('判定中...');

        // 顔を再表示
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

    /**
     * スコア計算（位置 + 回転）
     */
    calculateScore() {
        let totalDistance = 0;
        let totalRotationError = 0;
        let maxPossibleDistance = 0;

        const faceScale = this.faceBase.scale;
        const faceWidth = this.faceBase.width * faceScale;
        const faceHeight = this.faceBase.height * faceScale;

        this.parts.forEach(part => {
            const correctX = part.getData('correct_x');
            const correctY = part.getData('correct_y');

            const targetX = this.faceBase.x - (faceWidth / 2) + (correctX * faceScale);
            const targetY = this.faceBase.y - (faceHeight / 2) + (correctY * faceScale);

            const distance = Phaser.Math.Distance.Between(
                part.x, part.y,
                targetX, targetY
            );

            // 回転の誤差（正解は0度）
            let rotationError = Math.abs(part.angle % 360);
            if (rotationError > 180) rotationError = 360 - rotationError;

            totalDistance += distance;
            totalRotationError += rotationError;
            maxPossibleDistance += 300;
        });

        // 位置スコア（0-70点）
        const positionScore = Math.max(0, Math.round((1 - totalDistance / maxPossibleDistance) * 70));

        // 回転スコア（0-30点）：回転誤差が小さいほど高得点
        const maxRotationError = this.parts.length * 180;
        const rotationScore = Math.max(0, Math.round((1 - totalRotationError / maxRotationError) * 30));

        this.score = positionScore + rotationScore;

        // ランク判定
        if (this.score >= 90) {
            this.scoreRank = '完璧！ 🎉';
        } else if (this.score >= 70) {
            this.scoreRank = 'すごい！ ⭐';
        } else if (this.score >= 50) {
            this.scoreRank = 'おしい！ 👍';
        } else {
            this.scoreRank = '面白い顔！ 😆';
        }
    }

    /**
     * 結果表示
     */
    showResult() {
        this.gameState = 'RESULT';
        this.instructionText.setVisible(false);

        this.resultText.setText(`${this.scoreRank}\nスコア: ${this.score}点`);
        this.resultText.setVisible(true);

        this.resultText.setScale(0);
        this.tweens.add({
            targets: this.resultText,
            scale: 1,
            duration: 500,
            ease: 'Back.easeOut'
        });

        this.retryButton.setVisible(true);
    }

    /**
     * リトライ
     */
    retry() {
        this.gameState = 'PREVIEW';
        this.selectedPart = null;

        // パーツを初期位置・回転に戻す
        this.parts.forEach(part => {
            part.x = part.getData('start_x');
            part.y = part.getData('start_y');

            // ★ 新しいランダム回転を設定
            const randomAngle = Phaser.Math.Between(-180, 180);
            part.setAngle(randomAngle);
            part.setData('start_angle', randomAngle);
            part.setData('placed', false);
        });

        // UIリセット
        this.resultText.setVisible(false);
        this.retryButton.setVisible(false);
        this.judgeButton.setVisible(false);
        this.rotateLeftButton.setVisible(false);
        this.rotateRightButton.setVisible(false);
        this.selectionIndicator.clear();
        this.instructionText.setVisible(true);

        // 顔を隠す
        this.faceBase.setAlpha(0);

        // プレビュー開始
        this.startPreview();
    }
}

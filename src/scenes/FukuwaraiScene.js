/**
 * FukuwaraiScene - 福笑いミニゲームのメインシーン
 * 
 * ゲームフロー:
 * 1. PREVIEW: 顔の輪郭を表示（数秒間）
 * 2. PLAYING: 輪郭が消え、パーツをドラッグで配置
 * 3. JUDGING: 判定ボタン押下で輪郭再表示、スコア計算
 * 4. RESULT: 結果表示、リトライ可能
 */
export default class FukuwaraiScene extends Phaser.Scene {
    constructor() {
        super({ key: 'FukuwaraiScene' });
        
        // ゲーム状態
        this.gameState = 'PREVIEW'; // PREVIEW | PLAYING | JUDGING | RESULT
        
        // 設定データ
        this.config = null;
        
        // ゲームオブジェクト
        this.faceBase = null;
        this.parts = [];
        this.judgeButton = null;
        this.retryButton = null;
        this.resultText = null;
        this.titleText = null;
        this.instructionText = null;
        
        // スコア
        this.score = 0;
        this.scoreRank = '';
    }

    preload() {
        // 設定JSONを読み込み
        this.load.json('fukuwarai_config', 'assets/data/fukuwarai_tartman.json');
        
        // プレースホルダー画像を生成（実際の画像がない場合のフォールバック）
        this.createPlaceholderTextures();
    }

    /**
     * プレースホルダーテクスチャを生成
     * 実際の画像がない場合に使用
     */
    createPlaceholderTextures() {
        const graphics = this.make.graphics({ x: 0, y: 0, add: false });
        
        // 顔ベース（円形の輪郭）
        graphics.clear();
        graphics.lineStyle(4, 0x333333);
        graphics.strokeCircle(150, 150, 140);
        graphics.generateTexture('tartman_face', 300, 300);
        
        // 左目
        graphics.clear();
        graphics.fillStyle(0x000000);
        graphics.fillEllipse(30, 20, 50, 30);
        graphics.generateTexture('tartman_eye_left', 60, 40);
        
        // 右目
        graphics.clear();
        graphics.fillStyle(0x000000);
        graphics.fillEllipse(30, 20, 50, 30);
        graphics.generateTexture('tartman_eye_right', 60, 40);
        
        // 鼻
        graphics.clear();
        graphics.fillStyle(0x8B4513);
        graphics.fillTriangle(25, 0, 0, 50, 50, 50);
        graphics.generateTexture('tartman_nose', 50, 50);
        
        // 口
        graphics.clear();
        graphics.lineStyle(4, 0xFF0000);
        graphics.beginPath();
        graphics.arc(40, 10, 35, 0.2, Math.PI - 0.2, false);
        graphics.strokePath();
        graphics.generateTexture('tartman_mouth', 80, 50);
        
        graphics.destroy();
    }

    create() {
        // 設定データを取得
        this.config = this.cache.json.get('fukuwarai_config');
        
        // 背景色
        this.cameras.main.setBackgroundColor('#f5f5dc');
        
        // タイトル
        this.titleText = this.add.text(
            this.scale.width / 2, 
            50, 
            `${this.config.character}の福笑い`, 
            {
                fontSize: '48px',
                fontFamily: 'DotGothic16, sans-serif',
                color: '#333333'
            }
        ).setOrigin(0.5);
        
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
            this.scale.height / 2 - 100,
            this.config.face_base
        );
        this.faceBase.setScale(1.5);
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
            
            // ドラッグ可能にする
            part.setInteractive({ draggable: true });
            part.setScale(1.5);
            
            // ドラッグイベント
            part.on('dragstart', () => {
                if (this.gameState !== 'PLAYING') return;
                part.setScale(1.7);
                this.children.bringToTop(part);
            });
            
            part.on('drag', (pointer, dragX, dragY) => {
                if (this.gameState !== 'PLAYING') return;
                part.x = dragX;
                part.y = dragY;
            });
            
            part.on('dragend', () => {
                if (this.gameState !== 'PLAYING') return;
                part.setScale(1.5);
                part.setData('placed', true);
                this.checkAllPlaced();
            });
            
            this.parts.push(part);
        });
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
                fontSize: '32px',
                fontFamily: 'DotGothic16, sans-serif',
                color: '#666666'
            }
        ).setOrigin(0.5);
        
        // 判定ボタン
        this.judgeButton = this.add.text(
            this.scale.width / 2,
            this.scale.height - 120,
            '🎯 判定！',
            {
                fontSize: '40px',
                fontFamily: 'DotGothic16, sans-serif',
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
                fontSize: '36px',
                fontFamily: 'DotGothic16, sans-serif',
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
            200,
            '',
            {
                fontSize: '56px',
                fontFamily: 'DotGothic16, sans-serif',
                color: '#FF5722',
                stroke: '#ffffff',
                strokeThickness: 4
            }
        ).setOrigin(0.5);
        this.resultText.setVisible(false);
    }

    /**
     * プレビューフェーズ開始
     * 顔の輪郭を表示して覚えてもらう
     */
    startPreview() {
        this.gameState = 'PREVIEW';
        this.instructionText.setText('顔をよく覚えてね！');
        
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
            this.scale.height / 2 - 100,
            countdown.toString(),
            {
                fontSize: '120px',
                fontFamily: 'DotGothic16, sans-serif',
                color: '#FF5722'
            }
        ).setOrigin(0.5).setAlpha(0);
        
        // 3秒後にゲーム開始
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
     * 輪郭を消してパーツ配置を開始
     */
    startPlaying() {
        this.gameState = 'PLAYING';
        this.instructionText.setText('パーツを正しい位置に置こう！');
        
        // 顔をフェードアウト
        this.tweens.add({
            targets: this.faceBase,
            alpha: 0,
            duration: 300,
            ease: 'Power2'
        });
        
        // パーツをアクティブ化（視覚的フィードバック）
        this.parts.forEach(part => {
            this.tweens.add({
                targets: part,
                scale: 1.6,
                yoyo: true,
                duration: 200,
                ease: 'Bounce'
            });
        });
    }

    /**
     * 全パーツが配置されたかチェック
     */
    checkAllPlaced() {
        const allPlaced = this.parts.every(part => part.getData('placed'));
        if (allPlaced) {
            this.judgeButton.setVisible(true);
        }
    }

    /**
     * 判定フェーズ
     */
    onJudge() {
        if (this.gameState !== 'PLAYING') return;
        
        this.gameState = 'JUDGING';
        this.judgeButton.setVisible(false);
        this.instructionText.setText('判定中...');
        
        // 顔を再表示
        this.tweens.add({
            targets: this.faceBase,
            alpha: 1,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                // スコア計算
                this.calculateScore();
                this.showResult();
            }
        });
    }

    /**
     * スコア計算
     * 各パーツと正解位置の距離を計算
     */
    calculateScore() {
        let totalDistance = 0;
        let maxPossibleDistance = 0;
        
        this.parts.forEach(part => {
            const correctX = part.getData('correct_x');
            const correctY = part.getData('correct_y');
            
            // 顔ベースの位置を考慮した正解位置
            const targetX = this.faceBase.x - 150 + correctX;
            const targetY = this.faceBase.y - 150 + correctY;
            
            const distance = Phaser.Math.Distance.Between(
                part.x, part.y,
                targetX, targetY
            );
            
            totalDistance += distance;
            maxPossibleDistance += 300; // 最大誤差の想定値
        });
        
        // スコアを0-100に正規化
        this.score = Math.max(0, Math.round((1 - totalDistance / maxPossibleDistance) * 100));
        
        // ランク判定
        const avgDistance = totalDistance / this.parts.length;
        const thresholds = this.config.score_thresholds;
        
        if (avgDistance <= thresholds.perfect) {
            this.scoreRank = '完璧！ 🎉';
        } else if (avgDistance <= thresholds.great) {
            this.scoreRank = 'すごい！ ⭐';
        } else if (avgDistance <= thresholds.good) {
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
        
        // 結果テキスト表示
        this.resultText.setText(`${this.scoreRank}\nスコア: ${this.score}点`);
        this.resultText.setVisible(true);
        
        // アニメーション
        this.resultText.setScale(0);
        this.tweens.add({
            targets: this.resultText,
            scale: 1,
            duration: 500,
            ease: 'Back.easeOut'
        });
        
        // リトライボタン表示
        this.retryButton.setVisible(true);
    }

    /**
     * リトライ
     */
    retry() {
        this.gameState = 'PREVIEW';
        
        // パーツを初期位置に戻す
        this.parts.forEach(part => {
            part.x = part.getData('start_x');
            part.y = part.getData('start_y');
            part.setData('placed', false);
        });
        
        // UIリセット
        this.resultText.setVisible(false);
        this.retryButton.setVisible(false);
        this.judgeButton.setVisible(false);
        this.instructionText.setVisible(true);
        
        // 顔を隠す
        this.faceBase.setAlpha(0);
        
        // プレビュー開始
        this.startPreview();
    }
}

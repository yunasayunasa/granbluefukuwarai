/**
 * FukuwaraiScene - 福笑いミニゲームのメインシーン（独立版）
 * 
 * 機能:
 * - パーツのドラッグ＆ドロップ
 * - パーツの回転（ランダム初期回転 + 回転ボタン）
 * - 見本表示機能
 * - シェア機能
 * - スコア計算
 */
export default class FukuwaraiScene extends Phaser.Scene {
    constructor() {
        super({ key: 'FukuwaraiScene' });

        this.gameState = 'LOADING';
        this.config = null;

        // ゲームオブジェクト
        this.faceBase = null;
        this.completeImage = null;
        this.parts = [];
        this.selectedPart = null;
        this.judgeButton = null;
        this.retryButton = null;
        this.shareButton = null;  // シェアボタン
        this.rotateLeftButton = null;
        this.rotateRightButton = null;
        this.showGuideButton = null;
        this.resultText = null;
        this.titleText = null;
        this.instructionText = null;
        this.selectionIndicator = null;

        this.score = 0;
        this.scoreRank = '';
        this.isGuideVisible = false;
    }

    preload() {
        const loadingText = this.add.text(
            this.scale.width / 2,
            this.scale.height / 2,
            'Loading...',
            { fontSize: '32px', color: '#333333' }
        ).setOrigin(0.5);

        this.load.json('fukuwarai_config', 'assets/data/fukuwarai_tartman.json');

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

        this.selectionIndicator = this.add.graphics();

        // 顔ベースを作成
        this.createFaceBase();

        // 見本画像を作成
        this.createCompleteImage();

        // パーツを作成
        this.createParts();

        // UIを作成
        this.createUI();

        // プレビュー開始
        this.startPreview();
    }

    createFaceBase() {
        this.faceBase = this.add.image(
            this.scale.width / 2,
            this.scale.height / 2 - 100,
            this.config.face_base
        );
        // 画面幅に合わせてスケール調整
        const maxWidth = 500;
        const scale = Math.min(maxWidth / this.faceBase.width, 1);
        this.faceBase.setScale(scale);
        this.faceBase.setAlpha(0);

        console.log(`[FukuwaraiScene] Face base size: ${this.faceBase.width}x${this.faceBase.height}, scale: ${scale}`);
    }

    createCompleteImage() {
        this.completeImage = this.add.image(
            this.scale.width / 2,
            this.scale.height / 2 - 100,
            'tartman_complete'
        );

        // ★ 輪郭と同じサイズになるように調整
        // 輪郭画像と見本画像のサイズ比を計算してスケールを合わせる
        const targetWidth = this.faceBase.width * this.faceBase.scale;
        const completeScale = targetWidth / this.completeImage.width;
        this.completeImage.setScale(completeScale);
        this.completeImage.setAlpha(0);
        this.completeImage.setDepth(100);

        console.log(`[FukuwaraiScene] Complete image size: ${this.completeImage.width}x${this.completeImage.height}, scale: ${completeScale}`);
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

            // ランダム回転
            const randomAngle = Phaser.Math.Between(-180, 180);
            part.setAngle(randomAngle);
            part.setData('start_angle', randomAngle);

            part.setInteractive({ draggable: true });

            const partScale = 1.0;
            part.setScale(partScale);

            part.on('pointerdown', () => {
                if (this.gameState !== 'PLAYING') return;
                this.selectPart(part);
            });

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

    selectPart(part) {
        this.selectedPart = part;
        this.updateSelectionIndicator();
        this.children.bringToTop(part);
        this.children.bringToTop(this.selectionIndicator);
    }

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

        // 回転ボタン（左）
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

        // 回転ボタン（右）
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

        // 見本表示ボタン
        this.showGuideButton = this.add.text(
            this.scale.width - 80,
            100,
            '👁 見本',
            {
                fontSize: '24px',
                fontFamily: 'Arial, sans-serif',
                color: '#ffffff',
                backgroundColor: '#FF9800',
                padding: { x: 15, y: 8 }
            }
        ).setOrigin(0.5).setInteractive();

        this.showGuideButton.on('pointerdown', () => this.toggleGuide());
        this.showGuideButton.on('pointerover', () => this.showGuideButton.setStyle({ backgroundColor: '#F57C00' }));
        this.showGuideButton.on('pointerout', () => {
            if (!this.isGuideVisible) {
                this.showGuideButton.setStyle({ backgroundColor: '#FF9800' });
            }
        });
        this.showGuideButton.setVisible(false);

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
            this.scale.width / 2 - 100,
            this.scale.height - 50,
            '🔄 もう一度',
            {
                fontSize: '28px',
                fontFamily: 'Arial, sans-serif',
                color: '#ffffff',
                backgroundColor: '#2196F3',
                padding: { x: 20, y: 10 }
            }
        ).setOrigin(0.5).setInteractive();

        this.retryButton.on('pointerdown', () => this.retry());
        this.retryButton.on('pointerover', () => this.retryButton.setStyle({ backgroundColor: '#1976D2' }));
        this.retryButton.on('pointerout', () => this.retryButton.setStyle({ backgroundColor: '#2196F3' }));
        this.retryButton.setVisible(false);

        // ★ シェアボタン
        this.shareButton = this.add.text(
            this.scale.width / 2 + 100,
            this.scale.height - 50,
            '📤 シェア',
            {
                fontSize: '28px',
                fontFamily: 'Arial, sans-serif',
                color: '#ffffff',
                backgroundColor: '#E91E63',
                padding: { x: 20, y: 10 }
            }
        ).setOrigin(0.5).setInteractive();

        this.shareButton.on('pointerdown', () => this.shareResult());
        this.shareButton.on('pointerover', () => this.shareButton.setStyle({ backgroundColor: '#C2185B' }));
        this.shareButton.on('pointerout', () => this.shareButton.setStyle({ backgroundColor: '#E91E63' }));
        this.shareButton.setVisible(false);

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
     * ★ 結果をシェア
     */
    shareResult() {
        const shareText = `【${this.config.character}の福笑い】\n${this.scoreRank}\nスコア: ${this.score}点\n\n#福笑い #タルトマン`;

        // クリップボードにコピー
        navigator.clipboard.writeText(shareText).then(() => {
            alert('クリップボードにコピーしました！\n挨拶雑談チャンネルにシェアしよう！ 🎉');
        }).catch(err => {
            // クリップボードAPIが使えない場合
            prompt('以下のテキストをコピーして、挨拶雑談チャンネルにシェアしよう！', shareText);
        });
    }

    toggleGuide() {
        this.isGuideVisible = !this.isGuideVisible;

        if (this.isGuideVisible) {
            this.completeImage.setAlpha(0.5);
            this.showGuideButton.setStyle({ backgroundColor: '#E65100' });
            this.showGuideButton.setText('👁 非表示');
        } else {
            this.completeImage.setAlpha(0);
            this.showGuideButton.setStyle({ backgroundColor: '#FF9800' });
            this.showGuideButton.setText('👁 見本');
        }
    }

    rotatePart(angle) {
        if (this.selectedPart && this.gameState === 'PLAYING') {
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

    startPreview() {
        this.gameState = 'PREVIEW';
        this.instructionText.setText('顔をよく覚えてね！');
        this.rotateLeftButton.setVisible(false);
        this.rotateRightButton.setVisible(false);
        this.showGuideButton.setVisible(false);

        // 顔をフェードイン
        this.tweens.add({
            targets: this.faceBase,
            alpha: 1,
            duration: 500,
            ease: 'Power2'
        });

        // カウントダウン
        let countdown = 3;
        const countdownText = this.add.text(
            this.scale.width / 2,
            this.scale.height / 2 - 100,
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
        this.showGuideButton.setVisible(true);

        // 最初のパーツを選択
        if (this.parts.length > 0) {
            this.selectPart(this.parts[0]);
        }
    }

    onJudge() {
        if (this.gameState !== 'PLAYING') return;

        this.gameState = 'JUDGING';
        this.judgeButton.setVisible(false);
        this.rotateLeftButton.setVisible(false);
        this.rotateRightButton.setVisible(false);
        this.showGuideButton.setVisible(false);
        this.selectionIndicator.clear();
        this.completeImage.setAlpha(0);
        this.isGuideVisible = false;
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

            // 回転誤差
            let rotationError = Math.abs(part.angle % 360);
            if (rotationError > 180) rotationError = 360 - rotationError;

            totalDistance += distance;
            totalRotationError += rotationError;
            maxPossibleDistance += 300;
        });

        // 位置スコア（70点）+ 回転スコア（30点）
        const positionScore = Math.max(0, Math.round((1 - totalDistance / maxPossibleDistance) * 70));
        const maxRotationError = this.parts.length * 180;
        const rotationScore = Math.max(0, Math.round((1 - totalRotationError / maxRotationError) * 30));

        this.score = positionScore + rotationScore;

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
        this.shareButton.setVisible(true);  // ★ シェアボタン表示
    }

    retry() {
        this.gameState = 'PREVIEW';
        this.selectedPart = null;
        this.isGuideVisible = false;

        // パーツをリセット
        this.parts.forEach(part => {
            part.x = part.getData('start_x');
            part.y = part.getData('start_y');
            const randomAngle = Phaser.Math.Between(-180, 180);
            part.setAngle(randomAngle);
            part.setData('start_angle', randomAngle);
            part.setData('placed', false);
        });

        // UIリセット
        this.resultText.setVisible(false);
        this.retryButton.setVisible(false);
        this.shareButton.setVisible(false);
        this.judgeButton.setVisible(false);
        this.rotateLeftButton.setVisible(false);
        this.rotateRightButton.setVisible(false);
        this.showGuideButton.setVisible(false);
        this.selectionIndicator.clear();
        this.completeImage.setAlpha(0);
        this.instructionText.setVisible(true);

        this.faceBase.setAlpha(0);

        this.startPreview();
    }
}

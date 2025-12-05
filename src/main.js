// src/main.js - 福笑いゲーム専用（シンプル版）

import FukuwaraiScene from './scenes/FukuwaraiScene.js';

const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.FIT,
        parent: 'game-container',
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 720,
        height: 1280
    },
    scene: [FukuwaraiScene],  // 福笑いシーンのみ
    input: {
        activePointers: 3
    }
};

window.onload = () => {
    new Phaser.Game(config);
};
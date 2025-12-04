// src/main.js - 福笑いゲーム用

import PreloadScene from './scenes/PreloadScene.js';
import SystemScene from './scenes/SystemScene.js';
import UIScene from './scenes/UIScene.js';
import GameScene from './scenes/GameScene.js';
import { uiRegistry as rawUiRegistry, sceneUiVisibility } from './ui/index.js';
import { eventTagHandlers } from './handlers/events/index.js';
import SaveLoadScene from './scenes/SaveLoadScene.js';
import ConfigScene from './scenes/ConfigScene.js';
import BacklogScene from './scenes/BacklogScene.js';
import ActionScene from './scenes/ActionScene.js';
import BattleScene from './scenes/BattleScene.js';
import OverlayScene from './scenes/OverlayScene.js';
import NovelOverlayScene from './scenes/NovelOverlayScene.js';
import EditorPlugin from './plugins/EditorPlugin.js';
import TitleScene from './scenes/TitleScene.js';
import GameOverScene from './scenes/GameOverScene.js';
import FukuwaraiScene from './scenes/FukuwaraiScene.js';

// uiRegistryを自動処理する非同期関数
async function processUiRegistry(registry) {
    const processed = JSON.parse(JSON.stringify(registry));

    for (const key in processed) {
        const definition = processed[key];

        if (definition.path) {
            try {
                const module = await import(definition.path);
                const UiClass = module.default;
                definition.component = UiClass;
                if (UiClass && UiClass.dependencies) {
                    definition.watch = UiClass.dependencies;
                }
            } catch (e) {
                console.error(`Failed to process UI definition for '${key}'`, e);
            }
        }
    }
    return processed;
}

const config = {
    type: Phaser.AUTO,
    input: {
        topOnly: false,
        activePointers: 3
    },
    scale: {
        mode: Phaser.Scale.FIT,
        parent: 'game-container',
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 720,
        height: 1280
    },
    // ★★★ シーン設定：PreloadScene が最初に起動（active: true） ★★★
    scene: [
        PreloadScene,    // ← 最初に起動（ローディング）
        SystemScene,     // ← ゲームフロー管理
        FukuwaraiScene,  // ★ 福笑いシーン
        TitleScene,
        GameOverScene,
        SaveLoadScene,
        ConfigScene,
        BacklogScene,
        ActionScene,
        BattleScene,
        OverlayScene,
        NovelOverlayScene
    ],
    plugins: {
        global: [
            { key: 'EditorPlugin', plugin: EditorPlugin, start: true }
        ]
    },
    physics: {
        default: 'matter',
        matter: {
            gravity: { y: 1 },
            debug: {
                showBody: true,
                showStaticBody: true,
                showVelocity: true,
                bodyColor: 0xff00ff,
                staticBodyColor: 0x0000ff,
                velocityColor: 0x00ff00,
            }
        }
    }
};

window.onload = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('debug')) {
        document.body.classList.add('debug-mode');
    }

    const processedUiRegistry = await processUiRegistry(rawUiRegistry);
    const game = new Phaser.Game(config);

    game.registry.set('uiRegistry', processedUiRegistry);
    game.registry.set('sceneUiVisibility', sceneUiVisibility);
    game.registry.set('eventTagHandlers', eventTagHandlers);
};
// src/ui/index.js (福笑いゲーム用に整理)

/**
 * uiRegistry
 * 
 * ゲーム内で使用される全ての「カスタムUIコンポーネント」の設計図を定義します。
 */
export const uiRegistry = {
    'coin_hud': {
        path: './ui/CoinHud.js',
        groups: ['hud', 'battle'],
        watch: ['coin']
    },
    'player_hp_bar': {
        path: './ui/HpBar.js',
        groups: ['hud', 'battle'],
        watch: ['player_hp', 'player_max_hp']
    },
    'enemy_hp_bar': {
        path: './ui/HpBar.js',
        groups: ['hud', 'battle'],
        watch: ['enemy_hp', 'enemy_max_hp']
    },

    'menu_button': {
        path: './ui/MenuButton.js',
        groups: ['menu', 'game'],
        params: { label: 'MENU' }
    },

    'panel': {
        path: './ui/Panel.js',
        groups: ['ui_element', 'action'],
    },

    'generic_button': {
        path: './ui/Button.js',
        groups: ['ui_element', 'action'],
        params: { label: 'Button' }
    },
    'interact_button': {
        path: './ui/InteractButton.js',
        groups: ['controls', 'action'],
        params: {
            label: '調べる',
            shape: 'circle'
        }
    },

    'jump_button': {
        path: './ui/JumpButton.js',
        groups: []
    },

    'message_window': {
        path: './ui/MessageWindow.js',
        groups: ['game']
    },

    'bottom_panel': {
        path: './ui/BottomPanel.js',
        groups: ['menu', 'game']
    },

    'Text': {
        component: Phaser.GameObjects.Text,
        groups: ['game', 'ui_element', 'text_ui']
    }
};


/**
 * sceneUiVisibility
 * 
 * 各シーンで、どのUI「グループ」を表示するかを定義します。
 */
export const sceneUiVisibility = {
    'GameScene': ['hud', 'menu', 'game'],
    'FukuwaraiScene': [],  // ★ 福笑いシーン - UIは非表示
    'BattleScene': ['hud', 'battle'],
    'ActionScene': ['menu', 'game'],
    'TitleScene': [],
    'NovelOverlayScene': ['game'],
    'OverlayScene': ['ui_element', 'action']
};
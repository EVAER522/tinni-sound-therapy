# Tinni App — 耳鸣声音疗法 SPA

基于 **Svelte + Vite** 构建的浏览器端声音疗法应用，专为耳鸣（Tinnitus）缓解设计。无需后端，纯静态单页应用。

## 核心功能

- **Notch Therapy（陷波疗法）** — 通过音频陷波滤波进行声学刺激，针对耳鸣频率定制，可叠加粉红噪音/白噪音背景
- **Brainwave（脑波）** — 双耳节拍生成器，支持多种目标脑波状态（Delta/Theta/Alpha/Beta/Gamma）
- **Sleep Soundscape（睡眠声景）** — 环境混合音，组合自然声音 + 脑波节拍，助眠场景
- **播放记录** — 本地存储的疗法使用历史与统计
- **设置** — 主题偏好、i18n 中/英文切换等

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Svelte 3 |
| 构建 | Vite |
| 音频引擎 | Web Audio API（AudioContext + OscillatorNode + BiquadFilterNode） |
| 状态管理 | svelte/store 响应式 stores |
| 国际化 | 自建 i18n 模块，支持 zh-CN / en |
| 样式 | 纯 CSS，无 UI 框架，iOS 风格 UI |
| 部署 | 静态文件，任意 HTTP 服务器即可托管 |

## 项目结构

```
src/
├── App.svelte          # 应用入口
├── main.js             # Vite 入口
├── app.css             # 全局样式
├── assets/             # 静态资源（hero.png）
├── lib/
│   ├── audio/          # Web Audio 引擎实现
│   │   ├── engine.js   # 音频引擎基类
│   │   ├── notch.js    # 陷波疗法引擎
│   │   └── brainwave.js# 脑波引擎
│   ├── stores/         # Svelte stores
│   │   ├── app.js      # 全局应用状态
│   │   ├── audio.js    # 音频播放状态
│   │   ├── therapy.js  # 疗法相关状态
│   │   └── locale.js   # 国际化状态
│   ├── components/     # UI 组件
│   │   ├── GlobalNav.svelte
│   │   ├── MiniPlayer.svelte
│   │   ├── BottomSheet.svelte
│   │   ├── BottomTab.svelte
│   │   ├── DynamicIsland.svelte
│   │   └── TopRightPanel.svelte
│   ├── views/          # 页面视图
│   │   ├── NotchTherapy.svelte
│   │   ├── Brainwave.svelte
│   │   ├── SleepSoundscape.svelte
│   │   ├── NowPlaying.svelte
│   │   ├── Records.svelte
│   │   └── Settings.svelte
│   └── data/           # 数据定义
│       └── sounds.js
├── public/             # 静态文件（favicon、音频片段）
└── static/             # 更多静态资源
```

## 开发

```bash
npm install
npm run dev     # 启动开发服务器 (默认 localhost:5173)
npm run build   # 构建到 dist/
npm run preview # 预览构建产物
```

## 鸣谢

本应用为个人耳鸣管理项目，不构成医疗建议。如有听力健康问题请咨询专业医师。

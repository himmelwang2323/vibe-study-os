# Finals Board

一个轻量的期末项目盘点系统，用来整理课程期末论文、大作业、考试复习、presentation 和实验报告。

## 功能

- 项目卡片：记录课程、类型、截止日期、状态、重要程度和风险。
- 待办进度：每个项目用待办勾选自动计算完成率。
- 材料准备：单独记录课程材料、数据、文献、PPT、模板等准备项。
- 今日行动：按风险、截止日期和进度自动生成处理顺序。
- 本地自动保存：数据保存在浏览器 localStorage 中。

## 使用

直接打开 `index.html` 即可使用。发布到 GitHub Pages 后，也可以通过 Pages 链接访问。

## 桌面版

桌面版使用 Electron 包一层本地窗口，保留网页中的所有数据和盘点功能。

```bash
electron_config_cache=.electron-cache npm install
npm run desktop
```

当前桌面版会在关闭窗口时隐藏到托盘，再次点击托盘可打开。正式打包安装包可以后续接入 `electron-builder`。

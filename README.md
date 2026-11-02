<div align="center">

<img src="docs/images/logo-blue-white.png" width="76" alt="随手词卡 · HandyCards" style="border-radius: 16px;" />

# 随手词卡 · HandyCards
**纯粹 · 极简 · 离线的卡片背单词微信小程序**

[![Platform](https://img.shields.io/badge/Platform-WeChat%20MiniProgram-07C160?style=flat-square&logo=wechat&logoColor=white)](https://mp.weixin.qq.com/)
[![Uni-App](https://img.shields.io/badge/Uni--App-Vue3%20%2B%20TS-2B9939?style=flat-square&logo=vue.js&logoColor=white)](https://uniapp.dcloud.net.cn/)
[![Size](https://img.shields.io/badge/Size-1.75MB%20(<2MB)-success?style=flat-square)](#-快速开始与自主部署)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

</div>

---

<table border="0" width="100%">
  <tr>
    <td width="72%" valign="middle">
      <p><b>随手词卡</b>（英文名：<b>HandyCards</b>）是一款回归记忆卡片（Flashcards）本质的随身背单词工具。像刷短视频一样滑动翻阅卡片，带给你专注顺滑的背词心流。</p>
      <ul>
        <li>⚡ <b>开屏即用</b>：无任何广告插播、无社交打卡、无需登录注册</li>
        <li>📦 <b>真·纯离线</b>：内置四级、六级、考研、雅思词库，断网随心背</li>
        <li>📱 <b>双刷词模式</b>：自测对焦遮挡模式 + 速览高效扫词模式自由切换</li>
        <li>🎓 <b>学术构词剖析</b>：音节数智能测算、1~5 星难度评估、派生词缀拆解</li>
        <li>🌓 <b>深浅色与双语</b>：跟随系统暗黑模式，支持中英双语即时切换</li>
      </ul>
    </td>
    <td width="28%" align="center" valign="middle">
      <img src="docs/images/wechat-mp-qrcode.jpg" width="130" alt="WeChat MiniProgram QR Code" style="border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);" /><br/>
      <sub>📱 <b>微信扫码体验</b></sub><br/>
      <sub><small>随手词卡 · HandyCards</small></sub>
    </td>
  </tr>
</table>

---

## 📖 内置词库

所有词书均位于 `src/static/` 目录下，开箱即用：

| 词书名称 | 对应文件 | 词汇量 | 适用场景 |
| :--- | :--- | :---: | :--- |
| **四级核心词** | `CET4luan_1.json` | 1,162 词 | 大学英语四级考试必备 |
| **六级进阶词** | `CET6luan_1.json` | 1,228 词 | 大学英语六级高频拔高 |
| **考研英语** | `KaoYanluan_1.json` | 1,341 词 | 全国硕士研究生入学英语考试 |
| **雅思词汇** | `IELTSluan_2.json` | 3,427 词 | 雅思学术类（A类）核心与派生词 |

---

## 🚀 快速开始与自主部署

只需一个个人微信小程序账号，即可发布属于你自己的专属私有背单词应用：

### 1. 克隆与安装

```bash
git clone https://github.com/lanzm/HandyCards.git
cd HandyCards
npm install   # 或 pnpm install
```

### 2. 本地开发与调试

```bash
npm run dev:mp-weixin
```
打开 **微信开发者工具** -> 点击「导入」 -> 选择项目目录下的 `dist/dev/mp-weixin` 即可实时预览与热重载。

### 3. 构建发布生产包

```bash
npm run build:mp-weixin
```
编译产物位于 `dist/build/mp-weixin`（整包大小仅 **1.75MB**，完全符合微信 2MB 限制）。在微信开发者工具中导入后，点击右上角 **「上传」** 提交微信审核即可。

### 4. 语音发音域名配置

若需使用在线真人语音发音，请在 [微信公众平台](https://mp.weixin.qq.com/) 的 **「开发管理 -> 开发设置 -> 服务器域名 -> request 合法域名」** 中添加：
```text
https://dict.youdao.com
```

---

## 🤝 开源协议

本项目基于 [MIT License](LICENSE) 协议开源。欢迎自由 Star、Fork、定制二次开发！

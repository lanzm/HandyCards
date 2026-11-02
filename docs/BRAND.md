# 🎨 随手词卡 · HandyCards 品牌与视觉资源规范 (Brand Assets)

本项目遵循**极简、专注、纯粹**的设计美学，所有视觉资源归档于 `docs/images/`。

---

## 1. 官方 Logo 规范（双卡叠层悬浮标 · 1.18x 饱满版）

Logo 采用两张微倾斜交错叠放的抽认卡（Flashcards）形态，前卡浮现双倍加粗的清晰词汇横线与音标圆点，彻底回归产品最核心的交互与心智——**沉浸、纯粹、极简的随身卡片背单词**。富有 Notion、Craft 等高质感现代生产力工具美学。

全套 Logo 均采用 1.18x 饱满比例，在小图标场景下识别度极佳（提供 512×512 高清 PNG 及无损可缩放 SVG 矢量原文件）：

| 经典蓝底 (Classic Blue) | 极简白底 (Clean White) | 暗黑模式 (Midnight Dark) |
| :---: | :---: | :---: |
| <img src="images/logo-blue-white.png" width="180" alt="HandyCards Logo Blue White" style="border-radius: 24px; box-shadow: 0 8px 20px rgba(43, 130, 246, 0.25);" /> | <img src="images/logo-white-blue.png" width="180" alt="HandyCards Logo White Blue" style="border-radius: 24px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);" /> | <img src="images/logo-dark-blue.png" width="180" alt="HandyCards Logo Dark Blue" style="border-radius: 24px; box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35);" /> |
| [PNG](images/logo-blue-white.png) · [SVG](images/logo-blue-white.svg) | [PNG](images/logo-white-blue.png) · [SVG](images/logo-white-blue.svg) | [PNG](images/logo-dark-blue.png) · [SVG](images/logo-dark-blue.svg) |
| **主品牌色** / 官方图标 | 浅色主题 / 文档与白底排版 | 深色主题 / 暗黑模式适配 |

---

## 2. 微信小程序官方头像 (WeChat Mini Program Avatar)

针对微信小程序平台（移动端列表、聊天界面、搜索卡片等圆形裁剪场景）专门调优设计的白底圆形头像。

- **文件位置**：[`docs/images/wechat-avatar.png`](images/wechat-avatar.png) (512×512 PNG)
- **视觉特征**：
  - **纯白全出血背景**：与微信整体浅色 UI 无缝融合；
  - **1.18x 饱满活力蓝卡片**：在手机端 32~40px 的微缩头像场景下，蓝色卡片与白色词条依旧清晰醒目、极具大厂质感；
  - **天然适配圆形裁剪**：居中微倾斜设计，微信裁剪后四周留白呼吸感恰到好处。

---

## 3. 官方小程序码 (Mini Program QR Code)

- **高清展示原图**：[`docs/images/wechat-mp-qrcode.jpg`](images/wechat-mp-qrcode.jpg) (860×860 高清，用于 GitHub README 与 在线大图预览)
- **本地包内资源**：[`src/static/wechat-mp-qrcode.jpg`](../src/static/wechat-mp-qrcode.jpg) (480×480，体积仅 31KB，守护小程序 2MB 主包上限)

---

## 4. 微信分享卡片 (5:4 WeChat Share Cover)

针对微信小程序分享给好友、群聊以及朋友圈场景进行黄金比例（5:4 / 1000×800）专属定制。摒弃冗余的按钮和操作说明，采用瑞士国际主义大单词排版，直击“纯粹背单词”的核心心智。

<div align="center">
  <img src="images/share-cover.jpg" width="480" alt="HandyCards WeChat Share Cover" style="border-radius: 14px; box-shadow: 0 8px 24px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;" />
  <br/>
  <sub><b>微信分享卡片效果图（存储于 <code>src/static/share-cover.jpg</code> 与 <code>docs/images/share-cover.jpg</code>）</b></sub>
</div>

### 视觉与分享特性
- **分享文案**：`随手词卡 · HandyCards - 打开即用的极简翻卡背单词小程序`。
- **动态渲染技术**：利用离线 **Canvas 2D** 实时捕获当前正在背诵的单词与音标，动态绘制 1000×800 高清 5:4 分享图。
- **左上角微标**：双卡叠层悬浮标微缩 App 图标，纯净克制、层级分明。
- **视觉重心**：超大字号展示当前背诵单词 + 国际音标，去除词性标签干扰。
- **底部核心 Slogan**：精致胶囊注脚 `开源 · 无广 · 无登录 · 打开即用`。

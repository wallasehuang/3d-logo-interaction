# 3D Logo 互動元件 — 說明文件

> **專案名稱**：3D Logo M — Three.js Interactive Demo
> **技術棧**：Three.js r162 · Vanilla JS (ES Module) · HTML5 · CSS3
> **作者**：Wallase

---

## 一、專案架構

```
3d-logo-interaction/
├── index.html          # 入口頁面，包含 Import Map 與 Canvas 容器
├── style.css           # 全域樣式、UI 元件（效能監控、Loader、標題）
├── main.js             # 核心邏輯（單一 class LogoApp）
└── README.md           # 本說明文件
```

### 核心類別：`LogoApp`

整個應用封裝於單一 class，職責分明：

| 方法                      | 職責                                                     |
| ------------------------- | -------------------------------------------------------- |
| `constructor()`           | 初始化狀態物件、FPS 計算變數，呼叫 `init()`              |
| `init()`                  | 建立 Scene / Camera / Renderer / 燈光，掛載事件監聽      |
| `createMLogo()`           | 以 `THREE.Shape` + `ExtrudeGeometry` 建構 M 字 Logo      |
| `onMouseMove()`           | 將滑鼠座標轉換成 NDC（Normalized Device Coordinates）    |
| `onTouchStart/Move/End()` | 手機觸控對應處理                                         |
| `onWindowResize()`        | 響應式處理：更新 Camera aspect 與 Renderer 尺寸          |
| `updatePhysics()`         | 每幀更新：Raycaster 碰撞偵測、速度/縮放/傾斜的 Lerp 過渡 |
| `updateFPS()`             | 每秒計算真實 FPS 並更新 UI 顯示                          |
| `animate()`               | 動畫主迴圈（`requestAnimationFrame` 驅動）               |

---

## 二、動畫邏輯

### 主迴圈

```js
animate() {
  requestAnimationFrame(() => this.animate());
  this.updatePhysics(); // 更新互動物理
  this.updateFPS();     // 更新 FPS 計數
  this.logoGroup.rotation.y += this.state.currentRotationSpeed; // Y 軸旋轉
  const time = Date.now() * 0.002;
  this.logoGroup.position.y = Math.sin(time) * 0.15; // 呼吸漂浮
  this.renderer.render(this.scene, this.camera);
}
```

### Hover 速度切換 — Linear Interpolation（Lerp）

旋轉速度不直接跳變，而是每幀「朝目標速度靠近一步」，產生自然的加速/減速曲線：

```js
currentRotationSpeed = lerp(currentRotationSpeed, targetRotationSpeed, 0.06);
```

| 狀態     | 目標速度            | 說明                  |
| -------- | ------------------- | --------------------- |
| 未 hover | `baseSpeed = 0.008` | 慢速、沉穩旋轉        |
| Hover 中 | `fastSpeed = 0.05`  | 快速旋轉，約 6 倍差距 |

`lerpFactor = 0.06` 控制插值速率，值越小過渡越緩，越大越急促。

### 滑鼠傾斜效果

Logo 會微微朝向滑鼠指標傾斜，增加立體互動感：

```js
const tiltX = this.mouse.y * 0.4; // 上下傾斜
const tiltZ = -this.mouse.x * 0.4; // 左右傾斜

this.logoGroup.rotation.x = lerp(rotation.x, tiltX, 0.05);
this.logoGroup.rotation.z = lerp(rotation.z, tiltZ, 0.05);
```

### 縮放特效

Hover 時 Logo 微微放大（1.0 → 1.2），同樣透過 Lerp 平滑過渡：

```js
currentScale = lerp(currentScale, targetScale, 0.05);
logoGroup.scale.setScalar(currentScale);
```

### 呼吸漂浮

以 `Math.sin()` 讓 Logo 在 Y 軸上下緩緩浮動，模擬「呼吸感」：

```js
logoGroup.position.y = Math.sin(Date.now() * 0.002) * 0.15;
```

---

## 三、效能考量

### Renderer 設定

| 設定              | 值                              | 說明                              |
| ----------------- | ------------------------------- | --------------------------------- |
| `antialias`       | `true`                          | 抗鋸齒，提升視覺品質              |
| `powerPreference` | `'high-performance'`            | 提示瀏覽器優先使用獨立 GPU        |
| `setPixelRatio`   | `Math.min(devicePixelRatio, 2)` | 限制最高 2x，避免 4K 螢幕過度渲染 |
| `toneMapping`     | `ReinhardToneMapping`           | 模擬真實曝光，強化金屬質感        |

### 動畫迴圈

- 使用 **`requestAnimationFrame`** 而非 `setInterval`，由瀏覽器決定最佳呼叫時機，自動配合螢幕刷新率（60/120 Hz）
- 在 **背景分頁**或**非作用中視窗**時，`rAF` 會自動暫停，節省 CPU/GPU

### 幾何體設計

- **`ExtrudeGeometry`** 僅在初始化時建立一次，不在動畫迴圈中重複創建
- `bevelSegments: 5` 在視覺品質與多邊形數量間取得平衡
- **霧效（`THREE.Fog`）** 在遠端自然裁切物件，減少不必要的渲染

---

## 四、使用的 Library 與選擇理由

使用 **Three.js** 成熟的 WebGL 抽象層，提供 Scene / Camera / Renderer / Material 完整生態；社群活躍、文件豐富，適合快速實作高品質 3D 效果

並未使用 **Three.js** 額外擴充功能

---

## 五、如何運行 Demo

```bash
# 啟動本地開發 server
git clone 3d-logo-interation
cd 3d-logo-interation
npm run dev

# 瀏覽器開啟
open http://localhost:5173
```

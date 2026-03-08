import * as THREE from 'three';

class LogoApp {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.fpsDisplay = document.getElementById('fps-counter');

    // 狀態管理
    this.state = {
      hovered: false,
      isTouching: false, // 手機觸控中的旗標
      currentRotationSpeed: 0.005,
      targetRotationSpeed: 0.005,
      baseSpeed: 0.008,
      fastSpeed: 0.05,
      lerpFactor: 0.06,
      targetScale: 1,
      currentScale: 1,
      tiltAmount: { x: 0, y: 0 },
    };

    // FPS 計算變數
    this.fpstimePrev = performance.now();
    this.fpsFrames = 0;

    this.init();
  }

  init() {
    this.scene = new THREE.Scene();

    this.scene.fog = new THREE.Fog(0x04040a, 8, 15);

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    this.camera.position.z = 10;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.renderer.toneMapping = THREE.ReinhardToneMapping;
    this.container.appendChild(this.renderer.domElement);

    // 燈光
    const ambientLight = new THREE.AmbientLight(0x9999cc, 0.4);
    this.scene.add(ambientLight);

    const blueKeyLight = new THREE.PointLight(0x060d8f, 25, 30);
    blueKeyLight.position.set(5, 5, 8);
    this.scene.add(blueKeyLight);

    const cyanFillLight = new THREE.PointLight(0x4d79ff, 15, 20);
    cyanFillLight.position.set(-8, 3, 5);
    this.scene.add(cyanFillLight);

    const rimLight = new THREE.SpotLight(0xffffff, 2);
    rimLight.position.set(0, 15, -5);
    this.scene.add(rimLight);

    // 建立 Logo
    this.logoGroup = new THREE.Group();
    this.createMLogo();
    this.scene.add(this.logoGroup);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(0, 0);

    window.addEventListener('resize', () => this.onWindowResize());
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('touchmove', (e) => this.onTouchMove(e), {
      passive: true,
    });
    window.addEventListener('touchstart', (e) => this.onTouchStart(e), {
      passive: true,
    });
    window.addEventListener('touchend', () => this.onTouchEnd());
    // 阻止長按出現瀏覽器右鍵選單（iOS Safari / Android Chrome）
    window.addEventListener('contextmenu', (e) => e.preventDefault());

    document.getElementById('loader').style.opacity = '0';
    setTimeout(() => document.getElementById('loader').remove(), 800);

    this.animate();
  }

  createMLogo() {
    const shape = new THREE.Shape();
    shape.moveTo(-1.2, -1);
    shape.lineTo(-1.2, 1);
    shape.lineTo(-0.5, 1);
    shape.lineTo(0, 0.1);
    shape.lineTo(0.5, 1);
    shape.lineTo(1.2, 1);
    shape.lineTo(1.2, -1);
    shape.lineTo(0.7, -1);
    shape.lineTo(0.7, 0.3);
    shape.lineTo(0, -0.6);
    shape.lineTo(-0.7, 0.3);
    shape.lineTo(-0.7, -1);
    shape.closePath();

    const extrudeSettings = {
      steps: 2,
      depth: 0.5,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelOffset: 0,
      bevelSegments: 5,
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.center();

    const material = new THREE.MeshPhysicalMaterial({
      color: 0x060d8f,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0x060d8f,
      emissiveIntensity: 0.2,
      reflectivity: 1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
    });

    this.logoMesh = new THREE.Mesh(geometry, material);

    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x00f2ff,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });
    const wireframe = new THREE.LineSegments(edges, lineMaterial);

    this.logoGroup.add(this.logoMesh);
    this.logoGroup.add(wireframe);
  }

  onMouseMove(event) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  onTouchMove(event) {
    const touch = event.touches[0];
    if (!touch) return;
    this.mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
  }

  onTouchStart(event) {
    const touch = event.touches[0];
    if (!touch) return;
    // 記錄觸點座標（用於傾斜效果）
    this.mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
    // 設旗標：持續維持快速旋轉，避免 touchend 座標歸零後 Raycaster 瞬間失去命中
    this.state.isTouching = true;
  }

  onTouchEnd() {
    this.state.isTouching = false;
    // 延遲歸零座標，讓傾斜效果有時間平滑回正
    this.mouse.set(0, 0);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  updatePhysics() {
    // 偵測滑鼠事件
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.logoGroup.children);
    const isIntersecting = intersects.length > 0;

    // 物件大小效果：Raycaster 命中（桌機）或觸控中（手機）皆觸發
    if (isIntersecting || this.state.isTouching) {
      this.state.targetRotationSpeed = this.state.fastSpeed;
      this.state.targetScale = 1.2;
    } else {
      this.state.targetRotationSpeed = this.state.baseSpeed;
      this.state.targetScale = 1.0;
    }

    // 速度與縮放平滑過渡
    this.state.currentRotationSpeed = THREE.MathUtils.lerp(
      this.state.currentRotationSpeed,
      this.state.targetRotationSpeed,
      this.state.lerpFactor,
    );

    this.state.currentScale = THREE.MathUtils.lerp(
      this.state.currentScale,
      this.state.targetScale,
      0.05,
    );
    this.logoGroup.scale.setScalar(this.state.currentScale);

    // 滑鼠傾斜效果
    const tiltX = this.mouse.y * 0.4;
    const tiltZ = -this.mouse.x * 0.4;

    this.logoGroup.rotation.x = THREE.MathUtils.lerp(
      this.logoGroup.rotation.x,
      tiltX,
      0.05,
    );
    this.logoGroup.rotation.z = THREE.MathUtils.lerp(
      this.logoGroup.rotation.z,
      tiltZ,
      0.05,
    );
  }

  updateFPS() {
    this.fpsFrames++;
    const time = performance.now();
    if (time >= this.fpstimePrev + 1000) {
      const fps = Math.round(
        (this.fpsFrames * 1000) / (time - this.fpstimePrev),
      );
      this.fpsDisplay.innerText = fps;

      // 根據 FPS 調整顏色 (效能警示)
      this.fpsDisplay.style.color = fps < 50 ? '#ff4e4e' : '#00f2ff';

      this.fpsFrames = 0;
      this.fpstimePrev = time;
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    this.updatePhysics();
    this.updateFPS();

    // 基礎旋轉
    this.logoGroup.rotation.y += this.state.currentRotationSpeed;

    // 呼吸效果
    const time = Date.now() * 0.002;
    this.logoGroup.position.y = Math.sin(time) * 0.15;

    this.renderer.render(this.scene, this.camera);
  }
}

window.onload = () => {
  new LogoApp();
};

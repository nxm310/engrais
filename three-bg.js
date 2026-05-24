/* ==========================================
   VICON — Gestion Engrais
   Three.js Gold & Green Particle Flow Background
   ========================================== */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';

class ThreeBg {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.particles = null;
    this.particleCount = 750; // Optimized for both performance and aesthetics
    
    // Animation properties
    this.animationFrameId = null;
    this.isPaused = false;
    this.particleData = [];
    
    this.init();
  }

  init() {
    // 1. Scene setup
    this.scene = new THREE.Scene();
    
    // 2. Camera setup
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      1,
      1000
    );
    this.camera.position.z = 250;

    // 3. Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // 4. Create Particles
    this.createParticles();

    // 5. Event Listeners
    window.addEventListener('resize', this.onWindowResize.bind(this));
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

    // 6. Start Loop
    this.animate();
  }

  createParticles() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);

    // Golden tones: #f5a623 (245, 166, 35) & #d4af37 (212, 175, 55)
    // Emerald tones: #10b981 (16, 185, 129) & #0fc6b4 (15, 198, 180)
    const colorChoices = [
      new THREE.Color(0xf5a623), // Gold Chaleureux
      new THREE.Color(0xd4af37), // Or Vigne
      new THREE.Color(0x10b981), // Vert Émeraude
      new THREE.Color(0x0fc6b4)  // Teal Lumineux
    ];

    for (let i = 0; i < this.particleCount; i++) {
      // Position spread
      const x = (Math.random() - 0.5) * 500;
      const y = (Math.random() - 0.5) * 300;
      const z = (Math.random() - 0.5) * 200;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Color choice
      const color = colorChoices[Math.floor(Math.random() * colorChoices.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // Individual behavior data
      this.particleData.push({
        speedX: (0.1 + Math.random() * 0.3),
        speedY: (Math.random() - 0.5) * 0.1,
        amplitude: 5 + Math.random() * 15,
        frequency: 0.005 + Math.random() * 0.015,
        phase: Math.random() * Math.PI * 2
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Custom Round/Glow Canvas Texture
    const texture = this.createCircleTexture();

    // Material with Vertex Colors
    const material = new THREE.PointsMaterial({
      size: 4.5,
      map: texture,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  createCircleTexture() {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Create a smooth radial gradient
    const gradient = ctx.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.7)');
    gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.15)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    return new THREE.CanvasTexture(canvas);
  }

  animate(time = 0) {
    if (this.isPaused) return;

    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));

    const positions = this.particles.geometry.attributes.position.array;

    for (let i = 0; i < this.particleCount; i++) {
      const data = this.particleData[i];
      const index = i * 3;

      // 1. Move horizontally (to the right)
      positions[index] += data.speedX;

      // 2. Wave movement vertically (Nutrients flow)
      positions[index + 1] += Math.sin(time * data.frequency + data.phase) * 0.15 + data.speedY;

      // 3. Bound checking : reset particle to the left side if it exits the right boundary
      if (positions[index] > 300) {
        positions[index] = -300;
        positions[index + 1] = (Math.random() - 0.5) * 300;
      }
      
      // Vertical boundary wrapping
      if (positions[index + 1] > 200) positions[index + 1] = -200;
      if (positions[index + 1] < -200) positions[index + 1] = 200;
    }

    this.particles.geometry.attributes.position.needsUpdate = true;

    // Slow rotation of the entire scene for depth
    this.particles.rotation.y = time * 0.00003;
    this.particles.rotation.x = time * 0.00001;

    this.renderer.render(this.scene, this.camera);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  handleVisibilityChange() {
    if (document.hidden) {
      this.pause();
    } else {
      this.resume();
    }
  }

  pause() {
    this.isPaused = true;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  resume() {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.animate();
  }
}

export function initThreeBg(canvasId) {
  return new ThreeBg(canvasId);
}

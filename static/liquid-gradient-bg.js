(function () {
  "use strict";

  if (!window.THREE) {
    return;
  }

  function hexToVec3(hex) {
    var clean = String(hex || "#000000").replace("#", "");
    var num = parseInt(clean, 16);
    var r = ((num >> 16) & 255) / 255;
    var g = ((num >> 8) & 255) / 255;
    var b = (num & 255) / 255;
    return new THREE.Vector3(r, g, b);
  }

  function TouchTexture() {
    this.size = 64;
    this.width = this.size;
    this.height = this.size;
    this.maxAge = 64;
    this.radius = 0.24 * this.size;
    this.speed = 1 / this.maxAge;
    this.trail = [];
    this.last = null;
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx = this.canvas.getContext("2d");
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.texture = new THREE.Texture(this.canvas);
  }

  TouchTexture.prototype.clear = function () {
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(0, 0, this.width, this.height);
  };

  TouchTexture.prototype.addTouch = function (point) {
    var force = 0.7;
    var vx = 0;
    var vy = 0;

    if (this.last) {
      var dx = point.x - this.last.x;
      var dy = point.y - this.last.y;
      if (dx === 0 && dy === 0) {
        return;
      }
      var dd = dx * dx + dy * dy;
      var d = Math.sqrt(dd);
      vx = dx / d;
      vy = dy / d;
      force = Math.min(dd * 26000, 2.4);
    }

    this.last = { x: point.x, y: point.y };
    this.trail.push({
      x: point.x,
      y: point.y,
      age: 0,
      force: force,
      vx: vx,
      vy: vy
    });
  };

  TouchTexture.prototype.drawPoint = function (point) {
    var posX = point.x * this.width;
    var posY = (1 - point.y) * this.height;
    var intensity = 1;

    if (point.age < this.maxAge * 0.35) {
      intensity = Math.sin((point.age / (this.maxAge * 0.35)) * (Math.PI / 2));
    } else {
      var t = 1 - (point.age - this.maxAge * 0.35) / (this.maxAge * 0.65);
      intensity = -t * (t - 2);
    }
    intensity *= point.force;

    var color = ((point.vx + 1) * 0.5 * 255) + ", " + ((point.vy + 1) * 0.5 * 255) + ", " + (intensity * 255);
    var offset = this.size * 5;
    this.ctx.shadowOffsetX = offset;
    this.ctx.shadowOffsetY = offset;
    this.ctx.shadowBlur = this.radius;
    this.ctx.shadowColor = "rgba(" + color + "," + (0.2 * intensity) + ")";

    this.ctx.beginPath();
    this.ctx.fillStyle = "rgba(255, 0, 0, 1)";
    this.ctx.arc(posX - offset, posY - offset, this.radius, 0, Math.PI * 2);
    this.ctx.fill();
  };

  TouchTexture.prototype.update = function () {
    this.clear();
    var speed = this.speed;
    for (var i = this.trail.length - 1; i >= 0; i--) {
      var point = this.trail[i];
      var factor = point.force * speed * (1 - point.age / this.maxAge);
      point.x += point.vx * factor;
      point.y += point.vy * factor;
      point.age += 1;
      if (point.age > this.maxAge) {
        this.trail.splice(i, 1);
      } else {
        this.drawPoint(point);
      }
    }
    this.texture.needsUpdate = true;
  };

  function LiquidGradientApp(canvas) {
    this.canvas = canvas;
    this.reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    this.clock = new THREE.Clock();
    this.touchTexture = new TouchTexture();
    this.frame = null;

    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance"
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.z = 50;
    this.scene = new THREE.Scene();

    this.uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      uTouchTexture: { value: this.touchTexture.texture },
      uColor1: { value: hexToVec3("#39d2be") },
      uColor2: { value: hexToVec3("#5f7ce2") },
      uColor3: { value: hexToVec3("#315f99") },
      uColor4: { value: hexToVec3("#216a82") },
      uColor5: { value: hexToVec3("#4d71d8") },
      uColor6: { value: hexToVec3("#365282") },
      uBaseColor: { value: hexToVec3("#040916") },
      uSpeed: { value: 0.46 },
      uIntensity: { value: 0.686 },
      uGrainIntensity: { value: 0.03 },
      uDistortionStrength: { value: this.reduceMotion ? 0.24 : 0.48 },
      uRippleStrength: { value: this.reduceMotion ? 0.015 : 0.034 }
    };

    this.mesh = null;
    this.initScene();
    this.attachEvents();
    this.render();

    this.tick();
  }

  LiquidGradientApp.prototype.getViewSize = function () {
    var fovRad = (this.camera.fov * Math.PI) / 180;
    var height = Math.abs(this.camera.position.z * Math.tan(fovRad / 2) * 2);
    return {
      width: height * this.camera.aspect,
      height: height
    };
  };

  LiquidGradientApp.prototype.initScene = function () {
    var view = this.getViewSize();
    var geometry = new THREE.PlaneGeometry(view.width, view.height, 1, 1);
    var material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: [
        "varying vec2 vUv;",
        "void main() {",
        "  vUv = uv;",
        "  gl_Position = projectionMatrix * modelViewMatrix * vec4(position.xyz, 1.0);",
        "}"
      ].join("\n"),
      fragmentShader: [
        "uniform float uTime;",
        "uniform vec2 uResolution;",
        "uniform sampler2D uTouchTexture;",
        "uniform vec3 uColor1;",
        "uniform vec3 uColor2;",
        "uniform vec3 uColor3;",
        "uniform vec3 uColor4;",
        "uniform vec3 uColor5;",
        "uniform vec3 uColor6;",
        "uniform vec3 uBaseColor;",
        "uniform float uSpeed;",
        "uniform float uIntensity;",
        "uniform float uGrainIntensity;",
        "uniform float uDistortionStrength;",
        "uniform float uRippleStrength;",
        "varying vec2 vUv;",
        "float grain(vec2 uv, float time) {",
        "  vec2 gUv = uv * uResolution * 0.45;",
        "  float g = fract(sin(dot(gUv + time, vec2(12.9898, 78.233))) * 43758.5453);",
        "  return g * 2.0 - 1.0;",
        "}",
        "vec3 blendGradients(vec2 uv, float t) {",
        "  vec2 c1 = vec2(0.5 + sin(t * uSpeed * 0.58) * 0.36, 0.5 + cos(t * uSpeed * 0.44) * 0.32);",
        "  vec2 c2 = vec2(0.5 + cos(t * uSpeed * 0.52) * 0.43, 0.5 + sin(t * uSpeed * 0.64) * 0.38);",
        "  vec2 c3 = vec2(0.5 + sin(t * uSpeed * 0.74) * 0.29, 0.5 + cos(t * uSpeed * 0.66) * 0.4);",
        "  vec2 c4 = vec2(0.5 + cos(t * uSpeed * 0.42) * 0.34, 0.5 + sin(t * uSpeed * 0.49) * 0.34);",
        "  vec2 c5 = vec2(0.5 + sin(t * uSpeed * 0.37) * 0.47, 0.5 + cos(t * uSpeed * 0.57) * 0.28);",
        "  vec2 c6 = vec2(0.5 + cos(t * uSpeed * 0.71) * 0.31, 0.5 + sin(t * uSpeed * 0.46) * 0.43);",
        "  float i1 = 1.0 - smoothstep(0.0, 0.56, length(uv - c1));",
        "  float i2 = 1.0 - smoothstep(0.0, 0.52, length(uv - c2));",
        "  float i3 = 1.0 - smoothstep(0.0, 0.58, length(uv - c3));",
        "  float i4 = 1.0 - smoothstep(0.0, 0.5, length(uv - c4));",
        "  float i5 = 1.0 - smoothstep(0.0, 0.62, length(uv - c5));",
        "  float i6 = 1.0 - smoothstep(0.0, 0.52, length(uv - c6));",
        "  vec3 color = uBaseColor * 0.95;",
        "  color += uColor1 * i1 * (0.4 + 0.3 * sin(t * 0.9));",
        "  color += uColor2 * i2 * (0.36 + 0.32 * cos(t * 1.1));",
        "  color += uColor3 * i3 * (0.38 + 0.3 * sin(t * 1.2));",
        "  color += uColor4 * i4 * (0.34 + 0.27 * cos(t * 0.82));",
        "  color += uColor5 * i5 * (0.31 + 0.28 * sin(t * 1.03));",
        "  color += uColor6 * i6 * (0.3 + 0.24 * cos(t * 1.28));",
        "  float radial = 1.0 - smoothstep(0.2, 0.95, length(uv - 0.5));",
        "  color += mix(uColor1, uColor2, radial) * 0.056;",
        "  color = mix(uBaseColor, color, clamp(length(color), 0.2, 1.0));",
        "  return color * uIntensity;",
        "}",
        "void main() {",
        "  vec2 uv = vUv;",
        "  vec4 touch = texture2D(uTouchTexture, uv);",
        "  vec2 flow = (touch.rg * 2.0 - 1.0);",
        "  float press = touch.b;",
        "  uv += flow * (uDistortionStrength * press);",
        "  float ripple = sin(length(uv - 0.5) * 18.0 - uTime * 2.0) * uRippleStrength * press;",
        "  uv += vec2(ripple, ripple);",
        "  vec3 color = blendGradients(uv, uTime);",
        "  float g = grain(uv, uTime * 0.55);",
        "  color += g * uGrainIntensity;",
        "  color = clamp(color, vec3(0.0), vec3(1.0));",
        "  gl_FragColor = vec4(color, 1.0);",
        "}"
      ].join("\n")
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.mesh);
    this.scene.background = new THREE.Color(0x040916);
  };

  LiquidGradientApp.prototype.attachEvents = function () {
    var self = this;

    function handlePointer(clientX, clientY) {
      self.touchTexture.addTouch({
        x: clientX / window.innerWidth,
        y: 1 - clientY / window.innerHeight
      });
      if (self.reduceMotion) {
        self.render();
      }
    }

    document.addEventListener("pointermove", function (ev) {
      handlePointer(ev.clientX, ev.clientY);
    }, { passive: true });

    document.addEventListener("pointerdown", function (ev) {
      handlePointer(ev.clientX, ev.clientY);
    }, { passive: true });

    window.addEventListener("touchmove", function (ev) {
      if (!ev.touches || !ev.touches[0]) {
        return;
      }
      handlePointer(ev.touches[0].clientX, ev.touches[0].clientY);
    }, { passive: true });

    window.addEventListener("resize", function () {
      self.onResize();
    });

    document.addEventListener("visibilitychange", function () {
      if (!document.hidden && self.reduceMotion) {
        self.render();
      }
    });
  };

  LiquidGradientApp.prototype.onResize = function () {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);

    if (this.mesh) {
      var view = this.getViewSize();
      this.mesh.geometry.dispose();
      this.mesh.geometry = new THREE.PlaneGeometry(view.width, view.height, 1, 1);
    }

    if (this.reduceMotion) {
      this.render();
    }
  };

  LiquidGradientApp.prototype.render = function () {
    var delta = Math.min(this.clock.getDelta(), 0.1);
    this.uniforms.uTime.value += delta;
    this.touchTexture.update();
    this.renderer.render(this.scene, this.camera);
  };

  LiquidGradientApp.prototype.tick = function () {
    var self = this;
    this.render();
    this.frame = window.requestAnimationFrame(function () {
      self.tick();
    });
  };

  function boot() {
    var canvas = document.getElementById("liquid-bg-canvas");
    if (!canvas) {
      return;
    }
    try {
      window.__liquidGradientBg = new LiquidGradientApp(canvas);
    } catch (error) {
      canvas.style.display = "none";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

(function () {
  "use strict";

  if (!window.THREE) return;

  var stage = document.getElementById("data-tunnel-stage");
  if (!stage) return;

  var reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var THREE = window.THREE;

  var scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050913, 0.03);

  var camera = new THREE.PerspectiveCamera(48, 1, 0.1, 180);
  camera.position.set(0, 0, 20);
  camera.lookAt(0, 0, 0);

  var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
  renderer.setClearColor(0x000000, 0);
  stage.appendChild(renderer.domElement);

  var contentGroup = new THREE.Group();
  scene.add(contentGroup);

  var params = {
    lineCount: 56,
    segmentCount: 110,
    curveLength: 9.5,
    straightLength: 17,
    spreadHeight: 8.2,
    spreadDepth: 1.8,
    curvePower: 0.9,
    waveSpeed: 2.2,
    waveHeight: 0.06,
    lineOpacity: 0.46,
    signalCount: 32,
    signalSpeed: 0.62,
    trailLength: 16
  };

  // Re-center asymmetric tunnel geometry inside the card stage.
  contentGroup.position.x = (params.curveLength - params.straightLength) * 0.5;

  var bgMaterial = new THREE.LineBasicMaterial({
    color: 0x35435a,
    transparent: true,
    opacity: params.lineOpacity,
    depthWrite: false
  });

  var signalMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    depthTest: false
  });

  var signalPalette = [
    new THREE.Color(0x8fc9ff),
    new THREE.Color(0x39d2be),
    new THREE.Color(0x6f8fff)
  ];

  var lines = [];
  var signals = [];
  var clock = new THREE.Clock();

  function pickSignalColor() {
    return signalPalette[Math.floor(Math.random() * signalPalette.length)];
  }

  function getPathPoint(t, lane, time) {
    var totalLen = params.curveLength + params.straightLength;
    var x = -params.curveLength + t * totalLen;
    var laneFactor = (lane / (params.lineCount - 1) - 0.5) * 2;

    var y = 0;
    var z = 0;

    if (x < 0) {
      var ratio = (x + params.curveLength) / params.curveLength;
      var shape = (Math.cos(ratio * Math.PI) + 1) * 0.5;
      shape = Math.pow(shape, params.curvePower);

      y = laneFactor * params.spreadHeight * shape;
      z = laneFactor * params.spreadDepth * shape;
      y += Math.sin(time * params.waveSpeed + x * 0.9 + lane * 0.3) * params.waveHeight * shape;
    }

    return new THREE.Vector3(x, y, z);
  }

  function clearExisting() {
    lines.forEach(function (line) {
      contentGroup.remove(line);
      line.geometry.dispose();
    });
    lines = [];

    signals.forEach(function (sig) {
      contentGroup.remove(sig.mesh);
      sig.mesh.geometry.dispose();
    });
    signals = [];
  }

  function buildLines() {
    clearExisting();

    for (var i = 0; i < params.lineCount; i++) {
      var geo = new THREE.BufferGeometry();
      var positions = new Float32Array(params.segmentCount * 3);
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

      var line = new THREE.Line(geo, bgMaterial);
      line.userData = { lane: i };
      line.renderOrder = 0;
      contentGroup.add(line);
      lines.push(line);
    }

    for (var s = 0; s < params.signalCount; s++) {
      createSignal();
    }
  }

  function createSignal() {
    var maxTrail = Math.max(2, params.trailLength + 2);
    var geo = new THREE.BufferGeometry();
    var positions = new Float32Array(maxTrail * 3);
    var colors = new Float32Array(maxTrail * 3);
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    var mesh = new THREE.Line(geo, signalMaterial);
    mesh.frustumCulled = false;
    mesh.renderOrder = 2;
    contentGroup.add(mesh);

    signals.push({
      mesh: mesh,
      lane: Math.floor(Math.random() * params.lineCount),
      speed: 0.26 + Math.random() * 0.48,
      progress: Math.random(),
      history: [],
      color: pickSignalColor()
    });
  }

  function resize() {
    var width = Math.max(16, stage.clientWidth);
    var height = Math.max(16, stage.clientHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  function updateLines(time) {
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var positions = line.geometry.attributes.position.array;
      var lane = line.userData.lane;
      for (var s = 0; s < params.segmentCount; s++) {
        var t = s / (params.segmentCount - 1);
        var p = getPathPoint(t, lane, time);
        var idx = s * 3;
        positions[idx] = p.x;
        positions[idx + 1] = p.y;
        positions[idx + 2] = p.z;
      }
      line.geometry.attributes.position.needsUpdate = true;
    }
  }

  function updateSignals(time, dt) {
    for (var i = 0; i < signals.length; i++) {
      var sig = signals[i];
      sig.progress += dt * sig.speed * params.signalSpeed;

      if (sig.progress > 1) {
        sig.progress = 0;
        sig.lane = Math.floor(Math.random() * params.lineCount);
        sig.history.length = 0;
        sig.color = pickSignalColor();
      }

      sig.history.push(getPathPoint(sig.progress, sig.lane, time));
      if (sig.history.length > params.trailLength + 1) {
        sig.history.shift();
      }

      var positions = sig.mesh.geometry.attributes.position.array;
      var colors = sig.mesh.geometry.attributes.color.array;
      var drawCount = Math.max(2, sig.history.length);

      for (var j = 0; j < drawCount; j++) {
        var point = sig.history[drawCount - 1 - j] || sig.history[0];
        var idx = j * 3;
        positions[idx] = point.x;
        positions[idx + 1] = point.y;
        positions[idx + 2] = point.z;

        var fade = 1 - j / drawCount;
        colors[idx] = sig.color.r * fade;
        colors[idx + 1] = sig.color.g * fade;
        colors[idx + 2] = sig.color.b * fade;
      }

      sig.mesh.geometry.setDrawRange(0, drawCount);
      sig.mesh.geometry.attributes.position.needsUpdate = true;
      sig.mesh.geometry.attributes.color.needsUpdate = true;
    }
  }

  function renderFrame() {
    var dt = Math.min(clock.getDelta(), 0.05);
    var t = clock.elapsedTime;
    updateLines(t);
    updateSignals(t, dt);
    renderer.render(scene, camera);
  }

  function animate() {
    renderFrame();
    if (!reduceMotion) {
      window.requestAnimationFrame(animate);
    }
  }

  buildLines();
  resize();
  animate();

  window.addEventListener("resize", resize);

  if (window.ResizeObserver) {
    var observer = new ResizeObserver(resize);
    observer.observe(stage);
  }
})();

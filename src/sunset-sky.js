// ===== src/sunset-sky.js — procedural golden-hour sky for Babylon.js =====
/* Background-only sunset gradient, glowing sun disk and softly-shaped drifting clouds.
   Gameplay meshes and real-time shadows remain in the 3D scene. */
(function (root) {
  const vertexShader = `
#ifdef GL_ES
precision highp float;
#endif
attribute vec3 position;
uniform mat4 worldViewProjection;
varying vec3 vDirection;
void main(void) {
  vDirection = normalize(position);
  gl_Position = worldViewProjection * vec4(position, 1.0);
}`;

  const fragmentShader = `
#ifdef GL_ES
precision highp float;
#endif
varying vec3 vDirection;
uniform vec3 sunDirection;
uniform float time;

float hash3(vec3 p) {
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
}
float noise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n0 = mix(
    mix(hash3(i + vec3(0.0,0.0,0.0)), hash3(i + vec3(1.0,0.0,0.0)), f.x),
    mix(hash3(i + vec3(0.0,1.0,0.0)), hash3(i + vec3(1.0,1.0,0.0)), f.x), f.y);
  float n1 = mix(
    mix(hash3(i + vec3(0.0,0.0,1.0)), hash3(i + vec3(1.0,0.0,1.0)), f.x),
    mix(hash3(i + vec3(0.0,1.0,1.0)), hash3(i + vec3(1.0,1.0,1.0)), f.x), f.y);
  return mix(n0, n1, f.z);
}
float fbm(vec3 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise3(p);
    p *= 2.03;
    amplitude *= 0.5;
  }
  return value;
}
void main(void) {
  vec3 d = normalize(vDirection);
  vec3 sun = normalize(sunDirection);
  float h = d.y;

  // Blue-violet upper sky fading to dusty rose and a golden horizon.
  vec3 color = mix(vec3(0.96, 0.48, 0.29), vec3(0.49, 0.34, 0.48),
                   smoothstep(-0.02, 0.34, h));
  color = mix(color, vec3(0.19, 0.31, 0.51), smoothstep(0.20, 0.83, h));

  // Warm horizon glow and a small, bright setting sun.
  float sunDot = max(dot(d, sun), 0.0);
  float glow = exp(-(1.0 - sunDot) * 13.0);
  float broadGlow = exp(-(1.0 - sunDot) * 3.2);
  color += vec3(1.0, 0.34, 0.08) * glow * 0.46;
  color += vec3(1.0, 0.43, 0.16) * broadGlow * 0.20;
  float horizon = exp(-max(h, 0.0) * 6.0) * smoothstep(-0.08, 0.10, h);
  color = mix(color, vec3(1.0, 0.57, 0.29), horizon * 0.22);
  float sunDisk = smoothstep(0.99925, 0.99982, sunDot);
  color = mix(color, vec3(1.0, 0.86, 0.58), sunDisk);

  // Four-octave noise makes cloud banks; the camera can rotate freely around the sky.
  vec3 cloudPos = d * vec3(4.6, 7.5, 4.6);
  cloudPos.x += time * 0.008;
  cloudPos.z += time * 0.003;
  float largeCloud = fbm(cloudPos);
  float detail = noise3(d * vec3(18.0, 13.0, 18.0));
  float cloudField = largeCloud + (detail - 0.5) * 0.15;
  float cloudBand = smoothstep(-0.10, 0.015, h) *
                    (1.0 - smoothstep(0.63, 0.88, h));
  float cloudShape = smoothstep(0.49, 0.65, cloudField) * cloudBand;
  float cloudEdge = smoothstep(0.44, 0.55, cloudField) *
                    (1.0 - smoothstep(0.69, 0.81, cloudField)) * cloudBand;
  float lit = smoothstep(-0.25, 0.72, dot(d, sun));
  vec3 cloudShadow = vec3(0.38, 0.27, 0.40);
  vec3 cloudGold = vec3(1.0, 0.67, 0.37);
  vec3 cloudColor = mix(cloudShadow, cloudGold, lit);
  cloudColor = mix(cloudColor, vec3(1.0, 0.82, 0.52),
                   smoothstep(0.60, 0.78, largeCloud) * lit);
  color = mix(color, cloudColor, cloudShape * 0.93);
  color += vec3(1.0, 0.67, 0.34) * cloudEdge * lit * 0.12;
  color *= 1.0 - smoothstep(-0.30, -0.02, -h) * 0.10;
  gl_FragColor = vec4(color, 1.0);
}`;

  function create(scene, B, config) {
    if (!scene || !B || !B.ShaderMaterial || !B.MeshBuilder || !B.Effect) return null;
    const old = scene.getMeshByName && scene.getMeshByName("sunsetSkyDome");
    if (old) old.dispose();

    B.Effect.ShadersStore.sunsetSkyVertexShader = vertexShader;
    B.Effect.ShadersStore.sunsetSkyFragmentShader = fragmentShader;
    const sky = B.MeshBuilder.CreateSphere("sunsetSkyDome", {
      diameter: 1600,
      segments: 32,
      sideOrientation: B.Mesh.BACKSIDE
    }, scene);
    const material = new B.ShaderMaterial("sunsetSkyMaterial", scene, {
      vertex: "sunsetSky",
      fragment: "sunsetSky"
    }, {
      attributes: ["position"],
      uniforms: ["worldViewProjection", "sunDirection", "time"]
    });
    material.backFaceCulling = false;
    material.disableDepthWrite = true;

    // DirectionalLight points the way light rays travel, so the visible sun
    // is on the opposite side of that vector.
    const sunCfg = (config && config.sun) || {};
    const az = (typeof sunCfg.azimuth === "number" ? sunCfg.azimuth : -90) * Math.PI / 180;
    const el = (typeof sunCfg.elevation === "number" ? sunCfg.elevation : 13) * Math.PI / 180;
    const direction = new B.Vector3(
      -Math.sin(az) * Math.cos(el),
      Math.sin(el),
      -Math.cos(az) * Math.cos(el)
    ).normalize();
    material.setVector3("sunDirection", direction);

    sky.material = material;
    sky.isPickable = false;
    sky.checkCollisions = false;
    sky.alwaysSelectAsActiveMesh = true;
    sky.renderingGroupId = 0;

    let elapsed = 0;
    const observer = scene.onBeforeRenderObservable.add(() => {
      const camera = scene.activeCamera;
      if (camera) sky.position.copyFrom(camera.position);
      elapsed += Math.max(0, scene.getEngine().getDeltaTime()) / 1000;
      material.setFloat("time", elapsed);
    });
    scene.onDisposeObservable.addOnce(() => {
      scene.onBeforeRenderObservable.remove(observer);
    });
    return sky;
  }

  root.SunsetSky = { create };
})(typeof window !== "undefined" ? window : globalThis);

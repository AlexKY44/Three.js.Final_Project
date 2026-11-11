import * as THREE from 'three';
import { SUN_DIRECTION, SKY_COLORS } from './SkyShader.js';

// Сума синусоїд: повертає (висота, градієнт X, градієнт Z)
const wavesGLSL = /* glsl */ `
  vec3 waveSum(vec2 p, float t, int count) {
    float h = 0.0;
    vec2 g = vec2(0.0);
    for (int i = 0; i < 6; i++) {
      if (i >= count) break;
      float fi = float(i);
      float ang = fi * 2.399 + 0.5;               // золотий кут: хвилі йдуть у різні боки
      vec2 d = vec2(cos(ang), sin(ang));
      float k = 0.45 * pow(1.55, fi);             // частота росте
      float a = 0.11 * pow(0.62, fi);             // амплітуда спадає
      float ph = dot(d, p) * k + t * 0.9 * sqrt(k);
      h += a * sin(ph);
      g += a * k * cos(ph) * d;
    }
    return vec3(h, g);
  }
`;

const vertexShader = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorldPos;
  varying vec2 vUv;
  #include <fog_pars_vertex>

  ${wavesGLSL}

  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vec3 w = waveSum(wp.xz, uTime, 3);
    wp.y += w.x * 0.12;                // дуже мале зміщення: вода не має опускатися під пісок                   // реальні хвилі: зсув вершин
    vWorldPos = wp.xyz;

    vec4 mvPosition = viewMatrix * wp;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uSkyZenith;
  uniform vec3 uSkyHorizon;
  varying vec3 vWorldPos;
  varying vec2 vUv;
  #include <fog_pars_fragment>

  ${wavesGLSL}

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  void main() {
    // Форма озера: еліпс (площина вписана в нього)
    vec2 c = (vUv - 0.5) * 2.0;
    float r = length(c);
    if (r > 1.0) discard;

    // Нормаль з 6 хвиль (деталізація точніша за сітку)
    vec3 w = waveSum(vWorldPos.xz, uTime, 6);
    vec3 N = normalize(vec3(-w.y * 1.8, 1.0, -w.z * 1.8));
    vec3 V = normalize(cameraPosition - vWorldPos);
    vec3 R = reflect(-V, N);
    R.y = abs(R.y);

    // Френель: під пологим кутом вода дзеркальніша
    float fres = 0.12 + 0.88 * pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0);

    // Колір води: глибина по центру, мілководдя біля берега
    float shore = smoothstep(0.35, 1.0, r);
    vec3 body = mix(uDeep, uShallow, shore);
    body += uShallow * 0.12 * clamp(w.x * 4.0 + 0.5, 0.0, 1.0); // світліші гребені

    // Відображення неба
    vec3 skyRefl = mix(uSkyHorizon, uSkyZenith, pow(clamp(R.y, 0.0, 1.0), 0.5));
    vec3 col = mix(body, skyRefl, fres);

    // Відблиски сонця (значення > 1 -> їх підхопить Bloom)
    float sunDot = max(dot(R, uSunDir), 0.0);
    col += uSunColor * pow(sunDot, 220.0) * 3.0;
    col += uSunColor * pow(sunDot, 20.0) * 0.08;

    // Піна біля берега і на гребенях
    float n = noise(vWorldPos.xz * 2.5 + vec2(uTime * 0.15, -uTime * 0.10));
    float edge = r + (n - 0.5) * 0.06 + sin(r * 40.0 - uTime * 1.5) * 0.006;
    float foam = smoothstep(0.90, 0.97, edge);
    foam = max(foam, smoothstep(0.17, 0.25, w.x) * n * 0.6);
    col = mix(col, vec3(0.88, 0.94, 0.98), foam);

    // Прозорість: на мілководді видно пісок
    float alpha = mix(0.95, 0.75, shore);
    alpha = mix(alpha, 1.0, foam);
    alpha *= 1.0 - smoothstep(0.985, 1.0, r);

    gl_FragColor = vec4(col, alpha);
    #include <fog_fragment>
  }
`;

export function createWaterMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uTime: { value: 0 },
        uSunDir: { value: SUN_DIRECTION.clone() },
        uSunColor: { value: new THREE.Color(1.0, 0.95, 0.85) },
        uDeep: { value: new THREE.Color(0x0a3556) },
        uShallow: { value: new THREE.Color(0x2fa4b8) },
        uSkyZenith: { value: SKY_COLORS.zenith.clone() },
        uSkyHorizon: { value: SKY_COLORS.horizon.clone() }
      }
    ]),
    vertexShader,
    fragmentShader,
    transparent: true,
    fog: true
  });
}
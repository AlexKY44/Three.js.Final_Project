import * as THREE from 'three';

// Напрямок на сонце. Має збігатися з позицією dirLight у main.js (100, 80, -50)
export const SUN_DIRECTION = new THREE.Vector3(100, 80, -50).normalize();

// Спільні кольори неба: ними користується і небо, і відображення у воді, і туман
export const SKY_COLORS = {
  zenith: new THREE.Color(0x2f78c8),
  horizon: new THREE.Color(0x9bd0f2)
};

const vertexShader = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uSunDir;
  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  varying vec3 vDir;

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

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = p * 2.03 + vec2(17.0, 9.0);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec3 dir = normalize(vDir);
    float h = clamp(dir.y, 0.0, 1.0);

    // Градієнт неба: горизонт -> зеніт
    vec3 col = mix(uHorizon, uZenith, pow(h, 0.5));

    // Сяйво навколо сонця
    float sd = max(dot(dir, uSunDir), 0.0);
    col += vec3(1.0, 0.8, 0.5) * (pow(sd, 8.0) * 0.10 + pow(sd, 64.0) * 0.25);

    // Процедурні хмари (fbm), що повільно пливуть
    if (dir.y > 0.0) {
      vec2 cuv = dir.xz / (dir.y + 0.28) * 1.4 + vec2(uTime * 0.02, uTime * 0.008);
      float cl = fbm(cuv);
      float mask = smoothstep(0.52, 0.8, cl) * smoothstep(0.0, 0.25, dir.y);

      vec3 cloudCol = mix(vec3(0.80, 0.86, 0.95), vec3(0.96), smoothstep(0.55, 0.9, cl));
      cloudCol += vec3(1.0, 0.9, 0.7) * pow(sd, 6.0) * 0.10; // підсвітка з боку сонця

      col = mix(col, cloudCol, mask * 0.85);
    }

    gl_FragColor = vec4(col, 1.0);
  }
`;

export class SkyDome {
  constructor(scene, radius = 500) {
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSunDir: { value: SUN_DIRECTION.clone() },
        uZenith: { value: SKY_COLORS.zenith.clone() },
        uHorizon: { value: SKY_COLORS.horizon.clone() }
      },
      vertexShader,
      fragmentShader,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      fog: false
    });

    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 24), this.material);
    this.mesh.renderOrder = -1000;       // малюється першим
    this.mesh.frustumCulled = false;
    this.mesh.userData.noCollide = true; // камера не стикається з небом
    scene.add(this.mesh);
  }

  update() {
    this.material.uniforms.uTime.value = performance.now() * 0.001;
  }
}
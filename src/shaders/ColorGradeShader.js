import * as THREE from 'three';

// Кінцевий шейдер для всієї сцени: насиченість, контраст, тон, віньєтка, хроматична аберація
export const ColorGradeShader = {
  name: 'ColorGradeShader',

  uniforms: {
    tDiffuse: { value: null },
    uSaturation: { value: 1.15 },
    uContrast: { value: 1.08 },
    uVignette: { value: 0.35 },
    uAberration: { value: 0.003 },
    uTint: { value: new THREE.Color(1.03, 1.0, 0.96) } // легкий теплий відтінок
  },

  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uSaturation;
    uniform float uContrast;
    uniform float uVignette;
    uniform float uAberration;
    uniform vec3 uTint;
    varying vec2 vUv;

    void main() {
      vec2 c = vUv - 0.5;

      // Хроматична аберація: сильніша до країв кадру
      vec2 off = c * uAberration;
      float r = texture2D(tDiffuse, vUv + off).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv - off).b;
      vec3 col = vec3(r, g, b);

      // Насиченість
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, uSaturation);

      // Контраст навколо середнього сірого
      col = max((col - 0.18) * uContrast + 0.18, 0.0);

      col *= uTint;

      // Віньєтка
      col *= 1.0 - uVignette * smoothstep(0.35, 0.75, length(c));

      gl_FragColor = vec4(col, 1.0);
    }
  `
};
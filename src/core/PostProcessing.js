import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export class PostProcessing {
  constructor(renderer, scene, camera, options = {}) {
    const {
      strength = 0.7,   // сила свічення
      radius = 0.6,     // наскільки широко розтікається світло
      threshold = 1.0,  // світити буде тільки те, що яскравіше цього значення
      samples = 4       // MSAA, бо з composer стандартний antialias не працює
    } = options;

    const size = renderer.getSize(new THREE.Vector2());
    const pixelRatio = renderer.getPixelRatio();

    // HalfFloat потрібен, щоб зберігати яскравість більше 1.0 (HDR)
    const target = new THREE.WebGLRenderTarget(size.x, size.y, {
      type: THREE.HalfFloatType,
      samples
    });

    this.composer = new EffectComposer(renderer, target);
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(size.x, size.y);

    this.composer.addPass(new RenderPass(scene, camera));

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(size.x, size.y),
      strength,
      radius,
      threshold
    );
    this.composer.addPass(this.bloomPass);

    // Застосовує tone mapping та правильний колірний простір
    this.composer.addPass(new OutputPass());
  }

  render() {
    this.composer.render();
  }

  resize(width, height, pixelRatio) {
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(width, height);
    this.bloomPass.resolution.set(width, height);
  }
}
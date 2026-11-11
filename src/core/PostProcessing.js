import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ColorGradeShader } from '../shaders/ColorGradeShader.js';

export class PostProcessing {
  constructor(renderer, scene, camera, options = {}) {
    const {
      strength = 0.7,
      radius = 0.6,
      threshold = 1.0,
      samples = 4
    } = options;

    const size = renderer.getSize(new THREE.Vector2());
    const pixelRatio = renderer.getPixelRatio();

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

    // Власний шейдер кольорокорекції (до tone mapping)
    this.gradePass = new ShaderPass(ColorGradeShader);
    this.composer.addPass(this.gradePass);

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
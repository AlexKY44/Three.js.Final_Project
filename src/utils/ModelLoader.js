import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

export class ModelLoader {
  constructor() {
    this.loader = new FBXLoader();
  }

  load(path, scale = 0.01) {
    return new Promise((resolve, reject) => {
      this.loader.load(
        path,
        (object) => {
          object.scale.set(scale, scale, scale);
          object.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          resolve(object);
        },
        undefined,
        reject
      );
    });
  }
}
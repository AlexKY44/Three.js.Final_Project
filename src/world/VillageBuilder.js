import { ModelLoader } from '../utils/ModelLoader.js';
import { VILLAGE } from './villageLayout.js';

export class VillageBuilder {
  constructor(scene) {
    this.scene = scene;
    this.modelLoader = new ModelLoader();
    this.villageScale = VILLAGE.scale; // 0.010 (було 0.008)
  }

  async buildVillage() {
    const models = {};

    const loadModel = async (key, path) => {
      try {
        models[key] = await this.modelLoader.load(path, this.villageScale);
      } catch (err) {
        console.error(`Помилка завантаження ${path}:`, err);
      }
    };

    await Promise.all([
      loadModel('bellTower', '/models/cityBuilding/village/Bell_Tower.fbx'),
      loadModel('blacksmith', '/models/cityBuilding/village/Blacksmith.fbx'),
      loadModel('h1', '/models/cityBuilding/village/House_1.fbx'),
      loadModel('h2', '/models/cityBuilding/village/House_2.fbx'),
      loadModel('h3', '/models/cityBuilding/village/House_3.fbx'),
      loadModel('h4', '/models/cityBuilding/village/House_4.fbx'),
      loadModel('inn', '/models/cityBuilding/village/Inn.fbx'),
      loadModel('mill', '/models/cityBuilding/village/Mill.fbx'),
      loadModel('sawmill', '/models/cityBuilding/village/Sawmill.fbx'),
      loadModel('stable', '/models/cityBuilding/village/Stable.fbx')
    ]);

    const place = (key, x, z, rotY = 0) => {
      if (!models[key]) return;
      const clone = models[key].clone();
      clone.position.set(x, 0, z);
      clone.rotation.y = rotY;

      clone.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      this.scene.add(clone);
    };

    VILLAGE.buildings.forEach((b, i) => {
      const x = VILLAGE.x + b.dx;
      const z = VILLAGE.z + b.side * VILLAGE.rowOffset;

      // Північний ряд дивиться на південь (+Z), південний — на північ (-Z)
      const facing = b.side === -1 ? 0 : Math.PI;

      // Невеликий детермінований поворот, щоб село не виглядало як лінійка
      const jitter = ((i * 37) % 7 - 3) * 0.02;

      place(b.key, x, z, facing + VILLAGE.facingOffset + jitter);
    });
  }
}
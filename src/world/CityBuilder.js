import * as THREE from 'three';
import { ModelLoader } from '../utils/ModelLoader.js';

export class CityBuilder {
  constructor(scene) {
    this.scene = scene;
    this.modelLoader = new ModelLoader();
  }

  async buildStreet() {
    const models = {};

    const loadModel = async (key, path) => {
      try {
        models[key] = await this.modelLoader.load(path);
      } catch (err) {
        console.error(`Помилка завантаження ${path}:`, err);
      }
    };

    // 1. Завантаження базових моделей
    await Promise.all([
      loadModel('road4Way', '/models/cityBuilding/roads/Street_4Way.fbx'),
      loadModel('roadStraight', '/models/cityBuilding/roads/Street_Straight.fbx'),

      loadModel('b1Large', '/models/cityBuilding/Building1_Large.fbx'),
      loadModel('b1Small', '/models/cityBuilding/Building1_Small.fbx'),
      loadModel('b2Large', '/models/cityBuilding/Building2_Large.fbx'),
      loadModel('b2Small', '/models/cityBuilding/Building2_Small.fbx'),
      loadModel('b3Big', '/models/cityBuilding/Building3_Big.fbx'),
      loadModel('b3Small', '/models/cityBuilding/Building3_Small.fbx'),
      loadModel('b4', '/models/cityBuilding/Building4.fbx')
    ]);

    const place = (key, x, z, rotY = 0) => {
      if (!models[key]) return;
      const clone = models[key].clone();
      clone.position.set(x, 0, z);
      clone.rotation.y = rotY;
      this.scene.add(clone);
      return clone;
    };

    // 2. Обчислення точного розміру плитки дороги
    const roadBox = new THREE.Box3().setFromObject(models.road4Way);
    const step = roadBox.max.x - roadBox.min.x;

    // Побудова 3-х суцільних кварталів підряд в один великий мегаполіс
    const blockTilesW = 6; 
    const numBlocks = 3; 
    const totalTilesW = blockTilesW * numBlocks; 

    const startX = -(totalTilesW * step) / 2;
    const zNorth = -7.0;
    const zSouth = 7.0;


    const intersectionIndices = [];
    for (let b = 0; b <= numBlocks; b++) {
      intersectionIndices.push(b * blockTilesW);
    }

    // 3. СУЦІЛЬНА СІТКА ДОРІГ (без жодних прогалин)
    for (let i = 0; i <= totalTilesW; i++) {
      const x = startX + i * step;
      const isIntersection = intersectionIndices.includes(i);

      if (isIntersection) {
        // Спільне перехрестя 4-Way
        place('road4Way', x, zNorth);
        place('road4Way', x, zSouth);

        // Поперечна дорога по Z між перехрестями
        for (let z = zNorth + step; z < zSouth - 0.1; z += step) {
          place('roadStraight', x, z, Math.PI / 2);
        }
      } else {
        // Пряма горизонтальна дорога по X
        place('roadStraight', x, zNorth, 0);
        place('roadStraight', x, zSouth, 0);
      }
    }

    // 4. ЗАПОВНЕННЯ ВСІХ 3-Х КВАРТАЛІВ БУДІВЛЯМИ
    for (let b = 0; b < numBlocks; b++) {
      const bStartX = startX + b * blockTilesW * step;
      const bEndX = bStartX + blockTilesW * step;
      const bCenterX = (bStartX + bEndX) / 2;

      // --- Внутрішній двір кварталу ---
      place('b1Large', bCenterX - 2.8, zNorth + 2.8, Math.PI);
      place('b2Small', bCenterX + 2.8, zNorth + 2.8, Math.PI);

      place('b2Large', bCenterX - 2.8, zSouth - 2.8, 0);
      place('b1Small', bCenterX + 2.8, zSouth - 2.8, 0);

      place('b3Big', bStartX + 2.8, 0, -Math.PI / 2);
      place('b4', bEndX - 2.8, 0, Math.PI / 2);

      place('b1Large', bCenterX - 2.5, zNorth - 3.2, 0);
      place('b4', bCenterX + 3.0, zNorth - 3.2, 0);

      place('b2Large', bCenterX - 2.5, zSouth + 3.2, Math.PI);
      place('b1Small', bCenterX + 3.0, zSouth + 3.2, Math.PI);
    }
  }
}
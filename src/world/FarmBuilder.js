import * as THREE from 'three';
import { ModelLoader } from '../utils/ModelLoader.js';

export class FarmBuilder {
  constructor(scene) {
    this.scene = scene;
    this.modelLoader = new ModelLoader();

    this.animatedFarmObjects = [];
  }

  async buildFarm() {
    const models = {};

    const loadModel = async (key, path) => {
      try {
        models[key] = await this.modelLoader.load(path);
      } catch (err) {
        console.error(`Помилка завантаження ${path}:`, err);
      }
    };

    await Promise.all([
      loadModel('barn', '/models/cityBuilding/farm/Barn.fbx'),
      loadModel('bigBarn', '/models/cityBuilding/farm/BigBarn.fbx'),
      loadModel('smallBarn', '/models/cityBuilding/farm/SmallBarn.fbx'),
      loadModel('openBarn', '/models/cityBuilding/farm/OpenBarn.fbx'),
      loadModel('silo', '/models/cityBuilding/farm/Silo.fbx'),
      loadModel('windmill', '/models/cityBuilding/farm/Windmill.fbx'),
      loadModel('towerWindmill', '/models/cityBuilding/farm/TowerWindmill.fbx'),
      loadModel('waterTower', '/models/cityBuilding/farm/WaterTower.fbx'),
      loadModel('chickenCoop', '/models/cityBuilding/farm/ChickenCoop.fbx'),
      loadModel('well', '/models/cityBuilding/farm/Well.fbx')
    ]);

    const place = (key, x, z, rotY = 0) => {
      if (!models[key]) return null;
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
      clone.updateMatrixWorld(true); // потрібно, щоб Box3 рахувався вже з позицією/поворотом
      return clone;
    };

    /**
     * @param model      модель
     * @param speed      швидкість обертання
     * @param options.isWindVane  чи хитати весь корпус від вітру
     * @param options.axis        вісь обертання лопатей: 'z' (як у вітрогенератора), 'x' або 'y'
     * @param options.direction   -1 = за годинниковою, 1 = проти (якщо крутиться не в той бік — змініть знак)
     */
    const attachPivotAndAnimate = (model, speed, options = {}) => {
      if (!model) return;

      const { isWindVane = false, axis = 'z', direction = -1 } = options;

      let blades = null;
      const meshes = [];

      model.traverse((child) => {
        if (child.isMesh) {
          meshes.push(child);
          const name = child.name.toLowerCase();
          if (
            name.includes('blade') ||
            name.includes('fan') ||
            name.includes('propeller') ||
            name.includes('rotor') ||
            name.includes('wing') ||
            name.includes('sail') ||
            name.includes('wheel')
          ) {
            blades = child;
          }
        }
      });

      // Якщо за назвою не знайшли — беремо найвищий меш
      if (!blades && meshes.length > 1) {
        blades = meshes.reduce((highest, mesh) => {
          const box = new THREE.Box3().setFromObject(mesh);
          const highestBox = new THREE.Box3().setFromObject(highest);
          return box.max.y > highestBox.max.y ? mesh : highest;
        }, meshes[0]);
      }

      // Корисно для налагодження: видно, які меші є в моделі і який вибрано
      console.log(
        'Меші моделі:', meshes.map((m) => m.name),
        '| Вибрані лопаті:', blades ? blades.name : null
      );

      const baseRotY = model.rotation.y;

      if (blades && blades !== model) {
        const parent = blades.parent;

        // Центр лопатей у світових координатах -> у локальні координати батька
        const worldCenter = new THREE.Box3().setFromObject(blades).getCenter(new THREE.Vector3());
        const localCenter = parent.worldToLocal(worldCenter.clone());

        // Pivot ставимо рівно в центр лопатей (у втулку)
        const pivotGroup = new THREE.Group();
        pivotGroup.position.copy(localCenter);
        parent.add(pivotGroup);
        pivotGroup.updateMatrixWorld(true);

        // attach зберігає світову позицію/поворот/масштаб лопатей,
        // тож візуально нічого не зсувається, а обертання йде навколо центру
        pivotGroup.attach(blades);

        this.animatedFarmObjects.push({
          pivot: pivotGroup,
          obj: model,
          baseRotY,
          speed,
          axis,
          direction,
          isWindVane
        });
      } else if (isWindVane) {
        this.animatedFarmObjects.push({
          obj: model,
          baseRotY,
          isWindVane: true
        });
      }
    };

    // --- РОЗСТАНОВКА МОДЕЛЕЙ ---

    // 1. Великий млин
    const towerWindmill = place('towerWindmill', 18, -38, Math.PI / 4);
    attachPivotAndAnimate(towerWindmill, 1.0, { isWindVane: false });

    // 2. Насосний вітряк (показує вітер і крутить лопаті)
    const windmill = place('windmill', 18, -48, Math.PI / 3);
    attachPivotAndAnimate(windmill, 1.8, { isWindVane: true });

    // Інші будівлі
    place('bigBarn', 35, -23, 0);
    place('openBarn', 55, -28, -Math.PI / 2);
    place('barn', 48, -14, 0);
    place('smallBarn', 24, -20, Math.PI / 3);
    place('chickenCoop', 28, -14, -Math.PI / 6);
    place('well', 31, -17, 0);
    place('silo', 43, -52, 0);
    place('silo', 47, -52, 0);
    place('waterTower', 38, -50, 0);
  }

  update() {
    const time = Date.now() * 0.001;

    this.animatedFarmObjects.forEach((item) => {
      if (item.pivot) {
        // Вертикальне обертання лопатей навколо втулки
        item.pivot.rotation[item.axis] += 0.03 * item.speed * item.direction;
      }

      if (item.isWindVane && item.obj) {
        // Корпус плавно хитається від вітру навколо початкового повороту
        item.obj.rotation.y = item.baseRotY + Math.sin(time * 1.5) * 0.4;
      }
    });
  }
}
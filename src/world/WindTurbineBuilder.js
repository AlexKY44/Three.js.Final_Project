import * as THREE from 'three';
import { ModelLoader } from '../utils/ModelLoader.js';

export class WindTurbineBuilder {
  constructor(scene) {
    this.scene = scene;
    this.modelLoader = new ModelLoader();
    this.turbines = []; // Зберігаємо тільки деталі лопатей
  }

  async buildWindTurbines() {
    let baseModel = null;
    try {
      baseModel = await this.modelLoader.load('/models/cityBuilding/windTurbine/windTurbine1.fbx', 0.0008);
    } catch (err) {
      console.error('Помилка завантаження windTurbine1.fbx:', err);
      return;
    }

    const positions = [
      { x: -45, z: -45 },
      { x: -32, z: -48 },
      { x: -48, z: -32 },
      { x: -35, z: -35 },
      { x: -22, z: -42 }
    ];

    positions.forEach((pos, index) => {
      const turbine = baseModel.clone();

      turbine.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      turbine.position.set(pos.x, 0, pos.z);
      turbine.rotation.y = index * 0.5; 

      this.scene.add(turbine);

      let blades = null;
      const meshes = [];

      turbine.traverse((child) => {
        if (child.isMesh) {
          meshes.push(child);
          const name = child.name.toLowerCase();
          if (
            name.includes('blade') ||
            name.includes('fan') ||
            name.includes('propeller') ||
            name.includes('rotor') ||
            name.includes('wing') ||
            name.includes('head')
          ) {
            blades = child;
          }
        }
      });

      if (!blades && meshes.length > 1) {
        blades = meshes.reduce((highest, mesh) => {
          const box = new THREE.Box3().setFromObject(mesh);
          const highestBox = new THREE.Box3().setFromObject(highest);
          return box.max.y > highestBox.max.y ? mesh : highest;
        }, meshes[0]);
      }

      // Створюємо pivot-групу, щоб лопаті кружляли навколо точки кріплення
      if (blades && blades !== turbine) {
        const parent = blades.parent;
        const pivotGroup = new THREE.Group();

        // Pivot ставимо туди, де зараз стоять лопаті (у координатах батька)
        pivotGroup.position.copy(blades.position);

        // Переносимо лопаті в pivot-групу, обнуляючи їхню позицію
        parent.add(pivotGroup);
        parent.remove(blades);
        blades.position.set(0, 0, 0);
        pivotGroup.add(blades);

        this.turbines.push({
          pivot: pivotGroup,
          speed: 1.2 + index * 0.2
        });
      }
    });
  }

  update() {
    this.turbines.forEach((item) => {
      if (item.pivot) {
        // Обертаємо pivot-групу — лопаті кружляють навколо точки кріплення
        item.pivot.rotation.z += 0.03 * item.speed;
      }
    });
  }
}
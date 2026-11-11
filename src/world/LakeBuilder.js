import * as THREE from 'three';
import { ModelLoader } from '../utils/ModelLoader.js';
import { createWaterMaterial } from '../shaders/WaterShader.js';

export class LakeBuilder {
  constructor(scene) {
    this.scene = scene;
    this.water = null;
    this.modelLoader = new ModelLoader();

    this.ships = []; // { obj, phase, amp } — усі кораблі, що гойдаються на хвилях

    this.animatedObjects = {
      shark: null,
      sharky: null,
      tentacle: null
    };
  }

  async buildLake() {
    const radiusX = 25;
    const radiusZ = 20;
    const segments = 64;

    // --- ПІЩАНИЙ ПЛЯЖ ---
    const beachRadiusX = 29;
    const beachRadiusZ = 24;
    const beachGeometry = new THREE.CircleGeometry(1, segments);
    const beachPosAttr = beachGeometry.attributes.position;
    for (let i = 0; i < beachPosAttr.count; i++) {
      beachPosAttr.setX(i, beachPosAttr.getX(i) * beachRadiusX);
      beachPosAttr.setY(i, beachPosAttr.getY(i) * beachRadiusZ);
    }
    beachPosAttr.needsUpdate = true;
    beachGeometry.computeBoundingSphere();

    const sandMaterial = new THREE.MeshStandardMaterial({
      color: 0xe3cca1,
      roughness: 1.0,
      flatShading: true
    });
    const beach = new THREE.Mesh(beachGeometry, sandMaterial);
    beach.rotation.x = -Math.PI / 2;
    beach.position.set(42, 0.05, 45);
    beach.receiveShadow = true;
    this.scene.add(beach);

    // --- ВОДА: власний шейдер ---
    // Використовуємо густу PlaneGeometry (а не CircleGeometry), бо хвилі зміщують вершини,
    // а в CircleGeometry немає вершин усередині. Форма озера вирізається в шейдері (discard).
    const waterGeometry = new THREE.PlaneGeometry(radiusX * 2, radiusZ * 2, 128, 102);
    this.water = new THREE.Mesh(waterGeometry, createWaterMaterial());
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.set(42, 0.1, 45);
    this.water.userData.noCollide = true;
    this.scene.add(this.water);

    // --- ЗАВАНТАЖЕННЯ МОРСЬКИХ МОДЕЛЕЙ ---
    const loadModel = async (path, scale) => {
      try {
        return await this.modelLoader.load(path, scale);
      } catch (err) {
        console.error(`Помилка завантаження ${path}:`, err);
        return null;
      }
    };

    const [ship, shipSmall, shark, sharky, tentacle, skeleton, skeletonHeadless, cliff1, cliff2, cliff3, cliff4] = await Promise.all([
      loadModel('/models/cityBuilding/sea/Ship_Large.fbx', 0.0042),   // було 0.003
      loadModel('/models/cityBuilding/sea/Ship_Small.fbx', 0.0042),   // було 0.003
      loadModel('/models/cityBuilding/sea/Characters_Shark.fbx', 0.0028),  // було 0.002
      loadModel('/models/cityBuilding/sea/Characters_Sharky.fbx', 0.0025), // було 0.0018
      loadModel('/models/cityBuilding/sea/Characters_Tentacle.fbx', 0.004),
      loadModel('/models/cityBuilding/sea/Characters_Skeleton.fbx', 0.002),
      loadModel('/models/cityBuilding/sea/Characters_Skeleton_Headless.fbx', 0.002),
      loadModel('/models/cityBuilding/sea/Environment_Cliff1.fbx', 0.005),
      loadModel('/models/cityBuilding/sea/Environment_Cliff2.fbx', 0.005),
      loadModel('/models/cityBuilding/sea/Environment_Cliff3.fbx', 0.004),
      loadModel('/models/cityBuilding/sea/Environment_Cliff4.fbx', 0.004)
    ]);

    // Розстановка та автоматичне фарбування
    const placeAndColor = (model, colorHex, x, y, z, rotY = 0) => {
      if (!model) return;

      model.traverse((child) => {
        if (child.isMesh) {
          child.material = new THREE.MeshStandardMaterial({
            color: colorHex,
            roughness: 0.8,
            flatShading: true
          });
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      model.position.set(x, y, z);
      model.rotation.y = rotY;
      this.scene.add(model);
    };

    const addShip = (model, color, x, z, rotY, phase, amp) => {
      if (!model) return;
      placeAndColor(model, color, x, 0.08, z, rotY);
      this.ships.push({ obj: model, phase, amp });
    };

    // --- Кораблі (2 старих + 2 нових клони) ---
    addShip(ship,                              0x8b5a2b, 42, 45, Math.PI / 4,      0.0, 0.20);
    addShip(shipSmall,                         0x6b4423, 34, 50, -Math.PI / 6,     1.0, 0.15);
    if (ship)      addShip(ship.clone(),       0x7a4a24, 33, 39, Math.PI / 1.7,    2.1, 0.18); // новий великий
    if (shipSmall) addShip(shipSmall.clone(),  0x5c3a1e, 49, 52, -Math.PI / 3,     3.4, 0.14); // новий малий

    // --- Акули ---
    if (shark) {
      this.animatedObjects.shark = shark;
      placeAndColor(shark, 0x4a5d6e, 42, 0.08, 45, 0);
    }
    if (sharky) {
      this.animatedObjects.sharky = sharky;
      placeAndColor(sharky, 0x3a4d5e, 48, 0.08, 40, Math.PI / 2);
    }

    // --- Щупальце ---
    if (tentacle) {
      this.animatedObjects.tentacle = tentacle;
      placeAndColor(tentacle, 0x5a185c, 52, 0.0, 50, 0);
    }

    // --- Скелі по краях озера ---
    if (cliff1) placeAndColor(cliff1, 0x7a7a7a, 22, 0.05, 35, Math.PI / 2);
    if (cliff2) placeAndColor(cliff2, 0x6e6e6e, 55, 0.05, 55, -Math.PI / 3);
    if (cliff3) placeAndColor(cliff3, 0x858585, 28, 0.05, 52, Math.PI);
    if (cliff4) placeAndColor(cliff4, 0x707070, 50, 0.05, 35, Math.PI / 4);

    // --- Скелети на скелях ---
    if (skeleton && cliff1) placeAndColor(skeleton, 0xe0d6c8, 25, 0.1, 38, -Math.PI / 3);
    if (skeletonHeadless && cliff2) placeAndColor(skeletonHeadless, 0xd4c8b0, 53, 0.1, 53, Math.PI / 4);
  }

  update() {
    const time = Date.now() * 0.001;

    // Час для шейдера: маленьке число, щоб не втрачати точність у float
    if (this.water) {
      this.water.material.uniforms.uTime.value = performance.now() * 0.001;
    }

    // Кораблі гойдаються на хвилях (кожен зі своєю фазою)
    for (const s of this.ships) {
      s.obj.position.y = 0.08 + Math.sin(time * 2.0 + s.phase) * s.amp;
      s.obj.rotation.z = Math.sin(time * 1.5 + s.phase * 0.7) * 0.05;
      s.obj.rotation.x = Math.cos(time * 1.2 + s.phase * 1.3) * 0.03;
    }

    // Перша акула — кружляє навколо центру озера
    if (this.animatedObjects.shark) {
      const orbitRadius = 8;
      const speed = time * 0.8;

      this.animatedObjects.shark.position.x = 42 + Math.cos(speed) * orbitRadius;
      this.animatedObjects.shark.position.z = 45 + Math.sin(speed) * orbitRadius;
      this.animatedObjects.shark.position.y = 0.05 + Math.sin(time * 4) * 0.2;
      this.animatedObjects.shark.rotation.y = -speed;
    }

    // Друга акула — у протилежному напрямку, менша орбіта
    if (this.animatedObjects.sharky) {
      const orbitRadius = 6;
      const speed = time * 0.6;

      this.animatedObjects.sharky.position.x = 40 + Math.cos(-speed + Math.PI) * orbitRadius;
      this.animatedObjects.sharky.position.z = 48 + Math.sin(-speed + Math.PI) * orbitRadius;
      this.animatedObjects.sharky.position.y = 0.05 + Math.sin(time * 3.5 + 1.0) * 0.15;
      this.animatedObjects.sharky.rotation.y = speed;
    }

    // Щупальце ворушиться
    if (this.animatedObjects.tentacle) {
      this.animatedObjects.tentacle.rotation.z = Math.sin(time * 3.0) * 0.25;
      this.animatedObjects.tentacle.rotation.x = Math.cos(time * 2.0) * 0.15;
    }
  }
}
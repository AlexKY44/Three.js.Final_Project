import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { ModelLoader } from '../utils/ModelLoader.js';

export class LakeBuilder {
  constructor(scene) {
    this.scene = scene;
    this.water = null;
    this.modelLoader = new ModelLoader();
    
    this.animatedObjects = {
      ship: null,
      shipSmall: null,
      shark: null,
      sharky: null,
      tentacle: null
    };
  }

  async buildLake() {
    const radiusX = 25;
    const radiusZ = 20;
    const segments = 64;

    // ПІЩАНИЙ ПЛЯЖ 
    const beachRadiusX = 29; 
    const beachRadiusZ = 24; 
    const beachGeometry = new THREE.CircleGeometry(1, segments);
    const beachPosAttr = beachGeometry.attributes.position;
    for (let i = 0; i < beachPosAttr.count; i++) {
      const x = beachPosAttr.getX(i);
      const y = beachPosAttr.getY(i);
      beachPosAttr.setX(i, x * beachRadiusX);
      beachPosAttr.setY(i, y * beachRadiusZ);
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

    // --- 2. ВОДА (ОЗЕРО) ---
    const waterGeometry = new THREE.CircleGeometry(1, segments);
    const posAttr = waterGeometry.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      posAttr.setX(i, x * radiusX);
      posAttr.setY(i, y * radiusZ);
    }
    posAttr.needsUpdate = true;
    waterGeometry.computeBoundingSphere();

    this.water = new Water(
      waterGeometry,
      {
        textureWidth: 512,
        textureHeight: 512,
        waterNormals: new THREE.TextureLoader().load(
          'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/waternormals.jpg',
          function (texture) {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
          }
        ),
        sunDirection: new THREE.Vector3(40, 80, 50).normalize(),
        sunColor: 0xffffff,
        waterColor: 0x00456e,
        distortionScale: 3.7,
        fog: this.scene.fog !== undefined
      }
    );

    this.water.rotation.x = -Math.PI / 2;
    this.water.position.set(42, 0.08, 45);
    this.scene.add(this.water);

    //  ЗАВАНТАЖЕННЯ МОРСЬКИХ МОДЕЛЕЙ 
    const loadModel = async (path, scale) => {
      try {
        const model = await this.modelLoader.load(path, scale);
        return model;
      } catch (err) {
        console.error(`Помилка завантаження ${path}:`, err);
        return null;
      }
    };

    // Зменшені значення scale (в 3-4 рази менші за попередні)
    const [ship, shipSmall, shark, sharky, tentacle, skeleton, skeletonHeadless, cliff1, cliff2, cliff3, cliff4] = await Promise.all([
      loadModel('/models/cityBuilding/sea/Ship_Large.fbx', 0.003),
      loadModel('/models/cityBuilding/sea/Ship_Small.fbx', 0.003),
      loadModel('/models/cityBuilding/sea/Characters_Shark.fbx', 0.002),
      loadModel('/models/cityBuilding/sea/Characters_Sharky.fbx', 0.0018),
      loadModel('/models/cityBuilding/sea/Characters_Tentacle.fbx', 0.004),
      loadModel('/models/cityBuilding/sea/Characters_Skeleton.fbx', 0.002),
      loadModel('/models/cityBuilding/sea/Characters_Skeleton_Headless.fbx', 0.002),
      loadModel('/models/cityBuilding/sea/Environment_Cliff1.fbx', 0.005),
      loadModel('/models/cityBuilding/sea/Environment_Cliff2.fbx', 0.005),
      loadModel('/models/cityBuilding/sea/Environment_Cliff3.fbx', 0.004),
      loadModel('/models/cityBuilding/sea/Environment_Cliff4.fbx', 0.004)
    ]);

    // Функція для розстановки та автоматичного фарбування
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

    // --- Великий корабель (центр озера) ---
    if (ship) {
      this.animatedObjects.ship = ship;
      placeAndColor(ship, 0x8b5a2b, 42, 0.08, 45, Math.PI / 4);
    }

    // --- Маленький корабель (лівіше від великого) ---
    if (shipSmall) {
      this.animatedObjects.shipSmall = shipSmall;
      placeAndColor(shipSmall, 0x6b4423, 34, 0.08, 50, -Math.PI / 6);
    }
    
    // --- Акула (плаває навколо центру озера) ---
    if (shark) {
      this.animatedObjects.shark = shark;
      placeAndColor(shark, 0x4a5d6e, 42, 0.08, 45, 0);
    }

    if (sharky) {
      this.animatedObjects.sharky = sharky;
      placeAndColor(sharky, 0x3a4d5e, 48, 0.08, 40, Math.PI / 2);
    }

    // --- Щупальце (виглядає з води) ---
    if (tentacle) {
      this.animatedObjects.tentacle = tentacle;
      placeAndColor(tentacle, 0x5a185c, 52, 0.0, 50, 0);
    }

    //  Скелі по краях озера 
    if (cliff1) {
      placeAndColor(cliff1, 0x7a7a7a, 22, 0.05, 35, Math.PI / 2);
    }
    if (cliff2) {
      placeAndColor(cliff2, 0x6e6e6e, 55, 0.05, 55, -Math.PI / 3);
    }
    if (cliff3) {
      placeAndColor(cliff3, 0x858585, 28, 0.05, 52, Math.PI);
    }
    if (cliff4) {
      placeAndColor(cliff4, 0x707070, 50, 0.05, 35, Math.PI / 4);
    }

    // --- Скелет на скелі ---
    if (skeleton && cliff1) {
      placeAndColor(skeleton, 0xe0d6c8, 25, 0.1, 38, -Math.PI / 3);
    }

    // --- Безголовий скелет на іншій скелі ---
    if (skeletonHeadless && cliff2) {
      placeAndColor(skeletonHeadless, 0xd4c8b0, 53, 0.1, 53, Math.PI / 4);
    }
  }

  update() {
    const time = Date.now() * 0.001; 

    if (this.water) {
      this.water.material.uniforms['time'].value += 1.0 / 60.0;
    }

    // Великий корабель — хитається на хвилях
    if (this.animatedObjects.ship) {
      this.animatedObjects.ship.position.y = 0.08 + Math.sin(time * 2.0) * 0.2; 
      this.animatedObjects.ship.rotation.z = Math.sin(time * 1.5) * 0.05;       
      this.animatedObjects.ship.rotation.x = Math.cos(time * 1.2) * 0.03;       
    }

    // Маленький корабель — теж хитається, але з іншою фазою
    if (this.animatedObjects.shipSmall) {
      this.animatedObjects.shipSmall.position.y = 0.08 + Math.sin(time * 2.5 + 1.0) * 0.15;
      this.animatedObjects.shipSmall.rotation.z = Math.sin(time * 1.8 + 0.5) * 0.04;
      this.animatedObjects.shipSmall.rotation.x = Math.cos(time * 1.4 + 0.8) * 0.025;
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

    // Друга акула — кружляє в протилежному напрямку, менша орбіта
    if (this.animatedObjects.sharky) {
      const orbitRadius = 6;
      const speed = time * 0.6;

      this.animatedObjects.sharky.position.x = 40 + Math.cos(-speed + Math.PI) * orbitRadius;
      this.animatedObjects.sharky.position.z = 48 + Math.sin(-speed + Math.PI) * orbitRadius;
      this.animatedObjects.sharky.position.y = 0.05 + Math.sin(time * 3.5 + 1.0) * 0.15;

      this.animatedObjects.sharky.rotation.y = speed;
    }

    // Щупальце — ворушиться
    if (this.animatedObjects.tentacle) {
      this.animatedObjects.tentacle.rotation.z = Math.sin(time * 3.0) * 0.25;
      this.animatedObjects.tentacle.rotation.x = Math.cos(time * 2.0) * 0.15;
    }
  }
}
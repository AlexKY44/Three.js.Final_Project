import * as THREE from 'three';
import { ModelLoader } from '../utils/ModelLoader.js';
import { VILLAGE } from './villageLayout.js';

export class RoadNetwork {
  constructor(scene) {
    this.scene = scene;
    this.modelLoader = new ModelLoader();

    this.dirtMaterial = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.9 });
    this.streetMaterial = new THREE.MeshStandardMaterial({ color: 0x9a8366, roughness: 0.95 });
    this.edgeMaterial = new THREE.MeshStandardMaterial({ color: 0x6f5b43, roughness: 1 });
    this.plazaMaterial = new THREE.MeshStandardMaterial({ color: 0xa89f91, roughness: 0.9 });
  }

  // Плоский прямокутник на землі: sx — розмір по X, sz — розмір по Z
  _strip(material, cx, cz, sx, sz, y) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(cx, y, cz);
    mesh.receiveShadow = true;
    mesh.userData.noCollide = true;
    this.scene.add(mesh);
    return mesh;
  }

  _plaza(material, cx, cz, radius, y) {
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 32), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(cx, y, cz);
    mesh.receiveShadow = true;
    mesh.userData.noCollide = true;
    this.scene.add(mesh);
  }

  async buildPaths() {
    let cityRoadTemplate, lowpolyRoadTemplate;

    try {
      [cityRoadTemplate, lowpolyRoadTemplate] = await Promise.all([
        this.modelLoader.load('/models/cityBuilding/roads/Street_4Way.fbx'),
        this.modelLoader.load('/models/cityBuilding/roads/Lowpoly Road01.fbx')
      ]);
    } catch (err) {
      console.error('Помилка завантаження моделей доріг:', err);
      return;
    }

    // 1. ТОЧНИЙ РОЗРАХУНОК МЕЖ МІСТА (ідентично до CityBuilder.js)
    const cityBox = new THREE.Box3().setFromObject(cityRoadTemplate);
    const cityStep = cityBox.max.x - cityBox.min.x;

    const blockTilesW = 6;
    const numBlocks = 3;
    const totalTilesW = blockTilesW * numBlocks;

    const cityStartX = -(totalTilesW * cityStep) / 2;
    const cityEndX = (totalTilesW * cityStep) / 2;

    const cityLeftEdgeX = cityStartX - cityStep / 2;
    const cityRightEdgeX = cityEndX + cityStep / 2;

    // 2. ГАБАРИТИ ДОРОГИ LOWPOLY ROAD
    const roadBox = new THREE.Box3().setFromObject(lowpolyRoadTemplate);
    const roadLength = roadBox.max.x - roadBox.min.x || 2.0;

    const placeSegment = (x, z) => {
      const clone = lowpolyRoadTemplate.clone();
      clone.position.set(x, 0.1, z);
      clone.rotation.y = 0;
      this.scene.add(clone);
    };

    const zLine = -7.0; // вісь Z північної вулиці

    // 3. ЛІВА ЧАСТИНА: від краю міста до межі карти (-60)
    const firstLeftCenterX = cityLeftEdgeX - roadLength / 2;
    for (let x = firstLeftCenterX; x >= -60; x -= roadLength) {
      placeSegment(x, zLine);
    }

    // 4. ПРАВА ЧАСТИНА: від краю міста до межі карти (60)
    const firstRightCenterX = cityRightEdgeX + roadLength / 2;
    for (let x = firstRightCenterX; x <= 60; x += roadLength) {
      placeSegment(x, zLine);
    }

    // 5. ДОРОГИ В СЕЛІ
    this._buildVillageRoads(zLine);

    // 6. СТЕЖКИ НА ФЕРМІ (без змін)
    const createDirtPath = (material, x, z, width, length, rotY) => {
      const path = new THREE.Mesh(new THREE.PlaneGeometry(width, length), material);
      path.rotation.x = -Math.PI / 2;
      path.rotation.z = rotY;
      path.position.set(x, 0.04, z);
      path.receiveShadow = true;
      this.scene.add(path);
    };

    const fX = 35;
    const fZ = -25;
    createDirtPath(this.dirtMaterial, fX + 2, fZ + 5, 2.0, 20, 0);
    createDirtPath(this.dirtMaterial, fX - 5, fZ + 8, 1.5, 15, Math.PI / 4);
    createDirtPath(this.dirtMaterial, fX + 8, fZ - 2, 1.5, 12, -Math.PI / 6);
  }

  _buildVillageRoads(mainRoadZ) {
    const { x: vX, z: vZ, rowOffset, street, connectorDx } = VILLAGE;

    const streetLen = street.halfLength * 2;
    const half = street.width / 2;

    // Головна вулиця: темна облямівка знизу + світліше полотно зверху
    this._strip(this.edgeMaterial, vX, vZ, streetLen + 0.6, street.width + 0.6, 0.035);
    this._strip(this.streetMaterial, vX, vZ, streetLen, street.width, 0.04);

    // Площа біля дзвіниці та корчми
    this._plaza(this.plazaMaterial, vX, vZ, 4.2, 0.045);

    // Доріжки від кожного будинку до вулиці
    const pathStart = half;           // край вулиці
    const pathEnd = rowOffset - 2.6;  // приблизно до дверей
    const pathLen = pathEnd - pathStart;

    VILLAGE.buildings.forEach((b) => {
      const cx = vX + b.dx;
      const cz = vZ + b.side * (pathStart + pathLen / 2);
      this._strip(this.streetMaterial, cx, cz, 1.4, pathLen, 0.042);
    });

    // З'єднання з великою дорогою (z = -7) на північ від села
    const connX = vX + connectorDx;
    const connLen = vZ - mainRoadZ;
    this._strip(this.edgeMaterial, connX, (vZ + mainRoadZ) / 2, 3.6, connLen, 0.035);
    this._strip(this.streetMaterial, connX, (vZ + mainRoadZ) / 2, 3, connLen, 0.04);
  }
}
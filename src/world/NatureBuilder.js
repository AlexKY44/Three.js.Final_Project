import * as THREE from 'three';
import { ModelLoader } from '../utils/ModelLoader.js';
import { TreeFactory } from './TreeFactory.js';

const rand = (a, b) => a + Math.random() * (b - a);

export class NatureBuilder {
  constructor(scene) {
    this.scene = scene;
    this.modelLoader = new ModelLoader();
    this.treeFactory = new TreeFactory();
    this.placed = []; // вже зайняті точки, щоб дерева не росли одне в одному

    this.exclusionZones = [
      { x: 0,   z: 0,   rx: 32, rz: 17 },
      { x: 0,   z: -7,  rx: 60, rz: 4  },
      { x: 35,  z: -30, rx: 22, rz: 22 },
      { x: -35, z: 27,  rx: 16, rz: 14 },
      { x: 42,  z: 45,  rx: 30, rz: 25 },
      { x: -37, z: -42, rx: 18, rz: 12 },
    ];

    // Налаштування розфарбовування завантажених (FBX) дерев
    this.trunkMaxHeightRatio = 0.4;  // стовбур = нижні 40% висоти...
    this.trunkMaxRadiusRatio = 0.09; // ...і не далі за 9% висоти від осі дерева
    this.trunkColor = new THREE.Color(0x6b4423);
  }

  isValidPosition(x, z, minDist = 0) {
    if (Math.abs(x) > 58 || Math.abs(z) > 58) return false;

    for (const zone of this.exclusionZones) {
      const dx = (x - zone.x) / zone.rx;
      const dz = (z - zone.z) / zone.rz;
      if (dx * dx + dz * dz < 1) return false;
    }
    if (minDist > 0) {
      for (const p of this.placed) {
        if ((p.x - x) ** 2 + (p.z - z) ** 2 < minDist * minDist) return false;
      }
    }
    return true;
  }

  getRandomValidPosition(attempts = 50, minDist = 0) {
    for (let i = 0; i < attempts; i++) {
      const x = (Math.random() - 0.5) * 116;
      const z = (Math.random() - 0.5) * 116;
      if (this.isValidPosition(x, z, minDist)) return { x, z };
    }
    return null;
  }

  /**
   * Розфарбовує модель дерева. Порядок спроб:
   *  1) масив матеріалів -> за назвою матеріалу (або перший = стовбур)
   *  2) за назвою мешу/матеріалу (bark, trunk, leaf...)
   *  3) якщо не вдалося — vertex colors: низько і близько до осі = стовбур, решта = листя
   * Викликається ОДИН раз на варіант, а не на кожен клон.
   */
  colorizeTree(model, leafColorHex) {
    const leafColor = new THREE.Color(leafColorHex);
    const leafMat = new THREE.MeshStandardMaterial({ color: leafColorHex, roughness: 0.8, side: THREE.DoubleSide, flatShading: true });
    const trunkMat = new THREE.MeshStandardMaterial({ color: this.trunkColor, roughness: 0.9, flatShading: true });

    const isTrunk = (s) => /bark|trunk|stem|wood|branch|brown/.test(s);
    const isLeaf = (s) => /leaf|leaves|foliage|crown|needle|green/.test(s);

    model.updateMatrixWorld(true);
    const whole = new THREE.Box3().setFromObject(model);
    const height = whole.max.y - whole.min.y;
    const cx = (whole.min.x + whole.max.x) / 2;
    const cz = (whole.min.z + whole.max.z) / 2;

    model.traverse((mesh) => {
      if (!mesh.isMesh) return;

      // 1) кілька матеріалів в одному меші
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map((m, i) => {
          const n = (m.name || '').toLowerCase();
          if (isTrunk(n)) return trunkMat;
          if (isLeaf(n)) return leafMat;
          return i === 0 ? trunkMat : leafMat;
        });
        return;
      }

      // 2) розпізнавання за назвою
      const n = `${mesh.name} ${mesh.material?.name || ''}`.toLowerCase();
      if (isTrunk(n) && !isLeaf(n)) { mesh.material = trunkMat; return; }
      if (isLeaf(n) && !isTrunk(n)) { mesh.material = leafMat; return; }

      // 3) геометрична евристика по вершинах
      const geo = mesh.geometry.clone();
      const pos = geo.attributes.position;
      const colors = new Float32Array(pos.count * 3);
      const v = new THREE.Vector3();

      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
        const low = (v.y - whole.min.y) < height * this.trunkMaxHeightRatio;
        const near = Math.hypot(v.x - cx, v.z - cz) < height * this.trunkMaxRadiusRatio;
        const c = low && near ? this.trunkColor : leafColor;
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }

      // Вершини вже у світових координатах, але ми зберігаємо лише колір,
      // а позиції лишаємо локальними — тому геометрію не змінюємо.
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      mesh.geometry = geo;
      mesh.material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.85,
        side: THREE.DoubleSide,
        flatShading: true
      });
    });

    return model;
  }

  async buildNature() {
    // --- 1. Поля ---
    const createField = (colorHex, x, z, width, length) => {
      const field = new THREE.Mesh(
        new THREE.PlaneGeometry(width, length),
        new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.95 })
      );
      field.rotation.x = -Math.PI / 2;
      field.position.set(x, 0.05, z);
      field.receiveShadow = true;
      this.scene.add(field);
    };

    createField(0x8B5A2B, 30, -38, 15, 24);
    createField(0xDAA520, 48, -38, 15, 24);
    createField(0x3e2723, 50, -18, 12, 12);

    // --- 2. Завантаження моделей ---
    const loadModel = async (path, scale) => {
      try {
        return await this.modelLoader.load(path, scale);
      } catch (err) {
        console.error(`Помилка завантаження ${path}:`, err);
        return null;
      }
    };

    const treeScale = 0.008;
    const bushScale = 0.006;
    const rockScale = 0.005;

    const [
      birch1, birch2, birch3, birch4, birch5,
      bush, bushFlowers,
      rock1, rock2, rock3, rock4
    ] = await Promise.all([
      loadModel('/models/cityBuilding/nature/BirchTree_1.fbx', treeScale),
      loadModel('/models/cityBuilding/nature/BirchTree_2.fbx', treeScale),
      loadModel('/models/cityBuilding/nature/BirchTree_3.fbx', treeScale),
      loadModel('/models/cityBuilding/nature/BirchTree_4.fbx', treeScale),
      loadModel('/models/cityBuilding/nature/BirchTree_5.fbx', treeScale),
      loadModel('/models/cityBuilding/nature/Bush.fbx', bushScale),
      loadModel('/models/cityBuilding/nature/Bush_Flowers.fbx', bushScale),
      loadModel('/models/cityBuilding/nature/Rock_1.fbx', rockScale),
      loadModel('/models/cityBuilding/nature/Rock_2.fbx', rockScale),
      loadModel('/models/cityBuilding/nature/Rock_3.fbx', rockScale),
      loadModel('/models/cityBuilding/nature/Rock_4.fbx', rockScale),
    ]);

    const bushes = [bush, bushFlowers].filter(Boolean);
    const rocks = [rock1, rock2, rock3, rock4].filter(Boolean);

    // --- 3. Варіанти FBX-дерев: кожна модель × 3 відтінки листя ---
    const leafColors = [0x3d8b2e, 0x4caf50, 0x2e7d32];
    const fbxTreeVariants = [];

    [birch1, birch2, birch3, birch4, birch5].filter(Boolean).forEach((base, idx) => {
      // Діагностика: видно, як названі меші і матеріали
      base.traverse((c) => {
        if (c.isMesh && idx === 0) {
          const m = Array.isArray(c.material) ? c.material.map((x) => x.name) : c.material?.name;
          console.log('Дерево — меш:', c.name, '| матеріал:', m);
        }
      });
      for (const color of leafColors) {
        fbxTreeVariants.push(this.colorizeTree(base.clone(), color));
      }
    });

    // --- 4. Розфарбовування кущів і каміння ---
    const bushGreen = new THREE.MeshStandardMaterial({ color: 0x2a7d1a, roughness: 0.85, side: THREE.DoubleSide, flatShading: true });
    const flowersMat = new THREE.MeshStandardMaterial({ color: 0xff6b81, roughness: 0.7, flatShading: true });
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x7a7a72, roughness: 0.95, flatShading: true });

    const paintSimple = (obj, type) => {
      obj.traverse((m) => {
        if (!m.isMesh) return;
        if (type === 'rock') m.material = rockMat;
        else m.material = /flower|petal/.test(m.name.toLowerCase()) ? flowersMat : bushGreen;
      });
    };

    // --- 5. Спільне розміщення ---
    const finalize = (obj, x, z, scale = 1) => {
      obj.rotation.y = Math.random() * Math.PI * 2;
      obj.scale.multiplyScalar(scale * rand(0.8, 1.2));
      obj.position.set(x, 0, z);
      obj.traverse((c) => {
        if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; }
      });
      this.scene.add(obj);
      this.placed.push({ x, z });
    };

    const placeTree = (x, z) => {
      // 60% процедурні дерева, 40% FBX-берези (якщо вони є)
      const useFbx = fbxTreeVariants.length > 0 && Math.random() < 0.4;
      const tree = useFbx
        ? fbxTreeVariants[Math.floor(Math.random() * fbxTreeVariants.length)].clone()
        : this.treeFactory.createRandom();
      finalize(tree, x, z);
    };

    const placeSimple = (list, type, x, z) => {
      if (list.length === 0) return;
      const obj = list[Math.floor(Math.random() * list.length)].clone();
      paintSimple(obj, type);
      finalize(obj, x, z);
    };

    // --- 6. Розстановка ---
    for (let i = 0; i < 70; i++) {
      const pos = this.getRandomValidPosition(50, 3.5);
      if (pos) placeTree(pos.x, pos.z);
    }

    for (let i = 0; i < 30; i++) {
      const pos = this.getRandomValidPosition(50, 1.5);
      if (pos) placeSimple(bushes, 'bush', pos.x, pos.z);
    }

    for (let i = 0; i < 15; i++) {
      const pos = this.getRandomValidPosition(50, 1.5);
      if (pos) placeSimple(rocks, 'rock', pos.x, pos.z);
    }

    // Ліски
    const clusterCenters = [
      { x: -50, z: 10 },
      { x: -15, z: 45 },
      { x: -50, z: -15 },
      { x: 10,  z: -45 },
    ];

    for (const center of clusterCenters) {
      const clusterSize = 6 + Math.floor(Math.random() * 5);
      for (let i = 0; i < clusterSize; i++) {
        const x = center.x + (Math.random() - 0.5) * 14;
        const z = center.z + (Math.random() - 0.5) * 14;
        if (this.isValidPosition(x, z, 3)) placeTree(x, z);
      }
      for (let i = 0; i < 3; i++) {
        const x = center.x + (Math.random() - 0.5) * 16;
        const z = center.z + (Math.random() - 0.5) * 16;
        if (this.isValidPosition(x, z, 1.5)) placeSimple(bushes, 'bush', x, z);
      }
    }
  }
}
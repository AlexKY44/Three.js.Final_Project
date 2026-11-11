import * as THREE from 'three';

const rand = (a, b) => a + Math.random() * (b - a);
const mat = (color) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true });

export class TreeFactory {
  constructor() {
    this.trunkMat = mat(0x6b4423);
    this.oakMats = [mat(0x2e7d32), mat(0x3d8b2e), mat(0x4caf50)];
    this.pineMats = [mat(0x1b5e20), mat(0x2a6b35), mat(0x23622e)];
    this.poplarMats = [mat(0x5fa83a), mat(0x6dbb45)];
  }

  _pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  _mesh(geo, material, y, x = 0, z = 0) {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  // Ялина / сосна: конуси один на одному
  createPine() {
    const g = new THREE.Group();
    const h = rand(6, 9);
    const trunkH = h * 0.3;
    const leaf = this._pick(this.pineMats);

    g.add(this._mesh(new THREE.CylinderGeometry(0.2, 0.35, trunkH, 6), this.trunkMat, trunkH / 2));

    const layers = 4;
    for (let i = 0; i < layers; i++) {
      const t = i / layers;
      const r = (1 - t) * h * 0.22 + 0.5;
      const coneH = h * 0.32;
      const y = trunkH * 0.8 + t * h * 0.55 + coneH / 2;
      g.add(this._mesh(new THREE.ConeGeometry(r, coneH, 7), leaf, y));
    }
    return g;
  }

  // Дуб: товстий стовбур + кілька округлих «куль» крони
  createOak() {
    const g = new THREE.Group();
    const trunkH = rand(2.2, 3.2);
    const leaf = this._pick(this.oakMats);

    g.add(this._mesh(new THREE.CylinderGeometry(0.3, 0.5, trunkH, 7), this.trunkMat, trunkH / 2));

    const blobs = 4 + Math.floor(Math.random() * 2);
    for (let i = 0; i < blobs; i++) {
      const r = rand(1.5, 2.3);
      const a = Math.random() * Math.PI * 2;
      const d = i === 0 ? 0 : rand(0.8, 1.5);
      g.add(
        this._mesh(
          new THREE.IcosahedronGeometry(r, 0),
          leaf,
          trunkH + rand(0.6, 1.6),
          Math.cos(a) * d,
          Math.sin(a) * d
        )
      );
    }
    return g;
  }

  // Тополя: тонка висока крона
  createPoplar() {
    const g = new THREE.Group();
    const h = rand(7, 10);
    const trunkH = h * 0.25;
    const leaf = this._pick(this.poplarMats);

    g.add(this._mesh(new THREE.CylinderGeometry(0.15, 0.28, trunkH, 6), this.trunkMat, trunkH / 2));

    const crown = this._mesh(new THREE.IcosahedronGeometry(1, 1), leaf, trunkH + (h - trunkH) / 2);
    crown.scale.set(1.2, (h - trunkH) / 2, 1.2);
    g.add(crown);
    return g;
  }

  createRandom() {
    const r = Math.random();
    if (r < 0.4) return this.createPine();
    if (r < 0.75) return this.createOak();
    return this.createPoplar();
  }
}
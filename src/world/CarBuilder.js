import * as THREE from 'three';
import { ModelLoader } from '../utils/ModelLoader.js';

const CARS = {
  cop: 'Cop',
  normal1: 'NormalCar1',
  normal2: 'NormalCar2',
  sports1: 'SportsCar',
  sports2: 'SportsCar2',
  suv: 'SUV',
  taxi: 'Taxi'
};

const CONFIG = {
  targetLength: 2.3,   // було 4.2. Менше значення = менші машини
  yawOffset: Math.PI, 
  roadY: 0.12,
  villageY: 0.05
};

// Рух лише в один бік: з правого краю карти (x = 60) на лівий (x = -60)
const ROUTES = [
  { name: 'west',    points: [[60, -7], [-60, -7]], lane: 0, speed: 8, interval: [3, 6], y: CONFIG.roadY },
  { name: 'village', points: [[-53, -7], [-53, 25], [-17, 25]], lane: 0, speed: 5, interval: [8, 14], y: CONFIG.villageY }
];

// Припарковані машини: [модель, x, z, поворот Y]. Math.PI/2 = носом на схід (+X)
const PARKED = [
  ['normal1', -46, 24.0, Math.PI / 2],
  ['taxi',    -41, 26.0, -Math.PI / 2],
  ['suv',     -28, 24.0, Math.PI / 2],
  ['sports1', -23, 26.0, -Math.PI / 2],
  ['cop',     -31, 23.9, Math.PI / 2]
];

const rand = (a, b) => a + Math.random() * (b - a);

export class CarBuilder {
  constructor(scene) {
    this.scene = scene;
    this.modelLoader = new ModelLoader();
    this.templates = {};
    this.states = [];
    this._last = performance.now();
  }

  // Центрує модель, ставить на землю, підганяє довжину і розвертає носом до +Z
  _prepare(model) {
    let box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const alongX = size.x > size.z; // довша вісь = напрям руху

    model.scale.multiplyScalar(CONFIG.targetLength / Math.max(size.x, size.z));
    model.updateMatrixWorld(true);

    box = new THREE.Box3().setFromObject(model);
    const c = box.getCenter(new THREE.Vector3());
    model.position.x -= c.x;
    model.position.z -= c.z;
    model.position.y -= box.min.y;

    const inner = new THREE.Group();
    inner.add(model);
    inner.rotation.y = (alongX ? -Math.PI / 2 : 0) + CONFIG.yawOffset;

    const wrapper = new THREE.Group();
    wrapper.add(inner);
    return wrapper;
  }

  _spawnClone(key) {
    const car = this.templates[key].clone();
    car.traverse((c) => {
      if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; }
    });
    return car;
  }

  async buildCars() {
    await Promise.all(
      Object.entries(CARS).map(async ([key, file]) => {
        try {
          const model = await this.modelLoader.load(`/models/cityBuilding/cars/${file}.fbx`);
          this.templates[key] = this._prepare(model);
        } catch (err) {
          console.error(`Помилка завантаження ${file}:`, err);
        }
      })
    );

    const keys = Object.keys(this.templates);
    if (keys.length === 0) return;

    // Припарковані
    for (const [key, x, z, rotY] of PARKED) {
      if (!this.templates[key]) continue;
      const car = this._spawnClone(key);
      car.position.set(x, CONFIG.villageY, z);
      car.rotation.y = rotY;
      this.scene.add(car);
    }

    // Рух
    this.states = ROUTES.map((route) => {
      const segs = [];
      let total = 0;
      for (let i = 0; i < route.points.length - 1; i++) {
        const [x1, z1] = route.points[i];
        const [x2, z2] = route.points[i + 1];
        const len = Math.hypot(x2 - x1, z2 - z1);
        segs.push({ x1, z1, dx: (x2 - x1) / len, dz: (z2 - z1) / len, start: total, len });
        total += len;
      }
      return { route, segs, total, cars: [], timer: rand(0, 3) };
    });
  }

  _pose(state, s) {
    const seg = state.segs.find((g) => s <= g.start + g.len) || state.segs[state.segs.length - 1];
    const t = s - seg.start;
    const lane = state.route.lane;
    return {
      x: seg.x1 + seg.dx * t + -seg.dz * lane, // права нормаль = (-dz, dx)
      z: seg.z1 + seg.dz * t + seg.dx * lane,
      yaw: Math.atan2(seg.dx, seg.dz)
    };
  }

  update() {
    const now = performance.now();
    const dt = Math.min((now - this._last) / 1000, 0.1);
    this._last = now;

    const keys = Object.keys(this.templates);
    if (keys.length === 0) return;

    for (const st of this.states) {
      // Поява нової машини в точці А
      st.timer -= dt;
      if (st.timer <= 0) {
        st.timer = rand(...st.route.interval);
        const mesh = this._spawnClone(keys[Math.floor(Math.random() * keys.length)]);
        mesh.userData.noCollide = true; // рухомі машини не враховуємо в колізіях камери
        const p = this._pose(st, 0);
        mesh.position.set(p.x, st.route.y, p.z);
        mesh.rotation.y = p.yaw;
        this.scene.add(mesh);
        st.cars.push({ mesh, s: 0 });
      }

      // Рух і зникнення в точці Б
      for (let i = st.cars.length - 1; i >= 0; i--) {
        const car = st.cars[i];
        car.s += st.route.speed * dt;

        if (car.s >= st.total) {
          this.scene.remove(car.mesh);
          st.cars.splice(i, 1);
          continue;
        }

        const p = this._pose(st, car.s);
        car.mesh.position.set(p.x, st.route.y, p.z);

        // Плавний поворот на кутах
        let d = p.yaw - car.mesh.rotation.y;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        car.mesh.rotation.y += d * Math.min(1, dt * 6);
      }
    }
  }
}
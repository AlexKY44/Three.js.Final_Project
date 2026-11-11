import * as THREE from 'three';

export class CameraCollision {
  constructor(camera, controls, options = {}) {
    this.camera = camera;
    this.controls = controls;

    this.radius = options.radius ?? 1.5;        // "товщина" камери
    this.minHeight = options.minHeight ?? 1.0;  // мінімальна висота над землею
    this.bounds = options.bounds ?? 140;        // півсторони дозволеної зони (X/Z)

    this.colliders = [];                        // масив Box3
    this._size = new THREE.Vector3();
  }

  /**
   * Збирає коробки зіткнень зі всіх мешів сцени.
   * Викликати ПІСЛЯ завантаження моделей.
   * Щоб виключити об'єкт: obj.userData.noCollide = true
   */
  collect(root, { exclude = [] } = {}) {
    this.colliders.length = 0;
    root.updateMatrixWorld(true);

    const excluded = new Set(exclude);
    const isExcluded = (obj) => {
      for (let o = obj; o; o = o.parent) {
        if (excluded.has(o) || o.userData.noCollide) return true;
      }
      return false;
    };

    root.traverse((child) => {
      if (!child.isMesh || child.isInstancedMesh || !child.visible) return;
      if (isExcluded(child)) return;

      const box = new THREE.Box3().setFromObject(child);
      if (box.isEmpty()) return;
      box.getSize(this._size);

      const { x, y, z } = this._size;
      if (y < 1) return;                          // дороги, озеро, стежки
      if (Math.max(x, y, z) < 0.8) return;        // дрібниці
      if (box.min.y > 8) return;                  // хмари та все, що висить у повітрі

      this.colliders.push(box);
    });

    console.log(`Колізії камери: ${this.colliders.length} об'єктів`);
  }

  /** Викликати щоразу ПІСЛЯ controls.update() */
  update() {
    const p = this.camera.position;
    const t = this.controls.target;
    const b = this.bounds;

    // Межі карти
    t.x = THREE.MathUtils.clamp(t.x, -b, b);
    t.z = THREE.MathUtils.clamp(t.z, -b, b);
    t.y = Math.max(t.y, 0);

    p.x = THREE.MathUtils.clamp(p.x, -b, b);
    p.z = THREE.MathUtils.clamp(p.z, -b, b);

    // Земля
    p.y = Math.max(p.y, this.minHeight);

    // Будівлі й дерева: виштовхуємо камеру з розширених коробок
    const r = this.radius;
    for (let pass = 0; pass < 2; pass++) {
      let moved = false;

      for (const box of this.colliders) {
        if (
          p.x <= box.min.x - r || p.x >= box.max.x + r ||
          p.y <= box.min.y - r || p.y >= box.max.y + r ||
          p.z <= box.min.z - r || p.z >= box.max.z + r
        ) continue;

        // Знаходимо найближчу грань і виштовхуємо камеру через неї
        const d = [
          { axis: 'x', dir: -1, dist: p.x - (box.min.x - r) },
          { axis: 'x', dir:  1, dist: (box.max.x + r) - p.x },
          { axis: 'y', dir:  1, dist: (box.max.y + r) - p.y },
          { axis: 'z', dir: -1, dist: p.z - (box.min.z - r) },
          { axis: 'z', dir:  1, dist: (box.max.z + r) - p.z }
        ];
        // знизу (y -1) не виштовхуємо, бо там земля

        let best = d[0];
        for (const c of d) if (c.dist < best.dist) best = c;

        p[best.axis] += best.dir * best.dist;
        moved = true;
      }

      if (!moved) break;
    }
  }
}
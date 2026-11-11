import * as THREE from 'three';

export class CloudBuilder {
  constructor(scene) {
    this.scene = scene;
    this.clouds = [];
  }

  buildClouds() {
    // Білосніжний матеріал із власним випромінюванням світла (emissive)
    const cloudMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.1,
      flatShading: true,
      emissive: 0xffffff,
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: 0.95
    });

    for (let i = 0; i < 16; i++) {
      const cloudGroup = new THREE.Group();
      
      const puffsCount = 3 + Math.floor(Math.random() * 3);
      for (let j = 0; j < puffsCount; j++) {
        const radius = 2.5 + Math.random() * 2.0;
        const puffGeo = new THREE.DodecahedronGeometry(radius, 1);
        const puff = new THREE.Mesh(puffGeo, cloudMaterial);
        
        puff.position.set(
          (j - puffsCount / 2) * 2.8,
          Math.random() * 1.2,
          Math.random() * 1.5
        );
        cloudGroup.add(puff);
      }

      const x = (Math.random() - 0.5) * 140;
      const y = 35 + Math.random() * 15;
      const z = (Math.random() - 0.5) * 140;

      cloudGroup.position.set(x, y, z);
      this.scene.add(cloudGroup);

      this.clouds.push({
        mesh: cloudGroup,
        speed: 0.02 + Math.random() * 0.03
      });
    }
  }

  update() {
    this.clouds.forEach(c => {
      c.mesh.position.x += c.speed;
      if (c.mesh.position.x > 75) {
        c.mesh.position.x = -75;
      }
    });
  }
}
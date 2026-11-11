import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { CityBuilder } from './world/CityBuilder.js';
import { FarmBuilder } from './world/FarmBuilder.js';
import { VillageBuilder } from './world/VillageBuilder.js';
import { RoadNetwork } from './world/RoadNetwork.js';
import { NatureBuilder } from './world/NatureBuilder.js';
import { LakeBuilder } from './world/LakeBuilder.js';
import { WindTurbineBuilder } from './world/WindTurbineBuilder.js';
import { CloudBuilder } from './world/CloudBuilder.js';
import { CarBuilder } from './world/CarBuilder.js';

import { PostProcessing } from './core/PostProcessing.js';
import { CameraCollision } from './core/CameraCollision.js';
import { SkyDome, SKY_COLORS } from './shaders/SkyShader.js';

const canvas = document.querySelector('#webgl-canvas');
const scene = new THREE.Scene();

// 1. НЕБО (власний шейдер) ТА ТУМАН
// Колір фону і туману = колір горизонту, щоб краї карти плавно розчинялися в небі
scene.background = SKY_COLORS.horizon.clone();
scene.fog = new THREE.FogExp2(SKY_COLORS.horizon.clone(), 0.0035);
const skyDome = new SkyDome(scene);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 50, 75);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// Tone mapping застосовує OutputPass у composer. Якщо картинка темна, збільште exposure
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = true;
controls.panSpeed = 1.5;
controls.zoomSpeed = 1.2;
controls.minDistance = 2;
controls.maxDistance = 180;
controls.maxPolarAngle = Math.PI / 2 - 0.02;
controls.target.set(0, 0, 0);

// 2. ОСВІТЛЕННЯ ТА СОНЦЕ
scene.add(new THREE.AmbientLight(0xffffff, 0.8));

// Позиція має збігатися з SUN_DIRECTION у shaders/SkyShader.js (100, 80, -50)
const dirLight = new THREE.DirectionalLight(0xffffff, 1.3);
dirLight.position.set(100, 80, -50);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 250;
dirLight.shadow.camera.left = -90;
dirLight.shadow.camera.right = 90;
dirLight.shadow.camera.top = 90;
dirLight.shadow.camera.bottom = -90;
dirLight.shadow.bias = -0.0005;
dirLight.shadow.normalBias = 0.02;
scene.add(dirLight);

// Сонце. Колір > 1.0 (HDR) потрібен, щоб воно пройшло поріг Bloom.
const sunMesh = new THREE.Mesh(
  new THREE.SphereGeometry(8, 32, 32),
  new THREE.MeshBasicMaterial({ fog: false })
);
sunMesh.material.color.setRGB(4.0, 3.5, 2.2);
sunMesh.position.copy(dirLight.position).multiplyScalar(2.5);
sunMesh.userData.noCollide = true;
scene.add(sunMesh);

const plane = new THREE.Mesh(
  new THREE.PlaneGeometry(120, 120),
  new THREE.MeshStandardMaterial({ color: 0x2d5a27, roughness: 0.8 })
);
plane.rotation.x = -Math.PI / 2;
plane.receiveShadow = true;
plane.userData.noCollide = true;
scene.add(plane);

// 3. СВІТ
const cityBuilder = new CityBuilder(scene);
const villageBuilder = new VillageBuilder(scene);
const roadNetwork = new RoadNetwork(scene);
const natureBuilder = new NatureBuilder(scene);
const farmBuilder = new FarmBuilder(scene);
const lakeBuilder = new LakeBuilder(scene);
const windTurbineBuilder = new WindTurbineBuilder(scene);
const cloudBuilder = new CloudBuilder(scene);
const carBuilder = new CarBuilder(scene);

// 4. КОЛІЗІЇ ТА POST-PROCESSING
const cameraCollision = new CameraCollision(camera, controls, {
  radius: 1.5,
  minHeight: 1.0,
  bounds: 140
});

const postProcessing = new PostProcessing(renderer, scene, camera, {
  strength: 0.7,
  radius: 0.6,
  threshold: 1.0
});

Promise.all([
  cityBuilder.buildStreet(),
  villageBuilder.buildVillage(),
  roadNetwork.buildPaths(),
  natureBuilder.buildNature(),
  farmBuilder.buildFarm(),
  lakeBuilder.buildLake(),
  windTurbineBuilder.buildWindTurbines(),
  cloudBuilder.buildClouds(),
  carBuilder.buildCars()
]).then(() => {
  cameraCollision.collect(scene, { exclude: [plane, sunMesh, skyDome.mesh] });
}).catch((err) => {
  console.error('Помилка будівництва світу:', err);
});

// Цикл анімації
function animate() {
  requestAnimationFrame(animate);

  controls.update();
  cameraCollision.update();

  skyDome.update();
  lakeBuilder.update();
  farmBuilder.update();
  windTurbineBuilder.update();
  cloudBuilder.update();
  carBuilder.update();

  postProcessing.render();
}
animate();

window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const pr = Math.min(window.devicePixelRatio, 2);

  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(pr);
  renderer.setSize(w, h);
  postProcessing.resize(w, h, pr);
});
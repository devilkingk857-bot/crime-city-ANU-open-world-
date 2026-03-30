/**
 * CRIME CITY 3D - GAME ENGINE
 * Refactored from 2D Dead Zone to 3D Three.js
 */

// ══════════════════════════════════════════════════════
// 3D ENGINE SETUP (Three.js)
// ══════════════════════════════════════════════════════
let scene, camera, renderer, clock;
let floor, playerMesh, playerGunMesh;
let playerDriving = false;
let currentCar = null;
let carSpeed = 0;
let carSteer = 0;
let trafficCars = [];
let trafficMeshes = new Map();
let streetLights = [];
let zombieMeshes = new Map(); 
let npcMeshes = new Map();
let helis = [];
let heliMeshes = new Map();
let bulletMeshes = [];

let powerupMeshes = [];
let buildings = [];
let waypoints = [];
let npcs = [];
let particles = [];
let lights = {};
let gameInitialized = false;
let worldTime = 0; // 0-24000 cycle
let rainSystem = null;
let isRainy = Math.random() > 0.7;


function init3D() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050510);
    scene.fog = new THREE.FogExp2(0x050510, 0.0006);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
    camera.position.set(0, 450, 400);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    
    // ⚡ MOBILE PERFORMANCE: Hardcap pixel ratio for 60FPS
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    renderer.setPixelRatio(isMobile ? Math.min(window.devicePixelRatio, 1.5) : window.devicePixelRatio);

    
    document.getElementById('three-container').appendChild(renderer.domElement);


    clock = new THREE.Clock();

    // Lighting
    lights.ambient = new THREE.AmbientLight(0x666666, 3); 
    scene.add(lights.ambient);

    lights.sun = new THREE.DirectionalLight(0xffffff, 0.8);
    lights.sun.position.set(500, 1000, 500);
    lights.sun.castShadow = true;
    scene.add(lights.sun);

    // Cyberpunk Ambient Light (Dual-tone)
    lights.hemi = new THREE.HemisphereLight(0x4444ff, 0x061a06, 0.6);
    scene.add(lights.hemi);

    // Distant Moon
    const moonGeo = new THREE.SphereGeometry(300, 32, 32);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const moon = new THREE.Mesh(moonGeo, moonMat);
    moon.position.set(-2000, 4000, -8000);
    scene.add(moon);
    const moonLight = new THREE.PointLight(0xffffff, 1, 10000);
    moonLight.position.set(-2000, 4000, -8000);
    scene.add(moonLight);

    // Grid Floor (Cyber Style)
    const gridHelper = new THREE.GridHelper(30000, 100, 0x00ff00, 0x051a05);
    scene.add(gridHelper);

    const floorGeo = new THREE.PlaneGeometry(40000, 40000);
    const floorMat = new THREE.MeshPhongMaterial({ color: 0x061a06, shininess: 10 });
    floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Rain Particle System
    const rainCount = 3000;
    const rainGeo = new THREE.BufferGeometry();
    const rainPos = new Float32Array(rainCount * 3);
    for(let i=0; i<rainCount*3; i++) rainPos[i] = (Math.random()-0.5)*2000;
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    const rainMat = new THREE.PointsMaterial({ color: 0xaaaaaa, size: 2, transparent: true, opacity: 0.5 });
    rainSystem = new THREE.Points(rainGeo, rainMat);
    rainSystem.visible = isRainy;
    scene.add(rainSystem);


    // Generate City Buildings with Window Details
    const buildingMat = new THREE.MeshPhongMaterial({ color: 0x22222a });
    const windowMat = new THREE.MeshPhongMaterial({ color: 0xffcc00, emissive: 0xffaa00, emissiveIntensity: 0.8 });
    const buildingGeo1 = new THREE.BoxGeometry(200, 400, 200);
    const buildingGeo2 = new THREE.BoxGeometry(150, 600, 150);
    const buildingGeo3 = new THREE.BoxGeometry(300, 300, 150);

    for(let i=0; i<400; i++) {
        const h = Math.random();
        let geo = buildingGeo1;
        if(h > 0.6) geo = buildingGeo2;
        if(h > 0.8) geo = buildingGeo3;
        if (Math.random() > 0.95) geo = new THREE.BoxGeometry(400, 1200, 400);

        const bMesh = new THREE.Mesh(geo, buildingMat);
        const bx = (Math.random() - 0.5) * ARENA_SIZE;
        const bz = (Math.random() - 0.5) * ARENA_SIZE;
        if(Math.abs(bx) < 600 && Math.abs(bz) < 600) continue;
        
        bMesh.position.set(bx, geo.parameters.height / 2, bz);
        bMesh.castShadow = true;
        bMesh.receiveShadow = true;
        scene.add(bMesh);

        // Add Glowing Windows
        for(let j=0; j<10; j++) {
            const win = new THREE.Mesh(new THREE.BoxGeometry(20, 20, 5), windowMat);
            const side = Math.floor(Math.random()*4);
            const wh = Math.random()*geo.parameters.height;
            if(side === 0) win.position.set(Math.random()*100-50, wh, geo.parameters.depth/2+2);
            else if(side === 1) win.position.set(Math.random()*100-50, wh, -geo.parameters.depth/2-2);
            else if(side === 2) { win.position.set(geo.parameters.width/2+2, wh, Math.random()*100-50); win.rotation.y = Math.PI/2; }
            else { win.position.set(-geo.parameters.width/2-2, wh, Math.random()*100-50); win.rotation.y = Math.PI/2; }
            bMesh.add(win);
        }
        buildings.push({ mesh: bMesh, x: bx, z: bz, w: geo.parameters.width/2, d: geo.parameters.depth/2 });
    }

    // Player Mesh (Compound Humanoid)
    playerMesh = createHumanoid(0x00ffff);
    scene.add(playerMesh);

    // Add Player-Specific 'Main Character' Details (Sunglasses & Cap)
    const head = playerMesh.userData.head;
    const glassMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const glass = new THREE.Mesh(new THREE.BoxGeometry(17, 4, 3), glassMat);
    glass.position.set(0, 4, 8); head.add(glass); // Cool Sunglasses

    const capMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
    const capTop = new THREE.Mesh(new THREE.BoxGeometry(18, 5, 18), capMat);
    capTop.position.y = 10; head.add(capTop); // Modern Cap
    const capBrim = new THREE.Mesh(new THREE.BoxGeometry(18, 1, 10), capMat);
    capBrim.position.set(0, 8, 12); head.add(capBrim);

    // Initial Weapon Mesh
    const gunGeo = new THREE.BoxGeometry(6, 6, 40);
    const gunMat = new THREE.MeshPhongMaterial({ color: 0x222222 });
    playerGunMesh = new THREE.Mesh(gunGeo, gunMat);
    playerGunMesh.position.set(0, -10, 20); // Relative to hand
    playerMesh.userData.rArm.add(playerGunMesh);

    // Initial NPCs
    for(let k=0; k<40; k++) spawnNPC();

    // Urban Infrastructure & Nature
    createRoadNetwork();
    createClouds();
    spawnBirds(25);
    createGrass();
    createTrees();
    createInfestedZones(15);
    createWaterBody();
    createStreetLights();
    initUrbanVariety();

    // Waypoint Mesh
    const wayGeo = new THREE.CylinderGeometry(50, 50, 10, 32);
    const wayMat = new THREE.MeshPhongMaterial({ color: 0xffff00, emissive: 0x555500, transparent: true, opacity: 0.6 });
    waypointMesh = new THREE.Mesh(wayGeo, wayMat);
    waypointMesh.visible = false;
    scene.add(waypointMesh);
}

// ══════════════════════════════════════════════════════
// URBAN & NATURE HELPERS
// ══════════════════════════════════════════════════════
const roads = [];
function createRoadNetwork() {
    const roadMat = new THREE.MeshPhongMaterial({ color: 0x111115 });
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });

    const addRoad = (x, z, w, d, vertical = false) => {
        const road = new THREE.Mesh(new THREE.PlaneGeometry(w, d), roadMat);
        road.position.set(x, 2, z); road.rotation.x = -Math.PI/2;
        scene.add(road);
        
        // Lane Lines (Dashed)
        for(let i=-d/2; i<d/2; i+=100) {
            const line = new THREE.Mesh(new THREE.PlaneGeometry(vertical?4:50, vertical?50:4), lineMat);
            line.position.set(x + (vertical?0:0), 3, z + i); 
            line.rotation.x = -Math.PI/2;
            scene.add(line);
        }
    };

    // Main Avenues
    addRoad(0, 0, 450, ARENA_SIZE); // Vertical
    addRoad(0, 0, ARENA_SIZE, 450); // Horizontal
}

const cloudMeshes = [];
function createClouds() {
    const geo = new THREE.BoxGeometry(300, 80, 200);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 });
    for(let i=0; i<30; i++) {
        const cloud = new THREE.Mesh(geo, mat);
        cloud.position.set((Math.random()-0.5)*ARENA_SIZE, 1500, (Math.random()-0.5)*ARENA_SIZE);
        cloud.scale.set(1+Math.random()*2, 1, 1+Math.random()*2);
        scene.add(cloud);
        cloudMeshes.push(cloud);
    }
}
function updateClouds() {
    cloudMeshes.forEach(c => {
        c.position.x += 0.5;
        if(c.position.x > ARENA_SIZE/2) c.position.x = -ARENA_SIZE/2;
    });
}

const birdMeshes = [];
function spawnBirds(count) {
    const wingMat = new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.DoubleSide });
    for(let i=0; i<count; i++) {
        const b = new THREE.Group();
        const wingL = new THREE.Mesh(new THREE.PlaneGeometry(30, 10), wingMat);
        wingL.position.x = -15; b.add(wingL);
        const wingR = new THREE.Mesh(new THREE.PlaneGeometry(30, 10), wingMat);
        wingR.position.x = 15; b.add(wingR);
        
        b.position.set((Math.random()-0.5)*ARENA_SIZE, 400 + Math.random()*400, (Math.random()-0.5)*ARENA_SIZE);
        b.rotation.y = Math.random()*Math.PI*2;
        scene.add(b);
        birdMeshes.push({ mesh: b, wings: [wingL, wingR], speed: 3+Math.random()*3 });
    }
}
function updateBirds() {
    const time = Date.now() * 0.005;
    birdMeshes.forEach(b => {
        b.mesh.position.x += Math.sin(b.mesh.rotation.y) * b.speed;
        b.mesh.position.z += Math.cos(b.mesh.rotation.y) * b.speed;
        b.wings[0].rotation.z = Math.sin(time*3)*0.8;
        b.wings[1].rotation.z = -Math.sin(time*3)*0.8;
        if(Math.abs(b.mesh.position.x) > ARENA_SIZE/2 || Math.abs(b.mesh.position.z) > ARENA_SIZE/2) {
            b.mesh.rotation.y += Math.PI;
        }
    });
}

function createWaterBody() {
    const waterGeo = new THREE.PlaneGeometry(8000, ARENA_SIZE);
    const waterMat = new THREE.MeshPhongMaterial({ 
        color: 0x0044ff, transparent: true, opacity: 0.6, shininess: 100 
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.set(7000, 5, 0); // At the right edge
    water.rotation.x = -Math.PI/2;
    scene.add(water);
}

function createStreetLights() {
    const postGeo = new THREE.CylinderGeometry(5, 5, 200);
    const postMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
    const lampGeo = new THREE.SphereGeometry(15);
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xffffaa });

    const addLamp = (lx, lz) => {
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.set(lx, 100, lz);
        scene.add(post);
        const lamp = new THREE.Mesh(lampGeo, lampMat);
        lamp.position.set(lx, 200, lz);
        scene.add(lamp);
        const light = new THREE.PointLight(0xffffaa, 1, 600);
        light.position.set(lx, 200, lz);
        light.visible = false; // Start off
        scene.add(light);
        streetLights.push({ light, x: lx, z: lz });
    };

    // Place lamps along main roads
    for(let i=-ARENA_SIZE/2; i < ARENA_SIZE/2; i += 800) {
        addLamp(250, i);  // NS Road Right
        addLamp(-250, i); // NS Road Left
        addLamp(i, 250);  // EW Road Bottom
        addLamp(i, -250); // EW Road Top
    }
}

function createGrass() {
    const geo = new THREE.BoxGeometry(10, 20, 10);
    const mat = new THREE.MeshPhongMaterial({ color: 0x228822 });
    const count = 2000;
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    
    const dummy = new THREE.Object3D();
    let actualCount = 0;

    for(let i=0; i<count; i++) {
        const gx = (Math.random()-0.5)*ARENA_SIZE;
        const gz = (Math.random()-0.5)*ARENA_SIZE;
        if(Math.abs(gx) < 260 || Math.abs(gz) < 260) continue;
        if(checkBuildingCollision(gx, gz, 40)) continue;

        dummy.position.set(gx, 10, gz);
        dummy.rotation.y = Math.random()*Math.PI;
        dummy.updateMatrix();
        mesh.setMatrixAt(actualCount++, dummy.matrix);
    }
    scene.add(mesh);
}

function createTrees() {
    const trunkMat = new THREE.MeshPhongMaterial({ color: 0x4d2600 });
    const leafMat = new THREE.MeshPhongMaterial({ color: 0x004d00 });
    const count = 150;
    
    const trunkMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(20, 60, 20), trunkMat, count);
    const leafMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(80, 80, 80), leafMat, count);
    
    const dummy = new THREE.Object3D();
    let actualCount = 0;

    for(let i=0; i<count; i++) {
        const tx = (Math.random()-0.5)*ARENA_SIZE;
        const tz = (Math.random()-0.5)*ARENA_SIZE;
        if(Math.abs(tx) < 300 || Math.abs(tz) < 300) continue;
        if(checkBuildingCollision(tx, tz, 100)) continue;

        // Trunk
        dummy.position.set(tx, 30, tz);
        dummy.updateMatrix();
        trunkMesh.setMatrixAt(actualCount, dummy.matrix);
        
        // Leaves
        dummy.position.set(tx, 100, tz);
        dummy.updateMatrix();
        leafMesh.setMatrixAt(actualCount, dummy.matrix);
        
        actualCount++;
    }
    scene.add(trunkMesh);
    scene.add(leafMesh);
}

function updateEnvironment() {
    worldTime = (worldTime + 1) % 24000;
    const sunAngle = (worldTime / 24000) * Math.PI * 2;
    
    // Day/Night Cycle: Move sun in a loop
    lights.sun.position.set(Math.cos(sunAngle)*2000, Math.sin(sunAngle)*2000, 500);
    const isDay = Math.sin(sunAngle) > 0;
    lights.sun.intensity = isDay ? 1.0 : 0.1;
    lights.ambient.intensity = isDay ? 1.5 : 0.3;
    
    // Update Fog & Background based on cycle
    const colorDay = isRainy ? 0x222233 : 0x050510;
    const colorNight = 0x010105;
    const lerpColor = new THREE.Color(isDay ? colorDay : colorNight);
    scene.background = lerpColor;
    scene.fog.color = lerpColor;

    // Rain Logic: Move particles 
    if(rainSystem && isRainy) {
        rainSystem.position.set(player.x, 0, player.z);
        const pos = rainSystem.geometry.attributes.position.array;
        for(let i=0; i<pos.length; i+=3) {
            pos[i+1] -= 25; // High speed falling
            if(pos[i+1] < -500) pos[i+1] = 1000;
        }
        rainSystem.geometry.attributes.position.needsUpdate = true;
        // Wet Floor Reflection
        floor.material.shininess = 60;
    } else {
        floor.material.shininess = 10;
        if (rainSystem) rainSystem.visible = false;
    }

    // Dynamic Weather Toggle (Random chance to start/stop rain)
    if (frameCount % 1000 === 0) {
        isRainy = Math.random() > 0.8;
        if (rainSystem) rainSystem.visible = isRainy;
    }
}


// ══════════════════════════════════════════════════════
// COMPOUND MODEL HELPERS
// ══════════════════════════════════════════════════════
function createHumanoid(color, isZombie = false) {
    const group = new THREE.Group();
    const mat = new THREE.MeshPhongMaterial({ color: color });
    
    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(24, 30, 12), mat);
    torso.position.y = 25;
    group.add(torso);
    
    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(16, 16, 16), mat);
    head.position.y = 48;
    group.add(head);

    // Face Details (Eyes & Mouth)
    const eyeMat = new THREE.MeshBasicMaterial({ color: isZombie ? 0xff0000 : 0x000000 });
    const eyeGeo = new THREE.BoxGeometry(3, 3, 2);
    const lEye = new THREE.Mesh(eyeGeo, eyeMat);
    lEye.position.set(-4, 4, 8); head.add(lEye);
    const rEye = new THREE.Mesh(eyeGeo, eyeMat);
    rEye.position.set(4, 4, 8); head.add(rEye);

    const mouthMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const mouthGeo = new THREE.BoxGeometry(6, 1.5, 2);
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, -4, 8); head.add(mouth);
    
    // Arms
    const armGeo = new THREE.BoxGeometry(8, 24, 8);
    const lArm = new THREE.Mesh(armGeo, mat);
    lArm.position.set(-16, 30, 0);
    group.add(lArm);
    const rArm = new THREE.Mesh(armGeo, mat);
    rArm.position.set(16, 30, 0);
    group.add(rArm);
    if (isZombie) { lArm.rotation.x = -Math.PI/2; rArm.rotation.x = -Math.PI/2; }
    
    // Legs
    const legGeo = new THREE.BoxGeometry(10, 24, 10);
    const lLeg = new THREE.Mesh(legGeo, mat);
    lLeg.position.set(-6, 12, 0); 
    group.add(lLeg);
    const rLeg = new THREE.Mesh(legGeo, mat);
    rLeg.position.set(6, 12, 0);
    group.add(rLeg);

    group.castShadow = true;
    group.userData = { lArm, rArm, lLeg, rLeg, head, isHumanoid: true, isZombie };
    return group;
}

function animateHumanoid(mesh, speedMult) {
    if (!mesh || !mesh.userData || !mesh.userData.isHumanoid) return;
    const time = Date.now() * 0.01 * speedMult;
    const angle = Math.sin(time) * 0.5;
    
    mesh.userData.lLeg.rotation.x = angle;
    mesh.userData.rLeg.rotation.x = -angle;
    
    if (!mesh.userData.isZombie) {
        mesh.userData.lArm.rotation.x = -angle;
        mesh.userData.rArm.rotation.x = angle;
    }
}


// ══════════════════════════════════════════════════════
// AUDIO ENGINE (Web Audio API)
// ══════════════════════════════════════════════════════
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function initAudio() {
  if (!audioCtx) audioCtx = new AudioCtx();
}

function playSound(type) {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;

  // 📱 HAPTIC FEEDBACK (Vibration for Mobile)
  if (['player_hit', 'explosion', 'grenade_throw'].includes(type) && navigator.vibrate) {
      navigator.vibrate(type === 'player_hit' ? 50 : 100);
  }

  switch(type) {
    case 'shoot_auto': {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(now); osc.stop(now + 0.12);
      break;
    }
    case 'shoot_shotgun': {
      const bufSize = audioCtx.sampleRate * 0.15;
      const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
      const data = buf.getChannelData(0);
      for(let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
      const src = audioCtx.createBufferSource();
      const gain = audioCtx.createGain();
      src.buffer = buf; src.connect(gain); gain.connect(audioCtx.destination);
      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      src.start(now);
      break;
    }
    case 'shoot_sniper': {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.2);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(now); osc.stop(now + 0.25);
      break;
    }
    case 'reload': {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(300, now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(now); osc.stop(now + 0.08);
      break;
    }
    case 'zombie_die': {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.linearRampToValueAtTime(20, now + 0.2);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(now); osc.stop(now + 0.3);
      break;
    }
    case 'player_hit': {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(80, now);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(now); osc.stop(now + 0.2);
      break;
    }
    case 'grenade_explode': {
      const bufSize = audioCtx.sampleRate * 0.5;
      const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
      const data = buf.getChannelData(0);
      for(let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (audioCtx.sampleRate * 0.08));
      const src = audioCtx.createBufferSource();
      const gain = audioCtx.createGain();
      src.buffer = buf; src.connect(gain); gain.connect(audioCtx.destination);
      gain.gain.setValueAtTime(1.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      src.start(now);
      break;
    }
  }
}

// ══════════════════════════════════════════════════════
// GAME CONSTANTS & STATE
// ══════════════════════════════════════════════════════
const player = {
  x: 0, y: 16, z: 0,
  vy: 0, isGrounded: true,
  r: 16, speed: 4.5, baseSpeed: 4.5,
  hp: 100, maxHp: 100,
  angle: 0, invincible: 0,
  weapon: 'auto',
  autoAmmo: 30, autoMaxAmmo: 30, autoReloading: 0,
  shotgunAmmo: 8, shotgunMaxAmmo: 8, shotgunReloading: 0,
  sniperAmmo: 5, sniperMaxAmmo: 5, sniperReloading: 0,
  shootCooldown: 0, knifeCooldown: 0, knifeActive: 0,
  grenades: 3, maxGrenades: 3, grenadeCooldown: 0,
  rocketAmmo: 0, rocketMaxAmmo: 10,
  shield: 0
};

let highScore = 0;

let wantedLevel = 0;
let policeCars = [];
let policeMeshes = new Map();
let jumpRequest = false, sprintActive = false;

let zombies = [], powerups = [];
let grenades = [];
let state = 'idle', paused = false;
let score = 0, wave = 1, kills = 0, frameCount = 0;
let killStreak = 0, streakTimer = 0, streakMultiplier = 1, bestStreak = 0;
let viewMode = 'std'; // 'std' (behind) or 'tactical' (top)
let spawnInterval;
let activeMission = null;
let missionStep = 0;
let waypointMesh = null;
let zoomDist = 600;
let camYaw = 0;
let camPitch = 0.2;

const ARENA_SIZE = 16000;

function checkBuildingCollision(x, z, r) {
    for (const b of buildings) {
        const distX = Math.abs(x - b.x);
        const distZ = Math.abs(z - b.z);

        if (distX > (b.w + r)) continue;
        if (distZ > (b.d + r)) continue;

        if (distX <= b.w || distZ <= b.d) return true;

        const cornerDist = Math.pow(distX - b.w, 2) + Math.pow(distZ - b.d, 2);
        if (cornerDist <= r * r) return true;
    }
    return false;
}

// ══════════════════════════════════════════════════════
// INPUT HANDLING
// ══════════════════════════════════════════════════════
const keys = {};
let mouseX = 0, mouseY = 0, mouseDown = false;

document.addEventListener('keydown', e => {
  keys[e.code] = true;
  if(['Space', 'Tab'].includes(e.code)) e.preventDefault();
  if(e.code === 'Escape') togglePause();
  if(state !== 'playing' || paused) return;
  if(e.code === 'Tab') { 
      switchWeapon();
  }

  if(e.code === 'KeyR') startReload();
  if(e.code === 'KeyQ') tryKnife();
  if(e.code === 'KeyG') throwGrenade();
  if(e.code === 'KeyF') toggleVehicle();
  if(e.code === 'KeyV') switchCamera();
});
document.addEventListener('keyup', e => { keys[e.code] = false; });

window.addEventListener('mousemove', e => {
    if (document.pointerLockElement === document.body) {
        camYaw -= e.movementX * 0.003;
        camPitch = Math.max(-0.2, Math.min(1.2, camPitch - e.movementY * 0.003));
    } else {
        mouseX = (e.clientX / window.innerWidth) * 2 - 1;
        mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    }
});
window.addEventListener('mousedown', () => { 
    initAudio(); 
    mouseDown = true; 
    if (!('ontouchstart' in window) && state === 'playing') document.body.requestPointerLock();
});
window.addEventListener('mouseup', () => { mouseDown = false; });
window.addEventListener('wheel', e => {
    zoomDist = Math.max(300, Math.min(1500, zoomDist + e.deltaY * 0.5));
});

function switchCamera() {
    viewMode = viewMode === 'std' ? 'tactical' : 'std';
    showMsg('VIEW: ' + viewMode.toUpperCase());
}

const joyMove = { active: false, id: null, top: 0, left: 0, dx: 0, dy: 0 };
const joyAim  = { active: false, id: null, top: 0, left: 0, dx: 0, dy: 0 };

function initMobileControls() {
    if (!('ontouchstart' in window)) return;
    
    document.querySelectorAll('.joystick-container').forEach(el => el.style.display = 'block');
    document.getElementById('mobile-buttons').style.display = 'flex';
    if(document.getElementById('controls-hint')) document.getElementById('controls-hint').style.display = 'none';
    
    const setupJoystick = (stickId, knobId, joyState) => {
        const stick = document.getElementById(stickId);
        const knob = document.getElementById(knobId);
        if(!stick || !knob) return;
        
        stick.addEventListener('touchstart', e => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            joyState.active = true;
            joyState.id = touch.identifier;
            
            const rect = stick.getBoundingClientRect();
            joyState.top = rect.top + rect.height/2;
            joyState.left = rect.left + rect.width/2;
            updateKnob(touch, knob, joyState);
            if (stickId === 'stick-aim') { initAudio(); mouseDown = true; }
        }, {passive: false});
        
        stick.addEventListener('touchmove', e => {
            e.preventDefault();
            for(let i=0; i<e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if(touch.identifier === joyState.id) {
                    updateKnob(touch, knob, joyState);
                }
            }
        }, {passive: false});
        
        const endTouch = e => {
            for(let i=0; i<e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if(touch.identifier === joyState.id) {
                    joyState.active = false;
                    joyState.id = null;
                    joyState.dx = 0; joyState.dy = 0;
                    knob.style.transform = `translate(0px, 0px)`;
                    if (stickId === 'stick-aim') { mouseDown = false; }
                }
            }
        };
        stick.addEventListener('touchend', endTouch);
        stick.addEventListener('touchcancel', endTouch);
        
        function updateKnob(touch, k, s) {
            let dx = touch.clientX - s.left;
            let dy = touch.clientY - s.top;
            const dist = Math.hypot(dx, dy);
            const maxDist = 40;
            if(dist > maxDist) {
                dx = (dx/dist) * maxDist;
                dy = (dy/dist) * maxDist;
            }
            k.style.transform = `translate(${dx}px, ${dy}px)`;
            s.dx = dx / maxDist;
            s.dy = dy / maxDist;
        }
    };
    
    setupJoystick('stick-move', 'knob-move', joyMove);
    
    // 📱 RIGHT-SIDE SWIPE LOOK SYSTEM (Professional Mobile Controls)
    let touchLookId = null;
    let lastTouchX = 0, lastTouchY = 0;

    window.addEventListener('touchstart', e => {
        for(let i=0; i<e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            // Right half of screen AND not on a button
            if (t.clientX > window.innerWidth / 2 && !e.target.closest('.m-btn')) {
                touchLookId = t.identifier;
                lastTouchX = t.clientX;
                lastTouchY = t.clientY;
                mouseDown = true;
                joyAim.active = true;
                initAudio();
            }
        }
    }, {passive: false});

    window.addEventListener('touchmove', e => {
        if (touchLookId === null) return;
        for(let i=0; i<e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            if (t.identifier === touchLookId) {
                const dx = t.clientX - lastTouchX;
                const dy = t.clientY - lastTouchY;
                
                const sens = 0.006;
                camYaw -= dx * sens;
                camPitch = Math.max(-0.3, Math.min(0.8, camPitch - dy * sens));
                
                lastTouchX = t.clientX;
                lastTouchY = t.clientY;
            }
        }
    }, {passive: false});


    const endLook = e => {
        for(let i=0; i<e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            if (t.identifier === touchLookId) {
                touchLookId = null;
                mouseDown = false;
                joyAim.active = false;
            }
        }
    };

    window.addEventListener('touchend', endLook);
    window.addEventListener('touchcancel', endLook);

    
    const bindBtn = (id, action) => {
        const btn = document.getElementById(id);
        if(!btn) return;
        btn.addEventListener('touchstart', e => { e.preventDefault(); action(); initAudio(); }, {passive: false});
    };
    
    bindBtn('btn-view', switchCamera);
    bindBtn('btn-reload', startReload);
    bindBtn('btn-knife', tryKnife);
    bindBtn('btn-gren', throwGrenade);
    bindBtn('btn-switch', switchWeapon);
    bindBtn('btn-drive', toggleVehicle);
}

function switchWeapon() {
    const w = player.weapon;
    const cycle = ['auto', 'shotgun', 'sniper', 'rocket', 'katana', 'flame', 'minigun'];
    let idx = cycle.indexOf(w);
    player.weapon = cycle[(idx + 1) % cycle.length];
    updateWeaponUI(); 
    updatePlayerWeaponMesh();
    showMsg("WEAPON: " + player.weapon.toUpperCase());
}

window.addEventListener('load', initMobileControls);

// ══════════════════════════════════════════════════════
// DRIVING SYSTEM
// ══════════════════════════════════════════════════════
function findNearestCar() {
    let nearest = null;
    let minDist = 300;
    policeCars.forEach(c => {
        const d = Math.hypot(player.x - c.x, player.z - c.z);
        if (d < minDist) { minDist = d; nearest = c; }
    });
    return nearest;
}

function toggleVehicle() {
    if (playerDriving) {
        playerDriving = false;
        playerMesh.visible = true;
        player.x += 100; // Exit to side
        currentCar = null;
        carSpeed = 0;
        const btn = document.getElementById('btn-drive');
        if(btn) btn.innerText = 'DRIVE';
        showMsg("DRIVING: EXIT");
    } else {
        const car = findNearestCar();
        if (car) {
            playerDriving = true;
            currentCar = car;
            playerMesh.visible = false;
            const btn = document.getElementById('btn-drive');
            if(btn) btn.innerText = 'EXIT';
            showMsg("DRIVING: INITIATED");
            playSound('reload');
        } else {
            showMsg("NO VEHICLE NEARBY");
        }
    }
}

// ══════════════════════════════════════════════════════
// GAME LOGIC UPDATES
// ══════════════════════════════════════════════════════
function update(time) {
  if (state !== 'playing' || paused) return;
  frameCount++;
  updateEnvironment();

  // Raw Inputs (Movement)
  let mdx = 0, mdy = 0;
  if(joyMove.active) { mdx = joyMove.dx; mdy = joyMove.dy; }
  else {
      if(keys['KeyA']) mdx -= 1;
      if(keys['KeyD']) mdx += 1;
      if(keys['KeyW']) mdy -= 1;
      if(keys['KeyS']) mdy += 1;
      if(mdx && mdy) { mdx *= 0.707; mdy *= 0.707; }
  }

  if (playerDriving && currentCar) {
      // 🚗 VEHICLE PHYSICS
      let speedCap = currentCar.type === 'sports' ? 24 : currentCar.type === 'truck' ? 12 : 18;
      
      // Water slowdown (x > 6000 is water quadrant)
      if (player.x > 6000) speedCap *= 0.3;

      if (mdy < 0) carSpeed = Math.min(speedCap, carSpeed + 0.5); // Accel
      else if (mdy > 0) carSpeed = Math.max(-8, carSpeed - 0.5); // Reverse/Brake
      else carSpeed *= 0.98; // Friction

      if (Math.abs(carSpeed) > 1) {
          const steerDir = carSpeed > 0 ? 1 : -1;
          if (mdx < 0) currentCar.zRotation = (currentCar.zRotation || 0) + 0.05 * steerDir;
          if (mdx > 0) currentCar.zRotation = (currentCar.zRotation || 0) - 0.05 * steerDir;
      }

      const vx = Math.sin(currentCar.zRotation || 0) * carSpeed;
      const vz = Math.cos(currentCar.zRotation || 0) * carSpeed;
      
      const nx = currentCar.x + vx;
      const nz = currentCar.z + vz;
      
      if (!checkBuildingCollision(nx, currentCar.z, currentCar.r)) currentCar.x = nx;
      else carSpeed *= 0.5;
      if (!checkBuildingCollision(currentCar.x, nz, currentCar.r)) currentCar.z = nz;
      else carSpeed *= 0.5;

      player.x = currentCar.x;
      player.z = currentCar.z;
      
      const m = policeMeshes.get(currentCar);
      if (m) {
          m.position.set(currentCar.x, 0, currentCar.z);
          m.rotation.y = currentCar.zRotation || 0;
      }

      // 💥 Road Combat: Run over Zombies/NPCs
      if (Math.abs(carSpeed) > 5) {
          zombies.forEach(z => {
              if (Math.hypot(z.x - currentCar.x, z.z - currentCar.z) < 80) dieZombie(z);
          });
          npcs.forEach(n => {
              if (Math.hypot(n.x - currentCar.x, n.z - currentCar.z) < 80) dieNPC(n);
          });
      }
  } else {
      // 🚶 CHARACTER MOVEMENT
      const isSprinting = keys['ShiftLeft'] || keys['ShiftRight'] || sprintActive;
      player.speed = isSprinting ? player.baseSpeed * 1.8 : player.baseSpeed;
      const speedMult = (player.weapon === 'sniper' && player.shootCooldown > 30) ? 0.5 : 
                        (player.weapon === 'minigun' && mouseDown) ? 0.4 : 1;


      const forwardX = Math.sin(camYaw);
      const forwardZ = Math.cos(camYaw);
      const rightX = Math.cos(camYaw);
      const rightZ = -Math.sin(camYaw);

      let worldMoveX = (mdy * -forwardX) + (mdx * rightX);
      let worldMoveZ = (mdy * -forwardZ) + (mdx * rightZ);

      const mag = Math.hypot(worldMoveX, worldMoveZ);
      if (mag > 1) { worldMoveX /= mag; worldMoveZ /= mag; }

      const nx = Math.max(-ARENA_SIZE/2, Math.min(ARENA_SIZE/2, player.x + worldMoveX * player.speed * speedMult));
      const nz = Math.max(-ARENA_SIZE/2, Math.min(ARENA_SIZE/2, player.z + worldMoveZ * player.speed * speedMult));
      
      if (!checkBuildingCollision(nx, player.z, player.r)) player.x = nx;
      if (!checkBuildingCollision(player.x, nz, player.r)) player.z = nz;

      // Jump & Gravity
      if ((keys['Space'] || jumpRequest) && player.isGrounded) {
          player.vy = 12; player.isGrounded = false; jumpRequest = false;
      }
      if (!player.isGrounded) {
          player.vy -= 0.6; player.y += player.vy;
          if (player.y <= 16) { player.y = 16; player.vy = 0; player.isGrounded = true; }
      }

      // Player Orientation
        if (joyAim.active || document.pointerLockElement === document.body) {
            player.angle = camYaw;
        }


        // 🚁 HELI AUTO-AIM (Mobile Experience Fix)
        if (helis.length > 0 && joyAim.active) {
            const h = helis[0];
            const dist = Math.hypot(h.x - player.x, h.z - player.z);
            if (dist < 1500) {
                const angToH = Math.atan2(h.x - player.x, h.z - player.z);
                const diff = (angToH - player.angle);
                // Wrap angle difference
                const wrappedDiff = Math.atan2(Math.sin(diff), Math.cos(diff));
                if (Math.abs(wrappedDiff) < 0.5) { // Within 30 degree cone
                    player.angle += wrappedDiff * 0.15; // Soft Snap
                    camYaw = player.angle;
                }
            }
        }
    }


  // Update Visuals
  playerMesh.position.set(player.x, player.y - 16, player.z);
  playerMesh.rotation.y = player.angle;
  if (!playerDriving && (mdx || mdy)) animateHumanoid(playerMesh, (keys['ShiftLeft'] || sprintActive) ? 2.5 : 1.5);

  // Camera Follow
  const targetX = player.x, targetZ = player.z;
  if(viewMode === 'tactical') {
      camera.position.lerp(new THREE.Vector3(targetX, 800, targetZ + 400), 0.1);
      camera.lookAt(targetX, 0, targetZ);
  } else {
      const tx = targetX - Math.sin(camYaw) * zoomDist * Math.cos(camPitch);
      const tz = targetZ - Math.cos(camYaw) * zoomDist * Math.cos(camPitch);
      let ty = (playerDriving ? 150 : 100) + Math.sin(camPitch) * zoomDist + 150; 
      ty = Math.max(40, ty); // Prevent camera from going underground
      camera.position.lerp(new THREE.Vector3(tx, ty, tz), 0.1); 
      camera.lookAt(targetX, playerDriving ? 40 : 100, targetZ);
  }

  // Update Entities
  if (!playerDriving && mouseDown && player.shootCooldown <= 0) shoot();
  if(player.shootCooldown > 0) player.shootCooldown--;
  if(player.invincible > 0) player.invincible--;

  updateParticles();
  updateClouds();
  updateBirds();
  updateZombies();
  updateNPCs();
  updatePoliceCars();
  updateHelis();
  updateBullets();

  updateGrenades();
  checkPowerups();
  updateCooldowns();
  updateMissions();
  if (player.shield > 0) player.shield--;

  if(zombies.length === 0 && zombiesLeft === 0) {
      wave++; startWave(wave); saveGame();
  }

  if (frameCount % 10 === 0) {
      updateMinimap();
      // Light Throttling: Only nearest 6 lights
      streetLights.forEach(sl => {
          const d = Math.hypot(player.x - sl.x, player.z - sl.z);
          sl.light.visible = (d < 1200);
      });
  }
  updateHUD();
  updateWantedStars();
}

function shoot() {
    if(player.weapon === 'auto') {
        if(player.autoAmmo <= 0 || player.autoReloading > 0) return;
        createBullet(player.x, player.z, player.angle, 20, 25);
        player.autoAmmo--;
        player.shootCooldown = 6;
        playSound('shoot_auto');
    } else if(player.weapon === 'shotgun') {
        if(player.shotgunAmmo <= 0 || player.shotgunReloading > 0) return;
        for(let a = -0.2; a <= 0.2; a += 0.1) createBullet(player.x, player.z, player.angle + a, 18, 15);
        player.shotgunAmmo--;
        player.shootCooldown = 25;
        playSound('shoot_shotgun');
    } else if(player.weapon === 'sniper') {
        if(player.sniperAmmo <= 0 || player.sniperReloading > 0) return;
        createBullet(player.x, player.z, player.angle, 40, 150, true);
        player.sniperAmmo--;
        player.shootCooldown = 50;
        playSound('shoot_sniper');
    } else if(player.weapon === 'rocket') {
        if(player.rocketAmmo <= 0) return;
        createBullet(player.x, player.z, player.angle, 15, 200, false, true);
        player.rocketAmmo--;
        player.shootCooldown = 60;
        playSound('grenade_throw');
    } else if(player.weapon === 'katana') {
        // Melee Attack: Sweep 150 degree arc
        player.shootCooldown = 20;
        playSound('knife');
        zombies.forEach(z => {
            const d = Math.hypot(z.x - player.x, z.z - player.z);
            if (d < 150) {
                const angToZ = Math.atan2(z.x - player.x, z.z - player.z);
                const diff = Math.abs(player.angle - angToZ);
                if (diff < 1.3) { // Front arc
                    z.hp -= 200; z.hitTimer = 10;
                    if (z.hp <= 0) dieZombie(z);
                    spawnParticles(z.x, 16, z.z, 0xff0000, 10);
                }
            }
        });
    } else if(player.weapon === 'flame') {
        // Area Fire: Cone stream
        player.shootCooldown = 2;
        spawnParticles(player.x + Math.sin(player.angle)*50, 16, player.z + Math.cos(player.angle)*50, 0xffaa00, 5);
        zombies.forEach(z => {
            const d = Math.hypot(z.x - player.x, z.z - player.z);
            if (d < 250) {
                const angToZ = Math.atan2(z.x - player.x, z.z - player.z);
                if (Math.abs(player.angle - angToZ) < 0.6) {
                    z.hp -= 10; z.hitTimer = 5;
                    if (z.hp <= 0) dieZombie(z);
                }
            }
        });
    } else if(player.weapon === 'minigun') {
        // Extreme Fire rate
        createBullet(player.x, player.z, player.angle + (Math.random()-0.5)*0.1, 25, 30);
        player.shootCooldown = 3;
        playSound('shoot_auto');
    }

    
    // Gunshot Aggro: Wake up nearby idle zombies
    zombies.forEach(z => {
        if (z.mode === 'idle' && Math.hypot(z.x - player.x, z.z - player.z) < 1500) {
            z.mode = 'chase';
        }
    });

    updateWeaponUI();
    updatePlayerWeaponMesh();
    
    // 📱 MOBILE UX: Auto-Reload when empty
    if(getCurrentAmmo() <= 0 && player.weapon !== 'rocket' && player.weapon !== 'katana') {
        startReload();
    }
}


function updatePlayerWeaponMesh() {
    if (!playerGunMesh) return;
    const w = player.weapon;
    if (w === 'auto') {
        playerGunMesh.scale.set(1, 1, 1);
        playerGunMesh.material.color.setHex(0x222222);
    } else if (w === 'shotgun') {
        playerGunMesh.scale.set(1.5, 1.2, 0.8);
        playerGunMesh.material.color.setHex(0x442200);
    } else if (w === 'sniper') {
        playerGunMesh.scale.set(0.8, 0.8, 2.0);
        playerGunMesh.material.color.setHex(0x002244);
    } else if (w === 'rocket') {
        playerGunMesh.scale.set(2.5, 2.5, 1.5);
        playerGunMesh.material.color.setHex(0x224400);
    } else if (w === 'katana') {
        playerGunMesh.scale.set(0.2, 0.2, 4.0);
        playerGunMesh.material.color.setHex(0xcccccc);
    } else if (w === 'flame') {
        playerGunMesh.scale.set(1.5, 1.8, 1.2);
        playerGunMesh.material.color.setHex(0xffaa00);
    } else if (w === 'minigun') {
        playerGunMesh.scale.set(1.8, 1.8, 2.5);
        playerGunMesh.material.color.setHex(0x111111);
    }

}

function throwGrenade() {
    if(player.grenades <= 0 || player.grenadeCooldown > 0) return;
    player.grenades--;
    player.grenadeCooldown = 30;
    playSound('grenade_throw');
    
    const g = {
        x: player.x, z: player.z,
        dx: Math.sin(player.angle) * 10, dz: Math.cos(player.angle) * 10,
        life: 60, r: 10
    };
    grenades.push(g);
    
    const geo = new THREE.BoxGeometry(10, 10, 10);
    const mat = new THREE.MeshPhongMaterial({ color: 0x33ff66 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(g.x, 16, g.z);
    scene.add(mesh);
    g.mesh = mesh;
    updateGrenadeUI();
}

function tryKnife() {
    if(player.knifeCooldown > 0) return;
    player.knifeCooldown = 30;
    playSound('knife');
    zombies.forEach(z => {
        const d = Math.hypot(player.x - z.x, player.z - z.z);
        if(d < 80) {
            z.hp -= 100;
            z.hitTimer = 10;
            if(z.hp <= 0) dieZombie(z);
        }
    });
    npcs.forEach(n => {
        const d = Math.hypot(player.x - n.x, player.z - n.z);
        if(d < 80) {
            n.hp -= 100;
            if(n.hp <= 0) dieNPC(n);
        }
    });
}

function createBullet(x, z, angle, speed, dmg, piercing = false, isRocket = false, isHeli = false) {
    const b = {
        x, z, dx: Math.sin(angle) * speed, dz: Math.cos(angle) * speed,
        dmg, piercing, isRocket, isHeli, 
        life: isRocket ? 200 : 100, owner: isHeli ? 'heli' : 'player'
    };
    
    const geo = isRocket ? new THREE.BoxGeometry(10, 10, 20) : new THREE.SphereGeometry(isHeli ? 8 : (piercing ? 6 : 4));
    const mat = new THREE.MeshBasicMaterial({ 
        color: isHeli ? 0xffff00 : (isRocket ? 0xff4400 : (piercing ? 0x00ffff : 0xffffff)) 
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, isHeli ? 500 : 16, z);
    mesh.rotation.y = angle;
    scene.add(mesh);
    bulletMeshes.push({ data: b, mesh: mesh });

    // Muzzle Flash
    spawnParticles(x + Math.sin(angle)*20, isHeli ? 500 : 16, z + Math.cos(angle)*20, 0xffff00, 5);
}


function updateBullets() {
    for(let i = bulletMeshes.length - 1; i >= 0; i--) {
        const bm = bulletMeshes[i];
        bm.data.x += bm.data.dx;
        bm.data.z += bm.data.dz;
        bm.data.life--;
        bm.mesh.position.set(bm.data.x, 16, bm.data.z);
        
        // Collision with zombies
        let hit = false;
        zombies.forEach(z => {
            const d = Math.hypot(z.x - bm.data.x, z.z - bm.data.z);
            if(d < z.r + 10) {
                z.hp -= bm.data.dmg;
                z.hitTimer = 5;
                if(!bm.data.piercing) hit = true;
                if(z.hp <= 0) dieZombie(z);
            }
        });

        npcs.forEach(n => {
            const d = Math.hypot(n.x - bm.data.x, n.z - bm.data.z);
            if(d < n.r + 10) {
                n.hp -= bm.data.dmg;
                if(!bm.data.piercing) hit = true;
                if(n.hp <= 0) dieNPC(n);
            }
        });

        policeCars.forEach(c => {
            const d = Math.hypot(c.x - bm.data.x, c.z - bm.data.z);
            if(d < c.r + 10) {
                c.hp -= bm.data.dmg;
                if(!bm.data.piercing) hit = true;
                if (c.hp <= 0) explodePolice(c);
            }
        });

        // 💥 Damage Heli (Player bullets only)
        if (bm.data.owner === 'player') {
            helis.forEach(h => {
                const d = Math.hypot(h.x - bm.data.x, h.z - bm.data.z);
                if (d < 100) { 
                    h.hp -= bm.data.dmg;
                    hit = true;
                }
            });
        }

        // 💥 Damage Player (Heli bullets only)
        if (bm.data.owner === 'heli') {
            const d = Math.hypot(player.x - bm.data.x, player.z - bm.data.z);
            if (d < player.r + 10 && player.invincible <= 0) {
                if (player.shield <= 0) player.hp -= bm.data.dmg;
                player.invincible = 30;
                hit = true;
                playSound('player_hit');
                if (navigator.vibrate) navigator.vibrate(50); // Haptic Hit
                if (player.hp <= 0) endGame();
            }
        }




        const hitBuilding = checkBuildingCollision(bm.data.x, bm.data.z, 2);
        if(bm.data.life <= 0 || hit || hitBuilding || Math.abs(bm.data.x) > ARENA_SIZE/2 || Math.abs(bm.data.z) > ARENA_SIZE/2) {
            if (bm.data.isRocket || (hitBuilding && !hit)) {
                spawnParticles(bm.data.x, 16, bm.data.z, 0xaaaa00, 10); // Sparks
            }
            if (bm.data.isRocket) explodeGrenade(bm.data.x, bm.data.z);
            
            scene.remove(bm.mesh);
            bulletMeshes.splice(i, 1);
        }
    }
}

function updateZombies() {
    zombies.forEach(z => {
        const zMesh = zombieMeshes.get(z);
        const dist = Math.hypot(player.x - z.x, player.z - z.z);

        // Proximity Culling: Sleep if far
        if (dist > 3000) {
            zMesh.visible = false;
            return;
        }
        zMesh.visible = true;

        
        // Aggro Check
        if (z.mode === 'idle') {
            if (dist < 700) z.mode = 'chase'; // Detect by proximity
            else {
                // Idle Wander logic
                z.x += Math.sin(z.angle) * (z.speed * 0.3);
                z.z += Math.cos(z.angle) * (z.speed * 0.3);
                if (Math.random() < 0.02) z.angle = Math.random() * Math.PI * 2;
                // Keep near home
                if (Math.hypot(z.x - z.homeX, z.z - z.homeZ) > 400) {
                    z.angle = Math.atan2(z.homeX - z.x, z.homeZ - z.z);
                }
            }
        }

        if (z.mode === 'chase') {
            const ang = Math.atan2(player.x - z.x, player.z - z.z);
            const nx = z.x + Math.sin(ang) * z.speed;
            const nz = z.z + Math.cos(ang) * z.speed;
            if (!checkBuildingCollision(nx, z.z, z.r)) z.x = nx;
            if (!checkBuildingCollision(z.x, nz, z.r)) z.z = nz;
            z.angle = ang;
        }
        
        zMesh.position.set(z.x, 0, z.z);
        zMesh.rotation.y = z.angle;
        animateHumanoid(zMesh, z.mode === 'idle' ? 0.3 : 0.8);
        
        if(z.hitTimer > 0) {
            z.hitTimer--;
            zMesh.children.forEach(c => { if(c.material) c.material.emissive.setHex(0xff0000); });
        } else {
            zMesh.children.forEach(c => { if(c.material) c.material.emissive.setHex(0x000000); });
        }


        // Damage player
        if(player.invincible <= 0 && z.mode === 'chase') {
            if(dist < player.r + z.r) {
                player.hp -= 10;
                player.invincible = 30;
                playSound('player_hit');
                if(player.hp <= 0) endGame();
            }
        }
    });
}

function updateGrenades() {
    for(let i = grenades.length - 1; i >= 0; i--) {
        const g = grenades[i];
        g.x += g.dx;
        g.z += g.dz;
        g.dx *= 0.95; g.dz *= 0.95;
        g.life--;
        g.mesh.position.set(g.x, 16 + Math.sin(g.life * 0.2) * 10, g.z);
        g.mesh.rotation.x += 0.1;
        
        if(g.life <= 0) {
            explodeGrenade(g.x, g.z);
            scene.remove(g.mesh);
            grenades.splice(i, 1);
        }
    }
}

function explodeGrenade(x, z) {
    playSound('grenade_explode');
    const radius = 200;
    zombies.forEach(zombie => {
        const d = Math.hypot(x - zombie.x, z - zombie.z);
        if(d < radius) {
            zombie.hp -= 200 * (1 - d/radius);
            zombie.hitTimer = 10;
            if(zombie.hp <= 0) dieZombie(zombie);
        }
    });
    npcs.forEach(n => {
        const d = Math.hypot(x - n.x, z - n.z);
        if(d < radius) {
            n.hp -= 200 * (1 - d/radius);
            if(n.hp <= 0) dieNPC(n);
        }
    });
    policeCars.forEach(c => {
        const d = Math.hypot(x - c.x, z - c.z);
        if(d < radius) {
            c.hp -= 200 * (1 - d/radius);
            if(c.hp <= 0) explodePolice(c);
        }
    });
    // Visual flash
    const geo = new THREE.SphereGeometry(radius, 32, 32);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.5 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 16, z);
    scene.add(mesh);
    setTimeout(() => scene.remove(mesh), 100);
}

function spawnPowerup(x, z) {
    const type = Math.random() > 0.5 ? 'health' : 'ammo';
    const p = { x, z, type, r: 15 };
    powerups.push(p);
    
    const geo = new THREE.OctahedronGeometry(15);
    const mat = new THREE.MeshPhongMaterial({ color: type === 'health' ? 0x00ff00 : 0xffff00 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 16, z);
    scene.add(mesh);
    p.mesh = mesh;
}

function checkPowerups() {
    for(let i = powerups.length - 1; i >= 0; i--) {
        const p = powerups[i];
        p.mesh.rotation.y += 0.05;
        p.mesh.position.y = 16 + Math.sin(Date.now() * 0.005) * 5;
        
        const d = Math.hypot(player.x - p.x, player.z - p.z);
        if(d < player.r + p.r) {
            if(p.type === 'health') player.hp = Math.min(player.maxHp, player.hp + 50);
            else {
                player.autoAmmo = player.autoMaxAmmo;
                player.shotgunAmmo = player.shotgunMaxAmmo;
                player.sniperAmmo = player.sniperMaxAmmo;
            }
            playSound('powerup');
            scene.remove(p.mesh);
            powerups.splice(i, 1);
            updateHUD();
            updateWeaponUI();
        }
    }
}

function dieZombie(z) {
    const idx = zombies.indexOf(z);
    if(idx > -1) {
        zombies.splice(idx, 1);
        const mesh = zombieMeshes.get(z);
        scene.remove(mesh);
        zombieMeshes.delete(z);
        kills++;
        score += 100;
        playSound('zombie_die');
        if(Math.random() > 0.8) spawnPowerup(z.x, z.z);
    }
}

let zombiesLeft = 0;
function startWave(w) {
    wave = w;
    zombiesLeft = 5 + w * 2;
    showMsg("WAVE " + w);
    spawnInterval = setInterval(() => {
        if(zombiesLeft > 0) {
            spawnZombie();
            zombiesLeft--;
        } else {
            clearInterval(spawnInterval);
        }
    }, 1000);
}

function createInfestedZones(count) {
    for(let i=0; i<count; i++) {
        const zx = (Math.random()-0.5)*ARENA_SIZE;
        const zz = (Math.random()-0.5)*ARENA_SIZE;
        if (Math.abs(zx) < 1000 && Math.abs(zz) < 1000) continue; // Clear from player start
        if (checkBuildingCollision(zx, zz, 200)) continue;

        const clusterSize = 5 + Math.floor(Math.random()*8);
        for(let j=0; j<clusterSize; j++) {
            const ox = (Math.random()-0.5)*300;
            const oz = (Math.random()-0.5)*300;
            spawnZombie('normal', zx + ox, zz + oz);
        }
    }
}

function spawnZombie(type = 'normal', fixedX = null, fixedZ = null) {
    let nx, nz;
    if (fixedX !== null) {
        nx = fixedX; nz = fixedZ;
    } else {
        const angle = Math.random() * Math.PI * 2;
        const dist = 1000 + Math.random() * 1000;
        nx = player.x + Math.sin(angle) * dist;
        nz = player.z + Math.cos(angle) * dist;
    }
    
    if (checkBuildingCollision(nx, nz, 20)) return fixedX ? null : spawnZombie(type);

    const z = {
        x: nx, z: nz, r: 16, hp: 100,
        speed: type === 'fast' ? 3.5 : 2.2,
        hitTimer: 0,
        angle: Math.random() * Math.PI * 2,
        mode: fixedX ? 'idle' : 'chase',
        homeX: nx, homeZ: nz
    };
    if (type === 'boss') { z.hp = 1000; z.r = 40; z.speed = 1.5; z.mode = 'chase'; }
    zombies.push(z);

    const mesh = createHumanoid(type === 'fast' ? 0xff3300 : type === 'boss' ? 0x990000 : 0x00ff44, true);
    if (type === 'boss') mesh.scale.setScalar(2.5);
    mesh.position.set(nx, 0, nz);
    scene.add(mesh);
    zombieMeshes.set(z, mesh);
}

// ══════════════════════════════════════════════════════
// UI & HUD
// ══════════════════════════════════════════════════════
function updateHUD() {
    document.getElementById('hpNum').innerText = Math.max(0, Math.ceil(player.hp));
    document.getElementById('healthFill').style.width = player.hp + "%";
    document.getElementById('scoreNum').innerText = score;
    document.getElementById('waveNum').innerText = wave;
    document.getElementById('killNum').innerText = kills;
}

function updateWeaponUI() {
    const w = player.weapon;
    document.getElementById('weaponDisplay').innerText = w.toUpperCase();
    const bar = document.getElementById('ammoBar');
    bar.innerHTML = '';
    
    // Katana has infinite use/no ammo display
    if (w === 'katana') {
        bar.innerHTML = '<span style="color:var(--green);font-size:12px">READY</span>';
        return;
    }
    
    const ammo = getCurrentAmmo();
    const max = getCurrentMaxAmmo();
    if (max === Infinity || isNaN(max)) {
        bar.innerHTML = '∞';
        return;
    }
    for(let i=0; i<max; i++) {
        const pip = document.createElement('div');
        pip.className = 'ammo-pip' + (i >= ammo ? ' empty' : '');
        bar.appendChild(pip);
    }
}


function updateGrenadeUI() {
    const pips = document.getElementById('grenadePips');
    pips.innerHTML = '';
    for(let i = 0; i < player.maxGrenades; i++) {
        const d = document.createElement('div');
        d.className = 'gren-pip' + (i >= player.grenades ? ' empty' : '');
        pips.appendChild(d);
    }
}

function getCurrentAmmo() {
    return player[player.weapon + 'Ammo'];
}
function getCurrentMaxAmmo() {
    return player[player.weapon + 'MaxAmmo'];
}

function showMsg(text) {
    const hint = document.getElementById('controls-hint');
    hint.innerText = text;
    setTimeout(() => { hint.innerText = "WASD — MOVE | MOUSE — AIM & FIRE | Q — KNIFE | G — GRENADE | R — RELOAD | TAB — SWITCH | ESC — PAUSE | V — CAMERA"; }, 2000);
}

function togglePause() {
    paused = !paused;
    document.getElementById('pauseOverlay').style.display = paused ? 'flex' : 'none';
}

function startReload() {
    const w = player.weapon;
    if(player[w + 'Reloading'] > 0 || player[w + 'Ammo'] === player[w + 'MaxAmmo']) return;
    player[w + 'Reloading'] = 60;
    playSound('reload');
    showMsg("RELOADING...");
}

function updateCooldowns() {
    const armory = ['auto', 'shotgun', 'sniper', 'rocket', 'flame', 'minigun'];
    armory.forEach(w => {
        if(player[w + 'Reloading'] > 0) {
            player[w + 'Reloading']--;
            if(player[w + 'Reloading'] === 0) {
                player[w + 'Ammo'] = player[w + 'MaxAmmo'];
                updateWeaponUI();
            }
        }
    });
}


function endGame() {
    state = 'over';
    if(spawnInterval) clearInterval(spawnInterval);
    document.getElementById('overlay').style.display = 'flex';
    document.getElementById('ovScore').innerText = "INTEL: " + score;
    document.getElementById('ovScore').style.display = 'block';
    document.getElementById('startBtn').innerText = '▶ RESTART';
}

// ══════════════════════════════════════════════════════
// MAIN LOOP
// ══════════════════════════════════════════════════════
function animate() {
    requestAnimationFrame(animate);
    update();
    updateMinimap();
    renderer.render(scene, camera);
}

document.getElementById('startBtn').addEventListener('click', () => {
    document.getElementById('overlay').style.display = 'none';
    state = 'playing';
    initAudio();
    
    if (!gameInitialized) {
        init3D();
        animate();
        gameInitialized = true;
    } else {
        Object.assign(player, {
            x: 0, z: 0,
            hp: player.maxHp,
            autoAmmo: player.autoMaxAmmo,
            shotgunAmmo: player.shotgunMaxAmmo,
            sniperAmmo: player.sniperMaxAmmo,
            grenades: player.maxGrenades
        });
        score = 0; wave = 0; kills = 0;
        
        zombies.forEach(z => scene.remove(zombieMeshes.get(z)));
        zombies = []; zombieMeshes.clear();
        bulletMeshes.forEach(b => scene.remove(b.mesh));
        bulletMeshes = [];
        powerups.forEach(p => scene.remove(p.mesh));
        powerups = [];
        grenades.forEach(g => scene.remove(g.mesh));
        grenades = [];
        if(spawnInterval) clearInterval(spawnInterval);
        
        playerMesh.position.set(player.x, 16, player.z);
    }
    
    startWave(1);
    updateWeaponUI();
    updateHUD();
});

// Initialization
window.addEventListener('load', () => {
    initMobileControls();
    loadGame();
});

// ══════════════════════════════════════════════════════
// SAVE & VFX SYSTEM
// ══════════════════════════════════════════════════════
function saveGame() {
    const data = {
        score: score,
        highScore: Math.max(highScore, score),
        wave: wave
    };
    localStorage.setItem('crimeCitySave', JSON.stringify(data));
}

function loadGame() {
    const raw = localStorage.getItem('crimeCitySave');
    if (raw) {
        const data = JSON.parse(raw);
        highScore = data.highScore || 0;
        // Keep current session score/wave if desired, or reset
    }
}

function spawnParticles(x, y, z, color, count) {
    for(let i=0; i<count; i++) {
        const p = {
            x, y, z,
            dx: (Math.random()-0.5)*15,
            dy: (Math.random())*10,
            dz: (Math.random()-0.5)*15,
            life: 20 + Math.random()*20,
            color: color
        };
        const geo = new THREE.BoxGeometry(4, 4, 4);
        const mat = new THREE.MeshBasicMaterial({ color: color });
        const mesh = new THREE.Mesh(geo, mat);
        p.mesh = mesh;
        scene.add(mesh);
        particles.push(p);
    }
}

function updateParticles() {
    for(let i=particles.length-1; i>=0; i--) {
        const p = particles[i];
        p.x += p.dx; p.y += p.dy; p.z += p.dz;
        p.dy -= 0.5; // Gravity
        p.life--;
        p.mesh.position.set(p.x, p.y, p.z);
        p.mesh.scale.setScalar(p.life/40);
        if (p.life <= 0) {
            scene.remove(p.mesh);
            particles.splice(i, 1);
        }
    }
}

// ══════════════════════════════════════════════════════
// POLICE & SHOP SYSTEM
// ══════════════════════════════════════════════════════
function updateWantedStars() {
    const el = document.getElementById('wantedStars');
    let stars = "";
    for(let i=0; i<5; i++) stars += i < wantedLevel ? "★" : "☆";
    el.innerText = stars;
}

function spawnVehicle(type = 'police', nx = null, nz = null) {
    if (nx === null) {
        nx = (Math.random() - 0.5) * ARENA_SIZE;
        nz = (Math.random() - 0.5) * ARENA_SIZE;
        if (Math.hypot(nx - player.x, nz - player.z) < 1000) return spawnVehicle(type);
    }
    
    if (checkBuildingCollision(nx, nz, 100)) return spawnVehicle(type);

    const car = { 
        x: nx, z: nz, r: 60, hp: type === 'truck' ? 500 : 200, 
        speed: type === 'police' ? 6 : type === 'sports' ? 10 : 3, 
        type: type, id: Math.random(), zRotation: Math.random() * Math.PI * 2 
    };
    policeCars.push(car);
    
    const group = new THREE.Group();
    const mat = new THREE.MeshPhongMaterial({ 
        color: type === 'police' ? 0x112244 : type === 'sports' ? 0xff0066 : 0x444444 
    });
    
    const h = type === 'truck' ? 40 : 20;
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(80, h, type === 'truck' ? 180 : 140), mat);
    chassis.position.y = h/2 + 5;
    group.add(chassis);
    
    if (type === 'police') {
        const roof = new THREE.Mesh(new THREE.BoxGeometry(60, 20, 70), mat);
        roof.position.set(0, 35, -10); group.add(roof);
        const siren = new THREE.PointLight(0xff0000, 2, 200);
        siren.position.set(0, 50, -10); group.add(siren);
        group.userData.siren = siren;
    } else if (type === 'sports') {
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(60, 10, 40), new THREE.MeshPhongMaterial({ color: 0x111111 }));
        cabin.position.set(0, 20, 10); group.add(cabin);
    } else if (type === 'truck') {
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(80, 25, 50), new THREE.MeshPhongMaterial({ color: 0x222222 }));
        cabin.position.set(0, 50, 40); group.add(cabin);
    }
    
    // Wheels
    const whGeo = new THREE.CylinderGeometry(15, 15, 10, 16);
    const whMat = new THREE.MeshPhongMaterial({ color: 0x111111 });
    const positions = [[42,10,40], [-42,10,40], [42,10,-40], [-42,10,-40]];
    if(type === 'truck') positions.push([42,10,0], [-42,10,0]);

    positions.forEach(pos => {
        const wh = new THREE.Mesh(whGeo, whMat);
        wh.position.set(...pos);
        wh.rotation.z = Math.PI/2;
        group.add(wh);
    });

    group.position.set(nx, 0, nz);
    scene.add(group);
    policeMeshes.set(car, group);

    // Add POLICE Decal & Siren (Conditional)
    if (type === 'police') {
        const canvas = document.createElement('canvas');
        canvas.width = 128; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0,0,128,64);
        ctx.fillStyle = '#00f'; ctx.font = 'bold 30px Arial'; ctx.textAlign = 'center';
        ctx.fillText('POLICE', 64, 45);
        const tex = new THREE.CanvasTexture(canvas);
        const labelGeo = new THREE.PlaneGeometry(80, 25);
        const labelMat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
        const label = new THREE.Mesh(labelGeo, labelMat);
        label.position.set(41, 15, 0); label.rotation.y = Math.PI/2;
        group.add(label);
        const label2 = label.clone(); label2.position.set(-41, 15, 0);
        group.add(label2);

        const siren = new THREE.PointLight(0xff0000, 2, 200);
        siren.position.set(0, 50, -10);
        group.add(siren);
        group.userData.siren = siren;
    }
}

function initUrbanVariety() {
    for(let i=0; i<15; i++) spawnVehicle('sports');
    for(let i=0; i<8; i++) spawnVehicle('truck');
    // Initial Traffic
    for(let i=0; i<10; i++) spawnTrafficCar();
}

function spawnTrafficCar() {
    const onNS = Math.random() > 0.5;
    const nx = onNS ? (Math.random()>0.5?125:-125) : (Math.random()-0.5)*ARENA_SIZE;
    const nz = onNS ? (Math.random()-0.5)*ARENA_SIZE : (Math.random()>0.5?125:-125);
    spawnVehicle('traffic', nx, nz);
}

function updatePoliceCars() {
    if (wantedLevel > 0 && Math.random() < 0.01) spawnVehicle('police');
    if (policeCars.filter(c => c.type === 'traffic').length < 15) spawnTrafficCar();

    for (let i = policeCars.length - 1; i >= 0; i--) {
        const c = policeCars[i];
        if (playerDriving && currentCar === c) continue; 
        const m = policeMeshes.get(c);
        const distToCar = Math.hypot(player.x - c.x, player.z - c.z);

        // Proximity Culling
        if (distToCar > 4000) {
            m.visible = false;
            // Despawn traffic if too far, otherwise just hide
            if (c.type === 'traffic') {
                policeCars.splice(i, 1);
                scene.remove(m);
                policeMeshes.delete(c);
            }
            continue;
        }
        m.visible = true;


        if (c.type === 'police') {
            const ang = Math.atan2(player.x - c.x, player.z - c.z);
            c.x += Math.sin(ang) * c.speed;
            c.z += Math.cos(ang) * c.speed;
            m.rotation.y = ang;
        } else if (c.type === 'traffic') {
            // Traffic AI: Drive straight on roads
            const ang = Math.abs(c.x) < 200 ? (c.x > 0 ? 0 : Math.PI) : (c.z > 0 ? -Math.PI/2 : Math.PI/2);
            c.x += Math.sin(ang) * c.speed;
            c.z += Math.cos(ang) * c.speed;
            m.rotation.y = ang;
            // Despawn if far
            if (Math.hypot(c.x - player.x, c.z - player.z) > 4000) {
                policeCars.splice(i, 1);
                scene.remove(m);
                policeMeshes.delete(c);
                continue;
            }
        } else {
            // Static parked cars
            if(!c.zRotation) c.zRotation = Math.random()*Math.PI*2;
            m.rotation.y = c.zRotation;
        }
        
        m.position.set(c.x, 0, c.z);
        if (c.type === 'police' && m.userData.siren) {
            m.userData.siren.color.setHex(Date.now() % 400 < 200 ? 0xff0000 : 0x0011ff);
        }

        const dHit = Math.hypot(player.x - c.x, player.z - c.z);
        if (dHit < c.r + player.r && c.type === 'police' && !playerDriving) {
            if (player.shield <= 0) player.hp -= 20;
            explodePolice(c);
        }
    }
}

function explodePolice(c) {
    const idx = policeCars.indexOf(c);
    if (idx > -1) {
        policeCars.splice(idx, 1);
        scene.remove(policeMeshes.get(c));
        policeMeshes.delete(c);
        explodeGrenade(c.x, c.z);
    }
}

function openShop() {
    paused = true;
    document.getElementById('shopOverlay').style.display = 'flex';
}

function buyItem(type) {
    const prices = { health: 500, ammo: 300, grenade: 200, shield: 1000, rocket_launcher: 2500, rocket_ammo: 800 };
    if (score >= prices[type]) {
        score -= prices[type];
        if (type === 'health') player.hp = Math.min(player.maxHp, player.hp + 50);
        if (type === 'ammo') {
            player.autoAmmo = player.autoMaxAmmo;
            player.shotgunAmmo = player.shotgunMaxAmmo;
            player.sniperAmmo = player.sniperMaxAmmo;
        }
        if (type === 'grenade') player.grenades = Math.min(player.maxGrenades, player.grenades + 1);
        if (type === 'shield') player.shield = 60 * 15; // 15 seconds
        if (type === 'rocket_launcher') {
            player.rocketAmmo = player.rocketMaxAmmo;
            showMsg("ROCKET LAUNCHER UNLOCKED!");
        }
        if (type === 'rocket_ammo') {
            player.rocketAmmo = Math.min(player.rocketMaxAmmo, player.rocketAmmo + 2);
        }
        
        playSound('powerup');
        updateHUD();
    } else {
        showMsg("NOT ENOUGH INTEL");
    }
}

function dieNPC(n) {
    const idx = npcs.indexOf(n);
    if(idx > -1) {
        npcs.splice(idx, 1);
        scene.remove(npcMeshes.get(n));
        npcMeshes.delete(n);
        wantedLevel = Math.min(5, wantedLevel + 1);
        score += 200;
        playSound('player_hit');
        spawnNPC(); // Maintain population
    }
}

document.getElementById('shopBtn').addEventListener('click', openShop);
document.getElementById('shopBtn').innerHTML = '🛒 BLACK MARKET / SHOW';
document.getElementById('minimap').addEventListener('click', (e) => {
    e.currentTarget.classList.toggle('large');
});
document.getElementById('closeShop').addEventListener('click', () => { 
    document.getElementById('shopOverlay').style.display = 'none'; 
});

document.getElementById('shopBtn').addEventListener('click', () => {
    document.getElementById('shopOverlay').style.display = 'flex';
});

function buyItem(type) {
    if (type === 'health') {
        if (score >= 200) {
            score -= 200;
            player.hp = Math.min(player.maxHp, player.hp + 50);
            showMsg("HEALTH RESTORED!");
        } else showMsg("NOT ENOUGH INTEL!");
    } else if (type === 'ammo') {
        if (score >= 500) {
            score -= 500;
            player.autoAmmo = player.autoMaxAmmo;
            player.shotgunAmmo = player.shotgunMaxAmmo;
            player.sniperAmmo = player.sniperMaxAmmo;
            showMsg("AMMO REPLENISHED!");
        } else showMsg("NOT ENOUGH INTEL!");
    } else if (type === 'shield') {
        if (score >= 1000) {
            score -= 1000;
            player.invincible = 450; 
            showMsg("STIM PACK ACTIVE (15S)");
        } else showMsg("NOT ENOUGH INTEL!");
    } else if (type === 'rocket_launcher') {
        if (score >= 2500) {
            score -= 2500;
            player.hasRocket = true;
            showMsg("RPG-7 UNLOCKED!");
        } else showMsg("NOT ENOUGH INTEL!");
    } else if (type === 'rocket_ammo') {
        if (score >= 800) {
            score -= 800;
            player.rocketAmmo += 2;
            showMsg("+2 ROCKETS ADDED!");
        } else showMsg("NOT ENOUGH INTEL!");
    }
    updateHUD();
    updateWeaponUI();
}

document.getElementById('btn-jump').ontouchstart = (e) => { e.preventDefault(); jumpRequest = true; };
document.getElementById('btn-sprint').ontouchstart = (e) => { e.preventDefault(); sprintActive = true; };
document.getElementById('btn-sprint').ontouchend = (e) => { e.preventDefault(); sprintActive = false; };

function spawnHeli() {
    const h = { x: player.x + 1000, z: player.z + 1000, y: 500, hp: 800, angle: 0 };
    helis.push(h);

    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(120, 60, 200), new THREE.MeshPhongMaterial({ color: 0x112244 }));
    group.add(body);
    
    const tail = new THREE.Mesh(new THREE.BoxGeometry(40, 40, 150), new THREE.MeshPhongMaterial({ color: 0x112244 }));
    tail.position.z = -150; group.add(tail);
    
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(300, 5, 20), new THREE.MeshPhongMaterial({ color: 0x333333 }));
    rotor.position.y = 40; group.add(rotor);
    group.userData.rotor = rotor;

    const spot = new THREE.SpotLight(0xffffff, 5, 2000, 0.3);
    spot.position.set(0, -20, 50); spot.target.position.set(0, -1000, 50);
    group.add(spot); group.add(spot.target);

    scene.add(group);
    heliMeshes.set(h, group);
}

function updateHelis() {
    if (wantedLevel >= 4 && helis.length === 0) spawnHeli();

    for (let i = helis.length - 1; i >= 0; i--) {
        const h = helis[i];
        const m = heliMeshes.get(h);
        
        // Circular Orbit AI
        h.angle += 0.01;
        const targetX = player.x + Math.sin(h.angle) * 800;
        const targetZ = player.z + Math.cos(h.angle) * 800;
        h.x += (targetX - h.x) * 0.05;
        h.z += (targetZ - h.z) * 0.05;
        
        m.position.set(h.x, h.y, h.z);
        m.lookAt(player.x, player.y, player.z);
        m.userData.rotor.rotation.y += 0.5;

        // Attack Logic: Burst Fire
        if (frameCount % 60 < 20 && frameCount % 5 === 0) {
            createBullet(h.x, h.z, m.rotation.y, 25, 10, false, false, true);
        }

        if (h.hp <= 0) {
            explodeGrenade(h.x, h.z);
            scene.remove(m);
            helis.splice(i, 1);
            heliMeshes.delete(h);
        }
    }
}

function spawnNPC() {
    const angle = Math.random() * Math.PI * 2;

    const nx = (Math.random() - 0.5) * ARENA_SIZE;
    const nz = (Math.random() - 0.5) * ARENA_SIZE;
    
    if (checkBuildingCollision(nx, nz, 20)) return spawnNPC();

    const npc = {
        x: nx, z: nz, r: 16, hp: 100,
        speed: 1.5 + Math.random(),
        angle: Math.random() * Math.PI * 2,
        changeTimer: 0
    };
    npcs.push(npc);

    const mesh = createHumanoid(new THREE.Color().setHSL(Math.random(), 0.7, 0.5));
    mesh.position.set(nx, 0, nz);
    scene.add(mesh);
    npcMeshes.set(npc, mesh);
}

function updateNPCs() {
    for (let i = npcs.length - 1; i >= 0; i--) {
        const n = npcs[i];
        const mNPC = npcMeshes.get(n);
        const distToPlayerNPC = Math.hypot(n.x - player.x, n.z - player.z);

        // Proximity Culling
        if (distToPlayerNPC > 3000) {
            mNPC.visible = false;
            continue;
        }
        mNPC.visible = true;

        let threat = null;
        if (distToPlayerNPC < 400) threat = player;
        
        // Find nearest zombie threat
        zombies.forEach(z => {
            const dz = Math.hypot(n.x - z.x, n.z - z.z);
            if (dz < 300) threat = z;
        });

        if (threat) {
            n.angle = Math.atan2(n.x - threat.x, n.z - threat.z);
            n.speed = 4;
        } else {
            n.changeTimer--;
            if (n.changeTimer <= 0) {
                n.angle = Math.random() * Math.PI * 2;
                n.changeTimer = 100 + Math.random() * 200;
                n.speed = 1.5 + Math.random();
            }
        }

        const nx = n.x + Math.sin(n.angle) * n.speed;
        const nz = n.z + Math.cos(n.angle) * n.speed;

        if (!checkBuildingCollision(nx, nz, n.r) && Math.abs(nx) < ARENA_SIZE/2 && Math.abs(nz) < ARENA_SIZE/2) {
            n.x = nx; n.z = nz;
        } else {
            n.angle += Math.PI; // Bounce
        }

        mNPC.position.set(n.x, 0, n.z);
        mNPC.rotation.y = -n.angle;
        animateHumanoid(mNPC, 1.2);
    }
}

function updateMinimap() {
    const canvas = document.getElementById('minimapCanvas');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    const scale = canvas.width / ARENA_SIZE;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    ctx.clearRect(0,0, canvas.width, canvas.height);
    
    // Draw Grid/Area
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    ctx.strokeRect(0,0, canvas.width, canvas.height);

    const toMapX = (worldX) => centerX + worldX * scale;
    const toMapY = (worldZ) => centerY + worldZ * scale;

    // NPCs (Green)
    ctx.fillStyle = '#0f0';
    npcs.forEach(n => ctx.fillRect(toMapX(n.x)-1, toMapY(n.z)-1, 2, 2));

    // Zombies (Red)
    ctx.fillStyle = '#f00';
    zombies.forEach(z => ctx.fillRect(toMapX(z.x)-1, toMapY(z.z)-1, 2, 2));

    // Waypoint (Yellow)
    if (activeMission && activeMission.type === 'travel') {
        ctx.fillStyle = '#ff0';
        ctx.beginPath();
        ctx.arc(toMapX(activeMission.tx), toMapY(activeMission.tz), 4, 0, Math.PI*2);
        ctx.fill();
    }

    // Player (Blue/Arrow)
    ctx.save();
    ctx.translate(toMapX(player.x), toMapY(player.z));
    ctx.rotate(-player.angle);
    ctx.fillStyle = '#0cf';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 4);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function updateMissions() {
    if (!activeMission) {
        startNextMission();
        return;
    }

    const missionText = document.getElementById('mission-text');
    
    if (activeMission.type === 'travel') {
        const d = Math.hypot(player.x - activeMission.tx, player.z - activeMission.tz);
        missionText.innerText = `${activeMission.label} (${Math.round(d)}m)`;
        waypointMesh.visible = true;
        waypointMesh.position.set(activeMission.tx, 5, activeMission.tz);
        waypointMesh.rotation.y += 0.05;
        
        if (d < 150) {
            completeMission();
        }
    } else if (activeMission.type === 'kill') {
        const remaining = activeMission.targetKills - (kills - activeMission.startKills);
        missionText.innerText = `${activeMission.label}: ${Math.max(0, remaining)} LEFT`;
        waypointMesh.visible = false;
        
        if (remaining <= 0) {
            completeMission();
        }
    }
}

function startNextMission() {
    missionStep++;
    const mType = missionStep % 2 === 1 ? 'travel' : 'kill';
    
    if (mType === 'travel') {
        const tx = (Math.random() - 0.5) * 6000;
        const tz = (Math.random() - 0.5) * 6000;
        activeMission = { type: 'travel', label: 'GO TO INTEL POINT', tx, tz };
    } else {
        activeMission = { type: 'kill', label: 'SWEEP AREA', targetKills: 10 + wave * 5, startKills: kills };
    }
}

function completeMission() {
    playSound('powerup');
    score += 1000;
    showMsg("MISSION COMPLETE - REWARD: +1000 INTEL");
    activeMission = null;
}

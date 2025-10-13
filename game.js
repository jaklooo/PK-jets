// ===== GAME CONSTANTS =====
const PLAYER_ACCELERATION = 0.015;
const PLAYER_MIN_SPEED = 0.8; // Minimum speed - can't stop in air!
const PLAYER_MAX_SPEED = 1.8;
const PLAYER_TURBO_SPEED = 3.0;
const PLAYER_TURN_SPEED = 0.02;
const PLAYER_PITCH_SPEED = 0.015;
const PLAYER_ROLL_SPEED = 0.05; // Banking when turning
const BULLET_SPEED = 5.0; // 2x rýchlejšie strely
const ENEMY_SPEED = 0.8; // Rovnaká rýchlosť ako hráč!
const ENEMY_SPAWN_RATE = 3000; // milliseconds
const MAX_ENEMIES = 15; // Maximum number of enemies at once
const NUM_ALLIES = 6; // Number of friendly allies
const MAX_HEALTH = 100;
const WORLD_SIZE = 2000; // 4x larger
const TERRAIN_SIZE = 4000; // 4x larger

// MISSILE CONSTANTS
const MISSILE_SPEED = 2.0;
const MISSILE_TURN_SPEED = 0.04;
const MISSILE_LOCK_TIME = 2000; // 2 seconds to lock
const MISSILE_LOCK_RANGE = 400; // Max lock distance
const MAX_MISSILES = 20; // Starting missile count

// AI STATES
const AI_STATE = {
    PATROL: 'patrol',
    ENGAGE: 'engage',
    CHASE: 'chase',
    EVADE: 'evade'
};

// ===== MENU & LOADING STATE =====
let gameInitialized = false;
let loadingProgress = 0;

// ===== GAME STATE =====
let scene, camera, renderer;
let player;
let playerVelocity = new THREE.Vector3();
let playerSpeed = PLAYER_MIN_SPEED; // Start at minimum speed
let playerPitch = 0; // Up/Down rotation
let playerYaw = 0; // Left/Right rotation
let playerRoll = 0; // Banking rotation
let playerRotationX = 0; // Additional rotation variable
let isOnGround = true; // Start on runway
let groundSpeed = 0; // Speed on runway
let takeoffSpeed = 1.2; // Speed needed to take off
let enemies = [];
let allies = []; // Friendly blue planes
let bullets = [];
let missiles = []; // Guided missiles
let wreckage = []; // Falling destroyed planes
let missileCount = MAX_MISSILES; // Current missile count
let lockedTarget = null; // Currently locked enemy
let lockProgress = 0; // Lock timer (0 to MISSILE_LOCK_TIME)
let keys = {};
let score = 0;
let health = MAX_HEALTH;
let gameRunning = false; // Start as false
let lastEnemySpawn = 0;
let terrain;
let clouds = [];
let trees = [];
let buildings = [];
let mig15Model = null; // Store loaded MIG-15 model
let hollarBuilding = null; // Enemy target building
let fsvBuilding = null; // FSV building (Jinonice) - friendly base to defend
let aaGuns = []; // Anti-aircraft guns defending Hollar
let aaBullets = []; // AA gun bullets
let radarCanvas = null; // Radar canvas element
let radarCtx = null; // Radar drawing context
let enemyMissiles = []; // Enemy missiles targeting FSV
let allEnemiesDestroyed = false; // Flag když zničíš všetky nepriateľov
let missionPhase = 1; // 1 = Defend FSV, 2 = Attack Hollar
let lastRandomAttack = 0; // Timer for random FSV attacks every 30 seconds
let totalAttackWarningShown = false; // Flag to show warning only once

// ===== MENU FUNCTIONS =====
function updateLoadingProgress(progress) {
    loadingProgress = progress;
    const progressBar = document.getElementById('loadingProgress');
    if (progressBar) {
        progressBar.style.width = progress + '%';
    }
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    loadingScreen.classList.add('hidden');
    setTimeout(() => {
        loadingScreen.style.display = 'none';
        showMainMenu();
    }, 500);
}

function showMainMenu() {
    const mainMenu = document.getElementById('mainMenu');
    mainMenu.classList.add('active');
}

function hideMainMenu() {
    const mainMenu = document.getElementById('mainMenu');
    mainMenu.classList.remove('active');
}

function showTutorial() {
    const tutorialScreen = document.getElementById('tutorialScreen');
    tutorialScreen.classList.add('active');
}

function closeTutorial() {
    const tutorialScreen = document.getElementById('tutorialScreen');
    tutorialScreen.classList.remove('active');
}

function startGame() {
    hideMainMenu();
    closeTutorial();
    
    if (!gameInitialized) {
        init();
        gameInitialized = true;
    }
    
    gameRunning = true;
    
    // Show UI
    document.getElementById('ui').style.display = 'block';
    document.getElementById('instructions').style.display = 'block';
    document.getElementById('radar').style.display = 'block';
}

// ===== INITIALIZATION =====
function init() {
    // Create scene
    scene = new THREE.Scene();
    
    // Create realistic sky with gradient
    scene.background = new THREE.Color(0x87CEEB); // Sky blue
    scene.fog = new THREE.Fog(0x87CEEB, 200, 2000); // Larger fog for bigger world

    // Create camera
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        5000 // Far plane for bigger world
    );

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
    scene.add(ambientLight);

    // Sun (directional light)
    const directionalLight = new THREE.DirectionalLight(0xffffee, 1.5);
    directionalLight.position.set(100, 200, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -200;
    directionalLight.shadow.camera.right = 200;
    directionalLight.shadow.camera.top = 200;
    directionalLight.shadow.camera.bottom = -200;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Hemisphere light for natural lighting
    const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x545454, 0.6);
    scene.add(hemiLight);

    // Create world
    createTerrain();
    createClouds();
    createTrees();
    createBuildings();
    createStarField();

    // Load MIG-15 model and start game
    loadMIG15Model(() => {
        // Create FSV UK campus on edge of map
        const campusPos = createFSVCampus();
        
        // Create HOLLAR building (enemy target) - opposite side of map
        hollarBuilding = createHollarBuilding();
        console.log(`🎯 HOLLAR target building created at (${hollarBuilding.x}, ${hollarBuilding.y}, ${hollarBuilding.z})`);
        
        // Create AA guns defending Hollar
        createAAGuns(hollarBuilding);
        
        // Create runway next to campus
        const spawnPos = createRunway(campusPos);
        
        // Create player at runway spawn position
        createPlayer();
        player.position.set(spawnPos.x, spawnPos.y + 0.5, spawnPos.z); // +0.5 NAD runway, nie pod!
        player.rotation.set(0, -Math.PI / 2, 0); // Face DOPRAVA (90° doľava = hľadí doprava v smere +X)
        playerYaw = -Math.PI / 2; // Synchronizuj yaw
        playerPitch = 0;
        playerRoll = 0;
        playerSpeed = 0; // Začína stáť
        groundSpeed = 0;
        isOnGround = true;
        
        // INICIALIZUJ KAMERU - pekný pohľad na stíhačku a runway!
        // Kamera VĽAVO VZADU od stíhačky, vysoko nad ňou
        camera.position.set(spawnPos.x - 20, spawnPos.y + 25, spawnPos.z - 15);
        camera.lookAt(new THREE.Vector3(spawnPos.x, spawnPos.y, spawnPos.z));
        
        console.log('Player spawned at:', player.position);
        console.log('Camera position:', camera.position);
        console.log('Runway Y:', spawnPos.y);
        
        // Create fixed number of enemies at random positions
        for (let i = 0; i < MAX_ENEMIES; i++) {
            createEnemy();
        }
        
        // Create fixed number of allies at random positions
        for (let i = 0; i < NUM_ALLIES; i++) {
            createAlly();
        }
        
        // Initialize radar
        initRadar();
        
        // Show takeoff hint at start
        const takeoffHint = document.getElementById('takeoffHint');
        if (takeoffHint) {
            takeoffHint.style.display = 'block';
            // Hide after 5 seconds or when player starts moving
            setTimeout(() => {
                if (takeoffHint.style.display === 'block') {
                    takeoffHint.style.display = 'none';
                }
            }, 8000);
        }
        
        // Kamera sa nastaví automaticky cez updateCamera() v animate loop
        // Žiadne manuálne nastavenie - použije sa rovnaký systém ako v hre
        
        // Now start the game loop after everything is loaded
        animate();
    });

    // Event listeners
    window.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;
        if (e.key === ' ' && gameRunning) {
            e.preventDefault();
            shoot();
        }
        // K key for missile launch
        if (e.key.toLowerCase() === 'k' && gameRunning && !isOnGround) {
            e.preventDefault();
            launchMissile();
        }
    });

    window.addEventListener('keyup', (e) => {
        keys[e.key.toLowerCase()] = false;
    });

    window.addEventListener('resize', onWindowResize, false);
}

// ===== LOAD MIG-15 MODEL =====
function loadMIG15Model(callback) {
    // First, load the textures manually
    const tgaLoader = new THREE.TGALoader();
    const loadedTextures = {};
    
    // Load available TGA textures
    const texturesToLoad = [
        { key: 'main', file: '2b949347 D.tga' },
        { key: 'detail', file: '99591ba9 D.tga' },
        { key: 'spec', file: '0584a8c1.tga' }
    ];
    
    let texturesLoaded = 0;
    texturesToLoad.forEach(({ key, file }) => {
        tgaLoader.load(
            'models/MIG-15/Textures/' + file,
            (texture) => {
                loadedTextures[key] = texture;
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texturesLoaded++;
                console.log(`Loaded texture: ${file}`);
                
                if (texturesLoaded === texturesToLoad.length) {
                    loadModel();
                }
            },
            undefined,
            (error) => {
                console.error(`Error loading texture ${file}:`, error);
                texturesLoaded++;
                if (texturesLoaded === texturesToLoad.length) {
                    loadModel();
                }
            }
        );
    });
    
    function loadModel() {
        const manager = new THREE.LoadingManager();
        const loader = new THREE.TDSLoader(manager);
        loader.setResourcePath('models/MIG-15/Textures/');
        
        loader.load(
            'models/MIG-15/3ds file.3DS',
            (object) => {
                console.log('MIG-15 model loaded successfully!');
                mig15Model = object;
                
                // Scale and prepare the model
                mig15Model.scale.set(0.5, 0.5, 0.5);
                
                // Apply loaded textures to materials
                mig15Model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        
                        // Apply main texture if available
                        if (child.material && loadedTextures.main) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => {
                                    mat.map = loadedTextures.main;
                                    mat.needsUpdate = true;
                                });
                            } else {
                                child.material.map = loadedTextures.main;
                                child.material.needsUpdate = true;
                            }
                            console.log('Applied texture to mesh');
                        }
                    }
                });
                
                callback();
            },
            (progress) => {
                console.log('Loading MIG-15 model:', (progress.loaded / progress.total * 100) + '%');
            },
            (error) => {
                console.error('Error loading MIG-15 model:', error);
                callback();
            }
        );
    }
}

// ===== CREATE STAR FIELD =====
function createStarField() {
    const starGeometry = new THREE.BufferGeometry();
    const starVertices = [];

    // Znížený počet hviezd pre lepší výkon (z 1000 na 500)
    for (let i = 0; i < 500; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = Math.random() * 500 + 200; // Stars only in upper sky
        const z = (Math.random() - 0.5) * 2000;
        starVertices.push(x, y, z);
    }

    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 1, transparent: true, opacity: 0.8 });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
}

// ===== CREATE TERRAIN =====
function createTerrain() {
    // Znížená geometria pre lepší výkon (z 100,100 na 80,80)
    const geometry = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, 80, 80);
    const vertices = geometry.attributes.position.array;
    
    // Create hills and valleys using Perlin-like noise
    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const z = vertices[i + 1];
        
        // Multiple octaves of noise for realistic terrain
        const height = 
            Math.sin(x * 0.01) * 10 +
            Math.cos(z * 0.01) * 10 +
            Math.sin(x * 0.03) * 5 +
            Math.cos(z * 0.03) * 5 +
            Math.sin(x * 0.05) * 2;
        
        vertices[i + 2] = height;
    }
    
    geometry.computeVertexNormals();
    
    // Create gradient material (green grass to brown mountains)
    const material = new THREE.MeshPhongMaterial({
        color: 0x3a7d44,
        flatShading: false,
        side: THREE.DoubleSide,
        shininess: 5
    });
    
    terrain = new THREE.Mesh(geometry, material);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    scene.add(terrain);
    
    // REALISTIC WATER with reflections and waves
    const waterGeometry = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, 60, 60);
    
    // Create water material with reflections
    const waterMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x0077be,
        metalness: 0.1,
        roughness: 0.1,
        transmission: 0.9, // Water transparency
        ior: 1.33, // Water refractive index
        reflectivity: 0.7,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        envMapIntensity: 1.5
    });
    
    const water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -5;
    water.receiveShadow = true;
    scene.add(water);
    
    // Store water for animation
    water.userData.time = 0;
    scene.userData.water = water;
}

// ===== CREATE CLOUDS =====
function createClouds() {
    const cloudCount = 30; // Znížený počet pre lepší výkon (bolo 50)
    
    for (let i = 0; i < cloudCount; i++) {
        const cloud = new THREE.Group();
        
        // Each cloud made of fewer spheres for better performance
        for (let j = 0; j < 3; j++) { // Znížené z 5 na 3
            const geometry = new THREE.SphereGeometry(Math.random() * 3 + 2, 6, 6); // Znížená geometria z 8,8 na 6,6
            const material = new THREE.MeshPhongMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.7,
                flatShading: true
            });
            const sphere = new THREE.Mesh(geometry, material);
            sphere.position.set(
                (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 3,
                (Math.random() - 0.5) * 8
            );
            cloud.add(sphere);
        }
        
        // Position clouds randomly
        cloud.position.set(
            (Math.random() - 0.5) * WORLD_SIZE,
            Math.random() * 30 + 40,
            (Math.random() - 0.5) * WORLD_SIZE
        );
        
        cloud.userData.velocity = (Math.random() - 0.5) * 0.02;
        
        scene.add(cloud);
        clouds.push(cloud);
    }
}

// ===== CREATE TREES =====
// ===== CREATE TREES (REALISTIC FOREST) =====
function createTrees() {
    const treeCount = 80; // Viac stromov
    
    for (let i = 0; i < treeCount; i++) {
        const tree = new THREE.Group();
        
        const treeType = Math.random();
        
        if (treeType < 0.4) {
            // PINE TREE (Ihličnan)
            const trunkHeight = 6 + Math.random() * 4;
            const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.5, trunkHeight, 6);
            const trunkMaterial = new THREE.MeshPhongMaterial({ 
                color: 0x4a3728,
                flatShading: false
            });
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.position.y = trunkHeight / 2;
            trunk.castShadow = true;
            tree.add(trunk);
            
            // Multiple cone layers
            const coneColors = [0x1a4d1a, 0x1e5c1e, 0x228b22];
            for (let layer = 0; layer < 3; layer++) {
                const coneSize = 2.5 - layer * 0.5;
                const coneHeight = 4 - layer * 0.5;
                const foliageGeometry = new THREE.ConeGeometry(coneSize, coneHeight, 6);
                const foliageMaterial = new THREE.MeshPhongMaterial({ 
                    color: coneColors[layer],
                    flatShading: false
                });
                const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
                foliage.position.y = trunkHeight - 2 + layer * 1.5;
                foliage.castShadow = true;
                tree.add(foliage);
            }
            
        } else if (treeType < 0.7) {
            // DECIDUOUS TREE (Listnatý strom)
            const trunkHeight = 5 + Math.random() * 3;
            const trunkGeometry = new THREE.CylinderGeometry(0.4, 0.6, trunkHeight, 6);
            const trunkMaterial = new THREE.MeshPhongMaterial({ 
                color: 0x654321,
                flatShading: false
            });
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.position.y = trunkHeight / 2;
            trunk.castShadow = true;
            tree.add(trunk);
            
            // Round crown (multiple spheres)
            const crownMaterial = new THREE.MeshPhongMaterial({ 
                color: 0x2d5f2d,
                flatShading: false
            });
            
            for (let j = 0; j < 5; j++) {
                const crownGeometry = new THREE.SphereGeometry(1.5 + Math.random() * 0.8, 6, 6);
                const crown = new THREE.Mesh(crownGeometry, crownMaterial);
                crown.position.y = trunkHeight + 1;
                crown.position.x = (Math.random() - 0.5) * 2;
                crown.position.z = (Math.random() - 0.5) * 2;
                crown.castShadow = true;
                tree.add(crown);
            }
            
        } else {
            // PALM TREE (Palma)
            const trunkHeight = 7 + Math.random() * 3;
            const trunkSegments = 6;
            
            // Segmented trunk
            for (let seg = 0; seg < trunkSegments; seg++) {
                const segmentGeometry = new THREE.CylinderGeometry(
                    0.4 - seg * 0.05, 
                    0.5 - seg * 0.05, 
                    trunkHeight / trunkSegments, 
                    6
                );
                const trunkMaterial = new THREE.MeshPhongMaterial({ 
                    color: 0x8b7355
                });
                const segment = new THREE.Mesh(segmentGeometry, trunkMaterial);
                segment.position.y = (seg * trunkHeight / trunkSegments) + trunkHeight / (trunkSegments * 2);
                segment.castShadow = true;
                tree.add(segment);
            }
            
            // Palm leaves (fronds)
            const leafMaterial = new THREE.MeshPhongMaterial({ 
                color: 0x3a7d3a,
                side: THREE.DoubleSide
            });
            
            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
                const leafGeometry = new THREE.BoxGeometry(0.3, 0.1, 3);
                const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
                leaf.position.y = trunkHeight;
                leaf.position.x = Math.cos(angle) * 0.5;
                leaf.position.z = Math.sin(angle) * 0.5;
                leaf.rotation.y = angle;
                leaf.rotation.x = -0.3;
                leaf.castShadow = true;
                tree.add(leaf);
            }
        }
        
        // Random position on terrain (avoid buildings area)
        let x, z;
        do {
            x = (Math.random() - 0.5) * (TERRAIN_SIZE - 200);
            z = (Math.random() - 0.5) * (TERRAIN_SIZE - 200);
        } while (Math.abs(x) < 250 && Math.abs(z) < 250); // Keep away from center
        
        const y = getTerrainHeight(x, z);
        
        tree.position.set(x, y, z);
        tree.scale.set(
            0.7 + Math.random() * 0.6, 
            0.8 + Math.random() * 0.5, 
            0.7 + Math.random() * 0.6
        );
        tree.rotation.y = Math.random() * Math.PI * 2;
        
        scene.add(tree);
        trees.push(tree);
    }
}

// ===== CREATE BUILDINGS =====
// ===== CREATE BUILDINGS (REALISTIC CITY) =====
function createBuildings() {
    // ===== RADIKÁLNE ZJEDNODUŠENÉ MESTO =====
    const buildingCount = 15; // Z ~200 na 15 budov
    const cityCenter = { x: 0, z: -200 };
    
    for (let i = 0; i < buildingCount; i++) {
        // Jedna jednoduchá kocka na budovu
        const width = 8 + Math.random() * 12;
        const height = 15 + Math.random() * 25;
        const depth = 8 + Math.random() * 12;
        
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshPhongMaterial({
            color: new THREE.Color().setHSL(0, 0, 0.3 + Math.random() * 0.4),
            flatShading: false
        });
        const building = new THREE.Mesh(geometry, material);
        
        // Náhodná pozícia okolo centra
        const angle = (i / buildingCount) * Math.PI * 2;
        const distance = 50 + Math.random() * 100;
        building.position.set(
            cityCenter.x + Math.cos(angle) * distance,
            height / 2,
            cityCenter.z + Math.sin(angle) * distance
        );
        
        building.castShadow = false; // Vypnuté tieňovanie
        building.receiveShadow = false;
        
        scene.add(building);
        buildings.push(building);
    }
    
    console.log(`🏙️ Created simplified city with ${buildingCount} buildings`);
}

// ===== GET TERRAIN HEIGHT =====
function getTerrainHeight(x, z) {
    const height = 
        Math.sin(x * 0.01) * 10 +
        Math.cos(z * 0.01) * 10 +
        Math.sin(x * 0.03) * 5 +
        Math.cos(z * 0.03) * 5 +
        Math.sin(x * 0.05) * 2;
    return Math.max(height, 0); // Don't go below 0
}

// ===== CREATE FSV UK CAMPUS =====
function createFSVCampus() {
    const campusGroup = new THREE.Group();
    
    // Position VPRAVO od runway - vizuálne pekne viditeľné!
    const campusX = -1200; // Viac doprava (od -1500)
    const campusZ = -1550; // Trochu viac vzadu (vpravo od runway)
    const campusY = 15; // PEVNÁ VÝŠKA 15m - rovnaká ako runway!
    
    // Materials (PRESNE AKO V INDEXX.HTML)
    const goldScreenMaterial = new THREE.MeshStandardMaterial({
        color: 0xc9a536, // Sýta zlatá
        metalness: 0.75,
        roughness: 0.35,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide
    });
    
    const curtainWallMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x1a1a1a, // Tmavé sklo
        metalness: 0.2,
        roughness: 0.15,
        transmission: 0.6,
        ior: 1.52,
        reflectivity: 0.6
    });
    
    const concreteMaterial = new THREE.MeshStandardMaterial({
        color: 0xc0c0c0,
        roughness: 0.8,
        metalness: 0.1
    });
    
    const teachingBlockMaterial = new THREE.MeshStandardMaterial({
        color: 0xc85e3a, // Tehlovo-červená
        roughness: 0.75,
        metalness: 0.0
    });
    
    const frameMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        metalness: 0.6,
        roughness: 0.3
    });
    
    // GOLDEN CUBE s detailmi
    const cubeWidth = 38;
    const cubeHeight = 18;
    const cubeDepth = 24;
    
    // Core structure
    const coreGeom = new THREE.BoxGeometry(cubeWidth - 1, cubeHeight, cubeDepth - 1);
    const coreMat = new THREE.MeshStandardMaterial({ 
        color: 0xe0e0e0,
        roughness: 0.3,
        metalness: 0.1
    });
    const core = new THREE.Mesh(coreGeom, coreMat);
    core.position.set(campusX, campusY + 12, campusZ + 2);
    core.castShadow = true;
    core.receiveShadow = true;
    campusGroup.add(core);
    
    // Window bands
    for (let i = 0; i < 4; i++) {
        const windowGeom = new THREE.BoxGeometry(cubeWidth - 2, 2.5, 0.2);
        const windowMat = new THREE.MeshPhysicalMaterial({
            color: 0x4a5a6a,
            metalness: 0.1,
            roughness: 0.1,
            transmission: 0.6,
            ior: 1.52
        });
        const window1 = new THREE.Mesh(windowGeom, windowMat);
        window1.position.set(campusX, campusY + 6 + i * 3.5, campusZ + 2 + (cubeDepth - 1) / 2);
        campusGroup.add(window1);

        const window2 = window1.clone();
        window2.position.z = campusZ + 2 - (cubeDepth - 1) / 2;
        campusGroup.add(window2);
    }
    
    // Gold screen panels (zjednodušené, ale zlaté)
    const screenGeom = new THREE.PlaneGeometry(cubeWidth, cubeHeight);
    const frontScreen = new THREE.Mesh(screenGeom, goldScreenMaterial);
    frontScreen.position.set(campusX, campusY + 12, campusZ + 2 + cubeDepth / 2 + 0.3);
    frontScreen.castShadow = true;
    campusGroup.add(frontScreen);

    const backScreen = frontScreen.clone();
    backScreen.position.z = campusZ + 2 - (cubeDepth / 2 + 0.3);
    backScreen.rotation.y = Math.PI;
    campusGroup.add(backScreen);

    const sideScreenGeom = new THREE.PlaneGeometry(cubeDepth + 0.6, cubeHeight);
    const leftScreen = new THREE.Mesh(sideScreenGeom, goldScreenMaterial);
    leftScreen.position.set(campusX - cubeWidth / 2 - 0.3, campusY + 12, campusZ + 2);
    leftScreen.rotation.y = Math.PI / 2;
    leftScreen.castShadow = true;
    campusGroup.add(leftScreen);

    const rightScreen = leftScreen.clone();
    rightScreen.position.x = campusX + cubeWidth / 2 + 0.3;
    rightScreen.rotation.y = -Math.PI / 2;
    campusGroup.add(rightScreen);

    // Soffit (strop pod konzolou)
    const soffitGeom = new THREE.BoxGeometry(cubeWidth, 0.3, cubeDepth);
    const soffitMat = new THREE.MeshStandardMaterial({ 
        color: 0xd0d0d0,
        roughness: 0.3
    });
    const soffit = new THREE.Mesh(soffitGeom, soffitMat);
    soffit.position.set(campusX, campusY + 4, campusZ + 2);
    soffit.receiveShadow = true;
    campusGroup.add(soffit);
    
    // VEĽKÝ NÁPIS "FAKULTA SOCIÁLNÍCH VĚD"
    const bigSignCanvas = document.createElement('canvas');
    bigSignCanvas.width = 2048;
    bigSignCanvas.height = 256;
    const bigCtx = bigSignCanvas.getContext('2d');
    
    bigCtx.clearRect(0, 0, 2048, 256);
    bigCtx.fillStyle = '#ffffff';
    bigCtx.shadowColor = 'rgba(0,0,0,0.5)';
    bigCtx.shadowBlur = 10;
    bigCtx.shadowOffsetX = 3;
    bigCtx.shadowOffsetY = 3;
    bigCtx.font = 'bold 120px Arial';
    bigCtx.textAlign = 'center';
    bigCtx.textBaseline = 'middle';
    bigCtx.fillText('FAKULTA SOCIÁLNÍCH VĚD', 1024, 128);
    
    const bigSignTexture = new THREE.CanvasTexture(bigSignCanvas);
    const bigSignMat = new THREE.MeshBasicMaterial({ 
        map: bigSignTexture, 
        transparent: true,
        opacity: 1.0,
        side: THREE.DoubleSide
    });
    const bigSignGeom = new THREE.PlaneGeometry(32, 4);
    const bigSignMesh = new THREE.Mesh(bigSignGeom, bigSignMat);
    bigSignMesh.position.set(campusX, campusY + 16, campusZ + 2 + cubeDepth / 2 + 0.35);
    campusGroup.add(bigSignMesh);
    
    // Plinth (ground floor glass)
    const glassGeom = new THREE.BoxGeometry(30, 4, 20);
    const glassBox = new THREE.Mesh(glassGeom, curtainWallMaterial);
    glassBox.position.set(campusX, campusY + 2, campusZ);
    glassBox.castShadow = true;
    glassBox.receiveShadow = true;
    campusGroup.add(glassBox);

    // Dark frames (mullions)
    for (let i = -3; i <= 3; i++) {
        const mullionGeom = new THREE.BoxGeometry(0.15, 4, 0.15);
        const mullion = new THREE.Mesh(mullionGeom, frameMaterial);
        mullion.position.set(campusX + i * 4, campusY + 2, campusZ - 10);
        campusGroup.add(mullion);
        
        const mullion2 = new THREE.Mesh(mullionGeom, frameMaterial);
        mullion2.position.set(campusX + i * 4, campusY + 2, campusZ + 10);
        campusGroup.add(mullion2);
    }

    // Entrance door
    const doorGeom = new THREE.BoxGeometry(3, 3, 0.2);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const door = new THREE.Mesh(doorGeom, doorMat);
    door.position.set(campusX, campusY + 1.5, campusZ - 10.1);
    campusGroup.add(door);

    // Signage panel nad dverami
    const signageGeom = new THREE.BoxGeometry(16, 1.2, 0.2);
    const signageMat = new THREE.MeshStandardMaterial({ 
        color: 0x0a0a0a,
        roughness: 0.6
    });
    const signage = new THREE.Mesh(signageGeom, signageMat);
    signage.position.set(campusX, campusY + 3.2, campusZ - 10.3);
    signage.castShadow = true;
    campusGroup.add(signage);

    // Text na signage
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, 1024, 128);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 52px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FAKULTA SOCIÁLNÍCH VĚD UK', 512, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    const textMat = new THREE.MeshBasicMaterial({ 
        map: texture, 
        transparent: false,
        opacity: 1.0
    });
    const textGeom = new THREE.PlaneGeometry(15.5, 1.0);
    const textMesh = new THREE.Mesh(textGeom, textMat);
    textMesh.position.set(campusX, campusY + 3.2, campusZ - 10.35);
    campusGroup.add(textMesh);
    
    // Teaching blocks
    const blockGeom = new THREE.BoxGeometry(25, 12, 15);
    const teachingBlock = new THREE.Mesh(blockGeom, teachingBlockMaterial);
    teachingBlock.position.set(campusX - 30, campusY + 6, campusZ + 5);
    teachingBlock.castShadow = true;
    teachingBlock.receiveShadow = true;
    campusGroup.add(teachingBlock);
    
    // Additional buildings - first 3 are SKYSCRAPERS (7x taller)
    const buildingPositions = [
        { x: -30, z: -15, w: 20, d: 12, h: 70, isSkyscraper: true },  // 10 * 7 = 70m
        { x: -50, z: 0, w: 18, d: 14, h: 63, isSkyscraper: true },    // 9 * 7 = 63m
        { x: -35, z: 25, w: 22, d: 10, h: 77, isSkyscraper: true },   // 11 * 7 = 77m
        { x: 30, z: -10, w: 16, d: 12, h: 8 }
    ];
    
    buildingPositions.forEach(pos => {
        const bldgGeom = new THREE.BoxGeometry(pos.w, pos.h, pos.d);
        
        // Skyscrapers get glass/modern material
        let buildingMat;
        if (pos.isSkyscraper) {
            buildingMat = new THREE.MeshStandardMaterial({
                color: 0x2a3a4a,
                roughness: 0.2,
                metalness: 0.7
            });
        } else {
            buildingMat = teachingBlockMaterial;
        }
        
        const bldg = new THREE.Mesh(bldgGeom, buildingMat);
        bldg.position.set(campusX + pos.x, campusY + pos.h / 2, campusZ + pos.z);
        bldg.castShadow = true;
        bldg.receiveShadow = true;
        campusGroup.add(bldg);
        
        // Add windows to skyscrapers
        if (pos.isSkyscraper) {
            const windowRows = Math.floor(pos.h / 3);
            for (let floor = 0; floor < windowRows; floor++) {
                const windowGeom = new THREE.PlaneGeometry(pos.w - 2, 2);
                const windowMat = new THREE.MeshPhysicalMaterial({
                    color: 0x88ccff,
                    metalness: 0.1,
                    roughness: 0.1,
                    transmission: 0.7,
                    ior: 1.52
                });
                
                // Front windows
                const windowFront = new THREE.Mesh(windowGeom, windowMat);
                windowFront.position.set(
                    campusX + pos.x,
                    campusY + 3 + floor * 3,
                    campusZ + pos.z + pos.d / 2 + 0.1
                );
                campusGroup.add(windowFront);
                
                // Back windows
                const windowBack = windowFront.clone();
                windowBack.position.z = campusZ + pos.z - pos.d / 2 - 0.1;
                windowBack.rotation.y = Math.PI;
                campusGroup.add(windowBack);
            }
        }
    });
    
    // SUPPORT PLATFORM - aby FSV kampus nestál vo vzduchu!
    const terrainHeightAtCampus = getTerrainHeight(campusX, campusZ);
    const platformHeight = campusY - terrainHeightAtCampus;
    
    if (platformHeight > 2) { // Len ak je kampus dosť vysoko
        const platformGeom = new THREE.BoxGeometry(100, platformHeight, 100);
        const platformMat = new THREE.MeshStandardMaterial({
            color: 0x666666,
            roughness: 0.7
        });
        const platform = new THREE.Mesh(platformGeom, platformMat);
        platform.position.set(campusX, terrainHeightAtCampus + platformHeight/2, campusZ);
        platform.castShadow = true;
        platform.receiveShadow = true;
        campusGroup.add(platform);
        
        // Platform edges (concrete walls)
        const edgeThickness = 2;
        const edgeMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
        
        // Front and back edges
        const edgeGeomFB = new THREE.BoxGeometry(100, edgeThickness, edgeThickness);
        const edgeFront = new THREE.Mesh(edgeGeomFB, edgeMat);
        edgeFront.position.set(campusX, campusY, campusZ - 50);
        campusGroup.add(edgeFront);
        
        const edgeBack = edgeFront.clone();
        edgeBack.position.z = campusZ + 50;
        campusGroup.add(edgeBack);
        
        // Left and right edges
        const edgeGeomLR = new THREE.BoxGeometry(edgeThickness, edgeThickness, 100);
        const edgeLeft = new THREE.Mesh(edgeGeomLR, edgeMat);
        edgeLeft.position.set(campusX - 50, campusY, campusZ);
        campusGroup.add(edgeLeft);
        
        const edgeRight = edgeLeft.clone();
        edgeRight.position.x = campusX + 50;
        campusGroup.add(edgeRight);
    }
    
    scene.add(campusGroup);
    
    // Store FSV building reference for enemy targeting
    fsvBuilding = {
        x: campusX,
        y: campusY,
        z: campusZ,
        group: campusGroup,
        health: 200, // FSV má 200 HP
        maxHealth: 200
    };
    
    return { x: campusX, z: campusZ, y: campusY };
}

// ===== CREATE HOLLAR BUILDING (ENEMY TARGET) =====
function createHollarBuilding() {
    const group = new THREE.Group();
    
    // Position - OPAČNÁ STRANA MAPY od spawnu
    const hollarX = 1500;  // Úplne naproti spawnu (-1650)
    const hollarZ = 1500;  // Úplne naproti spawnu (-1500)
    const hollarY = 15;    // Pevná výška nad terénom
    
    // Materials
    const plasterMaterial = new THREE.MeshStandardMaterial({
        color: 0xf4dc9a, // Výrazná žltá
        roughness: 0.7,
        metalness: 0.0
    });
    
    const trimMaterial = new THREE.MeshStandardMaterial({
        color: 0xf5f5f5,
        roughness: 0.5
    });
    
    const windowFrameMaterial = new THREE.MeshStandardMaterial({
        color: 0xe8e8e8,
        roughness: 0.4
    });
    
    const glassMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x4a5a6a,
        transmission: 0.5,
        roughness: 0.1,
        metalness: 0.1
    });
    
    // Main building mass - 5 floors
    const mainGeom = new THREE.BoxGeometry(30, 19.5, 18);
    const main = new THREE.Mesh(mainGeom, plasterMaterial);
    main.position.set(hollarX, hollarY + 9.75, hollarZ);
    main.castShadow = true;
    main.receiveShadow = true;
    group.add(main);
    
    // Ground floor base (sokl)
    const baseGeom = new THREE.BoxGeometry(30.2, 1.5, 18.2);
    const baseMat = new THREE.MeshStandardMaterial({
        color: 0xe0d5b5,
        roughness: 0.8
    });
    const base = new THREE.Mesh(baseGeom, baseMat);
    base.position.set(hollarX, hollarY + 0.75, hollarZ);
    base.castShadow = true;
    group.add(base);
    
    // Horizontal decorative bands
    for (let floor = 1; floor <= 5; floor++) {
        const bandGeom = new THREE.BoxGeometry(30.3, 0.2, 18.3);
        const band = new THREE.Mesh(bandGeom, trimMaterial);
        band.position.set(hollarX, hollarY + floor * 3.8 - 0.1, hollarZ);
        group.add(band);
    }
    
    // Cornice (top decorative element)
    const corniceGeom = new THREE.BoxGeometry(31, 0.6, 18.5);
    const cornice = new THREE.Mesh(corniceGeom, trimMaterial);
    cornice.position.set(hollarX, hollarY + 19.8, hollarZ);
    cornice.castShadow = true;
    group.add(cornice);
    
    // Roof
    const roofGeom = new THREE.BoxGeometry(32, 0.5, 19);
    const roofMat = new THREE.MeshStandardMaterial({
        color: 0x6a5a4a,
        roughness: 0.9
    });
    const roof = new THREE.Mesh(roofGeom, roofMat);
    roof.position.set(hollarX, hollarY + 20.3, hollarZ);
    roof.castShadow = true;
    group.add(roof);
    
    // Windows - 5 floors × 7 windows each
    const windowsPerFloor = 7;
    const windowSpacing = 4.0;
    
    for (let floor = 0; floor < 5; floor++) {
        for (let i = 0; i < windowsPerFloor; i++) {
            const windowGroup = new THREE.Group();
            
            // Window frame
            const frameGeom = new THREE.BoxGeometry(1.8, 2.2, 0.3);
            const frame = new THREE.Mesh(frameGeom, windowFrameMaterial);
            windowGroup.add(frame);
            
            // Glass pane
            const glassGeom = new THREE.BoxGeometry(1.5, 1.9, 0.1);
            const glass = new THREE.Mesh(glassGeom, glassMaterial);
            glass.position.z = 0.05;
            windowGroup.add(glass);
            
            // Window divider
            const dividerH = new THREE.Mesh(
                new THREE.BoxGeometry(1.5, 0.08, 0.15),
                windowFrameMaterial
            );
            dividerH.position.z = 0.1;
            windowGroup.add(dividerH);
            
            const dividerV = new THREE.Mesh(
                new THREE.BoxGeometry(0.08, 1.9, 0.15),
                windowFrameMaterial
            );
            dividerV.position.z = 0.1;
            windowGroup.add(dividerV);
            
            // Position window
            windowGroup.position.set(
                hollarX + (i - (windowsPerFloor - 1) / 2) * windowSpacing,
                hollarY + 2.3 + floor * 3.8,
                hollarZ + 9.2
            );
            
            group.add(windowGroup);
        }
    }
    
    // Entrance door
    const doorGeom = new THREE.BoxGeometry(2.5, 3.5, 0.3);
    const doorMat = new THREE.MeshStandardMaterial({
        color: 0x3a2a1a,
        roughness: 0.6,
        metalness: 0.2
    });
    const door = new THREE.Mesh(doorGeom, doorMat);
    door.position.set(hollarX, hollarY + 1.75, hollarZ + 9.2);
    group.add(door);
    
    // NÁPIS "HOLLAR"
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 1024, 256);
    ctx.fillStyle = '#1a1a1a';
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.font = 'bold 180px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('HOLLAR', 512, 128);
    
    const texture = new THREE.CanvasTexture(canvas);
    const signMat = new THREE.MeshBasicMaterial({ 
        map: texture, 
        transparent: true,
        opacity: 1.0
    });
    const signGeom = new THREE.PlaneGeometry(12, 3);
    const sign = new THREE.Mesh(signGeom, signMat);
    sign.position.set(hollarX, hollarY + 17.5, hollarZ + 10.2);
    sign.scale.set(1.1, 1.1, 1);
    sign.renderOrder = 999;
    group.add(sign);
    
    // Mark as target building
    group.userData.isHollar = true;
    group.userData.health = 100;
    group.userData.maxHealth = 100;
    group.position.set(0, 0, 0); // Group is already positioned
    
    scene.add(group);
    
    return { x: hollarX, y: hollarY, z: hollarZ, group: group };
}

// ===== CREATE AA GUNS (Anti-Aircraft Defense) =====
function createAAGuns(hollarPos) {
    // 24 AA guns around Hollar building in multiple defensive rings
    const gunPositions = [
        // Inner ring - 4 guns (original positions)
        { x: hollarPos.x + 40, z: hollarPos.z + 40 },   // NE
        { x: hollarPos.x - 40, z: hollarPos.z + 40 },   // NW
        { x: hollarPos.x + 40, z: hollarPos.z - 40 },   // SE
        { x: hollarPos.x - 40, z: hollarPos.z - 40 },   // SW
        
        // Middle ring - 8 guns at cardinal and diagonal directions
        { x: hollarPos.x + 80, z: hollarPos.z },        // E
        { x: hollarPos.x - 80, z: hollarPos.z },        // W
        { x: hollarPos.x, z: hollarPos.z + 80 },        // N
        { x: hollarPos.x, z: hollarPos.z - 80 },        // S
        { x: hollarPos.x + 60, z: hollarPos.z + 60 },   // NE
        { x: hollarPos.x - 60, z: hollarPos.z + 60 },   // NW
        { x: hollarPos.x + 60, z: hollarPos.z - 60 },   // SE
        { x: hollarPos.x - 60, z: hollarPos.z - 60 },   // SW
        
        // Outer ring - 12 guns for extended defense perimeter
        { x: hollarPos.x + 120, z: hollarPos.z },       // E far
        { x: hollarPos.x - 120, z: hollarPos.z },       // W far
        { x: hollarPos.x, z: hollarPos.z + 120 },       // N far
        { x: hollarPos.x, z: hollarPos.z - 120 },       // S far
        { x: hollarPos.x + 100, z: hollarPos.z + 50 },  // ENE
        { x: hollarPos.x - 100, z: hollarPos.z + 50 },  // WNW
        { x: hollarPos.x + 100, z: hollarPos.z - 50 },  // ESE
        { x: hollarPos.x - 100, z: hollarPos.z - 50 },  // WSW
        { x: hollarPos.x + 50, z: hollarPos.z + 100 },  // NNE
        { x: hollarPos.x - 50, z: hollarPos.z + 100 },  // NNW
        { x: hollarPos.x + 50, z: hollarPos.z - 100 },  // SSE
        { x: hollarPos.x - 50, z: hollarPos.z - 100 }   // SSW
    ];
    
    gunPositions.forEach((pos, index) => {
        const gunGroup = new THREE.Group();
        
        // Base platform
        const baseGeom = new THREE.CylinderGeometry(3, 3.5, 1, 8);
        const baseMat = new THREE.MeshStandardMaterial({
            color: 0x3a3a3a,
            metalness: 0.6,
            roughness: 0.4
        });
        const base = new THREE.Mesh(baseGeom, baseMat);
        base.position.y = 0.5;
        base.castShadow = true;
        gunGroup.add(base);
        
        // Gun turret
        const turretGeom = new THREE.CylinderGeometry(1.5, 1.5, 2, 8);
        const turretMat = new THREE.MeshStandardMaterial({
            color: 0x4a4a4a,
            metalness: 0.7,
            roughness: 0.3
        });
        const turret = new THREE.Mesh(turretGeom, turretMat);
        turret.position.y = 2;
        turret.castShadow = true;
        gunGroup.add(turret);
        
        // Gun barrel
        const barrelGeom = new THREE.CylinderGeometry(0.3, 0.3, 6, 8);
        const barrelMat = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            metalness: 0.8,
            roughness: 0.2
        });
        const barrel = new THREE.Mesh(barrelGeom, barrelMat);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.y = 2.5;
        barrel.position.z = 3;
        barrel.castShadow = true;
        gunGroup.add(barrel);
        
        // Position gun
        const terrainY = getTerrainHeight(pos.x, pos.z);
        gunGroup.position.set(pos.x, terrainY, pos.z);
        
        // Store gun data
        gunGroup.userData = {
            lastShot: 0,
            shootCooldown: 500, // Shoot every 500ms
            range: 350,
            barrel: barrel,
            turret: turret,
            damage: 15
        };
        
        scene.add(gunGroup);
        aaGuns.push(gunGroup);
    });
    
    console.log(`🔫 Created ${aaGuns.length} AA guns defending Hollar`);
}

// ===== UPDATE AA GUNS =====
function updateAAGuns() {
    const currentTime = Date.now();
    
    for (const gun of aaGuns) {
        let target = null;
        let targetDistance = gun.userData.range;
        
        // Check player distance
        const distanceToPlayer = gun.position.distanceTo(player.position);
        if (distanceToPlayer < gun.userData.range && !isOnGround) {
            target = player;
            targetDistance = distanceToPlayer;
        }
        
        // Also check allies - attack them too!
        for (const ally of allies) {
            const distanceToAlly = gun.position.distanceTo(ally.position);
            if (distanceToAlly < gun.userData.range && ally.position.y > 5) {
                // Target the closest threat (player or ally)
                if (!target || distanceToAlly < targetDistance) {
                    target = ally;
                    targetDistance = distanceToAlly;
                }
            }
        }
        
        // Aim and shoot at target
        if (target) {
            gun.userData.turret.lookAt(target.position);
            gun.userData.barrel.lookAt(target.position);
            
            // Shoot
            if (currentTime - gun.userData.lastShot > gun.userData.shootCooldown) {
                gun.userData.lastShot = currentTime;
                aaGunShoot(gun, target);
            }
        }
    }
}

// ===== AA GUN SHOOTING =====
function aaGunShoot(gun, target) {
    const bullet = new THREE.Group();
    
    // Create bullet
    const bulletGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({
        color: 0xff6600,
        transparent: true,
        opacity: 0.9
    });
    const bulletMesh = new THREE.Mesh(bulletGeometry, bulletMaterial);
    
    // Add glow
    const glowGeometry = new THREE.SphereGeometry(0.25, 8, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xff8800,
        transparent: true,
        opacity: 0.5
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    bulletMesh.add(glow);
    bullet.add(bulletMesh);
    
    // Position at gun barrel
    bullet.position.copy(gun.position);
    bullet.position.y += 2.5; // Barrel height
    
    // Calculate direction to target with lead
    const directionToTarget = new THREE.Vector3()
        .subVectors(target.position, bullet.position)
        .normalize();
    
    bullet.userData = {
        velocity: directionToTarget.multiplyScalar(1.5), // AA bullets speed
        damage: gun.userData.damage,
        lifetime: 0,
        maxLifetime: 3000
    };
    
    scene.add(bullet);
    aaBullets.push(bullet);
}

// ===== UPDATE AA BULLETS =====
function updateAABullets() {
    for (let i = aaBullets.length - 1; i >= 0; i--) {
        const bullet = aaBullets[i];
        
        // Update lifetime
        bullet.userData.lifetime += 16;
        if (bullet.userData.lifetime > bullet.userData.maxLifetime) {
            scene.remove(bullet);
            aaBullets.splice(i, 1);
            continue;
        }
        
        // Move bullet
        bullet.position.add(bullet.userData.velocity);
        
        // Check collision with player
        const distanceToPlayer = bullet.position.distanceTo(player.position);
        if (distanceToPlayer < 3) {
            // Hit player!
            takeDamage(bullet.userData.damage);
            createExplosion(bullet.position, 0.5);
            scene.remove(bullet);
            aaBullets.splice(i, 1);
            console.log("💥 AA gun hit player!");
            continue;
        }
        
        // Check collision with allies
        for (let j = allies.length - 1; j >= 0; j--) {
            const ally = allies[j];
            const distanceToAlly = bullet.position.distanceTo(ally.position);
            if (distanceToAlly < 3) {
                // Hit ally!
                createExplosion(ally.position, 1.2);
                scene.remove(ally);
                allies.splice(j, 1);
                scene.remove(bullet);
                aaBullets.splice(i, 1);
                console.log("💥 AA gun destroyed ally!");
                break;
            }
        }
    }
}

// ===== CREATE RUNWAY =====
function createRunway(campusPos) {
    const runwayGroup = new THREE.Group();
    
    // DLHŠIA RUNWAY - začína ďalej od FSV, FSV je VPRAVO
    const runwayX = -1500; // Začiatok runway (viac vľavo od FSV)
    const runwayZ = -1500; // Rovnaká Z pozícia
    const runwayY = 15; // PEVNÁ VÝŠKA 15m NAD NULOU - vždy viditeľná!
    
    // Main runway surface - DLHŠIA!
    const runwayLength = 300; // Z 200 na 300m - dlhšia runway!
    const runwayWidth = 25;
    
    const runwayGeom = new THREE.BoxGeometry(runwayLength, 0.5, runwayWidth);
    const runwayMat = new THREE.MeshStandardMaterial({
        color: 0x2a2a2a,
        roughness: 0.7
    });
    const runway = new THREE.Mesh(runwayGeom, runwayMat);
    runway.position.set(runwayX, runwayY, runwayZ);
    runway.receiveShadow = true;
    runwayGroup.add(runway);
    
    // Center line markings (white stripes)
    for (let i = -6; i <= 6; i++) { // Viac prúžkov pre dlhšiu runway
        const stripeGeom = new THREE.BoxGeometry(15, 0.51, 0.5);
        const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const stripe = new THREE.Mesh(stripeGeom, stripeMat);
        stripe.position.set(runwayX + i * 22, runwayY + 0.01, runwayZ);
        runwayGroup.add(stripe);
    }
    
    // Edge markings
    for (let i = -12; i <= 12; i++) { // Viac značiek
        const edgeGeom = new THREE.BoxGeometry(8, 0.51, 0.3);
        const edgeMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const edge1 = new THREE.Mesh(edgeGeom, edgeMat);
        edge1.position.set(runwayX + i * 12, runwayY + 0.01, runwayZ - runwayWidth / 2);
        runwayGroup.add(edge1);
        
        const edge2 = edge1.clone();
        edge2.position.z = runwayZ + runwayWidth / 2;
        runwayGroup.add(edge2);
    }
    
    // Runway lights
    for (let i = -14; i <= 14; i++) { // Viac svetiel
        const lightGeom = new THREE.CylinderGeometry(0.3, 0.3, 1, 8);
        const lightMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const light1 = new THREE.Mesh(lightGeom, lightMat);
        light1.position.set(runwayX + i * 10.5, runwayY + 0.5, runwayZ - runwayWidth / 2 - 1);
        runwayGroup.add(light1);
        
        const light2 = light1.clone();
        light2.position.z = runwayZ + runwayWidth / 2 + 1;
        runwayGroup.add(light2);
    }
    
    // SUPPORT PILLARS - aby runway nevyzerala že je vo vzduchu!
    const terrainHeightAtRunway = getTerrainHeight(runwayX, runwayZ);
    const pillarHeight = runwayY - terrainHeightAtRunway;
    
    if (pillarHeight > 2) { // Len ak je runway dosť vysoko
        const numPillars = 8;
        const pillarSpacing = runwayLength / numPillars;
        
        for (let i = 0; i <= numPillars; i++) {
            const pillarX = runwayX - runwayLength/2 + i * pillarSpacing;
            
            // Left pillars
            const pillarGeom1 = new THREE.CylinderGeometry(1, 1.5, pillarHeight, 6);
            const pillarMat = new THREE.MeshStandardMaterial({
                color: 0x555555,
                roughness: 0.8
            });
            const pillar1 = new THREE.Mesh(pillarGeom1, pillarMat);
            pillar1.position.set(pillarX, terrainHeightAtRunway + pillarHeight/2, runwayZ - runwayWidth/2 - 2);
            pillar1.castShadow = true;
            runwayGroup.add(pillar1);
            
            // Right pillars
            const pillar2 = pillar1.clone();
            pillar2.position.z = runwayZ + runwayWidth/2 + 2;
            runwayGroup.add(pillar2);
        }
    }
    
    scene.add(runwayGroup);
    
    // Return spawn position na ZAČIATKU dlhšej runway
    return {
        x: runwayX - runwayLength / 2 + 30, // Na začiatku runway
        y: runwayY + 2,
        z: runwayZ
    };
}

// ===== CREATE PLAYER =====
function createPlayer() {
    player = new THREE.Group();

    // Use MIG-15 model if available
    if (mig15Model) {
        // Clone the MIG-15 model for the player
        const playerPlane = mig15Model.clone();
        
        // Scale it to reasonable size
        playerPlane.scale.set(0.005, 0.005, 0.005);
        
        // Rotate to face forward correctly
        playerPlane.rotation.x = Math.PI / 2; // 90 degrees up to make it horizontal
        playerPlane.rotation.y = Math.PI; // 180 degrees - SPÄŤ AKO BOLO!
        
        // Keep original textures for player (green-ish fighter)
        playerPlane.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
        player.add(playerPlane);
    } else {
        // Fallback: Create basic player plane (original code)
    const bodyGeometry = new THREE.CylinderGeometry(0.4, 0.5, 4, 8);
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x00cc00, 
        shininess: 90,
        specular: 0x444444
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.x = Math.PI / 2;
    body.rotation.y = Math.PI; // Flip 180 degrees
    body.castShadow = true;
    player.add(body);

    // Nose cone (pointed front)
    const noseGeometry = new THREE.ConeGeometry(0.4, 1.2, 8);
    const nose = new THREE.Mesh(noseGeometry, bodyMaterial);
    nose.rotation.x = Math.PI / 2;
    nose.rotation.y = Math.PI; // Flip 180 degrees
    nose.position.z = -2.6; // Flipped position
    nose.castShadow = true;
    player.add(nose);

    // Cockpit canopy
    const cockpitGeometry = new THREE.SphereGeometry(0.45, 16, 16);
    const cockpitMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x00ddff, 
        transparent: true, 
        opacity: 0.75,
        shininess: 120,
        specular: 0xffffff
    });
    const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
    cockpit.position.set(0, 0.3, -1.2); // Flipped position
    cockpit.scale.set(0.9, 0.6, 1.3);
    cockpit.castShadow = true;
    player.add(cockpit);

    // Main wings (delta wing style)
    const wingGeometry = new THREE.BoxGeometry(6, 0.15, 2);
    const wingMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x009900, 
        shininess: 70,
        specular: 0x333333
    });
    const wings = new THREE.Mesh(wingGeometry, wingMaterial);
    wings.position.z = 0.5; // Flipped position
    wings.castShadow = true;
    player.add(wings);

    // Wing tips (angled)
    const wingTipGeometry = new THREE.BoxGeometry(1.5, 0.12, 0.8);
    const leftWingTip = new THREE.Mesh(wingTipGeometry, wingMaterial);
    leftWingTip.position.set(-3.5, 0.3, 0.8); // Flipped position
    leftWingTip.rotation.z = Math.PI / 6;
    leftWingTip.castShadow = true;
    player.add(leftWingTip);
    
    const rightWingTip = new THREE.Mesh(wingTipGeometry, wingMaterial);
    rightWingTip.position.set(3.5, 0.3, 0.8); // Flipped position
    rightWingTip.rotation.z = -Math.PI / 6;
    rightWingTip.castShadow = true;
    player.add(rightWingTip);

    // Vertical stabilizers (tail fins)
    const tailFinGeometry = new THREE.BoxGeometry(0.15, 1.2, 1.5);
    const tailFin = new THREE.Mesh(tailFinGeometry, wingMaterial);
    tailFin.position.set(0, 0.6, 2.2); // Flipped position
    tailFin.castShadow = true;
    player.add(tailFin);

    // Horizontal stabilizers
    const hStabGeometry = new THREE.BoxGeometry(2.5, 0.12, 1);
    const hStab = new THREE.Mesh(hStabGeometry, wingMaterial);
    hStab.position.set(0, 0.2, 2.5); // Flipped position
    hStab.castShadow = true;
    player.add(hStab);

    // Engine exhausts (twin engines)
    const engineGeometry = new THREE.CylinderGeometry(0.25, 0.3, 0.8, 8);
    const engineMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x333333
    });
    
    const leftEngine = new THREE.Mesh(engineGeometry, engineMaterial);
    leftEngine.rotation.x = Math.PI / 2;
    leftEngine.rotation.y = Math.PI; // Flip 180 degrees
    leftEngine.position.set(-0.6, -0.1, 2.3); // Flipped position
    player.add(leftEngine);
    
    const rightEngine = new THREE.Mesh(engineGeometry, engineMaterial);
    rightEngine.rotation.x = Math.PI / 2;
    rightEngine.rotation.y = Math.PI; // Flip 180 degrees
    rightEngine.position.set(0.6, -0.1, 2.3); // Flipped position
    player.add(rightEngine);

    // Engine glow/afterburner effect
    const glowGeometry = new THREE.CylinderGeometry(0.2, 0.35, 0.6, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff6600,
        transparent: true,
        opacity: 0.8
    });
    
    const leftGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    leftGlow.rotation.x = Math.PI / 2;
    leftGlow.rotation.y = Math.PI; // Flip 180 degrees
    leftGlow.position.set(-0.6, -0.1, 2.9); // Flipped position
    player.add(leftGlow);
    
    const rightGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    rightGlow.rotation.x = Math.PI / 2;
    rightGlow.rotation.y = Math.PI; // Flip 180 degrees
    rightGlow.position.set(0.6, -0.1, 2.9); // Flipped position
    player.add(rightGlow);

    // Weapons hardpoints (missile rails)
    const hardpointGeometry = new THREE.BoxGeometry(0.3, 0.15, 1.2);
    const hardpointMaterial = new THREE.MeshPhongMaterial({ color: 0x666666 });
    
    const leftHardpoint = new THREE.Mesh(hardpointGeometry, hardpointMaterial);
    leftHardpoint.position.set(-2.5, -0.3, 0);
    leftHardpoint.castShadow = true;
    player.add(leftHardpoint);
        
        const rightHardpoint = new THREE.Mesh(hardpointGeometry, hardpointMaterial);
        rightHardpoint.position.set(2.5, -0.3, 0);
        rightHardpoint.castShadow = true;
        player.add(rightHardpoint);
    }

    // Position will be set by runway spawn point
    player.position.set(0, 50, 0); // Default, will be overridden
    // Remove the rotation from here since we rotated individual components
    scene.add(player);
}

// ===== CREATE ENEMY =====
function createEnemy() {
    const enemy = new THREE.Group();

    // Use MIG-15 model if available, otherwise create basic plane
    if (mig15Model) {
        // Clone the MIG-15 model for this enemy
        const enemyPlane = mig15Model.clone();
        
        // Scale to same size as player (0.005)
        enemyPlane.scale.set(0.005, 0.005, 0.005);
        
        // Rotate EXACTLY like player model
        enemyPlane.rotation.x = Math.PI / 2; // 90 degrees up to make it horizontal
        enemyPlane.rotation.y = Math.PI; // 180 degrees to face forward (SAME AS PLAYER)
        
        // Change color to red for enemies
        enemyPlane.traverse((child) => {
            if (child.isMesh && child.material) {
                // Handle both single materials and material arrays
                if (Array.isArray(child.material)) {
                    child.material = child.material.map(mat => {
                        const newMat = mat.clone ? mat.clone() : mat;
                        if (newMat.color) newMat.color.setHex(0xcc0000);
                        return newMat;
                    });
                } else {
                    const newMat = child.material.clone ? child.material.clone() : child.material;
                    if (newMat.color) newMat.color.setHex(0xcc0000);
                    child.material = newMat;
                }
                child.castShadow = true;
            }
        });
        
        enemy.add(enemyPlane);
    } else {
        // Fallback: Create basic enemy plane (original code)
        // Main body (fuselage) - enemy fighter
        const bodyGeometry = new THREE.CylinderGeometry(0.4, 0.35, 3, 8);
        const bodyMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xcc0000, 
            shininess: 80,
            specular: 0x444444
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.rotation.x = Math.PI / 2;
        body.rotation.y = Math.PI; // Otočené o 180°
        body.castShadow = true;
        enemy.add(body);

        // Nose cone - pointing forward
        const noseGeometry = new THREE.ConeGeometry(0.35, 1, 8);
        const nose = new THREE.Mesh(noseGeometry, bodyMaterial);
        nose.rotation.x = Math.PI / 2;
        nose.rotation.y = Math.PI; // Otočené o 180°
        nose.position.z = -2; // Front
        nose.castShadow = true;
        enemy.add(nose);

        // Cockpit
        const cockpitGeometry = new THREE.SphereGeometry(0.35, 12, 12);
        const cockpitMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xff4444, 
            transparent: true, 
            opacity: 0.7,
            shininess: 100
        });
        const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
        cockpit.position.set(0, 0.25, -1); // Near nose
        cockpit.scale.set(0.8, 0.5, 1.2);
        cockpit.castShadow = true;
        enemy.add(cockpit);

        // Wings (swept back design)
        const wingGeometry = new THREE.BoxGeometry(4.5, 0.12, 1.5);
        const wingMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x880000, 
            shininess: 60,
            specular: 0x222222
        });
        const wings = new THREE.Mesh(wingGeometry, wingMaterial);
        wings.position.z = -0.3; // Middle
        wings.rotation.y = Math.PI; // Otočené o 180°
        wings.castShadow = true;
        enemy.add(wings);

        // Wing tips
        const wingTipGeometry = new THREE.BoxGeometry(1, 0.1, 0.6);
        const leftWingTip = new THREE.Mesh(wingTipGeometry, wingMaterial);
        leftWingTip.position.set(-2.5, 0.25, -0.5);
        leftWingTip.rotation.z = Math.PI / 8;
        leftWingTip.rotation.y = Math.PI; // Otočené o 180°
        leftWingTip.castShadow = true;
        enemy.add(leftWingTip);
        
        const rightWingTip = new THREE.Mesh(wingTipGeometry, wingMaterial);
        rightWingTip.position.set(2.5, 0.25, -0.5);
        rightWingTip.rotation.z = -Math.PI / 8;
        rightWingTip.rotation.y = Math.PI; // Otočené o 180°
        rightWingTip.castShadow = true;
        enemy.add(rightWingTip);

        // Vertical stabilizer
        const tailFinGeometry = new THREE.BoxGeometry(0.12, 1, 1.2);
        const tailFin = new THREE.Mesh(tailFinGeometry, wingMaterial);
        tailFin.position.set(0, 0.5, 1.8); // Back
        tailFin.rotation.y = Math.PI; // Otočené o 180°
        tailFin.castShadow = true;
        enemy.add(tailFin);

        // Horizontal stabilizers
        const hStabGeometry = new THREE.BoxGeometry(2, 0.1, 0.8);
        const hStab = new THREE.Mesh(hStabGeometry, wingMaterial);
        hStab.position.set(0, 0.15, 2); // Back
        hStab.rotation.y = Math.PI; // Otočené o 180°
        hStab.castShadow = true;
        enemy.add(hStab);

        // Engine
        const engineGeometry = new THREE.CylinderGeometry(0.25, 0.2, 0.6, 8);
        const engineMaterial = new THREE.MeshBasicMaterial({ color: 0x222222 });
        const engine = new THREE.Mesh(engineGeometry, engineMaterial);
        engine.rotation.x = Math.PI / 2;
        engine.rotation.y = Math.PI; // Otočené o 180°
        engine.position.z = 2.2; // Back
        enemy.add(engine);

        // Engine glow
        const glowGeometry = new THREE.CylinderGeometry(0.22, 0.15, 0.4, 8);
        const glowMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff3300,
            transparent: true,
            opacity: 0.7
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.rotation.x = Math.PI / 2;
        glow.rotation.y = Math.PI; // Otočené o 180°
        glow.position.z = 2.6; // Behind engine
        enemy.add(glow);
    }

    // Spawn randomly across the entire map (not near player)
    const spawnX = (Math.random() - 0.5) * TERRAIN_SIZE * 0.8;
    const spawnZ = (Math.random() - 0.5) * TERRAIN_SIZE * 0.8;
    const spawnY = 40 + Math.random() * 80; // Random altitude between 40-120
    
    enemy.position.set(spawnX, spawnY, spawnZ);
    
    // Initialize enemy flight data
    const directionToPlayer = new THREE.Vector3()
        .subVectors(player.position, enemy.position)
        .normalize();
    
    enemy.velocity = directionToPlayer.multiplyScalar(ENEMY_SPEED);
    enemy.userData.health = 3; // Enemy has 3 HP
    enemy.userData.maxHealth = 3;
    enemy.userData.lastShot = 0; // Time of last shot
    enemy.userData.shootCooldown = 2000; // Shoot every 2 seconds
    
    // AI STATE SYSTEM
    enemy.userData.aiState = AI_STATE.PATROL; // Začína v patrol mode
    enemy.userData.patrolTarget = new THREE.Vector3(
        (Math.random() - 0.5) * TERRAIN_SIZE,
        40 + Math.random() * 80,
        (Math.random() - 0.5) * TERRAIN_SIZE
    );
    enemy.userData.engageDistance = 200 + Math.random() * 100; // 200-300
    enemy.userData.chaseDistance = 300;
    
    // Create health bar above enemy
    const healthBarGroup = new THREE.Group();
    
    // Background (red)
    const bgGeometry = new THREE.PlaneGeometry(2, 0.2);
    const bgMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide });
    const healthBg = new THREE.Mesh(bgGeometry, bgMaterial);
    healthBarGroup.add(healthBg);
    
    // Foreground (green) - shows current health
    const fgGeometry = new THREE.PlaneGeometry(2, 0.2);
    const fgMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
    const healthFg = new THREE.Mesh(fgGeometry, fgMaterial);
    healthFg.position.z = 0.01; // Slightly in front
    healthBarGroup.add(healthFg);
    
    healthBarGroup.position.y = 3; // Above enemy
    enemy.add(healthBarGroup);
    enemy.userData.healthBar = healthFg; // Store reference for updating
    
    // Point enemy toward player
    enemy.lookAt(player.position);

    scene.add(enemy);
    enemies.push(enemy);
}

// ===== CREATE ALLY (FRIENDLY BLUE PLANE) =====
function createAlly() {
    const ally = new THREE.Group();

    // Use MIG-15 model if available
    if (mig15Model) {
        // Clone the MIG-15 model for this ally
        const allyPlane = mig15Model.clone();
        
        // Scale to same size as player (0.005)
        allyPlane.scale.set(0.005, 0.005, 0.005);
        
        // Rotate EXACTLY like player model
        allyPlane.rotation.x = Math.PI / 2;
        allyPlane.rotation.y = Math.PI;
        
        // Change color to BLUE for allies
        allyPlane.traverse((child) => {
            if (child.isMesh && child.material) {
                if (Array.isArray(child.material)) {
                    child.material = child.material.map(mat => {
                        const newMat = mat.clone ? mat.clone() : mat;
                        if (newMat.color) newMat.color.setHex(0x0066ff); // Blue
                        return newMat;
                    });
                } else {
                    const newMat = child.material.clone ? child.material.clone() : child.material;
                    if (newMat.color) newMat.color.setHex(0x0066ff); // Blue
                    child.material = newMat;
                }
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
        ally.add(allyPlane);
    }

    // Spawn randomly across the entire map
    const spawnX = (Math.random() - 0.5) * TERRAIN_SIZE * 0.8;
    const spawnZ = (Math.random() - 0.5) * TERRAIN_SIZE * 0.8;
    const spawnY = 40 + Math.random() * 80; // Random altitude between 40-120
    
    ally.position.set(spawnX, spawnY, spawnZ);
    
    // Initialize ally data - allies help fight enemies
    ally.userData.currentDirection = new THREE.Vector3(0, 0, -1);
    ally.userData.health = 3;
    ally.userData.maxHealth = 3;
    ally.userData.lastShot = 0;
    ally.userData.shootCooldown = 2500; // Shoot slightly slower than enemies
    
    // Point ally in a random direction initially
    const randomDirection = new THREE.Vector3(
        Math.random() - 0.5,
        0,
        Math.random() - 0.5
    ).normalize();
    ally.userData.currentDirection.copy(randomDirection);

    scene.add(ally);
    allies.push(ally);
}

// ===== SHOOTING =====
function shoot() {
    const bullet = new THREE.Group();

    // Create two bullets (one from each side) - adjusted for smaller MIG-15 model
    for (let i = 0; i < 2; i++) {
        const bulletGeometry = new THREE.SphereGeometry(0.15, 8, 8);
        const bulletMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffff00,
            transparent: true,
            opacity: 0.9
        });
        const bulletMesh = new THREE.Mesh(bulletGeometry, bulletMaterial);
        
        // Add glow effect
        const glowGeometry = new THREE.SphereGeometry(0.25, 8, 8);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.3
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        bulletMesh.add(glow);
        
        // Position bullets at wing tips - adjusted for MIG-15 model size + shifted right
        const offsetX = i === 0 ? 1.80 : 2.80;
        bulletMesh.position.x = offsetX;
        bullet.add(bulletMesh);
    }

    // Position bullet at player position
    bullet.position.copy(player.position);
    bullet.rotation.copy(player.rotation);
    
    // Calculate bullet direction based on player orientation
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(player.quaternion);
    bullet.userData.velocity = direction.multiplyScalar(BULLET_SPEED);
    
    scene.add(bullet);
    bullets.push(bullet);
}

// ===== LAUNCH MISSILE (K KEY) =====
// ===== LAUNCH ENEMY MISSILE AT FSV =====
function launchEnemyMissile(enemy, targetPosition) {
    const missileGroup = new THREE.Group();
    
    // Missile body (red rocket)
    const bodyGeometry = new THREE.CylinderGeometry(0.15, 0.15, 1.5, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xff0000,
        metalness: 0.6,
        roughness: 0.3
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.x = Math.PI / 2;
    missileGroup.add(body);
    
    // Nose cone
    const noseGeometry = new THREE.ConeGeometry(0.15, 0.4, 8);
    const nose = new THREE.Mesh(noseGeometry, bodyMaterial);
    nose.rotation.x = -Math.PI / 2;
    nose.position.z = -0.95;
    missileGroup.add(nose);
    
    // Exhaust trail
    const exhaustGeometry = new THREE.ConeGeometry(0.2, 0.8, 8);
    const exhaustMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.7
    });
    const exhaust = new THREE.Mesh(exhaustGeometry, exhaustMaterial);
    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.z = 1.2;
    missileGroup.add(exhaust);
    
    // Position missile at enemy position
    missileGroup.position.copy(enemy.position);
    missileGroup.rotation.copy(enemy.rotation);
    
    // Store target and velocity
    missileGroup.userData.isEnemyMissile = true;
    missileGroup.userData.target = targetPosition.clone();
    missileGroup.userData.lifeTime = 0;
    missileGroup.userData.maxLifeTime = 15000;
    
    const direction = new THREE.Vector3().subVectors(targetPosition, enemy.position).normalize();
    missileGroup.userData.velocity = direction.clone();
    
    scene.add(missileGroup);
    enemyMissiles.push(missileGroup);
    
    console.log("🔴 Enemy launched missile at FSV!");
}

// ===== UPDATE ENEMY MISSILES =====
function updateEnemyMissiles() {
    for (let i = enemyMissiles.length - 1; i >= 0; i--) {
        const missile = enemyMissiles[i];
        
        missile.userData.lifeTime += 16;
        
        // Remove if too old
        if (missile.userData.lifeTime > missile.userData.maxLifeTime) {
            scene.remove(missile);
            enemyMissiles.splice(i, 1);
            continue;
        }
        
        // Home towards FSV
        if (fsvBuilding && fsvBuilding.health > 0) {
            const targetPos = new THREE.Vector3(fsvBuilding.x, fsvBuilding.y + 10, fsvBuilding.z);
            const directionToTarget = new THREE.Vector3()
                .subVectors(targetPos, missile.position)
                .normalize();
            
            missile.userData.velocity.lerp(directionToTarget, 0.05);
            missile.userData.velocity.normalize();
            
            missile.lookAt(missile.position.clone().add(missile.userData.velocity));
        }
        
        // Move missile
        missile.position.add(missile.userData.velocity.clone().multiplyScalar(MISSILE_SPEED * 0.8));
        
        // Check collision with FSV
        if (fsvBuilding && fsvBuilding.health > 0) {
            const distanceToFSV = missile.position.distanceTo(
                new THREE.Vector3(fsvBuilding.x, fsvBuilding.y, fsvBuilding.z)
            );
            
            if (distanceToFSV < 30) {
                // Hit FSV!
                fsvBuilding.health -= 20;
                console.log(`💥 FSV hit by enemy missile! Health: ${fsvBuilding.health}/${fsvBuilding.maxHealth}`);
                
                createExplosion(missile.position, 2.0);
                scene.remove(missile);
                enemyMissiles.splice(i, 1);
                
                // Check if FSV destroyed
                if (fsvBuilding.health <= 0) {
                    destroyFSV();
                }
            }
        }
    }
}

// ===== DESTROY FSV (GAME OVER) =====
function destroyFSV() {
    if (!fsvBuilding) return;
    
    console.log("💥💥💥 FSV BUILDING DESTROYED!");
    
    // Multiple explosions
    for (let i = 0; i < 8; i++) {
        setTimeout(() => {
            const explosionPos = new THREE.Vector3(
                fsvBuilding.x + (Math.random() - 0.5) * 40,
                fsvBuilding.y + Math.random() * 30,
                fsvBuilding.z + (Math.random() - 0.5) * 30
            );
            createExplosion(explosionPos, 5.0);
        }, i * 300);
    }
    
    // Remove building after 3 seconds
    setTimeout(() => {
        if (fsvBuilding.group) {
            scene.remove(fsvBuilding.group);
        }
    }, 3000);
    
    // Game Over after 4 seconds
    setTimeout(() => {
        gameOver("FSV Jinonice boli zničené! Misia zlyhala.");
    }, 4000);
    
    fsvBuilding.health = 0;
}

// ===== CHECK IF ALL ENEMIES DESTROYED =====
function checkAllEnemiesDestroyed() {
    if (enemies.length === 0 && !allEnemiesDestroyed && missionPhase === 1) {
        allEnemiesDestroyed = true;
        missionPhase = 2;
        
        // Show mission success message
        showMissionMessage("Odvrátil si útok Hollarskej šlachty!<br>Teraz nájdi a znič Hollar!");
        
        console.log("✅ All enemies destroyed! Phase 2: Attack Hollar!");
    }
}

// ===== SHOW MISSION MESSAGE =====
function showMissionMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.style.position = 'absolute';
    messageDiv.style.top = '20%';
    messageDiv.style.left = '50%';
    messageDiv.style.transform = 'translateX(-50%)';
    messageDiv.style.background = 'rgba(0, 150, 0, 0.9)';
    messageDiv.style.color = 'white';
    messageDiv.style.padding = '30px 60px';
    messageDiv.style.fontSize = '32px';
    messageDiv.style.fontWeight = 'bold';
    messageDiv.style.borderRadius = '15px';
    messageDiv.style.border = '4px solid #00ff00';
    messageDiv.style.textAlign = 'center';
    messageDiv.style.zIndex = '9000';
    messageDiv.style.boxShadow = '0 0 30px rgba(0, 255, 0, 0.7)';
    messageDiv.innerHTML = message;
    
    document.body.appendChild(messageDiv);
    
    // Fade out after 10 seconds
    setTimeout(() => {
        messageDiv.style.transition = 'opacity 1s';
        messageDiv.style.opacity = '0';
        setTimeout(() => messageDiv.remove(), 1000);
    }, 10000);
}

// ===== SHOW WARNING MESSAGE =====
function showWarningMessage(message, duration = 5000) {
    const warningDiv = document.createElement('div');
    warningDiv.style.position = 'absolute';
    warningDiv.style.top = '15%';
    warningDiv.style.left = '50%';
    warningDiv.style.transform = 'translateX(-50%)';
    warningDiv.style.background = 'rgba(200, 0, 0, 0.95)';
    warningDiv.style.color = 'yellow';
    warningDiv.style.padding = '25px 50px';
    warningDiv.style.fontSize = '42px';
    warningDiv.style.fontWeight = 'bold';
    warningDiv.style.borderRadius = '10px';
    warningDiv.style.border = '5px solid #ff0000';
    warningDiv.style.textAlign = 'center';
    warningDiv.style.zIndex = '9500';
    warningDiv.style.boxShadow = '0 0 40px rgba(255, 0, 0, 0.9)';
    warningDiv.style.animation = 'pulse 0.5s infinite';
    warningDiv.innerHTML = message;
    
    // Add pulsing animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0%, 100% { transform: translateX(-50%) scale(1); }
            50% { transform: translateX(-50%) scale(1.05); }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(warningDiv);
    
    // Remove after duration
    setTimeout(() => {
        warningDiv.style.transition = 'opacity 1s';
        warningDiv.style.opacity = '0';
        setTimeout(() => {
            warningDiv.remove();
            style.remove();
        }, 1000);
    }, duration);
}

// ===== RANDOM ENEMY ATTACKS FSV =====
function triggerRandomFSVAttack() {
    const now = Date.now();
    
    // Random attack every 30 seconds
    if (now - lastRandomAttack > 30000 && enemies.length > 0 && fsvBuilding && fsvBuilding.health > 0) {
        lastRandomAttack = now;
        
        // Select random enemy to attack FSV
        const randomEnemy = enemies[Math.floor(Math.random() * enemies.length)];
        randomEnemy.userData.targetFSV = true;
        randomEnemy.userData.isRandomAttacker = true; // Mark as special attacker
        
        console.log("🎯 Random enemy selected to attack FSV!");
    }
}

// ===== CHECK FOR TOTAL ATTACK (ALL ALLIES DEAD) =====
function checkTotalAttack() {
    if (allies.length === 0 && !totalAttackWarningShown && enemies.length > 0) {
        totalAttackWarningShown = true;
        showWarningMessage("!POZOR TOTÁLNY ÚTOK!!", 5000);
        
        // Make ALL enemies target FSV
        enemies.forEach(enemy => {
            enemy.userData.targetFSV = true;
        });
        
        console.log("🚨 TOTAL ATTACK! All enemies targeting FSV!");
    }
}

function launchMissile() {
    if (missileCount <= 0 || !lockedTarget || lockProgress < MISSILE_LOCK_TIME) {
        return; // No missiles, no target, or not locked
    }
    
    missileCount--;
    
    // Create missile
    const missileGroup = new THREE.Group();
    
    // Missile body (red rocket)
    const bodyGeometry = new THREE.CylinderGeometry(0.15, 0.15, 1.5, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xff3333,
        metalness: 0.6,
        roughness: 0.3
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.x = Math.PI / 2;
    missileGroup.add(body);
    
    // Missile nose cone
    const noseGeometry = new THREE.ConeGeometry(0.15, 0.4, 8);
    const nose = new THREE.Mesh(noseGeometry, bodyMaterial);
    nose.rotation.x = -Math.PI / 2;
    nose.position.z = -0.95;
    missileGroup.add(nose);
    
    // Fins
    const finGeometry = new THREE.BoxGeometry(0.5, 0.02, 0.3);
    const finMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    for (let i = 0; i < 4; i++) {
        const fin = new THREE.Mesh(finGeometry, finMaterial);
        fin.position.z = 0.6;
        const angle = (i * Math.PI) / 2;
        fin.position.x = Math.cos(angle) * 0.15;
        fin.position.y = Math.sin(angle) * 0.15;
        fin.rotation.z = angle;
        missileGroup.add(fin);
    }
    
    // Exhaust trail (orange glow)
    const exhaustGeometry = new THREE.ConeGeometry(0.2, 0.8, 8);
    const exhaustMaterial = new THREE.MeshBasicMaterial({
        color: 0xff6600,
        transparent: true,
        opacity: 0.6
    });
    const exhaust = new THREE.Mesh(exhaustGeometry, exhaustMaterial);
    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.z = 1.2;
    missileGroup.add(exhaust);
    
    // Position missile at player position
    missileGroup.position.copy(player.position);
    missileGroup.rotation.copy(player.rotation);
    
    // Store target and initial velocity
    missileGroup.userData.target = lockedTarget;
    missileGroup.userData.lifeTime = 0;
    missileGroup.userData.maxLifeTime = 10000; // 10 seconds max
    
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(player.quaternion);
    missileGroup.userData.velocity = direction.clone();
    
    scene.add(missileGroup);
    missiles.push(missileGroup);
    
    // Reset lock after launch
    lockedTarget = null;
    lockProgress = 0;
}

// ===== UPDATE PLAYER =====
function updatePlayer() {
    if (!gameRunning) return;

    // ===== GROUND MODE (na runway) =====
    if (isOnGround) {
        // Môže len zrýchľovať/spomaliť na runway
        if (keys['w']) {
            groundSpeed = Math.min(groundSpeed + 0.02, 2.5);
            
            // Hide takeoff hint when player starts moving
            const takeoffHint = document.getElementById('takeoffHint');
            if (takeoffHint && groundSpeed > 0.1) {
                takeoffHint.style.display = 'none';
            }
        } else if (keys['s']) {
            groundSpeed = Math.max(groundSpeed - 0.03, 0);
        } else {
            // Slow down naturally
            groundSpeed = Math.max(groundSpeed - 0.01, 0);
        }
        
        // Pohyb ROVNO po runway (len po X osi - smerom DOPRAVA k FSV)
        // Runway je orientovaná v +X smere (od -X smerom k +X, doprava)
        player.position.x += groundSpeed; // PLUS - ide doprava!
        
        // Žiadny pohyb do strán ani hore/dole
        // player.position.y a player.position.z zostávajú konštantné
        
        // Stíhačka zostáva otočená DOPRAVA (-90° = hľadí v smere +X)
        player.rotation.set(0, -Math.PI / 2, 0);
        playerYaw = -Math.PI / 2;
        playerPitch = 0;
        playerRoll = 0;
        
        // TAKEOFF - ak dosiahne potrebnú rýchlosť a hráč stlačí šípku hore
        if (groundSpeed >= takeoffSpeed && (keys['arrowup'] || keys['q'])) {
            isOnGround = false;
            playerSpeed = groundSpeed;
            playerPitch = 0.3; // Mierne nadvihnúť nos
            console.log("🛫 TAKEOFF!");
        }
        
        // Update UI
        document.getElementById('speed').textContent = `Rýchlosť: ${Math.floor(groundSpeed * 100)} km/h ${groundSpeed >= takeoffSpeed ? '✈️ READY!' : ''}`;
        document.getElementById('altitude').textContent = `Výška: 0m (ON GROUND)`;
        
        return; // Nepokračuj do air mode
    }

    // ===== AIR MODE (normálne lietanie) =====
    const maxSpeed = keys['shift'] ? PLAYER_TURBO_SPEED : PLAYER_MAX_SPEED;

    // Speed control - can only speed up or slow down (never stop)
    if (keys['w']) {
        playerSpeed = Math.min(playerSpeed + PLAYER_ACCELERATION, maxSpeed);
    } else if (keys['s']) {
        playerSpeed = Math.max(playerSpeed - PLAYER_ACCELERATION, PLAYER_MIN_SPEED);
    } else {
        // Gradually return to minimum speed
        if (playerSpeed > PLAYER_MIN_SPEED + 0.1) {
            playerSpeed -= PLAYER_ACCELERATION * 0.3;
        } else if (playerSpeed < PLAYER_MIN_SPEED) {
            playerSpeed = PLAYER_MIN_SPEED;
        }
    }

    // Yaw (Left/Right turning) - A/D keys + ŠÍPKY DOĽAVA/DOPRAVA
    if (keys['a'] || keys['arrowleft']) {
        playerYaw += PLAYER_TURN_SPEED;
        playerRoll = Math.min(playerRoll + PLAYER_ROLL_SPEED, 0.6); // Bank right
    } else if (keys['d'] || keys['arrowright']) {
        playerYaw -= PLAYER_TURN_SPEED;
        playerRoll = Math.max(playerRoll - PLAYER_ROLL_SPEED, -0.6); // Bank left
    } else {
        // Auto-level the roll when not turning
        playerRoll *= 0.92;
    }

    // Pitch (Up/Down) - Arrow keys or Q/E
    if (keys['arrowup'] || keys['q']) {
        playerPitch = Math.min(playerPitch + PLAYER_PITCH_SPEED, 0.8);
    } else if (keys['arrowdown'] || keys['e']) {
        playerPitch = Math.max(playerPitch - PLAYER_PITCH_SPEED, -0.8);
    } else {
        // Pomaly sa vracia do vodorovnej polohy (0.995 = veľmi veľmi pomaly)
        playerPitch *= 0.98;
    }

    // Apply rotations to player (Euler angles in correct order)
    player.rotation.order = 'YXZ'; // Yaw, Pitch, Roll order
    player.rotation.y = playerYaw;
    player.rotation.x = playerPitch;
    player.rotation.z = playerRoll;

    // Calculate movement direction based on player orientation
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(player.quaternion);
    
    // Update velocity - always moving forward
    playerVelocity.copy(direction).multiplyScalar(playerSpeed);
    
    // Apply velocity to position
    player.position.add(playerVelocity);

    // ===== SMRTEĽNÉ KOLÍZIE =====
    
    // 1. Kolízia so zemou (terrain)
    const terrainHeight = getTerrainHeight(player.position.x, player.position.z);
    if (player.position.y < terrainHeight + 2) {
        createExplosion(player.position, 1.5);
        console.log("💥 CRASHED INTO GROUND!");
        gameOver();
        return;
    }

    // 2. Kolízia s budovami
    for (const building of buildings) {
        const distance = player.position.distanceTo(building.position);
        // Zväčšený radius pre kolíziu s budovami (budovy sú veľké)
        if (distance < 15) {
            createExplosion(player.position, 1.5);
            console.log("💥 CRASHED INTO BUILDING!");
            gameOver();
            return;
        }
    }

    // 2b. Kolízia s HOLLAR budovou
    if (hollarBuilding && hollarBuilding.group) {
        const distanceToHollar = player.position.distanceTo(
            new THREE.Vector3(hollarBuilding.x, hollarBuilding.y, hollarBuilding.z)
        );
        // Hollar je veľká budova (30x19.5x18m)
        if (distanceToHollar < 25) {
            createExplosion(player.position, 2.0);
            console.log("💥 CRASHED INTO HOLLAR!");
            gameOver();
            return;
        }
    }

    // 3. Kolízia s nepriateľskými stíhačkami
    for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        if (enemy.userData.destroyed) continue; // Skip destroyed planes
        
        const distance = player.position.distanceTo(enemy.position);
        if (distance < 10) {
            // Obe lietadlá explodujú
            createExplosion(player.position, 1.5);
            createExplosion(enemy.position, 1.5);
            
            // Odstráň nepriateľa
            scene.remove(enemy);
            enemies.splice(i, 1);
            
            console.log("💥 MID-AIR COLLISION!");
            gameOver();
            return;
        }
    }

    // World boundaries (soft boundaries)
    const maxBoundary = WORLD_SIZE;
    if (Math.abs(player.position.x) > maxBoundary) {
        player.position.x = Math.sign(player.position.x) * maxBoundary;
    }
    if (Math.abs(player.position.z) > maxBoundary) {
        player.position.z = Math.sign(player.position.z) * maxBoundary;
    }

    // Max altitude
    player.position.y = Math.min(player.position.y, 200);

    // Update camera to follow player (third person)
    updateCamera();
    
    // Update UI
    updateUI();
}

// ===== UPDATE CAMERA =====
function updateCamera() {
    // Camera follows player from behind and above - slightly to the right
    // VÝRAZNE VYŠŠIA KAMERA NA RUNWAY - pekný pohľad na vzlietanie!
    const heightOffset = isOnGround ? 12 : 4; // Z 6 na 12 - oveľa viac zhora!
    const distanceOffset = isOnGround ? 15 : 10; // Ďalej vzadu pri runway
    const cameraOffset = new THREE.Vector3(2, heightOffset, distanceOffset);
    cameraOffset.applyQuaternion(player.quaternion);
    
    const targetCameraPosition = new THREE.Vector3()
        .copy(player.position)
        .add(cameraOffset);
    
    // Smooth camera movement (lerp)
    camera.position.lerp(targetCameraPosition, 0.1);
    
    // Camera looks directly at player position
    camera.lookAt(player.position);
}

// ===== UPDATE BULLETS =====
function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        // Move bullet in its direction
        if (bullet.userData.velocity) {
            bullet.position.add(bullet.userData.velocity);
        }

        // Remove bullet if too far from player
        const distanceFromPlayer = bullet.position.distanceTo(player.position);
        if (distanceFromPlayer > 300) {
            scene.remove(bullet);
            bullets.splice(i, 1);
        }
    }
}

// ===== UPDATE MISSILES (GUIDED TRACKING) =====
function updateMissiles() {
    const currentTime = Date.now();
    
    for (let i = missiles.length - 1; i >= 0; i--) {
        const missile = missiles[i];
        
        // Check lifetime
        missile.userData.lifeTime += 16; // ~60 FPS
        if (missile.userData.lifeTime > missile.userData.maxLifeTime) {
            scene.remove(missile);
            missiles.splice(i, 1);
            createExplosion(missile.position, 0.8); // Smaller explosion for timeout
            continue;
        }
        
        // GUIDED TRACKING
        if (missile.userData.target) {
            let targetPosition;
            let isTargetValid = false;
            
            // Check if target is enemy plane
            if (enemies.includes(missile.userData.target)) {
                targetPosition = missile.userData.target.position;
                isTargetValid = true;
            }
            // Check if target is Hollar building
            else if (hollarBuilding && missile.userData.target === hollarBuilding.group) {
                targetPosition = new THREE.Vector3(
                    hollarBuilding.x,
                    hollarBuilding.y + 10, // Aim at center of building
                    hollarBuilding.z
                );
                isTargetValid = hollarBuilding.group.userData.health > 0;
            }
            
            if (isTargetValid) {
                // Calculate direction to target
                const directionToTarget = new THREE.Vector3()
                    .subVectors(targetPosition, missile.position)
                    .normalize();
                
                // Smoothly turn missile toward target (homing)
                missile.userData.velocity.lerp(directionToTarget, MISSILE_TURN_SPEED);
                missile.userData.velocity.normalize();
                
                // Update missile rotation to face direction
                const targetQuaternion = new THREE.Quaternion();
                const targetMatrix = new THREE.Matrix4();
                targetMatrix.lookAt(
                    missile.position,
                    missile.position.clone().add(missile.userData.velocity),
                    new THREE.Vector3(0, 1, 0)
                );
                targetQuaternion.setFromRotationMatrix(targetMatrix);
                missile.quaternion.slerp(targetQuaternion, 0.1);
            }
        }
        
        // Move missile
        missile.position.add(missile.userData.velocity.clone().multiplyScalar(MISSILE_SPEED));
        
        // Animate exhaust trail
        const exhaust = missile.children.find(child => child.material && child.material.color.getHex() === 0xff6600);
        if (exhaust) {
            exhaust.material.opacity = 0.4 + Math.sin(currentTime * 0.01) * 0.2;
        }
        
        // Check collision with enemies
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            const distance = missile.position.distanceTo(enemy.position);
            
            if (distance < 5) {
                // MISSILE HIT ENEMY!
                enemy.userData.health -= 3; // Missile does 3 damage (kills in 1 hit)
                
                // Create BIG explosion when missile hits!
                createExplosion(missile.position, 2.0);
                
                // Update health bar
                if (enemy.children.length > 0) {
                    const healthBarGroup = enemy.children[enemy.children.length - 1];
                    if (healthBarGroup.type === 'Group') {
                        const healthBar = healthBarGroup.children[1];
                        if (healthBar) {
                            const healthPercent = enemy.userData.health / enemy.userData.maxHealth;
                            healthBar.scale.x = healthPercent;
                        }
                    }
                }
                
                // Remove missile
                scene.remove(missile);
                missiles.splice(i, 1);
                
                // If enemy dead, convert to wreckage!
                if (enemy.userData.health <= 0) {
                    enemies.splice(j, 1);
                    createWreckage(enemy); // Padajúca vraska!
                    score += 50; // Missile kill bonus!
                    updateUI();
                }
                
                break;
            }
        }
        
        // Check collision with HOLLAR BUILDING
        if (hollarBuilding && hollarBuilding.group.userData.health > 0) {
            const hollarCenter = new THREE.Vector3(
                hollarBuilding.x,
                hollarBuilding.y + 10,
                hollarBuilding.z
            );
            const distanceToHollar = missile.position.distanceTo(hollarCenter);
            
            if (distanceToHollar < 20) { // Building is bigger, so bigger radius
                // MISSILE HIT HOLLAR!
                hollarBuilding.group.userData.health -= 25; // Each missile does 25 damage
                
                // Create HUGE explosion!
                createExplosion(missile.position, 3.0);
                
                // Remove missile
                scene.remove(missile);
                missiles.splice(i, 1);
                
                console.log(`🎯 Hit Hollar! Health: ${hollarBuilding.group.userData.health}/100`);
                
                // If Hollar destroyed, VICTORY!
                if (hollarBuilding.group.userData.health <= 0) {
                    destroyHollar();
                }
                
                continue;
            }
        }
    }
}

// ===== DESTROY HOLLAR - VICTORY! =====
function destroyHollar() {
    console.log("🎆 HOLLAR DESTROYED - VICTORY!");
    
    // Create massive explosion
    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            const randomOffset = new THREE.Vector3(
                (Math.random() - 0.5) * 20,
                Math.random() * 15,
                (Math.random() - 0.5) * 15
            );
            const explosionPos = new THREE.Vector3(
                hollarBuilding.x + randomOffset.x,
                hollarBuilding.y + randomOffset.y,
                hollarBuilding.z + randomOffset.z
            );
            createExplosion(explosionPos, 4.0);
        }, i * 300);
    }
    
    // Remove building after explosions
    setTimeout(() => {
        scene.remove(hollarBuilding.group);
    }, 2000);
    
    // Show VICTORY screen
    setTimeout(() => {
        showVictory();
    }, 2500);
}

// ===== SHOW VICTORY SCREEN =====
function showVictory() {
    gameRunning = false;
    
    const victoryDiv = document.createElement('div');
    victoryDiv.id = 'victoryScreen';
    victoryDiv.style.cssText = `
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0, 100, 0, 0.9);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        color: #fff;
        font-family: monospace;
    `;
    
    victoryDiv.innerHTML = `
        <div style="font-size: 72px; font-weight: bold; color: #00ff00; margin-bottom: 20px;">
            🎉 VÍŤAZSTVO! 🎉
        </div>
        <div style="font-size: 32px; margin-bottom: 40px;">
            Úspešne si zničil budovu HOLLAR!
        </div>
        <div style="font-size: 24px; margin-bottom: 10px;">
            Skóre: ${score}
        </div>
        <button onclick="location.reload()" style="
            margin-top: 30px;
            padding: 15px 40px;
            font-size: 24px;
            background: #00aa00;
            color: white;
            border: 3px solid #00ff00;
            border-radius: 10px;
            cursor: pointer;
            font-family: monospace;
        ">
            HRAŤ ZNOVA
        </button>
    `;
    
    document.body.appendChild(victoryDiv);
}

// ===== LOCK-ON TARGET TRACKING =====
function updateTargetLocking() {
    if (isOnGround) {
        lockedTarget = null;
        lockProgress = 0;
        return;
    }
    
    // Find closest target (enemy plane OR Hollar building) in front of player
    let closestTarget = null;
    let closestDistance = MISSILE_LOCK_RANGE;
    let targetType = null; // 'enemy' or 'building'
    
    const playerForward = new THREE.Vector3(0, 0, -1);
    playerForward.applyQuaternion(player.quaternion);
    
    // Check enemies
    for (const enemy of enemies) {
        const dirToEnemy = new THREE.Vector3()
            .subVectors(enemy.position, player.position);
        const distance = dirToEnemy.length();
        
        // Check if enemy is in front (dot product > 0.7 = ~45 degree cone)
        const dot = dirToEnemy.normalize().dot(playerForward);
        
        if (dot > 0.7 && distance < closestDistance) {
            closestTarget = enemy;
            closestDistance = distance;
            targetType = 'enemy';
        }
    }
    
    // Check Hollar building
    if (hollarBuilding && hollarBuilding.group.userData.health > 0) {
        const hollarCenter = new THREE.Vector3(
            hollarBuilding.x,
            hollarBuilding.y + 10, // Center of building
            hollarBuilding.z
        );
        const dirToHollar = new THREE.Vector3()
            .subVectors(hollarCenter, player.position);
        const distance = dirToHollar.length();
        
        // Check if Hollar is in front (wider cone = 0.6 for building)
        const dot = dirToHollar.normalize().dot(playerForward);
        
        if (dot > 0.6 && distance < closestDistance) {
            closestTarget = hollarBuilding.group;
            closestDistance = distance;
            targetType = 'building';
        }
    }
    
    // Update lock progress
    if (closestTarget) {
        if (lockedTarget === closestTarget) {
            lockProgress = Math.min(lockProgress + 16, MISSILE_LOCK_TIME);
        } else {
            lockedTarget = closestTarget;
            lockProgress = 0;
        }
    } else {
        lockedTarget = null;
        lockProgress = 0;
    }
    
    // Update lock UI
    const lockUI = document.getElementById('lockIndicator');
    if (lockedTarget && closestDistance < 300) { // Show only when closer than 300m
        lockUI.style.display = 'block';
        
        // Convert 3D target position to 2D screen coordinates
        let targetScreenPos;
        if (targetType === 'building') {
            // Use building center
            const buildingCenter = new THREE.Vector3(
                hollarBuilding.x,
                hollarBuilding.y + 10,
                hollarBuilding.z
            );
            targetScreenPos = buildingCenter.clone();
        } else {
            // Use enemy position
            targetScreenPos = lockedTarget.position.clone();
        }
        targetScreenPos.project(camera);
        
        // Convert from normalized device coordinates (-1 to 1) to pixels
        const screenX = (targetScreenPos.x + 1) * window.innerWidth / 2;
        const screenY = (-targetScreenPos.y + 1) * window.innerHeight / 2;
        
        // Position the lock indicator (centered on target)
        lockUI.style.left = `${screenX - 50}px`; // 50 = half of 100px width
        lockUI.style.top = `${screenY - 50}px`;  // 50 = half of 100px height
        lockUI.style.transform = 'none'; // Remove centering transform
        
        const lockPercent = lockProgress / MISSILE_LOCK_TIME;
        if (lockPercent >= 1.0) {
            lockUI.style.borderColor = '#ff0000';
            lockUI.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
            lockUI.innerHTML = '<div style="color: #ff0000; font-weight: bold;">LOCK</div>';
        } else {
            lockUI.style.borderColor = `rgba(0, 255, 0, ${lockPercent})`;
            lockUI.style.backgroundColor = `rgba(0, 255, 0, ${lockPercent * 0.1})`;
            lockUI.innerHTML = `<div style="color: #00ff00;">${Math.floor(lockPercent * 100)}%</div>`;
        }
    } else {
        lockUI.style.display = 'none';
    }
}

// ===== UPDATE ENEMIES =====
function updateEnemies() {
    const currentTime = Date.now();
    
    // Check if all allies are dead - then enemies target FSV building
    const allAlliesDead = allies.length === 0;
    
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        const distanceToPlayer = enemy.position.distanceTo(player.position);
        
        // If all allies dead, some enemies attack FSV building
        if (allAlliesDead && fsvBuilding && fsvBuilding.health > 0) {
            const distanceToFSV = enemy.position.distanceTo(
                new THREE.Vector3(fsvBuilding.x, fsvBuilding.y, fsvBuilding.z)
            );
            
            // 50% chance to attack FSV, 50% to attack player
            if (!enemy.userData.targetFSV && Math.random() < 0.5) {
                enemy.userData.targetFSV = true;
            }
            
            // Attack FSV building
            if (enemy.userData.targetFSV && distanceToFSV < 400) {
                const fsvPosition = new THREE.Vector3(fsvBuilding.x, fsvBuilding.y + 20, fsvBuilding.z);
                const directionToFSV = new THREE.Vector3().subVectors(fsvPosition, enemy.position).normalize();
                
                // Smooth rotation towards FSV
                const targetQuaternion = new THREE.Quaternion();
                const lookAtMatrix = new THREE.Matrix4();
                lookAtMatrix.lookAt(enemy.position, fsvPosition, new THREE.Vector3(0, 1, 0));
                targetQuaternion.setFromRotationMatrix(lookAtMatrix);
                enemy.quaternion.slerp(targetQuaternion, 0.03);
                
                // Move towards FSV
                enemy.position.add(directionToFSV.multiplyScalar(ENEMY_SPEED));
                
                // Shoot missiles at FSV if close enough (every 5 seconds)
                if (distanceToFSV < 200 && (!enemy.userData.lastFSVShot || currentTime - enemy.userData.lastFSVShot > 5000)) {
                    launchEnemyMissile(enemy, fsvPosition);
                    enemy.userData.lastFSVShot = currentTime;
                }
                
                continue; // Skip normal AI
            }
        }
        
        // ===== REALISTICKÉ AI - STATE MACHINE =====
        let targetDirection = new THREE.Vector3();
        
        switch (enemy.userData.aiState) {
            case AI_STATE.PATROL:
                // Patrol - leti k patrol bodu, ignoruje hráča
                const dirToPatrol = new THREE.Vector3()
                    .subVectors(enemy.userData.patrolTarget, enemy.position);
                
                // Ak dosiahol patrol bod, vyber nový
                if (dirToPatrol.length() < 50) {
                    enemy.userData.patrolTarget.set(
                        (Math.random() - 0.5) * TERRAIN_SIZE * 0.7,
                        40 + Math.random() * 80,
                        (Math.random() - 0.5) * TERRAIN_SIZE * 0.7
                    );
                }
                
                targetDirection.copy(dirToPatrol.normalize());
                
                // Ak hráč je blízko (200-300m), prepni na ENGAGE
                if (distanceToPlayer < enemy.userData.engageDistance) {
                    enemy.userData.aiState = AI_STATE.ENGAGE;
                }
                break;
                
            case AI_STATE.ENGAGE:
                // Engage - krúži okolo hráča, občasne útočí
                const angleAroundPlayer = (currentTime * 0.0005 + i) % (Math.PI * 2);
                const circleRadius = 150;
                const circleTarget = new THREE.Vector3(
                    player.position.x + Math.cos(angleAroundPlayer) * circleRadius,
                    player.position.y + Math.sin(angleAroundPlayer * 0.5) * 30,
                    player.position.z + Math.sin(angleAroundPlayer) * circleRadius
                );
                
                targetDirection.subVectors(circleTarget, enemy.position).normalize();
                
                // Ak je hráč za ním (tail chase), prepni na CHASE
                const dirToEnemy = new THREE.Vector3().subVectors(enemy.position, player.position);
                const enemyForward = new THREE.Vector3(0, 0, -1).applyQuaternion(enemy.quaternion);
                const dotProduct = dirToEnemy.normalize().dot(enemyForward);
                
                if (dotProduct < -0.3 && distanceToPlayer < 200) {
                    // Hráč je za ním! EVADE!
                    enemy.userData.aiState = AI_STATE.EVADE;
                } else if (distanceToPlayer < 100 && Math.random() < 0.3) {
                    // Náhodne chase
                    enemy.userData.aiState = AI_STATE.CHASE;
                }
                
                // Ak hráč odletí ďaleko, späť na patrol
                if (distanceToPlayer > enemy.userData.chaseDistance) {
                    enemy.userData.aiState = AI_STATE.PATROL;
                }
                break;
                
            case AI_STATE.CHASE:
                // Chase - prenasleduje hráča (ako predtým)
                targetDirection.subVectors(player.position, enemy.position).normalize();
                
                // Ak je príliš blízko, evade
                if (distanceToPlayer < 30) {
                    enemy.userData.aiState = AI_STATE.EVADE;
                }
                
                // Ak odletí, späť na engage
                if (distanceToPlayer > 250) {
                    enemy.userData.aiState = AI_STATE.ENGAGE;
                }
                break;
                
            case AI_STATE.EVADE:
                // Evade - unikanie (leti preč od hráča)
                const awayFromPlayer = new THREE.Vector3()
                    .subVectors(enemy.position, player.position)
                    .normalize();
                
                // Pridaj náhodný manéver
                awayFromPlayer.x += (Math.random() - 0.5) * 0.5;
                awayFromPlayer.y += (Math.random() - 0.5) * 0.5;
                awayFromPlayer.z += (Math.random() - 0.5) * 0.5;
                
                targetDirection.copy(awayFromPlayer.normalize());
                
                // Ak získal odstup, späť na engage
                if (distanceToPlayer > 150) {
                    enemy.userData.aiState = AI_STATE.ENGAGE;
                }
                break;
        }
        
        // ===== COLLISION AVOIDANCE =====
        let avoidanceVector = new THREE.Vector3();
        for (let j = 0; j < enemies.length; j++) {
            if (i !== j) {
                const otherEnemy = enemies[j];
                const distanceToOther = enemy.position.distanceTo(otherEnemy.position);
                
                if (distanceToOther < 30) {
                    const awayFromOther = new THREE.Vector3()
                        .subVectors(enemy.position, otherEnemy.position)
                        .normalize()
                        .multiplyScalar(1.0 / distanceToOther);
                    avoidanceVector.add(awayFromOther);
                }
            }
        }
        
        // Combine target direction with avoidance
        if (avoidanceVector.length() > 0.01) {
            avoidanceVector.normalize().multiplyScalar(0.3);
            targetDirection.add(avoidanceVector).normalize();
        }
        
        // ===== SMOOTH TURNING =====
        if (!enemy.userData.currentDirection) {
            enemy.userData.currentDirection = new THREE.Vector3(0, 0, -1);
        }
        
        enemy.userData.currentDirection.lerp(targetDirection, 0.03);
        enemy.userData.currentDirection.normalize();
        
        // Calculate target rotation
        const targetQuaternion = new THREE.Quaternion();
        const targetMatrix = new THREE.Matrix4();
        targetMatrix.lookAt(
            enemy.position,
            enemy.position.clone().add(enemy.userData.currentDirection),
            new THREE.Vector3(0, 1, 0)
        );
        targetQuaternion.setFromRotationMatrix(targetMatrix);
        
        // Smoothly rotate
        enemy.quaternion.slerp(targetQuaternion, 0.08);
        
        // ===== MOVEMENT (rovnaká rýchlosť ako hráč!) =====
        const moveDirection = new THREE.Vector3(0, 0, -1);
        moveDirection.applyQuaternion(enemy.quaternion);
        enemy.position.add(moveDirection.multiplyScalar(ENEMY_SPEED));
        
        // Keep at reasonable altitude
        if (enemy.position.y < 10) {
            enemy.position.y = 10;
        } else if (enemy.position.y > 180) {
            enemy.position.y = 180;
        }
        
        // Update health bar
        if (enemy.children.length > 0) {
            const healthBarGroup = enemy.children[enemy.children.length - 1];
            if (healthBarGroup.type === 'Group') {
                healthBarGroup.lookAt(camera.position);
            }
        }
        
        // ===== SHOOTING (len v CHASE a ENGAGE) =====
        const canShoot = (enemy.userData.aiState === AI_STATE.CHASE || enemy.userData.aiState === AI_STATE.ENGAGE);
        if (canShoot && distanceToPlayer < 150 && distanceToPlayer > 20) {
            if (!enemy.userData.lastShot || currentTime - enemy.userData.lastShot > enemy.userData.shootCooldown) {
                enemy.userData.lastShot = currentTime;
                enemyShoot(enemy);
            }
        }
        
        // ===== KOLÍZIE PRE AI =====
        
        // Kolízia so zemou
        const enemyTerrainHeight = getTerrainHeight(enemy.position.x, enemy.position.z);
        if (enemy.position.y < enemyTerrainHeight + 2) {
            createExplosion(enemy.position, 1.5);
            scene.remove(enemy);
            enemies.splice(i, 1);
            console.log("💥 Enemy crashed into ground!");
            continue;
        }
        
        // Kolízia s budovami
        for (const building of buildings) {
            const distToBuilding = enemy.position.distanceTo(building.position);
            if (distToBuilding < 15) {
                createExplosion(enemy.position, 1.5);
                scene.remove(enemy);
                enemies.splice(i, 1);
                console.log("💥 Enemy crashed into building!");
                break;
            }
        }
        
        // Kolízia s inými AI lietadlami
        for (let j = i + 1; j < enemies.length; j++) {
            const otherEnemy = enemies[j];
            if (otherEnemy.userData.destroyed) continue;
            
            const distToOther = enemy.position.distanceTo(otherEnemy.position);
            if (distToOther < 8) {
                // Obe lietadlá explodujú
                createExplosion(enemy.position, 1.5);
                createExplosion(otherEnemy.position, 1.5);
                
                scene.remove(enemy);
                scene.remove(otherEnemy);
                
                enemies.splice(j, 1); // Remove the higher index first
                enemies.splice(i, 1);
                
                console.log("💥 Enemy mid-air collision!");
                break;
            }
        }
        
        // Only remove if collided with player (NOT if far away)
        if (distanceToPlayer < 5) {
            // Enemy collided with player
            scene.remove(enemy);
            enemies.splice(i, 1);
            if (gameRunning) {
                takeDamage(20);
                createExplosion(enemy.position);
            }
        }
    }
}

// ===== UPDATE ALLIES (FRIENDLY BLUE PLANES) =====
function updateAllies() {
    const currentTime = Date.now();
    
    for (let i = allies.length - 1; i >= 0; i--) {
        const ally = allies[i];
        
        // Find nearest enemy to attack
        let nearestEnemy = null;
        let nearestDistance = Infinity;
        
        for (let j = 0; j < enemies.length; j++) {
            const enemy = enemies[j];
            const dist = ally.position.distanceTo(enemy.position);
            if (dist < nearestDistance) {
                nearestDistance = dist;
                nearestEnemy = enemy;
            }
        }
        
        // If no enemies, fly near player
        let targetPosition;
        if (nearestEnemy && nearestDistance < 200) {
            targetPosition = nearestEnemy.position;
        } else {
            // Orbit around player
            targetPosition = player.position;
        }
        
        // Calculate direction to target
        const directionToTarget = new THREE.Vector3()
            .subVectors(targetPosition, ally.position)
            .normalize();
        
        // Collision avoidance with other allies
        let avoidanceVector = new THREE.Vector3();
        for (let j = 0; j < allies.length; j++) {
            if (i !== j) {
                const otherAlly = allies[j];
                const distanceToOther = ally.position.distanceTo(otherAlly.position);
                
                if (distanceToOther < 25) {
                    const awayFromOther = new THREE.Vector3()
                        .subVectors(ally.position, otherAlly.position)
                        .normalize()
                        .multiplyScalar(1.0 / distanceToOther);
                    avoidanceVector.add(awayFromOther);
                }
            }
        }
        
        // Maintain distance from player (don't crash)
        const distanceToPlayer = ally.position.distanceTo(player.position);
        if (distanceToPlayer < 20) {
            const awayFromPlayer = new THREE.Vector3()
                .subVectors(ally.position, player.position)
                .normalize()
                .multiplyScalar(0.5);
            avoidanceVector.add(awayFromPlayer);
        }
        
        // Combine targeting with avoidance
        let finalDirection = directionToTarget.clone();
        if (avoidanceVector.length() > 0.01) {
            avoidanceVector.normalize().multiplyScalar(0.3);
            finalDirection.add(avoidanceVector).normalize();
        }
        
        // Smoothly turn toward target
        ally.userData.currentDirection.lerp(finalDirection, 0.03);
        ally.userData.currentDirection.normalize();
        
        // Calculate target rotation
        const targetQuaternion = new THREE.Quaternion();
        const targetMatrix = new THREE.Matrix4();
        targetMatrix.lookAt(
            ally.position,
            ally.position.clone().add(ally.userData.currentDirection),
            new THREE.Vector3(0, 1, 0)
        );
        targetQuaternion.setFromRotationMatrix(targetMatrix);
        
        // Smoothly rotate
        ally.quaternion.slerp(targetQuaternion, 0.08);
        
        // Move ally forward
        const moveDirection = new THREE.Vector3(0, 0, -1);
        moveDirection.applyQuaternion(ally.quaternion);
        ally.position.add(moveDirection.multiplyScalar(ENEMY_SPEED * 1.1)); // Slightly faster
        
        // Keep at reasonable altitude
        if (ally.position.y < 10) {
            ally.position.y = 10;
        } else if (ally.position.y > 180) {
            ally.position.y = 180;
        }
        
        // ALLY SHOOTING - shoot at nearest enemy
        if (nearestEnemy && nearestDistance < 120 && nearestDistance > 15) {
            if (!ally.userData.lastShot || currentTime - ally.userData.lastShot > ally.userData.shootCooldown) {
                ally.userData.lastShot = currentTime;
                allyShoot(ally, nearestEnemy);
            }
        }
        
        // ===== KOLÍZIE PRE ALLIES =====
        
        // Kolízia so zemou
        const allyTerrainHeight = getTerrainHeight(ally.position.x, ally.position.z);
        if (ally.position.y < allyTerrainHeight + 2) {
            createExplosion(ally.position, 1.5);
            scene.remove(ally);
            allies.splice(i, 1);
            console.log("💥 Ally crashed into ground!");
            continue;
        }
        
        // Kolízia s budovami
        for (const building of buildings) {
            const distToBuilding = ally.position.distanceTo(building.position);
            if (distToBuilding < 15) {
                createExplosion(ally.position, 1.5);
                scene.remove(ally);
                allies.splice(i, 1);
                console.log("💥 Ally crashed into building!");
                break;
            }
        }
        
        // Kolízia s nepriateľmi (mid-air)
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            if (enemy.userData.destroyed) continue;
            
            const distToEnemy = ally.position.distanceTo(enemy.position);
            if (distToEnemy < 8) {
                // Obe lietadlá explodujú
                createExplosion(ally.position, 1.5);
                createExplosion(enemy.position, 1.5);
                
                scene.remove(ally);
                scene.remove(enemy);
                
                allies.splice(i, 1);
                enemies.splice(j, 1);
                
                console.log("💥 Ally-enemy mid-air collision!");
                break;
            }
        }
        
        // Allies stay on map (no despawn)
        // They only get removed when killed by enemies
    }
}

// ===== ALLY SHOOTING =====
function allyShoot(ally, target) {
    const bullet = new THREE.Group();

    // Create ally bullet (blue)
    const bulletGeometry = new THREE.SphereGeometry(0.12, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x00bbff,
        transparent: true,
        opacity: 0.9
    });
    const bulletMesh = new THREE.Mesh(bulletGeometry, bulletMaterial);
    
    // Add glow
    const glowGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ddff,
        transparent: true,
        opacity: 0.4
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    bulletMesh.add(glow);
    bullet.add(bulletMesh);

    // Position bullet at ally position
    bullet.position.copy(ally.position);
    
    // Calculate direction toward target enemy
    const direction = new THREE.Vector3()
        .subVectors(target.position, ally.position)
        .normalize()
        .multiplyScalar(BULLET_SPEED * 0.9);
    
    bullet.userData.velocity = direction;
    bullet.userData.isAllyBullet = true; // Mark as ally bullet
    
    scene.add(bullet);
    bullets.push(bullet);
}

// ===== ENEMY SHOOTING =====
function enemyShoot(enemy) {
    const bullet = new THREE.Group();

    // Create enemy bullet (red)
    const bulletGeometry = new THREE.SphereGeometry(0.12, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff0000,
        transparent: true,
        opacity: 0.9
    });
    const bulletMesh = new THREE.Mesh(bulletGeometry, bulletMaterial);
    
    // Add glow
    const glowGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xff4444,
        transparent: true,
        opacity: 0.4
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    bulletMesh.add(glow);
    bullet.add(bulletMesh);

    // Position bullet at enemy position
    bullet.position.copy(enemy.position);
    
    // Calculate direction toward player
    const direction = new THREE.Vector3()
        .subVectors(player.position, enemy.position)
        .normalize()
        .multiplyScalar(BULLET_SPEED * 0.8);
    
    bullet.userData.velocity = direction;
    bullet.userData.isEnemyBullet = true; // Mark as enemy bullet
    
    scene.add(bullet);
    bullets.push(bullet);
}

// ===== COLLISION DETECTION =====
function checkCollisions() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        // Check if this is an enemy bullet hitting player
        if (bullet.userData.isEnemyBullet) {
            const distanceToPlayer = bullet.position.distanceTo(player.position);
            if (distanceToPlayer < 3) {
                // Enemy bullet hit player
                scene.remove(bullet);
                bullets.splice(i, 1);
                takeDamage(10);
                createExplosion(bullet.position);
                continue;
            }
            
            // Check if enemy bullet hits ally
            for (let j = allies.length - 1; j >= 0; j--) {
                const ally = allies[j];
                const distance = bullet.position.distanceTo(ally.position);
                
                if (distance < 3) {
                    // Enemy bullet hit ally!
                    scene.remove(bullet);
                    bullets.splice(i, 1);
                    
                    // Reduce ally health
                    ally.userData.health -= 1;
                    
                    // Check if ally is destroyed
                    if (ally.userData.health <= 0) {
                        allies.splice(j, 1);
                        createWreckage(ally); // Padajúca vraska!
                    }
                    
                    break;
                }
            }
        } 
        // Check if ally bullet hits enemy
        else if (bullet.userData.isAllyBullet) {
            for (let j = enemies.length - 1; j >= 0; j--) {
                const enemy = enemies[j];
                const distance = bullet.position.distanceTo(enemy.position);
                
                if (distance < 3) {
                    // Ally bullet hit enemy!
                    scene.remove(bullet);
                    bullets.splice(i, 1);
                    
                    // Reduce enemy health
                    enemy.userData.health -= 1;
                    
                    // Update health bar
                    if (enemy.userData.healthBar) {
                        const healthPercent = enemy.userData.health / enemy.userData.maxHealth;
                        enemy.userData.healthBar.scale.x = healthPercent;
                        enemy.userData.healthBar.position.x = -(1 - healthPercent);
                    }
                    
                    // Check if enemy is destroyed
                    if (enemy.userData.health <= 0) {
                        enemies.splice(j, 1);
                        createWreckage(enemy); // Padajúca vraska!
                        // No score for ally kills
                    }
                    
                    break;
                }
            }
        }
        // Player bullet - check if it hits enemy
        else {
            for (let j = enemies.length - 1; j >= 0; j--) {
                const enemy = enemies[j];
                const distance = bullet.position.distanceTo(enemy.position);
                
                if (distance < 3) {
                    // Hit! Damage enemy
                    scene.remove(bullet);
                    bullets.splice(i, 1);
                    
                    // Reduce enemy health
                    enemy.userData.health -= 1;
                    
                    // Update health bar
                    if (enemy.userData.healthBar) {
                        const healthPercent = enemy.userData.health / enemy.userData.maxHealth;
                        enemy.userData.healthBar.scale.x = healthPercent;
                        enemy.userData.healthBar.position.x = -(1 - healthPercent);
                    }
                    
                    // Check if enemy is destroyed
                    if (enemy.userData.health <= 0) {
                        enemies.splice(j, 1);
                        score += 10;
                        createWreckage(enemy); // Padajúca vraska!
                    } else {
                        // Just a hit effect
                        createExplosion(bullet.position);
                    }
                    
                    break;
                }
            }
        }
    }
}

// ===== EXPLOSION EFFECT =====
function createExplosion(position, scale = 1.0) {
    // VEĽKÁ DRAMATICKÁ EXPLÓZIA!
    const particleCount = Math.floor(30 * scale); // Viac častíc pri väčšej explózii
    const particles = [];
    
    // ===== SVETELNÝ FLASH =====
    const explosionLight = new THREE.PointLight(0xff6600, 3 * scale, 50 * scale);
    explosionLight.position.copy(position);
    scene.add(explosionLight);
    
    // Flash efekt - rýchlo zhasne
    let lightIntensity = 3 * scale;
    const fadeLightInterval = setInterval(() => {
        lightIntensity *= 0.8;
        explosionLight.intensity = lightIntensity;
        if (lightIntensity < 0.1) {
            scene.remove(explosionLight);
            clearInterval(fadeLightInterval);
        }
    }, 50);
    
    // ===== EXPLOZÍVNE ČASTICE =====
    for (let i = 0; i < particleCount; i++) {
        const size = (0.3 + Math.random() * 0.5) * scale;
        const geometry = new THREE.SphereGeometry(size, 6, 6);
        
        // Farebné variácie - oranžová, žltá, červená, čierny dym
        let color;
        const rand = Math.random();
        if (rand < 0.3) color = 0xff3300;      // Tmavočervená
        else if (rand < 0.5) color = 0xff6600; // Oranžová
        else if (rand < 0.7) color = 0xffaa00; // Svetlooranžová
        else if (rand < 0.85) color = 0xffff00; // Žltá
        else color = 0x333333;                  // Čierny dym
        
        const material = new THREE.MeshBasicMaterial({ 
            color: color,
            transparent: true,
            opacity: 1.0
        });
        const particle = new THREE.Mesh(geometry, material);
        
        particle.position.copy(position);
        
        // Náhodný smer výbuchu
        const speed = (0.3 + Math.random() * 0.7) * scale;
        particle.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * speed,
            Math.random() * speed * 0.8, // Viac nahor
            (Math.random() - 0.5) * speed
        );
        
        // Gravitácia pre dym
        particle.gravity = -0.01 * scale;
        
        scene.add(particle);
        particles.push(particle);
        
        // Odstráň časticu po animácii
        setTimeout(() => {
            scene.remove(particle);
        }, 1000);
    }
    
    // ===== ANIMÁCIA ČASTÍC =====
    let frame = 0;
    const animate = () => {
        frame++;
        if (frame > 60) return; // Dlhšia animácia
        
        particles.forEach(p => {
            if (p.parent) {
                // Pohyb
                p.position.add(p.velocity);
                
                // Gravitácia (dym stúpa, oheň padá)
                if (p.material.color.getHex() === 0x333333) {
                    p.velocity.y += 0.01; // Dym stúpa
                } else {
                    p.velocity.y += p.gravity; // Oheň padá
                }
                
                // Spomalenie
                p.velocity.multiplyScalar(0.96);
                
                // Fade out
                p.material.opacity = 1 - (frame / 60);
                
                // Dym sa zväčšuje
                if (p.material.color.getHex() === 0x333333) {
                    p.scale.multiplyScalar(1.03);
                }
            }
        });
        
        requestAnimationFrame(animate);
    };
    animate();
}

// ===== CONVERT PLANE TO FALLING WRECKAGE =====
function createWreckage(plane) {
    // Mark as wreckage
    plane.userData.isWreckage = true;
    plane.userData.fallVelocity = new THREE.Vector3(0, 0, 0);
    plane.userData.rotationSpeed = new THREE.Vector3(
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1
    );
    plane.userData.smokeTimer = 0;
    
    // Remove healthBar to prevent rendering errors
    if (plane.children.length > 0) {
        for (let i = plane.children.length - 1; i >= 0; i--) {
            const child = plane.children[i];
            if (child.type === 'Group') {
                // This is the healthBar group
                plane.remove(child);
            }
        }
    }
    
    // Change model to black (burning wreck)
    plane.traverse((child) => {
        if (child.isMesh && child.material) {
            if (Array.isArray(child.material)) {
                child.material.forEach(mat => {
                    mat.color.set(0x111111);
                    mat.emissive = new THREE.Color(0x000000);
                });
            } else {
                child.material.color.set(0x111111);
                child.material.emissive = new THREE.Color(0x000000);
            }
        }
    });
    
    // Add to wreckage array
    wreckage.push(plane);
}

// ===== UPDATE FALLING WRECKAGE =====
function updateWreckage() {
    for (let i = wreckage.length - 1; i >= 0; i--) {
        const wreck = wreckage[i];
        
        // Apply gravity
        wreck.userData.fallVelocity.y -= 0.02;
        wreck.position.add(wreck.userData.fallVelocity);
        
        // Tumbling rotation
        wreck.rotation.x += wreck.userData.rotationSpeed.x;
        wreck.rotation.y += wreck.userData.rotationSpeed.y;
        wreck.rotation.z += wreck.userData.rotationSpeed.z;
        
        // ===== DYMOVÁ STOPA =====
        wreck.userData.smokeTimer += 16;
        if (wreck.userData.smokeTimer > 50) { // Každých 50ms nový dym
            wreck.userData.smokeTimer = 0;
            
            // Create smoke particle
            const smokeGeometry = new THREE.SphereGeometry(0.5, 6, 6);
            const smokeMaterial = new THREE.MeshBasicMaterial({
                color: 0x333333,
                transparent: true,
                opacity: 0.7
            });
            const smoke = new THREE.Mesh(smokeGeometry, smokeMaterial);
            smoke.position.copy(wreck.position);
            smoke.userData.lifetime = 0;
            smoke.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.1,
                0.1 + Math.random() * 0.1,
                (Math.random() - 0.5) * 0.1
            );
            
            scene.add(smoke);
            
            // Animate and remove smoke
            const animateSmoke = () => {
                smoke.userData.lifetime += 16;
                if (smoke.userData.lifetime > 2000 || !smoke.parent) {
                    scene.remove(smoke);
                    return;
                }
                
                smoke.position.add(smoke.userData.velocity);
                smoke.scale.multiplyScalar(1.02); // Expand
                smoke.material.opacity = 0.7 * (1 - smoke.userData.lifetime / 2000);
                
                requestAnimationFrame(animateSmoke);
            };
            animateSmoke();
        }
        
        // ===== DOPAD NA ZEM =====
        const terrainHeight = getTerrainHeight(wreck.position.x, wreck.position.z);
        if (wreck.position.y <= terrainHeight + 1) {
            // SECOND EXPLOSION ON GROUND!
            createExplosion(wreck.position, 2.5); // Veľká explózia pri dopade!
            
            // Remove wreckage
            scene.remove(wreck);
            wreckage.splice(i, 1);
            
            console.log("💥 Wreckage hit ground and exploded!");
        }
    }
}

// ===== INITIALIZE RADAR =====
function initRadar() {
    radarCanvas = document.getElementById('radarCanvas');
    radarCtx = radarCanvas.getContext('2d');
}

// ===== UPDATE RADAR =====
function updateRadar() {
    if (!radarCtx || !radarCanvas) return;
    
    const width = radarCanvas.width;
    const height = radarCanvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radarRadius = width / 2 - 5;
    
    // Clear radar
    radarCtx.clearRect(0, 0, width, height);
    
    // Draw radar background circle
    radarCtx.fillStyle = 'rgba(0, 20, 0, 0.8)';
    radarCtx.beginPath();
    radarCtx.arc(centerX, centerY, radarRadius, 0, Math.PI * 2);
    radarCtx.fill();
    
    // Draw radar rings
    radarCtx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
    radarCtx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
        radarCtx.beginPath();
        radarCtx.arc(centerX, centerY, (radarRadius / 3) * i, 0, Math.PI * 2);
        radarCtx.stroke();
    }
    
    // Draw crosshair
    radarCtx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
    radarCtx.beginPath();
    radarCtx.moveTo(centerX, centerY - radarRadius);
    radarCtx.lineTo(centerX, centerY + radarRadius);
    radarCtx.moveTo(centerX - radarRadius, centerY);
    radarCtx.lineTo(centerX + radarRadius, centerY);
    radarCtx.stroke();
    
    // Draw player (center green dot)
    radarCtx.fillStyle = '#00ff00';
    radarCtx.beginPath();
    radarCtx.arc(centerX, centerY, 4, 0, Math.PI * 2);
    radarCtx.fill();
    
    // Radar scale (show entities within this range)
    const radarRange = 800;
    
    // Draw enemies (red dots)
    radarCtx.fillStyle = '#ff0000';
    enemies.forEach(enemy => {
        const dx = enemy.position.x - player.position.x;
        const dz = enemy.position.z - player.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance < radarRange) {
            const radarX = centerX + (dx / radarRange) * radarRadius;
            const radarY = centerY + (dz / radarRange) * radarRadius;
            
            radarCtx.beginPath();
            radarCtx.arc(radarX, radarY, 3, 0, Math.PI * 2);
            radarCtx.fill();
        }
    });
    
    // Draw allies (blue dots)
    radarCtx.fillStyle = '#00aaff';
    allies.forEach(ally => {
        const dx = ally.position.x - player.position.x;
        const dz = ally.position.z - player.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance < radarRange) {
            const radarX = centerX + (dx / radarRange) * radarRadius;
            const radarY = centerY + (dz / radarRange) * radarRadius;
            
            radarCtx.beginPath();
            radarCtx.arc(radarX, radarY, 3, 0, Math.PI * 2);
            radarCtx.fill();
        }
    });
    
    // Draw enemy count
    radarCtx.fillStyle = '#ffffff';
    radarCtx.font = '12px Arial';
    radarCtx.fillText(`Nepriateľov: ${enemies.length}`, 5, 15);
    radarCtx.fillText(`Spojencov: ${allies.length}`, 5, 30);
}

// ===== DAMAGE SYSTEM =====
function takeDamage(amount) {
    health -= amount;
    health = Math.max(0, health);
    updateUI();
    
    if (health <= 0) {
        gameOver();
    }
}

// ===== FSV HEALTH UI UPDATE =====
function updateFSVHealthUI() {
    const fsvHealthDiv = document.getElementById('fsvHealth');
    
    if (!fsvBuilding || fsvBuilding.health <= 0) {
        fsvHealthDiv.innerHTML = '🏛️ FSV Jinonice: <span style="color: #ff0000; font-weight: bold;">ZNIČENÉ</span>';
        return;
    }
    
    const healthPercent = (fsvBuilding.health / fsvBuilding.maxHealth) * 100;
    let color = '#00ff00'; // Green
    
    if (healthPercent <= 25) {
        color = '#ff0000'; // Red
    } else if (healthPercent <= 50) {
        color = '#ff6600'; // Orange
    } else if (healthPercent <= 75) {
        color = '#ffaa00'; // Yellow
    }
    
    fsvHealthDiv.innerHTML = `🏛️ FSV Jinonice: <span style="color: ${color}; font-weight: bold;">${Math.ceil(fsvBuilding.health)}/${fsvBuilding.maxHealth}</span>`;
}

// ===== MISSION STATUS UI UPDATE =====
function updateMissionStatusUI() {
    const missionStatusDiv = document.getElementById('missionStatus');
    
    if (missionPhase === 1) {
        missionStatusDiv.innerHTML = '⚔️ Fáza 1: Chráň FSV!';
        missionStatusDiv.style.color = '#ffaa00';
    } else if (missionPhase === 2) {
        missionStatusDiv.innerHTML = '🎯 Fáza 2: Znič Hollar!';
        missionStatusDiv.style.color = '#00ff00';
    }
}

// ===== GAME OVER =====
function gameOver(customMessage) {
    gameRunning = false;
    const gameOverDiv = document.getElementById('gameOver');
    const gameOverText = document.getElementById('gameOverText');
    
    if (customMessage) {
        gameOverText.innerHTML = customMessage;
    } else {
        gameOverText.textContent = 'KONIEC HRY!';
    }
    
    gameOverDiv.style.display = 'block';
    document.getElementById('finalScore').textContent = `Vaše skóre: ${score}`;
}

// ===== RESTART GAME =====
function restartGame() {
    // Clear all enemies and bullets
    enemies.forEach(enemy => scene.remove(enemy));
    bullets.forEach(bullet => scene.remove(bullet));
    enemies = [];
    bullets = [];
    
    // Reset game state
    score = 0;
    health = MAX_HEALTH;
    gameRunning = true;
    playerSpeed = 0;
    playerRotationY = 0;
    playerRotationZ = 0;
    playerRotationX = 0;
    playerVelocity.set(0, 0, 0);
    
    // Reset player position
    player.position.set(0, 50, 0);
    player.rotation.set(0, 0, 0);
    
    // Hide game over screen
    document.getElementById('gameOver').style.display = 'none';
    
    // Update UI
    updateUI();
}

// ===== UPDATE UI =====
function updateUI() {
    document.getElementById('score').textContent = `Skóre: ${score}`;
    document.getElementById('healthFill').style.width = `${health}%`;
    document.getElementById('altitude').textContent = `Výška: ${Math.floor(player.position.y)}m`;
    document.getElementById('speed').textContent = `Rýchlosť: ${Math.floor(Math.abs(playerSpeed) * 100)} km/h`;
    document.getElementById('position').textContent = 
        `Pozícia: X: ${Math.floor(player.position.x)}, Z: ${Math.floor(player.position.z)}`;
    document.getElementById('missileCount').textContent = `🚀 Rakety: ${missileCount}`;
    
    // Update FSV health and mission status
    updateFSVHealthUI();
    updateMissionStatusUI();
}

// ===== WINDOW RESIZE =====
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ===== MAIN GAME LOOP =====
function animate() {
    requestAnimationFrame(animate);

    if (gameRunning) {
        updatePlayer();
        updateBullets();
        updateMissiles(); // Update guided missiles
        updateEnemyMissiles(); // Update enemy missiles attacking FSV
        updateTargetLocking(); // Update lock-on system
        updateEnemies();
        updateAllies(); // Update friendly blue planes
        updateWreckage(); // Update falling wreckage
        updateAAGuns(); // Update AA gun aiming and shooting
        updateAABullets(); // Update AA gun bullets
        checkCollisions();
        checkAllEnemiesDestroyed(); // Check if player cleared all enemies
        triggerRandomFSVAttack(); // Random enemy attacks FSV every 30 seconds
        checkTotalAttack(); // Check if all allies dead for total attack
        updateClouds();
        updateWater(); // Animate water waves
        updateRadar(); // Update radar display
    }

    renderer.render(scene, camera);
}

// ===== UPDATE CLOUDS =====
function updateClouds() {
    clouds.forEach(cloud => {
        cloud.position.x += cloud.userData.velocity;
        
        // Wrap around world
        if (cloud.position.x > WORLD_SIZE) {
            cloud.position.x = -WORLD_SIZE;
        } else if (cloud.position.x < -WORLD_SIZE) {
            cloud.position.x = WORLD_SIZE;
        }
    });
}

// ===== UPDATE WATER WAVES =====
function updateWater() {
    if (!scene.userData.water) return;
    
    const water = scene.userData.water;
    water.userData.time += 0.01;
    
    const positions = water.geometry.attributes.position;
    const time = water.userData.time;
    
    // Animate water waves
    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        
        // Multiple wave layers for realistic effect
        const wave1 = Math.sin(x * 0.05 + time) * 0.3;
        const wave2 = Math.sin(y * 0.03 + time * 1.3) * 0.2;
        const wave3 = Math.cos(x * 0.02 + y * 0.02 + time * 0.8) * 0.15;
        
        positions.setZ(i, wave1 + wave2 + wave3);
    }
    
    positions.needsUpdate = true;
    water.geometry.computeVertexNormals();
}

// ===== LOADING SCREEN INITIALIZATION =====
window.addEventListener('load', () => {
    // Simulate loading progress
    updateLoadingProgress(0);
    
    setTimeout(() => updateLoadingProgress(30), 300);
    setTimeout(() => updateLoadingProgress(60), 600);
    setTimeout(() => updateLoadingProgress(90), 900);
    setTimeout(() => {
        updateLoadingProgress(100);
        setTimeout(hideLoadingScreen, 500);
    }, 1200);
});

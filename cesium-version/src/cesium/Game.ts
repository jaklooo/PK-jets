import * as Cesium from 'cesium';
import { CesiumSetup } from './CesiumSetup';
import { Aircraft } from './vehicles/Aircraft';
import { EnemyAircraft } from './vehicles/EnemyAircraft';
import { AllyAircraft } from './vehicles/AllyAircraft';
import { BulletSystem } from './combat/BulletSystem';
import { MissileSystem } from './combat/MissileSystem';
import { AAGunSystem } from './combat/AAGunSystem';
import { CollisionDetector } from './combat/CollisionDetector';
import { ExplosionEffect } from './combat/ExplosionEffect';
import { AIController } from './ai/AIController';
import { FSVCampus } from './buildings/FSVCampus';
import { HollarBuilding } from './buildings/HollarBuilding';
import { BuildingManager } from './buildings/BuildingManager';
import { FollowCamera } from './camera/FollowCamera';
import { HUD } from './ui/HUD';
import { Radar } from './ui/Radar';
import { MissionStatus } from './ui/MissionStatus';
import { KeysState, GAME_CONSTANTS } from '../utils/Types';
import { getFSVPosition, getHollarPosition } from '../utils/GPSCoordinates';

export class Game {
  cesiumSetup: CesiumSetup;
  viewer: Cesium.Viewer;
  aircraft: Aircraft;
  enemies: EnemyAircraft[];
  allies: AllyAircraft[];
  bulletSystem: BulletSystem;
  missileSystem: MissileSystem;
  aaGunSystem: AAGunSystem;
  collisionDetector: CollisionDetector;
  explosionEffect: ExplosionEffect;
  aiController: AIController;
  fsvCampus: FSVCampus;
  hollarBuilding: HollarBuilding;
  buildingManager: BuildingManager;
  followCamera: FollowCamera;
  hud: HUD;
  radar: Radar;
  missionStatus: MissionStatus;
  keys: KeysState;
  lastTime: number;
  gameRunning: boolean;
  score: number;
  missionPhase: number;

  constructor() {
    // Initialize Cesium
    this.cesiumSetup = new CesiumSetup('cesiumContainer');
    this.viewer = this.cesiumSetup.getViewer();

    // Initialize input
    this.keys = {};
    this.setupInputHandlers();

    // Initialize player aircraft
    this.aircraft = new Aircraft(this.viewer, this.keys);

    // Initialize buildings
    this.fsvCampus = new FSVCampus(this.viewer);
    this.hollarBuilding = new HollarBuilding(this.viewer);

    // Initialize explosion effect
    this.explosionEffect = new ExplosionEffect(this.viewer);

    // Initialize combat systems
    this.bulletSystem = new BulletSystem(this.viewer);
    this.missileSystem = new MissileSystem(this.viewer);
    this.aaGunSystem = new AAGunSystem(this.viewer, this.hollarBuilding.getPosition());

    // Initialize enemies and allies
    this.enemies = [];
    this.allies = [];
    this.spawnEnemies();
    this.spawnAllies();

    // Initialize AI controller
    this.aiController = new AIController(
      this.viewer,
      this.enemies,
      this.allies,
      this.aircraft,
      this.bulletSystem,
      {
        position: this.fsvCampus.getPosition(),
        health: this.fsvCampus.getHealth()
      }
    );

    // Initialize collision detector
    this.collisionDetector = new CollisionDetector(
      this.viewer,
      this.aircraft,
      this.enemies,
      this.allies,
      this.bulletSystem,
      this.missileSystem,
      this.aaGunSystem,
      this.explosionEffect,
      {
        entity: this.hollarBuilding.entity,
        health: this.hollarBuilding.health,
        maxHealth: this.hollarBuilding.maxHealth,
        position: this.hollarBuilding.getPosition(),
        isHollar: true
      },
      {
        entity: this.fsvCampus.entity,
        health: this.fsvCampus.health,
        maxHealth: this.fsvCampus.maxHealth,
        position: this.fsvCampus.getPosition(),
        isFSV: true
      },
      (score: number) => {
        this.score = score;
      },
      (victory: boolean) => {
        this.gameOver(victory);
      }
    );

    // Initialize building manager
    this.buildingManager = new BuildingManager(
      this.fsvCampus,
      this.hollarBuilding,
      this.explosionEffect,
      () => this.onVictory(),
      () => this.onDefeat()
    );

    // Initialize camera
    this.followCamera = new FollowCamera(this.viewer, this.aircraft);

    // Initialize UI
    this.hud = new HUD();
    this.radar = new Radar();
    this.missionStatus = new MissionStatus();

    // Game state
    this.lastTime = Date.now();
    this.gameRunning = true;
    this.score = 0;
    this.missionPhase = 1;

    // Show initial mission
    this.missionStatus.showPhase1();

    // Start game loop
    this.gameLoop();
  }

  private setupInputHandlers(): void {
    document.addEventListener('keydown', (e) => {
      this.keys[e.key] = true;

      // Shoot bullet
      if (e.key === ' ' && this.gameRunning) {
        e.preventDefault();
        const pos = this.aircraft.getPosition();
        const forward = this.aircraft.getForwardVector();
        if (pos) {
          this.bulletSystem.shootPlayerBullet(pos, forward);
        }
      }

      // Launch missile
      if ((e.key === 'k' || e.key === 'K') && this.gameRunning) {
        const pos = this.aircraft.getPosition();
        const forward = this.aircraft.getForwardVector();
        if (pos) {
          const launched = this.missileSystem.launchMissile(pos, forward);
          if (launched) {
            console.log('🚀 Missile launched!');
          }
        }
      }
    });

    document.addEventListener('keyup', (e) => {
      this.keys[e.key] = false;
    });
  }

  private spawnEnemies(): void {
    const fsvPos = getFSVPosition();
    
    for (let i = 0; i < GAME_CONSTANTS.MAX_ENEMIES; i++) {
      const cartographic = Cesium.Cartographic.fromCartesian(fsvPos);
      const spawnLat = Cesium.Math.toDegrees(cartographic.latitude) + (Math.random() - 0.5) * 0.05;
      const spawnLon = Cesium.Math.toDegrees(cartographic.longitude) + (Math.random() - 0.5) * 0.05;
      const spawnAlt = 300 + Math.random() * 200;
      
      const spawnPos = Cesium.Cartesian3.fromDegrees(spawnLon, spawnLat, spawnAlt);
      const enemy = new EnemyAircraft(this.viewer, spawnPos);
      this.enemies.push(enemy);
    }

    console.log(`👾 Spawned ${this.enemies.length} enemies`);
  }

  private spawnAllies(): void {
    const fsvPos = getFSVPosition();
    
    for (let i = 0; i < GAME_CONSTANTS.NUM_ALLIES; i++) {
      const cartographic = Cesium.Cartographic.fromCartesian(fsvPos);
      const spawnLat = Cesium.Math.toDegrees(cartographic.latitude) + (Math.random() - 0.5) * 0.03;
      const spawnLon = Cesium.Math.toDegrees(cartographic.longitude) + (Math.random() - 0.5) * 0.03;
      const spawnAlt = 250 + Math.random() * 150;
      
      const spawnPos = Cesium.Cartesian3.fromDegrees(spawnLon, spawnLat, spawnAlt);
      const ally = new AllyAircraft(this.viewer, spawnPos);
      this.allies.push(ally);
    }

    console.log(`🛡️ Spawned ${this.allies.length} allies`);
  }

  private gameLoop = (): void => {
    if (!this.gameRunning) return;

    const currentTime = Date.now();
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    this.update(deltaTime);
    requestAnimationFrame(this.gameLoop);
  };

  private update(deltaTime: number): void {
    // Update player
    this.aircraft.update(deltaTime);

    // Update enemies with AI
    this.aiController.updateEnemies(deltaTime);

    // Update allies
    this.aiController.updateAllies(deltaTime);

    // Update combat systems
    this.bulletSystem.update(deltaTime);
    this.missileSystem.update(deltaTime);
    
    const playerPos = this.aircraft.getPosition();
    if (playerPos) {
      this.missileSystem.updateLockOn(
        playerPos,
        this.enemies,
        this.hollarBuilding.entity,
        deltaTime
      );
      this.aaGunSystem.update(deltaTime, this.aircraft, this.allies);
    }

    // Check collisions
    this.collisionDetector.checkAll();

    // Update camera
    this.followCamera.update();

    // Update UI
    this.hud.update(
      this.aircraft,
      this.score,
      this.missileSystem.getMissileCount(),
      this.fsvCampus.getHealth(),
      this.enemies,
      this.allies
    );
    this.hud.showLockIndicator(
      this.missileSystem.isLocked(),
      this.missileSystem.getLockProgress()
    );
    this.radar.update(this.aircraft, this.enemies, this.allies);

    // Check mission phase transition
    if (this.missionPhase === 1 && this.enemies.length === 0) {
      this.missionPhase = 2;
      this.missionStatus.showPhase2();
    }

    // Check building status
    this.buildingManager.checkBuildingStatus();
  }

  private gameOver(victory: boolean): void {
    this.gameRunning = false;
    if (victory) {
      this.missionStatus.showVictory();
    } else {
      this.missionStatus.showDefeat();
    }
  }

  private onVictory(): void {
    this.gameOver(true);
  }

  private onDefeat(): void {
    this.gameOver(false);
  }
}

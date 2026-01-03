import * as Cesium from 'cesium';
import { GAME_CONSTANTS, AIState } from '../../utils/Types';

export class EnemyAircraft {
  entity: Cesium.Entity;
  viewer: Cesium.Viewer;
  velocity: Cesium.Cartesian3;
  speed: number;
  health: number;
  maxHealth: number;
  aiState: AIState;
  patrolTarget: Cesium.Cartesian3;
  engageDistance: number;
  chaseDistance: number;
  lastShot: number;
  shootCooldown: number;
  targetFSV: boolean;
  lastFSVShot: number;
  currentDirection: Cesium.Cartesian3;

  constructor(viewer: Cesium.Viewer, position: Cesium.Cartesian3) {
    this.viewer = viewer;
    this.speed = GAME_CONSTANTS.ENEMY_SPEED;
    this.health = 3;
    this.maxHealth = 3;
    this.velocity = new Cesium.Cartesian3(0, 0, 0);
    this.aiState = AIState.PATROL;
    this.engageDistance = 250;
    this.chaseDistance = 300;
    this.lastShot = 0;
    this.shootCooldown = 2000;
    this.targetFSV = false;
    this.lastFSVShot = 0;
    this.currentDirection = new Cesium.Cartesian3(0, 0, -1);

    // Random patrol target
    this.patrolTarget = this.generateRandomPatrolTarget();

    // Create enemy aircraft entity
    this.entity = viewer.entities.add({
      position: position,
      orientation: Cesium.Transforms.headingPitchRollQuaternion(
        position,
        new Cesium.HeadingPitchRoll(0, 0, 0)
      ),
      model: {
        uri: 'https://raw.githubusercontent.com/CesiumGS/cesium/main/Apps/SampleData/models/CesiumAir/Cesium_Air.glb',
        minimumPixelSize: 48,
        maximumScale: 15,
        scale: 12,
        color: Cesium.Color.DARKRED.withAlpha(0.9)
      }
    });
  }

  generateRandomPatrolTarget(): Cesium.Cartesian3 {
    // Generate random point in Prague area
    const lat = 50.0755 + (Math.random() - 0.5) * 0.1;
    const lon = 14.4378 + (Math.random() - 0.5) * 0.1;
    const alt = 100 + Math.random() * 400;
    return Cesium.Cartesian3.fromDegrees(lon, lat, alt);
  }

  takeDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount);
  }

  isDead(): boolean {
    return this.health <= 0;
  }

  getPosition(): Cesium.Cartesian3 | undefined {
    return this.entity.position?.getValue(Cesium.JulianDate.now());
  }

  getOrientation(): Cesium.Quaternion | undefined {
    const orientation = this.entity.orientation?.getValue(Cesium.JulianDate.now());
    return orientation as Cesium.Quaternion | undefined;
  }

  getForwardVector(): Cesium.Cartesian3 {
    const orientation = this.getOrientation();
    if (!orientation) return new Cesium.Cartesian3(0, 0, -1);

    const matrix = Cesium.Matrix4.fromRotationTranslation(
      Cesium.Matrix3.fromQuaternion(orientation)
    );
    return new Cesium.Cartesian3(-matrix[8], -matrix[9], -matrix[10]);
  }

  remove(): void {
    this.viewer.entities.remove(this.entity);
  }
}

import * as Cesium from 'cesium';
import { GAME_CONSTANTS } from '../../utils/Types';

export class AllyAircraft {
  entity: Cesium.Entity;
  viewer: Cesium.Viewer;
  velocity: Cesium.Cartesian3;
  speed: number;
  health: number;
  maxHealth: number;
  target: Cesium.Entity | null;
  lastShot: number;
  shootCooldown: number;
  currentDirection: Cesium.Cartesian3;

  constructor(viewer: Cesium.Viewer, position: Cesium.Cartesian3) {
    this.viewer = viewer;
    this.speed = GAME_CONSTANTS.ENEMY_SPEED;
    this.health = 3;
    this.maxHealth = 3;
    this.velocity = new Cesium.Cartesian3(0, 0, 0);
    this.target = null;
    this.lastShot = 0;
    this.shootCooldown = 2000;
    this.currentDirection = new Cesium.Cartesian3(0, 0, -1);

    // Create ally aircraft entity (blue color)
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
        color: Cesium.Color.BLUE.withAlpha(0.9)
      }
    });
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

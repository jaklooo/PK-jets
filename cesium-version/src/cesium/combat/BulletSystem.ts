import * as Cesium from 'cesium';
import { GAME_CONSTANTS } from '../../utils/Types';

export interface Bullet {
  entity: Cesium.Entity;
  velocity: Cesium.Cartesian3;
  lifetime: number;
  maxLifetime: number;
  damage: number;
  isEnemy: boolean;
  isAlly: boolean;
}

export class BulletSystem {
  viewer: Cesium.Viewer;
  bullets: Bullet[];

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
    this.bullets = [];
  }

  shootPlayerBullet(position: Cesium.Cartesian3, forward: Cesium.Cartesian3): void {
    this.createBullet(position, forward, false, false, Cesium.Color.YELLOW);
  }

  shootEnemyBullet(position: Cesium.Cartesian3, forward: Cesium.Cartesian3): void {
    this.createBullet(position, forward, true, false, Cesium.Color.RED);
  }

  shootAllyBullet(position: Cesium.Cartesian3, forward: Cesium.Cartesian3): void {
    this.createBullet(position, forward, false, true, Cesium.Color.CYAN);
  }

  private createBullet(
    position: Cesium.Cartesian3,
    forward: Cesium.Cartesian3,
    isEnemy: boolean,
    isAlly: boolean,
    color: Cesium.Color
  ): void {
    const velocity = Cesium.Cartesian3.multiplyByScalar(
      forward,
      GAME_CONSTANTS.BULLET_SPEED,
      new Cesium.Cartesian3()
    );

    const entity = this.viewer.entities.add({
      position: position,
      ellipsoid: {
        radii: new Cesium.Cartesian3(0.15, 0.15, 0.15),
        material: color,
        outlineColor: color.brighten(0.3, new Cesium.Color()),
        outline: true,
        outlineWidth: 2
      }
    });

    this.bullets.push({
      entity,
      velocity,
      lifetime: 0,
      maxLifetime: 3000,
      damage: 1,
      isEnemy,
      isAlly
    });
  }

  update(deltaTime: number): void {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      
      // Update lifetime
      bullet.lifetime += deltaTime * 1000;
      if (bullet.lifetime > bullet.maxLifetime) {
        this.viewer.entities.remove(bullet.entity);
        this.bullets.splice(i, 1);
        continue;
      }

      // Move bullet
      const currentPos = bullet.entity.position?.getValue(Cesium.JulianDate.now());
      if (!currentPos) continue;

      const newPos = Cesium.Cartesian3.add(currentPos, bullet.velocity, new Cesium.Cartesian3());
      bullet.entity.position = new Cesium.ConstantPositionProperty(newPos);
    }
  }

  removeBullet(bullet: Bullet): void {
    const index = this.bullets.indexOf(bullet);
    if (index !== -1) {
      this.viewer.entities.remove(bullet.entity);
      this.bullets.splice(index, 1);
    }
  }

  getBullets(): Bullet[] {
    return this.bullets;
  }
}

import * as Cesium from 'cesium';
import { GAME_CONSTANTS } from '../../utils/Types';
import { Aircraft } from '../vehicles/Aircraft';
import { AllyAircraft } from '../vehicles/AllyAircraft';

export interface AAGun {
  entity: Cesium.Entity;
  barrel: Cesium.Entity;
  turret: Cesium.Entity;
  lastShot: number;
  shootCooldown: number;
  range: number;
  damage: number;
}

export interface AABullet {
  entity: Cesium.Entity;
  velocity: Cesium.Cartesian3;
  lifetime: number;
  maxLifetime: number;
  damage: number;
}

export class AAGunSystem {
  viewer: Cesium.Viewer;
  guns: AAGun[];
  bullets: AABullet[];

  constructor(viewer: Cesium.Viewer, hollarPosition: Cesium.Cartesian3) {
    this.viewer = viewer;
    this.guns = [];
    this.bullets = [];
    this.createAAGuns(hollarPosition);
  }

  private createAAGuns(hollarPos: Cesium.Cartesian3): void {
    const cartographic = Cesium.Cartographic.fromCartesian(hollarPos);
    const hollarLat = Cesium.Math.toDegrees(cartographic.latitude);
    const hollarLon = Cesium.Math.toDegrees(cartographic.longitude);
    const hollarAlt = cartographic.height;

    // 24 AA guns in 3 rings
    const gunPositions = [
      // Inner ring - 4 guns
      { offsetLat: 0.0004, offsetLon: 0.0006 },
      { offsetLat: -0.0004, offsetLon: 0.0006 },
      { offsetLat: 0.0004, offsetLon: -0.0006 },
      { offsetLat: -0.0004, offsetLon: -0.0006 },
      
      // Middle ring - 8 guns
      { offsetLat: 0.0008, offsetLon: 0 },
      { offsetLat: -0.0008, offsetLon: 0 },
      { offsetLat: 0, offsetLon: 0.0012 },
      { offsetLat: 0, offsetLon: -0.0012 },
      { offsetLat: 0.0006, offsetLon: 0.0009 },
      { offsetLat: -0.0006, offsetLon: 0.0009 },
      { offsetLat: 0.0006, offsetLon: -0.0009 },
      { offsetLat: -0.0006, offsetLon: -0.0009 },
      
      // Outer ring - 12 guns
      { offsetLat: 0.0012, offsetLon: 0 },
      { offsetLat: -0.0012, offsetLon: 0 },
      { offsetLat: 0, offsetLon: 0.0018 },
      { offsetLat: 0, offsetLon: -0.0018 },
      { offsetLat: 0.001, offsetLon: 0.0008 },
      { offsetLat: -0.001, offsetLon: 0.0008 },
      { offsetLat: 0.001, offsetLon: -0.0008 },
      { offsetLat: -0.001, offsetLon: -0.0008 },
      { offsetLat: 0.0008, offsetLon: 0.0015 },
      { offsetLat: -0.0008, offsetLon: 0.0015 },
      { offsetLat: 0.0008, offsetLon: -0.0015 },
      { offsetLat: -0.0008, offsetLon: -0.0015 }
    ];

    for (const pos of gunPositions) {
      const gunPos = Cesium.Cartesian3.fromDegrees(
        hollarLon + pos.offsetLon,
        hollarLat + pos.offsetLat,
        hollarAlt - 50
      );

      // Create gun base
      const gunEntity = this.viewer.entities.add({
        position: gunPos,
        cylinder: {
          length: 1,
          topRadius: 3,
          bottomRadius: 3.5,
          material: Cesium.Color.DARKGRAY,
          outline: true,
          outlineColor: Cesium.Color.BLACK
        }
      });

      // Create turret
      const turret = this.viewer.entities.add({
        position: gunPos,
        cylinder: {
          length: 2,
          topRadius: 1.5,
          bottomRadius: 1.5,
          material: Cesium.Color.GRAY
        }
      });

      // Create barrel
      const barrel = this.viewer.entities.add({
        position: gunPos,
        cylinder: {
          length: 6,
          topRadius: 0.3,
          bottomRadius: 0.3,
          material: Cesium.Color.DIMGRAY
        }
      });

      this.guns.push({
        entity: gunEntity,
        barrel,
        turret,
        lastShot: 0,
        shootCooldown: GAME_CONSTANTS.AA_GUN_COOLDOWN,
        range: GAME_CONSTANTS.AA_GUN_RANGE,
        damage: GAME_CONSTANTS.AA_GUN_DAMAGE
      });
    }

    console.log(`🔫 Created ${this.guns.length} AA guns defending Hollar`);
  }

  update(deltaTime: number, player: Aircraft, allies: AllyAircraft[]): void {
    const currentTime = Date.now();

    for (const gun of this.guns) {
      const gunPos = gun.entity.position?.getValue(Cesium.JulianDate.now());
      if (!gunPos) continue;

      let target: Cesium.Cartesian3 | null = null;
      let targetDistance = gun.range;

      // Check player distance
      const playerPos = player.getPosition();
      if (playerPos && !player.isOnGround) {
        const distanceToPlayer = Cesium.Cartesian3.distance(gunPos, playerPos);
        if (distanceToPlayer < gun.range) {
          target = playerPos;
          targetDistance = distanceToPlayer;
        }
      }

      // Check allies
      for (const ally of allies) {
        const allyPos = ally.getPosition();
        if (!allyPos) continue;

        const distanceToAlly = Cesium.Cartesian3.distance(gunPos, allyPos);
        if (distanceToAlly < gun.range && (!target || distanceToAlly < targetDistance)) {
          target = allyPos;
          targetDistance = distanceToAlly;
        }
      }

      // Aim and shoot at target
      if (target) {
        // Aim barrel at target (simplified - in real version would use proper orientation)
        
        // Shoot
        if (currentTime - gun.lastShot > gun.shootCooldown) {
          gun.lastShot = currentTime;
          this.shootAAGun(gunPos, target, gun.damage);
        }
      }
    }

    // Update bullets
    this.updateBullets(deltaTime);
  }

  private shootAAGun(gunPos: Cesium.Cartesian3, targetPos: Cesium.Cartesian3, damage: number): void {
    const direction = Cesium.Cartesian3.subtract(targetPos, gunPos, new Cesium.Cartesian3());
    Cesium.Cartesian3.normalize(direction, direction);

    const velocity = Cesium.Cartesian3.multiplyByScalar(direction, 1.5, new Cesium.Cartesian3());

    const entity = this.viewer.entities.add({
      position: gunPos,
      ellipsoid: {
        radii: new Cesium.Cartesian3(0.15, 0.15, 0.15),
        material: Cesium.Color.ORANGE,
        outline: true,
        outlineColor: Cesium.Color.RED
      }
    });

    this.bullets.push({
      entity,
      velocity,
      lifetime: 0,
      maxLifetime: 3000,
      damage
    });
  }

  private updateBullets(deltaTime: number): void {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      
      bullet.lifetime += deltaTime * 1000;
      if (bullet.lifetime > bullet.maxLifetime) {
        this.viewer.entities.remove(bullet.entity);
        this.bullets.splice(i, 1);
        continue;
      }

      const currentPos = bullet.entity.position?.getValue(Cesium.JulianDate.now());
      if (!currentPos) continue;

      const newPos = Cesium.Cartesian3.add(currentPos, bullet.velocity, new Cesium.Cartesian3());
      bullet.entity.position = new Cesium.ConstantPositionProperty(newPos);
    }
  }

  getBullets(): AABullet[] {
    return this.bullets;
  }

  removeBullet(bullet: AABullet): void {
    const index = this.bullets.indexOf(bullet);
    if (index !== -1) {
      this.viewer.entities.remove(bullet.entity);
      this.bullets.splice(index, 1);
    }
  }
}

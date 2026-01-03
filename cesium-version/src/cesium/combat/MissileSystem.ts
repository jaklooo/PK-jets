import * as Cesium from 'cesium';
import { GAME_CONSTANTS } from '../../utils/Types';
import { EnemyAircraft } from '../vehicles/EnemyAircraft';

export interface Missile {
  entity: Cesium.Entity;
  velocity: Cesium.Cartesian3;
  target: Cesium.Entity | null;
  lifetime: number;
  maxLifetime: number;
}

export class MissileSystem {
  viewer: Cesium.Viewer;
  missiles: Missile[];
  missileCount: number;
  lockedTarget: Cesium.Entity | null;
  lockProgress: number;

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
    this.missiles = [];
    this.missileCount = GAME_CONSTANTS.MAX_MISSILES;
    this.lockedTarget = null;
    this.lockProgress = 0;
  }

  updateLockOn(playerPos: Cesium.Cartesian3, enemies: EnemyAircraft[], hollarEntity: Cesium.Entity | null, deltaTime: number): void {
    let closestTarget: Cesium.Entity | null = null;
    let closestDistance = GAME_CONSTANTS.MISSILE_LOCK_RANGE;

    // Check enemies
    for (const enemy of enemies) {
      const enemyPos = enemy.getPosition();
      if (!enemyPos) continue;

      const distance = Cesium.Cartesian3.distance(playerPos, enemyPos);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestTarget = enemy.entity;
      }
    }

    // Check Hollar building
    if (hollarEntity) {
      const hollarPos = hollarEntity.position?.getValue(Cesium.JulianDate.now());
      if (hollarPos) {
        const distance = Cesium.Cartesian3.distance(playerPos, hollarPos);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestTarget = hollarEntity;
        }
      }
    }

    // Update lock progress
    if (closestTarget === this.lockedTarget && this.lockedTarget !== null) {
      this.lockProgress += deltaTime * 1000;
      if (this.lockProgress >= GAME_CONSTANTS.MISSILE_LOCK_TIME) {
        this.lockProgress = GAME_CONSTANTS.MISSILE_LOCK_TIME;
      }
    } else {
      this.lockedTarget = closestTarget;
      this.lockProgress = 0;
    }
  }

  isLocked(): boolean {
    return this.lockProgress >= GAME_CONSTANTS.MISSILE_LOCK_TIME && this.lockedTarget !== null;
  }

  getLockProgress(): number {
    return this.lockProgress / GAME_CONSTANTS.MISSILE_LOCK_TIME;
  }

  launchMissile(position: Cesium.Cartesian3, forward: Cesium.Cartesian3): boolean {
    if (this.missileCount <= 0 || !this.isLocked()) {
      return false;
    }

    const velocity = Cesium.Cartesian3.multiplyByScalar(
      forward,
      GAME_CONSTANTS.MISSILE_SPEED,
      new Cesium.Cartesian3()
    );

    const entity = this.viewer.entities.add({
      position: position,
      cylinder: {
        length: 2,
        topRadius: 0.1,
        bottomRadius: 0.1,
        material: Cesium.Color.GRAY,
        outline: true,
        outlineColor: Cesium.Color.RED,
        outlineWidth: 2
      }
    });

    this.missiles.push({
      entity,
      velocity,
      target: this.lockedTarget,
      lifetime: 0,
      maxLifetime: 8000
    });

    this.missileCount--;
    this.lockProgress = 0;
    this.lockedTarget = null;

    return true;
  }

  update(deltaTime: number): void {
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const missile = this.missiles[i];
      
      // Update lifetime
      missile.lifetime += deltaTime * 1000;
      if (missile.lifetime > missile.maxLifetime) {
        this.viewer.entities.remove(missile.entity);
        this.missiles.splice(i, 1);
        continue;
      }

      const currentPos = missile.entity.position?.getValue(Cesium.JulianDate.now());
      if (!currentPos) continue;

      // Guided tracking
      if (missile.target) {
        const targetPos = missile.target.position?.getValue(Cesium.JulianDate.now());
        if (targetPos) {
          // Calculate direction to target
          const directionToTarget = Cesium.Cartesian3.subtract(
            targetPos,
            currentPos,
            new Cesium.Cartesian3()
          );
          Cesium.Cartesian3.normalize(directionToTarget, directionToTarget);

          // Smoothly turn missile toward target (homing)
          Cesium.Cartesian3.lerp(
            missile.velocity,
            directionToTarget,
            GAME_CONSTANTS.MISSILE_TURN_SPEED,
            missile.velocity
          );
          Cesium.Cartesian3.normalize(missile.velocity, missile.velocity);

          // Scale back to speed
          Cesium.Cartesian3.multiplyByScalar(
            missile.velocity,
            GAME_CONSTANTS.MISSILE_SPEED,
            missile.velocity
          );
        }
      }

      // Move missile
      const newPos = Cesium.Cartesian3.add(currentPos, missile.velocity, new Cesium.Cartesian3());
      missile.entity.position = new Cesium.ConstantPositionProperty(newPos);
    }
  }

  removeMissile(missile: Missile): void {
    const index = this.missiles.indexOf(missile);
    if (index !== -1) {
      this.viewer.entities.remove(missile.entity);
      this.missiles.splice(index, 1);
    }
  }

  getMissiles(): Missile[] {
    return this.missiles;
  }

  getMissileCount(): number {
    return this.missileCount;
  }
}

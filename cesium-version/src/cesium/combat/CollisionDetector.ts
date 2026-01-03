import * as Cesium from 'cesium';
import { Aircraft } from '../vehicles/Aircraft';
import { EnemyAircraft } from '../vehicles/EnemyAircraft';
import { AllyAircraft } from '../vehicles/AllyAircraft';
import { BulletSystem, Bullet } from './BulletSystem';
import { MissileSystem, Missile } from './MissileSystem';
import { AAGunSystem, AABullet } from './AAGunSystem';
import { ExplosionEffect } from './ExplosionEffect';

export interface BuildingTarget {
  entity: Cesium.Entity;
  health: number;
  maxHealth: number;
  position: Cesium.Cartesian3;
  isHollar?: boolean;
  isFSV?: boolean;
}

export class CollisionDetector {
  viewer: Cesium.Viewer;
  player: Aircraft;
  enemies: EnemyAircraft[];
  allies: AllyAircraft[];
  bulletSystem: BulletSystem;
  missileSystem: MissileSystem;
  aaGunSystem: AAGunSystem;
  explosionEffect: ExplosionEffect;
  hollarBuilding: BuildingTarget | null;
  fsvBuilding: BuildingTarget | null;
  score: number;
  onScoreChange: (score: number) => void;
  onGameOver: (victory: boolean) => void;

  constructor(
    viewer: Cesium.Viewer,
    player: Aircraft,
    enemies: EnemyAircraft[],
    allies: AllyAircraft[],
    bulletSystem: BulletSystem,
    missileSystem: MissileSystem,
    aaGunSystem: AAGunSystem,
    explosionEffect: ExplosionEffect,
    hollarBuilding: BuildingTarget | null,
    fsvBuilding: BuildingTarget | null,
    onScoreChange: (score: number) => void,
    onGameOver: (victory: boolean) => void
  ) {
    this.viewer = viewer;
    this.player = player;
    this.enemies = enemies;
    this.allies = allies;
    this.bulletSystem = bulletSystem;
    this.missileSystem = missileSystem;
    this.aaGunSystem = aaGunSystem;
    this.explosionEffect = explosionEffect;
    this.hollarBuilding = hollarBuilding;
    this.fsvBuilding = fsvBuilding;
    this.score = 0;
    this.onScoreChange = onScoreChange;
    this.onGameOver = onGameOver;
  }

  checkAll(): void {
    this.checkBulletCollisions();
    this.checkMissileCollisions();
    this.checkAABulletCollisions();
    this.checkPlaneCollisions();
  }

  private checkBulletCollisions(): void {
    const bullets = this.bulletSystem.getBullets();
    const playerPos = this.player.getPosition();

    for (let i = bullets.length - 1; i >= 0; i--) {
      const bullet = bullets[i];
      const bulletPos = bullet.entity.position?.getValue(Cesium.JulianDate.now());
      if (!bulletPos) continue;

      // Enemy bullet hitting player
      if (bullet.isEnemy && playerPos) {
        const distance = Cesium.Cartesian3.distance(bulletPos, playerPos);
        if (distance < 3) {
          this.player.takeDamage(bullet.damage);
          this.explosionEffect.createExplosion(bulletPos, 0.5);
          this.bulletSystem.removeBullet(bullet);
          continue;
        }
      }

      // Player or ally bullet hitting enemy
      if (!bullet.isEnemy) {
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const enemy = this.enemies[j];
          const enemyPos = enemy.getPosition();
          if (!enemyPos) continue;

          const distance = Cesium.Cartesian3.distance(bulletPos, enemyPos);
          if (distance < 3) {
            enemy.takeDamage(bullet.damage);
            
            if (enemy.isDead()) {
              this.explosionEffect.createExplosion(enemyPos, 1.5);
              enemy.remove();
              this.enemies.splice(j, 1);
              
              if (!bullet.isAlly) {
                this.score += 10;
                this.onScoreChange(this.score);
              }
            } else {
              this.explosionEffect.createExplosion(bulletPos, 0.5);
            }
            
            this.bulletSystem.removeBullet(bullet);
            break;
          }
        }
      }

      // Enemy bullet hitting ally
      if (bullet.isEnemy) {
        for (let j = this.allies.length - 1; j >= 0; j--) {
          const ally = this.allies[j];
          const allyPos = ally.getPosition();
          if (!allyPos) continue;

          const distance = Cesium.Cartesian3.distance(bulletPos, allyPos);
          if (distance < 3) {
            ally.takeDamage(bullet.damage);
            
            if (ally.isDead()) {
              this.explosionEffect.createExplosion(allyPos, 1.2);
              ally.remove();
              this.allies.splice(j, 1);
            }
            
            this.bulletSystem.removeBullet(bullet);
            break;
          }
        }
      }
    }
  }

  private checkMissileCollisions(): void {
    const missiles = this.missileSystem.getMissiles();

    for (let i = missiles.length - 1; i >= 0; i--) {
      const missile = missiles[i];
      const missilePos = missile.entity.position?.getValue(Cesium.JulianDate.now());
      if (!missilePos) continue;

      // Check collision with enemies
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const enemy = this.enemies[j];
        const enemyPos = enemy.getPosition();
        if (!enemyPos) continue;

        const distance = Cesium.Cartesian3.distance(missilePos, enemyPos);
        if (distance < 5) {
          enemy.takeDamage(3);
          this.explosionEffect.createExplosion(missilePos, 2.0);
          this.missileSystem.removeMissile(missile);
          
          if (enemy.isDead()) {
            enemy.remove();
            this.enemies.splice(j, 1);
            this.score += 50;
            this.onScoreChange(this.score);
          }
          break;
        }
      }

      // Check collision with Hollar building
      if (this.hollarBuilding && this.hollarBuilding.health > 0) {
        const distance = Cesium.Cartesian3.distance(missilePos, this.hollarBuilding.position);
        if (distance < 20) {
          this.hollarBuilding.health -= 25;
          this.explosionEffect.createExplosion(missilePos, 3.0);
          this.missileSystem.removeMissile(missile);
          
          console.log(`🎯 Hit Hollar! Health: ${this.hollarBuilding.health}/${this.hollarBuilding.maxHealth}`);
          
          if (this.hollarBuilding.health <= 0) {
            this.explosionEffect.createExplosion(this.hollarBuilding.position, 5.0);
            console.log('🎉 VICTORY! Hollar destroyed!');
            this.onGameOver(true);
          }
          break;
        }
      }
    }
  }

  private checkAABulletCollisions(): void {
    const aaBullets = this.aaGunSystem.getBullets();
    const playerPos = this.player.getPosition();

    for (let i = aaBullets.length - 1; i >= 0; i--) {
      const bullet = aaBullets[i];
      const bulletPos = bullet.entity.position?.getValue(Cesium.JulianDate.now());
      if (!bulletPos) continue;

      // Check collision with player
      if (playerPos) {
        const distance = Cesium.Cartesian3.distance(bulletPos, playerPos);
        if (distance < 3) {
          this.player.takeDamage(bullet.damage);
          this.explosionEffect.createExplosion(bulletPos, 0.5);
          this.aaGunSystem.removeBullet(bullet);
          console.log('💥 AA gun hit player!');
          continue;
        }
      }

      // Check collision with allies
      for (let j = this.allies.length - 1; j >= 0; j--) {
        const ally = this.allies[j];
        const allyPos = ally.getPosition();
        if (!allyPos) continue;

        const distance = Cesium.Cartesian3.distance(bulletPos, allyPos);
        if (distance < 3) {
          this.explosionEffect.createExplosion(allyPos, 1.2);
          ally.remove();
          this.allies.splice(j, 1);
          this.aaGunSystem.removeBullet(bullet);
          console.log('💥 AA gun destroyed ally!');
          break;
        }
      }
    }
  }

  private checkPlaneCollisions(): void {
    const playerPos = this.player.getPosition();
    if (!playerPos) return;

    // Check player collision with enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const enemyPos = enemy.getPosition();
      if (!enemyPos) continue;

      const distance = Cesium.Cartesian3.distance(playerPos, enemyPos);
      if (distance < 8) {
        this.player.takeDamage(20);
        this.explosionEffect.createExplosion(enemyPos, 1.5);
        enemy.remove();
        this.enemies.splice(i, 1);
        console.log('💥 Player collision with enemy!');
      }
    }

    // Check enemy-enemy collisions
    for (let i = 0; i < this.enemies.length; i++) {
      const enemy1 = this.enemies[i];
      const pos1 = enemy1.getPosition();
      if (!pos1) continue;

      for (let j = i + 1; j < this.enemies.length; j++) {
        const enemy2 = this.enemies[j];
        const pos2 = enemy2.getPosition();
        if (!pos2) continue;

        const distance = Cesium.Cartesian3.distance(pos1, pos2);
        if (distance < 10) {
          this.explosionEffect.createExplosion(pos1, 1.5);
          this.explosionEffect.createExplosion(pos2, 1.5);
          enemy1.remove();
          enemy2.remove();
          this.enemies.splice(j, 1);
          this.enemies.splice(i, 1);
          console.log('💥 Enemy mid-air collision!');
          break;
        }
      }
    }

    // Check if player is destroyed
    if (this.player.health <= 0) {
      console.log('💀 Player destroyed!');
      this.onGameOver(false);
    }

    // Check if FSV is destroyed
    if (this.fsvBuilding && this.fsvBuilding.health <= 0) {
      console.log('💔 FSV destroyed! Mission failed!');
      this.onGameOver(false);
    }
  }

  updateScore(points: number): void {
    this.score += points;
    this.onScoreChange(this.score);
  }

  getScore(): number {
    return this.score;
  }
}

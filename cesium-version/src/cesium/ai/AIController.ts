import * as Cesium from 'cesium';
import { EnemyAircraft } from '../vehicles/EnemyAircraft';
import { AllyAircraft } from '../vehicles/AllyAircraft';
import { Aircraft } from '../vehicles/Aircraft';
import { BulletSystem } from '../combat/BulletSystem';
import { AIState } from './AIStates';
import { AI_CONSTANTS } from './AIStates';

export class AIController {
  viewer: Cesium.Viewer;
  enemies: EnemyAircraft[];
  allies: AllyAircraft[];
  player: Aircraft;
  bulletSystem: BulletSystem;
  fsvBuilding: { position: Cesium.Cartesian3; health: number } | null;

  constructor(
    viewer: Cesium.Viewer,
    enemies: EnemyAircraft[],
    allies: AllyAircraft[],
    player: Aircraft,
    bulletSystem: BulletSystem,
    fsvBuilding: { position: Cesium.Cartesian3; health: number } | null
  ) {
    this.viewer = viewer;
    this.enemies = enemies;
    this.allies = allies;
    this.player = player;
    this.bulletSystem = bulletSystem;
    this.fsvBuilding = fsvBuilding;
  }

  updateEnemies(deltaTime: number): void {
    const currentTime = Date.now();
    const playerPos = this.player.getPosition();
    if (!playerPos) return;

    const allAlliesDead = this.allies.length === 0;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const enemyPos = enemy.getPosition();
      if (!enemyPos) continue;

      const distanceToPlayer = Cesium.Cartesian3.distance(enemyPos, playerPos);

      // If all allies dead, some enemies attack FSV
      if (allAlliesDead && this.fsvBuilding && this.fsvBuilding.health > 0) {
        const distanceToFSV = Cesium.Cartesian3.distance(enemyPos, this.fsvBuilding.position);

        if (!enemy.targetFSV && Math.random() < 0.5) {
          enemy.targetFSV = true;
        }

        if (enemy.targetFSV && distanceToFSV < 400) {
          this.moveTowardTarget(enemy, this.fsvBuilding.position);
          continue;
        }
      }

      // AI State Machine
      let targetDirection = new Cesium.Cartesian3();

      switch (enemy.aiState) {
        case AIState.PATROL:
          targetDirection = this.handlePatrolState(enemy, enemyPos, distanceToPlayer);
          break;

        case AIState.ENGAGE:
          targetDirection = this.handleEngageState(enemy, enemyPos, playerPos, distanceToPlayer, currentTime, i);
          break;

        case AIState.CHASE:
          targetDirection = this.handleChaseState(enemy, enemyPos, playerPos, distanceToPlayer);
          break;

        case AIState.EVADE:
          targetDirection = this.handleEvadeState(enemy, enemyPos, playerPos, distanceToPlayer);
          break;
      }

      // Collision avoidance
      const avoidanceVector = this.calculateCollisionAvoidance(enemy, i);
      if (Cesium.Cartesian3.magnitude(avoidanceVector) > 0.01) {
        Cesium.Cartesian3.normalize(avoidanceVector, avoidanceVector);
        Cesium.Cartesian3.multiplyByScalar(avoidanceVector, 0.3, avoidanceVector);
        Cesium.Cartesian3.add(targetDirection, avoidanceVector, targetDirection);
        Cesium.Cartesian3.normalize(targetDirection, targetDirection);
      }

      // Smooth turning
      Cesium.Cartesian3.lerp(enemy.currentDirection, targetDirection, AI_CONSTANTS.SMOOTH_TURN_FACTOR, enemy.currentDirection);
      Cesium.Cartesian3.normalize(enemy.currentDirection, enemy.currentDirection);

      // Update movement
      this.moveEnemy(enemy, enemyPos);

      // Shooting
      if ((enemy.aiState === AIState.CHASE || enemy.aiState === AIState.ENGAGE) &&
          distanceToPlayer > AI_CONSTANTS.SHOOT_MIN_DISTANCE &&
          distanceToPlayer < AI_CONSTANTS.SHOOT_MAX_DISTANCE) {
        if (currentTime - enemy.lastShot > enemy.shootCooldown) {
          enemy.lastShot = currentTime;
          const forward = enemy.getForwardVector();
          this.bulletSystem.shootEnemyBullet(enemyPos, forward);
        }
      }
    }
  }

  updateAllies(deltaTime: number): void {
    const currentTime = Date.now();

    for (const ally of this.allies) {
      const allyPos = ally.getPosition();
      if (!allyPos) continue;

      // Find nearest enemy
      let nearestEnemy: EnemyAircraft | null = null;
      let nearestDistance = Infinity;

      for (const enemy of this.enemies) {
        const enemyPos = enemy.getPosition();
        if (!enemyPos) continue;

        const distance = Cesium.Cartesian3.distance(allyPos, enemyPos);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestEnemy = enemy;
        }
      }

      if (nearestEnemy) {
        const enemyPos = nearestEnemy.getPosition();
        if (enemyPos) {
          // Move toward enemy
          const direction = Cesium.Cartesian3.subtract(enemyPos, allyPos, new Cesium.Cartesian3());
          Cesium.Cartesian3.normalize(direction, direction);

          Cesium.Cartesian3.lerp(ally.currentDirection, direction, 0.05, ally.currentDirection);
          Cesium.Cartesian3.normalize(ally.currentDirection, ally.currentDirection);

          this.moveEnemy(ally as any, allyPos);

          // Shoot at enemy
          if (nearestDistance < 150 && currentTime - ally.lastShot > ally.shootCooldown) {
            ally.lastShot = currentTime;
            const forward = ally.getForwardVector();
            this.bulletSystem.shootAllyBullet(allyPos, forward);
          }
        }
      } else {
        // No enemies, patrol
        this.moveEnemy(ally as any, allyPos);
      }
    }
  }

  private handlePatrolState(enemy: EnemyAircraft, enemyPos: Cesium.Cartesian3, distanceToPlayer: number): Cesium.Cartesian3 {
    const dirToPatrol = Cesium.Cartesian3.subtract(enemy.patrolTarget, enemyPos, new Cesium.Cartesian3());

    if (Cesium.Cartesian3.magnitude(dirToPatrol) < 50) {
      enemy.patrolTarget = enemy.generateRandomPatrolTarget();
    }

    Cesium.Cartesian3.normalize(dirToPatrol, dirToPatrol);

    if (distanceToPlayer < enemy.engageDistance) {
      enemy.aiState = AIState.ENGAGE;
    }

    return dirToPatrol;
  }

  private handleEngageState(
    enemy: EnemyAircraft,
    enemyPos: Cesium.Cartesian3,
    playerPos: Cesium.Cartesian3,
    distanceToPlayer: number,
    currentTime: number,
    index: number
  ): Cesium.Cartesian3 {
    const angleAroundPlayer = (currentTime * 0.0005 + index) % (Math.PI * 2);
    const circleRadius = AI_CONSTANTS.ENGAGE_CIRCLE_RADIUS;
    
    const cartographic = Cesium.Cartographic.fromCartesian(playerPos);
    const targetCartographic = new Cesium.Cartographic(
      cartographic.longitude + Math.cos(angleAroundPlayer) * 0.002,
      cartographic.latitude + Math.sin(angleAroundPlayer) * 0.002,
      cartographic.height + Math.sin(angleAroundPlayer * 0.5) * 30
    );
    const circleTarget = Cesium.Cartographic.toCartesian(targetCartographic);

    const targetDirection = Cesium.Cartesian3.subtract(circleTarget, enemyPos, new Cesium.Cartesian3());
    Cesium.Cartesian3.normalize(targetDirection, targetDirection);

    // Check if player is behind
    const dirToEnemy = Cesium.Cartesian3.subtract(enemyPos, playerPos, new Cesium.Cartesian3());
    const enemyForward = enemy.getForwardVector();
    const dotProduct = Cesium.Cartesian3.dot(
      Cesium.Cartesian3.normalize(dirToEnemy, new Cesium.Cartesian3()),
      enemyForward
    );

    if (dotProduct < -0.3 && distanceToPlayer < 200) {
      enemy.aiState = AIState.EVADE;
    } else if (distanceToPlayer < 100 && Math.random() < 0.3) {
      enemy.aiState = AIState.CHASE;
    }

    if (distanceToPlayer > enemy.chaseDistance) {
      enemy.aiState = AIState.PATROL;
    }

    return targetDirection;
  }

  private handleChaseState(enemy: EnemyAircraft, enemyPos: Cesium.Cartesian3, playerPos: Cesium.Cartesian3, distanceToPlayer: number): Cesium.Cartesian3 {
    const targetDirection = Cesium.Cartesian3.subtract(playerPos, enemyPos, new Cesium.Cartesian3());
    Cesium.Cartesian3.normalize(targetDirection, targetDirection);

    if (distanceToPlayer < AI_CONSTANTS.CHASE_TOO_CLOSE_DISTANCE) {
      enemy.aiState = AIState.EVADE;
    }

    if (distanceToPlayer > 250) {
      enemy.aiState = AIState.ENGAGE;
    }

    return targetDirection;
  }

  private handleEvadeState(enemy: EnemyAircraft, enemyPos: Cesium.Cartesian3, playerPos: Cesium.Cartesian3, distanceToPlayer: number): Cesium.Cartesian3 {
    const awayFromPlayer = Cesium.Cartesian3.subtract(enemyPos, playerPos, new Cesium.Cartesian3());
    Cesium.Cartesian3.normalize(awayFromPlayer, awayFromPlayer);

    // Add random maneuver
    awayFromPlayer.x += (Math.random() - 0.5) * 0.5;
    awayFromPlayer.y += (Math.random() - 0.5) * 0.5;
    awayFromPlayer.z += (Math.random() - 0.5) * 0.5;
    Cesium.Cartesian3.normalize(awayFromPlayer, awayFromPlayer);

    if (distanceToPlayer > AI_CONSTANTS.EVADE_SAFE_DISTANCE) {
      enemy.aiState = AIState.ENGAGE;
    }

    return awayFromPlayer;
  }

  private calculateCollisionAvoidance(enemy: EnemyAircraft, currentIndex: number): Cesium.Cartesian3 {
    const avoidanceVector = new Cesium.Cartesian3(0, 0, 0);
    const enemyPos = enemy.getPosition();
    if (!enemyPos) return avoidanceVector;

    for (let j = 0; j < this.enemies.length; j++) {
      if (currentIndex !== j) {
        const otherEnemy = this.enemies[j];
        const otherPos = otherEnemy.getPosition();
        if (!otherPos) continue;

        const distanceToOther = Cesium.Cartesian3.distance(enemyPos, otherPos);

        if (distanceToOther < AI_CONSTANTS.COLLISION_AVOIDANCE_DISTANCE) {
          const awayFromOther = Cesium.Cartesian3.subtract(enemyPos, otherPos, new Cesium.Cartesian3());
          Cesium.Cartesian3.normalize(awayFromOther, awayFromOther);
          Cesium.Cartesian3.multiplyByScalar(awayFromOther, 1.0 / distanceToOther, awayFromOther);
          Cesium.Cartesian3.add(avoidanceVector, awayFromOther, avoidanceVector);
        }
      }
    }

    return avoidanceVector;
  }

  private moveEnemy(enemy: EnemyAircraft, enemyPos: Cesium.Cartesian3): void {
    // Calculate target rotation
    const targetPos = Cesium.Cartesian3.add(enemyPos, enemy.currentDirection, new Cesium.Cartesian3());
    const orientation = Cesium.Transforms.headingPitchRollQuaternion(
      enemyPos,
      new Cesium.HeadingPitchRoll(0, 0, 0)
    );

    enemy.entity.orientation = new Cesium.ConstantProperty(orientation);

    // Move enemy
    const movement = Cesium.Cartesian3.multiplyByScalar(
      enemy.currentDirection,
      enemy.speed,
      new Cesium.Cartesian3()
    );
    const newPos = Cesium.Cartesian3.add(enemyPos, movement, new Cesium.Cartesian3());

    // Keep at reasonable altitude
    const cartographic = Cesium.Cartographic.fromCartesian(newPos);
    if (cartographic.height < 100) {
      cartographic.height = 100;
    } else if (cartographic.height > 800) {
      cartographic.height = 800;
    }

    enemy.entity.position = new Cesium.ConstantPositionProperty(
      Cesium.Cartographic.toCartesian(cartographic)
    );
  }

  private moveTowardTarget(enemy: EnemyAircraft, targetPos: Cesium.Cartesian3): void {
    const enemyPos = enemy.getPosition();
    if (!enemyPos) return;

    const direction = Cesium.Cartesian3.subtract(targetPos, enemyPos, new Cesium.Cartesian3());
    Cesium.Cartesian3.normalize(direction, direction);

    Cesium.Cartesian3.lerp(enemy.currentDirection, direction, 0.03, enemy.currentDirection);
    Cesium.Cartesian3.normalize(enemy.currentDirection, enemy.currentDirection);

    this.moveEnemy(enemy, enemyPos);
  }
}

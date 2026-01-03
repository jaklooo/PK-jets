import * as Cesium from 'cesium';

// Game Constants
export const GAME_CONSTANTS = {
  PLAYER_ACCELERATION: 0.015,
  PLAYER_MIN_SPEED: 0.8,
  PLAYER_MAX_SPEED: 1.8,
  PLAYER_TURBO_SPEED: 3.0,
  PLAYER_TURN_SPEED: 0.02,
  PLAYER_PITCH_SPEED: 0.015,
  PLAYER_ROLL_SPEED: 0.05,
  
  BULLET_SPEED: 5.0,
  ENEMY_SPEED: 0.8,
  MAX_ENEMIES: 15,
  NUM_ALLIES: 6,
  MAX_HEALTH: 100,
  
  MISSILE_SPEED: 2.0,
  MISSILE_TURN_SPEED: 0.04,
  MISSILE_LOCK_TIME: 2000,
  MISSILE_LOCK_RANGE: 400,
  MAX_MISSILES: 20,
  
  AA_GUN_RANGE: 350,
  AA_GUN_COOLDOWN: 500,
  AA_GUN_DAMAGE: 15,
  
  FSV_MAX_HEALTH: 200,
  HOLLAR_MAX_HEALTH: 100
};

// AI States
export enum AIState {
  PATROL = 'patrol',
  ENGAGE = 'engage',
  CHASE = 'chase',
  EVADE = 'evade'
}

// Entity Types
export interface AircraftData {
  velocity: Cesium.Cartesian3;
  speed: number;
  health: number;
  maxHealth: number;
  entity?: Cesium.Entity;
}

export interface EnemyAircraftData extends AircraftData {
  aiState: AIState;
  patrolTarget: Cesium.Cartesian3;
  engageDistance: number;
  chaseDistance: number;
  lastShot: number;
  shootCooldown: number;
  targetFSV?: boolean;
  lastFSVShot?: number;
}

export interface AllyAircraftData extends AircraftData {
  target: Cesium.Entity | null;
  lastShot: number;
  shootCooldown: number;
}

export interface BulletData {
  velocity: Cesium.Cartesian3;
  lifetime: number;
  maxLifetime: number;
  damage: number;
  isEnemy?: boolean;
  isAlly?: boolean;
}

export interface MissileData {
  velocity: Cesium.Cartesian3;
  target: Cesium.Entity | null;
  lifetime: number;
  maxLifetime: number;
}

export interface AAGunData {
  lastShot: number;
  shootCooldown: number;
  range: number;
  damage: number;
  barrel?: Cesium.Entity;
  turret?: Cesium.Entity;
}

export interface BuildingData {
  health: number;
  maxHealth: number;
  position: Cesium.Cartesian3;
}

// Keys pressed state
export interface KeysState {
  [key: string]: boolean;
}

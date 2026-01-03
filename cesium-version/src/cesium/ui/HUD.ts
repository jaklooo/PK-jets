import { Aircraft } from '../vehicles/Aircraft';
import { EnemyAircraft } from '../vehicles/EnemyAircraft';
import { AllyAircraft } from '../vehicles/AllyAircraft';

export class HUD {
  scoreElement: HTMLElement | null;
  healthFillElement: HTMLElement | null;
  speedElement: HTMLElement | null;
  altitudeElement: HTMLElement | null;
  positionElement: HTMLElement | null;
  missilesElement: HTMLElement | null;
  fsvHealthElement: HTMLElement | null;
  missionElement: HTMLElement | null;

  constructor() {
    this.scoreElement = document.getElementById('score');
    this.healthFillElement = document.getElementById('healthFill');
    this.speedElement = document.getElementById('speed');
    this.altitudeElement = document.getElementById('altitude');
    this.positionElement = document.getElementById('position');
    this.missilesElement = document.getElementById('missiles');
    this.fsvHealthElement = document.getElementById('fsvHealth');
    this.missionElement = document.getElementById('mission');
  }

  update(
    aircraft: Aircraft,
    score: number,
    missileCount: number,
    fsvHealth: number,
    enemies: EnemyAircraft[],
    allies: AllyAircraft[]
  ): void {
    // Update score
    if (this.scoreElement) {
      this.scoreElement.textContent = score.toString();
    }

    // Update health bar
    if (this.healthFillElement) {
      const healthPercent = (aircraft.health / aircraft.maxHealth) * 100;
      this.healthFillElement.style.width = healthPercent + '%';
    }

    // Update speed
    if (this.speedElement) {
      const speedKmh = Math.round(aircraft.speed * 100);
      this.speedElement.textContent = speedKmh + ' km/h';
    }

    // Update altitude
    if (this.altitudeElement) {
      const position = aircraft.getPosition();
      if (position) {
        const cartographic = Cesium.Cartographic.fromCartesian(position);
        const altitude = Math.round(cartographic.height);
        this.altitudeElement.textContent = altitude + ' m';
      }
    }

    // Update position
    if (this.positionElement) {
      const position = aircraft.getPosition();
      if (position) {
        const cartographic = Cesium.Cartographic.fromCartesian(position);
        const x = Math.round(Cesium.Math.toDegrees(cartographic.longitude) * 1000);
        const z = Math.round(Cesium.Math.toDegrees(cartographic.latitude) * 1000);
        this.positionElement.textContent = `X: ${x}, Z: ${z}`;
      }
    }

    // Update missiles
    if (this.missilesElement) {
      this.missilesElement.textContent = missileCount.toString();
    }

    // Update FSV health
    if (this.fsvHealthElement) {
      this.fsvHealthElement.textContent = fsvHealth.toString();
    }

    // Update mission status
    if (this.missionElement) {
      if (enemies.length === 0) {
        this.missionElement.textContent = '🎯 Destroy Hollar!';
      } else {
        this.missionElement.textContent = '⚔️ Defend FSV!';
      }
    }
  }

  showLockIndicator(locked: boolean, progress: number): void {
    const lockIndicator = document.getElementById('lockIndicator');
    if (!lockIndicator) return;

    if (progress > 0) {
      lockIndicator.style.display = 'block';
      if (locked) {
        lockIndicator.textContent = 'LOCKED 🎯';
        lockIndicator.className = 'locked';
      } else {
        lockIndicator.textContent = `LOCKING... ${Math.round(progress * 100)}%`;
        lockIndicator.className = '';
      }
    } else {
      lockIndicator.style.display = 'none';
    }
  }
}

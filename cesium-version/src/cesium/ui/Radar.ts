import * as Cesium from 'cesium';
import { Aircraft } from '../vehicles/Aircraft';
import { EnemyAircraft } from '../vehicles/EnemyAircraft';
import { AllyAircraft } from '../vehicles/AllyAircraft';

export class Radar {
  canvas: HTMLCanvasElement | null;
  ctx: CanvasRenderingContext2D | null;
  size: number;
  range: number;

  constructor() {
    this.canvas = document.getElementById('radar') as HTMLCanvasElement;
    this.ctx = this.canvas?.getContext('2d') || null;
    this.size = 150;
    this.range = 800;
  }

  update(aircraft: Aircraft, enemies: EnemyAircraft[], allies: AllyAircraft[]): void {
    if (!this.ctx || !this.canvas) return;

    const playerPos = aircraft.getPosition();
    if (!playerPos) return;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.size, this.size);

    // Draw background
    this.ctx.fillStyle = 'rgba(0, 20, 0, 0.8)';
    this.ctx.fillRect(0, 0, this.size, this.size);

    // Draw rings
    this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
    this.ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      this.ctx.beginPath();
      this.ctx.arc(this.size / 2, this.size / 2, (this.size / 2) * (i / 3), 0, Math.PI * 2);
      this.ctx.stroke();
    }

    // Draw crosshair
    this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
    this.ctx.beginPath();
    this.ctx.moveTo(this.size / 2, 0);
    this.ctx.lineTo(this.size / 2, this.size);
    this.ctx.moveTo(0, this.size / 2);
    this.ctx.lineTo(this.size, this.size / 2);
    this.ctx.stroke();

    // Draw player (center)
    this.ctx.fillStyle = '#00ff00';
    this.ctx.beginPath();
    this.ctx.arc(this.size / 2, this.size / 2, 3, 0, Math.PI * 2);
    this.ctx.fill();

    // Draw enemies
    this.ctx.fillStyle = '#ff0000';
    for (const enemy of enemies) {
      const enemyPos = enemy.getPosition();
      if (!enemyPos) continue;

      const distance = Cesium.Cartesian3.distance(playerPos, enemyPos);
      if (distance < this.range) {
        const relativePos = Cesium.Cartesian3.subtract(enemyPos, playerPos, new Cesium.Cartesian3());
        const x = (relativePos.x / this.range) * (this.size / 2) + this.size / 2;
        const y = (relativePos.z / this.range) * (this.size / 2) + this.size / 2;

        this.ctx.beginPath();
        this.ctx.arc(x, y, 2, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    // Draw allies
    this.ctx.fillStyle = '#0066ff';
    for (const ally of allies) {
      const allyPos = ally.getPosition();
      if (!allyPos) continue;

      const distance = Cesium.Cartesian3.distance(playerPos, allyPos);
      if (distance < this.range) {
        const relativePos = Cesium.Cartesian3.subtract(allyPos, playerPos, new Cesium.Cartesian3());
        const x = (relativePos.x / this.range) * (this.size / 2) + this.size / 2;
        const y = (relativePos.z / this.range) * (this.size / 2) + this.size / 2;

        this.ctx.beginPath();
        this.ctx.arc(x, y, 2, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
  }
}

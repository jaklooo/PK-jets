import * as Cesium from 'cesium';
import { FSVCampus } from './FSVCampus';
import { HollarBuilding } from './HollarBuilding';
import { ExplosionEffect } from '../combat/ExplosionEffect';

export class BuildingManager {
  fsvCampus: FSVCampus;
  hollarBuilding: HollarBuilding;
  explosionEffect: ExplosionEffect;
  onVictory: () => void;
  onDefeat: () => void;

  constructor(
    fsvCampus: FSVCampus,
    hollarBuilding: HollarBuilding,
    explosionEffect: ExplosionEffect,
    onVictory: () => void,
    onDefeat: () => void
  ) {
    this.fsvCampus = fsvCampus;
    this.hollarBuilding = hollarBuilding;
    this.explosionEffect = explosionEffect;
    this.onVictory = onVictory;
    this.onDefeat = onDefeat;
  }

  checkBuildingStatus(): void {
    if (this.hollarBuilding.isDestroyed()) {
      this.explosionEffect.createExplosion(this.hollarBuilding.getPosition(), 5.0);
      console.log('🎉 VICTORY! Hollar destroyed!');
      this.onVictory();
    }

    if (this.fsvCampus.isDestroyed()) {
      this.explosionEffect.createExplosion(this.fsvCampus.getPosition(), 5.0);
      console.log('💔 DEFEAT! FSV destroyed!');
      this.onDefeat();
    }
  }

  getFSVHealth(): number {
    return this.fsvCampus.getHealth();
  }

  getHollarHealth(): number {
    return this.hollarBuilding.getHealth();
  }
}

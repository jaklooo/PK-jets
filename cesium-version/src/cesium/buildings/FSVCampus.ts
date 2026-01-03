import * as Cesium from 'cesium';
import { getFSVPosition } from '../../utils/GPSCoordinates';

export class FSVCampus {
  viewer: Cesium.Viewer;
  entity: Cesium.Entity;
  health: number;
  maxHealth: number;
  position: Cesium.Cartesian3;

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
    this.health = 200;
    this.maxHealth = 200;
    this.position = getFSVPosition();

    // Create FSV building (simplified for Cesium)
    this.entity = viewer.entities.add({
      position: this.position,
      box: {
        dimensions: new Cesium.Cartesian3(40, 40, 20),
        material: Cesium.Color.GOLD.withAlpha(0.8),
        outline: true,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2
      },
      label: {
        text: 'FSV UK CAMPUS',
        font: '18px sans-serif',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -25)
      }
    });
  }

  takeDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount);
    console.log(`FSV took ${amount} damage! Health: ${this.health}/${this.maxHealth}`);
  }

  isDestroyed(): boolean {
    return this.health <= 0;
  }

  getHealth(): number {
    return this.health;
  }

  getPosition(): Cesium.Cartesian3 {
    return this.position;
  }
}

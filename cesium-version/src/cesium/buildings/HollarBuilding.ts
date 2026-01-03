import * as Cesium from 'cesium';
import { getHollarPosition } from '../../utils/GPSCoordinates';

export class HollarBuilding {
  viewer: Cesium.Viewer;
  entity: Cesium.Entity;
  health: number;
  maxHealth: number;
  position: Cesium.Cartesian3;

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
    this.health = 100;
    this.maxHealth = 100;
    this.position = getHollarPosition();

    // Create Hollar building
    this.entity = viewer.entities.add({
      position: this.position,
      box: {
        dimensions: new Cesium.Cartesian3(30, 30, 20),
        material: Cesium.Color.YELLOW.withAlpha(0.9),
        outline: true,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2
      },
      label: {
        text: 'HOLLAR',
        font: 'bold 24px serif',
        fillColor: Cesium.Color.BLACK,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -30)
      }
    });
  }

  takeDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount);
    console.log(`Hollar took ${amount} damage! Health: ${this.health}/${this.maxHealth}`);
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

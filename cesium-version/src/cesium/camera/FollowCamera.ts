import * as Cesium from 'cesium';
import { Aircraft } from '../vehicles/Aircraft';

export class FollowCamera {
  viewer: Cesium.Viewer;
  aircraft: Aircraft;
  offset: Cesium.Cartesian3;
  lerpFactor: number;

  constructor(viewer: Cesium.Viewer, aircraft: Aircraft) {
    this.viewer = viewer;
    this.aircraft = aircraft;
    this.lerpFactor = 0.1;
    
    // Camera offset behind and above aircraft
    this.offset = new Cesium.Cartesian3(-50, 0, 20);
  }

  update(): void {
    const aircraftPos = this.aircraft.getPosition();
    if (!aircraftPos) return;

    const aircraftOrientation = this.aircraft.getOrientation();
    if (!aircraftOrientation) return;

    // Calculate camera position behind aircraft
    const matrix = Cesium.Matrix4.fromRotationTranslation(
      Cesium.Matrix3.fromQuaternion(aircraftOrientation),
      aircraftPos
    );

    const offsetRotated = Cesium.Matrix4.multiplyByPoint(
      matrix,
      this.offset,
      new Cesium.Cartesian3()
    );

    // Smoothly move camera
    const camera = this.viewer.camera;
    const currentPos = camera.position;
    
    // Lerp camera position
    const newPos = new Cesium.Cartesian3();
    Cesium.Cartesian3.lerp(currentPos, offsetRotated, this.lerpFactor, newPos);
    
    // Look at aircraft
    camera.position = newPos;
    camera.lookAt(aircraftPos, new Cesium.Cartesian3(0, 0, 1));
  }
}

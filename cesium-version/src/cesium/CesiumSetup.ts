import * as Cesium from 'cesium';
import { GPS_COORDINATES } from '../utils/GPSCoordinates';

export class CesiumSetup {
  viewer: Cesium.Viewer;

  constructor(containerId: string) {
    // Set Cesium Ion token (use environment variable or default)
    const cesiumToken = import.meta.env.VITE_CESIUM_TOKEN || '';
    if (cesiumToken) {
      Cesium.Ion.defaultAccessToken = cesiumToken;
    }

    // Initialize Cesium Viewer
    this.viewer = new Cesium.Viewer(containerId, {
      terrainProvider: Cesium.createWorldTerrain(),
      imageryProvider: new Cesium.IonImageryProvider({ assetId: 2 }),
      skyBox: new Cesium.SkyBox({
        sources: {
          positiveX: 'https://cesiumjs.org/Cesium/Build/Cesium/Assets/Textures/SkyBox/tycho2t3_80_px.jpg',
          negativeX: 'https://cesiumjs.org/Cesium/Build/Cesium/Assets/Textures/SkyBox/tycho2t3_80_mx.jpg',
          positiveY: 'https://cesiumjs.org/Cesium/Build/Cesium/Assets/Textures/SkyBox/tycho2t3_80_py.jpg',
          negativeY: 'https://cesiumjs.org/Cesium/Build/Cesium/Assets/Textures/SkyBox/tycho2t3_80_my.jpg',
          positiveZ: 'https://cesiumjs.org/Cesium/Build/Cesium/Assets/Textures/SkyBox/tycho2t3_80_pz.jpg',
          negativeZ: 'https://cesiumjs.org/Cesium/Build/Cesium/Assets/Textures/SkyBox/tycho2t3_80_mz.jpg'
        }
      }),
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      animation: false,
      timeline: false,
      fullscreenButton: false,
      vrButton: false,
      infoBox: false,
      selectionIndicator: false,
      shadows: true,
      shouldAnimate: true
    });

    // Configure lighting and atmosphere
    this.viewer.scene.globe.enableLighting = true;
    this.viewer.scene.light = new Cesium.DirectionalLight({
      direction: new Cesium.Cartesian3(0.5, 0.5, -0.8)
    });

    // Set camera over Prague
    this.setCameraOverPrague();

    // Enable depth testing
    this.viewer.scene.globe.depthTestAgainstTerrain = true;
  }

  setCameraOverPrague(): void {
    // Position camera between FSV and Hollar
    const midLat = (GPS_COORDINATES.FSV_JINONICE.latitude + GPS_COORDINATES.HOLLAR.latitude) / 2;
    const midLon = (GPS_COORDINATES.FSV_JINONICE.longitude + GPS_COORDINATES.HOLLAR.longitude) / 2;

    this.viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(midLon, midLat, 5000),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-45),
        roll: 0.0
      }
    });
  }

  getViewer(): Cesium.Viewer {
    return this.viewer;
  }
}

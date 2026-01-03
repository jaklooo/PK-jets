import * as Cesium from 'cesium';

// Prague GPS Coordinates
export const GPS_COORDINATES = {
  FSV_JINONICE: {
    latitude: 50.0475,
    longitude: 14.3928,
    altitude: 300
  },
  HOLLAR: {
    latitude: 50.0894,
    longitude: 14.4181,
    altitude: 300
  },
  PRAGUE_CENTER: {
    latitude: 50.0755,
    longitude: 14.4378,
    altitude: 300
  }
};

// Convert GPS to Cartesian3
export function gpsToCartesian(lat: number, lon: number, alt: number): Cesium.Cartesian3 {
  return Cesium.Cartesian3.fromDegrees(lon, lat, alt);
}

// Get FSV position as Cartesian3
export function getFSVPosition(): Cesium.Cartesian3 {
  return gpsToCartesian(
    GPS_COORDINATES.FSV_JINONICE.latitude,
    GPS_COORDINATES.FSV_JINONICE.longitude,
    GPS_COORDINATES.FSV_JINONICE.altitude
  );
}

// Get Hollar position as Cartesian3
export function getHollarPosition(): Cesium.Cartesian3 {
  return gpsToCartesian(
    GPS_COORDINATES.HOLLAR.latitude,
    GPS_COORDINATES.HOLLAR.longitude,
    GPS_COORDINATES.HOLLAR.altitude
  );
}

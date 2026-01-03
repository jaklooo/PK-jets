import * as Cesium from 'cesium';
import { GAME_CONSTANTS, KeysState } from '../../utils/Types';
import { getFSVPosition } from '../../utils/GPSCoordinates';

export class Aircraft {
  entity: Cesium.Entity;
  viewer: Cesium.Viewer;
  velocity: Cesium.Cartesian3;
  speed: number;
  health: number;
  maxHealth: number;
  keys: KeysState;
  isOnGround: boolean;
  groundSpeed: number;
  takeoffSpeed: number;
  pitch: number;
  yaw: number;
  roll: number;

  constructor(viewer: Cesium.Viewer, keys: KeysState) {
    this.viewer = viewer;
    this.keys = keys;
    this.speed = GAME_CONSTANTS.PLAYER_MIN_SPEED;
    this.health = GAME_CONSTANTS.MAX_HEALTH;
    this.maxHealth = GAME_CONSTANTS.MAX_HEALTH;
    this.velocity = new Cesium.Cartesian3(0, 0, 0);
    this.isOnGround = true;
    this.groundSpeed = 0;
    this.takeoffSpeed = 1.2;
    this.pitch = 0;
    this.yaw = 0;
    this.roll = 0;

    // Create aircraft entity at FSV position (runway)
    const startPosition = getFSVPosition();

    this.entity = viewer.entities.add({
      position: startPosition,
      orientation: Cesium.Transforms.headingPitchRollQuaternion(
        startPosition,
        new Cesium.HeadingPitchRoll(0, 0, 0)
      ),
      model: {
        uri: 'https://raw.githubusercontent.com/CesiumGS/cesium/main/Apps/SampleData/models/CesiumAir/Cesium_Air.glb',
        minimumPixelSize: 64,
        maximumScale: 20,
        scale: 15,
        color: Cesium.Color.RED.withAlpha(0.9)
      }
    });
  }

  update(deltaTime: number): void {
    if (!this.entity.position) return;

    const position = this.entity.position.getValue(Cesium.JulianDate.now());
    if (!position) return;

    // Handle takeoff
    if (this.isOnGround) {
      if (this.keys['w'] || this.keys['W']) {
        this.groundSpeed += GAME_CONSTANTS.PLAYER_ACCELERATION * 2;
        if (this.groundSpeed >= this.takeoffSpeed) {
          this.isOnGround = false;
          this.speed = this.groundSpeed;
          console.log('✈️ Takeoff!');
        }
      } else if (this.keys['s'] || this.keys['S']) {
        this.groundSpeed = Math.max(0, this.groundSpeed - GAME_CONSTANTS.PLAYER_ACCELERATION);
      }
      return; // Don't process flight controls until airborne
    }

    // Flight controls
    // Speed control
    if (this.keys['w'] || this.keys['W']) {
      this.speed += GAME_CONSTANTS.PLAYER_ACCELERATION;
    }
    if (this.keys['s'] || this.keys['S']) {
      this.speed -= GAME_CONSTANTS.PLAYER_ACCELERATION;
    }

    // Turbo boost
    const maxSpeed = this.keys['Shift'] ? GAME_CONSTANTS.PLAYER_TURBO_SPEED : GAME_CONSTANTS.PLAYER_MAX_SPEED;
    this.speed = Cesium.Math.clamp(this.speed, GAME_CONSTANTS.PLAYER_MIN_SPEED, maxSpeed);

    // Turn controls
    if (this.keys['a'] || this.keys['A'] || this.keys['ArrowLeft']) {
      this.yaw += GAME_CONSTANTS.PLAYER_TURN_SPEED;
    }
    if (this.keys['d'] || this.keys['D'] || this.keys['ArrowRight']) {
      this.yaw -= GAME_CONSTANTS.PLAYER_TURN_SPEED;
    }

    // Pitch controls
    if (this.keys['ArrowUp'] || this.keys['q'] || this.keys['Q']) {
      this.pitch += GAME_CONSTANTS.PLAYER_PITCH_SPEED;
    }
    if (this.keys['ArrowDown'] || this.keys['e'] || this.keys['E']) {
      this.pitch -= GAME_CONSTANTS.PLAYER_PITCH_SPEED;
    }

    // Banking when turning
    if (this.keys['a'] || this.keys['A'] || this.keys['ArrowLeft']) {
      this.roll = Math.min(this.roll + GAME_CONSTANTS.PLAYER_ROLL_SPEED, 0.5);
    } else if (this.keys['d'] || this.keys['D'] || this.keys['ArrowRight']) {
      this.roll = Math.max(this.roll - GAME_CONSTANTS.PLAYER_ROLL_SPEED, -0.5);
    } else {
      // Return to level
      this.roll *= 0.9;
    }

    // Clamp pitch
    this.pitch = Cesium.Math.clamp(this.pitch, -Math.PI / 4, Math.PI / 4);

    // Update orientation
    const hpr = new Cesium.HeadingPitchRoll(this.yaw, this.pitch, this.roll);
    const orientation = Cesium.Transforms.headingPitchRollQuaternion(position, hpr);
    this.entity.orientation = new Cesium.ConstantProperty(orientation);

    // Calculate movement direction
    const matrix = Cesium.Matrix4.fromRotationTranslation(
      Cesium.Matrix3.fromQuaternion(orientation as Cesium.Quaternion)
    );
    const forward = new Cesium.Cartesian3(-matrix[8], -matrix[9], -matrix[10]);
    Cesium.Cartesian3.normalize(forward, forward);

    // Move aircraft
    const movement = Cesium.Cartesian3.multiplyByScalar(forward, this.speed, new Cesium.Cartesian3());
    const newPosition = Cesium.Cartesian3.add(position, movement, new Cesium.Cartesian3());

    // Check altitude above terrain
    const cartographic = Cesium.Cartographic.fromCartesian(newPosition);
    const height = cartographic.height;

    // Prevent crashing into terrain
    if (height < 100) {
      cartographic.height = Math.max(height, 100);
      Cesium.Cartographic.toCartesian(cartographic, undefined, newPosition);
    }

    this.entity.position = new Cesium.ConstantPositionProperty(newPosition);
  }

  getPosition(): Cesium.Cartesian3 | undefined {
    return this.entity.position?.getValue(Cesium.JulianDate.now());
  }

  getOrientation(): Cesium.Quaternion | undefined {
    const orientation = this.entity.orientation?.getValue(Cesium.JulianDate.now());
    return orientation as Cesium.Quaternion | undefined;
  }

  takeDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) {
      console.log('💀 Player destroyed!');
    }
  }

  getForwardVector(): Cesium.Cartesian3 {
    const orientation = this.getOrientation();
    if (!orientation) return new Cesium.Cartesian3(0, 0, -1);

    const matrix = Cesium.Matrix4.fromRotationTranslation(
      Cesium.Matrix3.fromQuaternion(orientation)
    );
    return new Cesium.Cartesian3(-matrix[8], -matrix[9], -matrix[10]);
  }
}

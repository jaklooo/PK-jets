import * as Cesium from 'cesium';

export class ExplosionEffect {
  viewer: Cesium.Viewer;

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
  }

  createExplosion(position: Cesium.Cartesian3, scale: number = 1.0): void {
    const particleCount = Math.floor(30 * scale);
    const particles: Cesium.Entity[] = [];

    // Create light flash
    const light = this.viewer.entities.add({
      position: position,
      point: {
        pixelSize: 50 * scale,
        color: Cesium.Color.ORANGE.withAlpha(1.0),
        outlineColor: Cesium.Color.RED,
        outlineWidth: 2
      }
    });

    // Remove light after short duration
    setTimeout(() => {
      this.viewer.entities.remove(light);
    }, 100);

    // Create explosion particles
    for (let i = 0; i < particleCount; i++) {
      const size = (0.3 + Math.random() * 0.5) * scale;
      
      // Color variations
      let color: Cesium.Color;
      let isSmoke = false;
      const rand = Math.random();
      if (rand < 0.3) color = Cesium.Color.fromCssColorString('#ff3300');
      else if (rand < 0.5) color = Cesium.Color.fromCssColorString('#ff6600');
      else if (rand < 0.7) color = Cesium.Color.fromCssColorString('#ffaa00');
      else if (rand < 0.85) color = Cesium.Color.fromCssColorString('#ffff00');
      else {
        color = Cesium.Color.fromCssColorString('#333333');
        isSmoke = true;
      }

      // Random velocity
      const speed = (0.3 + Math.random() * 0.7) * scale;
      const velocity = new Cesium.Cartesian3(
        (Math.random() - 0.5) * speed,
        Math.random() * speed * 0.8,
        (Math.random() - 0.5) * speed
      );

      const particle = this.viewer.entities.add({
        position: position,
        ellipsoid: {
          radii: new Cesium.Cartesian3(size, size, size),
          material: color.withAlpha(1.0)
        }
      });

      particles.push(particle);

      // Animate particle
      this.animateParticle(particle, velocity, isSmoke, 1000);
    }
  }

  private animateParticle(
    particle: Cesium.Entity,
    velocity: Cesium.Cartesian3,
    isSmoke: boolean,
    duration: number
  ): void {
    const startTime = Date.now();
    const gravity = isSmoke ? 0.01 : -0.01;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > duration) {
        this.viewer.entities.remove(particle);
        return;
      }

      const currentPos = particle.position?.getValue(Cesium.JulianDate.now());
      if (!currentPos) return;

      // Update velocity with gravity
      velocity.y += gravity;
      velocity.x *= 0.96;
      velocity.y *= 0.96;
      velocity.z *= 0.96;

      // Move particle
      const newPos = Cesium.Cartesian3.add(currentPos, velocity, new Cesium.Cartesian3());
      particle.position = new Cesium.ConstantPositionProperty(newPos);

      // Fade out
      const alpha = 1 - (elapsed / duration);
      if (particle.ellipsoid && particle.ellipsoid.material) {
        const currentColor = (particle.ellipsoid.material as Cesium.ColorMaterialProperty).color.getValue(Cesium.JulianDate.now());
        if (currentColor) {
          (particle.ellipsoid.material as Cesium.ColorMaterialProperty).color = new Cesium.ConstantProperty(
            currentColor.withAlpha(alpha)
          );
        }
      }

      requestAnimationFrame(animate);
    };

    animate();
  }
}

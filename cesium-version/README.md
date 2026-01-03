# 🚀 PK-jets Cesium - Real 3D Prague Terrain

A **Cesium-powered version** of PK-jets featuring real-world 3D terrain of Prague while preserving all original gameplay mechanics!

## 🎮 About

Fly over real Prague terrain in this advanced 3D flight combat game! Control your fighter jet with realistic physics, defend the FSV UK campus, and destroy the enemy Hollar building - all rendered on actual Prague geography using Cesium's powerful 3D globe engine.

## ✨ Features

- ✅ **Real Prague Terrain** - Actual 3D terrain and imagery of Prague
- ✅ **GPS-Accurate Locations** - FSV Jinonice (50.0475°N, 14.3928°E) and Hollar (50.0894°N, 14.4181°E)
- ✅ **Player Aircraft** - Realistic flight physics with keyboard controls
- ✅ **15 Enemy Aircraft** - 4-state AI (PATROL → ENGAGE → CHASE → EVADE)
- ✅ **6 Ally Aircraft** - Friendly blue planes fighting enemies
- ✅ **Guided Missiles** - Lock-on targeting system with 20 missiles
- ✅ **Bullet Combat** - Yellow (player), Red (enemy), Blue (ally) bullets
- ✅ **24 AA Guns** - Defending Hollar in 3 defensive rings
- ✅ **Two-Phase Mission** - Defend FSV, then destroy Hollar
- ✅ **HUD System** - Health, speed, altitude, position, missiles
- ✅ **Radar Minimap** - 150px radar showing all aircraft
- ✅ **Explosion Effects** - Particle-based explosions with lighting
- ✅ **Third-Person Camera** - Smooth follow camera behind aircraft
- ✅ **TypeScript** - Fully typed, professional code architecture

## 📦 Installation

### Prerequisites

- **Node.js** 18+ and npm
- **Modern browser** (Chrome, Firefox, Edge, Safari)
- **Cesium Ion Token** (free from [cesium.com/ion](https://cesium.com/ion))

### Setup Steps

1. **Clone the repository:**
   ```bash
   cd cesium-version
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Get API tokens:**
   
   **Cesium Ion Token (Required):**
   - Go to [cesium.com/ion/signup](https://cesium.com/ion/signup)
   - Create free account
   - Navigate to "Access Tokens"
   - Copy your default token

4. **Configure environment:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your token:
   ```
   VITE_CESIUM_TOKEN=your_cesium_ion_token_here
   ```

5. **Run development server:**
   ```bash
   npm run dev
   ```

6. **Open browser:**
   ```
   http://localhost:5173
   ```

## 🕹️ Controls

### Flight Controls
| Key | Action |
|-----|--------|
| **W** | Speed up / Accelerate |
| **S** | Slow down / Decelerate |
| **A** or **←** | Turn left |
| **D** or **→** | Turn right |
| **↑** or **Q** | Pitch up (climb) |
| **↓** or **E** | Pitch down (dive) |
| **SHIFT** | Turbo boost (3.0x speed) |

### Combat Controls
| Key | Action |
|-----|--------|
| **SPACE** | Shoot bullets |
| **K** | Launch guided missile (when locked) |

### Tips
- 💡 Hold **W** to accelerate from runway until takeoff
- 💡 Use **SHIFT** for quick maneuvers and escapes
- 💡 Lock missiles on enemies or Hollar building (2 seconds)
- 💡 Stay above 100m altitude to avoid terrain collision
- 💡 Watch AA guns when approaching Hollar!

## 🎯 Mission Objectives

### Phase 1: Defend FSV ⚔️
- **Objective:** Protect FSV UK campus from enemy attacks
- **Threats:** 15 enemy aircraft with AI
- **Support:** 6 friendly blue aircraft
- **FSV Health:** 200 HP
- **Complete:** Destroy all 15 enemies

### Phase 2: Attack Hollar 🎯
- **Objective:** Destroy the Hollar building
- **Target:** Hollar building (100 HP)
- **Defense:** 24 AA guns in 3 rings
- **Strategy:** Use missiles (25 damage each) for efficiency
- **Victory:** Reduce Hollar health to 0

### Defeat Conditions
- ❌ Player health reaches 0
- ❌ FSV campus health reaches 0

## 🏗️ Project Structure

```
cesium-version/
├── package.json              # Dependencies and scripts
├── vite.config.ts           # Vite build configuration
├── tsconfig.json            # TypeScript configuration
├── index.html               # Entry HTML file
├── .env.example             # Environment variables template
├── README.md                # This file
└── src/
    ├── main.ts              # Application entry point
    ├── cesium/
    │   ├── Game.ts                    # Main game loop
    │   ├── CesiumSetup.ts             # Cesium viewer initialization
    │   ├── vehicles/
    │   │   ├── Aircraft.ts            # Player aircraft physics
    │   │   ├── EnemyAircraft.ts       # Enemy planes with AI
    │   │   └── AllyAircraft.ts        # Friendly blue planes
    │   ├── combat/
    │   │   ├── MissileSystem.ts       # Guided missiles
    │   │   ├── BulletSystem.ts        # Bullet shooting
    │   │   ├── AAGunSystem.ts         # 24 AA guns
    │   │   ├── CollisionDetector.ts   # Collision detection
    │   │   └── ExplosionEffect.ts     # Explosion particles
    │   ├── ai/
    │   │   ├── AIController.ts        # AI state machine
    │   │   └── AIStates.ts            # AI state definitions
    │   ├── buildings/
    │   │   ├── FSVCampus.ts           # FSV Jinonice campus
    │   │   ├── HollarBuilding.ts      # Hollar target building
    │   │   └── BuildingManager.ts     # Building health manager
    │   ├── camera/
    │   │   └── FollowCamera.ts        # Third-person camera
    │   └── ui/
    │       ├── HUD.ts                 # Heads-up display
    │       ├── Radar.ts               # Minimap radar
    │       └── MissionStatus.ts       # Mission objectives UI
    └── utils/
        ├── GPSCoordinates.ts          # Prague GPS coordinates
        └── Types.ts                   # TypeScript type definitions
```

## 🔧 Build Commands

```bash
# Development server with hot reload
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## 🎨 Technical Details

### Technologies Used
- **Cesium** 1.112.0 - 3D globe and terrain rendering
- **TypeScript** 5.3.3 - Type-safe JavaScript
- **Vite** 5.0.8 - Fast build tool and dev server
- **vite-plugin-cesium** 1.2.22 - Cesium integration for Vite

### Key Implementation Notes

1. **GPS Coordinates:**
   - FSV Jinonice: `50.0475°N, 14.3928°E`
   - Hollar: `50.0894°N, 14.4181°E`
   - Converted to Cartesian3 via `Cesium.Cartesian3.fromDegrees()`

2. **AI State Machine:**
   - **PATROL:** Fly to waypoints, ignore player
   - **ENGAGE:** Circle player, occasional attacks
   - **CHASE:** Direct pursuit, aggressive shooting
   - **EVADE:** Escape maneuvers when threatened

3. **Missile System:**
   - Lock time: 2 seconds
   - Lock range: 400 units
   - Homing behavior with lerp (0.04 turn speed)
   - Can target enemies AND Hollar building

4. **AA Gun Defense:**
   - 24 guns in 3 rings (4 inner, 8 middle, 12 outer)
   - Range: 350 units
   - Damage: 15 HP per hit
   - Cooldown: 500ms between shots

5. **Collision Detection:**
   - Bullet vs aircraft: < 3 units
   - Missile vs target: < 5 units (aircraft), < 20 units (buildings)
   - Aircraft vs aircraft: < 8-10 units
   - Aircraft vs terrain: < 100m altitude

## 🆚 Comparison with Original Version

| Feature | Original (Three.js) | Cesium Version |
|---------|-------------------|----------------|
| Terrain | Procedural heightmap | Real Prague 3D terrain |
| Coordinates | Arbitrary X/Z grid | GPS coordinates |
| Physics | Same | Same |
| AI System | ✅ | ✅ (Ported) |
| Missiles | ✅ | ✅ (Ported) |
| AA Guns | ✅ | ✅ (Ported) |
| Buildings | Stylized | GPS-accurate |
| Graphics | Three.js renderer | Cesium WebGL |
| File Size | ~1 file | Modular TypeScript |

## 🐛 Troubleshooting

### "Cesium Ion token not found"
- Make sure you created `.env` file with valid token
- Restart dev server after adding token

### Performance issues
- Close other browser tabs
- Lower terrain quality in Cesium settings
- Disable shadows in `CesiumSetup.ts`

### Aircraft not visible
- Check browser console for errors
- Ensure Cesium Ion token is valid
- Try zooming out camera

### Game won't start
- Clear browser cache
- Check browser console (F12) for errors
- Ensure all dependencies installed: `npm install`

## 🚀 Future Enhancements

Potential additions (not included):

- 🌤️ **Dynamic Weather** - Rain, fog, snow effects
- 🌍 **More Cities** - Expand to other European cities
- 🎵 **Sound Effects** - Engine sounds, explosions, gunfire
- 🏆 **Leaderboards** - High score tracking
- 👥 **Multiplayer** - WebSocket-based PvP combat
- 🎨 **Better Models** - GLTF aircraft models
- 📱 **Mobile Support** - Touch controls for tablets
- 🗺️ **Mission Editor** - Create custom missions
- 💾 **Save System** - Progress persistence

## 📝 Development Notes

### Adding New Features

1. **New aircraft type:**
   - Create new class extending base aircraft
   - Add to spawn system in `Game.ts`
   - Update AI controller if needed

2. **New weapons:**
   - Add weapon system in `combat/` directory
   - Integrate with collision detector
   - Update HUD to show ammo

3. **New missions:**
   - Extend `MissionStatus` class
   - Add mission logic to `Game.ts`
   - Create new objectives and win conditions

### Code Style
- Use TypeScript strict mode
- Follow existing naming conventions
- Document complex algorithms
- Keep functions under 50 lines when possible

## 📄 License

This project is open-source and available for educational purposes.

## 🙏 Acknowledgments

- **Cesium** for amazing 3D globe technology
- **Original PK-jets** for game mechanics inspiration
- **Three.js community** for the original implementation

## 🎉 Enjoy Flying!

Take to the skies over Prague and defend the FSV campus! Good luck, pilot! 🛩️✨

---

**Made with ❤️ using Cesium and TypeScript**

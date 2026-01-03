import 'cesium/Build/Cesium/Widgets/widgets.css';
import { Game } from './cesium/Game';

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Initializing PK-jets Cesium version...');
  
  try {
    // Initialize game
    const game = new Game();
    console.log('✅ Game initialized successfully!');
    
    // Make game accessible from console for debugging
    (window as any).game = game;
  } catch (error) {
    console.error('❌ Failed to initialize game:', error);
  }
});

export class MissionStatus {
  element: HTMLElement | null;

  constructor() {
    this.element = document.getElementById('missionStatus');
  }

  show(message: string): void {
    if (this.element) {
      this.element.textContent = message;
      this.element.style.display = 'block';
    }
  }

  hide(): void {
    if (this.element) {
      this.element.style.display = 'none';
    }
  }

  showPhase1(): void {
    this.show('⚔️ Fáza 1: Chráň FSV!');
    setTimeout(() => this.hide(), 3000);
  }

  showPhase2(): void {
    this.show('🎯 Fáza 2: Znič Hollar!');
    setTimeout(() => this.hide(), 3000);
  }

  showVictory(): void {
    this.show('🎉 VÍŤAZSTVO! Hollar zničený!');
  }

  showDefeat(): void {
    this.show('💀 PREHRA! Misie zlyhala!');
  }
}

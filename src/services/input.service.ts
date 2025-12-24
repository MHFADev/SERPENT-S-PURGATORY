import { Injectable, signal, effect } from '@angular/core';

export enum Direction {
  UP, DOWN, LEFT, RIGHT, NONE
}

@Injectable({
  providedIn: 'root'
})
export class InputService {
  currentDirection = signal<Direction>(Direction.NONE);
  lastProcessedDirection = Direction.NONE;
  
  // Mobile detection
  isMobile = signal<boolean>(false);

  // Customization Settings
  controlSize = signal(1.0); // 0.5 to 2.0
  controlOpacity = signal(0.5); // 0.1 to 1.0
  controlXOffset = signal(20); // px from edge
  controlYOffset = signal(20); // px from bottom

  constructor() {
    this.isMobile.set('ontouchstart' in window || navigator.maxTouchPoints > 0);
    window.addEventListener('keydown', (e) => this.handleKey(e));
    this.loadSettings();

    // Auto-save settings
    effect(() => {
        localStorage.setItem('sp_ctrl_size', this.controlSize().toString());
        localStorage.setItem('sp_ctrl_opacity', this.controlOpacity().toString());
        localStorage.setItem('sp_ctrl_x', this.controlXOffset().toString());
        localStorage.setItem('sp_ctrl_y', this.controlYOffset().toString());
    });
  }

  resetSettings() {
      this.controlSize.set(1.0);
      this.controlOpacity.set(0.5);
      this.controlXOffset.set(20);
      this.controlYOffset.set(20);
  }

  private loadSettings() {
      const s = localStorage.getItem('sp_ctrl_size');
      const o = localStorage.getItem('sp_ctrl_opacity');
      const x = localStorage.getItem('sp_ctrl_x');
      const y = localStorage.getItem('sp_ctrl_y');
      if(s) this.controlSize.set(parseFloat(s));
      if(o) this.controlOpacity.set(parseFloat(o));
      if(x) this.controlXOffset.set(parseFloat(x));
      if(y) this.controlYOffset.set(parseFloat(y));
  }

  reset() {
    this.currentDirection.set(Direction.NONE);
    this.lastProcessedDirection = Direction.NONE;
  }

  private handleKey(e: KeyboardEvent) {
    const key = e.key.toLowerCase();
    let newDir = this.currentDirection();

    if (['w', 'arrowup'].includes(key) && this.lastProcessedDirection !== Direction.DOWN) newDir = Direction.UP;
    if (['s', 'arrowdown'].includes(key) && this.lastProcessedDirection !== Direction.UP) newDir = Direction.DOWN;
    if (['a', 'arrowleft'].includes(key) && this.lastProcessedDirection !== Direction.RIGHT) newDir = Direction.LEFT;
    if (['d', 'arrowright'].includes(key) && this.lastProcessedDirection !== Direction.LEFT) newDir = Direction.RIGHT;

    this.currentDirection.set(newDir);
  }

  // Mobile virtual joystick handlers
  handleTouch(dir: Direction) {
    let newDir = this.currentDirection();
    if (dir === Direction.UP && this.lastProcessedDirection !== Direction.DOWN) newDir = Direction.UP;
    if (dir === Direction.DOWN && this.lastProcessedDirection !== Direction.UP) newDir = Direction.DOWN;
    if (dir === Direction.LEFT && this.lastProcessedDirection !== Direction.RIGHT) newDir = Direction.LEFT;
    if (dir === Direction.RIGHT && this.lastProcessedDirection !== Direction.LEFT) newDir = Direction.RIGHT;
    
    this.currentDirection.set(newDir);
  }

  acknowledgeDirection() {
    this.lastProcessedDirection = this.currentDirection();
  }
}
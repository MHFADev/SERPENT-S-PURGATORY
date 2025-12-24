import { Injectable, signal, computed, effect } from '@angular/core';
import { InputService, Direction } from './input.service';
import { RendererService } from './renderer.service';
import { AudioService } from './audio.service';
import { LocalizationService } from './localization.service';

interface Point { x: number; y: number; }
export type GameState = 'MENU' | 'LEVELS' | 'PLAYING' | 'TUTORIAL' | 'SETTINGS' | 'GAMEOVER' | 'WIN';
export type Objective = 'MEAT' | 'KEY' | 'DOOR';
export type HallucinationType = 'NONE' | 'TILT' | 'BREATHE' | 'WARP' | 'DARKNESS';

@Injectable({
  providedIn: 'root'
})
export class GameLogicService {
  // State Signals
  state = signal<GameState>('MENU');
  score = signal(0);
  level = signal(1);
  maxLevel = signal(1);
  sanity = signal(100);
  highScores = signal<Record<number, number>>({});
  
  // Horror States
  jumpscareActive = signal(false); // Full screen overlay
  subliminalActive = signal(false); // Quick flash
  glitchActive = signal(false); // CSS chromatic aberration/invert
  hallucinationEffect = signal<HallucinationType>('NONE'); // Sustained visual effects

  // Horror Settings
  settingSanityFX = signal(true);
  settingRandomScares = signal(true);
  settingGlitchIntensity = signal(1.0); // 0.0 to 2.0

  currentObjective = signal<Objective>('MEAT');
  meatEaten = signal(0);
  meatRequired = signal(5);

  // Game Data
  snake: Point[] = [{x: 10, y: 10}];
  food: Point = {x: 5, y: 5};
  key: Point | null = null;
  door: Point | null = null;
  walls: Point[] = [];
  
  gridWidth = 40; 
  gridHeight = 22;
  
  private lastUpdate = 0;
  private moveInterval = 150; 
  private sanityDecay = 0.05;
  private loopId: number | null = null;
  private heartbeatTimer = 0;

  constructor(
    private input: InputService,
    private renderer: RendererService,
    private audio: AudioService,
    private loc: LocalizationService
  ) {
     const savedMax = localStorage.getItem('snake_horror_max_level');
     if(savedMax) this.maxLevel.set(parseInt(savedMax, 10));

     const savedScores = localStorage.getItem('sp_highscores');
     if(savedScores) {
         try {
             this.highScores.set(JSON.parse(savedScores));
         } catch(e) { console.error('Failed to parse highscores', e); }
     }

     this.loadGameSettings();
     
     effect(() => {
        localStorage.setItem('sp_set_sanity', String(this.settingSanityFX()));
        localStorage.setItem('sp_set_random', String(this.settingRandomScares()));
        localStorage.setItem('sp_set_glitch', String(this.settingGlitchIntensity()));
     });

     effect(() => {
         localStorage.setItem('sp_highscores', JSON.stringify(this.highScores()));
     });
  }

  loadGameSettings() {
      const s = localStorage.getItem('sp_set_sanity');
      if(s !== null) this.settingSanityFX.set(s === 'true');
      
      const r = localStorage.getItem('sp_set_random');
      if(r !== null) this.settingRandomScares.set(r === 'true');
      
      const g = localStorage.getItem('sp_set_glitch');
      if(g !== null) this.settingGlitchIntensity.set(parseFloat(g));
  }

  goToMenu() {
      this.stopLoop();
      this.state.set('MENU');
      this.renderer.clear();
  }

  goToLevels() {
      this.state.set('LEVELS');
  }

  goToTutorial() {
      this.state.set('TUTORIAL');
  }

  goToSettings() {
      this.state.set('SETTINGS');
  }

  selectLevel(lvl: number) {
      if(lvl > this.maxLevel()) return;
      this.level.set(lvl);
      this.startGame();
  }

  startGame() {
    this.resetLevelData();
    this.state.set('PLAYING');
    this.loop();
  }

  private stopLoop() {
    if(this.loopId) {
        cancelAnimationFrame(this.loopId);
        this.loopId = null;
    }
  }

  private resetLevelData() {
    this.snake = [{x: 10, y: 10}, {x:9, y:10}, {x:8, y:10}];
    this.score.set(0);
    this.sanity.set(100);
    this.currentObjective.set('MEAT');
    this.meatEaten.set(0);
    this.meatRequired.set(3 + this.level()); // Harder levels need more meat
    this.key = null;
    this.door = null;
    this.generateLevel();
    this.input.reset();
    this.renderer.reset();
    this.jumpscareActive.set(false);
    this.subliminalActive.set(false);
    this.glitchActive.set(false);
    this.hallucinationEffect.set('NONE');
  }

  private generateLevel() {
    this.walls = [];
    const wallCount = 10 + (this.level() * 3);
    for(let i=0; i<wallCount; i++) {
        this.walls.push({
            x: Math.floor(Math.random() * this.gridWidth),
            y: Math.floor(Math.random() * this.gridHeight)
        });
    }
    this.respawnFood();
  }

  private respawnFood() {
    let valid = false;
    while(!valid) {
        this.food = {
            x: Math.floor(Math.random() * this.gridWidth),
            y: Math.floor(Math.random() * this.gridHeight)
        };
        valid = !this.isSolid(this.food.x, this.food.y);
    }
  }

  private spawnKey() {
      let valid = false;
      while(!valid) {
          this.key = {
              x: Math.floor(Math.random() * this.gridWidth),
              y: Math.floor(Math.random() * this.gridHeight)
          };
          valid = !this.isSolid(this.key.x, this.key.y);
      }
      this.audio.playUnlockSound();
  }

  private spawnDoor() {
      let valid = false;
      while(!valid) {
          this.door = {
              x: Math.floor(Math.random() * this.gridWidth),
              y: Math.floor(Math.random() * this.gridHeight)
          };
          valid = !this.isSolid(this.door.x, this.door.y);
      }
      this.audio.playUnlockSound();
  }

  private isSolid(x: number, y: number): boolean {
    if (this.walls.some(w => w.x === x && w.y === y)) return true;
    if (this.snake.some(s => s.x === x && s.y === y)) return true;
    return false;
  }

  private loop = () => {
    if (this.state() !== 'PLAYING') return;

    const now = performance.now();
    const dt = now - this.lastUpdate;

    if (dt > this.moveInterval) {
      this.update();
      this.lastUpdate = now;
      this.processHorror(now);
    }

    this.renderer.render({
        snake: this.snake,
        food: this.food,
        walls: this.walls,
        key: this.key,
        door: this.door
    });

    this.loopId = requestAnimationFrame(this.loop);
  }

  private processHorror(now: number) {
      const s = this.sanity();
      const intensity = this.settingGlitchIntensity(); // 0 to 2.0
      
      // Decay Sanity
      this.sanity.update(v => Math.max(0, v - this.sanityDecay));

      // 1. Sanity Depletion Effects (Heartbeat) - Independent of Intensity setting, strictly sanity based
      if (this.settingSanityFX()) {
          let hbInterval = 2000;
          if (s < 70) hbInterval = 1000;
          if (s < 40) hbInterval = 600;
          if (s < 20) hbInterval = 400;

          if (s < 80 && now - this.heartbeatTimer > hbInterval) {
              this.audio.playHeartbeat();
              this.heartbeatTimer = now;
          }
      }

      // 2. Hallucinations & Glitches - Dependent on Intensity Setting & Sanity
      if (intensity > 0) {
          const stress = (100 - s) / 100; // 0.0 (Sanity 100) to 1.0 (Sanity 0)
          const probabilityBase = 0.01 * intensity * stress;

          // A. Visual Hallucinations (Sustained effects)
          // Trigger a new sustained effect if none is active and probability hits
          if (this.hallucinationEffect() === 'NONE' && Math.random() < probabilityBase * 0.5) {
               const effects: HallucinationType[] = ['TILT', 'BREATHE', 'WARP', 'DARKNESS'];
               const picked = effects[Math.floor(Math.random() * effects.length)];
               this.triggerHallucination(picked, 2000 + Math.random() * 4000);
          }

          // B. Auditory Hallucinations (Whispers)
          if (Math.random() < probabilityBase * 0.3) {
               this.audio.playWhisper();
          }

          // C. Glitches (Short bursts)
          if (!this.glitchActive() && Math.random() < probabilityBase) {
               this.triggerGlitch();
          }
      }

      // 3. Random Scares (Subliminal)
      if (this.settingRandomScares() && s < 60 && Math.random() < 0.005) { 
          this.triggerSubliminal();
      }

      // Death Jumpscare chance if Sanity hits 0
      if(this.sanity() <= 0 && Math.random() < 0.05) {
          this.triggerJumpscare(true); // Is deadly
      }
  }

  private update() {
    const dir = this.input.currentDirection();
    if (dir === Direction.NONE) return;

    this.input.acknowledgeDirection();
    this.audio.playMoveSound();

    const head = { ...this.snake[0] };
    
    switch(dir) {
        case Direction.UP: head.y--; break;
        case Direction.DOWN: head.y++; break;
        case Direction.LEFT: head.x--; break;
        case Direction.RIGHT: head.x++; break;
    }

    // Death Check
    if (head.x < 0 || head.x >= this.gridWidth || head.y < 0 || head.y >= this.gridHeight || this.isSolid(head.x, head.y)) {
        if (this.door && head.x === this.door.x && head.y === this.door.y) {
            this.winLevel();
            return;
        }

        if(head.x === this.food.x && head.y === this.food.y) {
            // Safe
        } else if (this.key && head.x === this.key.x && head.y === this.key.y) {
            // Safe
        } else {
             this.gameOver();
             return;
        }
    }

    this.snake.unshift(head);

    // Interactions
    if (head.x === this.food.x && head.y === this.food.y) {
        this.handleEatFood(head.x, head.y);
    } else if (this.key && head.x === this.key.x && head.y === this.key.y) {
        this.handleEatKey();
    } else if (this.door && head.x === this.door.x && head.y === this.door.y) {
        this.winLevel();
        return; 
    } else {
        this.snake.pop(); 
    }
  }

  private handleEatFood(x: number, y: number) {
      this.score.update(s => s + 10);
      this.sanity.update(s => Math.min(100, s + 15));
      this.renderer.spawnBlood(x, y);
      this.audio.playEatSound();
      this.meatEaten.update(m => m + 1);

      if (this.currentObjective() === 'MEAT') {
          if (this.meatEaten() >= this.meatRequired()) {
              this.currentObjective.set('KEY');
              this.spawnKey();
              this.respawnFood();
          } else {
              this.respawnFood();
          }
      } else {
          this.respawnFood();
      }
  }

  private handleEatKey() {
      this.key = null;
      this.currentObjective.set('DOOR');
      this.spawnDoor();
      this.audio.playUnlockSound();
      this.score.update(s => s + 50);
  }

  // --- HORROR EFFECTS ---

  private triggerHallucination(type: HallucinationType, duration: number) {
      this.hallucinationEffect.set(type);
      setTimeout(() => {
          if(this.hallucinationEffect() === type) {
              this.hallucinationEffect.set('NONE');
          }
      }, duration);
  }

  private triggerSubliminal() {
      if (this.subliminalActive()) return;
      this.subliminalActive.set(true);
      this.audio.playSuddenNoise(); // Short sharp sound
      setTimeout(() => this.subliminalActive.set(false), 100); // 100ms flash
  }

  private triggerGlitch() {
      this.glitchActive.set(true);
      const duration = 300 + (Math.random() * 500 * this.settingGlitchIntensity());
      setTimeout(() => this.glitchActive.set(false), duration);
  }

  private triggerJumpscare(deadly: boolean = false) {
      if (this.jumpscareActive()) return;
      this.jumpscareActive.set(true);
      this.audio.playScreech();
      setTimeout(() => {
          this.jumpscareActive.set(false);
          if (deadly) {
            this.stopLoop();
            this.state.set('GAMEOVER');
          } else {
              this.sanity.set(50); 
          }
      }, 800);
  }

  private updateHighScore() {
      const currentLvl = this.level();
      const currentScore = this.score();
      const scores = this.highScores();
      
      if (!scores[currentLvl] || currentScore > scores[currentLvl]) {
          this.highScores.update(s => ({...s, [currentLvl]: currentScore}));
      }
  }

  private gameOver() {
    this.stopLoop();
    this.updateHighScore();
    this.triggerJumpscare(true);
  }

  private winLevel() {
      this.stopLoop();
      this.updateHighScore();
      this.state.set('WIN');
      this.audio.playUnlockSound(); 
      if (this.level() === this.maxLevel()) {
          this.maxLevel.update(l => l + 1);
          localStorage.setItem('snake_horror_max_level', this.maxLevel().toString());
      }
  }
}
import { Component, ElementRef, ViewChild, AfterViewInit, inject, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RendererService } from './services/renderer.service';
import { GameLogicService } from './services/game-logic.service';
import { InputService, Direction } from './services/input.service';
import { AudioService } from './services/audio.service';
import { AssetService } from './services/asset.service';
import { LocalizationService } from './services/localization.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrls: []
})
export class AppComponent implements AfterViewInit {
  @ViewChild('gameCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  renderer = inject(RendererService);
  game = inject(GameLogicService);
  input = inject(InputService);
  audio = inject(AudioService);
  assets = inject(AssetService);
  loc = inject(LocalizationService);
  
  Dir = Direction;

  // Level grid generator
  levels = computed(() => {
    return Array.from({length: 20}, (_, i) => i + 1);
  });

  // Safe audio init wrapper
  private safeInitAudio() {
    this.audio.init().catch(err => {
      console.warn('Audio init failed:', err);
    });
  }

  handleStart() {
      this.safeInitAudio();
      this.game.startGame();
  }

  handleGoToLevels() {
      this.safeInitAudio();
      this.game.goToLevels();
  }

  handleGoToSettings() {
      this.safeInitAudio();
      this.game.goToSettings();
  }

  handleGoToTutorial() {
      this.safeInitAudio();
      this.game.goToTutorial();
  }

  ngAfterViewInit() {
    if (this.canvasRef) {
        this.renderer.init(this.canvasRef.nativeElement);
    }
  }

  handleTouch(dir: Direction, event: Event) {
      event.preventDefault();
      event.stopPropagation();
      this.input.handleTouch(dir);
  }

  getGhostImageSrc() {
      const idx = Math.floor(Math.random() * this.assets.ghostImages.length);
      return this.assets.ghostImages[idx]?.src || '';
  }

  getObjectiveText() {
      const obj = this.game.currentObjective();
      switch(obj) {
          case 'MEAT': return `${this.loc.t.OBJ_MEAT} (${this.game.meatEaten()}/${this.game.meatRequired()})`;
          case 'KEY': return this.loc.t.OBJ_KEY;
          case 'DOOR': return this.loc.t.OBJ_DOOR;
      }
  }

  onSettingChange(type: 'size'|'opacity'|'x'|'y', event: Event) {
      const val = parseFloat((event.target as HTMLInputElement).value);
      if(type === 'size') this.input.controlSize.set(val);
      if(type === 'opacity') this.input.controlOpacity.set(val);
      if(type === 'x') this.input.controlXOffset.set(val);
      if(type === 'y') this.input.controlYOffset.set(val);
  }

  onGameSettingChange(type: 'sanity'|'random'|'glitch', event: Event) {
      const target = event.target as HTMLInputElement;
      if (type === 'sanity') this.game.settingSanityFX.set(target.checked);
      if (type === 'random') this.game.settingRandomScares.set(target.checked);
      if (type === 'glitch') this.game.settingGlitchIntensity.set(parseFloat(target.value));
  }
}
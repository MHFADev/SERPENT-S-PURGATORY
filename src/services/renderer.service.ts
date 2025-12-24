import { Injectable, Inject, signal } from '@angular/core';
import { AssetService } from './asset.service';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

@Injectable({
  providedIn: 'root'
})
export class RendererService {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  
  // Optimization: Reusable overlay canvas
  private overlayCanvas: HTMLCanvasElement | null = null;
  private overlayCtx: CanvasRenderingContext2D | null = null;
  
  private particles: Particle[] = [];
  private persistentBlood: {x: number, y: number, r: number}[] = [];
  private width = 0;
  private height = 0;
  private tileSize = 20;

  constructor(private assetService: AssetService) {}

  init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    // Calculate tile size roughly
    this.tileSize = Math.min(this.width / 40, this.height / 22);
    
    // Resize reusable overlay if it exists
    if (this.overlayCanvas) {
        // Overlay is sized to the grid, but we can just make it large enough
        // Ideally we size it dynamically in renderLighting if needed, 
        // but simple full-screen allocation on resize is safer for now.
        // Actually, renderLighting uses 'w' and 'h' based on grid size.
        // Let's defer sizing to usage or just keep it ample.
    }
  }

  clear() {
    // Slightly lighter background clear for visibility
    this.ctx.fillStyle = '#0a0a0a';
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  render(gameState: any) {
    if (!this.ctx) return;

    this.ctx.fillStyle = '#0a0a0a';
    this.ctx.fillRect(0,0,this.width, this.height);

    // Center the grid
    const gridPxW = 40 * this.tileSize;
    const gridPxH = 22 * this.tileSize;
    const offsetX = (this.width - gridPxW) / 2;
    const offsetY = (this.height - gridPxH) / 2;

    this.ctx.save();
    this.ctx.translate(offsetX, offsetY);

    // 1. Draw Floor
    if (this.assetService.floorPattern) {
        const ptrn = this.ctx.createPattern(this.assetService.floorPattern, 'repeat');
        if (ptrn) {
            this.ctx.fillStyle = ptrn;
            this.ctx.fillRect(0, 0, gridPxW, gridPxH);
        }
    }
    
    // Border for play area
    this.ctx.strokeStyle = '#331111';
    this.ctx.strokeRect(0,0, gridPxW, gridPxH);

    // 2. Persistent Blood
    this.ctx.fillStyle = '#660000';
    for (const b of this.persistentBlood) {
        this.ctx.beginPath();
        this.ctx.arc(b.x * this.tileSize, b.y * this.tileSize, b.r, 0, Math.PI * 2);
        this.ctx.fill();
    }

    // 3. Walls
    // Changed color to be even brighter: #773333 with #aa5555 stroke
    this.ctx.fillStyle = '#773333';
    for(const wall of gameState.walls) {
        this.drawBlock(wall.x, wall.y, '#773333', true);
    }

    // 4. Items
    // Food
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = 'red';
    this.drawBlock(gameState.food.x, gameState.food.y, '#ff3333');
    this.ctx.shadowBlur = 0;

    // Key
    if (gameState.key && this.assetService.keyImage) {
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = 'yellow';
        this.ctx.drawImage(this.assetService.keyImage, gameState.key.x * this.tileSize, gameState.key.y * this.tileSize, this.tileSize, this.tileSize);
        this.ctx.shadowBlur = 0;
    }

    // Door
    if (gameState.door && this.assetService.doorImage) {
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = 'white';
        this.ctx.drawImage(this.assetService.doorImage, gameState.door.x * this.tileSize, gameState.door.y * this.tileSize, this.tileSize, this.tileSize);
        this.ctx.shadowBlur = 0;
    }

    // 5. Snake
    gameState.snake.forEach((seg: any, index: number) => {
        const isHead = index === 0;
        this.ctx.fillStyle = isHead ? '#dddddd' : '#994444';
        
        const x = seg.x * this.tileSize;
        const y = seg.y * this.tileSize;
        
        this.ctx.beginPath();
        this.ctx.roundRect(x + 1, y + 1, this.tileSize - 2, this.tileSize - 2, 5);
        this.ctx.fill();

        if (isHead) {
            this.ctx.fillStyle = 'black';
            this.ctx.fillRect(x + 5, y + 5, 4, 4);
            this.ctx.fillRect(x + 12, y + 5, 4, 4);
        }
    });

    // 6. Particles
    this.updateAndDrawParticles();

    // 7. Lighting
    this.renderLighting(gameState.snake[0], gridPxW, gridPxH, gameState.sanity || 100);

    this.ctx.restore();
  }

  private drawBlock(gx: number, gy: number, color: string, isWall = false) {
    const x = gx * this.tileSize;
    const y = gy * this.tileSize;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, this.tileSize, this.tileSize);
    if(isWall) {
       // Brighter stroke for walls to make them distinct
       this.ctx.strokeStyle = '#aa5555';
       this.ctx.lineWidth = 2;
       this.ctx.strokeRect(x+1, y+1, this.tileSize-2, this.tileSize-2);
       this.ctx.lineWidth = 1;
    }
  }

  private updateAndDrawParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.2; 
      p.life -= 0.05;

      if (p.life <= 0) {
        this.persistentBlood.push({x: p.x / this.tileSize, y: p.y / this.tileSize, r: Math.random() * 3});
        if(this.persistentBlood.length > 200) this.persistentBlood.shift();
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(p.x, p.y, 2, 2);
    }
  }

  spawnBlood(x: number, y: number) {
    const screenX = x * this.tileSize + (this.tileSize/2);
    const screenY = y * this.tileSize + (this.tileSize/2);
    
    for (let i = 0; i < 15; i++) {
      this.particles.push({
        x: screenX,
        y: screenY,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5,
        life: 1.0,
        color: Math.random() > 0.5 ? '#990000' : '#ff0000'
      });
    }
  }

  private renderLighting(head: {x: number, y: number}, w: number, h: number, sanity: number) {
    // Ensure reusable overlay
    if (!this.overlayCanvas) {
        this.overlayCanvas = document.createElement('canvas');
        this.overlayCtx = this.overlayCanvas.getContext('2d');
    }
    if (!this.overlayCanvas || !this.overlayCtx) return;

    // Check size match
    if (this.overlayCanvas.width !== w || this.overlayCanvas.height !== h) {
        this.overlayCanvas.width = w;
        this.overlayCanvas.height = h;
    }

    const oCtx = this.overlayCtx;

    // Calculate dynamic lighting variables
    const time = performance.now();
    const stress = (100 - sanity) / 100; // 0.0 (Calm) -> 1.0 (Panic)
    
    // 1. Breathing effect (slow sine wave)
    const breath = Math.sin(time * 0.003); // -1 to 1

    // 2. Flicker effect (random noise, heavily weighted by stress)
    const jitter = (Math.random() - 0.5) * stress * 0.3; // +/- opacity jitter
    
    // Base opacity 0.75 as requested. 
    // It pulses slightly with breath (+/- 0.02)
    // It jitters significantly with stress
    let opacity = 0.75 + (breath * 0.02) + jitter;
    opacity = Math.max(0.5, Math.min(0.95, opacity)); // Clamp safety

    oCtx.globalCompositeOperation = 'source-over';
    oCtx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
    oCtx.fillRect(0, 0, w, h);

    oCtx.globalCompositeOperation = 'destination-out';
    const cx = head.x * this.tileSize + (this.tileSize / 2);
    const cy = head.y * this.tileSize + (this.tileSize / 2);

    // Dynamic Radius
    // Base radius starts at 250, shrinks as you go insane (tunnel vision)
    // Breathing makes it expand/contract slightly (+/- 5px)
    // Stress adds chaotic radius flickering (+/- 20px)
    const baseRadius = 250 - (stress * 50); // 250 -> 200
    const radiusBreath = breath * 5;
    const radiusFlicker = (Math.random() - 0.5) * stress * 40; 
    
    const finalRadius = Math.max(80, baseRadius + radiusBreath + radiusFlicker);

    // Soft gradient edge
    const grad = oCtx.createRadialGradient(cx, cy, 50, cx, cy, finalRadius);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    
    oCtx.fillStyle = grad;
    oCtx.beginPath();
    oCtx.arc(cx, cy, finalRadius, 0, Math.PI*2);
    oCtx.fill();

    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.drawImage(this.overlayCanvas, 0, 0);
  }

  reset() {
      this.particles = [];
      this.persistentBlood = [];
  }
}
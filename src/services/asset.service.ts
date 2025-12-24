import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AssetService {
  public ghostImages: HTMLImageElement[] = [];
  public floorPattern: HTMLCanvasElement | null = null;
  public wallPattern: HTMLCanvasElement | null = null;
  public keyImage: HTMLCanvasElement | null = null;
  public doorImage: HTMLCanvasElement | null = null;

  constructor() {
    this.generateAssets();
  }

  private generateAssets() {
    this.createGhost(1);
    this.createGhost(2);
    this.createFloorTexture();
    this.createWallTexture();
    this.createKeyTexture();
    this.createDoorTexture();
  }

  private createFloorTexture() {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, size, size);
    
    for(let i=0; i<50; i++) {
        ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.5})`;
        ctx.fillRect(Math.random()*size, Math.random()*size, 2, 2);
    }
    
    ctx.strokeStyle = '#222';
    ctx.beginPath();
    for(let i=0; i<5; i++) {
        ctx.moveTo(Math.random()*size, Math.random()*size);
        ctx.lineTo(Math.random()*size, Math.random()*size);
    }
    ctx.stroke();
    
    this.floorPattern = canvas;
  }

  private createWallTexture() {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    ctx.fillStyle = '#110000';
    ctx.fillRect(0, 0, size, size);
    
    ctx.strokeStyle = '#330000';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, size, size);
    ctx.beginPath();
    ctx.moveTo(0, size/2);
    ctx.lineTo(size, size/2);
    ctx.stroke();
    
    this.wallPattern = canvas;
  }

  private createKeyTexture() {
      const size = 20;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;

      // Glow
      const grad = ctx.createRadialGradient(size/2, size/2, 2, size/2, size/2, 10);
      grad.addColorStop(0, '#ffff00');
      grad.addColorStop(1, '#333300');
      
      ctx.fillStyle = grad;
      ctx.beginPath();
      // Simple key shape
      ctx.arc(10, 6, 4, 0, Math.PI * 2);
      ctx.fillRect(8, 10, 4, 8);
      ctx.fillRect(12, 12, 3, 2);
      ctx.fillRect(12, 16, 2, 2);
      ctx.fill();

      this.keyImage = canvas;
  }

  private createDoorTexture() {
      const size = 20;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;

      ctx.fillStyle = '#444';
      ctx.fillRect(2, 2, 16, 16);
      
      // Void center
      ctx.fillStyle = '#000';
      ctx.fillRect(4, 4, 12, 14);

      // Light emitting from door
      const grad = ctx.createLinearGradient(0, 0, 0, 20);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0.2)');
      ctx.fillStyle = grad;
      ctx.fillRect(4, 4, 12, 14);

      this.doorImage = canvas;
  }

  private createGhost(variant: number) {
    let pathData = '';
    
    if (variant === 1) {
        pathData = `
          <path d="M100,20 Q40,50 30,150 Q20,250 100,280 Q180,250 170,150 Q160,50 100,20 Z" fill="#ccc" stroke="none" />
          <path d="M70,100 Q60,120 80,120 Q100,120 90,100 Q80,80 70,100 Z" fill="#000" />
          <path d="M130,100 Q120,120 140,120 Q160,120 150,100 Q140,80 130,100 Z" fill="#000" />
          <path d="M80,180 Q100,250 120,180 Q110,160 90,160 Q80,180 80,180 Z" fill="#000" />
          <path d="M70,120 Q70,150 75,140" stroke="#000" fill="none" stroke-width="2"/>
        `;
    } else {
        pathData = `
           <path d="M100,10 C50,10 10,80 20,150 C30,220 80,290 100,280 C120,290 170,220 180,150 C190,80 150,10 100,10 Z" fill="#ddd" />
           <circle cx="60" cy="110" r="15" fill="#000" />
           <circle cx="140" cy="110" r="10" fill="#000" />
           <path d="M60,200 Q100,150 140,210 Q100,260 60,200" fill="#000" />
           <path d="M60,110 Q50,150 60,160" stroke="#000" stroke-width="1" fill="none" />
           <path d="M140,110 Q150,150 140,160" stroke="#000" stroke-width="1" fill="none" />
        `;
    }

    const svgString = `
      <svg xmlns="http://www.w3.org/2000/svg" width="200" height="300" viewBox="0 0 200 300">
        <defs>
          <filter id="blur${variant}">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1" />
          </filter>
        </defs>
        <g filter="url(#blur${variant})">
          ${pathData}
        </g>
      </svg>
    `;

    const img = new Image();
    img.src = 'data:image/svg+xml;base64,' + btoa(svgString);
    this.ghostImages.push(img);
  }
}
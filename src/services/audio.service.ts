import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted = false;

  constructor() {
    const savedMute = localStorage.getItem('sp_audio_mute');
    this.isMuted = savedMute === 'true';
  }

  async init() {
    if (this.ctx) {
        if (this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }
        return;
    }
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    
    // Apply initial mute state from storage
    this.masterGain.gain.value = this.isMuted ? 0 : 0.5;
    
    this.startAmbientDrone();
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem('sp_audio_mute', String(this.isMuted));

    if(this.masterGain && this.ctx) {
        this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.5, this.ctx.currentTime, 0.1);
    }
  }

  private startAmbientDrone() {
    if (!this.ctx || !this.masterGain) return;

    // 1. Deep Sub Bass (Sine) - Constant presence (Darkness)
    const subOsc = this.ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.value = 35; // Deep rumble
    const subGain = this.ctx.createGain();
    subGain.gain.value = 0.4;
    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start();

    // 2. Eerie Texture (Filtered Sawtooth) - Modulated (Tension)
    const textureOsc = this.ctx.createOscillator();
    textureOsc.type = 'sawtooth';
    textureOsc.frequency.value = 70; 
    
    const textureFilter = this.ctx.createBiquadFilter();
    textureFilter.type = 'lowpass';
    textureFilter.frequency.value = 200;
    textureFilter.Q.value = 1;

    // LFO for filter sweep
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.05; // Very slow cycle (20s)
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 150; // Sweeps range
    
    lfo.connect(lfoGain);
    lfoGain.connect(textureFilter.frequency);
    
    const textureGain = this.ctx.createGain();
    textureGain.gain.value = 0.08;

    textureOsc.connect(textureFilter);
    textureFilter.connect(textureGain);
    textureGain.connect(this.masterGain);
    
    textureOsc.start();
    lfo.start();

    // 3. High Ethereal Whine - Panning (Disorientation)
    const highOsc = this.ctx.createOscillator();
    highOsc.type = 'sine';
    highOsc.frequency.value = 554.37; // C#5 approx
    const highGain = this.ctx.createGain();
    highGain.gain.value = 0.02; // Very quiet background whine
    
    // Pan it slowly left to right
    const panner = this.ctx.createStereoPanner();
    const panLfo = this.ctx.createOscillator();
    panLfo.frequency.value = 0.1;
    const panGain = this.ctx.createGain();
    panGain.gain.value = 0.8;
    
    panLfo.connect(panGain);
    panGain.connect(panner.pan);
    
    highOsc.connect(highGain);
    highGain.connect(panner);
    panner.connect(this.masterGain);
    
    highOsc.start();
    panLfo.start();
  }

  playHeartbeat(rateMultiplier: number = 1) {
      if(!this.ctx || !this.masterGain) return;
      const t = this.ctx.currentTime;
      
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(60, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.8, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.2);
  }

  playSuddenNoise() {
      if(!this.ctx || !this.masterGain) return;
      const t = this.ctx.currentTime;

      // Metallic bang
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(100, t);
      osc.frequency.exponentialRampToValueAtTime(10, t + 0.3);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.8, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

      // Noise burst
      const noise = this.createNoiseBuffer();
      const noiseSrc = this.ctx.createBufferSource();
      noiseSrc.buffer = noise;
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.5, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

      osc.connect(gain);
      gain.connect(this.masterGain);
      
      noiseSrc.connect(noiseGain);
      noiseGain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.3);
      noiseSrc.start(t);
      noiseSrc.stop(t + 0.2);
  }

  playWhisper() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;
    
    // Create noise
    const bufferSize = this.ctx.sampleRate * 1.5; // 1.5 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;

    // Filter to make it sound like a whisper (Bandpass around 1000Hz-2000Hz)
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000 + Math.random() * 1000;
    filter.Q.value = 1;

    // Pan randomly for 3D effect
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = Math.random() * 2 - 1;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.4, t + 0.2);
    gain.gain.linearRampToValueAtTime(0, t + 1.5);

    src.connect(filter);
    filter.connect(panner);
    panner.connect(gain);
    gain.connect(this.masterGain);

    src.start(t);
  }

  playEatSound() {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.1);
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playUnlockSound() {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(880, this.ctx.currentTime + 0.2);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.5);
  }

  playMoveSound() {
    if (!this.ctx || !this.masterGain) return;
    const noiseBuffer = this.createNoiseBuffer();
    const source = this.ctx.createBufferSource();
    source.buffer = noiseBuffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 300;
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
    
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    
    source.start();
    source.stop(this.ctx.currentTime + 0.1);
  }

  playScreech() {
    if (!this.ctx || !this.masterGain) return;
    
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    
    osc1.type = 'sawtooth';
    osc2.type = 'square';
    
    osc1.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc1.frequency.linearRampToValueAtTime(1200, this.ctx.currentTime + 0.3);
    
    osc2.frequency.setValueAtTime(405, this.ctx.currentTime);
    osc2.frequency.linearRampToValueAtTime(1220, this.ctx.currentTime + 0.3);
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.8);
    
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);
    
    osc1.start();
    osc2.start();
    osc1.stop(this.ctx.currentTime + 0.8);
    osc2.stop(this.ctx.currentTime + 0.8);
  }

  private createNoiseBuffer() {
    if(!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * 0.1;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }
}
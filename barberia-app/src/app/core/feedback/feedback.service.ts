import { Injectable } from '@angular/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/** One synthesized note: frequency (Hz), start and length (s) from "now". */
interface Note {
  freq: number;
  at: number;
  length: number;
}

const CONFETTI_COLORS = ['#f2b55e', '#ffc857', '#7fe8ff', '#4cc08c', '#9088f0', '#ffffff', '#ff4d5e'];
const BALLOON_COLORS = ['#f2b55e', '#7fe8ff', '#4cc08c', '#9088f0', '#ff4d5e', '#ffc857'];
/** How long the celebration overlay stays on screen. */
const CELEBRATION_MS = 3600;

interface Confetto {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  angle: number;
  spin: number;
  color: string;
}

/** Barbershop things thrown up from the middle of the screen: pole, scissors, razor, beard, cut, lotion. */
const BARBER_ITEMS = ['💈', '✂️', '🪒', '🧔', '💇‍♂️', '🧴', '💈', '✂️'];

interface BarberItem {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  angle: number;
  spin: number;
  glyph: string;
}

interface Balloon {
  x: number;
  y: number;
  speed: number;
  sway: number;
  phase: number;
  radius: number;
  color: string;
}

/**
 * Feedback for finished actions: sounds (synthesized with the Web Audio API, no audio files),
 * vibration, and a full-screen celebration with confetti and balloons. Everything is best effort:
 * a phone without sound or vibration just skips that part.
 */
@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private audio: AudioContext | null = null;
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /**
   * Wakes the audio engine. Browsers only allow it inside a user gesture, so call it from the touch
   * that starts the action; the sound can then play when the server answers.
   */
  unlockAudio(): void {
    try {
      this.audio ??= new AudioContext();
      if (this.audio.state === 'suspended') void this.audio.resume();
    } catch {
      this.audio = null;
    }
  }

  /** Short bump, e.g. when a held card becomes ready to swipe. */
  tap(): void {
    void Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => undefined);
  }

  /** Rising major arpeggio with a sparkle on top. */
  playSuccess(): void {
    void Haptics.notification({ type: NotificationType.Success }).catch(() => undefined);
    const notes: Note[] = [
      { freq: 523.25, at: 0, length: 0.18 },
      { freq: 659.25, at: 0.09, length: 0.18 },
      { freq: 783.99, at: 0.18, length: 0.2 },
      { freq: 1046.5, at: 0.27, length: 0.45 },
      { freq: 1568, at: 0.36, length: 0.35 },
    ];
    this.play(notes, 'triangle', 0.22);
  }

  /** "Sad trombone": four falling notes, the last one wobbling. */
  playFailure(): void {
    void Haptics.notification({ type: NotificationType.Error }).catch(() => undefined);
    const ctx = this.context();
    if (!ctx) return;
    const now = ctx.currentTime + 0.02;
    const notes: Note[] = [
      { freq: 392, at: 0, length: 0.32 },
      { freq: 369.99, at: 0.34, length: 0.32 },
      { freq: 349.23, at: 0.68, length: 0.32 },
      { freq: 329.63, at: 1.02, length: 0.9 },
    ];
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1100;
    filter.connect(ctx.destination);
    for (const [i, note] of notes.entries()) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(note.freq, now + note.at);
      if (i === notes.length - 1) {
        // Wobble on the last, long note.
        const lfo = ctx.createOscillator();
        const depth = ctx.createGain();
        lfo.frequency.value = 6;
        depth.gain.value = 9;
        lfo.connect(depth).connect(osc.frequency);
        lfo.start(now + note.at);
        lfo.stop(now + note.at + note.length);
      }
      envelope(gain, now + note.at, note.length, 0.16);
      osc.connect(gain).connect(filter);
      osc.start(now + note.at);
      osc.stop(now + note.at + note.length + 0.05);
    }
  }

  /** Big label in the middle of the screen; on success, balloons, barbershop things and confetti around it. */
  celebrate(label: string, mood: 'success' | 'failure'): void {
    const overlay = document.createElement('div');
    overlay.className = `celebration celebration-${mood}`;
    const text = document.createElement('div');
    text.className = 'celebration-label';
    text.textContent = label;
    overlay.appendChild(text);

    if (mood === 'success' && !this.reducedMotion.matches) {
      const canvas = document.createElement('canvas');
      canvas.className = 'celebration-canvas';
      overlay.prepend(canvas);
      document.body.appendChild(overlay);
      runParty(canvas);
    } else {
      document.body.appendChild(overlay);
    }
    setTimeout(() => overlay.remove(), CELEBRATION_MS);
  }

  private play(notes: Note[], type: OscillatorType, volume: number): void {
    const ctx = this.context();
    if (!ctx) return;
    const now = ctx.currentTime + 0.02;
    for (const note of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = note.freq;
      envelope(gain, now + note.at, note.length, volume);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + note.at);
      osc.stop(now + note.at + note.length + 0.05);
    }
  }

  private context(): AudioContext | null {
    this.unlockAudio();
    return this.audio;
  }
}

/** Quick attack, smooth decay: avoids clicks at the start and end of each note. */
function envelope(gain: GainNode, start: number, length: number, volume: number): void {
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
}

/** Confetti shot up from both bottom corners and balloons rising, drawn on one canvas. */
function runParty(canvas: HTMLCanvasElement): void {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(ratio, ratio);

  const pick = <T>(list: T[]) => list[Math.floor(Math.random() * list.length)];
  const confetti: Confetto[] = Array.from({ length: 160 }, (_, i) => {
    const fromLeft = i % 2 === 0;
    const angle = (fromLeft ? -60 : -120) * (Math.PI / 180) + (Math.random() - 0.5) * 0.7;
    const speed = 9 + Math.random() * 9;
    return {
      x: fromLeft ? 0 : width,
      y: height,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed * 1.25,
      size: 6 + Math.random() * 6,
      angle: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.35,
      color: pick(CONFETTI_COLORS),
    };
  });
  const balloonCount = 12;
  const balloons: Balloon[] = Array.from({ length: balloonCount }, (_, i) => ({
    x: ((i + 0.5) / balloonCount) * width + (Math.random() - 0.5) * 30,
    y: height + 40 + Math.random() * 220,
    speed: 3 + Math.random() * 2.2,
    sway: 10 + Math.random() * 16,
    phase: Math.random() * Math.PI * 2,
    radius: 24 + Math.random() * 12,
    color: pick(BALLOON_COLORS),
  }));
  // Burst upward from just under the label, then fall spinning.
  const items: BarberItem[] = Array.from({ length: 22 }, (_, i) => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
    const speed = 8 + Math.random() * 8;
    return {
      x: width / 2,
      y: height / 2 + 30,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 30 + Math.random() * 20,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.2,
      glyph: BARBER_ITEMS[i % BARBER_ITEMS.length],
    };
  });

  const start = performance.now();
  const frame = (now: number) => {
    const t = now - start;
    if (t > CELEBRATION_MS) return;
    ctx.clearRect(0, 0, width, height);
    const fade = t > CELEBRATION_MS - 600 ? (CELEBRATION_MS - t) / 600 : 1;
    ctx.globalAlpha = fade;

    for (const b of balloons) {
      b.y -= b.speed;
      drawBalloon(ctx, b.x + Math.sin(t / 400 + b.phase) * b.sway, b.y, b.radius, b.color);
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const item of items) {
      item.vy += 0.28;
      item.vx *= 0.99;
      item.x += item.vx;
      item.y += item.vy;
      item.angle += item.spin;
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.rotate(item.angle);
      ctx.font = `${item.size}px sans-serif`;
      ctx.fillText(item.glyph, 0, 0);
      ctx.restore();
    }
    for (const c of confetti) {
      c.vy += 0.32;
      c.vx *= 0.985;
      c.vy *= 0.985;
      c.x += c.vx;
      c.y += c.vy;
      c.angle += c.spin;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.angle);
      ctx.fillStyle = c.color;
      // Squashing the width with the angle makes each piece look like it flips in the air.
      ctx.fillRect(-c.size / 2, -c.size / 4, c.size * Math.abs(Math.cos(c.angle * 2)), c.size / 2);
      ctx.restore();
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

function drawBalloon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
  // String.
  ctx.strokeStyle = 'rgba(244, 244, 246, 0.6)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x, y + r * 1.2);
  ctx.quadraticCurveTo(x + 8, y + r * 1.9, x - 4, y + r * 2.8);
  ctx.stroke();
  // Body and knot.
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.85, r * 1.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 4, y + r * 1.2);
  ctx.lineTo(x + 4, y + r * 1.2);
  ctx.lineTo(x, y + r * 1.05);
  ctx.fill();
  // Shine.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.3, y - r * 0.4, r * 0.18, r * 0.3, -0.5, 0, Math.PI * 2);
  ctx.fill();
}

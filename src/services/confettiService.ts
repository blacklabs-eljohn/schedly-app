/**
 * Lightweight, zero-dependency hardware-accelerated Canvas Confetti Engine
 * Smooth 60fps natural 3D paper fluttering celebration bursts
 */

interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  aspectRatio: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  wobble: number;
  wobbleSpeed: number;
  opacity: number;
  decay: number;
  shape: 'rect' | 'circle' | 'ribbon';
}

const CONFETTI_COLORS = [
  '#2563EB', // Schedly Blue
  '#3B82F6', // Sky Blue
  '#10B981', // Emerald Green
  '#34D399', // Mint Teal
  '#F59E0B', // Amber Gold
  '#FBBF24', // Warm Sunlight
  '#EC4899', // Rose Pink
  '#8B5CF6', // Royal Purple
  '#06B6D4'  // Cyan
];

export function triggerTaskConfetti(originX?: number, originY?: number): void {
  if (typeof window === 'undefined') return;

  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '99999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return;
  }

  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  // Center horizontally if originX is near edges or undefined, or anchor right at card center
  const startX = originX !== undefined ? Math.max(30, Math.min(width - 30, originX)) : width / 2;
  const startY = originY !== undefined ? Math.max(40, Math.min(height - 60, originY)) : height * 0.45;

  // More abundant confetti: 100 particles with layered dynamics
  const particleCount = 100;
  const particles: ConfettiParticle[] = [];

  for (let i = 0; i < particleCount; i++) {
    // Wide upward fan (-160 deg to -20 deg) with natural lateral dispersion
    const launchAngle = -Math.PI / 2 + (Math.random() - 0.5) * (Math.PI * 0.85);
    // Multi-tiered launch speed: 50% high arching canopy, 50% gentle hover core
    const isCanopy = i % 2 === 0;
    const launchSpeed = isCanopy ? 6.5 + Math.random() * 7.5 : 3.8 + Math.random() * 4.5;

    const shapes: ('rect' | 'circle' | 'ribbon')[] = ['rect', 'rect', 'ribbon', 'circle'];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    const size = shape === 'ribbon' ? 4 + Math.random() * 3.5 : 5 + Math.random() * 4.5;

    particles.push({
      x: startX + (Math.random() - 0.5) * 30, // slight initial cluster spread around card center
      y: startY + (Math.random() - 0.5) * 10,
      vx: Math.cos(launchAngle) * launchSpeed * (0.85 + Math.random() * 0.3),
      vy: Math.sin(launchAngle) * launchSpeed,
      size,
      aspectRatio: shape === 'ribbon' ? 2.8 : shape === 'rect' ? 1.4 : 1,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 5,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.04 + Math.random() * 0.07,
      opacity: 1,
      decay: 0.0055 + Math.random() * 0.0045, // Smooth ~2.5 - 3.2s lingering float
      shape
    });
  }

  let animationFrameId: number;

  function render() {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    let activeCount = 0;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (p.opacity <= 0) continue;

      activeCount++;

      // Natural physics: gentle gravity + aerodynamic drag + wind flutter
      p.vy += 0.13; // Soft gravity for realistic paper hang-time
      p.vx *= 0.97; // Aerodynamic horizontal drag
      p.vy = Math.min(p.vy, 3.8); // Terminal falling velocity cap for soft flutter

      p.x += p.vx + Math.sin(p.wobble) * 0.85; // Natural swaying in the air
      p.y += p.vy;

      p.wobble += p.wobbleSpeed;
      p.rotation += p.rotationSpeed;

      // Only begin fading after initial burst apex
      if (p.vy > -0.5) {
        p.opacity -= p.decay;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(p.opacity, 0);
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);

      // 3D paper flip perspective simulation
      const flipScaleX = Math.cos(p.wobble);
      ctx.scale(flipScaleX, 1);
      ctx.fillStyle = p.color;

      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'ribbon') {
        ctx.fillRect(-p.size / 2, -(p.size * p.aspectRatio) / 2, p.size, p.size * p.aspectRatio);
      } else {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * p.aspectRatio);
      }

      ctx.restore();
    }

    if (activeCount > 0) {
      animationFrameId = requestAnimationFrame(render);
    } else {
      cancelAnimationFrame(animationFrameId);
      canvas.remove();
    }
  }

  render();
}

import React, { useEffect, useRef } from 'react';

/**
 * Restrained 3D isometric financial intelligence landscape on HTML5 Canvas.
 * Respects prefers-reduced-motion and cleans up animation frames on unmount.
 */
export const CinematicMarketScene: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let rafId = 0;
    let pointerX = 0;
    let pointerY = 0;
    let t = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointerX = ((e.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 18;
      pointerY = ((e.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 12;
    };

    window.addEventListener('resize', resize);
    canvas.addEventListener('mousemove', onMove);

    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      const cx = w * 0.5 + pointerX * 0.6;
      const cy = h * 0.56 + pointerY * 0.6;

      // Subtle atmospheric radial glow (Gold + Emerald)
      const g1 = ctx.createRadialGradient(cx, cy - 30, 10, cx, cy, Math.max(w, h) * 0.52);
      g1.addColorStop(0, 'rgba(201, 169, 110, 0.14)');
      g1.addColorStop(0.45, 'rgba(49, 184, 154, 0.08)');
      g1.addColorStop(1, 'rgba(9, 13, 18, 0)');
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, w, h);

      // 3 stacked isometric glass planes representing Market -> Risk -> Intelligence
      const planes = [
        { offsetY: 54, stroke: 'rgba(113, 128, 145, 0.25)', fill: 'rgba(16, 23, 32, 0.65)' },
        { offsetY: 12, stroke: 'rgba(49, 184, 154, 0.35)', fill: 'rgba(21, 31, 41, 0.72)' },
        { offsetY: -34, stroke: 'rgba(201, 169, 110, 0.45)', fill: 'rgba(25, 37, 48, 0.78)' },
      ];

      planes.forEach((p, idx) => {
        const floatY = reducedMotion ? 0 : Math.sin(t * 0.9 + idx * 1.1) * 4;
        const rx = Math.min(180, w * 0.36);
        const ry = rx * 0.42;
        const py = cy + p.offsetY + floatY;

        ctx.beginPath();
        ctx.moveTo(cx, py - ry);
        ctx.lineTo(cx + rx, py);
        ctx.lineTo(cx, py + ry);
        ctx.lineTo(cx - rx, py);
        ctx.closePath();
        ctx.fillStyle = p.fill;
        ctx.fill();
        ctx.strokeStyle = p.stroke;
        ctx.lineWidth = 1.25;
        ctx.stroke();
      });

      // Floating market curve on top plane
      const pts = 24;
      const spanX = Math.min(240, w * 0.48);
      ctx.beginPath();
      for (let i = 0; i <= pts; i++) {
        const ratio = i / pts;
        const x = cx - spanX / 2 + ratio * spanX;
        const wave = Math.sin(ratio * 5.2 + t * 1.2) * 10 + Math.cos(ratio * 2.8 - t * 0.7) * 6;
        const y = cy - 42 - ratio * 22 + wave;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = '#31B89A';
      ctx.lineWidth = 2.2;
      ctx.stroke();

      // Champagne gold telemetry nodes
      for (let i = 0; i < 4; i++) {
        const angle = t * 0.45 + (i * Math.PI) / 2;
        const nx = cx + Math.cos(angle) * Math.min(140, w * 0.28);
        const ny = cy - 28 + Math.sin(angle) * 32;
        ctx.beginPath();
        ctx.arc(nx, ny, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = i % 2 === 0 ? '#C9A96E' : '#50D6BD';
        ctx.fill();
      }

      if (!reducedMotion) {
        t += 0.016;
        rafId = window.requestAnimationFrame(draw);
      }
    };

    draw();

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', onMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-label="3D Aurivero Financial Intelligence Visualization"
      className="w-full h-64 sm:h-72 rounded-2xl bg-background/60 border border-border/80"
    />
  );
};

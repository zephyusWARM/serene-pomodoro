import React, { useEffect, useRef } from 'react';
import './TimeTraveler.css';

export default function TimeTraveler({ active }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    
    let animationFrameId;
    let stars = [];
    
    // Minimalist time traveler effect parameters
    const numStars = 110;
    let targetSpeed = active ? 4.5 : 0.15;
    let currentSpeed = targetSpeed;
    let isPaused = false;
    
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();
    
    const initStars = () => {
      stars = [];
      for (let i = 0; i < numStars; i++) {
        stars.push({
          x: Math.random() * 2000 - 1000,
          y: Math.random() * 2000 - 1000,
          z: Math.random() * 2000,
          pz: Math.random() * 2000
        });
      }
    };
    initStars();

    let lastTime = performance.now();
    
    const render = (time) => {
      if (document.hidden || isPaused) {
        return;
      }

      let dt = time - lastTime;
      if (dt > 50) dt = 16;
      lastTime = time;

      // Smoothly transition speed between active and paused states
      targetSpeed = active ? 4.5 : 0.12;
      currentSpeed += (targetSpeed - currentSpeed) * 0.03;

      // If speed is effectively zero and we're not active, clear & stop rendering loop
      if (!active && currentSpeed < 0.15) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      stars.forEach(star => {
        star.pz = star.z;
        star.z -= currentSpeed * dt * 0.1;
        
        // Reset star if it passes the viewer
        if (star.z <= 1) {
          star.x = Math.random() * 2000 - 1000;
          star.y = Math.random() * 2000 - 1000;
          star.z = 2000;
          star.pz = 2000;
        }

        // 3D to 2D Projection
        const project = (val, z) => cx + (val / z) * 800;
        const projectY = (val, z) => cy + (val / z) * 800;

        const px = project(star.x, star.z);
        const py = projectY(star.y, star.z);
        const ppx = project(star.x, star.pz);
        const ppy = projectY(star.y, star.pz);
        
        if (star.pz === 2000) return;

        const distCenter = Math.sqrt(Math.pow(px - cx, 2) + Math.pow(py - cy, 2));
        const maxDist = Math.max(cx, cy) * 1.5;
        let opacity = Math.min(1, Math.max(0, (distCenter - 20) / 200));
        opacity *= Math.max(0, 1 - (distCenter / maxDist));
        
        ctx.beginPath();
        ctx.strokeStyle = `rgba(220, 240, 255, ${opacity * (currentSpeed > 1 ? 0.6 : 0.25)})`;
        ctx.lineCap = 'round';
        ctx.lineWidth = Math.max(0.5, (2000 - star.z) / 650);
        ctx.moveTo(ppx, ppy);
        ctx.lineTo(px, py);
        ctx.stroke();
      });
      
      animationFrameId = requestAnimationFrame(render);
    };

    // Optimize battery: pause rendering when window is minimized or hidden in tray
    const handleVisibilityChange = () => {
      if (document.hidden) {
        isPaused = true;
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
      } else {
        isPaused = false;
        lastTime = performance.now();
        animationFrameId = requestAnimationFrame(render);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    animationFrameId = requestAnimationFrame(render);
    
    return () => {
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cancelAnimationFrame(animationFrameId);
    };
  }, [active]);

  return <canvas ref={canvasRef} className="time-traveler" />;
}

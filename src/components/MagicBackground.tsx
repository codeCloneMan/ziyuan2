import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  type: 'star' | 'phoenix' | 'dragon' | 'sea' | 'spark';
  life: number;
  maxLife: number;
  angle?: number;
  rotationSpeed?: number;
}

export default function MagicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>();
  const mouseRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    const resizeCanvas = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const colors = [
      { r: 147, g: 51, b: 234 },
      { r: 59, g: 130, b: 246 },
      { r: 16, g: 185, b: 129 },
      { r: 245, g: 158, b: 11 },
      { r: 239, g: 68, b: 68 },
      { r: 236, g: 72, b: 153 },
    ];

    function createParticle(x?: number, y?: number): Particle {
      const type = (['star', 'phoenix', 'dragon', 'sea', 'spark'] as const)[Math.floor(Math.random() * 5)];
      const colorIndex = Math.floor(Math.random() * colors.length);
      const color = colors[colorIndex];
      
      const baseParticle: Particle = {
        x: x ?? Math.random() * width,
        y: y ?? Math.random() * height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        size: Math.random() * 3 + 1,
        alpha: Math.random() * 0.8 + 0.2,
        color: `rgba(${color.r}, ${color.g}, ${color.b}, `,
        type,
        life: 0,
        maxLife: Math.random() * 200 + 100,
        angle: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.05,
      };

      switch (type) {
        case 'phoenix':
          return {
            ...baseParticle,
            size: Math.random() * 4 + 2,
            vy: -(Math.random() * 2 + 1),
            vx: (Math.random() - 0.5) * 3,
            color: `rgba(239, 68, 68, `,
          };
        case 'dragon':
          return {
            ...baseParticle,
            size: Math.random() * 3 + 2,
            vy: Math.sin(Date.now() * 0.001) * 2,
            vx: Math.cos(Date.now() * 0.001) * 2 + 1,
            color: `rgba(16, 185, 129, `,
          };
        case 'sea':
          return {
            ...baseParticle,
            size: Math.random() * 2 + 1,
            vy: Math.random() * 1.5 + 0.5,
            vx: (Math.random() - 0.5) * 0.5,
            color: `rgba(59, 130, 246, `,
          };
        case 'star':
          return {
            ...baseParticle,
            size: Math.random() * 2.5 + 0.5,
            vy: Math.random() * 0.8 + 0.2,
            color: `rgba(245, 158, 11, `,
          };
        default:
          return baseParticle;
      }
    }

    for (let i = 0; i < 80; i++) {
      particlesRef.current.push(createParticle());
    }

    function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string, alpha: number) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const x = Math.cos(angle) * size;
        const y = Math.sin(angle) * size;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        
        const innerAngle = angle + (2 * Math.PI) / 10;
        const innerX = Math.cos(innerAngle) * (size * 0.4);
        const innerY = Math.sin(innerAngle) * (size * 0.4);
        ctx.lineTo(innerX, innerY);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function drawPhoenixTrail(ctx: CanvasRenderingContext2D, p: Particle) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle || 0);
      ctx.globalAlpha = p.alpha * 0.7;
      
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size * 3);
      gradient.addColorStop(0, p.color + '1)');
      gradient.addColorStop(0.5, p.color + '0.5)');
      gradient.addColorStop(1, p.color + '0)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size * 3, p.size * 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
    }

    function drawDragonScales(ctx: CanvasRenderingContext2D, p: Particle) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.angle || 0) + Math.PI / 4);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color + '0.8)';
      ctx.beginPath();
      ctx.moveTo(0, -p.size);
      ctx.lineTo(p.size, 0);
      ctx.lineTo(0, p.size);
      ctx.lineTo(-p.size, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function drawSeaWave(ctx: CanvasRenderingContext2D, p: Particle) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.globalAlpha = p.alpha * 0.6;
      ctx.strokeStyle = p.color + '0.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-p.size * 2, 0);
      ctx.quadraticCurveTo(-p.size, -p.size, 0, 0);
      ctx.quadraticCurveTo(p.size, -p.size, p.size * 2, 0);
      ctx.stroke();
      ctx.restore();
    }

    function animate() {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, width, height);

      particlesRef.current.forEach((particle, index) => {
        particle.life++;
        particle.x += particle.vx;
        particle.y += particle.vy;
        if (particle.angle !== undefined && particle.rotationSpeed !== undefined) {
          particle.angle += particle.rotationSpeed;
        }

        const lifeRatio = particle.life / particle.maxLife;
        const currentAlpha = particle.alpha * (1 - lifeRatio);

        switch (particle.type) {
          case 'star':
            drawStar(ctx, particle.x, particle.y, particle.size, particle.color, currentAlpha);
            break;
          case 'phoenix':
            drawPhoenixTrail(ctx, particle);
            break;
          case 'dragon':
            drawDragonScales(ctx, particle);
            break;
          case 'sea':
            drawSeaWave(ctx, particle);
            break;
          case 'spark':
            ctx.save();
            ctx.globalAlpha = currentAlpha;
            ctx.fillStyle = particle.color + '1)';
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = particle.color + (currentAlpha * 0.5).toString() + ')';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
            break;
        }

        if (
          particle.life >= particle.maxLife ||
          particle.x < -50 ||
          particle.x > width + 50 ||
          particle.y < -50 ||
          particle.y > height + 50
        ) {
          particlesRef.current[index] = createParticle(
            Math.random() * width,
            Math.random() < 0.5 ? height + 20 : -20
          );
        }
      });

      ctx.save();
      ctx.globalAlpha = 0.03;
      const gradient = ctx.createRadialGradient(
        mouseRef.current.x,
        mouseRef.current.y,
        0,
        mouseRef.current.x,
        mouseRef.current.y,
        150
      );
      gradient.addColorStop(0, 'rgba(147, 51, 234, 0.15)');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();

      animationRef.current = requestAnimationFrame(animate);
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      
      if (Math.random() > 0.85) {
        const newParticle = createParticle(e.clientX, e.clientY);
        newParticle.vx = (Math.random() - 0.5) * 4;
        newParticle.vy = (Math.random() - 0.5) * 4;
        newParticle.size = Math.random() * 3 + 1;
        newParticle.maxLife = 60;
        particlesRef.current.push(newParticle);
        
        if (particlesRef.current.length > 120) {
          particlesRef.current.shift();
        }
      }
    };

    const handleClick = (e: MouseEvent) => {
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const speed = Math.random() * 5 + 3;
        const newParticle = createParticle(e.clientX, e.clientY);
        newParticle.vx = Math.cos(angle) * speed;
        newParticle.vy = Math.sin(angle) * speed;
        newParticle.size = Math.random() * 4 + 2;
        newParticle.maxLife = 80;
        newParticle.type = ['star', 'phoenix', 'dragon'][i % 3];
        particlesRef.current.push(newParticle);
      }
      
      if (particlesRef.current.length > 150) {
        particlesRef.current.splice(0, particlesRef.current.length - 150);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ background: 'transparent' }}
    />
  );
}

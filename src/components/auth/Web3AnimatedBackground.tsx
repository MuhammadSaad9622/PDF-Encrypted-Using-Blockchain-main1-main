import { useEffect, useRef } from 'react';
import { useTheme, getGradientClasses } from '../../utils/theme';

const Web3AnimatedBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const { colorScheme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Color scheme mapping
    const colorMap: Record<string, { primary: string; secondary: string; accent: string }> = {
      'purple-pink': {
        primary: 'rgba(147, 51, 234, 0.3)',
        secondary: 'rgba(236, 72, 153, 0.3)',
        accent: 'rgba(168, 85, 247, 0.5)',
      },
      'blue-purple': {
        primary: 'rgba(37, 99, 235, 0.3)',
        secondary: 'rgba(168, 85, 247, 0.3)',
        accent: 'rgba(59, 130, 246, 0.5)',
      },
      'green-blue': {
        primary: 'rgba(34, 197, 94, 0.3)',
        secondary: 'rgba(59, 130, 246, 0.3)',
        accent: 'rgba(74, 222, 128, 0.5)',
      },
      'orange-red': {
        primary: 'rgba(249, 115, 22, 0.3)',
        secondary: 'rgba(239, 68, 68, 0.3)',
        accent: 'rgba(251, 146, 60, 0.5)',
      },
      'cyan-purple': {
        primary: 'rgba(6, 182, 212, 0.3)',
        secondary: 'rgba(168, 85, 247, 0.3)',
        accent: 'rgba(34, 211, 238, 0.5)',
      },
    };

    const colors = colorMap[colorScheme] || colorMap['purple-pink'];

    // Particle class
    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
      opacity: number;
      pulseSpeed: number;

      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.radius = Math.random() * 3 + 1;
        this.color = Math.random() > 0.5 ? colors.primary : colors.secondary;
        this.opacity = Math.random() * 0.5 + 0.2;
        this.pulseSpeed = Math.random() * 0.02 + 0.01;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        // Wrap around edges
        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;

        // Pulse effect
        this.opacity += this.pulseSpeed;
        if (this.opacity > 0.8 || this.opacity < 0.2) {
          this.pulseSpeed = -this.pulseSpeed;
        }
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color.replace('0.3', this.opacity.toFixed(2));
        ctx.fill();
      }
    }

    // Node class (blockchain nodes)
    class Node {
      x: number;
      y: number;
      radius: number;
      pulsePhase: number;
      connections: Node[];

      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.radius = Math.random() * 4 + 3;
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.connections = [];
      }

      update() {
        this.pulsePhase += 0.02;
      }

      draw() {
        if (!ctx) return;
        const pulse = Math.sin(this.pulsePhase) * 0.3 + 0.7;
        const currentRadius = this.radius * pulse;

        // Draw glow
        const gradient = ctx.createRadialGradient(
          this.x, this.y, 0,
          this.x, this.y, currentRadius * 3
        );
        gradient.addColorStop(0, colors.accent);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, currentRadius * 3, 0, Math.PI * 2);
        ctx.fill();

        // Draw node
        ctx.beginPath();
        ctx.arc(this.x, this.y, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = colors.accent;
        ctx.fill();
      }
    }

    // Create particles and nodes
    const particles: Particle[] = [];
    const nodes: Node[] = [];
    const particleCount = 50;
    const nodeCount = 15;

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    for (let i = 0; i < nodeCount; i++) {
      nodes.push(new Node());
    }

    // Connect nearby nodes (blockchain network effect)
    const connectNodes = () => {
      if (!ctx) return;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 200) {
            const opacity = (1 - distance / 200) * 0.2;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = colors.primary.replace('0.3', opacity.toFixed(2));
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
    };

    // Animated grid pattern
    const drawGrid = () => {
      if (!ctx) return;
      const gridSize = 50;
      const time = Date.now() * 0.0005;
      
      ctx.strokeStyle = colors.primary.replace('0.3', '0.1');
      ctx.lineWidth = 0.5;

      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x + Math.sin(time + x * 0.01) * 2, 0);
        ctx.lineTo(x + Math.sin(time + x * 0.01) * 2, canvas.height);
        ctx.stroke();
      }

      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y + Math.cos(time + y * 0.01) * 2);
        ctx.lineTo(canvas.width, y + Math.cos(time + y * 0.01) * 2);
        ctx.stroke();
      }
    };

    // Animation loop
    const animate = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw grid
      drawGrid();

      // Update and draw particles
      particles.forEach(particle => {
        particle.update();
        particle.draw();
      });

      // Connect nodes
      connectNodes();

      // Update and draw nodes
      nodes.forEach(node => {
        node.update();
        node.draw();
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [colorScheme]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      style={{ background: 'transparent' }}
    />
  );
};

export default Web3AnimatedBackground;


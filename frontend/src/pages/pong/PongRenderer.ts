

import type { PongGameState, PowerUp } from '@/types';

console.log('[RENDERER] PongRenderer.ts loaded - VERSION 3 - CHECK COMPILATION');


export interface PongRendererOptions {
  width?: number;
  height?: number;
  backgroundColor?: string;
  paddleColor?: string;
  ballColor?: string;
  showFPS?: boolean;
}


export class PongRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private options: Required<PongRendererOptions>;
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;
  private fps: number = 0;
  private fpsCounter: number = 0;
  private fpsUpdateTime: number = 0;

  
  private particles: Particle[] = [];

  constructor(canvas: HTMLCanvasElement, options: PongRendererOptions = {}) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D context from canvas');
    }
    this.ctx = ctx;

    this.options = {
      width: 800,
      height: 600,
      backgroundColor: '#111827',
      paddleColor: '#3b82f6',
      ballColor: '#ffffff',
      showFPS: false,
      ...options,
    };

    this.setupCanvas();
  }

  
  private setupCanvas(): void {
    this.canvas.width = this.options.width;
    this.canvas.height = this.options.height;
    this.canvas.style.display = 'block';
  }

  
  start(): void {
    if (this.animationFrameId === null) {
      this.lastFrameTime = performance.now();
      this.fpsUpdateTime = this.lastFrameTime;
      this.animate();
    }
  }

  
  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  
  private animate = (): void => {
    const now = performance.now();
    const deltaTime = (now - this.lastFrameTime) / 1000; 
    this.lastFrameTime = now;

    
    this.fpsCounter++;
    if (now - this.fpsUpdateTime >= 1000) {
      this.fps = this.fpsCounter;
      this.fpsCounter = 0;
      this.fpsUpdateTime = now;
    }

    
    this.updateParticles(deltaTime);

    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  
  render(gameState: PongGameState, playerIds: [number, number]): void {
    this.clear();

    
    this.drawField();

    
    
    const paddleIds = Object.keys(gameState.paddles).map((k) => Number(k));
    const [player1Id, player2Id] = paddleIds.length === 2
      ? (paddleIds[0] < paddleIds[1] ? [paddleIds[0], paddleIds[1]] : [paddleIds[1], paddleIds[0]])
      : (playerIds[0] < playerIds[1] ? [playerIds[0], playerIds[1]] : [playerIds[1], playerIds[0]]);
    const paddle1 = gameState.paddles[player1Id];
    const paddle2 = gameState.paddles[player2Id];

    if (!paddle1 || !paddle2) {
      return; 
    }

    
    const paddleWidth = 10;
    const defaultHeightPercent = 20; 

    
    const paddle1HeightBackend = paddle1.height ?? defaultHeightPercent;
    const paddle2HeightBackend = paddle2.height ?? defaultHeightPercent;
    const paddle1Height = (paddle1HeightBackend / 100) * this.canvas.height;
    const paddle2Height = (paddle2HeightBackend / 100) * this.canvas.height;

    
    const leftPaddleX = 20;
    const rightPaddleX = this.canvas.width - 20 - paddleWidth;

    
    
    const paddle1YCenter = (paddle1.y / 100) * this.canvas.height;
    const paddle2YCenter = (paddle2.y / 100) * this.canvas.height;

    
    if (gameState.activeEffects && gameState.activeEffects.length > 0) {
      gameState.activeEffects.forEach((effect) => {
        const effectType = String(effect.type).toLowerCase();
        const pid = Number((effect as any).playerId);
        if (effectType === 'shield') {
          
          
          console.debug('[SHIELD] render effect for player', pid, {
            leftX: leftPaddleX + paddleWidth + 15,
            rightX: rightPaddleX - 15,
            leftYTop: paddle1YCenter - (paddle1Height / 2) - 10,
            leftYBot: paddle1YCenter + (paddle1Height / 2) + 10,
            rightYTop: paddle2YCenter - (paddle2Height / 2) - 10,
            rightYBot: paddle2YCenter + (paddle2Height / 2) + 10,
            canvasW: this.canvas.width,
            canvasH: this.canvas.height,
          });

          if (pid === player1Id) {
            this.drawShield(leftPaddleX, paddle1YCenter, paddleWidth, paddle1Height, 'left');
            this.drawPaddleGlow(leftPaddleX, paddle1YCenter - (paddle1Height / 2), paddleWidth, paddle1Height, '#00ff00');
          } else if (pid === player2Id) {
            this.drawShield(rightPaddleX, paddle2YCenter, paddleWidth, paddle2Height, 'right');
            this.drawPaddleGlow(rightPaddleX, paddle2YCenter - (paddle2Height / 2), paddleWidth, paddle2Height, '#00ff00');
          }
        }
      });
    }

    
    this.drawPaddle(
      leftPaddleX,
      paddle1YCenter - (paddle1Height / 2),  
      paddleWidth,
      paddle1Height,
      this.options.paddleColor
    );

    this.drawPaddle(
      rightPaddleX,
      paddle2YCenter - (paddle2Height / 2),  
      paddleWidth,
      paddle2Height,
      this.options.paddleColor
    );

    
    const ballRadius = 8;
    
    const ballX = (gameState.ball.x / 100) * this.canvas.width;
    const ballY = (gameState.ball.y / 100) * this.canvas.height;
    this.drawBall(ballX, ballY, ballRadius);

    
    if (gameState.powerUps && gameState.powerUps.length > 0) {
      gameState.powerUps.forEach((powerUp) => {
        
        const powerUpX = (powerUp.x / 100) * this.canvas.width;
        const powerUpY = (powerUp.y / 100) * this.canvas.height;
        this.drawPowerUp({ ...powerUp, x: powerUpX, y: powerUpY });
      });
    }

    
    const score1 = gameState.scores[player1Id] ?? 0;
    const score2 = gameState.scores[player2Id] ?? 0;
    this.drawScore(score1, score2);

    
    this.drawParticles();

    
    if (this.options.showFPS) {
      this.drawFPS();
    }
  }

  
  private clear(): void {
    this.ctx.fillStyle = this.options.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  
  private drawField(): void {
    this.ctx.strokeStyle = '#374151';
    this.ctx.lineWidth = 2;

    
    this.ctx.setLineDash([10, 10]);
    this.ctx.beginPath();
    this.ctx.moveTo(this.canvas.width / 2, 0);
    this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    
    this.ctx.beginPath();
    this.ctx.arc(this.canvas.width / 2, this.canvas.height / 2, 50, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  
  private drawPaddle(
    x: number,
    y: number,
    width: number,
    height: number,
    color: string
  ): void {
    
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 10;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, width, height);
    this.ctx.shadowBlur = 0;

    
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, width, height);
  }

  
  private drawShield(x: number, yCenter: number, width: number, height: number, side: 'left' | 'right'): void {
    
    const y = yCenter - height / 2;

    
    
    
    const shieldX = side === 'left' ? x + width + 15 : x - 15;

    
    this.ctx.strokeStyle = '#00ff00';
    this.ctx.lineWidth = 6;
    this.ctx.shadowColor = '#00ff00';
    this.ctx.shadowBlur = 25;

    
    this.ctx.beginPath();
    this.ctx.moveTo(shieldX, y - 10);
    this.ctx.lineTo(shieldX, y + height + 10);
    this.ctx.stroke();

    
    this.ctx.shadowBlur = 0;
  }

  
  private drawPaddleGlow(x: number, y: number, width: number, height: number, color: string): void {
    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 4;
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 20;
    this.ctx.globalAlpha = 0.6;
    this.ctx.strokeRect(x - 4, y - 4, width + 8, height + 8);
    this.ctx.restore();
  }

  
  private drawBall(x: number, y: number, radius: number): void {
    
    const gradient = this.ctx.createRadialGradient(x - radius / 3, y - radius / 3, 0, x, y, radius);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(1, this.options.ballColor);

    
    this.ctx.shadowColor = '#ffffff';
    this.ctx.shadowBlur = 15;

    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = gradient;
    this.ctx.fill();

    this.ctx.shadowBlur = 0;
  }

  
  private drawPowerUp(powerUp: PowerUp): void {
    const { x, y, type, width } = powerUp;
    
    const size = width ?? 15;

    
    const colors: Record<string, string> = {
      SPEED_BOOST: '#10b981',
      PADDLE_SIZE: '#3b82f6',
      BIG_PADDLE: '#3b82f6',
      big_paddle: '#3b82f6',
      SMALL_PADDLE: '#ef4444',
      MULTI_BALL: '#f59e0b',
      SLOW_MOTION: '#8b5cf6',
      INVISIBLE_BALL: '#6b7280',
      shield: '#fbbf24',
      SHIELD: '#fbbf24',
    };

    const typeKey = type as unknown as string;
    const color = colors[typeKey] || '#ffffff';

    
    const rotation = (Date.now() % 2000) / 2000 * Math.PI * 2;

    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(rotation);

    
    this.ctx.fillStyle = color;
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 15;
    this.ctx.fillRect(-size / 2, -size / 2, size, size);

    
    this.ctx.fillStyle = '#000000';
    this.ctx.font = `${Math.max(10, size * 0.6)}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    const icons: Record<string, string> = {
      SPEED_BOOST: '⚡',
      PADDLE_SIZE: '↕️',
      BIG_PADDLE: '⬆️',
      big_paddle: '⬆️',
      SMALL_PADDLE: '⬇️',
      MULTI_BALL: '●●',
      SLOW_MOTION: '⏱️',
      INVISIBLE_BALL: '👁️',
      shield: '🛡️',
      SHIELD: '🛡️',
    };

    this.ctx.fillText(icons[typeKey] || '?', 0, 0);

    this.ctx.restore();
    this.ctx.shadowBlur = 0;
  }

  
  private drawScore(score1: number, score2: number): void {
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 48px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';

    
    this.ctx.fillText(
      String(score1),
      this.canvas.width / 2 - 100,
      30
    );

    
    this.ctx.fillText(
      String(score2),
      this.canvas.width / 2 + 100,
      30
    );
  }

  
  private drawFPS(): void {
    this.ctx.fillStyle = '#10b981';
    this.ctx.font = '16px monospace';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(`FPS: ${this.fps}`, 10, 10);
  }

  
  createParticles(x: number, y: number, color: string, count: number = 10): void {
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(x, y, color));
    }
  }

  
  private updateParticles(deltaTime: number): void {
    this.particles = this.particles.filter((particle) => {
      particle.update(deltaTime);
      return particle.isAlive();
    });
  }

  
  private drawParticles(): void {
    this.particles.forEach((particle) => {
      particle.draw(this.ctx);
    });
  }

  
  drawMessage(message: string, color: string = '#ffffff'): void {
    this.ctx.fillStyle = color;
    this.ctx.font = 'bold 36px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(message, this.canvas.width / 2, this.canvas.height / 2);
  }

  
  drawCountdown(count: number): void {
    this.clear();
    this.drawField();

    this.ctx.fillStyle = '#3b82f6';
    this.ctx.font = 'bold 120px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    
    const scale = 1 + Math.sin(Date.now() / 100) * 0.1;
    this.ctx.save();
    this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.scale(scale, scale);
    this.ctx.fillText(String(count), 0, 0);
    this.ctx.restore();
  }

  
  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.options.width = width;
    this.options.height = height;
  }

  
  destroy(): void {
    this.stop();
    this.particles = [];
  }
}


class Particle {
  private x: number;
  private y: number;
  private vx: number;
  private vy: number;
  private color: string;
  private life: number;
  private maxLife: number;
  private size: number;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 200;
    this.vy = (Math.random() - 0.5) * 200;
    this.color = color;
    this.maxLife = 1;
    this.life = this.maxLife;
    this.size = Math.random() * 4 + 2;
  }

  update(deltaTime: number): void {
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;
    this.vy += 300 * deltaTime; 
    this.life -= deltaTime;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const alpha = this.life / this.maxLife;
    ctx.fillStyle = this.color;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  isAlive(): boolean {
    return this.life > 0;
  }
}

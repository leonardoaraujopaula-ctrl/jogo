// ===================== CANVAS =====================

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// HUD
const scoreEl = document.getElementById("score");
const waveEl = document.getElementById("wave");
const livesEl = document.getElementById("lives");

// UI
const menu = document.getElementById("menu");
const gameInfo = document.getElementById("gameInfo");
const gameOverScreen = document.getElementById("gameOver");
const finalScore = document.getElementById("finalScore");

// ===================== GAME STATE =====================

let score = 0;
let lives = 3;
let phase = 1;

let gameRunning = false;
let paused = false;

let player;
let bullets = [];
let enemies = [];
let enemyBullets = [];
let particles = [];
let powerUps = [];

let keys = {};

// Powerups
let doubleShot = false;
let doubleShotEnd = 0;

let shield = false;
let shieldEnd = 0;

// Boss
let boss = null;

// Spawn control
let spawnTimeout = null;

// ===================== PLAYER =====================

class Player {
  constructor() {
    this.width = 50;
    this.height = 40;
    this.x = canvas.width / 2;
    this.y = canvas.height - 80;
    this.speed = 6;
  }

  update() {
    if (keys["ArrowLeft"] || keys["a"]) this.x -= this.speed;
    if (keys["ArrowRight"] || keys["d"]) this.x += this.speed;
    if (keys["ArrowUp"] || keys["w"]) this.y -= this.speed;
    if (keys["ArrowDown"] || keys["s"]) this.y += this.speed;

    this.x = Math.max(0, Math.min(canvas.width - this.width, this.x));
    this.y = Math.max(0, Math.min(canvas.height - this.height, this.y));
  }

  draw() {
    ctx.fillStyle = "#00ffff";
    ctx.fillRect(this.x, this.y, this.width, this.height);

    if (shield) {
      ctx.strokeStyle = "#00ffff";
      ctx.beginPath();
      ctx.arc(
        this.x + this.width / 2,
        this.y + this.height / 2,
        35,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }
  }
}

// ===================== BULLET =====================

class Bullet {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 5;
    this.height = 12;
    this.speed = 8;
  }

  update() {
    this.y -= this.speed;
  }

  draw() {
    ctx.fillStyle = "#ffff00";
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

// ===================== ENEMY =====================

class Enemy {
  constructor() {
    this.width = 40;
    this.height = 35;
    this.x = Math.random() * (canvas.width - this.width);
    this.y = -50;
    this.speed = 2 + phase * 0.2;
    this.shootChance = 0.002 + phase * 0.0002;
  }

  update() {
    this.y += this.speed;

    if (Math.random() < this.shootChance) {
      enemyBullets.push(new EnemyBullet(this.x + this.width / 2, this.y));
    }
  }

  draw() {
    ctx.fillStyle = "#ff0066";
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

// ===================== ENEMY BULLET =====================

class EnemyBullet {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 4;
    this.height = 10;
    this.speed = 5;
  }

  update() {
    this.y += this.speed;
  }

  draw() {
    ctx.fillStyle = "#ff4444";
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

// ===================== POWERUP =====================

class PowerUp {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 20;
    this.height = 20;
    this.speed = 2;
  }

  update() {
    this.y += this.speed;
  }

  draw() {
    ctx.fillStyle = "#00ff00";
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

// ===================== PARTICLE =====================

class Particle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 6;
    this.vy = (Math.random() - 0.5) * 6;
    this.life = 30;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life--;
  }

  draw() {
    ctx.fillStyle = "orange";
    ctx.fillRect(this.x, this.y, 3, 3);
  }
}

// ===================== BOSS =====================

class Boss {
  constructor() {
    this.width = 150;
    this.height = 60;
    this.x = canvas.width / 2 - 75;
    this.y = 40;
    this.life = 100 + phase * 20;
    this.speed = 2;
  }

  update() {
    this.x += this.speed;
    if (this.x <= 0 || this.x + this.width >= canvas.width) {
      this.speed *= -1;
    }
  }

  draw() {
    ctx.fillStyle = "#9900ff";
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

// ===================== SPAWN =====================

function spawnEnemy() {
  if (!gameRunning) return;

  enemies.push(new Enemy());

  spawnTimeout = setTimeout(spawnEnemy, Math.max(300, 900 - phase * 50));
}

// ===================== SHOOT =====================

function shoot() {
  if (!gameRunning || !player) return;

  bullets.push(new Bullet(player.x + player.width / 2, player.y));

  if (doubleShot) {
    bullets.push(new Bullet(player.x + 10, player.y));
    bullets.push(new Bullet(player.x + player.width - 10, player.y));
  }
}

// ===================== EXPLOSION =====================

function explode(x, y) {
  for (let i = 0; i < 15; i++) {
    particles.push(new Particle(x, y));
  }
}

// ===================== COLLISIONS =====================

function checkCollisions() {

  for (let i = enemies.length - 1; i >= 0; i--) {
    let e = enemies[i];

    for (let j = bullets.length - 1; j >= 0; j--) {
      let b = bullets[j];

      if (
        b.x < e.x + e.width &&
        b.x + b.width > e.x &&
        b.y < e.y + e.height &&
        b.y + b.height > e.y
      ) {
        explode(e.x, e.y);

        enemies.splice(i, 1);
        bullets.splice(j, 1);

        score += 10;
        scoreEl.textContent = score;

        if (Math.random() < 0.2) {
          powerUps.push(new PowerUp(e.x, e.y));
        }

        break;
      }
    }
  }

  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    let b = enemyBullets[i];

    if (
      b.x < player.x + player.width &&
      b.x + b.width > player.x &&
      b.y < player.y + player.height &&
      b.y + b.height > player.y
    ) {
      enemyBullets.splice(i, 1);

      if (!shield) lives--;

      livesEl.textContent = lives;

      explode(player.x, player.y);

      if (lives <= 0) gameOver();
    }
  }
}

// ===================== UPDATE =====================

function update() {

  player.update();

  bullets.forEach((b, i) => {
    b.update();
    if (b.y < 0) bullets.splice(i, 1);
  });

  enemies.forEach((e, i) => {
    e.update();
    if (e.y > canvas.height) enemies.splice(i, 1);
  });

  enemyBullets.forEach((b, i) => {
    b.update();
    if (b.y > canvas.height) enemyBullets.splice(i, 1);
  });

  particles.forEach((p, i) => {
    p.update();
    if (p.life <= 0) particles.splice(i, 1);
  });

  if (doubleShot && Date.now() > doubleShotEnd) doubleShot = false;
  if (shield && Date.now() > shieldEnd) shield = false;

  if (phase % 5 === 0 && !boss) boss = new Boss();

  if (boss) boss.update();

  checkCollisions();
}

// ===================== DRAW =====================

function draw() {

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  player.draw();

  bullets.forEach(b => b.draw());
  enemies.forEach(e => e.draw());
  enemyBullets.forEach(b => b.draw());
  particles.forEach(p => p.draw());

  if (boss) boss.draw();
}

// ===================== LOOP =====================

function loop() {
  if (!gameRunning) return;

  if (!paused) {
    update();
    draw();
  }

  requestAnimationFrame(loop);
}

// ===================== START =====================

function startGame() {

  clearTimeout(spawnTimeout);

  score = 0;
  lives = 3;
  phase = 1;

  bullets = [];
  enemies = [];
  enemyBullets = [];
  particles = [];
  powerUps = [];

  doubleShot = false;
  shield = false;

  boss = null;

  player = new Player();

  gameRunning = true;
  paused = false;

  menu.style.display = "none";
  gameInfo.style.display = "flex";
  gameOverScreen.style.display = "none";

  spawnEnemy();
  loop();
}

// ===================== GAME OVER =====================

function gameOver() {

  gameRunning = false;

  clearTimeout(spawnTimeout);

  finalScore.textContent = `Score: ${score} | Fase: ${phase}`;

  gameOverScreen.style.display = "block";

  menu.style.display = "none";
  gameInfo.style.display = "none";
}

// ===================== INPUT =====================

window.addEventListener("keydown", (e) => {

  keys[e.key] = true;

  if (e.key === " ") shoot();

  if (e.key.toLowerCase() === "p") paused = !paused;
});

window.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});

// ===================== BUTTONS =====================

document.getElementById("startBtn").onclick = startGame;

document.getElementById("restartBtn").onclick = () => {
  gameOverScreen.style.display = "none";
  startGame();
};
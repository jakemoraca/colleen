const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreLine = document.getElementById("scoreLine");
const gameTitle = document.getElementById("gameTitle");
const controlsList = document.getElementById("controlsList");
const sessionTime = document.getElementById("sessionTime");

const buttonNodes = [...document.querySelectorAll("button[data-game]")];

const keys = new Set();
document.addEventListener("keydown", (event) => {
  keys.add(event.key);
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) {
    event.preventDefault();
  }
});

document.addEventListener("keyup", (event) => {
  keys.delete(event.key);
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const gameConfig = {
  pong: {
    title: "Pong",
    controls: ["W / S: move paddle", "First to 7 points wins", "Space: restart after game over"],
  },
  snake: {
    title: "Snake",
    controls: ["Arrow keys: move snake", "Eat food to grow", "Space: restart after game over"],
  },
  breakout: {
    title: "Breakout",
    controls: ["Arrow keys / A-D: move paddle", "Break all bricks", "Space: restart after game over"],
  },
};

const state = {
  game: "pong",
  startedAt: performance.now(),
  pong: {},
  snake: {},
  breakout: {},
};

function setControls(gameKey) {
  gameTitle.textContent = gameConfig[gameKey].title;
  controlsList.innerHTML = gameConfig[gameKey].controls.map((item) => `<li>${item}</li>`).join("");
  buttonNodes.forEach((btn) => btn.classList.toggle("active", btn.dataset.game === gameKey));
}

buttonNodes.forEach((btn) => {
  btn.addEventListener("click", () => {
    state.game = btn.dataset.game;
    setControls(state.game);
  });
});

function resetPong() {
  state.pong = {
    leftY: canvas.height / 2 - 55,
    rightY: canvas.height / 2 - 55,
    ballX: canvas.width / 2,
    ballY: canvas.height / 2,
    vx: Math.random() > 0.5 ? 5 : -5,
    vy: randInt(-4, 4) || 3,
    leftScore: 0,
    rightScore: 0,
    over: false,
    winner: "",
  };
}

function updatePong() {
  const g = state.pong;
  const paddleH = 110;
  const paddleW = 14;

  if (g.over) {
    if (keys.has(" ")) resetPong();
    return;
  }

  if (keys.has("w") || keys.has("W")) g.leftY -= 8;
  if (keys.has("s") || keys.has("S")) g.leftY += 8;
  g.leftY = clamp(g.leftY, 0, canvas.height - paddleH);

  const aiCenter = g.rightY + paddleH / 2;
  if (g.ballY < aiCenter - 8) g.rightY -= 5;
  if (g.ballY > aiCenter + 8) g.rightY += 5;
  g.rightY = clamp(g.rightY, 0, canvas.height - paddleH);

  g.ballX += g.vx;
  g.ballY += g.vy;

  if (g.ballY <= 8 || g.ballY >= canvas.height - 8) g.vy *= -1;

  const hitsLeft =
    g.ballX - 8 <= 28 + paddleW &&
    g.ballY >= g.leftY &&
    g.ballY <= g.leftY + paddleH;
  const hitsRight =
    g.ballX + 8 >= canvas.width - 28 - paddleW &&
    g.ballY >= g.rightY &&
    g.ballY <= g.rightY + paddleH;

  if (hitsLeft) {
    g.vx = Math.abs(g.vx) + 0.2;
    g.vy += (g.ballY - (g.leftY + paddleH / 2)) * 0.03;
  }
  if (hitsRight) {
    g.vx = -Math.abs(g.vx) - 0.2;
    g.vy += (g.ballY - (g.rightY + paddleH / 2)) * 0.03;
  }

  if (g.ballX < -20) {
    g.rightScore += 1;
    g.ballX = canvas.width / 2;
    g.ballY = canvas.height / 2;
    g.vx = 5;
    g.vy = randInt(-4, 4) || 3;
  }
  if (g.ballX > canvas.width + 20) {
    g.leftScore += 1;
    g.ballX = canvas.width / 2;
    g.ballY = canvas.height / 2;
    g.vx = -5;
    g.vy = randInt(-4, 4) || -3;
  }

  if (g.leftScore >= 7 || g.rightScore >= 7) {
    g.over = true;
    g.winner = g.leftScore > g.rightScore ? "You win!" : "Computer wins!";
  }
}

function drawPong() {
  const g = state.pong;
  const paddleH = 110;
  const paddleW = 14;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#e7eeff";

  for (let y = 0; y < canvas.height; y += 26) {
    ctx.fillRect(canvas.width / 2 - 2, y, 4, 16);
  }

  ctx.fillRect(28, g.leftY, paddleW, paddleH);
  ctx.fillRect(canvas.width - 28 - paddleW, g.rightY, paddleW, paddleH);

  ctx.beginPath();
  ctx.arc(g.ballX, g.ballY, 8, 0, Math.PI * 2);
  ctx.fill();

  scoreLine.textContent = `Score: ${g.leftScore} - ${g.rightScore}`;

  if (g.over) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#59ffa0";
    ctx.font = "700 46px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(g.winner, canvas.width / 2, canvas.height / 2 - 12);
    ctx.font = "600 24px Inter, sans-serif";
    ctx.fillText("Press Space to restart", canvas.width / 2, canvas.height / 2 + 34);
  }
}

function resetSnake() {
  state.snake = {
    grid: 26,
    body: [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ],
    dir: { x: 1, y: 0 },
    queued: { x: 1, y: 0 },
    food: { x: 18, y: 14 },
    tick: 0,
    speed: 9,
    score: 0,
    over: false,
  };
}

function spawnFood(s) {
  const cols = Math.floor(canvas.width / s.grid);
  const rows = Math.floor(canvas.height / s.grid);

  while (true) {
    const next = { x: randInt(0, cols - 1), y: randInt(0, rows - 1) };
    if (!s.body.some((segment) => segment.x === next.x && segment.y === next.y)) {
      s.food = next;
      return;
    }
  }
}

function updateSnake() {
  const s = state.snake;

  if (s.over) {
    if (keys.has(" ")) resetSnake();
    return;
  }

  if (keys.has("ArrowUp") && s.dir.y !== 1) s.queued = { x: 0, y: -1 };
  if (keys.has("ArrowDown") && s.dir.y !== -1) s.queued = { x: 0, y: 1 };
  if (keys.has("ArrowLeft") && s.dir.x !== 1) s.queued = { x: -1, y: 0 };
  if (keys.has("ArrowRight") && s.dir.x !== -1) s.queued = { x: 1, y: 0 };

  s.tick += 1;
  if (s.tick < s.speed) return;
  s.tick = 0;

  s.dir = s.queued;
  const head = {
    x: s.body[0].x + s.dir.x,
    y: s.body[0].y + s.dir.y,
  };

  const cols = Math.floor(canvas.width / s.grid);
  const rows = Math.floor(canvas.height / s.grid);

  if (head.x < 0 || head.y < 0 || head.x >= cols || head.y >= rows) {
    s.over = true;
    return;
  }

  if (s.body.some((segment) => segment.x === head.x && segment.y === head.y)) {
    s.over = true;
    return;
  }

  s.body.unshift(head);

  if (head.x === s.food.x && head.y === s.food.y) {
    s.score += 1;
    s.speed = Math.max(4, s.speed - 0.2);
    spawnFood(s);
  } else {
    s.body.pop();
  }
}

function drawSnake() {
  const s = state.snake;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#132546";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  for (let x = 0; x <= canvas.width; x += s.grid) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= canvas.height; y += s.grid) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  ctx.fillStyle = "#ff7a9f";
  ctx.fillRect(s.food.x * s.grid, s.food.y * s.grid, s.grid, s.grid);

  s.body.forEach((segment, i) => {
    ctx.fillStyle = i === 0 ? "#59ffa0" : "#8dffc5";
    ctx.fillRect(segment.x * s.grid + 1, segment.y * s.grid + 1, s.grid - 2, s.grid - 2);
  });

  scoreLine.textContent = `Score: ${s.score}`;

  if (s.over) {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#59ffa0";
    ctx.font = "700 46px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2 - 12);
    ctx.font = "600 24px Inter, sans-serif";
    ctx.fillText("Press Space to restart", canvas.width / 2, canvas.height / 2 + 34);
  }
}

function resetBreakout() {
  const rows = 6;
  const cols = 12;
  const brickW = canvas.width / cols;
  const brickH = 24;
  const bricks = [];

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      bricks.push({ x: x * brickW + 4, y: y * (brickH + 4) + 44, w: brickW - 8, h: brickH, alive: true });
    }
  }

  state.breakout = {
    paddleX: canvas.width / 2 - 72,
    paddleW: 144,
    ballX: canvas.width / 2,
    ballY: canvas.height - 84,
    vx: 4,
    vy: -4,
    bricks,
    lives: 3,
    score: 0,
    over: false,
    won: false,
  };
}

function updateBreakout() {
  const b = state.breakout;
  if (b.over) {
    if (keys.has(" ")) resetBreakout();
    return;
  }

  if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A")) b.paddleX -= 9;
  if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) b.paddleX += 9;
  b.paddleX = clamp(b.paddleX, 0, canvas.width - b.paddleW);

  b.ballX += b.vx;
  b.ballY += b.vy;

  if (b.ballX <= 8 || b.ballX >= canvas.width - 8) b.vx *= -1;
  if (b.ballY <= 8) b.vy *= -1;

  if (b.ballY >= canvas.height + 10) {
    b.lives -= 1;
    b.ballX = canvas.width / 2;
    b.ballY = canvas.height - 84;
    b.vx = Math.random() > 0.5 ? 4 : -4;
    b.vy = -4;
    if (b.lives <= 0) {
      b.over = true;
      b.won = false;
    }
  }

  const onPaddle =
    b.ballY + 8 >= canvas.height - 26 &&
    b.ballY + 8 <= canvas.height - 14 &&
    b.ballX >= b.paddleX &&
    b.ballX <= b.paddleX + b.paddleW;

  if (onPaddle) {
    const hitPos = (b.ballX - (b.paddleX + b.paddleW / 2)) / (b.paddleW / 2);
    b.vx = hitPos * 6;
    b.vy = -Math.abs(b.vy);
  }

  for (const brick of b.bricks) {
    if (!brick.alive) continue;
    if (b.ballX > brick.x && b.ballX < brick.x + brick.w && b.ballY - 8 < brick.y + brick.h && b.ballY + 8 > brick.y) {
      brick.alive = false;
      b.vy *= -1;
      b.score += 10;
      break;
    }
  }

  if (b.bricks.every((brick) => !brick.alive)) {
    b.over = true;
    b.won = true;
  }
}

function drawBreakout() {
  const b = state.breakout;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, "#101d3a");
  grad.addColorStop(1, "#080f21");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const brick of b.bricks) {
    if (!brick.alive) continue;
    const hue = 190 + ((brick.y / canvas.height) * 120);
    ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;
    ctx.fillRect(brick.x, brick.y, brick.w, brick.h);
  }

  ctx.fillStyle = "#59ffa0";
  ctx.fillRect(b.paddleX, canvas.height - 22, b.paddleW, 10);

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(b.ballX, b.ballY, 8, 0, Math.PI * 2);
  ctx.fill();

  scoreLine.textContent = `Score: ${b.score} • Lives: ${b.lives}`;

  if (b.over) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = b.won ? "#59ffa0" : "#ff789d";
    ctx.font = "700 46px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(b.won ? "Level Cleared!" : "Out of lives", canvas.width / 2, canvas.height / 2 - 12);
    ctx.fillStyle = "#e5ecff";
    ctx.font = "600 24px Inter, sans-serif";
    ctx.fillText("Press Space to restart", canvas.width / 2, canvas.height / 2 + 34);
  }
}

function tickSessionClock() {
  const elapsedSec = Math.floor((performance.now() - state.startedAt) / 1000);
  const mm = String(Math.floor(elapsedSec / 60)).padStart(2, "0");
  const ss = String(elapsedSec % 60).padStart(2, "0");
  sessionTime.textContent = `Session: ${mm}:${ss}`;
}

function gameLoop() {
  tickSessionClock();

  if (state.game === "pong") {
    updatePong();
    drawPong();
  } else if (state.game === "snake") {
    updateSnake();
    drawSnake();
  } else {
    updateBreakout();
    drawBreakout();
  }

  requestAnimationFrame(gameLoop);
}

resetPong();
resetSnake();
resetBreakout();
setControls(state.game);
requestAnimationFrame(gameLoop);

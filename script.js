// ================== DATA SOAL ==================
const QUESTIONS = [
  { q: "Ibu kota Indonesia adalah?", options: ["Jakarta", "Bandung", "Surabaya", "Medan"], correct: 0 },
  { q: "5 + 7 = ?", options: ["10", "11", "12", "13"], correct: 2 },
  { q: "Planet terbesar di tata surya?", options: ["Bumi", "Mars", "Jupiter", "Saturnus"], correct: 2 },
  { q: "Bahasa pemrograman untuk web (selain JS) adalah?", options: ["Python", "PHP", "C++", "Swift"], correct: 1 },
  { q: "1 abad = ... tahun", options: ["10", "50", "100", "1000"], correct: 2 },
  { q: "Hewan yang bertelur dan menyusui adalah?", options: ["Kucing", "Platipus", "Ayam", "Ular"], correct: 1 },
  { q: "HTML adalah singkatan dari?", options: ["Hyper Trainer Marking Language", "HyperText Markup Language", "High Text Machine Language", "Hyper Tool Multi Language"], correct: 1 },
  { q: "9 x 6 = ?", options: ["54", "56", "45", "63"], correct: 0 },
  { q: "Benua terluas di dunia?", options: ["Afrika", "Eropa", "Asia", "Amerika"], correct: 2 },
  { q: "Presiden pertama Indonesia?", options: ["Soeharto", "Soekarno", "Habibie", "Jokowi"], correct: 1 },
];

// ================== SETUP CANVAS ==================
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const GRID = 24;
const CELLS = canvas.width / GRID;

let snake, direction, nextDirection, foods, score, lives, level, gameSpeed;
let currentQuestionIndex, loopId, usedQuestions, combo, particles, highScore;

const COLORS = ["#f87171", "#60a5fa", "#facc15", "#c084fc"]; // A, B, C, D
const LABELS = ["A", "B", "C", "D"];

highScore = parseInt(localStorage.getItem("snakeQuizHighScore") || "0", 10);
document.getElementById("highscore").textContent = highScore;

function initGame() {
  snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
  direction = "RIGHT";
  nextDirection = "RIGHT";
  score = 0;
  lives = 3;
  level = 1;
  combo = 0;
  gameSpeed = 160;
  usedQuestions = [];
  particles = [];
  updateHUD();
  loadNewQuestion();
  if (loopId) clearInterval(loopId);
  loopId = setInterval(gameTick, gameSpeed);
  requestAnimationFrame(renderLoop);
}

function updateHUD() {
  document.getElementById("score").textContent = score;
  document.getElementById("lives").textContent = "❤️".repeat(Math.max(lives, 0)) + "🖤".repeat(3 - lives);
  document.getElementById("level").textContent = level;
  document.getElementById("combo").textContent = combo;
}

function pickQuestion() {
  if (usedQuestions.length >= QUESTIONS.length) usedQuestions = [];
  let idx;
  do { idx = Math.floor(Math.random() * QUESTIONS.length); } while (usedQuestions.includes(idx));
  usedQuestions.push(idx);
  return idx;
}

function loadNewQuestion() {
  currentQuestionIndex = pickQuestion();
  const q = QUESTIONS[currentQuestionIndex];
  document.getElementById("question-text").textContent = q.q;
  placeFoods(q.options.length);
  renderOptionsLegend(q);
}

function renderOptionsLegend(q) {
  const legend = document.getElementById("options-legend");
  legend.innerHTML = "";
  q.options.forEach((opt, i) => {
    const chip = document.createElement("div");
    chip.className = "option-chip";
    chip.innerHTML = `<span class="option-dot" style="background:${COLORS[i]}"></span>${LABELS[i]}. ${opt}`;
    legend.appendChild(chip);
  });
}

function placeFoods(count) {
  foods = [];
  const q = QUESTIONS[currentQuestionIndex];
  const takenCells = new Set(snake.map(s => `${s.x},${s.y}`));

  for (let i = 0; i < count; i++) {
    let pos;
    let attempts = 0;
    do {
      pos = {
        x: Math.floor(Math.random() * CELLS),
        y: Math.floor(Math.random() * CELLS)
      };
      attempts++;
    } while ((takenCells.has(`${pos.x},${pos.y}`) || foods.some(f => f.x === pos.x && f.y === pos.y)) && attempts < 200);

    foods.push({
      x: pos.x,
      y: pos.y,
      label: LABELS[i],
      color: COLORS[i],
      isCorrect: i === q.correct,
      pulse: Math.random() * Math.PI * 2
    });
    takenCells.add(`${pos.x},${pos.y}`);
  }
}

function gameTick() {
  direction = nextDirection;
  const head = { ...snake[0] };

  if (direction === "UP") head.y--;
  if (direction === "DOWN") head.y++;
  if (direction === "LEFT") head.x--;
  if (direction === "RIGHT") head.x++;

  if (head.x < 0 || head.x >= CELLS || head.y < 0 || head.y >= CELLS) {
    return handleWrongHit(true);
  }
  if (snake.some(s => s.x === head.x && s.y === head.y)) {
    return handleWrongHit(true);
  }

  snake.unshift(head);

  const eaten = foods.find(f => f.x === head.x && f.y === head.y);
  if (eaten) {
    if (eaten.isCorrect) {
      combo++;
      const bonus = 10 * level + (combo - 1) * 2;
      score += bonus;
      spawnParticles(eaten.x, eaten.y, "#4ade80");
      if (score > 0 && score % 50 === 0) levelUp();
      updateHUD();
      loadNewQuestion();
    } else {
      handleWrongHit(false, eaten.x, eaten.y);
      snake.pop();
    }
  } else {
    snake.pop();
  }
}

function handleWrongHit(resetSnake, fx, fy) {
  lives--;
  combo = 0;
  updateHUD();
  screenShake();
  flashQuestionBox();
  if (typeof fx === "number") spawnParticles(fx, fy, "#f87171");

  if (lives <= 0) {
    endGame();
    return;
  }
  if (resetSnake) {
    snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    direction = "RIGHT";
    nextDirection = "RIGHT";
  }
}

function levelUp() {
  level++;
  gameSpeed = Math.max(70, gameSpeed - 12);
  clearInterval(loopId);
  loopId = setInterval(gameTick, gameSpeed);
}

function endGame() {
  clearInterval(loopId);
  if (score > highScore) {
    highScore = score;
    localStorage.setItem("snakeQuizHighScore", highScore);
  }
  document.getElementById("highscore").textContent = highScore;
  document.getElementById("overlay-title").textContent = "Game Over";
  document.getElementById("overlay-text").textContent = `Skor akhir kamu: ${score} (Level ${level})`;
  document.getElementById("overlay-highscore").textContent = `🏆 Top Skor: ${highScore}`;
  document.getElementById("overlay").style.display = "flex";
}

// ================== EFEK VISUAL ==================
function screenShake() {
  canvas.classList.remove("shake");
  void canvas.offsetWidth;
  canvas.classList.add("shake");
}

function flashQuestionBox() {
  const box = document.getElementById("question-box");
  box.classList.add("flash-wrong");
  setTimeout(() => box.classList.remove("flash-wrong"), 250);
}

function spawnParticles(cellX, cellY, color) {
  const cx = cellX * GRID + GRID / 2;
  const cy = cellY * GRID + GRID / 2;
  for (let i = 0; i < 14; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 2.5;
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      color
    });
  }
}

function updateParticles() {
  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.04;
  });
  particles = particles.filter(p => p.life > 0);
}

// ================== RENDER LOOP ==================
function renderLoop(timestamp) {
  updateParticles();
  draw(timestamp);
  if (lives > 0) requestAnimationFrame(renderLoop);
}

function draw(timestamp) {
  ctx.fillStyle = "#16213a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(255,255,255,0.03)";
  for (let i = 0; i <= CELLS; i++) {
    ctx.beginPath();
    ctx.moveTo(i * GRID, 0);
    ctx.lineTo(i * GRID, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * GRID);
    ctx.lineTo(canvas.width, i * GRID);
    ctx.stroke();
  }

  // makanan berbentuk ayam (dengan efek pulsing & glow warna per pilihan)
  foods.forEach(f => {
    const pulse = Math.sin((timestamp || 0) / 200 + f.pulse) * 2;
    const cx = f.x * GRID + GRID / 2;
    const cy = f.y * GRID + GRID / 2;
    const fontSize = GRID - 4 + pulse;

    ctx.save();
    ctx.shadowColor = f.color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = f.color;
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.arc(cx, cy, GRID / 2 - 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();

    ctx.font = `${fontSize}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🍗", cx, cy + 1);

    ctx.fillStyle = f.color;
    ctx.beginPath();
    ctx.arc(f.x * GRID + GRID - 4, f.y * GRID + 4, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 8px sans-serif";
    ctx.fillText(f.label, f.x * GRID + GRID - 4, f.y * GRID + 4.5);
  });

  // ular (badan bulat + kepala dengan mata)
  snake.forEach((s, i) => {
    const isHead = i === 0;
    ctx.fillStyle = isHead ? "#4ade80" : `rgba(34, 197, 94, ${1 - i * 0.03})`;
    ctx.beginPath();
    ctx.roundRect(s.x * GRID + 1, s.y * GRID + 1, GRID - 2, GRID - 2, isHead ? 8 : 5);
    ctx.fill();
  });

  if (snake.length) {
    const head = snake[0];
    const cx = head.x * GRID + GRID / 2;
    const cy = head.y * GRID + GRID / 2;
    let eye1 = { x: cx - 5, y: cy - 5 }, eye2 = { x: cx + 5, y: cy - 5 };

    if (direction === "DOWN") { eye1 = { x: cx - 5, y: cy + 5 }; eye2 = { x: cx + 5, y: cy + 5 }; }
    if (direction === "LEFT") { eye1 = { x: cx - 5, y: cy - 5 }; eye2 = { x: cx - 5, y: cy + 5 }; }
    if (direction === "RIGHT") { eye1 = { x: cx + 5, y: cy - 5 }; eye2 = { x: cx + 5, y: cy + 5 }; }

    ctx.fillStyle = "#0f172a";
    [eye1, eye2].forEach(e => {
      ctx.beginPath();
      ctx.arc(e.x, e.y, 2, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  particles.forEach(p => {
    ctx.globalAlpha = Math.max(p.life, 0);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

// ================== KONTROL ==================
document.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  if ((key === "arrowup" || key === "w") && direction !== "DOWN") nextDirection = "UP";
  if ((key === "arrowdown" || key === "s") && direction !== "UP") nextDirection = "DOWN";
  if ((key === "arrowleft" || key === "a") && direction !== "RIGHT") nextDirection = "LEFT";
  if ((key === "arrowright" || key === "d") && direction !== "LEFT") nextDirection = "RIGHT";
});

document.getElementById("up").addEventListener("click", () => { if (direction !== "DOWN") nextDirection = "UP"; });
document.getElementById("down").addEventListener("click", () => { if (direction !== "UP") nextDirection = "DOWN"; });
document.getElementById("left").addEventListener("click", () => { if (direction !== "RIGHT") nextDirection = "LEFT"; });
document.getElementById("right").addEventListener("click", () => { if (direction !== "LEFT") nextDirection = "RIGHT"; });

document.getElementById("restart-btn").addEventListener("click", () => {
  document.getElementById("overlay").style.display = "none";
  startWithCountdown();
});

document.getElementById("start-btn").addEventListener("click", () => {
  document.getElementById("start-overlay").style.display = "none";
  startWithCountdown();
});

function startWithCountdown() {
  const el = document.getElementById("countdown");
  el.style.display = "flex";
  let n = 3;
  el.textContent = n;
  const iv = setInterval(() => {
    n--;
    if (n > 0) {
      el.textContent = n;
    } else {
      clearInterval(iv);
      el.style.display = "none";
      initGame();
    }
  }, 700);
}

ctx.fillStyle = "#16213a";
ctx.fillRect(0, 0, canvas.width, canvas.height);
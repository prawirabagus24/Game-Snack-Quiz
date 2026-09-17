// ================== DATA SOAL — IPA SD (10 SOAL) ==================
const QUESTIONS = [
  { q: "Tumbuhan membuat makanannya sendiri melalui proses yang disebut?", options: ["Respirasi", "Fotosintesis", "Fermentasi", "Evaporasi"], correct: 1 },
  { q: "Bagian tumbuhan yang berfungsi menyerap air dan mineral dari tanah adalah?", options: ["Daun", "Batang", "Akar", "Bunga"], correct: 2 },
  { q: "Hewan yang berkembang biak dengan cara bertelur disebut?", options: ["Ovipar", "Vivipar", "Ovovivipar", "Membelah diri"], correct: 0 },
  { q: "Sumber energi utama bagi kehidupan di Bumi adalah?", options: ["Bulan", "Matahari", "Angin", "Air"], correct: 1 },
  { q: "Perubahan wujud air dari cair menjadi gas disebut?", options: ["Membeku", "Mencair", "Menguap", "Mengembun"], correct: 2 },
  { q: "Organ tubuh manusia yang berfungsi memompa darah adalah?", options: ["Paru-paru", "Ginjal", "Hati", "Jantung"], correct: 3 },
  { q: "Gas yang dibutuhkan manusia untuk bernapas adalah?", options: ["Karbon dioksida", "Oksigen", "Nitrogen", "Hidrogen"], correct: 1 },
  { q: "Hewan yang bisa hidup di darat dan di air disebut?", options: ["Mamalia", "Reptil", "Amfibi", "Unggas"], correct: 2 },
  { q: "Bagian tumbuhan tempat terjadinya fotosintesis adalah?", options: ["Akar", "Batang", "Daun", "Biji"], correct: 2 },
  { q: "Jatuhnya air hujan ke Bumi merupakan bagian dari peristiwa?", options: ["Daur air", "Rantai makanan", "Fotosintesis", "Gaya gravitasi"], correct: 0 },
];

// Pesan semangat yang muncul acak saat jawaban benar
const PRAISE_MESSAGES = ["Hebat! 🎉", "Pintar sekali! 👏", "Betul! ✨", "Keren! 🌟", "Mantap! 💪", "Jawaban Tepat! 🎯"];

// ================== SETUP CANVAS ==================
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const GRID = 24;
const CELLS = canvas.width / GRID;

let snake, direction, nextDirection, foods, score, lives, level, gameSpeed;
let currentQuestionIndex, loopId, usedQuestions, combo, particles, floatingTexts, highScore;

const COLORS = ["#f87171", "#60a5fa", "#facc15", "#c084fc"]; // A, B, C, D
const LABELS = ["A", "B", "C", "D"];
const CONFETTI_COLORS = ["#4ade80", "#facc15", "#60a5fa", "#f87171", "#c084fc", "#fb923c"];

// ---- Pengaturan kecepatan ular (lebih tinggi = lebih lambat) ----
const START_SPEED = 260;
const MIN_SPEED = 180;
const SPEED_STEP = 4;

highScore = parseInt(localStorage.getItem("snakeQuizHighScore") || "0", 10);
document.getElementById("highscore").textContent = highScore;

// ================== EFEK SUARA (dibuat langsung lewat kode, tanpa file audio) ==================
let audioCtx;
function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function playTone(freq, duration, type = "sine", volume = 0.2, delay = 0) {
  try {
    const ac = getAudioCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(ac.destination);
    const startTime = ac.currentTime + delay;
    osc.start(startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    osc.stop(startTime + duration);
  } catch (e) {}
}

function sfxCorrect() {
  playTone(880, 0.12, "sine", 0.25);
  playTone(1320, 0.15, "sine", 0.22, 0.1);
}
function sfxWrong() {
  playTone(220, 0.28, "sawtooth", 0.25);
}
function sfxLevelUp() {
  playTone(600, 0.1, "square", 0.2);
  playTone(900, 0.15, "square", 0.2, 0.1);
  playTone(1200, 0.2, "square", 0.2, 0.2);
}
function sfxGameOver() {
  playTone(300, 0.35, "triangle", 0.25);
  playTone(150, 0.5, "triangle", 0.25, 0.2);
}
function sfxStart() {
  playTone(440, 0.08, "square", 0.15);
}

function initGame() {
  snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
  direction = "RIGHT";
  nextDirection = "RIGHT";
  score = 0;
  lives = 3;
  level = 1;
  combo = 0;
  gameSpeed = START_SPEED;
  usedQuestions = [];
  particles = [];
  floatingTexts = [];
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
      sfxCorrect();
      spawnConfetti(eaten.x, eaten.y);
      spawnFloatingText(eaten.x, eaten.y, `+${bonus}`, "#facc15");
      showPraiseToast();
      if (score > 0 && score % 50 === 0) levelUp();
      updateHUD();
      loadNewQuestion();
    } else {
      foods = foods.filter(f => f !== eaten);
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
  sfxWrong();
  if (typeof fx === "number") {
    spawnParticles(fx, fy, "#f87171");
    spawnFloatingText(fx, fy, "Oops!", "#f87171");
  }

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
  gameSpeed = Math.max(MIN_SPEED, gameSpeed - SPEED_STEP);
  clearInterval(loopId);
  loopId = setInterval(gameTick, gameSpeed);
  sfxLevelUp();
  showLevelUpBanner();
}

function endGame() {
  clearInterval(loopId);
  sfxGameOver();
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

// ================== EFEK VISUAL (ANIMASI) ==================
function screenShake() {
  canvas.classList.remove("shake");
  void canvas.offsetWidth;
  canvas.classList.add("shake");
}

function flashQuestionBox() {
  const box = document.getElementById("question-box");
  box.classList.remove("flash-wrong");
  void box.offsetWidth;
  box.classList.add("flash-wrong");
  setTimeout(() => box.classList.remove("flash-wrong"), 300);
}

function showLevelUpBanner() {
  const el = document.getElementById("levelup-banner");
  el.classList.remove("show");
  void el.offsetWidth;
  el.classList.add("show");
}

function showPraiseToast() {
  const el = document.getElementById("praise-toast");
  el.textContent = PRAISE_MESSAGES[Math.floor(Math.random() * PRAISE_MESSAGES.length)];
  el.classList.remove("show");
  void el.offsetWidth;
  el.classList.add("show");
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
      color,
      size: 3
    });
  }
}

// Confetti warna-warni & bentuk kotak kecil biar terasa meriah untuk anak-anak
function spawnConfetti(cellX, cellY) {
  const cx = cellX * GRID + GRID / 2;
  const cy = cellY * GRID + GRID / 2;
  for (let i = 0; i < 22; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 3.5;
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      life: 1,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 2 + Math.random() * 3,
      rot: Math.random() * Math.PI,
      rotSpeed: (Math.random() - 0.5) * 0.4,
      gravity: 0.08
    });
  }
}

function spawnFloatingText(cellX, cellY, text, color) {
  floatingTexts.push({
    x: cellX * GRID + GRID / 2,
    y: cellY * GRID + GRID / 2,
    text,
    color,
    life: 1
  });
}

function updateParticles() {
  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    if (p.gravity) p.vy += p.gravity;
    if (p.rot !== undefined) p.rot += p.rotSpeed;
    p.life -= 0.035;
  });
  particles = particles.filter(p => p.life > 0);

  floatingTexts.forEach(t => {
    t.y -= 0.6;
    t.life -= 0.02;
  });
  floatingTexts = floatingTexts.filter(t => t.life > 0);
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

  // ular (badan bulat + kepala dengan mata yang sesekali berkedip)
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

    // kedipan mata setiap ~3 detik biar ular terasa "hidup"
    const blink = ((timestamp || 0) % 3000) > 2900;
    ctx.fillStyle = "#0f172a";
    [eye1, eye2].forEach(e => {
      ctx.beginPath();
      if (blink) {
        ctx.fillRect(e.x - 2, e.y - 0.5, 4, 1);
      } else {
        ctx.arc(e.x, e.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  // partikel biasa (efek jawaban salah)
  particles.filter(p => p.rot === undefined).forEach(p => {
    ctx.globalAlpha = Math.max(p.life, 0);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size || 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });

  // confetti (efek jawaban benar, kotak kecil berputar warna-warni)
  particles.filter(p => p.rot !== undefined).forEach(p => {
    ctx.save();
    ctx.globalAlpha = Math.max(p.life, 0);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.size, -p.size / 2, p.size * 2, p.size);
    ctx.restore();
  });

  // teks melayang (+skor / Oops!)
  floatingTexts.forEach(t => {
    ctx.globalAlpha = Math.max(t.life, 0);
    ctx.fillStyle = t.color;
    ctx.font = "bold 14px 'Baloo 2', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(t.text, t.x, t.y);
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
  getAudioCtx();
  const el = document.getElementById("countdown");
  el.style.display = "flex";
  let n = 3;
  el.textContent = n;
  sfxStart();
  const iv = setInterval(() => {
    n--;
    if (n > 0) {
      el.textContent = n;
      sfxStart();
    } else {
      clearInterval(iv);
      el.style.display = "none";
      initGame();
    }
  }, 700);
}

ctx.fillStyle = "#16213a";
ctx.fillRect(0, 0, canvas.width, canvas.height);
(() => {
  const canvas = document.getElementById("game");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const score = document.getElementById("score");
  const best = document.getElementById("best");
  const hint = document.getElementById("hint");
  const root = getComputedStyle(document.documentElement);
  const color = (name) => root.getPropertyValue(name).trim();

  const N = 16;
  const SIZE = canvas.width / N;
  let snake, dir, next, food, points, alive, running, timer, delay;
  let top = 0;
  try {
    top = Number(localStorage.getItem("snak-snake")) || 0;
  } catch {
    // storage can be blocked
  }
  best.textContent = top;

  const rand = () => Math.floor(Math.random() * N);

  function place() {
    do {
      food = { x: rand(), y: rand() };
    } while (snake.some((s) => s.x === food.x && s.y === food.y));
  }

  function reset() {
    clearInterval(timer);
    snake = [
      { x: 8, y: 8 },
      { x: 7, y: 8 },
      { x: 6, y: 8 },
    ];
    dir = { x: 1, y: 0 };
    next = dir;
    points = 0;
    delay = 140;
    alive = true;
    running = false;
    score.textContent = 0;
    hint.textContent = "Нажмите любую стрелку или смахните, чтобы начать";
    place();
    draw();
  }

  function start() {
    if (running || !alive) return;
    running = true;
    hint.textContent = "Поймайте баг, не кусая себя. Стены проходимы";
    timer = setInterval(step, delay);
  }

  function die() {
    alive = false;
    running = false;
    clearInterval(timer);
    if (points > top) {
      top = points;
      best.textContent = top;
      try {
        localStorage.setItem("snak-snake", String(top));
      } catch {
        // ignore
      }
    }
    hint.textContent = "Баг победил. Пробел или касание: заново";
    draw();
  }

  function step() {
    dir = next;
    const head = { x: (snake[0].x + dir.x + N) % N, y: (snake[0].y + dir.y + N) % N };
    if (snake.some((s) => s.x === head.x && s.y === head.y)) return die();
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      points++;
      score.textContent = points;
      place();
      if (delay > 70) {
        delay -= 4;
        clearInterval(timer);
        timer = setInterval(step, delay);
      }
    } else {
      snake.pop();
    }
    draw();
  }

  function draw() {
    ctx.fillStyle = color("--surf");
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = color("--line");
    for (let x = 0; x < N; x++)
      for (let y = 0; y < N; y++) ctx.fillRect(x * SIZE + SIZE / 2 - 1, y * SIZE + SIZE / 2 - 1, 2, 2);

    const fx = food.x * SIZE + SIZE / 2;
    const fy = food.y * SIZE + SIZE / 2;
    ctx.fillStyle = color("--acc2");
    ctx.beginPath();
    ctx.arc(fx, fy, SIZE * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color("--acc2");
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const d of [-1, 1]) {
      ctx.moveTo(fx + d * SIZE * 0.2, fy - SIZE * 0.2);
      ctx.lineTo(fx + d * SIZE * 0.38, fy - SIZE * 0.42);
      ctx.moveTo(fx + d * SIZE * 0.28, fy + SIZE * 0.1);
      ctx.lineTo(fx + d * SIZE * 0.46, fy + SIZE * 0.18);
    }
    ctx.stroke();

    snake.forEach((s, i) => {
      ctx.globalAlpha = alive ? 1 : 0.45;
      ctx.fillStyle = i === 0 ? color("--ink") : color("--acc");
      const pad = i === 0 ? 1 : 2;
      ctx.beginPath();
      ctx.roundRect(s.x * SIZE + pad, s.y * SIZE + pad, SIZE - pad * 2, SIZE - pad * 2, 5);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function turn(x, y) {
    if (!alive) return;
    if (x === -dir.x && y === -dir.y) return;
    next = { x, y };
    start();
  }

  const KEYS = {
    ArrowUp: [0, -1],
    w: [0, -1],
    ц: [0, -1],
    ArrowDown: [0, 1],
    s: [0, 1],
    ы: [0, 1],
    ArrowLeft: [-1, 0],
    a: [-1, 0],
    ф: [-1, 0],
    ArrowRight: [1, 0],
    d: [1, 0],
    в: [1, 0],
  };

  addEventListener("keydown", (e) => {
    const move = KEYS[e.key] || KEYS[e.key.toLowerCase()];
    if (move) {
      e.preventDefault();
      turn(move[0], move[1]);
    } else if (e.key === " " || e.key === "Enter") {
      if (!alive) reset();
      else start();
      if (e.key === " ") e.preventDefault();
    }
  });

  let touch = null;
  canvas.addEventListener(
    "touchstart",
    (e) => {
      touch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      if (!alive) reset();
    },
    { passive: true },
  );
  canvas.addEventListener("touchend", (e) => {
    if (!touch) return;
    const dx = e.changedTouches[0].clientX - touch.x;
    const dy = e.changedTouches[0].clientY - touch.y;
    touch = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return start();
    if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? 1 : -1, 0);
    else turn(0, dy > 0 ? 1 : -1);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && running) {
      running = false;
      clearInterval(timer);
      hint.textContent = "Пауза. Нажмите стрелку, чтобы продолжить";
    }
  });

  reset();
})();

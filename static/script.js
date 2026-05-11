const terminal  = document.getElementById('terminal');
const nextBtn   = document.getElementById('nextBtn');
const tiles     = document.querySelectorAll('.option-row');
const pageStart = Date.now();

// ── timestamp ──────────────────────────────────────────
function ts() {
  return `T+${((Date.now() - pageStart) / 1000).toFixed(3)}s`;
}

// ── terminal log ────────────────────────────────────────
function appendLog(text, color) {
  const row  = document.createElement('div');
  row.style.cssText = 'display:flex;gap:10px;line-height:1.5';

  const stamp = document.createElement('span');
  stamp.textContent = ts();
  stamp.style.color = 'rgba(255,255,255,0.22)';
  stamp.style.flexShrink = '0';

  const msg = document.createElement('span');
  msg.textContent = text;
  msg.style.color  = color;

  row.appendChild(stamp);
  row.appendChild(msg);
  terminal.appendChild(row);
  terminal.scrollTop = terminal.scrollHeight;
}

const C = {
  faintWhite : 'rgba(255,255,255,0.5)',
  dimWhite   : 'rgba(255,255,255,0.3)',
  blue       : '#0066ff',
  pink       : '#ff2d78',
  mint       : '#00ffaa',
  amber      : '#ffaa00',
};

// ── questions ────────────────────────────────────────────
const questions = [
  {
    id: 'QUERY_01',
    options: ['OPTION_A', 'OPTION_B', 'OPTION_C', 'OPTION_D'],
  },
  {
    id: 'QUERY_02',
    options: ['OPTION_A', 'OPTION_B', 'OPTION_C', 'OPTION_D'],
  },
  {
    id: 'QUERY_03',
    options: ['OPTION_A', 'OPTION_B', 'OPTION_C', 'OPTION_D'],
  },
];

let currentQuestionIndex = 0;

// ── behavioral tracking ─────────────────────────────────
let questionStart = null;
let hoverSwitches = 0;
let lastHovered   = null;
let hoverLog      = [];
let selectedTile  = null;

function startTracking() {
  questionStart = performance.now();
  hoverSwitches = 0;
  lastHovered   = null;
  hoverLog      = [];
}

function optText(row) {
  return row.querySelector('.opt-text').textContent;
}

function selectTile(tile) {
  if (selectedTile === tile) {
    tile.classList.remove('selected');
    selectedTile = null;
    nextBtn.classList.remove('visible');
    appendLog('> input_cleared', C.dimWhite);
    return;
  }
  if (selectedTile) selectedTile.classList.remove('selected');
  tile.classList.add('selected');
  selectedTile = tile;
  nextBtn.classList.add('visible');
  appendLog(`> input_locked: ${optText(tile)}`, C.pink);
}

// ── render question ──────────────────────────────────────
function renderQuestion(index) {
  const q = questions[index];

  document.querySelector('.question-text').textContent = q.id;
  tiles.forEach((tile, i) => {
    tile.querySelector('.opt-text').textContent = q.options[i];
    tile.classList.remove('selected');
    tile.querySelector('.opt-analyzing').classList.remove('visible');
  });

  selectedTile = null;
  nextBtn.classList.remove('visible');

  clearTimeout(scanTimer);
  lastHovered        = null;
  lastHoverConfirmed = false;

  const stepEl = document.querySelector('.step-indicator');
  if (stepEl) stepEl.textContent = `QUERY ${String(index + 1).padStart(2, '0')} / ${String(questions.length).padStart(2, '0')}`;

  const fill = document.getElementById('progressFill');
  fill.style.transition = 'width 0.6s ease';
  fill.style.width = `${((index + 1) / questions.length) * 100}%`;

  appendLog(`> query_${String(index + 1).padStart(2, '0')} loaded`, C.faintWhite);
  startTracking();
}

let scanTimer = null;
let lastHoverConfirmed = false;

tiles.forEach(tile => {
  const analyzing = tile.querySelector('.opt-analyzing');

  tile.addEventListener('mouseenter', () => {
    if (lastHovered && lastHovered !== tile) {
      if (lastHoverConfirmed) hoverSwitches++;
      lastHovered.querySelector('.opt-analyzing').classList.remove('visible');
    }
    lastHovered = tile;
    lastHoverConfirmed = false;
    hoverLog.push({ tile: optText(tile), enter: performance.now() });

    clearTimeout(scanTimer);
    scanTimer = setTimeout(() => {
      lastHoverConfirmed = true;
      analyzing.classList.add('visible');
      appendLog(`> scanning: ${optText(tile)}`, C.blue);
    }, 700);
  });

  tile.addEventListener('mouseleave', () => {
    clearTimeout(scanTimer);
    analyzing.classList.remove('visible');
    const last = hoverLog[hoverLog.length - 1];
    if (last && !last.leave) last.leave = performance.now();
  });

  tile.addEventListener('click', () => {
    selectTile(tile);
    hoverSwitches++;
  });
});

// ── camera focus mode ────────────────────────────────────
function enterCameraFocus() {
  const cameraBox   = document.querySelector('.camera-box');
  const terminalBox = document.querySelector('.terminal-box');
  const quiz        = document.querySelector('.quiz');

  // Update title bar
  const winTitle = cameraBox.querySelector('.win-title');
  winTitle.innerHTML = 'FACE_CAPTURE <span style="color:#ff2d78">♥</span>';

  // Sequential terminal logs
  appendLog('> behavioral profile complete', C.blue);
  setTimeout(() => appendLog('> initiating face capture...', '#ffffff'),        600);
  setTimeout(() => appendLog('> ALLOW FACE TO BE COMPRESSED?', C.pink),        1400);
  setTimeout(() => appendLog('> [Y] allow   [N] decline', C.faintWhite),       2000);

  // Pin camera-box at current coords, move to body so quiz opacity won't affect it
  const r = cameraBox.getBoundingClientRect();
  cameraBox.style.position = 'fixed';
  cameraBox.style.top      = r.top  + 'px';
  cameraBox.style.left     = r.left + 'px';
  cameraBox.style.right    = 'auto';
  cameraBox.style.bottom   = 'auto';
  cameraBox.style.width    = r.width  + 'px';
  cameraBox.style.height   = r.height + 'px';
  cameraBox.style.zIndex   = '9999';
  document.body.appendChild(cameraBox);

  // Same for terminal-box — z-index above camera so it floats on top
  const tr = terminalBox.getBoundingClientRect();
  terminalBox.style.position = 'fixed';
  terminalBox.style.top      = tr.top  + 'px';
  terminalBox.style.left     = tr.left + 'px';
  terminalBox.style.right    = 'auto';
  terminalBox.style.bottom   = 'auto';
  terminalBox.style.width    = tr.width  + 'px';
  terminalBox.style.height   = tr.height + 'px';
  terminalBox.style.zIndex   = '10000';
  document.body.appendChild(terminalBox);

  quiz.style.transition    = 'opacity 0.3s ease';
  quiz.style.opacity       = '0';
  quiz.style.pointerEvents = 'none';

  const targetW = Math.min(window.innerWidth * 0.9, 1300);
  const targetH = targetW * (9 / 16);
  const targetL = (window.innerWidth  - targetW) / 2;
  const targetT = (window.innerHeight - targetH) / 2;

  requestAnimationFrame(() => {
    cameraBox.style.transition = 'top 0.85s cubic-bezier(0.4,0,0.2,1), left 0.85s cubic-bezier(0.4,0,0.2,1), width 0.85s cubic-bezier(0.4,0,0.2,1), height 0.85s cubic-bezier(0.4,0,0.2,1)';
    cameraBox.style.top    = targetT + 'px';
    cameraBox.style.left   = targetL + 'px';
    cameraBox.style.width  = targetW + 'px';
    cameraBox.style.height = targetH + 'px';
  });

  setTimeout(() => {
    const backdrop = document.createElement('div');
    backdrop.className = 'consent-backdrop';

    backdrop.innerHTML = `
      <div class="consent-alert">
        <div class="consent-alert-body">
          <div class="consent-alert-title">Face Capture</div>
          <div class="consent-alert-message">READ ♥ would like to compress and store your facial data as part of this experience.</div>
        </div>
        <div class="consent-alert-divider"></div>
        <div class="consent-alert-actions">
          <button class="consent-alert-btn consent-alert-btn-decline">Decline</button>
          <button class="consent-alert-btn consent-alert-btn-allow">Allow</button>
        </div>
      </div>`;

    document.body.appendChild(backdrop);
    requestAnimationFrame(() => backdrop.classList.add('visible'));

    function dismiss(msg, color) {
      appendLog(msg, color);
      backdrop.classList.remove('visible');
      backdrop.classList.add('hidden');
      setTimeout(() => backdrop.remove(), 300);
    }

    backdrop.querySelector('.consent-alert-btn-allow').addEventListener('click', () => {
      dismiss('> consent: granted — face data will be processed', C.blue);
      fetch('/consent', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ granted: true }),
      });
      startCompressionPolling();
    });
    backdrop.querySelector('.consent-alert-btn-decline').addEventListener('click', () => {
      dismiss('> consent: declined — ghost profile assigned', 'rgba(255,255,255,0.4)');
      fetch('/consent', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ granted: false }),
      });
    });
  }, 1500);
}

nextBtn.addEventListener('click', () => {
  if (!selectedTile) return;

  const responseTime = ((performance.now() - questionStart) / 1000).toFixed(2);
  const payload = {
    question       : questions[currentQuestionIndex].id,
    response_time  : parseFloat(responseTime),
    hover_switches : hoverSwitches,
    selected_option: optText(selectedTile),
    hover_log      : hoverLog,
  };

  appendLog(`> response_time: ${responseTime}s`, C.mint);
  appendLog(`> hover_switches: ${hoverSwitches}`, C.amber);
  appendLog(`> selected: ${optText(selectedTile)}`, C.pink);

  fetch('/behavioral', {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify(payload),
  });

  console.log('behavioral:', payload);

  if (currentQuestionIndex >= questions.length - 1) {
    enterCameraFocus();
  } else {
    currentQuestionIndex++;
    renderQuestion(currentQuestionIndex);
  }
});

// ── ambient terminal logs ────────────────────────────────
const ambientEntries = [
  { text: '> listening...', color: C.dimWhite   },
  { text: '> ♥',            color: C.pink        },
  { text: '> *',            color: C.dimWhite    },
  { text: '> trace: active', color: C.blue       },
];

function scheduleAmbient() {
  const delay = 8000 + Math.random() * 4000;
  setTimeout(() => {
    const entry = ambientEntries[Math.floor(Math.random() * ambientEntries.length)];
    appendLog(entry.text, entry.color);
    scheduleAmbient();
  }, delay);
}


// ── symbol popups ────────────────────────────────────────
const symbols = [
  { char: '♥', color: '#ff2d78'               },
  { char: '★', color: '#0066ff'               },
  { char: '✱', color: 'rgba(255,255,255,0.7)' },
];

let _sigBuf = [];
setInterval(() => {
  if (_sigBuf.length === 0) return;
  appendLog(`> signals: ${_sigBuf.join(' ')}`, C.dimWhite);
  _sigBuf = [];
}, 6000);

function spawnOne(sym) {
  const size = (24 + Math.random() * 24).toFixed(0);
  const el = document.createElement('span');
  el.textContent = sym.char;
  el.style.cssText = [
    'position:fixed',
    `left:${(5 + Math.random() * 85).toFixed(1)}%`,
    `top:${(5 + Math.random() * 85).toFixed(1)}%`,
    `font-size:${size}px`,
    `color:${sym.color}`,
    'pointer-events:none',
    'z-index:100',
    'animation:symbol-pop 2.3s ease forwards',
    'font-family:monospace',
  ].join(';');
  document.body.appendChild(el);
  _sigBuf.push(sym.char);
  setTimeout(() => el.remove(), 2500);
}

function loopSymbol(sym, minMs, maxMs) {
  spawnOne(sym);
  setTimeout(() => loopSymbol(sym, minMs, maxMs), minMs + Math.random() * (maxMs - minMs));
}

// ── module drag & resize ──────────────────────────────────
let zTop = 10;
function bringToFront(el) { el.style.zIndex = ++zTop; }

const drag   = { el: null, ox: 0, oy: 0, sl: 0, st: 0 };
const resize = { el: null, ox: 0, oy: 0, sw: 0, sh: 0 };
const LIFT   = '0 24px 64px rgba(0,0,0,0.95), 0 8px 24px rgba(0,0,0,0.8)';

document.addEventListener('mousemove', e => {
  if (drag.el) {
    let l = Math.max(0, Math.min(drag.sl + (e.clientX - drag.ox), window.innerWidth  - drag.el.offsetWidth));
    let t = Math.max(0, Math.min(drag.st + (e.clientY - drag.oy), window.innerHeight - drag.el.offsetHeight));
    drag.el.style.left = l + 'px';
    drag.el.style.top  = t + 'px';
  }
  if (resize.el) {
    resize.el.style.width  = Math.max(+resize.el.dataset.minw, resize.sw + (e.clientX - resize.ox)) + 'px';
    resize.el.style.height = Math.max(+resize.el.dataset.minh, resize.sh + (e.clientY - resize.oy)) + 'px';
  }
});

document.addEventListener('mouseup', () => {
  if (drag.el)   { drag.el.style.opacity = ''; drag.el.style.boxShadow = ''; drag.el = null; }
  if (resize.el) { resize.el.style.opacity = ''; resize.el = null; }
});

function setupModule(module, minW, minH) {
  module.dataset.minw = minW;
  module.dataset.minh = minH;

  function ensureTopLeft() {
    if (module.style.left) return;
    const r = module.getBoundingClientRect();
    module.style.top    = r.top  + 'px';
    module.style.left   = r.left + 'px';
    module.style.right  = 'auto';
    module.style.bottom = 'auto';
  }

  // drag via win-bar
  const bar = module.querySelector('.win-bar');
  bar.addEventListener('mousedown', e => {
    if (e.target.classList.contains('dot')) return;
    e.preventDefault();
    ensureTopLeft();
    bringToFront(module);
    drag.el = module;
    drag.ox = e.clientX; drag.oy = e.clientY;
    drag.sl = module.offsetLeft; drag.st = module.offsetTop;
    module.style.opacity   = '0.9';
    module.style.boxShadow = LIFT;
  });

  // click anywhere → bring to front
  module.addEventListener('mousedown', () => bringToFront(module));

  // resize handle
  const handle = document.createElement('div');
  handle.style.cssText = 'position:absolute;bottom:4px;right:4px;width:8px;height:8px;background:rgba(255,255,255,0.3);cursor:se-resize;z-index:10;border-radius:1px';
  module.appendChild(handle);

  handle.addEventListener('mousedown', e => {
    e.preventDefault();
    e.stopPropagation();
    bringToFront(module);
    resize.el = module;
    resize.ox = e.clientX; resize.oy = e.clientY;
    resize.sw = module.offsetWidth; resize.sh = module.offsetHeight;
    module.style.opacity = '0.9';
  });
}



// ── face status polling ──────────────────────────────────
let faceLoggedOnce  = false;
let lastGaze        = null;
let lastInstability = -1;

function startFacePolling() {
  setInterval(() => {
    fetch('/face_status')
      .then(r => r.json())
      .then(data => {
        if (data.detected && !faceLoggedOnce) {
          faceLoggedOnce = true;
          appendLog('> face detected — landmark count: 478', C.blue);
        }

        if (data.detected && data.gaze && data.gaze !== lastGaze) {
          lastGaze = data.gaze;
          appendLog(`> gaze: ${data.gaze}`, 'rgba(255,255,255,0.5)');
        }

        if (data.instability !== undefined && data.instability !== lastInstability) {
          if (data.instability > lastInstability && data.instability >= 1) {
            appendLog('> instability detected — recalibrating...', C.pink);
          }
          lastInstability = data.instability;
        }
      })
      .catch(() => {});
  }, 1000);
}

// ── compression status polling ───────────────────────────
let lastCompressionStep = -1;
let compressionInterval = null;

function startCompressionPolling() {
  if (compressionInterval) return;
  compressionInterval = setInterval(() => {
    fetch('/compression_status')
      .then(r => r.json())
      .then(data => {
        if (!data.active) return;
        if (data.step === lastCompressionStep) return;
        lastCompressionStep = data.step;
        if (data.step === 1) appendLog('> compressing... 64×64', C.blue);
        else if (data.step === 2) appendLog('> compressing... 32×32', C.blue);
        else if (data.step === 3) {
          appendLog('> compression complete — 16×16 ♥', C.pink);
          clearInterval(compressionInterval);
        }
      })
      .catch(() => {});
  }, 1000);
}

// ── session ID ───────────────────────────────────────────
document.getElementById('sessionId').textContent =
  'SESSION_ID: ' + Math.random().toString(16).slice(2, 10).toUpperCase();

// ── init ─────────────────────────────────────────────────
setupModule(document.querySelector('.camera-box'),  300, 240);
setupModule(document.querySelector('.terminal-box'), 240, 140);
renderQuestion(0);
startFacePolling();
scheduleAmbient();
// ♥ 1–2s, ★ 2–4s, ✱ 6–8s
setTimeout(() => loopSymbol(symbols[0], 1000, 2000), 1000 + Math.random() * 1000);
setTimeout(() => loopSymbol(symbols[1], 2000, 4000), 2000 + Math.random() * 2000);
setTimeout(() => loopSymbol(symbols[2], 6000, 8000), 6000 + Math.random() * 2000);

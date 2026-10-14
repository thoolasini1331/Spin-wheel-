// Spin the Wheel - Vanilla JS (no external libs)
// Features: Canvas wheel, entries management (localStorage), spin physics, tick sound, celebration (synth or uploaded audio), confetti/fireworks, history, fullscreen, remove-winner option

// STORAGE KEYS
const STORAGE_ENTRIES = 'spin_wheel_entries_v1';
const STORAGE_HISTORY = 'spin_wheel_history_v1';
const STORAGE_SETTINGS = 'spin_wheel_settings_v1';

// DEFAULT ENTRIES
const defaultEntries = [
  { title: "Trip to Paris", url: "https://en.wikipedia.org/wiki/Paris" },
  { title: "Free Coffee", url: "" },
  { title: "Amazon Gift", url: "https://www.amazon.com" },
  { title: "Movie Night", url: "" },
  { title: "Extra Vacation Day", url: "" },
  { title: "Surprise Box", url: "" }
];

// UTIL: DOM
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

/* ========= App State ========= */
let entries = loadEntries();
let history = loadHistory();
let settings = loadSettings();

let canvas = $('#wheel');
let ctx = canvas.getContext('2d');
let effectsCanvas = $('#effectsCanvas');
let effectsCtx = effectsCanvas.getContext('2d');

let tickVolume = parseFloat(localStorage.getItem('tickVolume') || '0.3');
let celebrationVolume = parseFloat(localStorage.getItem('celebrationVolume') || '0.7');

// Wheel drawing state
let size = Math.min(canvas.width, canvas.height);
let center = {x: canvas.width/2, y: canvas.height/2};
let radius = Math.min(canvas.width, canvas.height)/2 - 6;

// Spin physics
let isSpinning = false;
let currentRotation = 0; // radians
let spinStartTime = null;
let spinDuration = 0;
let spinStartSpeed = 0;
let spinTargetRotation = 0;
let tickLastSector = null;
let removeWinnerOnSelect = false;

// Selected result
let lastWinner = null;

// WebAudio setup (lazy create on first user interaction)
let audioCtx = null;
let tickGain = null;
let celebrationGain = null;
let celebrationBuffer = null; // for uploaded audio
let customCelebrationURL = null;
let soundOn = true;

// UI elements
const spinBtn = $('#spinBtn');
const resetBtn = $('#resetBtn');
const removeWinnerToggle = $('#removeWinnerToggle');
const replayBtn = $('#replayBtn');
const entriesPanel = $('#entriesPanel');
const openEntriesPanelBtn = $('#openEntriesPanel');
const closeEntries = $('#closeEntries');
const entryForm = $('#entryForm');
const entryTitle = $('#entryTitle');
const entryURL = $('#entryURL');
const entriesList = $('#entriesList');
const clearEntriesBtn = $('#clearEntries');
const selectedInfo = $('#selectedInfo');
const openLinkBtn = $('#openLinkBtn');
const openLinkLarge = $('#openLinkLarge');
const winnerOverlay = $('#winnerOverlay');
const winnerNameEl = $('#winnerName');
const congratsTitle = $('#congratsTitle');
const closeWinner = $('#closeWinner');
const historyEl = $('#history');
const clearHistoryBtn = $('#clearHistory');
const soundToggle = $('#soundToggle');
const fullscreenBtn = $('#fullscreenBtn');
const celebrationFile = $('#celebrationFile');
const tickVolumeInput = $('#tickVolume');
const celebrationVolumeInput = $('#celebrationVolume');

function init(){
  // Canvas sizing for high-dpi
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  drawWheel();

  // UI bindings
  spinBtn.addEventListener('click', handleSpin);
  resetBtn.addEventListener('click', resetSpin);
  removeWinnerToggle.addEventListener('click', toggleRemoveWinner);
  replayBtn.addEventListener('click', () => playCelebration(lastWinner));
  openEntriesPanelBtn.addEventListener('click', () => showEntriesPanel(true));
  closeEntries.addEventListener('click', () => showEntriesPanel(false));
  entryForm.addEventListener('submit', addOrUpdateEntry);
  clearEntriesBtn.addEventListener('click', clearAllEntries);
  openLinkBtn.addEventListener('click', openSelectedLink);
  openLinkLarge.addEventListener('click', openSelectedLink);
  closeWinner.addEventListener('click', hideWinnerOverlay);
  clearHistoryBtn.addEventListener('click', clearHistory);
  soundToggle.addEventListener('click', toggleSound);
  fullscreenBtn.addEventListener('click', toggleFullscreen);
  celebrationFile.addEventListener('change', handleCelebrationUpload);
  tickVolumeInput.addEventListener('input', e => { tickVolume = +e.target.value; localStorage.setItem('tickVolume', tickVolume); });
  celebrationVolumeInput.addEventListener('input', e => { celebrationVolume = +e.target.value; localStorage.setItem('celebrationVolume', celebrationVolume); });

  // Populate entries UI
  renderEntries();
  renderHistory();
  updateSelectedUI();

  // Ensure at least 2 sections
  if (!entries || !entries.length) {
    entries = defaultEntries.slice();
    saveEntries();
  }
}

// Storage helpers
function loadEntries(){
  try {
    const raw = localStorage.getItem(STORAGE_ENTRIES);
    if (!raw) return defaultEntries.slice();
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Could not load entries', e);
    return defaultEntries.slice();
  }
}
function saveEntries(){
  localStorage.setItem(STORAGE_ENTRIES, JSON.stringify(entries));
  renderEntries();
  drawWheel();
}
function loadHistory(){
  try {
    const raw = localStorage.getItem(STORAGE_HISTORY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) { return []; }
}
function saveHistory(){
  localStorage.setItem(STORAGE_HISTORY, JSON.stringify(history));
  renderHistory();
}
function loadSettings(){
  try {
    const raw = localStorage.getItem(STORAGE_SETTINGS);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
function saveSettings(){
  localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(settings));
}

/* ======= Canvas Drawing ======= */
function resizeCanvas(){
  // match display size
  const ratio = window.devicePixelRatio || 1;
  const w = Math.min(window.innerWidth-40, 700);
  canvas.width = Math.round(w * ratio);
  canvas.height = Math.round(w * ratio);
  canvas.style.width = `${Math.round(w)}px`;
  canvas.style.height = `${Math.round(w)}px`;
  effectsCanvas.width = Math.round(window.innerWidth * ratio);
  effectsCanvas.height = Math.round(window.innerHeight * ratio);
  effectsCanvas.style.width = `${window.innerWidth}px`;
  effectsCanvas.style.height = `${window.innerHeight}px`;
  ctx = canvas.getContext('2d');
  effectsCtx = effectsCanvas.getContext('2d');
  ctx.setTransform(ratio,0,0,ratio,0,0);
  effectsCtx.setTransform(ratio,0,0,ratio,0,0);
  center = {x: canvas.width/(2*ratio), y: canvas.height/(2*ratio)};
  radius = Math.min(canvas.width/(2*ratio), canvas.height/(2*ratio)) - 8;
  drawWheel();
}

/* Color palette generator for wedges */
function colorsFor(n){
  const palette = [
    "#ff6b6b","#ffd166","#6bffb3","#6bb8ff","#9d6bff","#ff7ab3","#ffb86b","#6bffe6","#bde26f","#ffa1f1"
  ];
  const out = [];
  for(let i=0;i<n;i++){
    out.push(palette[i % palette.length]);
  }
  return out;
}

/* Draw wheel */
function drawWheel(highlightIndex=null){
  const ctx2 = ctx;
  const w = canvas.width / (window.devicePixelRatio || 1);
  const h = canvas.height / (window.devicePixelRatio || 1);
  ctx2.clearRect(0,0,w,h);

  const n = Math.max(1, entries.length);
  const colors = colorsFor(n);

  ctx2.save();
  ctx2.translate(center.x, center.y);
  ctx2.rotate(currentRotation);
  const anglePer = (Math.PI*2)/n;

  ctx2.textAlign = "center";
  ctx2.textBaseline = "middle";
  ctx2.lineWidth = 2;

  for(let i=0;i<n;i++){
    const start = i * anglePer;
    const end = start + anglePer;
    // wedge
    ctx2.beginPath();
    ctx2.moveTo(0,0);
    ctx2.arc(0,0,radius,start,end);
    ctx2.closePath();

    // highlight winner wedge
    if (highlightIndex !== null && i === highlightIndex){
      ctx2.fillStyle = shadeColor(colors[i], -12);
      ctx2.shadowColor = "rgba(255,255,255,0.12)";
      ctx2.shadowBlur = 20;
      ctx2.fill();
      ctx2.shadowBlur = 0;
    } else {
      ctx2.fillStyle = colors[i];
      ctx2.fill();
    }

    ctx2.strokeStyle = "rgba(0,0,0,0.3)";
    ctx2.stroke();

    // draw text along bisector
    const bis = start + anglePer/2;
    ctx2.save();
    ctx2.rotate(bis);
    ctx2.fillStyle = "rgba(4,10,12,0.95)";
    ctx2.font = `${Math.max(12, Math.floor(radius/9))}px sans-serif`;

    // draw title in two lines if long
    const title = entries[i]?.title || `Item ${i+1}`;
    wrapText(ctx2, title, radius * 0.55, 2);

    ctx2.restore();
  }

  // center circle
  ctx2.beginPath();
  ctx2.arc(0,0,Math.max(40, radius*0.16),0,Math.PI*2);
  ctx2.fillStyle = "rgba(255,255,255,0.08)";
  ctx2.fill();
  ctx2.restore();
}

/* small utils */
function shadeColor(c, percent) {
  // c = "#rrggbb"
  const f=parseInt(c.slice(1),16),t=percent<0?0:255,p=percent<0?percent*-1:percent;
  const R=f>>16,G=f>>8&0x00FF,B=f&0x0000FF;
  const newC = "#" + (0x1000000 + (Math.round((t-R)*p/100)+R)*0x10000 + (Math.round((t-G)*p/100)+G)*0x100 + (Math.round((t-B)*p/100)+B)).toString(16).slice(1);
  return newC;
}
function wrapText(ctx, text, radiusPos, maxLines=2) {
  const words = text.split(' ');
  let lines = [''];
  for (let w of words) {
    if ((lines[lines.length-1] + ' ' + w).trim().length > 16) {
      if (lines.length < maxLines) lines.push(w);
      else lines[lines.length-1] += ' ' + w;
    } else {
      lines[lines.length-1] += (lines[lines.length-1] ? ' ' : '') + w;
    }
  }
  for (let i=0;i<lines.length;i++){
    ctx.fillText(lines[i], radiusPos - (i*0), 0 + (i- (lines.length-1)/2) * 18);
  }
}

/* ======= Spin logic ======= */
function handleSpin(){
  if (isSpinning) return;
  if (!entries.length) { alert('Add at least one entry'); return; }
  // ensure audio created after user gesture
  ensureAudio();

  // pick a uniformly random index
  const idx = Math.floor(Math.random() * entries.length);

  // configure physics
  const fullRotations = randInt(4, 7); // number of full turns
  const n = entries.length;
  const anglePer = (2*Math.PI)/n;

  // we want pointer at top (0 angle at top), our pointer is fixed at top.
  // currentRotation is applied to wheel. The wedge center angle (in wheel coordinates) of the picked idx is:
  const wedgeCenter = (idx * anglePer) + anglePer/2;

  // We want wheel rotation such that wedgeCenter (rotated by currentRotation) aligns to pointer at angle -Math.PI/2 (top)
  // targetRotation such that: currentRotation + deltaRotation + wedgeCenter = -Math.PI/2  (mod 2PI)
  // => deltaRotation = -Math.PI/2 - wedgeCenter - currentRotation + k*2PI
  let delta = -Math.PI/2 - wedgeCenter - currentRotation;
  // normalize to -PI..PI
  delta = ((delta % (2*Math.PI)) + (2*Math.PI)) % (2*Math.PI);
  // choose by adding full rotations
  const targetDelta = delta + fullRotations * 2*Math.PI;

  spinStartTime = performance.now();
  spinDuration = randFloat(5000, 8000); // ms
  spinStartSpeed = (targetDelta) / spinDuration; // average rad/ms (not used directly)
  spinTargetRotation = currentRotation + targetDelta;
  isSpinning = true;
  tickLastSector = null;

  // disable button
  spinBtn.disabled = true;
  spinBtn.classList.add('disabled');

  // start tick sound loop via animation tick checking
  requestAnimationFrame(performSpin);

  // Save intended winner index for later
  // We'll reveal winner on completion precisely
  settings.pendingWinnerIndex = idx;
  saveSettings();
}

/* animation frame for spin: implement ease-in-out */
function performSpin(ts){
  if (!spinStartTime) spinStartTime = ts;
  const elapsed = ts - spinStartTime;
  const t = Math.min(1, elapsed / spinDuration);

  // easing: cubic in/out
  const eased = easeOutCubic(t); // rather than in/out to have quick start and slow stop
  const newRotation = currentRotation + (spinTargetRotation - currentRotation) * eased;

  // determine sector crossing for tick sound
  const n = Math.max(1, entries.length);
  const anglePer = (2*Math.PI)/n;
  // compute rotation normalized so we can map which sector is at pointer
  // pointer angle is -Math.PI/2. The wheel rotation newRotation + wedgeCenter == -PI/2 -> wedge at pointer
  // We'll find which wedge's center is nearest to pointer.
  const wheelAngleAtPointer = ( (-Math.PI/2 - newRotation + 2*Math.PI) % (2*Math.PI) + 2*Math.PI ) % (2*Math.PI);
  // find index
  const sectorIndex = Math.floor( wheelAngleAtPointer / anglePer ) % n;

  if (sectorIndex !== tickLastSector){
    tickLastSector = sectorIndex;
    playTick();
  }

  // update rotation visually (we keep currentRotation moving toward target)
  // But to ensure smoothness we set currentRotation to newRotation
  currentRotation = newRotation;
  drawWheel();

  if (t < 1){
    requestAnimationFrame(performSpin);
  } else {
    // done
    isSpinning = false;
    spinBtn.disabled = false;
    spinBtn.classList.remove('disabled');

    // determine final winner index from settings.pendingWinnerIndex (we used that)
    let winnerIndex = settings.pendingWinnerIndex ?? Math.floor(Math.random() * entries.length);
    revealWinner(winnerIndex);
  }
}

/* easing functions */
function easeOutCubic(x){ return 1 - Math.pow(1 - x, 3); }
function randInt(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }
function randFloat(a,b){ return a + Math.random()*(b-a); }

/* Tick sound: short click */
function ensureAudio(){
  if (audioCtx) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {
    console.warn('WebAudio not supported', e);
    audioCtx = null;
    soundOn = false;
    updateSoundBtn();
    return;
  }
  tickGain = audioCtx.createGain();
  tickGain.gain.value = tickVolume;
  tickGain.connect(audioCtx.destination);
  celebrationGain = audioCtx.createGain();
  celebrationGain.gain.value = celebrationVolume;
  celebrationGain.connect(audioCtx.destination);
  updateSoundBtn();
}
function playTick(){
  if (!soundOn || !audioCtx) return;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = 'square';
  // small ascending chirp
  o.frequency.setValueAtTime(900, audioCtx.currentTime);
  o.frequency.exponentialRampToValueAtTime(1400, audioCtx.currentTime + 0.03);
  g.gain.value = tickVolume;
  o.connect(g);
  g.connect(audioCtx.destination);
  o.start();
  o.stop(audioCtx.currentTime + 0.04);
}

/* Reveal winner */
function revealWinner(idx){
  const winner = entries[idx];
  lastWinner = { index: idx, ...winner, timestamp: new Date().toISOString() };

  // center wheel on winner with glow and keep drawn highlighted
  // compute the exact rotation to align wedge center to top (ensures accurate visual)
  const n = entries.length;
  const anglePer = (2*Math.PI)/n;
  const wedgeCenter = (idx * anglePer) + anglePer/2;
  currentRotation = -Math.PI/2 - wedgeCenter;
  drawWheel(idx);

  // show overlay and play celebration
  showWinnerOverlay(winner.title, winner.url);
  playCelebration(winner);

  // update history
  history.unshift({ title: winner.title, url: winner.url, time: new Date().toISOString() });
  if (history.length > 50) history.length = 50;
  saveHistory();

  // optionally remove winner
  if (removeWinnerOnSelect){
    entries.splice(idx,1);
    saveEntries();
  }
}

/* Winner UI */
function showWinnerOverlay(title, url){
  winnerNameEl.textContent = title;
  congratsTitle.classList.add('pop');
  winnerOverlay.classList.remove('hidden');
  if (url && url.trim()) {
    openLinkLarge.classList.remove('hidden');
    openLinkLarge.href = url;
    openLinkBtn.href = url;
    openLinkBtn.classList.remove('hidden');
  } else {
    openLinkLarge.classList.add('hidden');
    openLinkBtn.classList.add('hidden');
  }

  // start confetti/fireworks for 6s
  startEffects(7000);
  // auto hide after ~6.5s to match requested celebration duration
  setTimeout(() => {
    // allow user to close; optionally auto hide
    // keep overlay visible until user closes (per requirements) but hide celebration visuals
    stopEffects();
  }, 7000);
}
function hideWinnerOverlay(){
  winnerOverlay.classList.add('hidden');
}
function updateSelectedUI(){
  if (lastWinner) {
    selectedInfo.innerHTML = `<strong>${lastWinner.title}</strong>`;
    if (lastWinner.url) {
      openLinkBtn.href = lastWinner.url;
      openLinkBtn.classList.remove('hidden');
    } else {
      openLinkBtn.classList.add('hidden');
    }
  } else {
    selectedInfo.textContent = 'No spin yet';
    openLinkBtn.classList.add('hidden');
  }
}
function openSelectedLink(e){
  // open in new tab
  const href = e.currentTarget.href;
  if (!href) return;
  window.open(href, '_blank', 'noopener');
}

/* Celebration: either play uploaded audio, or synth melody */
function handleCelebrationUpload(e){
  const file = e.target.files[0];
  if (!file) return;
  // prefer to use URL create for playback (keeps things simple)
  if (customCelebrationURL){
    URL.revokeObjectURL(customCelebrationURL);
    customCelebrationURL = null;
  }
  customCelebrationURL = URL.createObjectURL(file);
  celebrationBuffer = null; // ignore buffer
  console.log('Custom celebration loaded', customCelebrationURL);
}
function playCelebration(winner){
  if (!soundOn) return;
  ensureAudio();
  if (!audioCtx) return;

  // If user uploaded audio, play it using HTMLAudio (safer)
  if (customCelebrationURL){
    const a = new Audio(customCelebrationURL);
    a.volume = celebrationVolume;
    a.play().catch(()=>{/* ignore */});
    return;
  }

  // otherwise synth a cheerful jingle: sequence of notes
  const melody = [523.25, 659.25, 783.99, 1046.50]; // C5 E5 G5 C6
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = 'triangle';
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(celebrationVolume * 0.9, now + 0.02);
  let t = now;
  for (let i = 0; i < 4; i++){
    osc.frequency.setValueAtTime(melody[i], t);
    t += 0.25;
  }
  // small staccato flourish
  osc.frequency.exponentialRampToValueAtTime(880, t + 0.05);
  g.gain.linearRampToValueAtTime(0, t + 1.6);

  osc.connect(g);
  g.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(t + 1.6);
}

/* Entries UI management */
function renderEntries(){
  entriesList.innerHTML = '';
  entries.forEach((e, idx) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div>
        <div class="entryTitle">${escapeHtml(e.title)}</div>
        <div class="entryUrl">${escapeHtml(e.url || '')}</div>
      </div>
      <div class="entryActions">
        <button data-action="edit" data-idx="${idx}">✏️</button>
        <button data-action="delete" data-idx="${idx}">🗑️</button>
      </div>
    `;
    entriesList.appendChild(li);
  });
  // bind actions
  $$('.entryActions button', entriesList).forEach(btn=>{
    btn.addEventListener('click', (ev)=>{
      const idx = +btn.dataset.idx;
      const action = btn.dataset.action;
      if (action === 'edit'){
        entryTitle.value = entries[idx].title;
        entryURL.value = entries[idx].url || '';
        // transform add into update: store idx in dataset
        entryForm.dataset.editing = idx;
      } else if (action === 'delete'){
        if (!confirm('Delete this entry?')) return;
        entries.splice(idx,1);
        saveEntries();
      }
    });
  });
}
function addOrUpdateEntry(e){
  e.preventDefault();
  const title = (entryTitle.value || '').trim();
  const url = (entryURL.value || '').trim();
  if (!title) return alert('Enter a title');
  if (entryForm.dataset.editing !== undefined){
    const idx = Number(entryForm.dataset.editing);
    entries[idx] = { title, url };
    delete entryForm.dataset.editing;
  } else {
    entries.push({ title, url });
  }
  entryForm.reset();
  saveEntries();
  showEntriesPanel(false);
}
function clearAllEntries(){
  if (!confirm('Clear all entries? This cannot be undone.')) return;
  entries = [];
  saveEntries();
}

/* History UI */
function renderHistory(){
  historyEl.innerHTML = '';
  if (!history.length){
    historyEl.textContent = 'No results yet.';
    return;
  }
  history.forEach(item=>{
    const div = document.createElement('div');
    div.className = 'historyItem';
    const t = new Date(item.time).toLocaleString();
    div.innerHTML = `<div><strong>${escapeHtml(item.title)}</strong><div class="muted small">${t}</div></div>
      <div>${item.url ? `<a href="${escapeAttr(item.url)}" target="_blank" rel="noopener">🔗</a>` : ''}</div>`;
    historyEl.appendChild(div);
  });
}
function clearHistory(){
  if (!confirm('Clear result history?')) return;
  history = [];
  saveHistory();
}

/* Entries panel */
function showEntriesPanel(show){
  if (show){
    entriesPanel.classList.remove('hidden');
  } else {
    entriesPanel.classList.add('hidden');
  }
}

/* Remove winner toggle */
function toggleRemoveWinner(){
  removeWinnerOnSelect = !removeWinnerOnSelect;
  removeWinnerToggle.classList.toggle('active', removeWinnerOnSelect);
  removeWinnerToggle.style.background = removeWinnerOnSelect ? 'linear-gradient(90deg,#ffa1f1,#ffb86b)' : '';
}

/* Reset spin state - allow spin again, clear selection */
function resetSpin(){
  if (isSpinning) return;
  lastWinner = null;
  settings.pendingWinnerIndex = null;
  saveSettings();
  updateSelectedUI();
  drawWheel();
}

/* Sound toggle */
function toggleSound(){
  soundOn = !soundOn;
  updateSoundBtn();
}
function updateSoundBtn(){
  soundToggle.textContent = soundOn ? '🔊' : '🔈';
}

/* Fullscreen */
function toggleFullscreen(){
  const el = document.documentElement;
  if (!document.fullscreenElement){
    el.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
}

/* ESC handlers */
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    showEntriesPanel(false);
    hideWinnerOverlay();
  }
});

/* Effects: confetti + fireworks */
let effectsRunning = false;
let confettiParticles = [];
let fireworks = [];
function startEffects(duration=6000){
  effectsRunning = true;
  confettiParticles = createConfetti(150);
  fireworks = [];
  // create periodic fireworks
  let start = performance.now();
  function loop(ts){
    if (!effectsRunning) return;
    const elapsed = ts - start;
    // spawn fireworks occasionally
    if (Math.random() < 0.03) fireworks.push(createFirework());
    updateEffects();
    drawEffects();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  // Stop after duration
  setTimeout(()=>{ effectsRunning = false; }, duration);
}
function stopEffects(){ effectsRunning = false; confettiParticles = []; fireworks = []; clearEffectsCanvas(); }
function createConfetti(n){
  const arr = [];
  for(let i=0;i<n;i++){
    arr.push({
      x: Math.random()*window.innerWidth,
      y: Math.random()*-window.innerHeight,
      vx: (Math.random()-0.5)*4,
      vy: Math.random()*3+2,
      r: (Math.random()*8)+4,
      color: randomColor(),
      rot: Math.random()*360,
      spin: (Math.random()-0.5)*10
    });
  }
  return arr;
}
function createFirework(){
  const x = Math.random()*(window.innerWidth*0.8)+window.innerWidth*0.1;
  const y = Math.random()*window.innerHeight*0.3 + window.innerHeight*0.1;
  const colors = [randomColor(), randomColor(), randomColor()];
  return { x,y, t:0, particles: createBurstParticles(x,y, colors) };
}
function createBurstParticles(x,y, colors){
  const arr = [];
  const cnt = 30;
  for(let i=0;i<cnt;i++){
    const a = Math.random()*Math.PI*2;
    const s = Math.random()*4+2;
    arr.push({
      x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s, life: Math.random()*1.6+0.6, c: colors[i%colors.length], r: Math.random()*3+1
    });
  }
  return arr;
}
function updateEffects(){
  const dt = 1/60;
  confettiParticles.forEach(p=>{
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.06;
    p.rot += p.spin;
  });
  confettiParticles = confettiParticles.filter(p => p.y < window.innerHeight + 50);

  fireworks.forEach(f=>{
    f.t += dt;
    f.particles.forEach(p=>{
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.06;
      p.life -= dt;
    });
    f.particles = f.particles.filter(p => p.life > 0);
  });
  fireworks = fireworks.filter(f => f.particles.length > 0);
}
function drawEffects(){
  clearEffectsCanvas();
  const ctx = effectsCtx;
  // confetti
  confettiParticles.forEach(p=>{
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot * Math.PI/180);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.r/2, -p.r/2, p.r, p.r*1.9);
    ctx.restore();
  });
  // fireworks
  fireworks.forEach(f=>{
    f.particles.forEach(p=>{
      ctx.beginPath();
      ctx.fillStyle = p.c;
      ctx.globalAlpha = Math.max(0, p.life/1.6);
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  });
}
function clearEffectsCanvas(){
  effectsCtx.clearRect(0,0,effectsCanvas.width, effectsCanvas.height);
}
function randomColor(){
  const palette = ["#ff6b6b","#ffd166","#6bffb3","#6bb8ff","#9d6bff","#ff7ab3","#ffb86b","#6bffe6"];
  return palette[Math.floor(Math.random()*palette.length)];
}

/* Small helpers */
function escapeHtml(s){ return String(s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }
function escapeAttr(s){ return String(s).replace(/"/g,'&quot;'); }

init();
drawWheel();
renderEntries();
renderHistory();
updateSelectedUI();

/* ---- end of file ---- */

---
layout: default
title: Interval Timer
---

<style>
.timer-wrap {
  text-align: center;
  padding: 1rem 0;
}

.timer-config {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
}

.timer-field {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.timer-field label {
  font-weight: bold;
  color: #313131;
  min-width: 5rem;
  text-align: right;
}


.timer-stepper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.timer-step-input {
  font-size: 1.4rem;
  font-weight: bold;
  color: #313131;
  width: 5rem;
  text-align: center;
  font-variant-numeric: tabular-nums;
  border: 1px solid transparent;
  border-radius: 4px;
  padding: 0.25rem 0.25rem;
  background: transparent;
  -moz-appearance: textfield;
}

.timer-step-input::-webkit-inner-spin-button,
.timer-step-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.timer-step-input:focus {
  outline: none;
  border-color: #6a9fb5;
  background: #fff;
}

.timer-step-input:disabled {
  opacity: 0.4;
}


.timer-forever {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  cursor: pointer;
  user-select: none;
}

.timer-forever input[type="checkbox"] {
  width: 1.1rem;
  height: 1.1rem;
  cursor: pointer;
}

.timer-btn {
  display: inline-block;
  padding: 0.6rem 2rem;
  font-size: 1.1rem;
  font-weight: bold;
  color: #fff;
  background-color: #6a9fb5;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  min-height: 44px;
  min-width: 44px;
  transition: background-color 0.15s;
}

.timer-btn:hover {
  background-color: #578b9f;
}

.timer-btn:active {
  background-color: #4a7a8c;
}

.timer-btn-stop {
  background-color: #999;
}

.timer-btn-stop:hover {
  background-color: #777;
}

.timer-btn-stop:active {
  background-color: #666;
}

.timer-display {
  margin: 1.5rem 0;
}

.timer-countdown {
  font-size: clamp(3rem, 12vw, 5rem);
  font-weight: bold;
  color: #313131;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
  letter-spacing: 0.04em;
}

.timer-loop-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 0.5rem;
}

.timer-loop-info {
  font-size: 1.2rem;
  color: #7a7a7a;
  min-width: 7rem;
  text-align: center;
}

.timer-btn-skip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  font-size: 1.2rem;
  color: #7a7a7a;
  background: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 50%;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
}

.timer-btn-skip:hover {
  background: #e0e0e0;
  color: #313131;
}

.timer-controls {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 1.5rem;
}

.timer-hidden {
  display: none !important;
}
</style>

<div class="timer-wrap" markdown="0">
<h1>Interval Timer</h1>
<div id="timerConfig" class="timer-config">
<div class="timer-field">
<label>Interval</label>
<div class="timer-stepper">
<button type="button" class="timer-btn-skip" id="intervalDown">&#9664;</button>
<input type="text" class="timer-step-input" id="intervalDisplay" value="1:00">
<button type="button" class="timer-btn-skip" id="intervalUp">&#9654;</button>
</div>
</div>
<div class="timer-field">
<label>Loops</label>
<div class="timer-stepper">
<button type="button" class="timer-btn-skip" id="loopsDown">&#9664;</button>
<input type="number" class="timer-step-input" id="loopsInput" min="1" step="1" value="5" disabled>
<button type="button" class="timer-btn-skip" id="loopsUp">&#9654;</button>
</div>
<label class="timer-forever">
<input type="checkbox" id="foreverCheck" checked>
Forever
</label>
</div>
<button class="timer-btn" id="startBtn">Start</button>
</div>
<div id="timerRunning" class="timer-hidden">
<div class="timer-display">
<div class="timer-countdown" id="countdownDisplay">00:00</div>
<div class="timer-loop-nav">
<button class="timer-btn-skip" id="prevBtn">&#9664;</button>
<span class="timer-loop-info" id="loopInfo"></span>
<button class="timer-btn-skip" id="nextBtn">&#9654;</button>
</div>
</div>
<div class="timer-controls">
<button class="timer-btn" id="pauseBtn">Pause</button>
<button class="timer-btn timer-btn-stop" id="stopBtn">Stop</button>
</div>
</div>
</div>

<script>
(function () {
  var audioCtx = null;

  function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  function singleBeep(ctx, startTime) {
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 440;
    gain.gain.setValueAtTime(0.5, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + 0.15);
  }

  function playBeep() {
    var ctx = getAudioCtx();
    singleBeep(ctx, ctx.currentTime);
    singleBeep(ctx, ctx.currentTime + 0.2);
  }

  var intervalDisplay = document.getElementById('intervalDisplay');
  var intervalUpBtn = document.getElementById('intervalUp');
  var intervalDownBtn = document.getElementById('intervalDown');
  var loopsInput = document.getElementById('loopsInput');
  var loopsUpBtn = document.getElementById('loopsUp');
  var loopsDownBtn = document.getElementById('loopsDown');
  var foreverCheck = document.getElementById('foreverCheck');
  var startBtn = document.getElementById('startBtn');
  var pauseBtn = document.getElementById('pauseBtn');
  var stopBtn = document.getElementById('stopBtn');
  var configEl = document.getElementById('timerConfig');
  var runningEl = document.getElementById('timerRunning');
  var countdownDisplay = document.getElementById('countdownDisplay');
  var loopInfo = document.getElementById('loopInfo');
  var prevBtn = document.getElementById('prevBtn');
  var nextBtn = document.getElementById('nextBtn');

  var intervalSeconds = 60;
  var intervalMs = 0;
  var totalLoops = 0;
  var isForever = true;
  var currentLoop = 0;
  var intervalEnd = 0;
  var remainingMs = 0;
  var paused = false;
  var tickId = null;

  function formatInterval(sec) {
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function renderIntervalInput() {
    intervalDisplay.value = formatInterval(intervalSeconds);
  }

  intervalUpBtn.addEventListener('click', function () {
    intervalSeconds += 15;
    renderIntervalInput();
  });

  intervalDownBtn.addEventListener('click', function () {
    if (intervalSeconds > 15) intervalSeconds -= 15;
    renderIntervalInput();
  });

  intervalDisplay.addEventListener('change', function () {
    var parts = intervalDisplay.value.split(':');
    var secs = 0;
    if (parts.length === 2) {
      secs = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    } else if (parts.length === 1) {
      secs = parseInt(parts[0], 10) * 60;
    }
    if (isNaN(secs) || secs < 15) secs = 15;
    intervalSeconds = secs;
    renderIntervalInput();
  });

  loopsUpBtn.addEventListener('click', function () {
    if (foreverCheck.checked) {
      foreverCheck.checked = false;
      setForever(false);
    }
    var v = parseInt(loopsInput.value, 10) || 0;
    loopsInput.value = v + 1;
  });

  loopsDownBtn.addEventListener('click', function () {
    if (foreverCheck.checked) {
      foreverCheck.checked = false;
      setForever(false);
    }
    var v = parseInt(loopsInput.value, 10) || 2;
    if (v > 1) loopsInput.value = v - 1;
  });

  function setForever(on) {
    loopsInput.disabled = on;
    loopsUpBtn.disabled = on;
    loopsDownBtn.disabled = on;
  }

  foreverCheck.addEventListener('change', function () {
    setForever(foreverCheck.checked);
  });

  setForever(true);

  function formatTime(ms) {
    var totalSec = Math.ceil(ms / 1000);
    if (totalSec < 0) totalSec = 0;
    var m = Math.floor(totalSec / 60);
    var s = totalSec % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function updateDisplay() {
    var now = Date.now();
    var left = intervalEnd - now;
    if (left < 0) left = 0;
    countdownDisplay.textContent = formatTime(left);

    if (isForever) {
      loopInfo.textContent = 'Loop ' + currentLoop + ' / \u221E';
    } else {
      loopInfo.textContent = 'Loop ' + currentLoop + ' / ' + totalLoops;
    }
  }

  function tick() {
    if (paused) return;

    var now = Date.now();
    if (now >= intervalEnd) {
      playBeep();
      currentLoop++;

      if (!isForever && currentLoop > totalLoops) {
        stop();
        return;
      }

      intervalEnd = now + intervalMs;
    }

    updateDisplay();
  }

  function start() {
    if (intervalSeconds <= 0) return;

    isForever = foreverCheck.checked;
    totalLoops = isForever ? 0 : parseInt(loopsInput.value, 10);
    if (!isForever && (isNaN(totalLoops) || totalLoops < 1)) {
      loopsInput.focus();
      return;
    }

    intervalMs = intervalSeconds * 1000;
    currentLoop = 1;
    paused = false;
    intervalEnd = Date.now() + intervalMs;

    configEl.classList.add('timer-hidden');
    runningEl.classList.remove('timer-hidden');
    pauseBtn.textContent = 'Pause';

    updateDisplay();
    tickId = setInterval(tick, 200);
  }

  function stop() {
    if (tickId) {
      clearInterval(tickId);
      tickId = null;
    }
    paused = false;
    configEl.classList.remove('timer-hidden');
    runningEl.classList.add('timer-hidden');
  }

  function togglePause() {
    if (paused) {
      intervalEnd = Date.now() + remainingMs;
      paused = false;
      pauseBtn.textContent = 'Pause';
      tickId = setInterval(tick, 200);
    } else {
      remainingMs = intervalEnd - Date.now();
      if (remainingMs < 0) remainingMs = 0;
      paused = true;
      pauseBtn.textContent = 'Resume';
      if (tickId) {
        clearInterval(tickId);
        tickId = null;
      }
      updateDisplay();
    }
  }

  function skipNext() {
    if (!isForever && currentLoop >= totalLoops) {
      stop();
      return;
    }
    currentLoop++;
    intervalEnd = Date.now() + intervalMs;
    updateDisplay();
  }

  function skipPrev() {
    if (currentLoop > 1) currentLoop--;
    intervalEnd = Date.now() + intervalMs;
    updateDisplay();
  }

  startBtn.addEventListener('click', start);
  stopBtn.addEventListener('click', stop);
  pauseBtn.addEventListener('click', togglePause);
  nextBtn.addEventListener('click', skipNext);
  prevBtn.addEventListener('click', skipPrev);

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && !paused && tickId) {
      tick();
    }
  });

  // URL parameter support: ?minutes=X&loops=Y&autostart
  var params = new URLSearchParams(window.location.search);
  if (params.has('minutes')) {
    var m = parseFloat(params.get('minutes'));
    if (!isNaN(m) && m > 0) {
      intervalSeconds = Math.round(m * 60);
      renderIntervalInput();
    }
  }
  if (params.has('loops')) {
    var l = parseInt(params.get('loops'), 10);
    if (!isNaN(l) && l > 0) {
      loopsInput.value = l;
      foreverCheck.checked = false;
      loopsInput.disabled = false;
    }
  }
  if (params.has('autostart')) {
    start();
  }
})();
</script>

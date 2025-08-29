const directions = [
  "⬆️",        // Up
  "↗️",  // Up-Right
  "➡️",     // Right
  "↘️",// Down-Right
  "⬇️",     // Down
  "↙️",// Down-Left
  "⬅️",     // Left
  "↖️"  // Up-Left
];

let intervalId = null;

const directionBox = document.getElementById('directionBox');
const intervalInput = document.getElementById('interval');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');

function showRandomDirection() {
  const idx = Math.floor(Math.random() * directions.length);
  directionBox.textContent = directions[idx];
}

function startTrainer() {
  if (intervalId) return;
  showRandomDirection();
  const intervalSec = Math.max(1, Number(intervalInput.value));
  intervalId = setInterval(showRandomDirection, intervalSec * 1000);
  startBtn.disabled = true;
  stopBtn.disabled = false;
}

function stopTrainer() {
  clearInterval(intervalId);
  intervalId = null;
  directionBox.textContent = '✧';
  startBtn.disabled = false;
  stopBtn.disabled = true;
}

startBtn.addEventListener('click', startTrainer);
stopBtn.addEventListener('click', stopTrainer);

stopBtn.disabled = true;
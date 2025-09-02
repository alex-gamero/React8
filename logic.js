const directions = [
  { emoji: "⬆️", audio: "audio/up.m4a" },           // Up
  { emoji: "↗️", audio: "audio/up-right.m4a" },     // Up-Right
  { emoji: "➡️", audio: "audio/right.m4a" },        // Right
  { emoji: "↘️", audio: "audio/down-right.m4a" },   // Down-Right
  { emoji: "⬇️", audio: "audio/down.m4a" },         // Down
  { emoji: "↙️", audio: "audio/down-left.m4a" },    // Down-Left
  { emoji: "⬅️", audio: "audio/left.m4a" },         // Left
  { emoji: "↖️", audio: "audio/up-left.m4a" }       // Up-Left
];

let intervalId = null;

const directionBox = document.getElementById('directionBox');
const intervalInput = document.getElementById('interval');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');

function playDirectionAudio(audioFile, intervalSec) {
  const audio = new Audio(audioFile); 
  // Adapt playback rate: 1 = normal, >1 = faster, <1 = slower
  // We'll map 1s interval to rate 1.5, 2s to 1, 3s to 0.75, etc.
  // Clamp between 0.5 and 2 for reasonable speeds
  let rate = Math.max(0.5, Math.min(2, 2 / intervalSec));
  audio.playbackRate = rate;
  audio.play();
}

function showRandomDirection() {
  const idx = Math.floor(Math.random() * directions.length);
  const dir = directions[idx];
  directionBox.textContent = dir.emoji;
  const intervalSec = Math.max(1, Number(intervalInput.value));
  playDirectionAudio(dir.audio, intervalSec);
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

intervalInput.setAttribute('inputmode', 'numeric');
intervalInput.addEventListener('input', function () {
  // Solo permite dígitos y punto decimal
  this.value = this.value.replace(/[^0-9.]/g, '');
});
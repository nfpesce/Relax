const inhaleInput = document.querySelector("#inhaleSeconds");
const exhaleInput = document.querySelector("#exhaleSeconds");
const toggleButton = document.querySelector("#toggleButton");
const resetButton = document.querySelector("#resetButton");
const measureInhaleButton = document.querySelector("#measureInhaleButton");
const measureExhaleButton = document.querySelector("#measureExhaleButton");
const measureStatus = document.querySelector("#measureStatus");
const measureSummary = document.querySelector("#measureSummary");
const applyMeasuredButton = document.querySelector("#applyMeasuredButton");
const phaseTitle = document.querySelector("#phaseTitle");
const phaseHint = document.querySelector("#phaseHint");
const cycleLabel = document.querySelector("#cycleLabel");
const nextLabel = document.querySelector("#nextLabel");
const breathVisual = document.querySelector("#breathVisual");
const pieFull = document.querySelector("#pieFull");
const pieSlice = document.querySelector("#pieSlice");

const state = {
  running: false,
  phase: "idle",
  cycle: 0,
  phaseStartedAt: 0,
  phaseDuration: 0,
  pausedRemaining: 0,
  animationId: null,
};

const measuredRhythm = {
  lastPhase: null,
  lastStartedAt: 0,
  inhaleSamples: [],
  exhaleSamples: [],
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function roundToStep(value, step) {
  return Math.round(value / step) * step;
}

function formatDuration(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function readDuration(input) {
  const min = Number(input.min);
  const max = Number(input.max);
  const fallback = Number(input.defaultValue);
  const value = Number.parseFloat(input.value);
  return clamp(Number.isFinite(value) ? value : fallback, min, max);
}

function getDurations() {
  return {
    inhale: readDuration(inhaleInput),
    exhale: readDuration(exhaleInput),
  };
}

function average(values) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function getMeasuredDurations() {
  return {
    inhale: average(measuredRhythm.inhaleSamples),
    exhale: average(measuredRhythm.exhaleSamples),
  };
}

function pointOnCircle(ratio) {
  const angle = -Math.PI / 2 + ratio * Math.PI * 2;
  return {
    x: 50 + 48 * Math.cos(angle),
    y: 50 + 48 * Math.sin(angle),
  };
}

function slicePath(remainingRatio) {
  const ratio = clamp(remainingRatio, 0, 1);

  if (ratio <= 0) {
    return "";
  }

  const start = pointOnCircle(0);
  const end = pointOnCircle(ratio);
  const largeArc = ratio > 0.5 ? 1 : 0;

  return [
    "M 50 50",
    `L ${start.x} ${start.y}`,
    `A 48 48 0 ${largeArc} 1 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
}

function setPie(phase, remainingRatio) {
  const ratio = clamp(remainingRatio, 0, 1);

  breathVisual.dataset.phase = phase;
  pieFull.style.opacity = ratio >= 0.999 ? "1" : "0";
  pieSlice.setAttribute("d", ratio >= 0.999 ? "" : slicePath(ratio));
}

function updateDurationLabels() {
  const durations = getDurations();
  inhaleInput.value = durations.inhale;
  exhaleInput.value = durations.exhale;
  nextLabel.textContent = `Inhala ${formatDuration(durations.inhale)}s / Exhala ${formatDuration(durations.exhale)}s`;
}

function updateMeasurePanel() {
  const measured = getMeasuredDurations();
  const hasInhale = measuredRhythm.inhaleSamples.length > 0;
  const hasExhale = measuredRhythm.exhaleSamples.length > 0;

  applyMeasuredButton.disabled = !(hasInhale && hasExhale);

  if (!hasInhale && !hasExhale) {
    measureSummary.textContent = "Sin mediciones todavia.";
    return;
  }

  const inhaleText = hasInhale ? `${formatDuration(roundToStep(measured.inhale, 0.1))}s` : "--";
  const exhaleText = hasExhale ? `${formatDuration(roundToStep(measured.exhale, 0.1))}s` : "--";
  measureSummary.textContent = `Promedio: inhalar ${inhaleText} / exhalar ${exhaleText}`;
}

function recordBreathStart(phase) {
  const now = performance.now();
  const previousPhase = measuredRhythm.lastPhase;

  if (previousPhase && previousPhase !== phase) {
    const elapsed = (now - measuredRhythm.lastStartedAt) / 1000;

    if (previousPhase === "inhale") {
      measuredRhythm.inhaleSamples.push(elapsed);
    } else {
      measuredRhythm.exhaleSamples.push(elapsed);
    }
  }

  measuredRhythm.lastPhase = phase;
  measuredRhythm.lastStartedAt = now;

  const isInhale = phase === "inhale";
  measureStatus.textContent = isInhale
    ? "Inhalacion marcada. Toca Exhalar cuando empieces a soltar el aire."
    : "Exhalacion marcada. Toca Inhalar cuando empieces a tomar aire.";

  updateMeasurePanel();
}

function applyMeasuredRhythm() {
  const measured = getMeasuredDurations();
  const inhale = clamp(roundToStep(measured.inhale, Number(inhaleInput.step)), Number(inhaleInput.min), Number(inhaleInput.max));
  const exhale = clamp(roundToStep(measured.exhale, Number(exhaleInput.step)), Number(exhaleInput.min), Number(exhaleInput.max));

  inhaleInput.value = formatDuration(inhale);
  exhaleInput.value = formatDuration(exhale);
  updateDurationLabels();

  phaseHint.textContent = "Ritmo medido aplicado. Presiona iniciar cuando quieras.";
  measureStatus.textContent = "Ritmo aplicado a los segundos de inhalar y exhalar.";
}

function setPhase(phase, duration, remaining = duration) {
  state.phase = phase;
  state.phaseDuration = duration;
  state.pausedRemaining = remaining;
  state.phaseStartedAt = performance.now() - (duration - remaining) * 1000;

  const isInhale = phase === "inhale";
  phaseTitle.textContent = isInhale ? "Inhala" : "Exhala";
  phaseHint.textContent = isInhale ? "Toma aire de forma suave." : "Suelta el aire lentamente.";
  setPie(phase, remaining / duration);
  cycleLabel.textContent = `Ciclo ${state.cycle}`;
}

function startInhale() {
  state.cycle += 1;
  const { inhale } = getDurations();
  setPhase("inhale", inhale);
}

function startExhale() {
  const { exhale } = getDurations();
  setPhase("exhale", exhale);
}

function render(now) {
  if (!state.running) return;

  const elapsed = (now - state.phaseStartedAt) / 1000;
  const remaining = Math.max(state.phaseDuration - elapsed, 0);
  const remainingRatio = state.phaseDuration > 0 ? remaining / state.phaseDuration : 0;

  setPie(state.phase, remainingRatio);

  if (remaining <= 0) {
    if (state.phase === "inhale") {
      startExhale();
    } else {
      startInhale();
    }
  }

  state.animationId = requestAnimationFrame(render);
}

function play() {
  if (state.running) return;

  state.running = true;
  toggleButton.textContent = "Pausar";

  if (state.phase === "idle") {
    startInhale();
  } else {
    setPhase(state.phase, state.phaseDuration, state.pausedRemaining);
  }

  state.animationId = requestAnimationFrame(render);
}

function pause() {
  if (!state.running) return;

  state.running = false;
  toggleButton.textContent = "Continuar";
  cancelAnimationFrame(state.animationId);

  const elapsed = (performance.now() - state.phaseStartedAt) / 1000;
  state.pausedRemaining = Math.max(state.phaseDuration - elapsed, 0);
}

function reset() {
  state.running = false;
  state.phase = "idle";
  state.cycle = 0;
  state.phaseStartedAt = 0;
  state.phaseDuration = 0;
  state.pausedRemaining = 0;
  cancelAnimationFrame(state.animationId);

  toggleButton.textContent = "Iniciar";
  phaseTitle.textContent = "Listo";
  phaseHint.textContent = "Configura los segundos y presiona iniciar.";
  cycleLabel.textContent = "Ciclo 0";
  setPie("idle", 0);
  updateDurationLabels();
}

document.querySelectorAll("[data-step]").forEach((button) => {
  button.addEventListener("click", () => {
    const input = button.dataset.step === "inhale" ? inhaleInput : exhaleInput;
    const nextValue = readDuration(input) + Number(button.dataset.delta);
    input.value = clamp(nextValue, Number(input.min), Number(input.max));
    updateDurationLabels();
  });
});

[inhaleInput, exhaleInput].forEach((input) => {
  input.addEventListener("change", updateDurationLabels);
  input.addEventListener("blur", updateDurationLabels);
});

toggleButton.addEventListener("click", () => {
  if (state.running) {
    pause();
  } else {
    play();
  }
});

resetButton.addEventListener("click", reset);
measureInhaleButton.addEventListener("click", () => recordBreathStart("inhale"));
measureExhaleButton.addEventListener("click", () => recordBreathStart("exhale"));
applyMeasuredButton.addEventListener("click", applyMeasuredRhythm);

updateDurationLabels();
updateMeasurePanel();
setPie("idle", 0);

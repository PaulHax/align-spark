import {
  SCENARIOS,
  PRESETS,
  decide,
  simulateThinking,
  modelBadgeHTML,
  buildPresetChips,
  buildValueControls,
  setSliderValues,
  buildScenarioSelector,
  renderDecisionComparison,
  renderScenarioDescription,
  getScenario,
  getPreset,
} from "./shared.js";

const TOTAL_STEPS = 5;

const state = {
  currentStep: 0,
  scenarioId: SCENARIOS[0].id,
  presetId: PRESETS[0].id,
  values: { ...PRESETS[0].values },
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const els = {
  track: $(".steps-track"),
  trackFill: $(".step-track-fill"),
  dots: $$(".step-dot"),
  labels: $$(".step-label"),
  backBtn: $("[data-nav-back]"),
  nextBtn: $("[data-nav-next]"),
  sceneDescription: $("[data-scene-description]"),
  sceneSelector: $("[data-scene-selector]"),
  baselineResult: $("[data-baseline-result]"),
  valuesPresets: $("[data-values-presets]"),
  valuesSliders: $("[data-values-sliders]"),
  comparisonResult: $("[data-comparison-result]"),
  sandboxScenarios: $("[data-sandbox-scenarios]"),
  sandboxPresets: $("[data-sandbox-presets]"),
  sandboxSliders: $("[data-sandbox-sliders]"),
  sandboxResults: $("[data-sandbox-results]"),
};

const renderSceneDescription = () => {
  renderScenarioDescription(els.sceneDescription, getScenario(state.scenarioId));
};

const renderSceneSelector = () => {
  buildScenarioSelector(els.sceneSelector, state.scenarioId, (id) => {
    state.scenarioId = id;
    renderSceneDescription();
    renderSceneSelector();
  });
};

const renderBaselineDecision = (container) => {
  const result = decide(state.scenarioId, "baseline");
  container.innerHTML = `
    <div class="baseline-decision-card">
      <div class="eyebrow">Baseline Language Model ${modelBadgeHTML()}</div>
      <div class="decision-choice">${result.decision}</div>
      <div class="decision-rationale">${result.justification}</div>
    </div>
  `;
};

const renderValuesPresets = () => {
  buildPresetChips(els.valuesPresets, state.presetId, (id) => {
    state.presetId = id;
    state.values = { ...getPreset(id).values };
    setSliderValues(els.valuesSliders, state.values);
    renderValuesPresets();
  });
};

const renderValuesSliders = () => {
  buildValueControls(els.valuesSliders, state.values, (newValues) => {
    state.values = newValues;
    state.presetId = null;
    renderValuesPresets();
  });
};

const renderComparison = (container) => {
  const baseline = decide(state.scenarioId, "baseline");
  const aligned = decide(state.scenarioId, "aligned", state.values);
  renderDecisionComparison(container, baseline, aligned);
};

const renderSandbox = () => {
  buildScenarioSelector(els.sandboxScenarios, state.scenarioId, (id) => {
    state.scenarioId = id;
    renderSandbox();
  });

  buildPresetChips(els.sandboxPresets, state.presetId, (id) => {
    state.presetId = id;
    state.values = { ...getPreset(id).values };
    setSliderValues(els.sandboxSliders, state.values);
    renderSandbox();
  });

  buildValueControls(els.sandboxSliders, state.values, (newValues) => {
    state.values = newValues;
    state.presetId = null;
    buildPresetChips(els.sandboxPresets, null, (id) => {
      state.presetId = id;
      state.values = { ...getPreset(id).values };
      setSliderValues(els.sandboxSliders, state.values);
      renderSandbox();
    });
    renderComparison(els.sandboxResults);
  });

  renderComparison(els.sandboxResults);
};

const updateStepIndicator = () => {
  const fillPercent = state.currentStep / (TOTAL_STEPS - 1) * 100;
  els.trackFill.style.width = `${fillPercent}%`;

  els.dots.forEach((dot, i) => {
    dot.classList.toggle("active", i === state.currentStep);
    dot.classList.toggle("completed", i < state.currentStep);
  });

  els.labels.forEach((label, i) => {
    label.classList.toggle("active", i === state.currentStep);
  });
};

const updateNavButtons = () => {
  els.backBtn.toggleAttribute("hidden", state.currentStep === 0);
  els.nextBtn.toggleAttribute("hidden", state.currentStep === TOTAL_STEPS - 1);
};

const slideToStep = (step) => {
  els.track.style.transform = `translateX(-${step * 20}%)`;
};

const onEnterStep = async (step) => {
  if (step === 0) {
    renderSceneDescription();
    renderSceneSelector();
  }

  if (step === 1) {
    await simulateThinking(els.baselineResult);
    renderBaselineDecision(els.baselineResult);
  }

  if (step === 2) {
    renderValuesPresets();
    renderValuesSliders();
  }

  if (step === 3) {
    await simulateThinking(els.comparisonResult);
    renderComparison(els.comparisonResult);
  }

  if (step === 4) {
    renderSandbox();
  }
};

const goToStep = async (step) => {
  if (step < 0 || step >= TOTAL_STEPS) return;

  state.currentStep = step;

  slideToStep(step);
  updateStepIndicator();
  updateNavButtons();
  await onEnterStep(step);
};

const goNext = () => goToStep(state.currentStep + 1);
const goBack = () => goToStep(state.currentStep - 1);

els.backBtn.addEventListener("click", goBack);
els.nextBtn.addEventListener("click", goNext);

els.dots.forEach((dot) => {
  dot.addEventListener("click", () => {
    const step = Number(dot.dataset.step);
    goToStep(step);
  });
});

document.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
  if (e.key === "ArrowRight") goNext();
  if (e.key === "ArrowLeft") goBack();
});

goToStep(0);

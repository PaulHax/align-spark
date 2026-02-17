import {
  SCENARIOS,
  PRESETS,
  decide,
  ready,
  simulateThinking,
  buildPresetChips,
  buildValueControls,
  setSliderValues,
  buildScenarioSelector,
  renderDecisionComparison,
  getDetailsOpenState,
  renderScenarioDescription,
  getScenario,
  getPreset,
} from "./shared.js";

const TOTAL_STEPS = 5;

const state = {
  currentStep: 0,
  scenarioId: null,
  presetId: null,
  values: {},
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

const renderBaselineDecision = async (container) => {
  const result = await decide(state.scenarioId, "baseline");
  const scenario = getScenario(state.scenarioId);
  const idx = scenario.choices.findIndex((c) => c.id === result.choiceId);
  const letterHTML = idx >= 0 ? `<span class="choice-letter decision-choice-letter">${String.fromCharCode(65 + idx)}</span>` : "";
  const llm = result.llmBackbone?.split("/").pop() || "";
  container.innerHTML = `
    <div class="baseline-decision-card">
      <div class="eyebrow">Baseline Language Model</div>
      <div class="decision-model-info">${llm}</div>
      <div class="decision-choice">${letterHTML}${result.decision}</div>
      <wa-details summary="Justification" appearance="plain" class="decision-rationale-details"><div class="decision-rationale">${result.justification}</div></wa-details>
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

const renderComparison = async (container) => {
  const openState = getDetailsOpenState(container);
  const baseline = await decide(state.scenarioId, "baseline");
  const aligned = await decide(state.scenarioId, "aligned", state.values);
  renderDecisionComparison(container, baseline, aligned, getScenario(state.scenarioId), openState);
};

const renderSandbox = async () => {
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

  await renderComparison(els.sandboxResults);
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
    await renderBaselineDecision(els.baselineResult);
  }

  if (step === 2) {
    renderValuesPresets();
    renderValuesSliders();
  }

  if (step === 3) {
    await simulateThinking(els.comparisonResult);
    await renderComparison(els.comparisonResult);
  }

  if (step === 4) {
    await renderSandbox();
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

ready.then(() => {
  state.scenarioId = SCENARIOS[0].id;
  state.presetId = PRESETS[0].id;
  state.values = { ...PRESETS[0].values };
  goToStep(0);
});

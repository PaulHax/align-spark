import {
  SCENARIOS,
  PRESETS,
  decide,
  ready,
  simulateThinking,
  buildPresetChips,
  buildValueControls,
  setSliderValues,
  getCurrentValues,
  buildScenarioSelector,
  renderScenarioDescription,
  renderDecisionComparison,
  getScenario,
  getPreset,
} from "./shared.js";

const state = {
  stage: 1,
  scenarioId: null,
  presetId: null,
  values: {},
};

const $ = (sel) => document.querySelector(sel);
const grid = $(".tour-grid");
const scenarioZone = $("[data-zone='scenario']");
const valuesZone = $("[data-zone='values']");
const decisionsZone = $("[data-zone='decisions']");
const actionsBar = $("[data-actions]");
const nextBtn = $("[data-next-btn]");
const backBtn = $("[data-back-btn]");

const renderScenarioWithPicker = (id) => {
  const scenario = getScenario(id);
  scenarioZone.innerHTML = `
    <div class="tour-scenario-content">
      <div class="scenario-eyebrow">Choose a Scenario</div>
      <div class="selector-cards"></div>
      <div class="scenario-title">${scenario.title}</div>
      <div class="scenario-description-container"></div>
    </div>
  `;
  buildScenarioSelector(
    scenarioZone.querySelector(".selector-cards"),
    id,
    (newId) => {
      state.scenarioId = newId;
      renderScenarioWithPicker(newId);
      if (state.stage >= 3) renderDecisions(false);
    },
  );
  renderScenarioDescription(
    scenarioZone.querySelector(".scenario-description-container"),
    scenario,
  );
};


const buildValuesPanel = () => {
  valuesZone.innerHTML = `
    <div class="tour-values-content">
      <div class="block-heading">Value Profile</div>
      <div class="presets-container"></div>
      <div class="sliders-container"></div>
    </div>
  `;
  buildPresetChips(
    valuesZone.querySelector(".presets-container"),
    state.presetId,
    onPresetSelect,
  );
  buildValueControls(
    valuesZone.querySelector(".sliders-container"),
    state.values,
    onValuesChange,
  );
};

const renderDecisions = async (showSpinner = true) => {
  decisionsZone.innerHTML = `
    <div class="tour-decisions-content">
      <div class="decisions-heading">Decision Comparison</div>
      <div class="comparison-container"></div>
    </div>
  `;
  const container = decisionsZone.querySelector(".comparison-container");
  if (showSpinner) {
    await simulateThinking(container, 500);
  }
  const baseline = await decide(state.scenarioId, "baseline");
  const aligned = await decide(state.scenarioId, "aligned", state.values);
  renderDecisionComparison(container, baseline, aligned);
};

const onPresetSelect = (presetId) => {
  state.presetId = presetId;
  const preset = getPreset(presetId);
  state.values = { ...preset.values };
  buildPresetChips(
    valuesZone.querySelector(".presets-container"),
    presetId,
    onPresetSelect,
  );
  setSliderValues(valuesZone.querySelector(".sliders-container"), state.values);
  if (state.stage >= 3) renderDecisions(false);
};

const onValuesChange = (newValues) => {
  state.values = newValues;
  state.presetId = null;
  buildPresetChips(
    valuesZone.querySelector(".presets-container"),
    null,
    onPresetSelect,
  );
  if (state.stage >= 3) renderDecisions(false);
};

const goToStage = async (stage) => {
  state.stage = stage;

  grid.classList.remove("stage-2", "stage-3");
  if (stage >= 2) grid.classList.add("stage-2");
  if (stage >= 3) grid.classList.add("stage-3");

  backBtn.toggleAttribute("hidden", stage <= 1);
  nextBtn.disabled = stage >= 3;

  renderScenarioWithPicker(state.scenarioId);

  if (stage === 1) {
    valuesZone.innerHTML = "";
    decisionsZone.innerHTML = "";
  }

  if (stage === 2) {
    buildValuesPanel();
    decisionsZone.innerHTML = "";
  }

  if (stage === 3) {
    buildValuesPanel();
    await renderDecisions(true);
  }
};

nextBtn.addEventListener("click", () => goToStage(state.stage + 1));
backBtn.addEventListener("click", () => goToStage(state.stage - 1));

ready.then(() => {
  state.scenarioId = SCENARIOS[0].id;
  state.presetId = PRESETS[0].id;
  state.values = { ...PRESETS[0].values };
  goToStage(1);
});

import {
  SCENARIOS,
  PRESETS,
  decide,
  simulateThinking,
  modelBadgeHTML,
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
  scenarioId: SCENARIOS[0].id,
  presetId: PRESETS[0].id,
  values: { ...PRESETS[0].values },
};

const $ = (sel) => document.querySelector(sel);
const grid = $(".tour-grid");
const scenarioZone = $("[data-zone='scenario']");
const valuesZone = $("[data-zone='values']");
const decisionsZone = $("[data-zone='decisions']");
const actionsBar = $("[data-actions]");
const nextBtn = $("[data-next-btn]");
const backBtn = $("[data-back-btn]");
const backFloat = $("[data-back-float]");

const renderScenario = (id) => {
  const scenario = getScenario(id);
  scenarioZone.innerHTML = `
    <div class="tour-scenario-content">
      <div class="scenario-eyebrow">Scenario</div>
      <div class="scenario-title">${scenario.title}</div>
      <div class="scenario-description-container"></div>
    </div>
  `;
  renderScenarioDescription(
    scenarioZone.querySelector(".scenario-description-container"),
    scenario,
  );
};

const renderScenarioWithSelector = (id) => {
  const scenario = getScenario(id);
  scenarioZone.innerHTML = `
    <div class="tour-scenario-content">
      <div class="scenario-eyebrow">Scenario</div>
      <div class="scenario-title">${scenario.title}</div>
      <div class="scenario-description-container"></div>
      <div class="tour-scenario-selector">
        <div class="selector-heading">Switch Scenario</div>
        <div class="selector-cards"></div>
      </div>
    </div>
  `;
  renderScenarioDescription(
    scenarioZone.querySelector(".scenario-description-container"),
    scenario,
  );
  buildScenarioSelector(
    scenarioZone.querySelector(".selector-cards"),
    id,
    onScenarioSelect,
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
      <div class="decisions-heading">Decision Comparison ${modelBadgeHTML()}</div>
      <div class="comparison-container"></div>
    </div>
  `;
  const container = decisionsZone.querySelector(".comparison-container");
  if (showSpinner) {
    await simulateThinking(container, 500);
  }
  const baseline = decide(state.scenarioId, "baseline");
  const aligned = decide(state.scenarioId, "aligned", state.values);
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

const onScenarioSelect = (id) => {
  state.scenarioId = id;
  renderScenarioWithSelector(id);
  renderDecisions(false);
};

const goToStage = async (stage) => {
  state.stage = stage;

  grid.classList.remove("stage-2", "stage-3");
  if (stage >= 2) grid.classList.add("stage-2");
  if (stage >= 3) grid.classList.add("stage-3");

  backFloat.classList.toggle("visible", stage > 1);
  backBtn.toggleAttribute("hidden", stage <= 1);
  nextBtn.toggleAttribute("hidden", stage >= 3);
  actionsBar.classList.toggle("hidden", stage >= 3);

  if (stage === 1) {
    renderScenario(state.scenarioId);
    valuesZone.innerHTML = "";
    decisionsZone.innerHTML = "";
  }

  if (stage === 2) {
    renderScenario(state.scenarioId);
    buildValuesPanel();
    decisionsZone.innerHTML = "";
  }

  if (stage === 3) {
    renderScenarioWithSelector(state.scenarioId);
    buildValuesPanel();
    await renderDecisions(true);
  }
};

nextBtn.addEventListener("click", () => goToStage(state.stage + 1));
backBtn.addEventListener("click", () => goToStage(state.stage - 1));
backFloat.addEventListener("click", () => goToStage(state.stage - 1));

goToStage(1);

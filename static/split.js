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
  getScenario,
  getPreset,
} from "./shared.js";

const createState = () => ({
  stage: 1,
  scenarioId: SCENARIOS[0].id,
  presetId: PRESETS[0].id,
  values: { ...PRESETS[0].values },
});

const state = createState();

const $ = (sel) => document.querySelector(sel);
const scenarioBlock = $("[data-scenario-block]");
const baselineBlock = $("[data-baseline-block]");
const valuesBlock = $("[data-values-block]");
const alignedBlock = $("[data-aligned-block]");
const splitGrid = $(".split-grid");
const splitLeft = $(".split-left");
const actionsBar = $("[data-actions]");
const nextBtn = $("[data-next-btn]");
const scenarioStrip = $("[data-scenario-selector]");

const renderScenario = (id) => {
  const scenario = getScenario(id);
  scenarioBlock.innerHTML = `
    <div class="scenario-eyebrow">Scenario</div>
    <div class="scenario-title">${scenario.title}</div>
    <div class="scenario-description-container"></div>
  `;
  renderScenarioDescription(scenarioBlock.querySelector(".scenario-description-container"), scenario);
};

const renderBaseline = (id) => {
  const result = decide(id, "baseline");
  baselineBlock.innerHTML = `
    <div class="block-heading">Baseline Decision</div>
    <div class="baseline-decision">${result.decision}</div>
    <div class="baseline-rationale">${result.justification}</div>
  `;
};

const renderAligned = (id, values) => {
  const baseline = decide(id, "baseline");
  const aligned = decide(id, "aligned", values);
  const changed = baseline.choiceId !== aligned.choiceId;
  alignedBlock.innerHTML = `
    <div class="block-heading">Aligned Decision ${modelBadgeHTML()}</div>
    <div class="aligned-decision">${aligned.decision}</div>
    <div class="aligned-rationale">${aligned.justification}</div>
    <span class="comparison-tag ${changed ? "changed" : "same"}">${changed ? "Changed" : "Same"}</span>
  `;
};

const showBaselineWithSpinner = async () => {
  baselineBlock.classList.add("visible");
  await simulateThinking(baselineBlock, 500);
  renderBaseline(state.scenarioId);
};

const showAlignedWithSpinner = async () => {
  alignedBlock.classList.add("visible");
  await simulateThinking(alignedBlock, 500);
  renderAligned(state.scenarioId, state.values);
};

const enterSplitMode = () => {
  splitLeft.classList.add("dark");
  splitGrid.classList.add("split-open");
};

const onPresetSelect = (presetId) => {
  state.presetId = presetId;
  const preset = getPreset(presetId);
  state.values = { ...preset.values };
  buildPresetChips(
    valuesBlock.querySelector(".presets-container"),
    presetId,
    onPresetSelect,
  );
  setSliderValues(valuesBlock.querySelector(".sliders-container"), state.values);
  updateAligned();
};

const onValuesChange = (newValues) => {
  state.values = newValues;
  state.presetId = null;
  buildPresetChips(
    valuesBlock.querySelector(".presets-container"),
    null,
    onPresetSelect,
  );
  updateAligned();
};

const updateAligned = () => {
  alignedBlock.classList.add("visible");
  renderAligned(state.scenarioId, state.values);
};

const buildValuesPanel = () => {
  valuesBlock.innerHTML = `
    <div class="block-heading">Value Profile</div>
    <div class="presets-container"></div>
    <div class="sliders-container"></div>
  `;
  buildPresetChips(
    valuesBlock.querySelector(".presets-container"),
    state.presetId,
    onPresetSelect,
  );
  buildValueControls(
    valuesBlock.querySelector(".sliders-container"),
    state.values,
    onValuesChange,
  );
};

const onScenarioSelect = (id) => {
  state.scenarioId = id;
  renderScenario(id);
  renderBaseline(id);
  renderAligned(id, state.values);
  buildScenarioSelector(scenarioStrip, id, onScenarioSelect);
};

const advanceStage = async () => {
  if (state.stage >= 3) return;

  state.stage += 1;

  if (state.stage === 2) {
    nextBtn.disabled = true;
    await showBaselineWithSpinner();
    nextBtn.disabled = false;
  }

  if (state.stage === 3) {
    actionsBar.classList.add("hidden");
    enterSplitMode();
    buildValuesPanel();
    await showAlignedWithSpinner();
    scenarioStrip.classList.add("visible");
    buildScenarioSelector(scenarioStrip, state.scenarioId, onScenarioSelect);
    state.stage = 4;
  }
};

const init = () => {
  renderScenario(state.scenarioId);
  nextBtn.addEventListener("click", advanceStage);
};

init();

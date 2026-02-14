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

const backBtn = $("[data-back-btn]");

const exitSplitMode = () => {
  splitLeft.classList.remove("dark");
  splitGrid.classList.remove("split-open");
};

const goToStage = async (stage) => {
  state.stage = stage;

  backBtn.toggleAttribute("hidden", stage <= 1);
  nextBtn.toggleAttribute("hidden", stage >= 3);
  actionsBar.classList.toggle("hidden", stage >= 3);

  if (stage <= 1) {
    baselineBlock.classList.remove("visible");
    exitSplitMode();
    scenarioStrip.classList.remove("visible");
  }

  if (stage === 2) {
    exitSplitMode();
    scenarioStrip.classList.remove("visible");
    baselineBlock.classList.add("visible");
    await simulateThinking(baselineBlock, 500);
    renderBaseline(state.scenarioId);
  }

  if (stage >= 3) {
    baselineBlock.classList.add("visible");
    renderBaseline(state.scenarioId);
    enterSplitMode();
    buildValuesPanel();
    alignedBlock.classList.add("visible");
    await simulateThinking(alignedBlock, 500);
    renderAligned(state.scenarioId, state.values);
    scenarioStrip.classList.add("visible");
    buildScenarioSelector(scenarioStrip, state.scenarioId, onScenarioSelect);
  }
};

nextBtn.addEventListener("click", () => goToStage(state.stage + 1));
backBtn.addEventListener("click", () => goToStage(state.stage - 1));

const init = () => {
  renderScenario(state.scenarioId);
};

init();

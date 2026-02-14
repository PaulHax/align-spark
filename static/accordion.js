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
  renderDecisionComparison,
  renderScenarioDescription,
  getScenario,
  getPreset,
} from "./shared.js";

const state = {
  selectedScenario: SCENARIOS[0].id,
  selectedPreset: PRESETS[0].id,
  values: { ...PRESETS[0].values },
  baselineResult: null,
  alignedResult: null,
};

const $ = (sel) => document.querySelector(sel);

const renderScenario = () => {
  renderScenarioDescription($("#scenario-description"), getScenario(state.selectedScenario));
};

const renderBaselineResult = (result) => {
  const body = $("#baseline-body");
  body.innerHTML = `
    <div class="baseline-result">
      <div class="eyebrow">Baseline Language Model ${modelBadgeHTML()}</div>
      <div class="decision-choice">${result.decision}</div>
      <div class="decision-rationale">${result.justification}</div>
    </div>
  `;
};

const renderAlignedResult = (baseline, aligned) => {
  const body = $("#aligned-body");
  renderDecisionComparison(body, baseline, aligned);
};

const handleScenarioSelect = async (scenarioId) => {
  state.selectedScenario = scenarioId;
  renderScenario();
  buildScenarioSelector(
    $("#scenario-selector"),
    state.selectedScenario,
    handleScenarioSelect
  );
  await runBaseline();
};

const runBaseline = async () => {
  const body = $("#baseline-body");
  await simulateThinking(body);
  state.baselineResult = decide(state.selectedScenario, "baseline");
  renderBaselineResult(state.baselineResult);
};

const handlePresetSelect = (presetId) => {
  state.selectedPreset = presetId;
  const preset = getPreset(presetId);
  state.values = { ...preset.values };
  setSliderValues($("#value-sliders"), state.values);
  buildPresetChips($("#preset-chips"), state.selectedPreset, handlePresetSelect);
  handleValuesChanged(state.values);
};

const handleValuesChanged = async (values) => {
  state.values = values;
  await runAligned();
};

const runAligned = async () => {
  const body = $("#aligned-body");
  await simulateThinking(body);
  state.alignedResult = decide(
    state.selectedScenario,
    "aligned",
    state.values
  );
  renderAlignedResult(state.baselineResult, state.alignedResult);
  initExplorePanel();
};

const runExplore = async () => {
  const container = $("#explore-results");
  await simulateThinking(container);

  const baseline = decide(state.selectedScenario, "baseline");
  const aligned = decide(state.selectedScenario, "aligned", state.values);
  renderDecisionComparison(container, baseline, aligned);
};

const handleExploreScenarioSelect = (scenarioId) => {
  state.selectedScenario = scenarioId;
  renderScenario();
  buildScenarioSelector(
    $("#scenario-selector"),
    state.selectedScenario,
    handleScenarioSelect
  );
  buildScenarioSelector(
    $("#explore-scenario-selector"),
    state.selectedScenario,
    handleExploreScenarioSelect
  );
  runExplore();
};

const handleExplorePresetSelect = (presetId) => {
  state.selectedPreset = presetId;
  const preset = getPreset(presetId);
  state.values = { ...preset.values };
  setSliderValues($("#explore-value-sliders"), state.values);
  setSliderValues($("#value-sliders"), state.values);
  buildPresetChips(
    $("#explore-preset-chips"),
    state.selectedPreset,
    handleExplorePresetSelect
  );
  buildPresetChips(
    $("#preset-chips"),
    state.selectedPreset,
    handleExplorePresetSelect
  );
  runExplore();
};

const handleExploreValuesChanged = (values) => {
  state.values = values;
  runExplore();
};

const initExplorePanel = () => {
  buildScenarioSelector(
    $("#explore-scenario-selector"),
    state.selectedScenario,
    handleExploreScenarioSelect
  );
  buildPresetChips(
    $("#explore-preset-chips"),
    state.selectedPreset,
    handleExplorePresetSelect
  );
  buildValueControls(
    $("#explore-value-sliders"),
    state.values,
    handleExploreValuesChanged
  );

  const baseline = decide(state.selectedScenario, "baseline");
  const aligned = decide(state.selectedScenario, "aligned", state.values);
  renderDecisionComparison($("#explore-results"), baseline, aligned);
};

const init = async () => {
  renderScenario();

  buildScenarioSelector(
    $("#scenario-selector"),
    state.selectedScenario,
    handleScenarioSelect
  );

  buildPresetChips(
    $("#preset-chips"),
    state.selectedPreset,
    handlePresetSelect
  );

  buildValueControls(
    $("#value-sliders"),
    state.values,
    handleValuesChanged
  );

  state.baselineResult = decide(state.selectedScenario, "baseline");
  renderBaselineResult(state.baselineResult);
  initExplorePanel();
};

init();

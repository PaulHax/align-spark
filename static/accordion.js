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
  renderDecisionComparison,
  getDetailsOpenState,
  renderScenarioDescription,
  getScenario,
  getPreset,
} from "./shared.js";

const state = {
  selectedScenario: null,
  selectedPreset: null,
  values: {},
  baselineResult: null,
  alignedResult: null,
};

const $ = (sel) => document.querySelector(sel);

const renderScenario = () => {
  renderScenarioDescription($("#scenario-description"), getScenario(state.selectedScenario));
};

const renderBaselineResult = (result) => {
  const body = $("#baseline-body");
  const scenario = getScenario(state.selectedScenario);
  const idx = scenario.choices.findIndex((c) => c.id === result.choiceId);
  const letterHTML = idx >= 0 ? `<span class="choice-letter decision-choice-letter">${String.fromCharCode(65 + idx)}</span>` : "";
  const llm = result.llmBackbone?.split("/").pop() || "";
  body.innerHTML = `
    <div class="baseline-result">
      <div class="eyebrow">Baseline Language Model</div>
      <div class="decision-model-info">${llm}</div>
      <div class="decision-choice">${letterHTML}${result.decision}</div>
      <wa-details summary="Justification" appearance="plain" class="decision-rationale-details"><div class="decision-rationale">${result.justification}</div></wa-details>
    </div>
  `;
};

const renderAlignedResult = (baseline, aligned) => {
  const body = $("#aligned-body");
  const openState = getDetailsOpenState(body);
  renderDecisionComparison(body, baseline, aligned, getScenario(state.selectedScenario), openState);
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
  state.baselineResult = await decide(state.selectedScenario, "baseline");
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
  state.alignedResult = await decide(
    state.selectedScenario,
    "aligned",
    state.values
  );
  renderAlignedResult(state.baselineResult, state.alignedResult);
  await initExplorePanel();
};

const runExplore = async () => {
  const container = $("#explore-results");
  const openState = getDetailsOpenState(container);
  await simulateThinking(container);

  const baseline = await decide(state.selectedScenario, "baseline");
  const aligned = await decide(state.selectedScenario, "aligned", state.values);
  renderDecisionComparison(container, baseline, aligned, getScenario(state.selectedScenario), openState);
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

const initExplorePanel = async () => {
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

  const exploreContainer = $("#explore-results");
  const openState = getDetailsOpenState(exploreContainer);
  const baseline = await decide(state.selectedScenario, "baseline");
  const aligned = await decide(state.selectedScenario, "aligned", state.values);
  renderDecisionComparison(exploreContainer, baseline, aligned, getScenario(state.selectedScenario), openState);
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

  state.baselineResult = await decide(state.selectedScenario, "baseline");
  renderBaselineResult(state.baselineResult);
  await initExplorePanel();
};

ready.then(() => {
  state.selectedScenario = SCENARIOS[0].id;
  state.selectedPreset = PRESETS[0].id;
  state.values = { ...PRESETS[0].values };
  init();
});

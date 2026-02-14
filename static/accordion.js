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

const PANELS = [
  { id: 1, title: "The Dilemma" },
  { id: 2, title: "Baseline Response" },
  { id: 3, title: "Your Values" },
  { id: 4, title: "Aligned Response" },
  { id: 5, title: "Explore" },
];

const state = {
  unlockedPanels: new Set([1]),
  completedPanels: new Set(),
  selectedScenario: SCENARIOS[0].id,
  selectedPreset: PRESETS[0].id,
  values: { ...PRESETS[0].values },
  baselineResult: null,
  alignedResult: null,
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const panelEl = (n) => $(`#panel-${n}`);
const wrapperEl = (n) => $(`.panel-wrapper[data-panel="${n}"]`);
const statusEl = (n) => $(`[data-status="${n}"]`);

const updatePanelStates = () => {
  PANELS.forEach(({ id }) => {
    const wrapper = wrapperEl(id);
    const panel = panelEl(id);
    const status = statusEl(id);

    wrapper.classList.remove("locked", "unlocked", "completed");

    if (state.completedPanels.has(id)) {
      wrapper.classList.add("completed");
      status.textContent = "Done";
      status.className = "panel-status completed";
      panel.removeAttribute("disabled");
    } else if (state.unlockedPanels.has(id)) {
      wrapper.classList.add("unlocked");
      status.textContent = "Ready";
      status.className = "panel-status unlocked";
      panel.removeAttribute("disabled");
    } else {
      wrapper.classList.add("locked");
      status.textContent = "Locked";
      status.className = "panel-status locked";
      panel.setAttribute("disabled", "");
    }
  });
};

const scrollToPanel = (n) => {
  const wrapper = wrapperEl(n);
  if (!wrapper) return;
  setTimeout(() => {
    wrapper.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 100);
};

const unlockPanel = (n) => {
  if (state.unlockedPanels.has(n)) return;
  state.unlockedPanels.add(n);
  updatePanelStates();
  const panel = panelEl(n);
  panel.open = true;
  scrollToPanel(n);
};

const completePanel = (n) => {
  state.completedPanels.add(n);
  updatePanelStates();
};

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
  completePanel(1);
  await runBaseline();
};

const runBaseline = async () => {
  const body = $("#baseline-body");
  state.unlockedPanels.add(2);
  state.completedPanels.delete(2);
  state.completedPanels.delete(3);
  state.completedPanels.delete(4);
  state.completedPanels.delete(5);
  state.unlockedPanels.delete(3);
  state.unlockedPanels.delete(4);
  state.unlockedPanels.delete(5);
  updatePanelStates();

  panelEl(2).open = true;
  scrollToPanel(2);

  await simulateThinking(body);
  state.baselineResult = decide(state.selectedScenario, "baseline");
  renderBaselineResult(state.baselineResult);
  completePanel(2);
  unlockPanel(3);
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
  state.completedPanels.delete(4);
  state.completedPanels.delete(5);
  state.unlockedPanels.delete(5);
  completePanel(3);
  await runAligned();
};

const runAligned = async () => {
  const body = $("#aligned-body");
  state.unlockedPanels.add(4);
  updatePanelStates();

  panelEl(4).open = true;
  scrollToPanel(4);

  await simulateThinking(body);
  state.alignedResult = decide(
    state.selectedScenario,
    "aligned",
    state.values
  );
  renderAlignedResult(state.baselineResult, state.alignedResult);
  completePanel(4);
  unlockPanel(5);
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

const init = () => {
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

  updatePanelStates();
};

init();

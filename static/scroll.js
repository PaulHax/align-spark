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

const state = {
  selectedScenario: null,
  selectedPreset: null,
  values: {},
  revealed: new Set(),
  baselineShown: false,
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const renderHero = () => {
  const scenario = getScenario(state.selectedScenario);
  $("[data-hero-title]").textContent = scenario.title;
  renderScenarioDescription($("[data-hero-description]"), scenario);
  buildScenarioSelector(
    $("[data-hero-scenarios]"),
    state.selectedScenario,
    handleScenarioChange
  );
};

const renderBaselineCard = async (container) => {
  const result = await decide(state.selectedScenario, "baseline");
  const scenario = getScenario(state.selectedScenario);
  const idx = scenario.choices.findIndex((c) => c.id === result.choiceId);
  const letterHTML = idx >= 0 ? `<span class="choice-letter decision-choice-letter">${String.fromCharCode(65 + idx)}</span>` : "";
  const llm = result.llmBackbone?.split("/").pop() || "";
  container.innerHTML = `
    <div class="eyebrow">Baseline Language Model</div>
    <div class="decision-model-info">${llm}</div>
    <div class="decision-choice">${letterHTML}${result.decision}</div>
    <wa-details summary="Justification" appearance="plain" class="decision-rationale-details"><div class="decision-rationale">${result.justification}</div></wa-details>
  `;
};

const renderStickyBaseline = async () => {
  const result = await decide(state.selectedScenario, "baseline");
  $("[data-sticky-baseline]").innerHTML = `
    <div class="mini-eyebrow">Baseline Decision</div>
    <div class="mini-choice">${result.decision}</div>
  `;
};

const renderAlignedComparison = async () => {
  const container = $("[data-aligned-comparison]");
  const openState = getDetailsOpenState(container);
  const baseline = await decide(state.selectedScenario, "baseline");
  const aligned = await decide(state.selectedScenario, "aligned", state.values);
  renderDecisionComparison(container, baseline, aligned, getScenario(state.selectedScenario), openState);
};

const renderSandbox = async () => {
  const container = $("[data-sandbox-results]");
  const openState = getDetailsOpenState(container);
  const baseline = await decide(state.selectedScenario, "baseline");
  const aligned = await decide(state.selectedScenario, "aligned", state.values);
  renderDecisionComparison(container, baseline, aligned, getScenario(state.selectedScenario), openState);
};

const handleScenarioChange = async (id) => {
  state.selectedScenario = id;
  renderHero();
  await renderBaselineCard($("[data-baseline-card]"));
  await renderStickyBaseline();
  await renderAlignedComparison();
};

const handlePresetSelect = async (presetId) => {
  state.selectedPreset = presetId;
  const preset = getPreset(presetId);
  state.values = { ...preset.values };
  buildPresetChips(
    $("[data-values-presets]"),
    state.selectedPreset,
    handlePresetSelect
  );
  setSliderValues($("[data-values-sliders]"), state.values);
  await renderAlignedComparison();
};

const handleValuesChange = async (newValues) => {
  state.values = newValues;
  state.selectedPreset = null;
  buildPresetChips(
    $("[data-values-presets]"),
    state.selectedPreset,
    handlePresetSelect
  );
  await renderAlignedComparison();
};

const handleSandboxScenarioChange = async (id) => {
  state.selectedScenario = id;
  buildScenarioSelector(
    $("[data-sandbox-scenarios]"),
    state.selectedScenario,
    handleSandboxScenarioChange
  );
  renderHero();
  await renderBaselineCard($("[data-baseline-card]"));
  await renderStickyBaseline();
  await renderAlignedComparison();
  await renderSandbox();
};

const handleSandboxPresetSelect = async (presetId) => {
  state.selectedPreset = presetId;
  const preset = getPreset(presetId);
  state.values = { ...preset.values };
  buildPresetChips(
    $("[data-sandbox-presets]"),
    state.selectedPreset,
    handleSandboxPresetSelect
  );
  setSliderValues($("[data-sandbox-sliders]"), state.values);
  buildPresetChips(
    $("[data-values-presets]"),
    state.selectedPreset,
    handlePresetSelect
  );
  setSliderValues($("[data-values-sliders]"), state.values);
  await renderAlignedComparison();
  await renderSandbox();
};

const handleSandboxValuesChange = async (newValues) => {
  state.values = newValues;
  state.selectedPreset = null;
  buildPresetChips(
    $("[data-sandbox-presets]"),
    state.selectedPreset,
    handleSandboxPresetSelect
  );
  buildPresetChips(
    $("[data-values-presets]"),
    state.selectedPreset,
    handlePresetSelect
  );
  setSliderValues($("[data-values-sliders]"), state.values);
  await renderAlignedComparison();
  await renderSandbox();
};

const applyStaggerToSliders = (container) => {
  const rows = [...container.querySelectorAll(".slider-row")];
  rows.forEach((row, i) => {
    row.classList.add("slider-row-reveal");
    row.style.transitionDelay = `${i * 0.15}s`;
  });
  requestAnimationFrame(() => {
    rows.forEach((row) => row.classList.add("visible"));
  });
};

const revealSection = async (sectionName) => {
  if (state.revealed.has(sectionName)) return;
  state.revealed.add(sectionName);

  const section = $(`[data-section="${sectionName}"]`);
  const revealEls = [...section.querySelectorAll(".reveal")];
  revealEls.forEach((el) => el.classList.add("visible"));

  if (sectionName === "baseline" && !state.baselineShown) {
    state.baselineShown = true;
    const card = $("[data-baseline-card]");
    await simulateThinking(card, 500);
    await renderBaselineCard(card);
  }

  if (sectionName === "values") {
    applyStaggerToSliders($("[data-values-sliders]"));
  }
};

const setupRevealElements = () => {
  $$("[data-section]").forEach((section) => {
    const sectionName = section.dataset.section;
    if (sectionName === "hero" || sectionName === "sandbox") return;

    const inner = section.querySelector(".section-inner");
    const children = [...inner.children];
    children.forEach((child) => child.classList.add("reveal"));
  });
};

const setupObserver = () => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const sectionName = entry.target.dataset.section;
        revealSection(sectionName);
      });
    },
    { threshold: 0.3 }
  );

  $$("[data-section]").forEach((section) => {
    const sectionName = section.dataset.section;
    if (sectionName === "hero" || sectionName === "sandbox") return;
    observer.observe(section);
  });
};

const initValues = () => {
  buildPresetChips(
    $("[data-values-presets]"),
    state.selectedPreset,
    handlePresetSelect
  );
  buildValueControls(
    $("[data-values-sliders]"),
    state.values,
    handleValuesChange
  );
};

const initAligned = async () => {
  await renderStickyBaseline();
  await renderAlignedComparison();
};

const initSandbox = async () => {
  buildScenarioSelector(
    $("[data-sandbox-scenarios]"),
    state.selectedScenario,
    handleSandboxScenarioChange
  );
  buildPresetChips(
    $("[data-sandbox-presets]"),
    state.selectedPreset,
    handleSandboxPresetSelect
  );
  buildValueControls(
    $("[data-sandbox-sliders]"),
    state.values,
    handleSandboxValuesChange
  );
  await renderSandbox();
};

const init = async () => {
  renderHero();
  await renderBaselineCard($("[data-baseline-card]"));
  initValues();
  await initAligned();
  await initSandbox();
  setupRevealElements();
  setupObserver();
};

ready.then(() => {
  state.selectedScenario = SCENARIOS[0].id;
  state.selectedPreset = PRESETS[0].id;
  state.values = { ...PRESETS[0].values };
  init();
});

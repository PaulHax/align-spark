import {
  SCENARIOS,
  PRESETS,
  decide,
  ready,
  buildPresetChips,
  buildValueControls,
  setSliderValues,
  buildScenarioAccordion,
  renderDecisionComparison,
  getDetailsOpenState,
  getScenario,
  getPreset,
} from "./shared.js";

const state = {
  scenarioId: null,
  presetId: null,
  values: {},
  revealed: new Set(),
  baselineShown: false,
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const renderBaselineCard = async (container) => {
  const result = await decide(state.scenarioId, "baseline");
  const scenario = getScenario(state.scenarioId);
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

const renderComparison = async () => {
  const container = $("[data-comparison]");
  const openState = getDetailsOpenState(container);
  const baseline = await decide(state.scenarioId, "baseline");
  const aligned = await decide(state.scenarioId, "aligned", state.values);
  renderDecisionComparison(container, baseline, aligned, getScenario(state.scenarioId), openState);
};

const handleScenarioChange = async (id) => {
  state.scenarioId = id;
  await renderBaselineCard($("[data-baseline-card]"));
  await renderComparison();
};

const handlePresetSelect = async (presetId) => {
  state.presetId = presetId;
  const preset = getPreset(presetId);
  state.values = { ...preset.values };
  buildPresetChips($("[data-values-presets]"), state.presetId, handlePresetSelect);
  setSliderValues($("[data-values-sliders]"), state.values);
  await renderComparison();
};

const handleValuesChange = async (newValues) => {
  state.values = newValues;
  state.presetId = null;
  buildPresetChips($("[data-values-presets]"), state.presetId, handlePresetSelect);
  await renderComparison();
};

const renderSandbox = async () => {
  const container = $("[data-sandbox-results]");
  const openState = getDetailsOpenState(container);
  const baseline = await decide(state.scenarioId, "baseline");
  const aligned = await decide(state.scenarioId, "aligned", state.values);
  renderDecisionComparison(container, baseline, aligned, getScenario(state.scenarioId), openState);
};

const handleSandboxScenarioChange = async (id) => {
  state.scenarioId = id;
  buildScenarioAccordion(
    $("[data-scenario-accordion]"),
    SCENARIOS,
    state.scenarioId,
    handleScenarioChange,
  );
  await renderBaselineCard($("[data-baseline-card]"));
  await renderComparison();
  await renderSandbox();
};

const handleSandboxPresetSelect = async (presetId) => {
  state.presetId = presetId;
  const preset = getPreset(presetId);
  state.values = { ...preset.values };
  buildPresetChips($("[data-sandbox-presets]"), state.presetId, handleSandboxPresetSelect);
  setSliderValues($("[data-sandbox-sliders]"), state.values);
  buildPresetChips($("[data-values-presets]"), state.presetId, handlePresetSelect);
  setSliderValues($("[data-values-sliders]"), state.values);
  await renderComparison();
  await renderSandbox();
};

const handleSandboxValuesChange = async (newValues) => {
  state.values = newValues;
  state.presetId = null;
  buildPresetChips($("[data-sandbox-presets]"), state.presetId, handleSandboxPresetSelect);
  buildPresetChips($("[data-values-presets]"), state.presetId, handlePresetSelect);
  setSliderValues($("[data-values-sliders]"), state.values);
  await renderComparison();
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
    await renderBaselineCard($("[data-baseline-card]"));
  }

  if (sectionName === "values") {
    applyStaggerToSliders($("[data-values-sliders]"));
  }
};

const setupRevealElements = () => {
  $$("[data-section]").forEach((section) => {
    const sectionName = section.dataset.section;
    if (sectionName === "sandbox") return;

    const inner = section.querySelector(".section-inner");
    [...inner.children].forEach((child) => child.classList.add("reveal"));
  });
};

const setupRevealObserver = () => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        revealSection(entry.target.dataset.section);
      });
    },
    { threshold: 0.3 },
  );

  $$("[data-section]").forEach((section) => {
    if (section.dataset.section === "sandbox") return;
    observer.observe(section);
  });
};

const setupTocObserver = () => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const name = entry.target.dataset.section;
        $$(".toc-pill").forEach((pill) => {
          pill.classList.toggle("active", pill.dataset.toc === name);
        });
      });
    },
    { rootMargin: "-50% 0px -50% 0px" },
  );

  $$("[data-section]").forEach((section) => observer.observe(section));
};

const setupTocClicks = () => {
  $$(".toc-pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      const target = $(`[data-section="${pill.dataset.toc}"]`);
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
};

const initScenario = () => {
  buildScenarioAccordion(
    $("[data-scenario-accordion]"),
    SCENARIOS,
    state.scenarioId,
    handleScenarioChange,
  );
};

const initValues = () => {
  buildPresetChips($("[data-values-presets]"), state.presetId, handlePresetSelect);
  buildValueControls($("[data-values-sliders]"), state.values, handleValuesChange);
};

const initSandbox = async () => {
  buildScenarioAccordion(
    $("[data-sandbox-scenarios]"),
    SCENARIOS,
    state.scenarioId,
    handleSandboxScenarioChange,
  );
  buildPresetChips($("[data-sandbox-presets]"), state.presetId, handleSandboxPresetSelect);
  buildValueControls($("[data-sandbox-sliders]"), state.values, handleSandboxValuesChange);
  await renderSandbox();
};

const init = async () => {
  initScenario();
  await renderBaselineCard($("[data-baseline-card]"));
  initValues();
  await renderComparison();
  await initSandbox();
  setupRevealElements();
  setupRevealObserver();
  setupTocObserver();
  setupTocClicks();
};

ready.then(() => {
  state.scenarioId = SCENARIOS[0].id;
  state.presetId = PRESETS[0].id;
  state.values = { ...PRESETS[0].values };
  init();
});

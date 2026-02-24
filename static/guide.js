import {
  SCENARIOS,
  PRESETS,
  DIMENSIONS,
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

const renderDeciderCard = async (container) => {
  const result = await decide(state.scenarioId, "baseline");
  const llm = result.llmBackbone?.split("/").pop() || "Language Model";
  container.innerHTML = `
    <div class="decider-node">
      <div class="decider-node-icon">&#x1F916;</div>
      <div class="decider-node-text">
        <div class="decider-label">Baseline Language Model</div>
        <div class="decider-model-name">${llm}</div>
      </div>
    </div>
  `;
};

const renderBaselineScenario = (container, scenario) => {
  const descHtml = scenario.description
    .split("\n")
    .filter((p) => p.trim())
    .map((p) => `<p>${p}</p>`)
    .join("");

  const choiceLetters = scenario.choices
    .map((c, i) => `<span class="summary-choice-item"><span class="choice-letter choice-${String.fromCharCode(97 + i)}">${String.fromCharCode(65 + i)}</span><span class="summary-choice-label">${c.label}</span></span>`)
    .join("");

  const choicesHtml = scenario.choices
    .map(
      (c, i) =>
        `<div class="scenario-choice-card"><span class="choice-letter choice-${String.fromCharCode(97 + i)}">${String.fromCharCode(65 + i)}</span>${c.label}</div>`,
    )
    .join("");

  container.innerHTML = `
    <wa-details class="baseline-scenario-panel">
      <span slot="summary" class="accordion-summary">
        <span class="accordion-summary-title">${scenario.title}</span>
        <span class="accordion-summary-choices">${choiceLetters}</span>
      </span>
      <div class="accordion-scenario-body">
        <div class="accordion-scenario-description">${descHtml}</div>
        ${choicesHtml ? `<div class="scenario-choices">${choicesHtml}</div>` : ""}
      </div>
    </wa-details>
  `;
};

const renderBaselineCard = async (container) => {
  const result = await decide(state.scenarioId, "baseline");
  const scenario = getScenario(state.scenarioId);
  renderBaselineScenario($("[data-baseline-scenario]"), scenario);
  const idx = scenario.choices.findIndex((c) => c.id === result.choiceId);
  const letterHTML = idx >= 0 ? `<span class="choice-letter decision-choice-letter choice-${String.fromCharCode(97 + idx)}">${String.fromCharCode(65 + idx)}</span>` : "";
  const openState = getDetailsOpenState(container);
  const isOpen = openState?.[0] ? " open" : "";
  container.innerHTML = `
    <wa-details class="decision-panel"${isOpen}>
      <span slot="summary" class="decision-panel-summary">
        <span class="decision-panel-choice">${letterHTML}${result.decision}</span>
        <span class="decision-panel-justification-preview">${result.justification}</span>
      </span>
      <div class="decision-rationale">${result.justification}</div>
    </wa-details>
  `;
};

const renderValuesScenario = (container, scenario) => {
  const descHtml = scenario.description
    .split("\n")
    .filter((p) => p.trim())
    .map((p) => `<p>${p}</p>`)
    .join("");

  const choicesHtml = scenario.choices
    .map(
      (c, i) =>
        `<div class="scenario-choice-card"><span class="choice-letter choice-${String.fromCharCode(97 + i)}">${String.fromCharCode(65 + i)}</span>${c.label}</div>`,
    )
    .join("");

  container.innerHTML = `
    <wa-details class="baseline-scenario-panel">
      <span slot="summary" class="accordion-summary">${scenario.title}</span>
      <div class="accordion-scenario-body">
        <div class="accordion-scenario-description">${descHtml}</div>
        ${choicesHtml ? `<div class="scenario-choices">${choicesHtml}</div>` : ""}
      </div>
    </wa-details>
  `;
};

const renderAlignedDecider = async (container) => {
  const result = await decide(state.scenarioId, "aligned", state.values);
  const adm = result.admName?.replace(/_/g, " ") || "Aligned Decider";
  const displayAdm = {
    phase2_pipeline_zeroshot_comparative_regression: "Comparative Regression",
  }[result.admName] || adm;
  const llm = result.llmBackbone?.split("/").pop() || "";
  container.innerHTML = `
    <div class="aligned-decider-node">
      <div class="decider-node-icon">&#x1F9ED;</div>
      <div class="decider-node-text">
        <div class="decider-label">Value-Aligned Decider</div>
        <div class="decider-model-name">${displayAdm}${llm ? ` · ${llm}` : ""}</div>
      </div>
    </div>
  `;
};

const renderAlignedDecision = async (container) => {
  const result = await decide(state.scenarioId, "aligned", state.values);
  const scenario = getScenario(state.scenarioId);
  const idx = scenario.choices.findIndex((c) => c.id === result.choiceId);
  const letterHTML = idx >= 0 ? `<span class="choice-letter decision-choice-letter choice-${String.fromCharCode(97 + idx)}">${String.fromCharCode(65 + idx)}</span>` : "";
  const wasOpen = container.querySelector(".decision-panel")?.open;
  container.innerHTML = `
    <wa-details class="decision-panel"${wasOpen ? " open" : ""}>
      <span slot="summary" class="decision-panel-summary">
        <span class="decision-panel-choice">${letterHTML}${result.decision}</span>
        <span class="decision-panel-justification-preview">${result.justification}</span>
      </span>
      <div class="decision-rationale">${result.justification}</div>
    </wa-details>
  `;
};

const renderComparisonScenario = (container, scenario) => {
  const descHtml = scenario.description
    .split("\n")
    .filter((p) => p.trim())
    .map((p) => `<p>${p}</p>`)
    .join("");

  const choicesHtml = scenario.choices
    .map(
      (c, i) =>
        `<div class="scenario-choice-card"><span class="choice-letter choice-${String.fromCharCode(97 + i)}">${String.fromCharCode(65 + i)}</span>${c.label}</div>`,
    )
    .join("");

  container.innerHTML = `
    <wa-details class="baseline-scenario-panel">
      <span slot="summary" class="accordion-summary">${scenario.title}</span>
      <div class="accordion-scenario-body">
        <div class="accordion-scenario-description">${descHtml}</div>
        ${choicesHtml ? `<div class="scenario-choices">${choicesHtml}</div>` : ""}
      </div>
    </wa-details>
  `;
};

const renderComparisonDeciders = async () => {
  const baseline = await decide(state.scenarioId, "baseline");
  const aligned = await decide(state.scenarioId, "aligned", state.values);

  const baselineLlm = baseline.llmBackbone?.split("/").pop() || "Language Model";
  $("[data-comparison-baseline-decider]").innerHTML = `
    <div class="decider-node">
      <div class="decider-node-icon">&#x1F916;</div>
      <div class="decider-node-text">
        <div class="decider-label">Baseline Language Model</div>
        <div class="decider-model-name">${baselineLlm}</div>
      </div>
    </div>
  `;

  const adm = aligned.admName?.replace(/_/g, " ") || "Aligned Decider";
  const displayAdm = {
    phase2_pipeline_zeroshot_comparative_regression: "Comparative Regression",
  }[aligned.admName] || adm;
  const alignedLlm = aligned.llmBackbone?.split("/").pop() || "";
  $("[data-comparison-aligned-decider]").innerHTML = `
    <div class="aligned-decider-node">
      <div class="decider-node-icon">&#x1F9ED;</div>
      <div class="decider-node-text">
        <div class="decider-label">Value-Aligned Decider</div>
        <div class="decider-model-name">${displayAdm}${alignedLlm ? ` · ${alignedLlm}` : ""}</div>
      </div>
    </div>
  `;
};

const renderComparisonDecisions = (container, aligned, baseline, scenario) => {
  const changed = baseline.choiceId !== aligned.choiceId;
  const openState = getDetailsOpenState(container);
  const alignedOpen = openState?.[0] ? " open" : "";
  const baselineOpen = openState?.[1] ? " open" : "";

  const alignedIdx = scenario.choices.findIndex((c) => c.id === aligned.choiceId);
  const alignedLetter = alignedIdx >= 0 ? `<span class="choice-letter decision-choice-letter choice-${String.fromCharCode(97 + alignedIdx)}">${String.fromCharCode(65 + alignedIdx)}</span>` : "";
  const baselineIdx = scenario.choices.findIndex((c) => c.id === baseline.choiceId);
  const baselineLetter = baselineIdx >= 0 ? `<span class="choice-letter decision-choice-letter choice-${String.fromCharCode(97 + baselineIdx)}">${String.fromCharCode(65 + baselineIdx)}</span>` : "";

  container.innerHTML = `
    <div class="decision-comparison">
      <div class="decision-col">
        <wa-details class="decision-panel"${baselineOpen}>
          <span slot="summary" class="decision-panel-summary">
            <span class="decision-panel-choice">${baselineLetter}${baseline.decision}</span>
            <span class="decision-panel-justification-preview">${baseline.justification}</span>
          </span>
          <div class="decision-rationale">${baseline.justification}</div>
        </wa-details>
      </div>
      <div class="decision-col">
        <wa-details class="decision-panel"${alignedOpen}>
          <span slot="summary" class="decision-panel-summary">
            <span class="decision-panel-choice">${alignedLetter}${aligned.decision}</span>
            <span class="decision-panel-justification-preview">${aligned.justification}</span>
          </span>
          <div class="decision-rationale">${aligned.justification}</div>
        </wa-details>
      </div>
    </div>
  `;
};

const drawComparisonCrossarm = () => {
  const svg = $("[data-comparison-crossarm]");
  const flow = svg.closest(".comparison-flow");
  const scenarioPanel = flow.querySelector("[data-comparison-scenario] wa-details");
  const alignedDecider = flow.querySelector("[data-comparison-aligned-decider] .aligned-decider-node");
  if (!scenarioPanel || !alignedDecider) return;

  const fr = flow.getBoundingClientRect();
  const sr = scenarioPanel.getBoundingClientRect();
  const ar = alignedDecider.getBoundingClientRect();

  const x1 = sr.right - fr.left;
  const y1 = (sr.top + sr.bottom) / 2 - fr.top;
  const y2 = (ar.top + ar.bottom) / 2 - fr.top;
  const x2 = ar.left - fr.left;
  const xDrop = x1 + 16;
  const r = 8;

  const d = [
    `M ${x1 + 6} ${y1}`,
    `H ${xDrop - r}`,
    `Q ${xDrop} ${y1} ${xDrop} ${y1 + r}`,
    `V ${y2 - r}`,
    `Q ${xDrop} ${y2} ${xDrop + r} ${y2}`,
    `H ${x2 - 6}`,
  ].join(" ");
  svg.innerHTML = `<path d="${d}" fill="none" stroke="var(--border)" stroke-width="2" />`;
};

const scheduleDrawCrossarm = () => {
  requestAnimationFrame(() => requestAnimationFrame(drawComparisonCrossarm));
};

const renderComparison = async () => {
  const scenario = getScenario(state.scenarioId);
  renderComparisonScenario($("[data-comparison-scenario]"), scenario);
  await renderComparisonDeciders();
  const baseline = await decide(state.scenarioId, "baseline");
  const aligned = await decide(state.scenarioId, "aligned", state.values);
  renderComparisonDecisions($("[data-comparison-decisions]"), aligned, baseline, scenario);
  scheduleDrawCrossarm();
};

const updateValuesFlow = async () => {
  renderValuesScenario($("[data-values-scenario]"), getScenario(state.scenarioId));
  await renderAlignedDecider($("[data-aligned-decider]"));
  await renderAlignedDecision($("[data-aligned-decision]"));
};

const handleScenarioChange = async (id) => {
  state.scenarioId = id;
  await renderDeciderCard($("[data-decider-card]"));
  await renderBaselineCard($("[data-baseline-card]"));
  await updateValuesFlow();
  await renderComparison();
};

const syncAllValueControls = () => {
  buildPresetChips($("[data-simple-presets]"), state.presetId, handleSimplePresetSelect);
  setSliderValues($("[data-simple-sliders]"), state.values);
  buildPresetChips($("[data-values-presets]"), state.presetId, handlePresetSelect);
  setSliderValues($("[data-values-sliders]"), state.values);
  buildPresetChips($("[data-comparison-presets]"), state.presetId, handleComparisonPresetSelect);
  setSliderValues($("[data-comparison-sliders]"), state.values);
  buildPresetChips($("[data-sandbox-presets]"), state.presetId, handleSandboxPresetSelect);
  setSliderValues($("[data-sandbox-sliders]"), state.values);
};

const handlePresetSelect = async (presetId) => {
  state.presetId = presetId;
  const preset = getPreset(presetId);
  state.values = { ...preset.values };
  syncAllValueControls();
  await updateValuesFlow();
  await renderComparison();
};

const handleValuesChange = async (newValues) => {
  state.values = newValues;
  state.presetId = null;
  syncAllValueControls();
  await updateValuesFlow();
  await renderComparison();
};

const handleSimplePresetSelect = async (presetId) => {
  state.presetId = presetId;
  const preset = getPreset(presetId);
  state.values = { ...preset.values };
  syncAllValueControls();
  await updateValuesFlow();
  await renderComparison();
};

const handleSimpleValuesChange = async (newValues) => {
  state.values = newValues;
  state.presetId = null;
  syncAllValueControls();
  await updateValuesFlow();
  await renderComparison();
};

const handleComparisonPresetSelect = async (presetId) => {
  state.presetId = presetId;
  const preset = getPreset(presetId);
  state.values = { ...preset.values };
  syncAllValueControls();
  await updateValuesFlow();
  await renderComparison();
  await renderSandbox();
};

const handleComparisonValuesChange = async (newValues) => {
  state.values = newValues;
  state.presetId = null;
  syncAllValueControls();
  await updateValuesFlow();
  await renderComparison();
  await renderSandbox();
};

const drawSandboxCrossarm = () => {
  const svg = $("[data-sandbox-crossarm]");
  const flow = svg.closest(".comparison-flow");
  const selectedRow = flow.querySelector(".scenario-radio-row.selected");
  const radio = selectedRow?.querySelector(".scenario-radio");
  const alignedDecider = flow.querySelector("[data-sandbox-aligned-decider] .aligned-decider-node");
  if (!radio || !alignedDecider) return;

  const fr = flow.getBoundingClientRect();
  const sr = selectedRow.getBoundingClientRect();
  const rr = radio.getBoundingClientRect();
  const ar = alignedDecider.getBoundingClientRect();

  const x1 = sr.right - fr.left;
  const y1 = (rr.top + rr.bottom) / 2 - fr.top;
  const y2 = (ar.top + ar.bottom) / 2 - fr.top;
  const x2 = ar.left - fr.left;
  const xDrop = x1 + 16;
  const r = 8;

  const d = [
    `M ${x1 + 6} ${y1}`,
    `H ${xDrop - r}`,
    `Q ${xDrop} ${y1} ${xDrop} ${y1 + r}`,
    `V ${y2 - r}`,
    `Q ${xDrop} ${y2} ${xDrop + r} ${y2}`,
    `H ${x2 - 6}`,
  ].join(" ");
  svg.innerHTML = `<path d="${d}" fill="none" stroke="var(--border)" stroke-width="2" />`;
};

const scheduleDrawSandboxCrossarm = () => {
  requestAnimationFrame(() => requestAnimationFrame(drawSandboxCrossarm));
};

const renderSandboxDeciders = async () => {
  const baseline = await decide(state.scenarioId, "baseline");
  const aligned = await decide(state.scenarioId, "aligned", state.values);

  const baselineLlm = baseline.llmBackbone?.split("/").pop() || "Language Model";
  $("[data-sandbox-baseline-decider]").innerHTML = `
    <div class="decider-node">
      <div class="decider-node-icon">&#x1F916;</div>
      <div class="decider-node-text">
        <div class="decider-label">Baseline Language Model</div>
        <div class="decider-model-name">${baselineLlm}</div>
      </div>
    </div>
  `;

  const adm = aligned.admName?.replace(/_/g, " ") || "Aligned Decider";
  const displayAdm = {
    phase2_pipeline_zeroshot_comparative_regression: "Comparative Regression",
  }[aligned.admName] || adm;
  const alignedLlm = aligned.llmBackbone?.split("/").pop() || "";
  $("[data-sandbox-aligned-decider]").innerHTML = `
    <div class="aligned-decider-node">
      <div class="decider-node-icon">&#x1F9ED;</div>
      <div class="decider-node-text">
        <div class="decider-label">Value-Aligned Decider</div>
        <div class="decider-model-name">${displayAdm}${alignedLlm ? ` · ${alignedLlm}` : ""}</div>
      </div>
    </div>
  `;
};

const renderSandbox = async () => {
  await renderSandboxDeciders();
  const container = $("[data-sandbox-results]");
  const openState = getDetailsOpenState(container);
  const baseline = await decide(state.scenarioId, "baseline");
  const aligned = await decide(state.scenarioId, "aligned", state.values);
  const scenario = getScenario(state.scenarioId);
  renderComparisonDecisions(container, aligned, baseline, scenario);
  scheduleDrawSandboxCrossarm();
};

const handleSandboxScenarioChange = async (id) => {
  state.scenarioId = id;
  buildScenarioAccordion(
    $("[data-scenario-accordion]"),
    SCENARIOS,
    state.scenarioId,
    handleScenarioChange,
    { showKdmaTag: false },
  );
  await renderDeciderCard($("[data-decider-card]"));
  await renderBaselineCard($("[data-baseline-card]"));
  await updateValuesFlow();
  await renderComparison();
  await renderSandbox();
  scheduleDrawSandboxCrossarm();
};

const handleSandboxPresetSelect = async (presetId) => {
  state.presetId = presetId;
  const preset = getPreset(presetId);
  state.values = { ...preset.values };
  syncAllValueControls();
  await updateValuesFlow();
  await renderComparison();
  await renderSandbox();
};

const handleSandboxValuesChange = async (newValues) => {
  state.values = newValues;
  state.presetId = null;
  syncAllValueControls();
  await updateValuesFlow();
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
    applyStaggerToSliders($("[data-simple-sliders]"));
  }

  if (sectionName === "alignment") {
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

const CHEVRON_SVG = `<svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>`;

const setupNextButtons = () => {
  const sections = $$("[data-section]");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const btn = entry.target.querySelector(".section-next");
        if (btn) btn.classList.toggle("hidden", !entry.isIntersecting);
      });
    },
    { threshold: 0.5 },
  );

  sections.forEach((section, i) => {
    if (i === sections.length - 1) return;
    const nextSection = sections[i + 1];
    const btn = document.createElement("button");
    btn.className = "section-next";
    btn.innerHTML = `<span class="section-next-label">Next</span><span class="section-next-chevron">${CHEVRON_SVG}</span>`;
    btn.addEventListener("click", () => {
      nextSection.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    section.appendChild(btn);
    observer.observe(section);
  });
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
    { showKdmaTag: false },
  );
};

const initSimpleValues = () => {
  buildPresetChips($("[data-simple-presets]"), state.presetId, handleSimplePresetSelect);
  buildValueControls($("[data-simple-sliders]"), state.values, handleSimpleValuesChange);
};

const initAlignment = async () => {
  buildPresetChips($("[data-values-presets]"), state.presetId, handlePresetSelect);
  buildValueControls($("[data-values-sliders]"), state.values, handleValuesChange);
  await updateValuesFlow();
};

const initComparison = async () => {
  buildPresetChips($("[data-comparison-presets]"), state.presetId, handleComparisonPresetSelect);
  buildValueControls($("[data-comparison-sliders]"), state.values, handleComparisonValuesChange);
  $("[data-comparison-values]").addEventListener("wa-after-show", drawComparisonCrossarm);
  $("[data-comparison-values]").addEventListener("wa-after-hide", drawComparisonCrossarm);
  $("[data-comparison-scenario]").addEventListener("wa-after-show", scheduleDrawCrossarm);
  $("[data-comparison-scenario]").addEventListener("wa-after-hide", scheduleDrawCrossarm);
  await renderComparison();
};

const buildSandboxScenarioAccordion = (container, scenarios, currentId, onSelect) => {
  container.innerHTML = "";

  scenarios.forEach((scenario) => {
    const row = document.createElement("div");
    row.className = `scenario-radio-row${scenario.id === currentId ? " selected" : ""}`;
    row.dataset.scenarioId = scenario.id;

    const radio = document.createElement("button");
    radio.className = "scenario-radio";
    radio.addEventListener("click", () => {
      container.querySelectorAll(".scenario-radio-row").forEach((r) => r.classList.remove("selected"));
      row.classList.add("selected");
      onSelect(scenario.id);
    });

    const details = document.createElement("wa-details");
    const dim = DIMENSIONS.find((d) => d.id === scenario.kdmaType);
    const kdmaLabel = dim ? dim.label : "";

    const descHtml = scenario.description
      .split("\n")
      .filter((p) => p.trim())
      .map((p) => `<p>${p}</p>`)
      .join("");

    const choicesHtml = scenario.choices
      .map(
        (c, i) =>
          `<div class="scenario-choice-card"><span class="choice-letter choice-${String.fromCharCode(97 + i)}">${String.fromCharCode(65 + i)}</span>${c.label}</div>`,
      )
      .join("");

    details.innerHTML = `
      <span slot="summary" class="accordion-summary">${scenario.title}${kdmaLabel ? `<span class="accordion-kdma-tag">${kdmaLabel}</span>` : ""}</span>
      <div class="accordion-scenario-body">
        <div class="accordion-scenario-description">${descHtml}</div>
        ${choicesHtml ? `<div class="scenario-choices">${choicesHtml}</div>` : ""}
      </div>
    `;

    details.addEventListener("wa-show", () => {
      container.querySelectorAll("wa-details").forEach((d) => {
        if (d !== details) d.hide();
      });
    });

    row.appendChild(radio);
    row.appendChild(details);
    container.appendChild(row);
  });
};

const initSandbox = async () => {
  buildSandboxScenarioAccordion(
    $("[data-sandbox-scenarios]"),
    SCENARIOS,
    state.scenarioId,
    handleSandboxScenarioChange,
  );
  buildPresetChips($("[data-sandbox-presets]"), state.presetId, handleSandboxPresetSelect);
  buildValueControls($("[data-sandbox-sliders]"), state.values, handleSandboxValuesChange);
  $("[data-sandbox-values]").addEventListener("wa-after-show", drawSandboxCrossarm);
  $("[data-sandbox-values]").addEventListener("wa-after-hide", drawSandboxCrossarm);
  $("[data-sandbox-scenarios]").addEventListener("wa-after-show", scheduleDrawSandboxCrossarm);
  $("[data-sandbox-scenarios]").addEventListener("wa-after-hide", scheduleDrawSandboxCrossarm);
  await renderSandbox();
};

const init = async () => {
  initScenario();
  await renderDeciderCard($("[data-decider-card]"));
  await renderBaselineCard($("[data-baseline-card]"));
  initSimpleValues();
  await initAlignment();
  await initComparison();
  await initSandbox();
  setupNextButtons();
  setupRevealElements();
  setupRevealObserver();
  setupTocObserver();
  setupTocClicks();
  window.addEventListener("resize", () => {
    drawComparisonCrossarm();
    drawSandboxCrossarm();
  });
};

ready.then(() => {
  state.scenarioId = SCENARIOS[0].id;
  state.presetId = PRESETS[0].id;
  state.values = { ...PRESETS[0].values };
  init();
});

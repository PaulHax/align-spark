import {
  SCENARIOS,
  DIMENSIONS,
  decide,
  ready,
  buildValueControls,
  setSliderValues,
  levelToSliderValue,
  sliderValueToLevel,
  buildScenarioAccordion,
  getDetailsOpenState,
  getScenario,
  choiceLetterHTML,
  scenarioDescriptionHTML,
  scenarioChoiceCardsHTML,
  deciderNodeHTML,
  decisionPanelHTML,
  formatLlm,
  formatAdm,
} from "./shared.js";

const state = {
  step: -1,
  scenarioId: null,
  values: {},
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const STEPS = [
  {
    id: "intro",
    heading: "AI Decisions You Can Trust",
    subtitle:
      "AI-powered decision makers carry bias from their training.<br>Personalized values can steer AIs so they make the right trade-offs.",
    zones: {},
  },
  {
    id: "scenario",
    heading: "Hard Choices",
    subtitle:
      "Some decisions have no right answer — only trade-offs shaped by what you value most.",
    zones: { scenario: "select" },
  },
  {
    id: "baseline",
    heading: "Hidden Bias",
    subtitle:
      "When I ask the AI to make a decision, the choice reflects the biases baked into its training — not your priorities.",
    zones: {
      scenario: "summary-labeled",
      "decider-baseline": true,
      "decision-baseline": true,
    },
  },
  {
    id: "values",
    heading: "Values are Priorities",
    subtitle:
      "Values resolve trade-offs in tough scenarios. Set yours and the decision maker will use them in its calculation.",
    zones: { values: "with-decider" },
  },
  {
    id: "alignment",
    heading: "Value Aligned AI",
    subtitle:
      "Now the decision maker uses your values alongside the scenario — aligning its choice to your priorities.",
    zones: {
      scenario: "summary-labeled",
      values: "single",
      connectors: "crossarm",
      "decider-aligned": true,
      "decision-aligned": true,
    },
  },
  {
    id: "comparison",
    heading: "Compare",
    subtitle: "Compare what the AI chooses with and without guiding values.",
    zones: {
      scenario: "summary-labeled",
      values: "single",
      connectors: "crossarm",
      "decider-baseline": true,
      "decider-aligned": true,
      "decision-baseline": true,
      "decision-aligned": true,
    },
  },
  {
    id: "sandbox",
    heading: "Experiment",
    subtitle: "Swap scenarios and adjust values to see when decisions shift.",
    zones: {
      scenario: "select-explore",
      values: "accordion-open",
      connectors: "crossarm",
      "decider-baseline": true,
      "decider-aligned": true,
      "decision-baseline": true,
      "decision-aligned": true,
    },
  },
  {
    id: "learn-more",
    heading: "Learn More",
    subtitle: "Explore the research and try the full interactive system.",
    zones: { "learn-more": true },
  },
];

const renderScenarioAccordion = (container) => {
  container.innerHTML = `<div class="scenario-accordion-container" data-scenario-accordion></div>`;
  buildScenarioAccordion(
    container.querySelector("[data-scenario-accordion]"),
    SCENARIOS,
    state.scenarioId,
    handleScenarioChange,
    { showKdmaTag: false, showChoicesInSummary: true },
  );
};

const scenarioSummaryPanelHTML = (scenario, { open = false } = {}) => {
  const descHtml = scenarioDescriptionHTML(scenario);
  const choicesHtml = scenarioChoiceCardsHTML(scenario);
  const choiceLetters = scenario.choices
    .map(
      (c, i) =>
        `<span class="summary-choice-item">${choiceLetterHTML(i, { colored: true })}<span class="summary-choice-label">${c.label}</span></span>`,
    )
    .join("");

  return `
    <wa-details class="baseline-scenario-panel" data-scenario-panel${open ? " open" : ""}>
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

const updateScenarioPanel = (container) => {
  const scenario = getScenario(state.scenarioId);
  const panel = container.querySelector("[data-scenario-panel]");
  const wasOpen = panel?.open ?? false;
  const wrapper = panel?.parentElement;
  if (wrapper) wrapper.innerHTML = scenarioSummaryPanelHTML(scenario, { open: wasOpen });
};

const scenarioKdmaLabel = (s) => {
  const dim = DIMENSIONS.find((d) => d.id === s.kdmaType);
  return dim?.label || "";
};

const scenarioOptionHTML = (s, showKdma) => {
  const endSlot = showKdma
    ? `<span class="option-kdma" slot="end">${scenarioKdmaLabel(s)}</span>`
    : "";
  return `<wa-option value="${s.id}"${showKdma ? ` label="${s.title}"` : ""}>${s.title}${endSlot}</wa-option>`;
};

const updateSelectEndSlot = (selectEl, scenarioId) => {
  const old = selectEl.querySelector('[slot="end"].select-kdma');
  if (old) old.remove();
  const scenario = getScenario(scenarioId || selectEl.value);
  const label = scenarioKdmaLabel(scenario);
  const span = document.createElement("span");
  span.slot = "end";
  span.className = "select-kdma";
  span.textContent = label;
  selectEl.appendChild(span);
};

const renderScenarioSelect = (
  container,
  {
    showLabel = false,
    showKdma = false,
    open = false,
    onChange = handleScenarioChange,
  } = {},
) => {
  const scenario = getScenario(state.scenarioId);

  container.innerHTML = `
    ${showLabel ? '<div class="flow-input-label">Input Scenario</div>' : ""}
    <div class="scenario-select-card">
      <wa-select class="scenario-select" value="${state.scenarioId}" data-scenario-select>
        ${SCENARIOS.map((s) => scenarioOptionHTML(s, showKdma)).join("")}
      </wa-select>
      <div class="scenario-select-panel-wrap">${scenarioSummaryPanelHTML(scenario, { open })}</div>
    </div>
  `;

  const selectEl = container.querySelector("[data-scenario-select]");
  if (showKdma) updateSelectEndSlot(selectEl);
  selectEl.addEventListener("change", (e) => {
    const newId = e.target.value;
    if (showKdma) updateSelectEndSlot(e.target, newId);
    onChange(newId);
    updateScenarioPanel(container);
  });
};

const renderScenarioSummary = (
  container,
  { showLabel = false, wasOpen = false } = {},
) => {
  const scenario = getScenario(state.scenarioId);
  const labelHtml = showLabel
    ? `<div class="flow-input-label">Input Scenario</div>`
    : "";
  container.innerHTML = `${labelHtml}${scenarioSummaryPanelHTML(scenario, { open: wasOpen })}`;
};

const renderDeciderBaseline = async (container) => {
  const result = await decide(state.scenarioId, "baseline");
  const llm = formatLlm(result) || "Language Model";
  container.innerHTML = `
    <div class="decider-card">
      ${deciderNodeHTML({ icon: "&#x1F916;", label: "Baseline Language Model", modelName: llm })}
    </div>
  `;
};

const renderDecisionBaseline = async (container) => {
  const result = await decide(state.scenarioId, "baseline");
  const scenario = getScenario(state.scenarioId);
  const idx = scenario.choices.findIndex((c) => c.id === result.choiceId);
  const openState = getDetailsOpenState(container);
  container.innerHTML = decisionPanelHTML({
    letterHTML: choiceLetterHTML(idx, { colored: true, decision: true }),
    decision: result.decision,
    justification: result.justification,
    icon: "&#x1F916;",
    isOpen: openState?.[0],
  });
};

const renderValuesWithDecider = (container) => {
  container.innerHTML = `
    <div class="values-centered-flow">
      <div class="flow-input-label">Input Values</div>
      <wa-details class="values-accordion values-fixed-open values-no-summary" open>
        <div class="values-sliders" data-simple-sliders></div>
      </wa-details>
      <div class="values-adm-stem"></div>
      ${deciderNodeHTML({ icon: "&#x1F9ED;", label: "Value Aligned Decider", modelName: "Alignment Algorithm", className: "aligned-decider-node" })}
    </div>
  `;
  container
    .querySelector("wa-details")
    .addEventListener("wa-hide", (e) => e.preventDefault());
  buildValueControls(
    container.querySelector("[data-simple-sliders]"),
    state.values,
    handleSimpleValuesChange,
  );
};

const renderValueSingle = (container) => {
  const scenario = getScenario(state.scenarioId);
  const dim = DIMENSIONS.find((d) => d.id === scenario.kdmaType);
  if (!dim) return;

  const level = state.values[dim.id] || "medium";
  const sliderVal = levelToSliderValue(level);
  const LEVEL_LABELS = { 0: "Low", 50: "Medium", 100: "High" };

  container.innerHTML = `
    <div class="flow-input-label">Input Value</div>
    <wa-details class="values-single">
      <span slot="summary" class="single-slider-summary" data-single-sliders>
        <div class="slider-row">
          <div class="slider-label">${dim.label}</div>
          <wa-slider min="0" max="100" step="50" value="${sliderVal}" data-dim="${dim.id}" with-markers></wa-slider>
          <div class="slider-level" data-level-label="${dim.id}">${LEVEL_LABELS[sliderVal]}</div>
        </div>
      </span>
    </wa-details>
  `;

  const details = container.querySelector("wa-details");
  details.addEventListener("wa-show", (e) => e.preventDefault());

  const slidersContainer = container.querySelector("[data-single-sliders]");
  slidersContainer.addEventListener("input", (e) => {
    const range = e.target.closest("wa-slider");
    if (!range) return;
    const val = Number(range.value);
    const label = slidersContainer.querySelector(
      `[data-level-label="${dim.id}"]`,
    );
    if (label) label.textContent = LEVEL_LABELS[val] || "Medium";
    const newValues = { ...state.values, [dim.id]: sliderValueToLevel(val) };
    handleValuesChange(newValues);
  });
};

const renderValuesAccordion = (container, { open = false } = {}) => {
  container.innerHTML = `
    <div class="flow-input-label">Input Values</div>
    <wa-details class="values-accordion values-fixed-open values-no-summary"${open ? " open" : ""}>
      <span slot="summary">Input Values</span>
      <div class="values-sliders" data-values-sliders></div>
    </wa-details>
  `;
  container
    .querySelector("wa-details")
    .addEventListener("wa-hide", (e) => e.preventDefault());
  buildValueControls(
    container.querySelector("[data-values-sliders]"),
    state.values,
    handleValuesChange,
  );
};

const renderCrossarmConnector = (container) => {
  container.innerHTML = `<svg class="crossarm-overlay"></svg>`;
};

const alignedModelName = (r) =>
  [formatAdm(r), formatLlm(r)].filter(Boolean).join(" · ");

const renderAlignedDecider = async (container) => {
  const result = await decide(state.scenarioId, "aligned", state.values);
  container.innerHTML = `
    <div class="aligned-decider-card">
      ${deciderNodeHTML({ icon: "&#x1F9ED;", label: "Value Aligned Decider", modelName: alignedModelName(result), className: "aligned-decider-node" })}
    </div>
  `;
};

const renderAlignedDecision = async (container) => {
  const result = await decide(state.scenarioId, "aligned", state.values);
  const scenario = getScenario(state.scenarioId);
  const idx = scenario.choices.findIndex((c) => c.id === result.choiceId);
  const wasOpen = container.querySelector(".decision-panel")?.open;
  container.innerHTML = `
    <div class="aligned-decision-card">
      <div class="aligned-decision-stem"></div>
      ${decisionPanelHTML({
        letterHTML: choiceLetterHTML(idx, { colored: true, decision: true }),
        decision: result.decision,
        justification: result.justification,
        icon: "&#x1F9ED;",
        isOpen: wasOpen,
      })}
    </div>
  `;
};

const renderComparisonDecisions = (container, aligned, baseline, scenario) => {
  const openState = getDetailsOpenState(container);
  const alignedIdx = scenario.choices.findIndex(
    (c) => c.id === aligned.choiceId,
  );
  const baselineIdx = scenario.choices.findIndex(
    (c) => c.id === baseline.choiceId,
  );

  return `
    <div class="decision-comparison">
      <div class="decision-col">
        ${decisionPanelHTML({
          letterHTML: choiceLetterHTML(baselineIdx, {
            colored: true,
            decision: true,
          }),
          decision: baseline.decision,
          justification: baseline.justification,
          icon: "&#x1F916;",
          isOpen: openState?.[0],
        })}
      </div>
      <div class="decision-col">
        ${decisionPanelHTML({
          letterHTML: choiceLetterHTML(alignedIdx, {
            colored: true,
            decision: true,
          }),
          decision: aligned.decision,
          justification: aligned.justification,
          icon: "&#x1F9ED;",
          isOpen: openState?.[1],
        })}
      </div>
    </div>
  `;
};

const drawCrossarm = (svg, flow, sourceEl, targetEl) => {
  if (!sourceEl || !targetEl) return;
  const fr = flow.getBoundingClientRect();
  const sr = sourceEl.getBoundingClientRect();
  const ar = targetEl.getBoundingClientRect();

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

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", d);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "var(--border)");
  path.setAttribute("stroke-width", "2");

  svg.innerHTML = "";
  svg.appendChild(path);
};

const scheduleDrawCrossarm = (zone) => {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      const svg = zone.querySelector(".comparison-crossarm");
      const flow = zone.querySelector(".comparison-flow");
      if (!svg || !flow) return;

      const variant = zone.dataset.variant;
      if (variant === "sandbox") {
        const selectedRow = flow.querySelector(".scenario-radio-row.selected");
        const radio = selectedRow?.querySelector(".scenario-radio");
        const alignedDecider = flow.querySelector(
          "[data-comp-aligned-decider] .aligned-decider-node",
        );
        if (radio) drawCrossarm(svg, flow, selectedRow, alignedDecider);
      } else {
        const scenarioPanel = flow.querySelector(
          "[data-comp-scenario] wa-details",
        );
        const alignedDecider = flow.querySelector(
          "[data-comp-aligned-decider] .aligned-decider-node",
        );
        drawCrossarm(svg, flow, scenarioPanel, alignedDecider);
      }
    }),
  );
};

const drawZoneCrossarm = () => {
  const svg = $(".zone-connectors .crossarm-overlay");
  if (!svg) return;
  const content = $(".step-content");
  const step = STEPS[state.step];
  if (!step?.zones?.connectors) return;

  let sourceEl;
  if (step.zones.scenario?.startsWith("select")) {
    sourceEl = $('[data-zone="scenario"] .scenario-select-card');
  } else {
    sourceEl = $('[data-zone="scenario"] wa-details');
  }
  const targetEl = $('[data-zone="decider-aligned"] .aligned-decider-node');
  if (sourceEl && targetEl && content) {
    drawCrossarm(svg, content, sourceEl, targetEl);
  }
};

const scheduleDrawZoneCrossarm = () => {
  requestAnimationFrame(() => requestAnimationFrame(drawZoneCrossarm));
};

const wireCrossarmListeners = (container, ...elements) => {
  elements.forEach((el) => {
    el.addEventListener("wa-after-show", () => scheduleDrawCrossarm(container));
    el.addEventListener("wa-after-hide", () => scheduleDrawCrossarm(container));
  });
};

const renderComparisonFlow = async (container, variant) => {
  const prevValuesOpen =
    container.querySelector("[data-comp-values]")?.open ??
    container.querySelector("[data-comp-sandbox-values]")?.open ??
    false;
  const prevScenarioOpen =
    container.querySelector("[data-comp-scenario] wa-details")?.open ?? false;

  container.dataset.variant = variant;
  const isSandbox = variant === "sandbox";

  const scenario = getScenario(state.scenarioId);
  const baseline = await decide(state.scenarioId, "baseline");
  const aligned = await decide(state.scenarioId, "aligned", state.values);

  const baselineLlm = formatLlm(baseline) || "Language Model";

  const scenarioColHtml = isSandbox
    ? `<div class="sandbox-scenario-accordion" data-comp-sandbox-scenarios></div>`
    : `<div class="flow-input-label">Scenario</div><div data-comp-scenario></div>`;

  const valuesColHtml = isSandbox
    ? `<wa-details class="values-accordion" open data-comp-sandbox-values>
        <span slot="summary">Your Values</span>
        <div class="values-sliders" data-comp-sandbox-sliders></div>
      </wa-details>
      <div class="sandbox-values-stem"></div>`
    : `<div class="flow-input-label">Your Values</div>
      <wa-details class="values-accordion"${prevValuesOpen ? " open" : ""} data-comp-values>
        <span slot="summary">Your Values</span>
        <div class="values-sliders" data-comp-sliders></div>
      </wa-details>`;

  const decisionsHtml = renderComparisonDecisions(
    container,
    aligned,
    baseline,
    scenario,
  );

  container.innerHTML = `
    <div class="comparison-flow">
      <div class="comparison-flow-inputs">
        <div class="comparison-input-col">${scenarioColHtml}</div>
        <div class="comparison-input-col">${valuesColHtml}</div>
      </div>
      <div class="comparison-connectors">
        <div class="comparison-stem-cell"><div class="comparison-stem"></div></div>
        <div class="comparison-stem-cell"${isSandbox ? ' style="display:none"' : ""}><div class="comparison-stem"></div></div>
      </div>
      <svg class="comparison-crossarm" data-comp-crossarm></svg>
      <div class="comparison-flow-deciders">
        <div class="comparison-decider-cell" data-comp-baseline-decider>
          ${deciderNodeHTML({ icon: "&#x1F916;", label: "Baseline Language Model", modelName: baselineLlm })}
        </div>
        <div class="comparison-decider-cell" data-comp-aligned-decider>
          ${deciderNodeHTML({ icon: "&#x1F9ED;", label: "Value Aligned Decider", modelName: alignedModelName(aligned), className: "aligned-decider-node" })}
        </div>
      </div>
      <div class="comparison-flow-stems">
        <div class="comparison-stem-cell"><div class="comparison-stem"></div></div>
        <div class="comparison-stem-cell"><div class="comparison-stem"></div></div>
      </div>
      <div class="comparison-flow-decisions" data-comp-decisions>${decisionsHtml}</div>
    </div>
  `;

  if (isSandbox) {
    buildSandboxScenarioAccordion(
      container.querySelector("[data-comp-sandbox-scenarios]"),
      SCENARIOS,
      state.scenarioId,
      handleSandboxScenarioChange,
    );
    buildValueControls(
      container.querySelector("[data-comp-sandbox-sliders]"),
      state.values,
      handleSandboxValuesChange,
    );
    wireCrossarmListeners(
      container,
      container.querySelector("[data-comp-sandbox-values]"),
      container.querySelector("[data-comp-sandbox-scenarios]"),
    );
  } else {
    const compScenario = container.querySelector("[data-comp-scenario]");
    renderScenarioSummary(compScenario, { wasOpen: prevScenarioOpen });
    buildValueControls(
      container.querySelector("[data-comp-sliders]"),
      state.values,
      handleComparisonValuesChange,
    );
    wireCrossarmListeners(
      container,
      container.querySelector("[data-comp-values]"),
      compScenario,
    );
  }

  scheduleDrawCrossarm(container);
};

const buildSandboxScenarioAccordion = (
  container,
  scenarios,
  currentId,
  onSelect,
) => {
  container.innerHTML = "";

  scenarios.forEach((scenario) => {
    const row = document.createElement("div");
    row.className = `scenario-radio-row${scenario.id === currentId ? " selected" : ""}`;
    row.dataset.scenarioId = scenario.id;

    const radio = document.createElement("button");
    radio.className = "scenario-radio";
    radio.addEventListener("click", () => {
      container
        .querySelectorAll(".scenario-radio-row")
        .forEach((r) => r.classList.remove("selected"));
      row.classList.add("selected");
      onSelect(scenario.id);
    });

    const details = document.createElement("wa-details");
    const dim = DIMENSIONS.find((d) => d.id === scenario.kdmaType);
    const kdmaLabel = dim ? dim.label : "";

    const descHtml = scenarioDescriptionHTML(scenario);
    const choicesHtml = scenarioChoiceCardsHTML(scenario);

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

const refreshComparisonZone = async () => {
  const zone = $('[data-zone="comparison"]');
  if (!zone.classList.contains("visible")) return;
  await renderComparisonFlow(zone, zone.dataset.variant);
};

const handleScenarioChange = async (id) => {
  state.scenarioId = id;
};

const renderAlignedZones = async () => {
  await renderAlignedDecider($('[data-zone="decider-aligned"]'));
  await renderAlignedDecision($('[data-zone="decision-aligned"]'));
};

const makeValuesHandler = (afterUpdate) => async (newValues) => {
  state.values = newValues;
  syncAllSliders();
  if (afterUpdate) await afterUpdate();
};

const handleSimpleValuesChange = makeValuesHandler();
const handleValuesChange = makeValuesHandler(renderAlignedZones);
const handleComparisonValuesChange = makeValuesHandler(refreshComparisonZone);
const handleSandboxValuesChange = makeValuesHandler(refreshComparisonZone);

const SLIDER_SELECTORS = ["simple", "values", "single", "comp", "comp-sandbox"];

const syncAllSliders = () => {
  SLIDER_SELECTORS.forEach((selector) => {
    const sliders = $(`[data-${selector}-sliders]`);
    if (sliders) setSliderValues(sliders, state.values);
  });
};

const handleExploreScenarioChange = async (id) => {
  state.scenarioId = id;
  await Promise.all([
    renderDeciderBaseline($('[data-zone="decider-baseline"]')),
    renderDecisionBaseline($('[data-zone="decision-baseline"]')),
    renderAlignedDecider($('[data-zone="decider-aligned"]')),
    renderAlignedDecision($('[data-zone="decision-aligned"]')),
  ]);
  scheduleDrawZoneCrossarm();
};

const handleSandboxScenarioChange = async (id) => {
  state.scenarioId = id;
  await refreshComparisonZone();
};

const renderZone = async (zoneId, variant) => {
  const zone = $(`[data-zone="${zoneId}"]`);
  switch (zoneId) {
    case "scenario":
      if (variant === "accordion") renderScenarioAccordion(zone);
      else if (variant === "select") renderScenarioSelect(zone, { open: true });
      else if (variant === "select-explore")
        renderScenarioSelect(zone, {
          showLabel: true,
          showKdma: true,
          onChange: handleExploreScenarioChange,
        });
      else
        renderScenarioSummary(zone, {
          showLabel: variant === "summary-labeled",
        });
      break;
    case "decider-baseline":
      await renderDeciderBaseline(zone);
      break;
    case "decision-baseline":
      await renderDecisionBaseline(zone);
      break;
    case "values":
      if (variant === "with-decider") renderValuesWithDecider(zone);
      else if (variant === "single") renderValueSingle(zone);
      else renderValuesAccordion(zone, { open: variant === "accordion-open" });
      break;
    case "connectors":
      renderCrossarmConnector(zone);
      break;
    case "decider-aligned":
      await renderAlignedDecider(zone);
      break;
    case "decision-aligned":
      await renderAlignedDecision(zone);
      break;
    case "comparison":
      await renderComparisonFlow(zone, variant);
      break;
    case "learn-more":
      break;
  }
};

const withViewTransition = async (
  applyChanges,
  { staying, isMorph, forward },
) => {
  if (!document.startViewTransition) {
    await applyChanges();
    return;
  }

  staying.forEach((zoneId) => {
    $(`[data-zone="${zoneId}"]`).style.viewTransitionName = `zone-${zoneId}`;
  });

  if (isMorph) {
    document.documentElement.classList.add("morph-transition");
  } else {
    document.documentElement.classList.toggle("backward", !forward);
  }

  const transition = document.startViewTransition(() => applyChanges());
  await transition.finished;

  staying.forEach((zoneId) => {
    $(`[data-zone="${zoneId}"]`).style.viewTransitionName = "";
  });
  document.documentElement.classList.remove("backward", "morph-transition");
};

const goToStep = async (index) => {
  if (index < 0 || index >= STEPS.length || index === state.step) return;

  const forward = index > state.step;
  const isInitial = state.step < 0;
  const prevStep = state.step >= 0 ? STEPS[state.step] : { zones: {} };
  const nextStep = STEPS[index];

  const prevZones = new Set(Object.keys(prevStep.zones));
  const nextZones = new Set(Object.keys(nextStep.zones));

  const leaving = [...prevZones].filter((z) => !nextZones.has(z));
  const entering = [...nextZones].filter((z) => !prevZones.has(z));
  const staying = [...nextZones].filter((z) => prevZones.has(z));

  const prevIndex = state.step;
  state.step = index;
  const isMorph =
    (prevIndex === 3 && index === 4) ||
    (prevIndex === 4 && index === 3) ||
    (prevIndex === 4 && index === 5) ||
    (prevIndex === 5 && index === 4);

  const applyChanges = async () => {
    const svg = $(".zone-connectors .crossarm-overlay");
    if (svg) svg.innerHTML = "";
    $(".guide-viewport").dataset.step = index;
    $("[data-step-heading]").textContent = nextStep.heading;
    $("[data-step-subtitle]").innerHTML = nextStep.subtitle;
    $("[data-prev]").hidden = index === 0;
    $("[data-next]").hidden = index === STEPS.length - 1;
    $("[data-scroll-hint]").hidden = index === STEPS.length - 1;

    $$(".toc-pill").forEach((pill) => {
      pill.classList.toggle("active", pill.dataset.toc === nextStep.id);
    });

    leaving.forEach((zoneId) => {
      $(`[data-zone="${zoneId}"]`).classList.remove("visible");
    });

    entering.forEach((zoneId) => {
      $(`[data-zone="${zoneId}"]`).classList.add("visible");
    });

    const renderPromises = [];
    entering.forEach((zoneId) => {
      renderPromises.push(renderZone(zoneId, nextStep.zones[zoneId]));
    });
    staying.forEach((zoneId) => {
      if (prevStep.zones[zoneId] !== nextStep.zones[zoneId]) {
        renderPromises.push(renderZone(zoneId, nextStep.zones[zoneId]));
      }
    });
    await Promise.all(renderPromises);
  };

  if (isInitial) {
    await applyChanges();
  } else {
    await withViewTransition(applyChanges, { staying, isMorph, forward });
  }

  const compZone = $('[data-zone="comparison"]');
  if (compZone.classList.contains("visible")) scheduleDrawCrossarm(compZone);
  scheduleDrawZoneCrossarm();
};

const setupNav = () => {
  $("[data-prev]").addEventListener("click", () => goToStep(state.step - 1));
  $("[data-next]").addEventListener("click", () => goToStep(state.step + 1));

  $$(".toc-pill").forEach((pill, i) => {
    pill.addEventListener("click", () => goToStep(i));
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      goToStep(state.step + 1);
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      goToStep(state.step - 1);
    }
  });

  let wheelCooldown = false;
  let edgeCount = 0;
  let lastEdgeDir = 0;
  const content = $(".step-content");
  $(".guide-viewport").addEventListener(
    "wheel",
    (e) => {
      if (wheelCooldown) return;
      const threshold = 30;
      if (Math.abs(e.deltaY) < threshold) return;
      const dir = e.deltaY > 0 ? 1 : -1;
      const atTop = content.scrollTop <= 0;
      const atBottom =
        content.scrollTop + content.clientHeight >= content.scrollHeight - 1;
      const atEdge = (dir > 0 && atBottom) || (dir < 0 && atTop);
      const isScrollable = content.scrollHeight > content.clientHeight + 2;
      if (!atEdge) {
        edgeCount = 0;
        lastEdgeDir = 0;
        return;
      }
      if (isScrollable && (dir !== lastEdgeDir || edgeCount < 1)) {
        edgeCount = dir === lastEdgeDir ? edgeCount + 1 : 1;
        lastEdgeDir = dir;
        return;
      }
      edgeCount = 0;
      lastEdgeDir = 0;
      wheelCooldown = true;
      setTimeout(() => {
        wheelCooldown = false;
      }, 600);
      goToStep(state.step + dir);
    },
    { passive: true },
  );
};

const init = async () => {
  setupNav();
  window.addEventListener("resize", () => {
    const zone = $('[data-zone="comparison"]');
    if (zone.classList.contains("visible")) scheduleDrawCrossarm(zone);
    scheduleDrawZoneCrossarm();
  });
  $(".step-content").addEventListener(
    "wa-after-show",
    scheduleDrawZoneCrossarm,
  );
  $(".step-content").addEventListener(
    "wa-after-hide",
    scheduleDrawZoneCrossarm,
  );
  goToStep(0);
};

ready.then(() => {
  state.scenarioId = SCENARIOS[0].id;
  state.values = Object.fromEntries(DIMENSIONS.map((d) => [d.id, "medium"]));
  init();
});

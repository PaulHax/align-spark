import "https://cdn.jsdelivr.net/npm/@awesome.me/webawesome@3.2.1/dist-cdn/components/tag/tag.js";
import "https://cdn.jsdelivr.net/npm/@awesome.me/webawesome@3.2.1/dist-cdn/components/spinner/spinner.js";
import "https://cdn.jsdelivr.net/npm/@awesome.me/webawesome@3.2.1/dist-cdn/components/details/details.js";
import "https://cdn.jsdelivr.net/npm/@awesome.me/webawesome@3.2.1/dist-cdn/components/card/card.js";
import "https://cdn.jsdelivr.net/npm/@awesome.me/webawesome@3.2.1/dist-cdn/components/button/button.js";
import "https://cdn.jsdelivr.net/npm/@awesome.me/webawesome@3.2.1/dist-cdn/components/badge/badge.js";
import "https://cdn.jsdelivr.net/npm/@awesome.me/webawesome@3.2.1/dist-cdn/components/select/select.js";
import "https://cdn.jsdelivr.net/npm/@awesome.me/webawesome@3.2.1/dist-cdn/components/option/option.js";
import "https://cdn.jsdelivr.net/npm/@awesome.me/webawesome@3.2.1/dist-cdn/components/radio-group/radio-group.js";
import "https://cdn.jsdelivr.net/npm/@awesome.me/webawesome@3.2.1/dist-cdn/components/radio/radio.js";
import "https://cdn.jsdelivr.net/npm/@awesome.me/webawesome@3.2.1/dist-cdn/components/tooltip/tooltip.js";

import { decide, ready } from "./align-engine.js";

const { scenarios: SCENARIOS, presets: PRESETS, dimensions: DIMENSIONS } = await ready;

export { SCENARIOS, PRESETS, DIMENSIONS, decide, ready };

const LEVEL_LABELS = { low: "Low", medium: "Med", high: "High" };

const ATTRIBUTE_DESCRIPTIONS = {
  affiliation:
    "Affiliation refers to the group membership of patients with respect to you, a US soldier medic. The affiliation focus score reflects affiliation alone. Factors such as the medical need of the patients do not affect the score.",
  merit:
    "Merit refers to the moral deservingness of the patient. Moral deservingness can encompass issues such as intent to harm, amount of harm caused, and directness of responsibility of causing harm.",
  personal_safety:
    "Personal safety risk is narrowly defined to focus on physical danger from enemy fire. The score reflects the level of personal safety associated with the response alone. Factors such as the medical need of the patient do not affect the score.",
  search:
    "A high tendency to search vs stay means being more willing to quickly move on from the current patient in order to treat or search for another patient. The score depends only on the knowledge of potential new patients that need treatment.",
  ingroup_bias:
    "Ingroup bias is the tendency to favor people who belong to the same groups that you do. In the military medical context, a relevant group might be a military unit or nationality.",
  moral_deservingness:
    "Moral judgment is the tendency to consider moral deservingness or culpability, and to reward moral deservingness.",
  maximization:
    "Emphasis on gathering information before acting, then maximizing results such as lives saved. Low maximization prioritizes speed and action over information gathering.",
  risk_aversion:
    "Risk aversion is a tendency to avoid uncertainty and prefer actions whose expected outcomes have a lower range of variation.",
  quality_of_life:
    "Prioritizing quality of life means treating the person who will be able-bodied and have good living quality post treatment.",
  perceived_quantity_of_lives_saved:
    "High value means using perceived survival rate of total lives saved to inform treatment selection rather than always treating the worst individual injury.",
  medical_urgency:
    "Based solely on severity of physical condition and likelihood of benefiting from treatment, without considering affiliation or merit.",
  fairness:
    "Fairness is treating different people in the same way, such that no person is valued more based on their group membership, identity, or prior actions.",
  protocol_focus:
    "Protocol focus is the tendency to prioritize based on a protocol or rule, instead of considering specific context factors as reasons to make exceptions.",
  utilitarianism:
    "Utilitarianism is the priority placed on maximizing the net positive outcome of a group of people.",
  moral_desert:
    "Moral desert refers to rewarding moral actions and punishing immoral misdeeds, related to concepts of justice.",
  continuation_of_care:
    "Continuing care means continuing medical care for current patients rather than switching to new patients, maintaining continuity of treatment.",
};

export function simulateThinking(container, ms = 500) {
  container.innerHTML = `
    <div class="spinner-overlay">
      <wa-spinner></wa-spinner>
      <span>Model is thinking…</span>
    </div>
  `;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function buildPresetChips(container, currentPreset, onSelect) {
  container.innerHTML = "";
  container.classList.add("preset-chips");
  PRESETS.forEach((preset) => {
    const chip = document.createElement("button");
    chip.className = `preset-chip${preset.id === currentPreset ? " active" : ""}`;
    chip.textContent = preset.label;
    chip.title = preset.tagline;
    chip.addEventListener("click", () => onSelect(preset.id));
    container.appendChild(chip);
  });
}

const INFO_SVG = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/><text x="8" y="12" text-anchor="middle" fill="currentColor" font-size="11" font-weight="600" font-family="inherit">i</text></svg>';

let infoUid = 0;
const bodyTooltips = [];

function cleanupBodyTooltips() {
  bodyTooltips.forEach((tt) => tt.remove());
  bodyTooltips.length = 0;
}

export function appendTooltipToBody(iconId, description) {
  const tooltip = document.createElement("wa-tooltip");
  tooltip.setAttribute("for", iconId);
  tooltip.textContent = description;
  document.body.appendChild(tooltip);
  bodyTooltips.push(tooltip);
}

export function attributeInfoHTML(dim) {
  const description = ATTRIBUTE_DESCRIPTIONS[dim.id] || dim.description || "";
  if (!description) return "";
  const infoId = `attr-info-${dim.id}-${infoUid++}`;
  return `<span class="attribute-info" id="${infoId}" data-description="${description.replace(/"/g, "&quot;")}" aria-label="About ${dim.label}">${INFO_SVG}</span>`;
}

export function buildValueControls(container, values, onChange) {
  container.innerHTML = "";
  container.classList.add("attribute-picker");
  cleanupBodyTooltips();
  const LEVELS = ["low", "medium", "high"];
  DIMENSIONS.forEach((dim) => {
    const level = values[dim.id] || "low";
    const infoHTML = attributeInfoHTML(dim);
    const row = document.createElement("div");
    row.className = "attribute-row";
    row.innerHTML = `
      <div class="attribute-label">${dim.label}${infoHTML}</div>
      <wa-radio-group value="${level}" data-dim="${dim.id}" orientation="horizontal">
        ${LEVELS.map((l) => `<wa-radio appearance="button" value="${l}">${LEVEL_LABELS[l]}</wa-radio>`).join("")}
      </wa-radio-group>
    `;
    container.appendChild(row);
  });
  container.querySelectorAll(".attribute-info[id]").forEach((icon) => {
    appendTooltipToBody(icon.id, icon.dataset.description);
  });

  container.addEventListener("change", (e) => {
    const group = e.target.closest("wa-radio-group");
    if (!group) return;
    onChange(getCurrentValues(container));
  });
}

export function setPickerValues(container, values) {
  DIMENSIONS.forEach((dim) => {
    const level = values[dim.id] || "low";
    const group = container.querySelector(`wa-radio-group[data-dim="${dim.id}"]`);
    if (group) group.value = level;
  });
}

export function highlightAttribute(container, kdmaId) {
  container.querySelectorAll(".attribute-row").forEach((row) => {
    const group = row.querySelector("wa-radio-group");
    row.classList.toggle("active", group?.dataset.dim === kdmaId);
  });
}

export function getCurrentValues(pickerContainer) {
  const values = {};
  pickerContainer.querySelectorAll("wa-radio-group").forEach((group) => {
    values[group.dataset.dim] = group.value || "medium";
  });
  return values;
}

export function buildScenarioSelector(container, currentId, onSelect) {
  container.innerHTML = "";
  SCENARIOS.forEach((scenario) => {
    const dim = DIMENSIONS.find((d) => d.id === scenario.kdmaType);
    const kdmaLabel = dim ? dim.label : "";
    const card = document.createElement("div");
    card.className = `scenario-card${scenario.id === currentId ? " active" : ""}`;
    card.innerHTML = `<div class="scenario-card-title">${scenario.title}${kdmaLabel ? `<span class="scenario-card-kdma">${kdmaLabel}</span>` : ""}</div>`;
    card.addEventListener("click", () => onSelect(scenario.id));
    container.appendChild(card);
  });
}

export function buildScenarioAccordion(container, scenarios, currentId, onSelect, { showKdmaTag = true, showChoicesInSummary = false } = {}) {
  container.innerHTML = "";

  scenarios.forEach((scenario) => {
    const details = document.createElement("wa-details");
    details.dataset.scenarioId = scenario.id;
    if (scenario.id === currentId) details.setAttribute("open", "");
    if (showChoicesInSummary) details.classList.add("baseline-scenario-panel");

    const dim = DIMENSIONS.find((d) => d.id === scenario.kdmaType);
    const kdmaLabel = dim ? dim.label : "";

    const descHtml = scenarioDescriptionHTML(scenario);
    const choicesHtml = scenarioChoiceCardsHTML(scenario);

    const tagHtml = showKdmaTag && kdmaLabel ? `<span class="accordion-kdma-tag">${kdmaLabel}</span>` : "";
    const summaryChoicesHtml = showChoicesInSummary
      ? `<span class="accordion-summary-choices">${scenario.choices.map((c, i) => `<span class="summary-choice-item">${choiceLetterHTML(i)}<span class="summary-choice-label">${c.label}</span></span>`).join("")}</span>`
      : "";
    details.innerHTML = `
      <span slot="summary" class="accordion-summary"><span class="accordion-summary-title">${scenario.title}</span>${tagHtml}${summaryChoicesHtml}</span>
      <div class="accordion-scenario-body">
        <div class="accordion-scenario-description">${descHtml}</div>
        ${choicesHtml ? `<div class="scenario-choices">${choicesHtml}</div>` : ""}
      </div>
    `;
    container.appendChild(details);
  });

  let activeId = currentId;

  container.addEventListener("wa-show", (e) => {
    const target = e.target.closest("wa-details");
    if (!target) return;
    activeId = target.dataset.scenarioId;
    container.querySelectorAll("wa-details").forEach((d) => {
      if (d !== target && d.open) d.open = false;
    });
    onSelect(activeId);
  });

  container.addEventListener("wa-hide", (e) => {
    const target = e.target.closest("wa-details");
    if (target && target.dataset.scenarioId === activeId) {
      e.preventDefault();
    }
  });
}

const ADM_DISPLAY_NAMES = {
  phase2_pipeline_zeroshot_comparative_regression: "Comparative Regression",
};

export function formatLlm(result) {
  return result.llmBackbone?.split("/").pop() || "";
}

export function formatAdm(result) {
  return ADM_DISPLAY_NAMES[result.admName] || result.admName || "";
}

export function choiceLetterHTML(index, { colored = false, decision = false } = {}) {
  if (index < 0) return "";
  const letter = String.fromCharCode(65 + index);
  const colorClass = colored ? ` choice-${String.fromCharCode(97 + index)}` : "";
  const decisionClass = decision ? " decision-choice-letter" : "";
  return `<span class="choice-letter${decisionClass}${colorClass}">${letter}</span>`;
}

export function scenarioDescriptionHTML(scenario) {
  return scenario.description
    .split("\n")
    .filter((p) => p.trim())
    .map((p) => `<p>${p}</p>`)
    .join("");
}

export function scenarioChoiceCardsHTML(scenario) {
  return scenario.choices
    .map((c, i) =>
      `<div class="scenario-choice-card">${choiceLetterHTML(i)}${c.label}</div>`,
    )
    .join("");
}

export function deciderNodeHTML({ icon, label, modelName, className = "decider-node" }) {
  return `
    <div class="${className}">
      <div class="decider-node-icon">${icon}</div>
      <div class="decider-node-text">
        <div class="decider-label">${label}</div>
        <div class="decider-model-name">${modelName}</div>
      </div>
    </div>
  `;
}

export function decisionPanelHTML({ letterHTML, decision, justification, icon = "", isOpen = false }) {
  const panelHtml = `
    <wa-details class="decision-panel"${isOpen ? " open" : ""}>
      <span slot="summary" class="decision-panel-summary">
        <span class="decision-panel-choice">${letterHTML}${decision}</span>
        <span class="decision-panel-justification-preview">Justification: ${justification}</span>
      </span>
      <div class="decision-rationale">
        <div class="decision-rationale-label">Justification</div>
        ${justification}
      </div>
    </wa-details>
  `;
  if (!icon) return panelHtml;
  return `<div class="decision-panel-wrap">${panelHtml}<span class="decision-panel-badge">${icon}</span></div>`;
}

export function renderDecisionComparison(container, baseline, aligned, scenario, openState) {
  const changed = baseline.choiceId !== aligned.choiceId;
  const baselineLlm = formatLlm(baseline);
  const alignedAdm = formatAdm(aligned);
  const alignedLlm = formatLlm(aligned);
  const baseOpen = openState?.[0] ? " open" : "";
  const alignedOpen = openState?.[1] ? " open" : "";
  const baselineIdx = scenario.choices.findIndex((c) => c.id === baseline.choiceId);
  const alignedIdx = scenario.choices.findIndex((c) => c.id === aligned.choiceId);
  container.innerHTML = `
    <div class="decision-comparison">
      <div class="decision-col">
        <div class="eyebrow">Unaligned Language Model</div>
        <div class="decision-model-info">${baselineLlm}</div>
        <div class="decision-choice">${choiceLetterHTML(baselineIdx, { decision: true })}${baseline.decision}</div>
        <wa-details summary="Justification" appearance="plain" class="decision-rationale-details"${baseOpen}><div class="decision-rationale">${baseline.justification}</div></wa-details>
      </div>
      <div class="comparison-divider">
        <div class="divider-line"></div>
        <div class="comparison-badge ${changed ? "changed" : "same"}">${changed ? "Changed" : "Same"}</div>
        <div class="divider-line"></div>
      </div>
      <div class="decision-col">
        <div class="eyebrow">Value Aligned Decider</div>
        <div class="decision-model-info">${alignedAdm} · ${alignedLlm}</div>
        <div class="decision-choice">${choiceLetterHTML(alignedIdx, { decision: true })}${aligned.decision}</div>
        <wa-details summary="Justification" appearance="plain" class="decision-rationale-details"${alignedOpen}><div class="decision-rationale">${aligned.justification}</div></wa-details>
      </div>
    </div>
  `;
}

export function renderScenarioDescription(container, scenario) {
  const parts = scenario.description.split("\n\n");
  const intro = parts[0];
  const choiceParts = parts.slice(1);

  container.innerHTML = `
    <div class="scenario-intro">${intro}</div>
    ${choiceParts.length > 0 ? `
      <div class="scenario-choices-group">
        <div class="choices-label">The Choices</div>
        <div class="scenario-choices">
          ${choiceParts.map((p, i) => `<div class="scenario-choice-card">${choiceLetterHTML(i)}${p}</div>`).join("")}
        </div>
      </div>` : ""}
  `;
}

export function getDetailsOpenState(container) {
  const details = container.querySelectorAll(".decision-panel, .decision-rationale-details");
  return [details[0]?.open ?? false, details[1]?.open ?? false];
}

export function getScenario(id) {
  return SCENARIOS.find((s) => s.id === id);
}

export function getPreset(id) {
  return PRESETS.find((p) => p.id === id);
}


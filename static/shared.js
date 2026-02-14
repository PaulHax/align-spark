import { initThemeSwitcher } from "./theme-switcher.js";
import "https://cdn.jsdelivr.net/npm/@awesome.me/webawesome@3.2.1/dist-cdn/components/tag/tag.js";
import "https://cdn.jsdelivr.net/npm/@awesome.me/webawesome@3.2.1/dist-cdn/components/spinner/spinner.js";
import "https://cdn.jsdelivr.net/npm/@awesome.me/webawesome@3.2.1/dist-cdn/components/slider/slider.js";
import "https://cdn.jsdelivr.net/npm/@awesome.me/webawesome@3.2.1/dist-cdn/components/details/details.js";
import "https://cdn.jsdelivr.net/npm/@awesome.me/webawesome@3.2.1/dist-cdn/components/card/card.js";
import "https://cdn.jsdelivr.net/npm/@awesome.me/webawesome@3.2.1/dist-cdn/components/button/button.js";
import "https://cdn.jsdelivr.net/npm/@awesome.me/webawesome@3.2.1/dist-cdn/components/badge/badge.js";

import { SCENARIOS, PRESETS, DIMENSIONS, decide } from "./align-engine.js";

export { SCENARIOS, PRESETS, DIMENSIONS, decide };

const LEVEL_LABELS = { 0: "Low", 50: "Medium", 100: "High" };
const LEVEL_TO_STRING = { 0: "low", 50: "medium", 100: "high" };

export function simulateThinking(container, ms = 500) {
  container.innerHTML = `
    <div class="spinner-overlay">
      <wa-spinner></wa-spinner>
      <span>Model is thinking…</span>
    </div>
  `;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function modelBadgeHTML() {
  return `<span class="model-badge"><wa-tag size="small">ALIGN-ADM v0.3</wa-tag></span>`;
}

export function sliderValueToLevel(value) {
  return LEVEL_TO_STRING[value] || "medium";
}

export function levelToSliderValue(level) {
  const map = { low: 0, medium: 50, high: 100 };
  return map[level] ?? 50;
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

export function buildValueControls(container, values, onChange) {
  container.innerHTML = "";
  container.classList.add("value-sliders");
  DIMENSIONS.forEach((dim) => {
    const level = values[dim.id] || "low";
    const sliderVal = levelToSliderValue(level);
    const row = document.createElement("div");
    row.className = "slider-row";
    row.innerHTML = `
      <div class="slider-label">${dim.label}</div>
      <wa-slider min="0" max="100" step="50" value="${sliderVal}" data-dim="${dim.id}"></wa-slider>
      <div class="slider-level" data-level-label="${dim.id}">${LEVEL_LABELS[sliderVal]}</div>
    `;
    container.appendChild(row);
  });

  container.addEventListener("input", (e) => {
    const range = e.target.closest("wa-slider");
    if (!range) return;
    const dim = range.dataset.dim;
    const val = Number(range.value);
    const label = container.querySelector(`[data-level-label="${dim}"]`);
    if (label) label.textContent = LEVEL_LABELS[val] || "Medium";
    const newValues = getCurrentValues(container);
    onChange(newValues);
  });
}

export function setSliderValues(container, values) {
  DIMENSIONS.forEach((dim) => {
    const level = values[dim.id] || "low";
    const sliderVal = levelToSliderValue(level);
    const range = container.querySelector(`wa-slider[data-dim="${dim.id}"]`);
    if (range) range.value = sliderVal;
    const label = container.querySelector(`[data-level-label="${dim.id}"]`);
    if (label) label.textContent = LEVEL_LABELS[sliderVal] || "Medium";
  });
}

export function getCurrentValues(sliderContainer) {
  const values = {};
  sliderContainer.querySelectorAll("wa-slider").forEach((range) => {
    values[range.dataset.dim] = sliderValueToLevel(Number(range.value));
  });
  return values;
}

export function buildScenarioSelector(container, currentId, onSelect) {
  container.innerHTML = "";
  SCENARIOS.forEach((scenario) => {
    const card = document.createElement("div");
    card.className = `scenario-card${scenario.id === currentId ? " active" : ""}`;
    card.innerHTML = `<div class="scenario-card-title">${scenario.title}</div>`;
    card.addEventListener("click", () => onSelect(scenario.id));
    container.appendChild(card);
  });
}

export function renderDecisionComparison(container, baseline, aligned) {
  const changed = baseline.choiceId !== aligned.choiceId;
  container.innerHTML = `
    <div class="decision-comparison">
      <div class="decision-col">
        <div class="eyebrow">Baseline Language Model</div>
        <div class="decision-choice">${baseline.decision}</div>
        <div class="decision-rationale">${baseline.justification}</div>
      </div>
      <div class="comparison-divider">
        <div class="divider-line"></div>
        <div class="comparison-badge ${changed ? "changed" : "same"}">${changed ? "Changed" : "Same"}</div>
        <div class="divider-line"></div>
      </div>
      <div class="decision-col">
        <div class="eyebrow">Aligned Decision ${modelBadgeHTML()}</div>
        <div class="decision-choice">${aligned.decision}</div>
        <div class="decision-rationale">${aligned.justification}</div>
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
        <div class="choices-label">The Options</div>
        <div class="scenario-choices">
          ${choiceParts.map((p, i) => `<div class="scenario-choice-card"><span class="choice-letter">${String.fromCharCode(65 + i)}</span>${p}</div>`).join("")}
        </div>
      </div>` : ""}
  `;
}

export function getScenario(id) {
  return SCENARIOS.find((s) => s.id === id);
}

export function getPreset(id) {
  return PRESETS.find((p) => p.id === id);
}

initThemeSwitcher();

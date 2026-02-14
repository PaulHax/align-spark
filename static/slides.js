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

const TOTAL_SLIDES = 8;

const state = {
  currentSlide: 0,
  scenarioId: SCENARIOS[0].id,
  presetId: PRESETS[0].id,
  values: { ...PRESETS[0].values },
  transitioning: false,
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const slides = $$("[data-slide]");
const dotsContainer = $("[data-dots]");
const arrowLeft = $("[data-arrow-left]");
const arrowRight = $("[data-arrow-right]");

const buildDots = () => {
  dotsContainer.innerHTML = Array.from({ length: TOTAL_SLIDES }, (_, i) =>
    `<button class="slide-dot${i === 0 ? " active" : ""}" data-dot="${i}" aria-label="Go to slide ${i + 1}"></button>`
  ).join("");
};

const updateDots = (index) => {
  dotsContainer.querySelectorAll(".slide-dot").forEach((dot, i) => {
    dot.classList.toggle("active", i === index);
  });
};

const updateArrows = (index) => {
  arrowLeft.toggleAttribute("hidden", index === 0);
  arrowRight.toggleAttribute("hidden", index === TOTAL_SLIDES - 1);
};

const transitionTo = (index) => {
  const prev = slides[state.currentSlide];
  const next = slides[index];

  if (prev === next) return;

  state.transitioning = true;

  prev.classList.remove("active");
  prev.classList.add("exiting");
  next.classList.add("active");

  setTimeout(() => {
    prev.classList.remove("exiting");
    state.transitioning = false;
  }, 420);
};

const renderBaseline = (container) => {
  const result = decide(state.scenarioId, "baseline");
  container.innerHTML = `
    <div class="eyebrow">Baseline Language Model ${modelBadgeHTML()}</div>
    <div class="decision-choice">${result.decision}</div>
    <div class="decision-rationale">${result.justification}</div>
  `;
};

const renderComparison = (container) => {
  const baseline = decide(state.scenarioId, "baseline");
  const aligned = decide(state.scenarioId, "aligned", state.values);
  renderDecisionComparison(container, baseline, aligned);
};

const renderPresetsAndSliders = (presetsEl, slidersEl, onChange) => {
  buildPresetChips(presetsEl, state.presetId, (id) => {
    state.presetId = id;
    state.values = { ...getPreset(id).values };
    setSliderValues(slidersEl, state.values);
    buildPresetChips(presetsEl, state.presetId, presetsEl._onSelect);
    if (onChange) onChange();
  });
  presetsEl._onSelect = presetsEl.querySelector(".preset-chip")
    ? (id) => {
        state.presetId = id;
        state.values = { ...getPreset(id).values };
        setSliderValues(slidersEl, state.values);
        buildPresetChips(presetsEl, state.presetId, presetsEl._onSelect);
        if (onChange) onChange();
      }
    : null;

  buildValueControls(slidersEl, state.values, (newValues) => {
    state.values = newValues;
    state.presetId = null;
    buildPresetChips(presetsEl, null, (id) => {
      state.presetId = id;
      state.values = { ...getPreset(id).values };
      setSliderValues(slidersEl, state.values);
      buildPresetChips(presetsEl, state.presetId, (id2) => {
        state.presetId = id2;
        state.values = { ...getPreset(id2).values };
        setSliderValues(slidersEl, state.values);
        if (onChange) onChange();
      });
      if (onChange) onChange();
    });
    if (onChange) onChange();
  });
};

const onEnterSlide = async (index) => {
  const scenario = getScenario(state.scenarioId);

  if (index === 1) {
    $("[data-scenario-title]").textContent = scenario.title;
    renderScenarioDescription($("[data-scenario-description]"), scenario);
  }

  if (index === 2) {
    const container = $("[data-baseline-result]");
    await simulateThinking(container);
    renderBaseline(container);
  }

  if (index === 4) {
    renderPresetsAndSliders($("[data-presets]"), $("[data-sliders]"));
  }

  if (index === 5) {
    const container = $("[data-comparison-result]");
    await simulateThinking(container);
    renderComparison(container);
  }

  if (index === 6) {
    renderPresetsAndSliders(
      $("[data-explore-presets]"),
      $("[data-explore-sliders]"),
      () => renderComparison($("[data-explore-comparison]"))
    );
    renderComparison($("[data-explore-comparison]"));
  }

  if (index === 7) {
    buildScenarioSelector($("[data-scenario-selector]"), state.scenarioId, (id) => {
      state.scenarioId = id;
      goToSlide(1);
    });
  }
};

const goToSlide = async (index) => {
  if (index < 0 || index >= TOTAL_SLIDES) return;
  if (state.transitioning) return;
  if (index === state.currentSlide) return;

  transitionTo(index);
  state.currentSlide = index;
  updateDots(index);
  updateArrows(index);
  await onEnterSlide(index);
};

const goNext = () => goToSlide(state.currentSlide + 1);
const goPrev = () => goToSlide(state.currentSlide - 1);

const isInteractiveTarget = (el) => {
  const tag = el.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (tag === "wa-slider" || tag === "wa-button") return true;
  if (el.closest("wa-slider") || el.closest("wa-button")) return true;
  if (el.closest(".preset-chip") || el.closest(".scenario-card")) return true;
  if (el.getAttribute("role") === "slider") return true;
  return false;
};

document.addEventListener("keydown", (e) => {
  if (isInteractiveTarget(e.target)) return;

  if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") {
    e.preventDefault();
    goNext();
  }
  if (e.key === "ArrowLeft") {
    e.preventDefault();
    goPrev();
  }
});

arrowLeft.addEventListener("click", goPrev);
arrowRight.addEventListener("click", goNext);

dotsContainer.addEventListener("click", (e) => {
  const dot = e.target.closest("[data-dot]");
  if (dot) goToSlide(Number(dot.dataset.dot));
});

buildDots();
slides[0].classList.add("active");
updateArrows(0);
onEnterSlide(0);

export const LEVELS = { low: 0.0, medium: 0.5, high: 1.0 };

let manifest = null;

export let DIMENSIONS = [];
export let SCENARIOS = [];
export let PRESETS = [];

async function loadManifest() {
  const response = await fetch("./data/manifest.json");
  manifest = await response.json();

  DIMENSIONS = manifest.config.dimensions.map((d) => ({
    id: d.id,
    label: d.label,
    description: d.description || "",
  }));

  SCENARIOS = Object.entries(manifest.scenarios).map(([id, s]) => ({
    id,
    title: s.title,
    description: s.description,
    choices: s.choices.map((c) => ({ id: c.id, label: c.label })),
    characters: s.characters || [],
    kdmaType: s.kdma_type,
  }));

  PRESETS = manifest.config.presets || [];
}

export const ready = loadManifest();

function levelToNumeric(level) {
  return LEVELS[level] ?? 0.5;
}

export async function decide(scenarioId, _decider, values) {
  const scenario = manifest.scenarios[scenarioId];
  if (!scenario) throw new Error(`Unknown scenario: ${scenarioId}`);

  const kdmaType = scenario.kdma_type;
  const targetValue = values ? levelToNumeric(values[kdmaType]) : 0.0;

  const expKeys = manifest.indices.by_scenario[scenarioId] || [];

  let bestKey = null;
  let bestDist = Infinity;
  for (const key of expKeys) {
    const exp = manifest.experiments[key];
    const kdmaVal = exp.parameters.kdma_values.find((kv) => kv.kdma === kdmaType);
    if (!kdmaVal) continue;
    const dist = Math.abs(kdmaVal.value - targetValue);
    if (dist < bestDist) {
      bestDist = dist;
      bestKey = key;
    }
  }

  if (!bestKey) {
    return {
      choiceId: null,
      decision: "No matching result",
      justification: `No experiments found for scenario: ${scenarioId}`,
    };
  }

  const result = manifest.experiments[bestKey]?.results[scenarioId];
  if (!result) {
    return {
      choiceId: null,
      decision: "No matching result",
      justification: `No result for scenario in experiment: ${bestKey}`,
    };
  }

  return {
    choiceId: result.choice_id,
    decision: result.choice_label,
    justification: result.justification,
  };
}

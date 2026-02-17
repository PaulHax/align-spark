export const LEVELS = { low: 0.0, medium: 0.5, high: 1.0 };

async function loadManifest() {
  const response = await fetch("./data/manifest.json");
  const manifest = await response.json();

  const dimensions = manifest.config.dimensions.map((d) => ({
    id: d.id,
    label: d.label,
    description: d.description || "",
  }));

  const scenarios = Object.entries(manifest.scenarios).map(([id, s]) => ({
    id,
    title: s.title,
    description: s.description,
    choices: s.choices.map((c) => ({ id: c.id, label: c.label })),
    characters: s.characters || [],
    kdmaType: s.kdma_type,
  }));

  const presets = manifest.config.presets || [];

  return { manifest, dimensions, scenarios, presets };
}

export const ready = loadManifest();

function levelToNumeric(level) {
  return LEVELS[level] ?? 0.5;
}

export async function decide(scenarioId, decider, values) {
  const { manifest } = await ready;
  const scenario = manifest.scenarios[scenarioId];
  if (!scenario) throw new Error(`Unknown scenario: ${scenarioId}`);

  const kdmaType = scenario.kdma_type;
  const targetValue = values ? levelToNumeric(values[kdmaType]) : 0.0;

  const expKeys = manifest.indices.by_scenario[scenarioId] || [];
  const isBaseline = decider === "baseline";

  let bestKey = null;
  let bestDist = Infinity;
  for (const key of expKeys) {
    const exp = manifest.experiments[key];
    const admName = exp.parameters.adm.name;
    if (isBaseline !== admName.includes("baseline")) continue;
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

  const { name: admName, llm_backbone: llmBackbone } =
    manifest.experiments[bestKey].parameters.adm;

  return {
    choiceId: result.choice_id,
    decision: result.choice_label,
    justification: result.justification,
    admName,
    llmBackbone,
  };
}

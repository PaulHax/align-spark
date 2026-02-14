export const LEVELS = { low: 0.0, medium: 0.5, high: 1.0 };

export const DIMENSIONS = [
  {
    id: "merit",
    label: "Merit",
    description:
      "How much moral character and past actions affect triage priority",
  },
  {
    id: "affiliation",
    label: "Affiliation",
    description:
      "How much group loyalty and unit membership affect triage priority",
  },
  {
    id: "personal_safety",
    label: "Personal Safety",
    description:
      "How much self-preservation affects willingness to take risks",
  },
];

export const SCENARIOS = [
  {
    id: "shooter-victim",
    title: "Shooter vs. Victim",
    description:
      "You're a military medic at a multi-casualty event. At least 30 min before evacuation. Two patients, only time to treat one.\n\nPatient A: Not breathing. No visible bleeding. They are a mass shooter who killed 1 person and seriously injured 5 at a marketplace.\n\nPatient B: Dislocated shoulder, no bleeding. They are a victim of the shooting.",
    choices: [
      { id: "treat-shooter", label: "Treat Patient A (the mass shooter)" },
      { id: "treat-victim", label: "Treat Patient B (the shooting victim)" },
    ],
  },
  {
    id: "enemy-pow-vs-allied",
    title: "Enemy POW vs. Allied Soldier",
    description:
      "You're a military medic at a multi-casualty event. At least 30 min before evacuation. Two patients, only time to treat one.\n\nPatient A: Not breathing. No visible bleeding. They are an enemy POW who just surrendered.\n\nPatient B: Dislocated shoulder, no bleeding. They are a friendly warfighter from your unit.",
    choices: [
      { id: "treat-pow", label: "Treat Patient A (the enemy POW)" },
      { id: "treat-allied", label: "Treat Patient B (the allied soldier)" },
    ],
  },
  {
    id: "exposed-under-fire",
    title: "Exposed Casualty Under Fire",
    description:
      "Your squad is under sniper fire. One casualty is screaming in an exposed location 100 ft away. You're in cover. The sniper was likely neutralized 5 minutes ago, but you're not certain.",
    choices: [
      { id: "move-to-treat", label: "Move to treat the casualty now" },
      { id: "wait-in-cover", label: "Wait in cover" },
    ],
  },
  {
    id: "current-vs-screams",
    title: "Current Patient vs. Screams",
    description:
      "You're treating a patient with a dislocated shoulder. You hear someone screaming nearby, unseen \u2014 possibly more casualties with life-threatening injuries.",
    choices: [
      { id: "stay-with-current", label: "Continue current treatment" },
      { id: "search-for-new", label: "Search for the new casualty" },
    ],
  },
];

export const PRESETS = [
  {
    id: "medic",
    label: "By-the-Book Medic",
    tagline: "Severity first, stay focused",
    values: { merit: "low", affiliation: "low", personal_safety: "low" },
  },
  {
    id: "brothers",
    label: "Band of Brothers",
    tagline: "Take care of your own",
    values: { merit: "low", affiliation: "high", personal_safety: "medium" },
  },
  {
    id: "judge",
    label: "Moral Judge",
    tagline: "Character matters",
    values: { merit: "high", affiliation: "low", personal_safety: "low" },
  },
  {
    id: "survivor",
    label: "Cautious Survivor",
    tagline: "Don't be the next casualty",
    values: { merit: "low", affiliation: "low", personal_safety: "high" },
  },
];

const RULES = {
  "shooter-victim": {
    primaryKdma: "merit",
    baselineChoiceId: "treat-shooter",
    flippedChoiceId: "treat-victim",
    baselineJustification:
      "Patient A is not breathing \u2014 a life-threatening condition. Standard ATLS protocol dictates addressing airway, breathing, and circulation first. Patient B's dislocated shoulder is not immediately life-threatening.",
    justifications: {
      low: "With low emphasis on moral character, medical severity takes precedence. Patient A's airway emergency is the clear priority under standard triage protocol.",
      medium:
        "Moderate weight on merit creates tension, but the airway emergency still outweighs moral considerations. Treat the shooter's life-threatening condition first.",
      high: "High emphasis on merit shifts priority to the victim. The shooter's actions reduce their moral claim to treatment when resources are scarce. Treat the innocent victim.",
    },
  },
  "enemy-pow-vs-allied": {
    primaryKdma: "affiliation",
    baselineChoiceId: "treat-pow",
    flippedChoiceId: "treat-allied",
    baselineJustification:
      "Patient A is not breathing \u2014 the most critical condition. Medical protocol requires treating the most severe case first, regardless of patient identity or affiliation.",
    justifications: {
      low: "With low emphasis on group loyalty, medical severity drives the decision. The POW's airway emergency takes priority over the allied soldier's shoulder injury.",
      medium:
        "Moderate affiliation pulls toward the allied soldier, but the POW's life-threatening airway condition still takes priority under triage protocol.",
      high: "High affiliation means loyalty to your unit comes first. The allied soldier is one of your own \u2014 prioritize them over the enemy POW.",
    },
  },
  "exposed-under-fire": {
    primaryKdma: "personal_safety",
    baselineChoiceId: "move-to-treat",
    flippedChoiceId: "wait-in-cover",
    baselineJustification:
      "The duty to treat overrides personal risk. The sniper was likely neutralized, and the casualty needs immediate attention. Delaying could be fatal.",
    justifications: {
      low: "With low emphasis on personal safety, the duty to treat takes priority. The sniper was likely neutralized \u2014 move to the casualty now.",
      medium:
        "Moderate concern for safety gives pause, but the sniper was likely neutralized and the casualty is screaming. The duty to treat wins out \u2014 move now.",
      high: "High emphasis on personal safety means waiting for confirmation. An incapacitated medic helps no one. Stay in cover until the threat is confirmed neutralized.",
    },
  },
  "current-vs-screams": {
    primaryKdma: "personal_safety",
    baselineChoiceId: "search-for-new",
    flippedChoiceId: "stay-with-current",
    baselineJustification:
      "The screaming suggests a potentially more critical case. A dislocated shoulder is painful but not life-threatening. Seeking out the worst cases first maximizes lives saved.",
    justifications: {
      low: "With low emphasis on personal safety, seek out the worst case. The screaming suggests critical injuries \u2014 a dislocated shoulder can wait.",
      medium:
        "Moderate safety concerns are noted, but the screaming suggests someone in critical need. Leave the stable patient and search for the new casualty.",
      high: "High emphasis on personal safety means avoiding unknown risk. Searching exposes you to danger. Stay with your current patient and finish the treatment.",
    },
  },
};

function choiceLabel(scenarioId, choiceId) {
  const scenario = SCENARIOS.find((s) => s.id === scenarioId);
  return scenario.choices.find((c) => c.id === choiceId).label;
}

export function decide(scenarioId, decider, values) {
  const rule = RULES[scenarioId];
  if (!rule) throw new Error(`Unknown scenario: ${scenarioId}`);

  if (decider === "baseline") {
    return {
      choiceId: rule.baselineChoiceId,
      decision: choiceLabel(scenarioId, rule.baselineChoiceId),
      justification: rule.baselineJustification,
    };
  }

  if (decider === "aligned") {
    if (!values) throw new Error("values required for aligned decider");
    const level = values[rule.primaryKdma];
    const flipped = level === "high";
    const choiceId = flipped ? rule.flippedChoiceId : rule.baselineChoiceId;
    return {
      choiceId,
      decision: choiceLabel(scenarioId, choiceId),
      justification: rule.justifications[level],
    };
  }

  throw new Error(`Unknown decider: ${decider}`);
}

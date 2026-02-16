"""Build manifest.json from align-system experiment data for the demo frontend."""

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import yaml
from align_utils.discovery import parse_experiments_directory
from align_utils.models import ExperimentData, ExperimentItem, KDMAValue, get_experiment_items


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def make_scenario_key(scenario_id: str, scene_id: str) -> str:
    return f"{slugify(scenario_id)}_{slugify(scene_id)}"


def make_kdma_string(kdma_values: list[KDMAValue]) -> str:
    if not kdma_values:
        return "unaligned"
    return "_".join(sorted(f"{kv.kdma}-{kv.value}" for kv in kdma_values))


def get_primary_kdma_type(kdma_values: list[KDMAValue]) -> str | None:
    if not kdma_values:
        return None
    return kdma_values[0].kdma


def get_scene_id(item: ExperimentItem) -> str:
    fs = item.item.input.full_state
    if fs and isinstance(fs, dict):
        meta = fs.get("meta_info", {})
        if isinstance(meta, dict):
            return meta.get("scene_id", "unknown")
    return "unknown"


def load_config(config_path: Path) -> dict:
    with open(config_path) as f:
        return yaml.safe_load(f)


def build_scene_filter(config: dict) -> dict[tuple[str, str], str] | None:
    """Returns {(scenario_id, scene_id): title} or None if no filter."""
    scenes = config.get("scenes")
    if not scenes:
        return None
    return {(s["scenario_id"], s["scene_id"]): s.get("title", "") for s in scenes}


def find_matching_item(
    items: list[ExperimentItem],
    scene_filter: dict[tuple[str, str], str] | None,
    exp_scenario_id: str,
) -> list[tuple[ExperimentItem, str, str]]:
    """Find items matching the scene filter.

    Returns [(item, scenario_key, title), ...]
    """
    matches = []
    for item in items:
        scene_id = get_scene_id(item)
        if scene_filter is not None:
            key = (exp_scenario_id, scene_id)
            if key not in scene_filter:
                continue
            title = scene_filter[key]
        else:
            title = ""
        scenario_key = make_scenario_key(exp_scenario_id, scene_id)
        matches.append((item, scenario_key, title))
    return matches


def extract_choices(item: ExperimentItem) -> list[dict]:
    return [
        {
            "id": c.get("action_id", ""),
            "label": c.get("unstructured", ""),
            **({"kdma_association": c["kdma_association"]} if c.get("kdma_association") else {}),
        }
        for c in (item.item.input.choices or [])
    ]


def extract_characters(item: ExperimentItem) -> list[dict]:
    fs = item.item.input.full_state
    if not fs or not isinstance(fs, dict):
        return []
    return [
        {"name": char.get("name", ""), "description": char.get("unstructured", "")}
        for char in fs.get("characters", [])
    ]


def extract_result(item: ExperimentItem) -> dict | None:
    if item.item.output is None:
        return None
    output = item.item.output
    choices = item.item.input.choices or []
    choice_idx = output.choice
    choice = choices[choice_idx] if choice_idx < len(choices) else {}
    result = {
        "choice_id": choice.get("action_id", ""),
        "choice_label": choice.get("unstructured", ""),
        "justification": output.action.justification or "",
        "timing_s": item.timing_s,
    }
    if choice.get("kdma_association"):
        result["choice_kdma_association"] = choice["kdma_association"]
    return result


def build_dimensions(config: dict, discovered_kdma_types: set[str]) -> list[dict]:
    dim_overrides = config.get("dimensions", {})
    dimensions = []
    for kdma_type in sorted(discovered_kdma_types):
        override = dim_overrides.get(kdma_type, {})
        dimensions.append({
            "id": kdma_type,
            "label": override.get("label", kdma_type.replace("_", " ").title()),
            "description": override.get("description", ""),
        })
    return dimensions


def build_manifest(experiments_root: Path, config: dict) -> dict:
    experiments = parse_experiments_directory(experiments_root)
    scene_filter = build_scene_filter(config)

    scenarios: dict[str, dict] = {}
    experiment_entries: dict[str, dict] = {}
    indices_by_adm: dict[str, list[str]] = {}
    indices_by_kdma: dict[str, list[str]] = {}
    indices_by_scenario: dict[str, list[str]] = {}
    discovered_kdma_types: set[str] = set()
    adm_types: set[str] = set()
    llm_backbones: set[str] = set()
    kdma_combinations: set[str] = set()

    for exp in experiments:
        kdma_values = exp.config.alignment_target.kdma_values
        kdma_type = get_primary_kdma_type(kdma_values)
        if kdma_type:
            discovered_kdma_types.add(kdma_type)

        items = get_experiment_items(exp)
        matched = find_matching_item(items, scene_filter, exp.scenario_id)
        if not matched:
            continue

        exp_key = exp.config.generate_experiment_key(exp.experiment_path)
        adm_name = exp.config.adm.name
        llm_backbone = exp.config.adm.llm_backbone
        kdma_string = make_kdma_string(kdma_values)
        alignment_target_id = exp.config.alignment_target.id

        adm_types.add(adm_name)
        if llm_backbone:
            llm_backbones.add(llm_backbone)
        kdma_combinations.add(kdma_string)

        results: dict[str, dict] = {}
        for item, scenario_key, title in matched:
            if scenario_key not in scenarios:
                auto_title = title or (kdma_type or "").replace("_", " ").title()
                scenarios[scenario_key] = {
                    "title": auto_title,
                    "scenario_id": exp.scenario_id,
                    "scene_id": get_scene_id(item),
                    "kdma_type": kdma_type or "",
                    "description": item.item.input.state or "",
                    "choices": extract_choices(item),
                    "characters": extract_characters(item),
                }

            result = extract_result(item)
            if result:
                results[scenario_key] = result

            indices_by_scenario.setdefault(scenario_key, [])
            if exp_key not in indices_by_scenario[scenario_key]:
                indices_by_scenario[scenario_key].append(exp_key)

        if not results:
            continue

        experiment_entries[exp_key] = {
            "parameters": {
                "adm": {
                    "name": adm_name,
                    **({"llm_backbone": llm_backbone} if llm_backbone else {}),
                },
                "kdma_values": [{"kdma": kv.kdma, "value": kv.value} for kv in kdma_values],
                "alignment_target_id": alignment_target_id,
                "run_variant": exp.config.run_variant,
            },
            "results": results,
        }

        indices_by_adm.setdefault(adm_name, []).append(exp_key)
        indices_by_kdma.setdefault(kdma_string, []).append(exp_key)

    return {
        "version": "1.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "metadata": {
            "total_experiments": len(experiment_entries),
            "total_scenarios": len(scenarios),
            "adm_types": sorted(adm_types),
            "llm_backbones": sorted(llm_backbones),
            "kdma_combinations": sorted(kdma_combinations),
        },
        "config": {
            "dimensions": build_dimensions(config, discovered_kdma_types),
            "presets": config.get("presets", []),
        },
        "scenarios": scenarios,
        "experiments": experiment_entries,
        "indices": {
            "by_adm": indices_by_adm,
            "by_kdma": indices_by_kdma,
            "by_scenario": indices_by_scenario,
        },
    }


def main():
    parser = argparse.ArgumentParser(description="Build manifest.json from experiment data")
    parser.add_argument("experiments", type=Path, help="Path to experiments directory")
    parser.add_argument(
        "--config",
        type=Path,
        default=Path("build_config.yaml"),
        help="Path to build config YAML",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("static/data"),
        help="Output directory for manifest.json",
    )
    args = parser.parse_args()

    config = load_config(args.config)
    manifest = build_manifest(args.experiments, config)

    args.output_dir.mkdir(parents=True, exist_ok=True)
    output_path = args.output_dir / "manifest.json"
    with open(output_path, "w") as f:
        json.dump(manifest, f, indent=2)

    m = manifest["metadata"]
    print(
        f"Wrote {output_path}: "
        f"{m['total_scenarios']} scenarios, "
        f"{m['total_experiments']} experiments, "
        f"{len(m['adm_types'])} ADMs"
    )


if __name__ == "__main__":
    main()

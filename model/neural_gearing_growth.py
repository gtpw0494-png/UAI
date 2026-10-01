from __future__ import annotations

from dataclasses import dataclass, replace
import torch


@dataclass(frozen=True)
class GrowthPlan:
    state: str
    reason: str
    target_gear: int | None
    proposed_config: object | None
    authority_granted: bool = False
    executable: bool = False
    requires_offline_evaluation: bool = True
    requires_promotion: bool = True


class GrowthPlanner:
    """Create candidate topology proposals without mutating a live model."""

    def __init__(self, plateau=.01, novelty=.70, uncertainty=.55, max_nodes=12):
        self.plateau = plateau
        self.novelty = novelty
        self.uncertainty = uncertainty
        self.max_nodes = max_nodes

    def propose(self, config, recent_loss_delta, novelty, uncertainty, gear_usage):
        if abs(recent_loss_delta) > self.plateau:
            return GrowthPlan("NO_GROWTH", "training still improving", None, None)
        if novelty < self.novelty and uncertainty < self.uncertainty:
            return GrowthPlan("NO_GROWTH", "insufficient novelty/uncertainty", None, None)
        if len(gear_usage) != len(config.gears):
            raise ValueError("gear_usage must match gears")
        target = max(range(len(gear_usage)), key=lambda i: float(gear_usage[i]))
        gear = config.gears[target]
        if gear.nodes >= self.max_nodes:
            return GrowthPlan("NO_GROWTH", "node limit reached", target, None)
        gears = list(config.gears)
        gears[target] = replace(
            gear,
            nodes=gear.nodes + 1,
            edge_probability=min(.85, gear.edge_probability + .03),
        )
        return GrowthPlan(
            "CANDIDATE",
            "plateau plus sustained novelty/uncertainty",
            target,
            replace(config, gears=tuple(gears)),
        )


class PathwayConsolidator:
    """Identify and freeze selected neural nodes for offline continual training."""

    @torch.no_grad()
    def important_nodes(self, model, gear_index, threshold=.60):
        gear = model.gears[gear_index]
        scores = {i: 0.0 for i in range(len(gear.nodes))}
        for to_node, parents in enumerate(gear.parents):
            weights = torch.softmax(gear.edge_logits[to_node], 0).cpu()
            for parent, weight in zip(parents, weights):
                if parent >= 0:
                    scores[parent] = max(scores[parent], float(weight))
                scores[to_node] = max(scores[to_node], float(weight))
        return {
            "scores": scores,
            "important_nodes": [i for i, score in scores.items() if score >= threshold],
        }

    def freeze_nodes(self, model, gear_index, nodes):
        frozen = []
        for node in nodes:
            if 0 <= int(node) < len(model.gears[gear_index].nodes):
                for parameter in model.gears[gear_index].nodes[int(node)].parameters():
                    parameter.requires_grad = False
                frozen.append(int(node))
        return sorted(set(frozen))

from __future__ import annotations

from dataclasses import dataclass, field
import math
import random
from typing import Tuple

import torch
import torch.nn as nn
import torch.nn.functional as F


@dataclass(frozen=True)
class GearConfig:
    name: str
    nodes: int
    edge_probability: float
    ff_multiplier: float
    temporal_decay: float
    event_threshold: float
    compute_cost: float


@dataclass(frozen=True)
class NGNConfig:
    vocab_size: int = 512
    d_model: int = 128
    n_heads: int = 4
    max_seq_len: int = 256
    router_hidden: int = 128
    capability_count: int = 8
    graph_seed: int = 2026
    gears: Tuple[GearConfig, ...] = field(default_factory=lambda: (
        GearConfig("reflex", 2, .25, 1.5, .15, .35, 1.0),
        GearConfig("reason", 4, .45, 2.5, .45, .50, 2.5),
        GearConfig("deliberate", 6, .60, 4.0, .70, .62, 5.0),
    ))

    def validate(self):
        if self.d_model % self.n_heads:
            raise ValueError("d_model must be divisible by n_heads")
        if not self.gears:
            raise ValueError("at least one gear is required")
        for gear in self.gears:
            if gear.nodes < 1:
                raise ValueError("gear nodes must be positive")
            if not 0 <= gear.edge_probability <= 1:
                raise ValueError("edge probability must be in [0,1]")


class RMSNorm(nn.Module):
    def __init__(self, dim, eps=1e-6):
        super().__init__()
        self.scale = nn.Parameter(torch.ones(dim))
        self.eps = eps

    def forward(self, x):
        return x * x.pow(2).mean(-1, keepdim=True).add(self.eps).rsqrt() * self.scale


class PulseGate(nn.Module):
    def __init__(self, dim, threshold=.5, temperature=.15):
        super().__init__()
        self.proj = nn.Linear(dim, 1)
        self.threshold_logit = nn.Parameter(torch.tensor(math.log(threshold / (1 - threshold))))
        self.temperature = temperature

    def forward(self, x, hard=False):
        threshold = torch.sigmoid(self.threshold_logit)
        score = torch.sigmoid(self.proj(x))
        soft = torch.sigmoid((score - threshold) / self.temperature)
        if hard:
            discrete = (soft >= .5).to(soft.dtype)
            gate = discrete + soft - soft.detach()
        else:
            gate = soft
        return x * gate, gate


class TemporalLeakyMixer(nn.Module):
    def __init__(self, dim, decay):
        super().__init__()
        self.decay = float(decay)
        self.mix = nn.Parameter(torch.tensor(0.0))
        self.proj = nn.Linear(dim, dim, bias=False)

    def forward(self, x):
        batch, steps, dim = x.shape
        state = torch.zeros(batch, dim, device=x.device, dtype=x.dtype)
        output = []
        alpha = torch.sigmoid(self.mix)
        for index in range(steps):
            state = self.decay * state + (1 - self.decay) * x[:, index]
            output.append((1 - alpha) * x[:, index] + alpha * self.proj(state))
        return torch.stack(output, 1)


class GearNode(nn.Module):
    def __init__(self, dim, heads, ff_mult, decay, threshold):
        super().__init__()
        hidden = max(dim, int(dim * ff_mult))
        self.n1 = RMSNorm(dim)
        self.attn = nn.MultiheadAttention(dim, heads, batch_first=True)
        self.n2 = RMSNorm(dim)
        self.temporal = TemporalLeakyMixer(dim, decay)
        self.n3 = RMSNorm(dim)
        self.ff = nn.Sequential(nn.Linear(dim, hidden), nn.GELU(), nn.Linear(hidden, dim))
        self.pulse = PulseGate(dim, threshold)

    def forward(self, x, hard_events=False):
        steps = x.size(1)
        mask = torch.full((steps, steps), float("-inf"), device=x.device, dtype=x.dtype)
        mask = torch.triu(mask, 1)
        normed = self.n1(x)
        attention, _ = self.attn(normed, normed, normed, attn_mask=mask, need_weights=False)
        x = x + attention
        x = x + self.temporal(self.n2(x))
        transformed, pulse = self.pulse(self.ff(self.n3(x)), hard_events)
        return x + transformed, pulse


def random_dag(nodes, probability, seed):
    rng = random.Random(seed)
    parents = []
    for index in range(nodes):
        incoming = {-1} if index == 0 else {index - 1}
        if index > 0 and rng.random() < .35:
            incoming.add(-1)
        for candidate in range(max(0, index - 1)):
            if rng.random() < probability:
                incoming.add(candidate)
        parents.append(tuple(sorted(incoming)))
    has_child = {index: False for index in range(nodes)}
    for incoming in parents:
        for parent in incoming:
            if parent >= 0:
                has_child[parent] = True
    sinks = tuple(index for index in range(nodes) if not has_child[index]) or (nodes - 1,)
    return tuple(parents), sinks


class RandomGraphGear(nn.Module):
    def __init__(self, config, dim, heads, seed):
        super().__init__()
        self.config = config
        self.parents, self.sinks = random_dag(config.nodes, config.edge_probability, seed)
        self.nodes = nn.ModuleList([
            GearNode(dim, heads, config.ff_multiplier, config.temporal_decay, config.event_threshold)
            for _ in range(config.nodes)
        ])
        self.edge_logits = nn.ParameterList([
            nn.Parameter(torch.zeros(len(incoming))) for incoming in self.parents
        ])
        self.sink_logits = nn.Parameter(torch.zeros(len(self.sinks)))
        self.norm = RMSNorm(dim)

    def forward(self, x, hard_events=False):
        outputs = []
        pulse_means = []
        for index, node in enumerate(self.nodes):
            weights = torch.softmax(self.edge_logits[index], 0)
            pieces = [x if parent == -1 else outputs[parent] for parent in self.parents[index]]
            mixed = sum((weight * piece for weight, piece in zip(weights, pieces)), torch.zeros_like(pieces[0]))
            result, pulse = node(mixed, hard_events)
            outputs.append(result)
            pulse_means.append(pulse.mean())
        sink_weights = torch.softmax(self.sink_logits, 0)
        output = sum(
            (weight * outputs[sink] for weight, sink in zip(sink_weights, self.sinks)),
            torch.zeros_like(outputs[self.sinks[0]])
        )
        return self.norm(output), {"pulse_mean": torch.stack(pulse_means).mean()}


class ClutchRouter(nn.Module):
    def __init__(self, dim, count, hidden):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(dim + 3, hidden),
            nn.GELU(),
            nn.Linear(hidden, count),
        )

    def forward(self, x, signals=None):
        pooled = x.mean(1)
        if signals is None:
            signals = torch.zeros(pooled.size(0), 3, device=x.device, dtype=x.dtype)
        if signals.shape != (pooled.size(0), 3):
            raise ValueError("signals must be [batch,3]")
        logits = self.net(torch.cat([pooled, signals], -1))
        return logits, torch.softmax(logits, -1)


class NeuralGearingNetwork(nn.Module):
    def __init__(self, config=NGNConfig()):
        super().__init__()
        config.validate()
        self.config = config
        self.token_embedding = nn.Embedding(config.vocab_size, config.d_model)
        self.position_embedding = nn.Embedding(config.max_seq_len, config.d_model)
        self.gears = nn.ModuleList([
            RandomGraphGear(gear, config.d_model, config.n_heads, config.graph_seed + index * 997)
            for index, gear in enumerate(config.gears)
        ])
        self.router = ClutchRouter(config.d_model, len(config.gears), config.router_hidden)
        self.norm = RMSNorm(config.d_model)
        self.lm_head = nn.Linear(config.d_model, config.vocab_size, bias=False)
        self.confidence = nn.Linear(config.d_model, 1)
        self.failure = nn.Linear(config.d_model, 1)
        self.capability = nn.Linear(config.d_model, config.capability_count) if config.capability_count else None
        self.register_buffer(
            "gear_costs",
            torch.tensor([gear.compute_cost for gear in config.gears], dtype=torch.float32),
        )

    def forward(self, tokens, signals=None, hard_route=False, hard_events=False):
        batch, steps = tokens.shape
        if steps > self.config.max_seq_len:
            raise ValueError("sequence too long")
        positions = torch.arange(steps, device=tokens.device)[None, :]
        x = self.token_embedding(tokens) + self.position_embedding(positions)
        _, probabilities = self.router(x, signals)
        selected = probabilities.argmax(-1)
        diagnostics = []
        if hard_route:
            output = torch.zeros_like(x)
            for gear_index, gear in enumerate(self.gears):
                mask = selected == gear_index
                if torch.any(mask):
                    routed, diag = gear(x[mask], hard_events)
                    output[mask] = routed
                    diagnostics.append(diag)
                else:
                    diagnostics.append(None)
        else:
            outputs = []
            for gear in self.gears:
                routed, diag = gear(x, hard_events)
                outputs.append(routed)
                diagnostics.append(diag)
            output = (torch.stack(outputs, 1) * probabilities[:, :, None, None]).sum(1)
        output = self.norm(output)
        pooled = output.mean(1)
        advisory = {
            "confidence": torch.sigmoid(self.confidence(pooled)),
            "failure_probability": torch.sigmoid(self.failure(pooled)),
        }
        if self.capability is not None:
            advisory["capability_logits"] = self.capability(pooled)
        return {
            "logits": self.lm_head(output),
            "gear_probs": probabilities,
            "selected_gear": selected,
            "expected_cost": (probabilities * self.gear_costs.to(probabilities.dtype)).sum(-1),
            "aux": advisory,
            "gear_diagnostics": diagnostics,
        }


def language_model_loss(model, tokens, signals=None, compute_weight=.01, balance_weight=.01):
    result = model(tokens[:, :-1], signals)
    target = tokens[:, 1:]
    logits = result["logits"]
    lm_loss = F.cross_entropy(logits.reshape(-1, logits.size(-1)), target.reshape(-1))
    compute_loss = result["expected_cost"].mean()
    load = result["gear_probs"].mean(0)
    balance_loss = F.mse_loss(load, torch.full_like(load, 1 / load.numel()))
    total = lm_loss + compute_weight * compute_loss + balance_weight * balance_loss
    return {
        "loss": total,
        "lm_loss": lm_loss.detach(),
        "compute_loss": compute_loss.detach(),
        "balance_loss": balance_loss.detach(),
        "result": result,
    }

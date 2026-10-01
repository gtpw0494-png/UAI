import torch
from neural_gearing import (
    GearConfig,
    NGNConfig,
    NeuralGearingNetwork,
    language_model_loss,
    random_dag,
)
from neural_gearing_growth import GrowthPlanner, PathwayConsolidator


def config():
    return NGNConfig(
        vocab_size=128,
        d_model=32,
        n_heads=4,
        max_seq_len=32,
        router_hidden=32,
        capability_count=5,
        gears=(
            GearConfig("g0", 2, .2, 1.5, .1, .35, 1.0),
            GearConfig("g1", 3, .5, 2.0, .5, .55, 2.0),
        ),
    )


def run():
    parents, _ = random_dag(8, .7, 42)
    for node, incoming in enumerate(parents):
        assert incoming
        for parent in incoming:
            assert parent == -1 or parent < node

    cfg = config()
    model = NeuralGearingNetwork(cfg)
    tokens = torch.randint(0, 128, (2, 17))
    signals = torch.rand(2, 3)
    result = model(tokens[:, :-1], signals)
    assert result["logits"].shape == (2, 16, 128)
    assert result["aux"]["capability_logits"].shape == (2, 5)
    assert torch.allclose(result["gear_probs"].sum(-1), torch.ones(2), atol=1e-5)

    pack = language_model_loss(model, tokens, signals)
    assert torch.isfinite(pack["loss"])
    pack["loss"].backward()
    assert any(parameter.grad is not None for parameter in model.parameters())

    hard = model(
        torch.randint(0, 128, (3, 12)),
        torch.rand(3, 3),
        hard_route=True,
        hard_events=True,
    )
    assert hard["logits"].shape == (3, 12, 128)

    growth = GrowthPlanner(max_nodes=6).propose(cfg, 0.0, .9, .8, [.2, .8])
    assert growth.state == "CANDIDATE"
    assert growth.proposed_config.gears[1].nodes == 4
    assert growth.authority_granted is False and growth.executable is False
    assert growth.requires_offline_evaluation is True and growth.requires_promotion is True

    consolidator = PathwayConsolidator()
    report = consolidator.important_nodes(model, 0, threshold=0.0)
    frozen = consolidator.freeze_nodes(model, 0, report["important_nodes"])
    assert frozen
    for node in frozen:
        assert all(not p.requires_grad for p in model.gears[0].nodes[node].parameters())

    print("ForgeNGN neural gearing verification passed")


if __name__ == "__main__":
    run()

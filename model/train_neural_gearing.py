import argparse
from pathlib import Path
import torch

from neural_gearing import NGNConfig, NeuralGearingNetwork, language_model_loss


def synthetic_batch(batch, seq, vocab, device):
    x = torch.randint(1, vocab, (batch, seq), device=device)
    x[:, 1:] = (x[:, :-1] + 1) % vocab
    return x


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--steps", type=int, default=25)
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--artifact", default="model/artifacts/forgengn-demo.pt")
    args = parser.parse_args()

    config = NGNConfig(
        vocab_size=256,
        d_model=64,
        n_heads=4,
        max_seq_len=64,
        router_hidden=64,
        capability_count=8,
    )
    model = NeuralGearingNetwork(config).to(args.device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=3e-4)

    for step in range(args.steps):
        tokens = synthetic_batch(4, 32, config.vocab_size, args.device)
        signals = torch.rand(4, 3, device=args.device)
        optimizer.zero_grad()
        pack = language_model_loss(
            model,
            tokens,
            signals=signals,
            compute_weight=0.005,
            balance_weight=0.02,
        )
        pack["loss"].backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()
        if step % 5 == 0 or step == args.steps - 1:
            probs = pack["result"]["gear_probs"].mean(dim=0).detach().cpu().tolist()
            print(
                f"step={step:03d} loss={pack['loss'].item():.4f} "
                f"lm={pack['lm_loss'].item():.4f} compute={pack['compute_loss'].item():.3f} "
                f"gear_load={[round(x, 3) for x in probs]}"
            )

    artifact = Path(args.artifact)
    artifact.parent.mkdir(parents=True, exist_ok=True)
    torch.save(
        {
            "state_dict": model.state_dict(),
            "config": config,
            "prototype": True,
            "authority_granted": False,
        },
        artifact,
    )
    print(f"saved prototype artifact: {artifact}")


if __name__ == "__main__":
    main()

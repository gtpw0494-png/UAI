import torch
from confidence_head import ConfidenceHead, confidence_loss
from evidence_gain_scout import EvidenceGainScout, evidence_gain_loss


def run():
    confidence = ConfidenceHead(64)
    hidden = torch.randn(4, 20, 64)
    out = confidence(hidden)
    assert out["confidence"].shape == (4, 1)
    assert torch.all((out["confidence"] >= 0) & (out["confidence"] <= 1))
    c_loss = confidence_loss(out["confidence"], torch.tensor([1, 0, 1, 1]))
    assert torch.isfinite(c_loss)
    c_loss.backward()

    scout = EvidenceGainScout(vocab_size=128, embedding_dim=32, hidden_dim=48)
    tokens = torch.randint(0, 128, (4, 24))
    targets = torch.tensor([.9, .6, .2, .75])
    predicted = scout(tokens)
    assert predicted.shape == (4,)
    assert torch.all((predicted >= 0) & (predicted <= 1))
    g_loss = evidence_gain_loss(predicted, targets)
    assert torch.isfinite(g_loss)
    g_loss.backward()
    assert any(parameter.grad is not None for parameter in scout.parameters())

    print("Cognitive learning heads verification passed")


if __name__ == "__main__":
    run()

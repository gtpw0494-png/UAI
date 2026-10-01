import torch
import torch.nn as nn
import torch.nn.functional as F


class ConfidenceHead(nn.Module):
    """Predict advisory confidence from hidden states.

    Targets must come from independently verified outcomes. Output never
    grants authorization or marks a claim verified.
    """

    def __init__(self, hidden_size: int):
        super().__init__()
        inner = max(1, hidden_size // 2)
        self.network = nn.Sequential(
            nn.Linear(hidden_size, inner),
            nn.GELU(),
            nn.Linear(inner, 1),
        )

    def forward(self, hidden_states):
        pooled = hidden_states.mean(dim=1)
        logits = self.network(pooled)
        confidence = torch.sigmoid(logits)
        return {
            "confidence": confidence,
            "uncertainty": 1.0 - confidence,
            "logits": logits,
        }


def confidence_loss(predicted, verified_success):
    target = verified_success.float().view_as(predicted)
    return F.binary_cross_entropy(predicted, target)

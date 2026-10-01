import torch
import torch.nn as nn
import torch.nn.functional as F


class EvidenceGainScout(nn.Module):
    """Predict expected uncertainty reduction for an observation proposal."""

    def __init__(self, vocab_size=256, embedding_dim=128, hidden_dim=256):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, embedding_dim)
        self.encoder = nn.GRU(embedding_dim, hidden_dim, batch_first=True)
        self.gain_head = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.GELU(),
            nn.Linear(hidden_dim // 2, 1),
        )

    def forward(self, token_ids):
        embedded = self.embedding(token_ids)
        _, hidden = self.encoder(embedded)
        return torch.sigmoid(self.gain_head(hidden[-1])).squeeze(-1)


def evidence_gain_loss(predicted, observed_gain):
    return F.mse_loss(predicted, observed_gain.float())

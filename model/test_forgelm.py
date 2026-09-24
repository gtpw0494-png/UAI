import tempfile
from pathlib import Path
import torch
from forgelm import ByteActionTokenizer,ForgeConfig,ForgeLM,train_text

t=ByteActionTokenizer();s="hello <|act|> inspect <|end|>";assert t.decode(t.encode(s))==s
c=ForgeConfig(d_model=32,n_layers=1,n_heads=4,n_kv_heads=2,d_ff=64,max_seq_len=48,num_experts=2,experts_per_token=1)
m=ForgeLM(c);x=torch.tensor([[1,2,3,4]],dtype=torch.long);logits,loss=m(x,x);assert logits.shape==(1,4,260) and loss is not None
with tempfile.TemporaryDirectory() as d:
 p=Path(d)/"m.pt";r=train_text("one chat learns. <|act|> research <|obs|> verified <|end|>"*4,p,steps=8,config=c);assert p.exists();m2=ForgeLM.load(p);assert sum(p.numel() for p in m2.parameters())==r["parameters"]
print("ForgeLM neural tests passed")

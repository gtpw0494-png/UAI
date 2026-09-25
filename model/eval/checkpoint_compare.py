#!/usr/bin/env python3
from __future__ import annotations
import argparse,json,sys
from pathlib import Path
import torch
ROOT=Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path: sys.path.insert(0,str(ROOT))
from forgelm import ForgeLM, ByteActionTokenizer
from tokenizer import load_tokenizer
from trainer import rows, token_chunks, evaluate

def tokenizer_for(model):
    meta=getattr(model,"checkpoint_metadata",{}) or {}
    spec=(meta.get("tokenizer") or {}).get("path")
    return load_tokenizer(spec) if spec else ByteActionTokenizer()

def eval_checkpoint(path:Path,dataset:Path):
    model=ForgeLM.load(path)
    tok=tokenizer_for(model)
    cfg=model.cfg
    vals=rows(dataset/"validation.jsonl") or rows(dataset/"train.jsonl")
    chunks=token_chunks(vals,tok,cfg.max_seq_len)
    loss=evaluate(model,chunks,torch.device("cpu"))
    return {"path":str(path),"validation_loss":loss,"samples":len(chunks),"parameters":sum(p.numel() for p in model.parameters())}

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--baseline",type=Path,required=True)
    p.add_argument("--candidate",type=Path,required=True)
    p.add_argument("--dataset",type=Path,required=True)
    p.add_argument("--max-relative-regression",type=float,default=0.02)
    a=p.parse_args()
    if not a.baseline.exists() or not a.candidate.exists():
        print(json.dumps({"state":"UNAVAILABLE","message":"Baseline or candidate checkpoint missing."})); raise SystemExit(2)
    b=eval_checkpoint(a.baseline,a.dataset); c=eval_checkpoint(a.candidate,a.dataset)
    if b["validation_loss"] is None or c["validation_loss"] is None:
        print(json.dumps({"state":"UNAVAILABLE","message":"No evaluation samples available.","baseline":b,"candidate":c})); raise SystemExit(2)
    rel=(c["validation_loss"]-b["validation_loss"])/max(abs(b["validation_loss"]),1e-12)
    passed=rel<=a.max_relative_regression
    out={"state":"SUCCESS" if passed else "FAILURE","metric":"validation_loss","lower_is_better":True,"baseline":b,"candidate":c,"relative_regression":rel,"max_relative_regression":a.max_relative_regression,"passed":passed}
    print(json.dumps(out)); raise SystemExit(0 if passed else 1)
if __name__=="__main__": main()

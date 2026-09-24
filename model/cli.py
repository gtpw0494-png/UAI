#!/usr/bin/env python3
import argparse,json,sys
from pathlib import Path
try:
 import torch
 from forgelm import ByteActionTokenizer,ForgeLM
 from trainer import run_training,DATASET
 from tokenizer import load_tokenizer
except Exception as e:
 print(json.dumps({"state":"UNAVAILABLE","component":"forgelm","message":f"PyTorch/model import unavailable: {e}"}));sys.exit(0)
ROOT=Path(__file__).resolve().parent;CKPT=ROOT/'checkpoints'/'forgelm-seed.pt'
p=argparse.ArgumentParser();sp=p.add_subparsers(dest='cmd',required=True);sp.add_parser('status');t=sp.add_parser('train');t.add_argument('--steps',type=int,default=80);t.add_argument('--preset',default='termux-tiny');t.add_argument('--dataset',default=str(DATASET));t.add_argument('--grad-accum',type=int,default=1);t.add_argument('--resume');t.add_argument('--tokenizer');c=sp.add_parser('chat');c.add_argument('--prompt',required=True);c.add_argument('--max-new-tokens',type=int,default=64);c.add_argument('--temperature',type=float,default=.8);a=p.parse_args()
if a.cmd=='status':
 info={"state":"SUCCESS","engine":"ForgeLM","torch":torch.__version__,"checkpoint":str(CKPT),"checkpointExists":CKPT.exists(),"device":"cuda" if torch.cuda.is_available() else "cpu","format":None,"parameters":None,"metadata":{}}
 if CKPT.exists():
  try:
   m=ForgeLM.load(CKPT);info['format']='ForgeLM-2' if hasattr(m,'checkpoint_metadata') else 'ForgeLM';info['parameters']=sum(p.numel() for p in m.parameters());info['metadata']=getattr(m,'checkpoint_metadata',{})
  except Exception as e:info['state']='PARTIAL';info['message']=f'Checkpoint exists but inspection failed: {e}'
 print(json.dumps(info));raise SystemExit
if a.cmd=='train':
 r=run_training(preset=a.preset,steps=a.steps,dataset=Path(a.dataset),grad_accum=a.grad_accum,resume=a.resume,run_name='onechat-latest',tokenizer_spec=a.tokenizer)
 # Promote a successfully completed model run to the local seed/runtime checkpoint.
 ForgeLM.load(r['modelCheckpoint']).save(CKPT,metadata=r)
 print(json.dumps({"state":"SUCCESS","message":"ForgeLM trained, validated and promoted to the local runtime checkpoint.",**r,"promotedCheckpoint":str(CKPT)}));raise SystemExit
if not CKPT.exists():print(json.dumps({"state":"UNAVAILABLE","message":"No ForgeLM checkpoint exists. Train the seed first."}));raise SystemExit
m=ForgeLM.load(CKPT);meta=getattr(m,'checkpoint_metadata',{}) or {};ts=(meta.get('tokenizer') or {}).get('path');tok=load_tokenizer(ts) if ts else ByteActionTokenizer();ids=torch.tensor([tok.encode(a.prompt)],dtype=torch.long);out=m.generate(ids,max_new_tokens=a.max_new_tokens,temperature=a.temperature);generated=tok.decode(out[0].tolist()[len(ids[0]):]);print(json.dumps({"state":"SUCCESS","engine":"ForgeLM","text":generated,"checkpoint":str(CKPT),"cachedInference":True}))

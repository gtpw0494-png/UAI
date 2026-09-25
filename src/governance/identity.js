import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {GovernanceDb} from "../governance-db.js";

const OWNER_ID="owner-local";
const hash=x=>crypto.createHash("sha256").update(String(x||"")).digest("hex");
const eq=(a,b)=>{
  try{const x=Buffer.from(String(a||""),"hex"),y=Buffer.from(String(b||""),"hex");return x.length===y.length&&x.length>0&&crypto.timingSafeEqual(x,y);}catch{return false;}
};
const cookieMap=req=>Object.fromEntries(String(req.headers?.cookie||"").split(";").map(x=>x.trim()).filter(Boolean).map(x=>{const i=x.indexOf("=");return i<0?[x,""]:[x.slice(0,i),decodeURIComponent(x.slice(i+1))];}));

export class LocalIdentity{
  constructor(stateRoot,audit=null,{ownerToken=process.env.IUV_OWNER_TOKEN,sessionHours=Number(process.env.IUV_SESSION_HOURS||12)}={}){
    this.stateRoot=stateRoot;this.audit=audit;this.db=new GovernanceDb(stateRoot);this.sessionMs=Math.max(5,Math.min(168,Number(sessionHours)||12))*3600000;
    fs.mkdirSync(stateRoot,{recursive:true});
    this.bootstrapPath=path.join(stateRoot,"owner-bootstrap-token.txt");
    this._ensureOwner(ownerToken);
  }

  _ensureOwner(ownerToken){
    const existing=this.db.get("identity",OWNER_ID);
    if(existing.record)return;
    const generated=!ownerToken;
    const token=String(ownerToken||crypto.randomBytes(32).toString("base64url"));
    const rec={id:OWNER_ID,role:"owner",scopes:["*"],tokenHash:hash(token),status:"ACTIVE",createdAt:new Date().toISOString(),credentialSource:generated?"GENERATED_LOCAL_FILE":"ENVIRONMENT"};
    const made=this.db.create("identity",rec);
    if(made.state!=="SUCCESS")throw new Error(made.message||"Failed to initialize local owner identity.");
    if(generated){
      fs.writeFileSync(this.bootstrapPath,token+"\n",{mode:0o600});
      try{fs.chmodSync(this.bootstrapPath,0o600);}catch{}
    }
    this.audit?.append({type:"identity.initialize",identityId:OWNER_ID,credentialSource:rec.credentialSource,bootstrapPath:generated?this.bootstrapPath:null});
  }

  status(auth=null){
    const owner=this.db.get("identity",OWNER_ID).record;
    return {state:"SUCCESS",identityConfigured:Boolean(owner),authenticated:Boolean(auth?.authenticated),identity:auth?.authenticated?{id:auth.identityId,role:auth.role,authMode:auth.authMode}:null,bootstrapTokenPath:fs.existsSync(this.bootstrapPath)?this.bootstrapPath:null,sessionHours:this.sessionMs/3600000};
  }

  verifyOwnerToken(token){
    const owner=this.db.get("identity",OWNER_ID).record;
    return Boolean(owner&&owner.status==="ACTIVE"&&eq(hash(token),owner.tokenHash));
  }

  login(token){
    if(!this.verifyOwnerToken(token))return {state:"DENIED",message:"Owner token is invalid."};
    const sessionToken=crypto.randomBytes(32).toString("base64url"),csrfToken=crypto.randomBytes(24).toString("base64url");
    const now=Date.now(),id="session-"+hash(sessionToken);
    const session={id,identityId:OWNER_ID,role:"owner",scopes:["*"],csrfHash:hash(csrfToken),status:"ACTIVE",createdAt:new Date(now).toISOString(),expiresAt:new Date(now+this.sessionMs).toISOString()};
    const r=this.db.create("session",session);
    if(r.state!=="SUCCESS")return {state:"ERROR",message:r.message||"Failed to create local session."};
    this.audit?.append({type:"identity.login",identityId:OWNER_ID,sessionId:id});
    return {state:"SUCCESS",message:"Local owner session created.",sessionToken,csrfToken,identity:{id:OWNER_ID,role:"owner"},expiresAt:session.expiresAt};
  }

  authenticateRequest(req){
    const authz=String(req.headers?.authorization||"");
    if(/^Bearer\s+/i.test(authz)){
      const token=authz.replace(/^Bearer\s+/i,"").trim();
      if(this.verifyOwnerToken(token))return {authenticated:true,identityId:OWNER_ID,role:"owner",scopes:["*"],authMode:"bearer",csrfRequired:false};
      return {authenticated:false,reason:"Invalid bearer owner token."};
    }
    const cookies=cookieMap(req),sessionToken=cookies.uai_session;
    if(!sessionToken)return {authenticated:false,reason:"No local owner session."};
    const id="session-"+hash(sessionToken),r=this.db.get("session",id),s=r.record;
    if(!s||s.status!=="ACTIVE")return {authenticated:false,reason:"Session is unavailable or revoked."};
    if(Date.now()>Date.parse(s.expiresAt||0))return {authenticated:false,reason:"Session expired."};
    return {authenticated:true,identityId:s.identityId,role:s.role,scopes:s.scopes||[],authMode:"session",csrfRequired:true,sessionId:id,csrfHash:s.csrfHash};
  }

  verifyCsrf(auth,token){return Boolean(auth?.authenticated&&auth.authMode==="session"&&eq(hash(token),auth.csrfHash));}

  logout(req){
    const auth=this.authenticateRequest(req);
    if(!auth.authenticated||!auth.sessionId)return {state:"SUCCESS",message:"No active cookie session."};
    const cur=this.db.get("session",auth.sessionId);
    if(!cur.record)return {state:"SUCCESS",message:"Session already unavailable."};
    const body={...cur.record,status:"REVOKED",revokedAt:new Date().toISOString()};
    const r=this.db.cas("session",auth.sessionId,cur.version,body,{type:"revoke"});
    this.audit?.append({type:"identity.logout",identityId:auth.identityId,sessionId:auth.sessionId});
    return {state:r.state==="SUCCESS"?"SUCCESS":r.state,message:r.state==="SUCCESS"?"Local owner session revoked.":r.message};
  }
}

export function sessionCookies(login,{secure=false}={}){
  const maxAge=Math.max(1,Math.floor((Date.parse(login.expiresAt)-Date.now())/1000));
  const securePart=secure?"; Secure":"";
  return [
    `uai_session=${encodeURIComponent(login.sessionToken)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${securePart}`,
    `uai_csrf=${encodeURIComponent(login.csrfToken)}; SameSite=Strict; Path=/; Max-Age=${maxAge}${securePart}`
  ];
}
export function clearSessionCookies({secure=false}={}){
  const securePart=secure?"; Secure":"";
  return [
    `uai_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${securePart}`,
    `uai_csrf=; SameSite=Strict; Path=/; Max-Age=0${securePart}`
  ];
}

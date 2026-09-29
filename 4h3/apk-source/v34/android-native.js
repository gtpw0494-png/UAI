(()=>{
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const bridge=window.AndroidContacts;
  if(!bridge?.postMessage) return;
  document.documentElement.classList.add('native-apk');
  let seq=0; const pending=new Map();
  const call=(action,payload={})=>new Promise((resolve,reject)=>{
    const id='c'+(++seq)+'-'+Date.now();
    const timer=setTimeout(()=>{pending.delete(id);reject(new Error('native_bridge_timeout'))},5000);
    pending.set(id,{resolve,reject,timer});
    bridge.postMessage(JSON.stringify({id,action,...payload}));
  });
  bridge.onmessage=e=>{
    let msg; try{msg=JSON.parse(e.data)}catch{return}
    const p=pending.get(msg.id); if(!p)return; clearTimeout(p.timer); pending.delete(msg.id);
    if(msg.ok) p.resolve(msg); else p.reject(new Error(msg.error||'native_bridge_error'));
  };
  window.on4H3ContactsPermission=granted=>{ if(granted) window.fourH3Toast?.('Contacts permission granted'); else window.fourH3Toast?.('Contacts permission denied',true); };
  const install=()=>{
    const host=document.querySelector('#tab-contacts .grid2 article:first-child');
    if(!host || document.querySelector('#nativeContactsBox')) return;
    const box=document.createElement('div'); box.id='nativeContactsBox'; box.className='native-contact-box';
    box.innerHTML=`<span class="native-badge">ANDROID NATIVE</span><h3>Phone contacts</h3><p class="apk-shell-note">Search contacts stored on this Android device. Only a selected contact's name and email are sent to 4H3.</p><form id="nativeContactForm"><label>Search device contacts<input name="q" placeholder="Name or email"></label><button>Search phone</button></form><div id="nativeContactResults" class="native-contact-results"></div>`;
    host.prepend(box);
    const form=box.querySelector('#nativeContactForm'), results=box.querySelector('#nativeContactResults');
    form.onsubmit=async e=>{
      e.preventDefault();
      try{
        const perm=await call('hasPermission');
        if(!perm.granted){await call('requestPermission');window.fourH3Toast?.('Allow Contacts, then search again.');return;}
        const response=await call('search',{query:new FormData(form).get('q')||''});
        const data=response.payload||{contacts:[]};
        results.innerHTML=(data.contacts||[]).map(c=>`<div class="native-contact-result"><div><b>${esc(c.name)}</b><small>${esc(c.email)}</small></div><button data-id="${esc(c.id)}" data-name="${esc(c.name)}" data-email="${esc(c.email)}">Import</button></div>`).join('')||'<p class="muted">No contacts found.</p>';
        results.querySelectorAll('button').forEach(b=>b.onclick=async()=>{try{await window.fourH3Rpc('upsert_device_contact_link',{p_device_resource_id:b.dataset.id,p_display_name:b.dataset.name,p_email:b.dataset.email});window.fourH3Toast?.('Phone contact linked to 4H3');window.load4H3Contacts?.()}catch(err){window.fourH3Toast?.(err.message,true)}});
      }catch(err){window.fourH3Toast?.(err.message,true)}
    };
    const gc=host.querySelector('#googleConnectState'); if(gc){gc.insertAdjacentHTML('beforebegin','<p class="apk-shell-note">Google OAuth contact search is available in the hosted web version; this APK uses native Android Contacts directly.</p>'); gc.style.display='none';}
    ['#googleConnectBtn','#googleDisconnectBtn','#contactSearchForm','#googleSearchResults'].forEach(sel=>{const el=host.querySelector(sel);if(el)el.style.display='none'});
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install); else install();
})();

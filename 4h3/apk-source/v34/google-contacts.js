// 4H3 Google Contacts manager UI. Google OAuth is handled by the 4H3 server.
(function(){
  const $=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  async function local(path,opt={}){const token=window.fourH3AccessToken?.();const r=await fetch(path,{...opt,headers:{...(opt.headers||{}),...(token?{Authorization:'Bearer '+token}:{})}});let d={};try{d=await r.json()}catch{}if(!r.ok)throw Error(d.error||d.message||('HTTP '+r.status));return d}
  async function status(){if(!$('#googleConnectState'))return;try{const x=await local('/api/google/status');$('#googleConnectState').innerHTML=`<div><b>OAuth</b><span>${x.connected?'Connected':'Not connected'}</span></div><div><b>Account</b><span>${esc(x.email||'—')}</span></div>`;$('#googleDisconnectBtn').hidden=!x.connected}catch(e){$('#googleConnectState').innerHTML=`<div><b>Status</b><span>${esc(e.message)}</span></div>`}}
  async function links(){if(!window.fourH3Rpc||!$('#contactLinksTable'))return;try{const rows=await window.fourH3Rpc('list_contact_links');$('#contactLinksTable').innerHTML=window.fourH3Table([['Name',r=>esc(r.display_name)],['Email',r=>esc(r.email)],['Linked worker',r=>esc(r.linked_display_name||'Not linked')],['Updated',r=>new Date(r.updated_at).toLocaleString()]],rows,r=>!r.linked_user_id?`<button onclick="relink4H3Contact('${r.id}')">Relink</button>`:'')}catch(e){$('#contactLinksTable').innerHTML='<p class="muted">'+esc(e.message)+'</p>'}}
  window.relink4H3Contact=async id=>{try{await (window.fourH3SafeRpc||window.fourH3Rpc)('relink_contact_by_email',{p_contact_id:id});window.fourH3Toast('Contact relinked');links()}catch(e){window.fourH3Toast(e.message,true)}};
  window.import4H3GoogleContact=async(i)=>{const row=window.__gContacts?.[i];if(!row)return;try{await (window.fourH3SafeRpc||window.fourH3Rpc)('upsert_contact_link',{p_google_resource_id:row.id,p_display_name:row.name,p_email:row.email,p_metadata:{source:'google_people'}});window.fourH3Toast('Contact imported');links()}catch(e){window.fourH3Toast(e.message,true)}};
  document.addEventListener('DOMContentLoaded',()=>{
    $('#googleConnectBtn')?.addEventListener('click',()=>location.href='/api/google/oauth/start');
    $('#googleDisconnectBtn')?.addEventListener('click',async()=>{try{await local('/api/google/disconnect',{method:'POST'});await status()}catch(e){window.fourH3Toast(e.message,true)}});
    $('#contactSearchForm')?.addEventListener('submit',async e=>{e.preventDefault();const q=new FormData(e.currentTarget).get('query');try{const x=await local('/api/google/contacts?q='+encodeURIComponent(q));window.__gContacts=x.contacts||[];$('#googleSearchResults').innerHTML=window.__gContacts.length?`<div class="contactcards">${window.__gContacts.map((r,i)=>`<div class="contactcard"><div><b>${esc(r.name)}</b><small>${esc(r.email)}</small></div><button onclick="import4H3GoogleContact(${i})">Import</button></div>`).join('')}</div>`:'<p class="muted">No contacts found.</p>'}catch(err){window.fourH3Toast(err.message,true)}});
    status();
  });
  window.load4H3Contacts=async()=>{await Promise.all([status(),links()])};
})();

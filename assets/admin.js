const $=s=>document.querySelector(s);const API=(window.XE_CONFIG?.API_BASE_URL||'').replace(/\/$/,'');const TOKEN_KEY='xe_studio_token';
let photos=[],savedSettings={},statusData={};
async function api(url,options={}) {
 const headers=options.body instanceof FormData?{}:{'Content-Type':'application/json'};
 let response;
 try {const token=sessionStorage.getItem(TOKEN_KEY);response=await fetch(API+url,{...options,headers:{...headers,...(token?{Authorization:'Bearer '+token}:{}),...options.headers}});}
 catch {throw new Error('Network error. Check that the server is running and try again.');}
 const type=response.headers.get('content-type')||'';let data={};
 if(type.includes('application/json'))data=await response.json();else data={error:await response.text()};
 if(!response.ok)throw new Error(data.error||`Request failed (${response.status}).`);
 return data;
}
function message(text,error=false){const el=$('#actionMessage');el.textContent=text;el.classList.toggle('error',error);}
function themeValues(){return {accent:$('#accentColor').value,background:$('#backgroundColor').value,textColor:$('#textColor').value};}
function setTheme(t){document.documentElement.style.setProperty('--accent',t.accent);document.documentElement.style.setProperty('--paper',t.background);document.documentElement.style.setProperty('--ink',t.textColor);const d=$('#previewDevice');d.style.background=t.background;d.style.color=t.textColor;}
function currentSettings(){return {name:$('#siteName').value.trim(),title:$('#siteTitle').value.trim(),description:$('#siteDescription').value.trim(),showDownloads:$('#downloadsEnabled').checked,...themeValues()};}
function renderPreview(){const s=currentSettings();$('#previewBrand').textContent=s.name||'XE Moments';$('#previewTitle').textContent=s.title||'Gallery title';$('#previewDescription').textContent=s.description;setTheme(s);const area=$('#previewPhotos');area.innerHTML='';photos.slice(0,6).forEach(p=>{const img=document.createElement('img');img.src=p.url;img.alt='';area.append(img);});}
function fillSettings(s){$('#siteName').value=s.name||'';$('#siteTitle').value=s.title||'';$('#siteDescription').value=s.description||'';$('#downloadsEnabled').checked=s.showDownloads!==false;$('#accentColor').value=s.accent||'#b7a58a';$('#backgroundColor').value=s.background||'#f8f7f4';$('#textColor').value=s.textColor||'#26251f';renderPreview();}
async function refresh(){
 const [gallery,status]=await Promise.all([api('/api/gallery'),api('/api/status')]);
 photos=gallery.photos||[];savedSettings={...gallery.settings};statusData=status;
 fillSettings(savedSettings);renderPhotos();$('#storageStatus').textContent=status.storage;
 $('#storageDetail').textContent=`${status.storage} · No automatic expiry · ${status.maxFileSizeMB} MB max per image`;
}
function renderPhotos(){
 $('#photoCount').textContent=`${photos.length} PHOTO${photos.length===1?'':'S'}`;
 const list=$('#photoList');list.innerHTML='';
 if(!photos.length){list.innerHTML='<div class="list-empty">No photographs yet. Upload your first images above.</div>';renderPreview();return;}
 photos.forEach((p,index)=>{
  const row=document.createElement('article');row.className='photo-card';
  const thumb=document.createElement('img');thumb.className='photo-thumb';thumb.src=p.url;thumb.alt=p.caption||'';
  const info=document.createElement('div');info.className='photo-info';
  const caption=document.createElement('input');caption.className='caption-input';caption.value=p.caption||'';caption.maxLength=150;caption.placeholder='Add a caption';caption.setAttribute('aria-label','Photo caption');
  caption.addEventListener('change',async()=>{try{await api(`/api/admin/photos/${p.id}`,{method:'PATCH',body:JSON.stringify({caption:caption.value})});message('Caption saved.');await refresh();}catch(e){message(e.message,true);}});
  const meta=document.createElement('small');meta.textContent=`${p.orientation||'photo'} · ${p.width} × ${p.height}`;
  const actions=document.createElement('div');actions.className='photo-actions';
  const makeButton=(label,cls,fn,disabled=false)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.className=cls;b.disabled=disabled;b.addEventListener('click',fn);return b;};
  actions.append(
   makeButton('Replace','text-button',()=>chooseReplacement(p.id)),
   makeButton('↑','text-button icon-button',()=>movePhoto(index,-1),index===0),
   makeButton('↓','text-button icon-button',()=>movePhoto(index,1),index===photos.length-1),
   makeButton('Delete','delete-button',()=>deletePhoto(p.id))
  );
  info.append(caption,meta,actions);row.append(thumb,info);list.append(row);
 });
 renderPreview();
}
function chooseReplacement(id){const picker=document.createElement('input');picker.type='file';picker.accept='image/jpeg,image/png,image/webp,image/avif,image/tiff';picker.addEventListener('change',()=>{if(picker.files?.[0])replacePhoto(id,picker.files[0]);});picker.click();}
async function replacePhoto(id,file){const form=new FormData();form.append('photo',file);try{message('Replacing original image…');await api(`/api/admin/photos/${id}/replace`,{method:'PUT',body:form});message('Image replaced. The original file is stored without recompression.');await refresh();}catch(e){message(e.message,true);}}
async function deletePhoto(id){if(!window.confirm('Permanently delete this photo and its stored file? This cannot be undone.'))return;try{const result=await api(`/api/admin/photos/${id}`,{method:'DELETE'});message(result.deletedFrom==='cloud'?'Photo deleted from cloud storage.':'Photo and file permanently deleted.');await refresh();}catch(e){message(e.message,true);}}
async function movePhoto(index,delta){const next=[...photos],to=index+delta;if(to<0||to>=next.length)return;[next[index],next[to]]=[next[to],next[index]];try{await api('/api/admin/reorder',{method:'PUT',body:JSON.stringify({ids:next.map(p=>p.id)})});await refresh();}catch(e){message(e.message,true);}}
function uploadFiles(files){
 const accepted=[...files].filter(f=>/^image\/(jpeg|png|webp|avif|tiff)$/.test(f.type));
 if(!accepted.length){message('Choose JPEG, PNG, WebP, AVIF or TIFF images.',true);return;}
 const form=new FormData();accepted.forEach(f=>form.append('photos',f));
 $('#uploadProgress').hidden=false;$('#progressBar').style.width='0%';$('#progressText').textContent='Uploading…';message('Uploading images…');
 const xhr=new XMLHttpRequest();xhr.open('POST',API+'/api/admin/photos');const token=sessionStorage.getItem(TOKEN_KEY);if(token)xhr.setRequestHeader('Authorization','Bearer '+token);
 xhr.upload.onprogress=e=>{if(e.lengthComputable){const pct=Math.round(e.loaded/e.total*100);$('#progressBar').style.width=pct+'%';$('#progressText').textContent=`Uploading ${pct}%`;}}
 xhr.onload=async()=>{let data={};try{data=JSON.parse(xhr.responseText)}catch{}$('#uploadProgress').hidden=true;if(xhr.status>=200&&xhr.status<300){message(`${data.added||accepted.length} photo(s) uploaded. Original files preserved.`);$('#photoPicker').value='';await refresh();}else message(data.error||`Upload failed (${xhr.status}).`,true);};
 xhr.onerror=()=>{$('#uploadProgress').hidden=true;message('Upload connection failed. Check server upload limits and try again.',true);};
 xhr.send(form);
}
const picker=$('#photoPicker');
$('#browseLabel').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();picker.click();}});
picker.addEventListener('change',()=>{if(picker.files?.length)uploadFiles(picker.files);});
$('#settingsForm').addEventListener('submit',async e=>{e.preventDefault();try{await api('/api/admin/settings',{method:'PUT',body:JSON.stringify(currentSettings())});savedSettings=currentSettings();$('#settingsMessage').textContent='Changes saved and published.';message('Gallery settings published.');await refresh();}catch(err){$('#settingsMessage').textContent=err.message;message(err.message,true);}});
$('#resetSettings').addEventListener('click',()=>{fillSettings(savedSettings);$('#settingsMessage').textContent='Unsaved changes reset.';});
['#siteName','#siteTitle','#siteDescription','#accentColor','#backgroundColor','#textColor','#downloadsEnabled'].forEach(sel=>$(sel).addEventListener('input',renderPreview));
const themes={
 ivory:{accent:'#b7a58a',background:'#f8f7f4',textColor:'#26251f'},
 midnight:{accent:'#c5a477',background:'#171715',textColor:'#f4f0e8'},
 sage:{accent:'#849581',background:'#f1f3ed',textColor:'#283129'},
 rose:{accent:'#b77f83',background:'#f7efed',textColor:'#382c2c'}
};
document.querySelectorAll('[data-theme]').forEach(button=>button.addEventListener('click',()=>{const t=themes[button.dataset.theme];$('#accentColor').value=t.accent;$('#backgroundColor').value=t.background;$('#textColor').value=t.textColor;renderPreview();}));
async function boot(){
 try {
  const auth=await api('/api/admin/me');
  if(!auth.authenticated){$('#adminLogin').hidden=false;$('#adminContent').hidden=true;return;}
  $('#adminLogin').hidden=true;$('#adminContent').hidden=false;await refresh();
 } catch(e){message(e.message,true);$('#storageStatus').textContent='Server unavailable';}
}
$('#loginForm').addEventListener('submit',async e=>{
 e.preventDefault();
 try{const auth=await api('/api/admin/login',{method:'POST',body:JSON.stringify({username:$('#adminUsername').value,password:$('#adminPassword').value})});sessionStorage.setItem(TOKEN_KEY,auth.token);$('#loginError').textContent='';$('#adminPassword').value='';$('#adminLogin').hidden=true;$('#adminContent').hidden=false;await refresh();}
 catch(err){$('#loginError').textContent=err.message;}
});
boot();

$('#logoutButton').addEventListener('click',async()=>{
 try{await api('/api/admin/logout',{method:'POST'});sessionStorage.removeItem(TOKEN_KEY);$('#adminContent').hidden=true;$('#adminLogin').hidden=false;message('Signed out.');}
 catch(e){message(e.message,true);}
});

$('#deleteAllButton').addEventListener('click',async()=>{
 if(!window.confirm('PERMANENTLY DELETE ALL GALLERY PHOTOS from cloud storage and the database? This cannot be undone.'))return;
 if(!window.confirm('Final confirmation: delete every photo? Your admin login and gallery settings will remain.'))return;
 try{const r=await api('/api/admin/photos',{method:'DELETE'});message(`Deleted ${r.deleted} photo(s) from cloud storage and database.`);await refresh();}
 catch(e){message(e.message,true);}
});

const $=s=>document.querySelector(s);const API=(window.XE_CONFIG?.API_BASE_URL||'').replace(/\/$/,'');let photos=[],settings={};
async function loadGallery(){
 const response=await fetch(API+'/api/gallery');if(!response.ok)throw new Error('Gallery could not be loaded.');
 const data=await response.json();photos=data.photos||[];settings=data.settings||{};
 document.title=(settings.name||'XE Moments')+' — Gallery';
 $('#brandName').textContent=settings.name||'Moments';$('#footerName').textContent=settings.name||'Moments';
 $('#galleryTitle').textContent=settings.title||'';$('#galleryDescription').textContent=settings.description||'';
 document.documentElement.style.setProperty('--accent',settings.accent||'#b7a58a');
 document.documentElement.style.setProperty('--paper',settings.background||'#f8f7f4');
 document.documentElement.style.setProperty('--ink',settings.textColor||'#26251f');
 const grid=$('#gallery');grid.innerHTML='';
 if(!photos.length){grid.innerHTML='<div class="empty">Your photographs will appear here.</div>';return;}
 photos.forEach((photo,index)=>{
  const figure=document.createElement('figure'),button=document.createElement('button'),img=document.createElement('img');
  img.src=photo.url;img.alt=photo.caption||'Gallery photograph';img.loading=index<4?'eager':'lazy';img.decoding='async';if(index<4)img.fetchPriority='high';
  button.className='photo-open';button.type='button';button.append(img);button.addEventListener('click',()=>openLightbox(index));figure.append(button);
  if(photo.caption){const caption=document.createElement('figcaption');caption.textContent=photo.caption;figure.append(caption);}grid.append(figure);
 });
}
function openLightbox(index){const photo=photos[index];if(!photo)return;window.currentPhoto=index;
 $('#lightboxImage').src=photo.originalUrl||photo.url;$('#lightboxImage').alt=photo.caption||'';
 $('#lightboxCaption').textContent=photo.caption||'';$('#downloadPhoto').href=photo.downloadUrl;
 $('#downloadPhoto').hidden=settings.showDownloads===false;$('#lightbox').classList.add('visible');$('#lightbox').setAttribute('aria-hidden','false');document.body.classList.add('no-scroll');
}
function closeLightbox(){$('#lightbox').classList.remove('visible');$('#lightbox').setAttribute('aria-hidden','true');document.body.classList.remove('no-scroll');}
function stepPhoto(delta){if(!photos.length)return;openLightbox((window.currentPhoto+delta+photos.length)%photos.length);}
$('#closeLightbox').addEventListener('click',closeLightbox);$('#prevPhoto').addEventListener('click',()=>stepPhoto(-1));$('#nextPhoto').addEventListener('click',()=>stepPhoto(1));
$('#lightbox').addEventListener('click',e=>{if(e.target.id==='lightbox')closeLightbox();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeLightbox();if(e.key==='ArrowLeft')stepPhoto(-1);if(e.key==='ArrowRight')stepPhoto(1);});
loadGallery().catch(e=>{$('#gallery').innerHTML='<div class="empty">'+e.message+'</div>';});

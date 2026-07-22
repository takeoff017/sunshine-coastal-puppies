// ===========================================
// CONNECT TO SUPABASE
// ===========================================
const SUPABASE_URL = 'https://uezdnawbcrrzxlcmwxfd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlemRuYXdiY3JyenhsY213eGZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2MDAyNTMsImV4cCI6MjEwMDE3NjI1M30.y5v_ED6maKUDURlIvI5zFXaYyW3lllBQVrPVDW4I0So';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===========================================
// GET THE PUPPY ID FROM THE PAGE'S URL
// e.g. puppy-detail.html?id=3  →  we read "3"
// ===========================================
const urlParams = new URLSearchParams(window.location.search);
const puppyId = urlParams.get('id');

let galleryPhotos = [];
let currentPhotoIndex = 0;

async function loadPuppyDetail() {
  const content = document.getElementById('puppyDetailContent');

  if (!puppyId) {
    content.innerHTML = '<p class="loading-text">No puppy specified.</p>';
    return;
  }

  // Get the puppy's main info and their extra gallery photos at the same time
  const [{ data: puppy, error: puppyError }, { data: photos, error: photoError }, { data: settings }] = await Promise.all([
    db.from('puppies').select('*').eq('id', puppyId).single(),
    db.from('puppy_photos').select('*').eq('puppy_id', puppyId).order('created_at', { ascending: true }),
    db.from('settings').select('*').eq('id', 1).single(),
  ]);

  if (puppyError || !puppy) {
    content.innerHTML = '<p class="loading-text">Could not find this puppy. It may have been removed.</p>';
    return;
  }

  // Build the full photo list: main photo first, then any gallery photos
  galleryPhotos = [];
  if (puppy.photo_url) galleryPhotos.push(puppy.photo_url);
  if (photos && photos.length) galleryPhotos.push(...photos.map(p => p.photo_url));

  const whatsappNumber = (settings?.whatsapp || '').replace(/\D/g, '');
  const whatsappLink = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hi! I'm interested in ${puppy.name}.`)}`
    : 'index.html#contact';

  content.innerHTML = `
    <div class="puppy-detail-grid">
      <div class="puppy-gallery">
        <div class="gallery-main" id="galleryMain">
          ${galleryPhotos.length
            ? `<img src="${galleryPhotos[0]}" id="galleryMainImg" alt="${puppy.name}" />`
            : `<div class="puppy-photo-placeholder" style="aspect-ratio:4/3;">📷 Photo coming soon</div>`
          }
          ${galleryPhotos.length > 1 ? `
            <button class="gallery-arrow gallery-prev" id="galleryPrev">‹</button>
            <button class="gallery-arrow gallery-next" id="galleryNext">›</button>
          ` : ''}
        </div>
        ${galleryPhotos.length > 1 ? `
          <div class="gallery-thumbs" id="galleryThumbs">
            ${galleryPhotos.map((url, i) => `<img src="${url}" data-index="${i}" class="gallery-thumb ${i === 0 ? 'active' : ''}" />`).join('')}
          </div>
        ` : ''}
      </div>

      <div class="puppy-detail-info">
        <div class="puppy-card-header">
          <h1>${puppy.name}</h1>
          ${puppy.status ? `<span class="status-badge status-${puppy.status.toLowerCase().replace(/\s+/g, '-')}">${puppy.status}</span>` : ''}
        </div>
        <p class="puppy-breed" style="font-size:1.1rem;">${puppy.breed}</p>
        <p class="puppy-meta" style="font-size:1rem;">${puppy.gender} · ${puppy.age} · ${puppy.ready_date || 'Ready date coming soon'}</p>
        ${puppy.price ? `<p class="puppy-price" style="font-size:1.6rem;">$${puppy.price}</p>` : ''}
        ${puppy.description ? `<p class="puppy-description" style="font-size:1.05rem;">${puppy.description}</p>` : ''}
        <a href="${whatsappLink}" target="_blank" class="btn btn-primary" style="margin-top:16px;">Ask About ${puppy.name}</a>
      </div>
    </div>
  `;

  if (galleryPhotos.length > 1) {
    document.getElementById('galleryPrev').addEventListener('click', () => changePhoto(-1));
    document.getElementById('galleryNext').addEventListener('click', () => changePhoto(1));
    document.querySelectorAll('.gallery-thumb').forEach(thumb => {
      thumb.addEventListener('click', () => {
        currentPhotoIndex = parseInt(thumb.dataset.index);
        updateGallery();
      });
    });
  }
}

function changePhoto(direction) {
  currentPhotoIndex = (currentPhotoIndex + direction + galleryPhotos.length) % galleryPhotos.length;
  updateGallery();
}

function updateGallery() {
  document.getElementById('galleryMainImg').src = galleryPhotos[currentPhotoIndex];
  document.querySelectorAll('.gallery-thumb').forEach((thumb, i) => {
    thumb.classList.toggle('active', i === currentPhotoIndex);
  });
}

loadPuppyDetail();
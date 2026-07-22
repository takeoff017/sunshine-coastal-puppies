// ===========================================
// CONNECT TO SUPABASE
// Think of this as "dialing the phone number"
// of your database so the site can talk to it.
// ===========================================
const SUPABASE_URL = 'https://uezdnawbcrrzxlcmwxfd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlemRuYXdiY3JyenhsY213eGZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2MDAyNTMsImV4cCI6MjEwMDE3NjI1M30.y5v_ED6maKUDURlIvI5zFXaYyW3lllBQVrPVDW4I0So';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===========================================
// PUPPIES — LOAD, FILTER, SEARCH, SORT
// ===========================================
let allPuppies = []; // holds every puppy we fetched, so we can filter/search without re-asking the database each time
let currentBreedFilter = 'all';

async function loadPuppies() {
  const puppyGrid = document.getElementById('puppyGrid');

  const { data: puppies, error } = await db
    .from('puppies')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    puppyGrid.innerHTML = `<p class="loading-text">Couldn't load puppies right now. Please try again shortly.</p>`;
    console.error('Error loading puppies:', error);
    return;
  }

  allPuppies = puppies || [];
  buildBreedFilters();
  renderPuppies();
}

// Builds one filter button per unique breed found in the data
function buildBreedFilters() {
  const breedFilters = document.getElementById('breedFilters');
  const uniqueBreeds = [...new Set(allPuppies.map(p => p.breed).filter(Boolean))];

  if (uniqueBreeds.length === 0) {
    breedFilters.innerHTML = '';
    return;
  }

  const buttons = ['all', ...uniqueBreeds].map(breed => `
    <button class="breed-btn ${breed === currentBreedFilter ? 'active' : ''}" data-breed="${breed}">
      ${breed === 'all' ? 'All Breeds' : breed}
    </button>
  `).join('');

  breedFilters.innerHTML = buttons;

  // Clicking a breed button filters the grid
  document.querySelectorAll('.breed-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentBreedFilter = btn.dataset.breed;
      document.querySelectorAll('.breed-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderPuppies();
    });
  });
}

// Applies the current search text, breed filter, and sort order, then draws the cards
function renderPuppies() {
  const puppyGrid = document.getElementById('puppyGrid');
  const searchText = document.getElementById('puppySearch').value.toLowerCase().trim();
  const sortValue = document.getElementById('puppySort').value;

  let filtered = allPuppies.filter(p => {
    const matchesBreed = currentBreedFilter === 'all' || p.breed === currentBreedFilter;
    const matchesSearch = !searchText ||
      (p.name && p.name.toLowerCase().includes(searchText)) ||
      (p.breed && p.breed.toLowerCase().includes(searchText));
    return matchesBreed && matchesSearch;
  });

  if (sortValue === 'price-low') {
    filtered.sort((a, b) => (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0));
  } else if (sortValue === 'price-high') {
    filtered.sort((a, b) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0));
  }
  // "newest" is already the default order from the database query

  if (filtered.length === 0) {
    puppyGrid.innerHTML = `<p class="loading-text">No puppies match your search — try a different breed or search term.</p>`;
    return;
  }

  puppyGrid.innerHTML = filtered.map(puppy => `
    <div class="puppy-card">
      <a href="puppy-detail.html?id=${puppy.id}" class="puppy-card-photo-link">
        ${puppy.photo_url
          ? `<img src="${puppy.photo_url}" alt="${puppy.name}" class="puppy-photo" />`
          : `<div class="puppy-photo-placeholder">📷 Photo coming soon</div>`
        }
      </a>
      <div class="puppy-info">
        <div class="puppy-card-header">
          <h3><a href="puppy-detail.html?id=${puppy.id}">${puppy.name}</a></h3>
          ${puppy.status ? `<span class="status-badge status-${puppy.status.toLowerCase().replace(/\s+/g, '-')}">${puppy.status}</span>` : ''}
        </div>
        <p class="puppy-breed">${puppy.breed}</p>
        <p class="puppy-meta">${puppy.gender} · ${puppy.age} · ${puppy.ready_date || 'Ready date coming soon'}</p>
        ${puppy.description ? `<p class="puppy-description">${puppy.description}</p>` : ''}
        ${puppy.price ? `<p class="puppy-price">$${puppy.price}</p>` : ''}
        <div class="puppy-card-actions">
          <a href="puppy-detail.html?id=${puppy.id}" class="btn btn-outline btn-small-outline">View Photos</a>
          <a href="${buildWhatsAppLink(puppy.name)}" target="_blank" class="btn btn-small">Ask About ${puppy.name}</a>
        </div>
      </div>
    </div>
  `).join('');
}

// ===========================================
// SETTINGS — phone, WhatsApp, Facebook, AKC badge
// Loaded once and reused everywhere on the page.
// ===========================================
let siteSettings = {};

async function loadSettings() {
  const { data, error } = await db.from('settings').select('*').eq('id', 1).single();

  if (error || !data) {
    console.error('Could not load settings:', error);
    return;
  }

  siteSettings = data;

  // Contact section
  if (data.phone) {
    document.getElementById('phoneLink').href = 'tel:' + data.phone;
    document.getElementById('phoneText').textContent = data.phone;
    document.getElementById('footerPhone').href = 'tel:' + data.phone;
  }
  if (data.whatsapp) {
    const waLink = 'https://wa.me/' + data.whatsapp.replace(/\D/g, '');
    document.getElementById('whatsappLink').href = waLink;
    document.getElementById('whatsappText').textContent = 'Message Us';
    document.getElementById('footerWhatsapp').href = waLink;
  }
  if (data.facebook) {
    document.getElementById('facebookLink').href = data.facebook;
    document.getElementById('facebookText').textContent = 'Visit Our Page';
    document.getElementById('footerFacebook').href = data.facebook;
  }
  if (data.about_text) {
    document.getElementById('footerAbout').textContent = data.about_text;
  }
  if (data.akc_badge_text) {
    document.getElementById('akcBadge').style.display = 'inline-flex';
    document.getElementById('akcBadgeText').textContent = data.akc_badge_text;
  }
  if (data.hero_image_url) {
    const heroWrap = document.getElementById('heroImageWrap');
    heroWrap.innerHTML = `<img src="${data.hero_image_url}" alt="Sunshine Coastal Puppies" style="width:100%;height:100%;object-fit:cover;border-radius:var(--radius);" />`;
  }
}

loadSettings();

// ===========================================
// FAVORITE BREEDS — photo grid
// Pulls from the "breed_photos" table so you can
// manage this entirely from the admin dashboard.
// ===========================================
async function loadBreedPhotoGrid() {
  const grid = document.getElementById('breedPhotoGrid');
  const { data: breeds, error } = await db.from('breed_photos').select('*').order('breed', { ascending: true });

  if (error) {
    grid.innerHTML = `<p class="loading-text">Couldn't load breeds right now.</p>`;
    return;
  }
  if (!breeds || breeds.length === 0) {
    grid.innerHTML = `<p class="loading-text">Breed photos coming soon.</p>`;
    return;
  }

  grid.innerHTML = breeds.map(b => `
    <button class="breed-photo-card" data-breed="${b.breed}">
      ${b.photo_url
        ? `<img src="${b.photo_url}" alt="${b.breed}" />`
        : `<div class="breed-photo-placeholder">📷</div>`
      }
      <span>${b.breed}</span>
    </button>
  `).join('');

  // Clicking a breed photo jumps down to the puppy grid and filters to that breed
  document.querySelectorAll('.breed-photo-card').forEach(card => {
    card.addEventListener('click', () => {
      const breed = card.dataset.breed;
      currentBreedFilter = breed;
      document.getElementById('puppies').scrollIntoView({ behavior: 'smooth' });
      // Wait for scroll, then update button state + filter
      setTimeout(() => {
        buildBreedFilters();
        renderPuppies();
      }, 400);
    });
  });
}

loadBreedPhotoGrid();

// Re-run the filter whenever someone types in search or changes the sort dropdown
document.getElementById('puppySearch').addEventListener('input', renderPuppies);
document.getElementById('puppySort').addEventListener('change', renderPuppies);

// Run it as soon as the page loads
loadPuppies();

// Builds a WhatsApp link with a pre-filled message mentioning the specific puppy
function buildWhatsAppLink(puppyName) {
  const phoneNumber = (siteSettings.whatsapp || '').replace(/\D/g, ''); // digits only
  const message = encodeURIComponent(`Hi! I'm interested in ${puppyName}.`);
  if (!phoneNumber) return '#contact'; // fall back to the contact section if no number is set yet
  return `https://wa.me/${phoneNumber}?text=${message}`;
}

// ===========================================
// REVIEWS — LOAD APPROVED REVIEWS ONLY
// ===========================================
async function loadReviews() {
  const reviewGrid = document.getElementById('reviewGrid');

  const { data: reviews, error } = await db
    .from('reviews')
    .select('*')
    .eq('approved', true)
    .order('created_at', { ascending: false });

  if (error) {
    reviewGrid.innerHTML = `<p class="loading-text">Couldn't load reviews right now.</p>`;
    console.error('Error loading reviews:', error);
    return;
  }

  if (!reviews || reviews.length === 0) {
    reviewGrid.innerHTML = `<p class="loading-text">No reviews yet — check back soon!</p>`;
    return;
  }

  reviewGrid.innerHTML = reviews.map(r => `
    <div class="review-card">
      ${r.rating ? `<div class="review-stars">${buildStars(r.rating)} <span class="review-rating-num">${r.rating}</span></div>` : ''}
      <p>"${r.review_text}"</p>
      <span class="review-name">— ${r.customer_name}${r.location ? ', ' + r.location : ''}</span>
    </div>
  `).join('');
}

// Turns a number like 4.5 into filled/half/empty stars
function buildStars(rating) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  let stars = '★'.repeat(fullStars);
  if (hasHalf) stars += '½';
  return `<span class="stars">${stars}</span>`;
}

loadReviews();

// ===========================================
// MOBILE MENU TOGGLE
// This makes the hamburger button (☰) open and
// close the navigation menu on small screens.
// ===========================================

const menuToggle = document.getElementById('menuToggle');
const mainNav = document.getElementById('mainNav');

menuToggle.addEventListener('click', () => {
  const isOpen = mainNav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', isOpen);
});

// Close the menu automatically when a link is clicked
// (so it doesn't stay open after jumping to a section)
document.querySelectorAll('.main-nav a').forEach(link => {
  link.addEventListener('click', () => {
    mainNav.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', false);
  });
});
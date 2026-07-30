// ===========================================
// CONNECT TO SUPABASE
// Same connection as the main site — this lets
// the admin page check logins and manage data.
// ===========================================
const SUPABASE_URL = 'https://uezdnawbcrrzxlcmwxfd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlemRuYXdiY3JyenhsY213eGZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2MDAyNTMsImV4cCI6MjEwMDE3NjI1M30.y5v_ED6maKUDURlIvI5zFXaYyW3lllBQVrPVDW4I0So';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===========================================
// UPLOAD A PHOTO FROM THE DEVICE'S GALLERY
// Takes a file the person picked, uploads it to
// Supabase Storage, and returns a real public URL
// we can save in the database — same as pasting
// a link, except we build the link for you.
// ===========================================
async function uploadPhoto(file) {
  if (!file) return null;

  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

  const { error } = await db.storage.from('photos').upload(fileName, file);
  if (error) {
    alert('Photo upload failed. Please try again.');
    console.error(error);
    return null;
  }

  const { data } = db.storage.from('photos').getPublicUrl(fileName);
  return data.publicUrl;
}

// Grab the two main screens so we can show/hide them
const loginScreen = document.getElementById('loginScreen');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const userEmailLabel = document.getElementById('userEmail');
const logoutBtn = document.getElementById('logoutBtn');

// ===========================================
// CHECK IF SOMEONE IS ALREADY LOGGED IN
// This runs the moment the page loads. If you
// already logged in before (and didn't log out),
// it skips straight to the dashboard.
// ===========================================
async function checkSession() {
  const { data: { session } } = await db.auth.getSession();

  if (session) {
    showDashboard(session.user.email);
  } else {
    showLogin();
  }
}

function showDashboard(email) {
  loginScreen.style.display = 'none';
  dashboard.style.display = 'block';
  userEmailLabel.textContent = email;
  loadPuppiesAdmin();
}

function showLogin() {
  loginScreen.style.display = 'flex';
  dashboard.style.display = 'none';
}

// ===========================================
// HANDLE THE LOGIN FORM
// ===========================================
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault(); // stops the page from refreshing on submit

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  loginError.textContent = ''; // clear any old error message

  const { data, error } = await db.auth.signInWithPassword({ email, password });

  if (error) {
    loginError.textContent = 'Incorrect email or password. Please try again.';
    return;
  }

  showDashboard(data.user.email);
});

// ===========================================
// HANDLE LOGOUT
// ===========================================
logoutBtn.addEventListener('click', async () => {
  await db.auth.signOut();
  showLogin();
});

// Run the session check as soon as the page loads
checkSession();

// ===========================================
// TAB SWITCHING
// Shows one panel at a time, hides the others.
// ===========================================
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    tabButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    tabPanels.forEach(panel => panel.style.display = 'none');
    document.getElementById(btn.dataset.tab).style.display = 'block';

    // Load fresh data whenever a tab is opened
    if (btn.dataset.tab === 'puppiesTab') loadPuppiesAdmin();
    if (btn.dataset.tab === 'reviewsTab') loadReviewsAdmin();
    if (btn.dataset.tab === 'inquiriesTab') loadInquiriesAdmin();
    if (btn.dataset.tab === 'breedsTab') loadBreedsAdmin();
    if (btn.dataset.tab === 'settingsTab') loadSettingsAdmin();
  });
});

// ===========================================
// PUPPIES — LOAD LIST
// ===========================================
async function loadPuppiesAdmin() {
  const statusEl = document.getElementById('puppyListStatus');
  const table = document.getElementById('puppyTable');
  const tbody = document.getElementById('puppyTableBody');

  const { data: puppies, error } = await db.from('puppies').select('*').order('created_at', { ascending: false });

  if (error) {
    statusEl.textContent = 'Could not load puppies.';
    return;
  }
  if (!puppies.length) {
    statusEl.textContent = 'No puppies yet — click "Add Puppy" to create your first listing.';
    table.style.display = 'none';
    return;
  }

  statusEl.textContent = '';
  table.style.display = 'table';
  tbody.innerHTML = puppies.map(p => `
    <tr>
      <td>${p.name}</td>
      <td>${p.breed}</td>
      <td>${p.status || ''}</td>
      <td>${p.price ? '$' + p.price : ''}</td>
      <td>
        <div class="table-actions">
          <button class="btn-edit" onclick="editPuppy('${p.id}')">Edit</button>
          <button class="btn-approve" onclick="managePhotos('${p.id}', '${p.name}')">Photos</button>
          <button class="btn-delete" onclick="deletePuppy('${p.id}', '${p.name}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ===========================================
// PUPPIES — SHOW/HIDE THE ADD/EDIT FORM
// ===========================================
const puppyFormCard = document.getElementById('puppyFormCard');
const puppyForm = document.getElementById('puppyForm');
const puppyFormTitle = document.getElementById('puppyFormTitle');

document.getElementById('showAddPuppyBtn').addEventListener('click', () => {
  puppyForm.reset();
  document.getElementById('puppyId').value = '';
  puppyFormTitle.textContent = 'Add a New Puppy';
  puppyFormCard.style.display = 'block';
});

document.getElementById('cancelPuppyFormBtn').addEventListener('click', () => {
  puppyFormCard.style.display = 'none';
});

// ===========================================
// PUPPIES — EDIT (fills the form with existing data)
// ===========================================
async function editPuppy(id) {
  const { data: p, error } = await db.from('puppies').select('*').eq('id', id).single();
  if (error) return alert('Could not load that puppy.');

  document.getElementById('puppyId').value = p.id;
  document.getElementById('p_name').value = p.name || '';
  document.getElementById('p_breed').value = p.breed || '';
  document.getElementById('p_gender').value = p.gender || 'Male';
  document.getElementById('p_age').value = p.age || '';
  document.getElementById('p_price').value = p.price || '';
  document.getElementById('p_ready_date').value = p.ready_date || '';
  document.getElementById('p_status').value = p.status || 'available';
  document.getElementById('p_photo_url_existing').value = p.photo_url || '';
  document.getElementById('p_photo_url').value = ''; // file inputs can't be pre-filled; existing photo stays unless a new one is chosen
  document.getElementById('p_description').value = p.description || '';

  puppyFormTitle.textContent = 'Edit ' + p.name;
  puppyFormCard.style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===========================================
// PUPPIES — SAVE (handles both Add and Edit)
// ===========================================
puppyForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = document.getElementById('puppyId').value;
  const photoFile = document.getElementById('p_photo_url').files[0];
  const existingPhotoUrl = document.getElementById('p_photo_url_existing').value;

  // Only upload a new photo if the person actually picked one; otherwise keep whatever was already saved
  const photoUrl = photoFile ? await uploadPhoto(photoFile) : existingPhotoUrl;

  const puppyData = {
    name: document.getElementById('p_name').value,
    breed: document.getElementById('p_breed').value,
    gender: document.getElementById('p_gender').value,
    age: document.getElementById('p_age').value,
    price: document.getElementById('p_price').value,
    ready_date: document.getElementById('p_ready_date').value,
    status: document.getElementById('p_status').value,
    photo_url: photoUrl,
    description: document.getElementById('p_description').value,
  };

  let error;
  if (id) {
    // Editing an existing puppy
    ({ error } = await db.from('puppies').update(puppyData).eq('id', id));
  } else {
    // Adding a brand new puppy
    ({ error } = await db.from('puppies').insert(puppyData));
  }

  if (error) {
    alert('Something went wrong saving this puppy. Please try again.');
    console.error(error);
    return;
  }

  puppyFormCard.style.display = 'none';
  loadPuppiesAdmin();
});

// ===========================================
// PUPPIES — DELETE
// ===========================================
async function deletePuppy(id, name) {
  const confirmed = confirm(`Delete ${name}? This can't be undone.`);
  if (!confirmed) return;

  const { error } = await db.from('puppies').delete().eq('id', id);
  if (error) return alert('Could not delete this puppy.');

  loadPuppiesAdmin();
}

// ===========================================
// PUPPY PHOTOS — MANAGE GALLERY
// ===========================================
const photoManagerCard = document.getElementById('photoManagerCard');
const addPhotoForm = document.getElementById('addPhotoForm');

async function managePhotos(puppyId, puppyName) {
  document.getElementById('photoManagerTitle').textContent = `Manage Photos — ${puppyName}`;
  document.getElementById('photoManagerPuppyId').value = puppyId;
  photoManagerCard.style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
  await renderPhotoManagerGrid(puppyId);
}

async function renderPhotoManagerGrid(puppyId) {
  const grid = document.getElementById('photoManagerGrid');
  const { data: photos, error } = await db.from('puppy_photos').select('*').eq('puppy_id', puppyId).order('created_at', { ascending: true });

  if (error) {
    grid.innerHTML = '<p>Could not load photos.</p>';
    return;
  }
  if (!photos.length) {
    grid.innerHTML = '<p>No extra photos yet — add one above.</p>';
    return;
  }

  grid.innerHTML = photos.map(photo => `
    <div class="photo-thumb">
      <img src="${photo.photo_url}" alt="Puppy photo" />
      <button class="btn-delete" onclick="deletePuppyPhoto('${photo.id}', '${puppyId}')">Delete</button>
    </div>
  `).join('');
}

addPhotoForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const puppyId = document.getElementById('photoManagerPuppyId').value;
  const photoFile = document.getElementById('newPhotoUrl').files[0];
  if (!photoFile) return;

  const photoUrl = await uploadPhoto(photoFile);
  if (!photoUrl) return; // upload failed, error already shown

  const { error } = await db.from('puppy_photos').insert({ puppy_id: puppyId, photo_url: photoUrl });
  if (error) {
    alert('Could not add this photo.');
    console.error(error);
    return;
  }

  document.getElementById('newPhotoUrl').value = '';
  renderPhotoManagerGrid(puppyId);
});

async function deletePuppyPhoto(photoId, puppyId) {
  const { error } = await db.from('puppy_photos').delete().eq('id', photoId);
  if (error) return alert('Could not delete this photo.');
  renderPhotoManagerGrid(puppyId);
}

document.getElementById('closePhotoManagerBtn').addEventListener('click', () => {
  photoManagerCard.style.display = 'none';
});
async function loadReviewsAdmin() {
  const statusEl = document.getElementById('reviewListStatus');
  const table = document.getElementById('reviewTable');
  const tbody = document.getElementById('reviewTableBody');

  const { data: reviews, error } = await db.from('reviews').select('*').order('created_at', { ascending: false });

  if (error) {
    statusEl.textContent = 'Could not load reviews.';
    return;
  }
  if (!reviews.length) {
    statusEl.textContent = 'No reviews yet — click "Add Review" to create one.';
    table.style.display = 'none';
    return;
  }

  statusEl.textContent = '';
  table.style.display = 'table';
  tbody.innerHTML = reviews.map(r => `
    <tr>
      <td>${r.customer_name || ''}</td>
      <td>${r.location || ''}</td>
      <td>${r.rating ? r.rating + ' ★' : ''}</td>
      <td class="message-cell">${r.review_text || ''}</td>
      <td>${r.approved ? '✅ Approved' : '⏳ Pending'}</td>
      <td>
        <div class="table-actions">
          ${!r.approved ? `<button class="btn-approve" onclick="approveReview('${r.id}')">Approve</button>` : ''}
          <button class="btn-delete" onclick="deleteReview('${r.id}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ===========================================
// REVIEWS — ADD NEW (manually entered by admin)
// ===========================================
const reviewFormCard = document.getElementById('reviewFormCard');
const reviewForm = document.getElementById('reviewForm');

document.getElementById('showAddReviewBtn').addEventListener('click', () => {
  reviewForm.reset();
  reviewFormCard.style.display = 'block';
});

document.getElementById('cancelReviewFormBtn').addEventListener('click', () => {
  reviewFormCard.style.display = 'none';
});

reviewForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const reviewData = {
    customer_name: document.getElementById('r_name').value,
    location: document.getElementById('r_location').value,
    rating: parseFloat(document.getElementById('r_rating').value),
    review_text: document.getElementById('r_text').value,
    approved: true, // reviews you add yourself are trusted, so they go live immediately
  };

  const { error } = await db.from('reviews').insert(reviewData);

  if (error) {
    alert('Something went wrong saving this review.');
    console.error(error);
    return;
  }

  reviewFormCard.style.display = 'none';
  loadReviewsAdmin();
});

async function approveReview(id) {
  const { error } = await db.from('reviews').update({ approved: true }).eq('id', id);
  if (error) return alert('Could not approve this review.');
  loadReviewsAdmin();
}

async function deleteReview(id) {
  const confirmed = confirm('Delete this review permanently?');
  if (!confirmed) return;
  const { error } = await db.from('reviews').delete().eq('id', id);
  if (error) return alert('Could not delete this review.');
  loadReviewsAdmin();
}

// ===========================================
// INQUIRIES — LOAD LIST
// ===========================================
async function loadInquiriesAdmin() {
  const statusEl = document.getElementById('inquiryListStatus');
  const table = document.getElementById('inquiryTable');
  const tbody = document.getElementById('inquiryTableBody');

  const { data: inquiries, error } = await db.from('inquiries').select('*').order('created_at', { ascending: false });

  if (error) {
    statusEl.textContent = 'Could not load inquiries.';
    return;
  }
  if (!inquiries.length) {
    statusEl.textContent = 'No inquiries yet.';
    table.style.display = 'none';
    return;
  }

  statusEl.textContent = '';
  table.style.display = 'table';
  tbody.innerHTML = inquiries.map(i => `
    <tr>
      <td>${i.customer_name || ''}</td>
      <td>${i.customer_email || ''}<br>${i.customer_phone || ''}</td>
      <td>${i.puppy_name || ''}</td>
      <td class="message-cell">${i.message || ''}</td>
      <td>
        <select onchange="updateInquiryStatus('${i.id}', this.value)">
          <option value="new" ${i.status === 'new' ? 'selected' : ''}>New</option>
          <option value="replied" ${i.status === 'replied' ? 'selected' : ''}>Replied</option>
          <option value="closed" ${i.status === 'closed' ? 'selected' : ''}>Closed</option>
        </select>
      </td>
      <td>
        <textarea class="notes-box" rows="2" onblur="saveInquiryNote('${i.id}', this.value)" placeholder="Add a note...">${i.notes || ''}</textarea>
      </td>
    </tr>
  `).join('');
}

async function saveInquiryNote(id, note) {
  const { error } = await db.from('inquiries').update({ notes: note }).eq('id', id);
  if (error) console.error('Could not save note:', error);
}

// ===========================================
// BREEDS — LOAD LIST
// ===========================================
async function loadBreedsAdmin() {
  const statusEl = document.getElementById('breedListStatus');
  const table = document.getElementById('breedTable');
  const tbody = document.getElementById('breedTableBody');

  const { data: breeds, error } = await db.from('breed_photos').select('*').order('breed', { ascending: true });

  if (error) {
    statusEl.textContent = 'Could not load breeds.';
    return;
  }
  if (!breeds.length) {
    statusEl.textContent = 'No breeds added yet — click "Add Breed" to create your first one.';
    table.style.display = 'none';
    return;
  }

  statusEl.textContent = '';
  table.style.display = 'table';
  tbody.innerHTML = breeds.map(b => `
    <tr>
      <td>${b.breed}</td>
      <td>${b.photo_url ? `<img src="${b.photo_url}" alt="${b.breed}" style="width:50px;height:50px;border-radius:50%;object-fit:cover;">` : 'No photo yet'}</td>
      <td>
        <div class="table-actions">
          <button class="btn-edit" onclick="editBreed('${b.id}')">Edit</button>
          <button class="btn-delete" onclick="deleteBreed('${b.id}', '${b.breed}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

const breedFormCard = document.getElementById('breedFormCard');
const breedForm = document.getElementById('breedForm');
let editingBreedId = null;
let editingBreedExistingPhoto = '';

document.getElementById('showAddBreedBtn').addEventListener('click', () => {
  breedForm.reset();
  editingBreedId = null;
  editingBreedExistingPhoto = '';
  breedFormCard.style.display = 'block';
});
document.getElementById('cancelBreedFormBtn').addEventListener('click', () => {
  breedFormCard.style.display = 'none';
});

async function editBreed(id) {
  const { data: b, error } = await db.from('breed_photos').select('*').eq('id', id).single();
  if (error) return alert('Could not load that breed.');
  document.getElementById('b_breed').value = b.breed;
  document.getElementById('b_photo_url').value = ''; // file inputs can't be pre-filled
  editingBreedExistingPhoto = b.photo_url || '';
  editingBreedId = id;
  breedFormCard.style.display = 'block';
}

breedForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const photoFile = document.getElementById('b_photo_url').files[0];
  const photoUrl = photoFile ? await uploadPhoto(photoFile) : editingBreedExistingPhoto;

  const breedData = {
    breed: document.getElementById('b_breed').value,
    photo_url: photoUrl,
  };

  let error;
  if (editingBreedId) {
    ({ error } = await db.from('breed_photos').update(breedData).eq('id', editingBreedId));
  } else {
    ({ error } = await db.from('breed_photos').insert(breedData));
  }

  if (error) {
    alert('Something went wrong saving this breed.');
    console.error(error);
    return;
  }

  breedFormCard.style.display = 'none';
  loadBreedsAdmin();
});

async function deleteBreed(id, name) {
  const confirmed = confirm(`Delete ${name} from the breed grid?`);
  if (!confirmed) return;
  const { error } = await db.from('breed_photos').delete().eq('id', id);
  if (error) return alert('Could not delete this breed.');
  loadBreedsAdmin();
}

// ===========================================
// SETTINGS — LOAD AND SAVE
// ===========================================
let existingHeroImageUrl = '';

async function loadSettingsAdmin() {
  const { data, error } = await db.from('settings').select('*').eq('id', 1).single();
  if (error || !data) {
    console.error('Could not load settings:', error);
    return;
  }
  document.getElementById('s_phone').value = data.phone || '';
  document.getElementById('s_whatsapp').value = data.whatsapp || '';
  document.getElementById('s_facebook').value = data.facebook || '';
  document.getElementById('s_hero_image_url').value = ''; // file inputs can't be pre-filled
  existingHeroImageUrl = data.hero_image_url || '';
  document.getElementById('s_akc_badge_text').value = data.akc_badge_text || '';
  document.getElementById('s_about_text').value = data.about_text || '';
}

document.getElementById('settingsForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const heroFile = document.getElementById('s_hero_image_url').files[0];
  const heroImageUrl = heroFile ? await uploadPhoto(heroFile) : existingHeroImageUrl;

  const settingsData = {
    phone: document.getElementById('s_phone').value,
    whatsapp: document.getElementById('s_whatsapp').value,
    facebook: document.getElementById('s_facebook').value,
    hero_image_url: heroImageUrl,
    akc_badge_text: document.getElementById('s_akc_badge_text').value,
    about_text: document.getElementById('s_about_text').value,
  };

  const { error } = await db.from('settings').update(settingsData).eq('id', 1);

  const savedMsg = document.getElementById('settingsSavedMsg');
  if (error) {
    alert('Something went wrong saving settings.');
    console.error(error);
    return;
  }

  savedMsg.style.display = 'block';
  setTimeout(() => savedMsg.style.display = 'none', 2500);
});

async function updateInquiryStatus(id, newStatus) {
  const { error } = await db.from('inquiries').update({ status: newStatus }).eq('id', id);
  if (error) alert('Could not update status.');
}

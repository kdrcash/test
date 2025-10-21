import {
  getListings,
  createListing,
  updateListing,
  deleteListing
} from './listings.js';

const PASSWORD_STORAGE_KEY = 'medibridge-admin-password';
const API_BASE = window.location.origin;

// DOM Elements
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const loginForm = document.getElementById('login-form');
const passwordInput = document.getElementById('admin-password');
const loginError = document.getElementById('login-error');
const logoutButton = document.getElementById('logout-button');

// Stats
const statsListingsCount = document.getElementById('stats-listings-count');
const statsConsultationsCount = document.getElementById('stats-consultations-count');
const statsPendingCount = document.getElementById('stats-pending-count');
const statsCompletedCount = document.getElementById('stats-completed-count');

// Tabs
const tabButtons = document.querySelectorAll('.tab-button');
const consultationsTab = document.getElementById('consultations-tab');
const listingsTab = document.getElementById('listings-tab');

// Consultations
const consultationsTableBody = document.getElementById('consultations-table-body');
const consultationsEmpty = document.getElementById('consultations-empty');
const statusFilters = document.querySelectorAll('[data-status-filter]');

// Listings
const listingForm = document.getElementById('listing-form');
const listingIdInput = document.getElementById('listing-id');
const listingFeedback = document.getElementById('listing-feedback');
const listingsTableBody = document.getElementById('listings-table-body');
const listingsEmpty = document.getElementById('listings-empty');
const resetButton = document.getElementById('listing-reset');
const submitButton = document.getElementById('listing-submit');
const titleInput = document.getElementById('listing-title');
const locationInput = document.getElementById('listing-location');
const categorySelect = document.getElementById('listing-category');
const priceInput = document.getElementById('listing-price');
const descriptionInput = document.getElementById('listing-description');
const highlightInputs = [
  document.getElementById('listing-highlight-1'),
  document.getElementById('listing-highlight-2'),
  document.getElementById('listing-highlight-3')
];

// Modal
const consultationModal = document.getElementById('consultation-modal');
const modalConsultationName = document.getElementById('modal-consultation-name');
const modalConsultationEmail = document.getElementById('modal-consultation-email');
const modalConsultationPhone = document.getElementById('modal-consultation-phone');
const modalConsultationDate = document.getElementById('modal-consultation-date');
const modalConsultationMessage = document.getElementById('modal-consultation-message');
const modalConsultationStatus = document.getElementById('modal-consultation-status');
const modalConsultationNotes = document.getElementById('modal-consultation-notes');
const saveConsultationBtn = document.getElementById('save-consultation-btn');
const deleteConsultationBtn = document.getElementById('delete-consultation-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const modalCloseButton = consultationModal?.querySelector('.modal-close');
const modalOverlay = consultationModal?.querySelector('.modal-overlay');

// State
let adminPassword = null;
let cachedListings = [];
let cachedConsultations = [];
let currentConsultationId = null;
let currentStatusFilter = 'all';

// ===== Utility Functions =====

function getStoredPassword() {
  try {
    return sessionStorage.getItem(PASSWORD_STORAGE_KEY);
  } catch (error) {
    return null;
  }
}

function storePassword(password) {
  try {
    sessionStorage.setItem(PASSWORD_STORAGE_KEY, password);
  } catch (error) {
    // ignore
  }
}

function clearStoredPassword() {
  try {
    sessionStorage.removeItem(PASSWORD_STORAGE_KEY);
  } catch (error) {
    // ignore
  }
}

function showFeedback(element, message, isError = false) {
  if (!element) return;
  element.textContent = message;
  element.hidden = false;
  element.classList.toggle('form-error', isError);
  if (!isError) {
    element.classList.add('form-success');
  } else {
    element.classList.remove('form-success');
  }
}

function hideFeedback(element) {
  if (!element) return;
  element.hidden = true;
  element.textContent = '';
  element.classList.remove('form-error', 'form-success');
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function translateCategory(category) {
  switch (category) {
    case 'general': return '종합병원';
    case 'dental': return '치과';
    case 'rehab': return '재활/요양';
    default: return category;
  }
}

function translateStatus(status) {
  switch (status) {
    case 'pending': return '대기';
    case 'contacted': return '연락완료';
    case 'completed': return '완료';
    case 'cancelled': return '취소';
    default: return status;
  }
}

function getStatusColor(status) {
  switch (status) {
    case 'pending': return '#f59e0b';
    case 'contacted': return '#3b82f6';
    case 'completed': return '#10b981';
    case 'cancelled': return '#ef4444';
    default: return '#6b7a90';
  }
}

// ===== API Functions =====

async function fetchConsultations(password) {
  const response = await fetch(`${API_BASE}/api/consultations`, {
    headers: {
      'X-Admin-Password': password
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch consultations');
  }

  return response.json();
}

async function updateConsultation(id, data, password) {
  const response = await fetch(`${API_BASE}/api/consultations/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Password': password
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error('Failed to update consultation');
  }

  return response.json();
}

async function deleteConsultation(id, password) {
  const response = await fetch(`${API_BASE}/api/consultations/${id}`, {
    method: 'DELETE',
    headers: {
      'X-Admin-Password': password
    }
  });

  if (!response.ok) {
    throw new Error('Failed to delete consultation');
  }

  return response.json();
}

// ===== Dashboard Functions =====

function toggleDashboard(visible) {
  if (!loginSection || !dashboardSection) return;

  if (visible) {
    loginSection.hidden = true;
    dashboardSection.hidden = false;
    logoutButton?.removeAttribute('hidden');
  } else {
    loginSection.hidden = false;
    dashboardSection.hidden = true;
    logoutButton?.setAttribute('hidden', '');
  }
}

function updateStats() {
  const totalListings = cachedListings.length;
  const totalConsultations = cachedConsultations.length;
  const pendingConsultations = cachedConsultations.filter(c => c.status === 'pending').length;
  const completedConsultations = cachedConsultations.filter(c => c.status === 'completed').length;

  if (statsListingsCount) statsListingsCount.textContent = totalListings;
  if (statsConsultationsCount) statsConsultationsCount.textContent = totalConsultations;
  if (statsPendingCount) statsPendingCount.textContent = pendingConsultations;
  if (statsCompletedCount) statsCompletedCount.textContent = completedConsultations;
}

// ===== Tab Functions =====

function switchTab(tabName) {
  tabButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  if (consultationsTab) {
    consultationsTab.classList.toggle('active', tabName === 'consultations');
  }
  if (listingsTab) {
    listingsTab.classList.toggle('active', tabName === 'listings');
  }
}

// ===== Consultations Functions =====

function renderConsultations(consultations) {
  if (!consultationsTableBody) return;

  consultationsTableBody.innerHTML = '';

  const filtered = currentStatusFilter === 'all'
    ? consultations
    : consultations.filter(c => c.status === currentStatusFilter);

  if (!filtered.length) {
    if (consultationsEmpty) consultationsEmpty.hidden = false;
    return;
  }

  if (consultationsEmpty) consultationsEmpty.hidden = true;

  // Sort by date (newest first)
  const sorted = [...filtered].sort((a, b) =>
    new Date(b.createdAt) - new Date(a.createdAt)
  );

  sorted.forEach(consultation => {
    const row = document.createElement('tr');

    const nameCell = document.createElement('td');
    const nameButton = document.createElement('button');
    nameButton.type = 'button';
    nameButton.classList.add('table-link');
    nameButton.textContent = consultation.name;
    nameButton.addEventListener('click', () => openConsultationModal(consultation.id));
    nameCell.appendChild(nameButton);
    row.appendChild(nameCell);

    const contactCell = document.createElement('td');
    contactCell.textContent = consultation.phone || consultation.email || '-';
    row.appendChild(contactCell);

    const dateCell = document.createElement('td');
    const date = new Date(consultation.createdAt);
    dateCell.textContent = date.toLocaleDateString('ko-KR');
    row.appendChild(dateCell);

    const statusCell = document.createElement('td');
    const statusBadge = document.createElement('span');
    statusBadge.textContent = translateStatus(consultation.status);
    statusBadge.style.cssText = `
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 999px;
      font-size: 0.85rem;
      font-weight: 600;
      background: ${getStatusColor(consultation.status)}20;
      color: ${getStatusColor(consultation.status)};
    `;
    statusCell.appendChild(statusBadge);
    row.appendChild(statusCell);

    const actionsCell = document.createElement('td');
    actionsCell.classList.add('table-actions');

    const viewButton = document.createElement('button');
    viewButton.type = 'button';
    viewButton.classList.add('btn', 'btn-outline');
    viewButton.textContent = '상세';
    viewButton.addEventListener('click', () => openConsultationModal(consultation.id));

    actionsCell.appendChild(viewButton);
    row.appendChild(actionsCell);

    consultationsTableBody.appendChild(row);
  });
}

function openConsultationModal(consultationId) {
  const consultation = cachedConsultations.find(c => c.id === consultationId);
  if (!consultation) return;

  currentConsultationId = consultationId;

  if (modalConsultationName) modalConsultationName.textContent = consultation.name;
  if (modalConsultationEmail) modalConsultationEmail.textContent = consultation.email;
  if (modalConsultationPhone) modalConsultationPhone.textContent = consultation.phone || '-';
  if (modalConsultationDate) modalConsultationDate.textContent = formatDate(consultation.createdAt);
  if (modalConsultationMessage) modalConsultationMessage.textContent = consultation.message;
  if (modalConsultationStatus) modalConsultationStatus.value = consultation.status || 'pending';
  if (modalConsultationNotes) modalConsultationNotes.value = consultation.notes || '';

  if (consultationModal) consultationModal.hidden = false;
}

function closeConsultationModal() {
  if (consultationModal) consultationModal.hidden = true;
  currentConsultationId = null;
}

async function saveConsultation() {
  if (!currentConsultationId || !adminPassword) return;

  const status = modalConsultationStatus?.value;
  const notes = modalConsultationNotes?.value;

  try {
    await updateConsultation(currentConsultationId, { status, notes }, adminPassword);
    await refreshData();
    closeConsultationModal();
  } catch (error) {
    console.error('Failed to save consultation:', error);
    alert('상담 정보 저장에 실패했습니다.');
  }
}

async function handleDeleteConsultation() {
  if (!currentConsultationId || !adminPassword) return;

  const consultation = cachedConsultations.find(c => c.id === currentConsultationId);
  if (!consultation) return;

  const confirmed = window.confirm(`"${consultation.name}" 님의 상담 문의를 삭제하시겠습니까?`);
  if (!confirmed) return;

  try {
    await deleteConsultation(currentConsultationId, adminPassword);
    await refreshData();
    closeConsultationModal();
  } catch (error) {
    console.error('Failed to delete consultation:', error);
    alert('삭제 중 오류가 발생했습니다.');
  }
}

// ===== Listings Functions =====

function renderListingsTable(listings) {
  if (!listingsTableBody) return;

  listingsTableBody.innerHTML = '';

  if (!listings.length) {
    if (listingsEmpty) listingsEmpty.hidden = false;
    return;
  }

  if (listingsEmpty) listingsEmpty.hidden = true;

  listings.forEach(listing => {
    const row = document.createElement('tr');

    const titleCell = document.createElement('td');
    const titleButton = document.createElement('button');
    titleButton.type = 'button';
    titleButton.classList.add('table-link');
    titleButton.textContent = listing.title;
    titleButton.addEventListener('click', () => startEditingListing(listing.id));
    titleCell.appendChild(titleButton);
    row.appendChild(titleCell);

    const locationCell = document.createElement('td');
    locationCell.textContent = listing.location;
    row.appendChild(locationCell);

    const categoryCell = document.createElement('td');
    categoryCell.textContent = translateCategory(listing.category);
    row.appendChild(categoryCell);

    const priceCell = document.createElement('td');
    priceCell.textContent = listing.price;
    row.appendChild(priceCell);

    const actionsCell = document.createElement('td');
    actionsCell.classList.add('table-actions');

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.classList.add('btn', 'btn-outline');
    editButton.textContent = '수정';
    editButton.addEventListener('click', () => startEditingListing(listing.id));

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.classList.add('btn', 'btn-danger');
    deleteButton.textContent = '삭제';
    deleteButton.addEventListener('click', () => handleDeleteListing(listing.id));

    actionsCell.appendChild(editButton);
    actionsCell.appendChild(deleteButton);
    row.appendChild(actionsCell);

    listingsTableBody.appendChild(row);
  });
}

function resetListingForm() {
  if (!listingForm) return;
  listingForm.reset();
  listingIdInput.value = '';
  highlightInputs.forEach(input => {
    if (input) input.value = '';
  });
  hideFeedback(listingFeedback);
  resetButton?.setAttribute('hidden', '');
  if (submitButton) submitButton.textContent = '저장하기';
}

function populateListingForm(listing) {
  if (!listingForm) return;

  listingIdInput.value = listing.id;
  if (titleInput) titleInput.value = listing.title;
  if (locationInput) locationInput.value = listing.location;
  if (categorySelect) categorySelect.value = listing.category;
  if (priceInput) priceInput.value = listing.price;
  if (descriptionInput) descriptionInput.value = listing.description;

  const highlights = Array.isArray(listing.highlights) ? listing.highlights : [];
  highlightInputs.forEach((input, index) => {
    if (input) input.value = highlights[index] || '';
  });

  if (submitButton) submitButton.textContent = '변경사항 저장';
  resetButton?.removeAttribute('hidden');
  listingForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function startEditingListing(listingId) {
  const listing = cachedListings.find(item => item.id === listingId);
  if (!listing) {
    showFeedback(listingFeedback, '선택한 매물을 찾을 수 없습니다.', true);
    return;
  }
  populateListingForm(listing);
}

async function handleDeleteListing(listingId) {
  if (!adminPassword) return;

  const listing = cachedListings.find(item => item.id === listingId);
  if (!listing) {
    showFeedback(listingFeedback, '선택한 매물을 찾을 수 없습니다.', true);
    return;
  }

  const confirmed = window.confirm(`"${listing.title}" 매물을 삭제하시겠습니까?`);
  if (!confirmed) return;

  try {
    await deleteListing(listingId, adminPassword);
    showFeedback(listingFeedback, '매물이 삭제되었습니다.');
    await refreshData();
    resetListingForm();
  } catch (error) {
    console.error('Failed to delete listing:', error);
    showFeedback(listingFeedback, error.message || '삭제 중 오류가 발생했습니다.', true);
  }
}

async function handleListingSubmit(event) {
  event.preventDefault();
  hideFeedback(listingFeedback);

  if (!adminPassword) {
    showFeedback(listingFeedback, '먼저 로그인해 주세요.', true);
    return;
  }

  const formData = new FormData(listingForm);
  const payload = {
    title: formData.get('title')?.toString().trim(),
    location: formData.get('location')?.toString().trim(),
    category: formData.get('category')?.toString().trim(),
    price: formData.get('price')?.toString().trim(),
    description: formData.get('description')?.toString().trim(),
    highlights: [
      formData.get('highlight1')?.toString().trim(),
      formData.get('highlight2')?.toString().trim(),
      formData.get('highlight3')?.toString().trim()
    ].filter(value => value)
  };

  const missingField = Object.entries(payload).find(([key, value]) => {
    if (key === 'highlights') return false;
    return typeof value !== 'string' || value.length === 0;
  });

  if (missingField) {
    showFeedback(listingFeedback, '필수 입력 항목을 확인해 주세요.', true);
    return;
  }

  const listingId = listingIdInput.value;
  try {
    if (listingId) {
      await updateListing(listingId, payload, adminPassword);
      showFeedback(listingFeedback, '매물이 성공적으로 수정되었습니다.');
    } else {
      await createListing(payload, adminPassword);
      showFeedback(listingFeedback, '새로운 매물이 등록되었습니다.');
    }
    await refreshData();
    resetListingForm();
  } catch (error) {
    console.error('Failed to submit listing:', error);
    const message = error.message || '요청 처리 중 오류가 발생했습니다.';
    showFeedback(listingFeedback, message, true);
  }
}

// ===== Data Management =====

async function refreshData() {
  if (!adminPassword) return;

  try {
    const [listings, consultations] = await Promise.all([
      getListings(adminPassword),
      fetchConsultations(adminPassword)
    ]);

    cachedListings = listings;
    cachedConsultations = consultations;

    updateStats();
    renderConsultations(consultations);
    renderListingsTable(listings);
  } catch (error) {
    console.error('Failed to refresh data:', error);
  }
}

// ===== Auth Functions =====

async function handleLogin(event) {
  event.preventDefault();
  hideFeedback(loginError);

  const password = passwordInput?.value?.trim();
  if (!password) {
    showFeedback(loginError, '비밀번호를 입력해 주세요.', true);
    return;
  }

  try {
    // Verify password by fetching consultations
    await fetchConsultations(password);
    adminPassword = password;
    storePassword(password);
    toggleDashboard(true);
    await refreshData();
    resetListingForm();
    passwordInput.value = '';
  } catch (error) {
    console.error('Login failed:', error);
    showFeedback(loginError, '비밀번호가 올바르지 않습니다.', true);
  }
}

function handleLogout() {
  adminPassword = null;
  cachedListings = [];
  cachedConsultations = [];
  clearStoredPassword();
  toggleDashboard(false);
  updateStats();
  renderConsultations([]);
  renderListingsTable([]);
  resetListingForm();
}

async function restoreSession() {
  const stored = getStoredPassword();
  if (!stored) return;

  try {
    await fetchConsultations(stored);
    adminPassword = stored;
    toggleDashboard(true);
    await refreshData();
  } catch {
    clearStoredPassword();
  }
}

// ===== Event Listeners =====

if (loginForm) {
  loginForm.addEventListener('submit', handleLogin);
}

if (logoutButton) {
  logoutButton.addEventListener('click', handleLogout);
}

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

statusFilters.forEach(btn => {
  btn.addEventListener('click', () => {
    currentStatusFilter = btn.dataset.statusFilter;
    statusFilters.forEach(b => {
      b.classList.toggle('btn-primary', b === btn);
      b.classList.toggle('btn-outline', b !== btn);
    });
    renderConsultations(cachedConsultations);
  });
});

if (listingForm) {
  listingForm.addEventListener('submit', handleListingSubmit);
}

if (resetButton) {
  resetButton.addEventListener('click', resetListingForm);
}

if (saveConsultationBtn) {
  saveConsultationBtn.addEventListener('click', saveConsultation);
}

if (deleteConsultationBtn) {
  deleteConsultationBtn.addEventListener('click', handleDeleteConsultation);
}

if (closeModalBtn) {
  closeModalBtn.addEventListener('click', closeConsultationModal);
}

if (modalCloseButton) {
  modalCloseButton.addEventListener('click', closeConsultationModal);
}

if (modalOverlay) {
  modalOverlay.addEventListener('click', closeConsultationModal);
}

// ===== Initialization =====

document.addEventListener('DOMContentLoaded', () => {
  renderConsultations([]);
  renderListingsTable([]);
  updateStats();
  restoreSession();
});

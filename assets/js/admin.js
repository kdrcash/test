import {
  getListings,
  createListing,
  updateListing,
  deleteListing
} from './listings.js';

const PASSWORD_STORAGE_KEY = 'medibridge-admin-password';

const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const loginForm = document.getElementById('login-form');
const passwordInput = document.getElementById('admin-password');
const loginError = document.getElementById('login-error');
const logoutButton = document.getElementById('logout-button');

const listingForm = document.getElementById('listing-form');
const listingIdInput = document.getElementById('listing-id');
const listingFeedback = document.getElementById('listing-feedback');
const tableBody = document.getElementById('listings-table-body');
const tableEmpty = document.getElementById('table-empty');
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

let cachedListings = [];
let adminPassword = null;

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
    // ignore storage errors
  }
}

function clearStoredPassword() {
  try {
    sessionStorage.removeItem(PASSWORD_STORAGE_KEY);
  } catch (error) {
    // ignore storage errors
  }
}

function toggleDashboard(visible) {
  if (!loginSection || !dashboardSection) {
    return;
  }

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

function renderTable(listings) {
  if (!tableBody) {
    return;
  }

  tableBody.innerHTML = '';

  if (!listings.length) {
    if (tableEmpty) {
      tableEmpty.hidden = false;
    }
    return;
  }

  if (tableEmpty) {
    tableEmpty.hidden = true;
  }

  listings.forEach((listing) => {
    const row = document.createElement('tr');

    const titleCell = document.createElement('td');
    const titleButton = document.createElement('button');
    titleButton.type = 'button';
    titleButton.classList.add('table-link');
    titleButton.textContent = listing.title;
    titleButton.addEventListener('click', () => startEditing(listing.id));
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
    editButton.addEventListener('click', () => startEditing(listing.id));

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.classList.add('btn', 'btn-danger');
    deleteButton.textContent = '삭제';
    deleteButton.addEventListener('click', () => handleDelete(listing.id));

    actionsCell.appendChild(editButton);
    actionsCell.appendChild(deleteButton);
    row.appendChild(actionsCell);

    tableBody.appendChild(row);
  });
}

function translateCategory(category) {
  switch (category) {
    case 'general':
      return '종합병원';
    case 'dental':
      return '치과';
    case 'rehab':
      return '재활/요양';
    default:
      return category;
  }
}

function showFeedback(element, message, isError = false) {
  if (!element) {
    return;
  }

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
  if (!element) {
    return;
  }

  element.hidden = true;
  element.textContent = '';
  element.classList.remove('form-error', 'form-success');
}

function resetForm() {
  if (!listingForm) {
    return;
  }
  listingForm.reset();
  listingIdInput.value = '';
  highlightInputs.forEach((input) => {
    if (input) {
      input.value = '';
    }
  });
  hideFeedback(listingFeedback);
  resetButton?.setAttribute('hidden', '');
  if (submitButton) {
    submitButton.textContent = '저장하기';
  }
}

function populateForm(listing) {
  if (!listingForm) {
    return;
  }

  listingIdInput.value = listing.id;
  if (titleInput) {
    titleInput.value = listing.title;
  }
  if (locationInput) {
    locationInput.value = listing.location;
  }
  if (categorySelect) {
    categorySelect.value = listing.category;
  }
  if (priceInput) {
    priceInput.value = listing.price;
  }
  if (descriptionInput) {
    descriptionInput.value = listing.description;
  }

  const highlights = Array.isArray(listing.highlights) ? listing.highlights : [];
  highlightInputs.forEach((input, index) => {
    if (input) {
      input.value = highlights[index] || '';
    }
  });

  if (submitButton) {
    submitButton.textContent = '변경사항 저장';
  }
  resetButton?.removeAttribute('hidden');
  listingForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function refreshListings() {
  if (!adminPassword) {
    return;
  }

  try {
    cachedListings = await getListings(adminPassword);
    renderTable(cachedListings);
  } catch (error) {
    console.error('Failed to refresh listings:', error);
    showFeedback(listingFeedback, '매물 목록을 불러오지 못했습니다.', true);
  }
}

function startEditing(listingId) {
  const listing = cachedListings.find((item) => item.id === listingId);
  if (!listing) {
    showFeedback(listingFeedback, '선택한 매물을 찾을 수 없습니다.', true);
    return;
  }
  populateForm(listing);
}

async function handleDelete(listingId) {
  if (!adminPassword) {
    return;
  }

  const listing = cachedListings.find((item) => item.id === listingId);
  if (!listing) {
    showFeedback(listingFeedback, '선택한 매물을 찾을 수 없습니다.', true);
    return;
  }

  const confirmed = window.confirm(`"${listing.title}" 매물을 삭제하시겠습니까?`);
  if (!confirmed) {
    return;
  }

  try {
    await deleteListing(listingId, adminPassword);
    showFeedback(listingFeedback, '매물이 삭제되었습니다.');
    await refreshListings();
    resetForm();
  } catch (error) {
    console.error('Failed to delete listing:', error);
    showFeedback(listingFeedback, error.message || '삭제 중 오류가 발생했습니다.', true);
  }
}

async function handleLogin(event) {
  event.preventDefault();
  hideFeedback(loginError);

  const password = passwordInput?.value?.trim();
  if (!password) {
    showFeedback(loginError, '비밀번호를 입력해 주세요.', true);
    return;
  }

  try {
    const listings = await getListings(password);
    adminPassword = password;
    storePassword(password);
    cachedListings = listings;
    toggleDashboard(true);
    renderTable(cachedListings);
    resetForm();
    passwordInput.value = '';
  } catch (error) {
    console.error('Login failed:', error);
    showFeedback(loginError, '비밀번호가 올바르지 않습니다.', true);
  }
}

async function handleSubmit(event) {
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
    ].filter((value) => value)
  };

  const missingField = Object.entries(payload).find(([key, value]) => {
    if (key === 'highlights') {
      return false;
    }
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
    await refreshListings();
    resetForm();
  } catch (error) {
    console.error('Failed to submit listing:', error);
    const message = error.message || '요청 처리 중 오류가 발생했습니다.';
    showFeedback(listingFeedback, message, true);
  }
}

function handleReset() {
  resetForm();
}

function handleLogout() {
  adminPassword = null;
  cachedListings = [];
  clearStoredPassword();
  toggleDashboard(false);
  renderTable([]);
  resetForm();
}

function restoreSession() {
  const stored = getStoredPassword();
  if (!stored) {
    return;
  }

  getListings(stored)
    .then((listings) => {
      adminPassword = stored;
      cachedListings = listings;
      toggleDashboard(true);
      renderTable(cachedListings);
    })
    .catch(() => {
      clearStoredPassword();
    });
}

if (loginForm) {
  loginForm.addEventListener('submit', handleLogin);
}

if (listingForm) {
  listingForm.addEventListener('submit', handleSubmit);
}

resetButton?.addEventListener('click', handleReset);
logoutButton?.addEventListener('click', handleLogout);

document.addEventListener('DOMContentLoaded', () => {
  renderTable([]);
  restoreSession();
});

const API_ENDPOINT = '/api/listings';

function buildHeaders(password, extraHeaders = {}) {
  const headers = new Headers(extraHeaders);
  if (password) {
    headers.set('X-Admin-Password', password);
  }
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return headers;
}

async function handleResponse(response) {
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const message = payload?.error || '요청을 처리하는 동안 오류가 발생했습니다.';
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export async function getListings(password) {
  const response = await fetch(API_ENDPOINT, {
    headers: buildHeaders(password, { 'Content-Type': 'application/json' })
  });
  return handleResponse(response);
}

export async function createListing(listing, password) {
  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: buildHeaders(password),
    body: JSON.stringify(listing)
  });
  return handleResponse(response);
}

export async function updateListing(id, listing, password) {
  const response = await fetch(`${API_ENDPOINT}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: buildHeaders(password),
    body: JSON.stringify(listing)
  });
  return handleResponse(response);
}

export async function deleteListing(id, password) {
  const response = await fetch(`${API_ENDPOINT}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: buildHeaders(password, { 'Content-Type': 'application/json' })
  });
  return handleResponse(response);
}

export function createListingCard(listing) {
  const article = document.createElement('article');
  article.classList.add('listing-card');
  article.dataset.category = listing.category || 'unknown';

  const location = document.createElement('span');
  location.classList.add('tag');
  location.textContent = listing.location || '';
  article.appendChild(location);

  const title = document.createElement('h3');
  title.textContent = listing.title || '';
  article.appendChild(title);

  const description = document.createElement('p');
  description.textContent = listing.description || '';
  article.appendChild(description);

  if (Array.isArray(listing.highlights) && listing.highlights.length > 0) {
    const meta = document.createElement('div');
    meta.classList.add('listing-meta');
    listing.highlights.forEach((highlight) => {
      const span = document.createElement('span');
      span.textContent = highlight;
      meta.appendChild(span);
    });
    article.appendChild(meta);
  }

  const price = document.createElement('p');
  price.classList.add('price');
  price.textContent = listing.price || '';
  article.appendChild(price);

  const cta = document.createElement('a');
  cta.classList.add('btn', 'btn-outline');
  cta.href = '#contact';
  cta.textContent = '매물 상세 문의';
  article.appendChild(cta);

  return article;
}

export function renderListingCards(listings, container) {
  if (!container) {
    return;
  }

  container.innerHTML = '';
  listings.forEach((listing) => {
    container.appendChild(createListingCard(listing));
  });
}

export function initListingGrid({
  containerSelector = '#listing-grid',
  filterSelector = '[data-filter]',
  emptyStateSelector
} = {}) {
  const container = document.querySelector(containerSelector);
  if (!container) {
    return;
  }

  const filterButtons = Array.from(document.querySelectorAll(filterSelector));
  const emptyState = emptyStateSelector ? document.querySelector(emptyStateSelector) : null;
  let allListings = [];
  let activeFilter = 'all';

  function setActiveButton(button) {
    filterButtons.forEach((btn) => {
      const isActive = btn === button;
      btn.classList.toggle('btn-primary', isActive);
      btn.classList.toggle('btn-outline', !isActive);
    });
  }

  function updateView() {
    const filtered =
      activeFilter === 'all'
        ? allListings
        : allListings.filter((listing) => listing.category === activeFilter);

    renderListingCards(filtered, container);

    if (emptyState) {
      emptyState.hidden = filtered.length > 0;
      if (!filtered.length && allListings.length > 0) {
        emptyState.textContent = '선택한 카테고리에 해당하는 매물이 없습니다.';
      } else if (!filtered.length) {
        emptyState.textContent = '등록된 매물이 없습니다. 새로운 매물을 준비 중입니다.';
      }
    }
  }

  const defaultButton =
    filterButtons.find((btn) => (btn.dataset.filter || 'all') === activeFilter) || filterButtons[0];
  if (defaultButton) {
    activeFilter = defaultButton.dataset.filter || 'all';
    setActiveButton(defaultButton);
  }

  filterButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      activeFilter = button.dataset.filter || 'all';
      setActiveButton(button);
      updateView();
    });
  });

  getListings()
    .then((data) => {
      allListings = Array.isArray(data) ? data : [];
      updateView();
    })
    .catch((error) => {
      console.error('Failed to load listings:', error);
      if (emptyState) {
        emptyState.hidden = false;
        emptyState.textContent = '매물을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
      }
      container.innerHTML = '';
    });
}

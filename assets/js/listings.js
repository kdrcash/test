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
  article.style.cursor = 'pointer';

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
  cta.href = '#';
  cta.textContent = '상세 정보 보기';
  article.appendChild(cta);

  // Add click event to show modal
  article.addEventListener('click', (e) => {
    e.preventDefault();
    showListingModal(listing);
  });

  return article;
}

export function showListingModal(listing) {
  const modal = document.getElementById('listing-modal');
  const modalBody = document.getElementById('modal-body');

  if (!modal || !modalBody) {
    return;
  }

  // Format dates
  const createdDate = listing.createdAt
    ? new Date(listing.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';
  const updatedDate = listing.updatedAt
    ? new Date(listing.updatedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  // Get category name
  const categoryNames = {
    general: '종합병원',
    dental: '치과',
    rehab: '재활/요양'
  };
  const categoryName = categoryNames[listing.category] || listing.category || '기타';

  // Build modal content
  modalBody.innerHTML = `
    <div class="modal-header">
      <span class="tag modal-location">${listing.location || ''}</span>
      <h2 class="modal-title">${listing.title || ''}</h2>
      <p class="modal-price">${listing.price || ''}</p>
    </div>

    <div class="modal-section">
      <h3 class="modal-section-title">매물 설명</h3>
      <p class="modal-description">${listing.description || ''}</p>
    </div>

    ${Array.isArray(listing.highlights) && listing.highlights.length > 0 ? `
      <div class="modal-section">
        <h3 class="modal-section-title">핵심 포인트</h3>
        <div class="modal-highlights">
          ${listing.highlights.map(highlight => `
            <div class="modal-highlight-item">${highlight}</div>
          `).join('')}
        </div>
      </div>
    ` : ''}

    <div class="modal-section">
      <h3 class="modal-section-title">기본 정보</h3>
      <div class="modal-meta">
        <div class="modal-meta-item">
          <span class="modal-meta-label">카테고리</span>
          <span class="modal-meta-value">${categoryName}</span>
        </div>
        <div class="modal-meta-item">
          <span class="modal-meta-label">지역</span>
          <span class="modal-meta-value">${listing.location || '-'}</span>
        </div>
        ${createdDate ? `
          <div class="modal-meta-item">
            <span class="modal-meta-label">등록일</span>
            <span class="modal-meta-value">${createdDate}</span>
          </div>
        ` : ''}
        ${updatedDate ? `
          <div class="modal-meta-item">
            <span class="modal-meta-label">최종 수정일</span>
            <span class="modal-meta-value">${updatedDate}</span>
          </div>
        ` : ''}
      </div>
    </div>

    <div class="modal-actions">
      <a href="#contact" class="btn btn-primary">상담 신청하기</a>
      <button class="btn btn-outline modal-close-btn">닫기</button>
    </div>
  `;

  // Show modal
  modal.hidden = false;
  document.body.style.overflow = 'hidden';

  // Setup close handlers
  const closeModal = () => {
    modal.hidden = true;
    document.body.style.overflow = '';
  };

  const closeButton = modal.querySelector('.modal-close');
  const closeBtn = modalBody.querySelector('.modal-close-btn');
  const overlay = modal.querySelector('.modal-overlay');

  closeButton.onclick = closeModal;
  closeBtn.onclick = closeModal;
  overlay.onclick = closeModal;

  // Close on Escape key
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);

  // Focus close button for accessibility
  closeButton.focus();
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

const filterButtons = document.querySelectorAll('[data-filter]');
const listingCards = document.querySelectorAll('[data-category]');
const contactForm = document.querySelector('.contact-form');
const successMessage = document.querySelector('#form-success');

function setActiveFilter(button) {
  filterButtons.forEach((btn) => btn.classList.remove('btn-primary'));
  button.classList.add('btn-primary');
}

function filterListings(category) {
  listingCards.forEach((card) => {
    const isMatch = category === 'all' || card.dataset.category === category;
    card.style.display = isMatch ? 'flex' : 'none';
  });
}

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setActiveFilter(button);
    filterListings(button.dataset.filter);
  });
});

if (contactForm) {
  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(contactForm);
    const name = formData.get('name');

    if (successMessage) {
      successMessage.textContent = `${name || '고객님'}의 상담 요청이 정상적으로 접수되었습니다.`;
      successMessage.hidden = false;
      successMessage.focus();
    }

    contactForm.reset();
  });
}

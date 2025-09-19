const contactForm = document.querySelector('.contact-form');
const successMessage = document.querySelector('#form-success');

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

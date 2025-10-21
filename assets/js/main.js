const contactForm = document.querySelector('.contact-form');
const successMessage = document.querySelector('#form-success');

if (contactForm) {
  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(contactForm);
    const name = formData.get('name');
    const email = formData.get('email');
    const phone = formData.get('phone');
    const message = formData.get('message');

    const payload = {
      name: name?.toString().trim() || '',
      email: email?.toString().trim() || '',
      phone: phone?.toString().trim() || '',
      message: message?.toString().trim() || ''
    };

    // Disable submit button while processing
    const submitButton = contactForm.querySelector('button[type="submit"]');
    const originalText = submitButton?.textContent;
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = '전송 중...';
    }

    try {
      const response = await fetch('/api/consultations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('상담 신청 전송에 실패했습니다.');
      }

      if (successMessage) {
        successMessage.textContent = `${name || '고객님'}의 상담 요청이 정상적으로 접수되었습니다. 빠른 시일 내에 연락드리겠습니다.`;
        successMessage.hidden = false;
        successMessage.style.color = '#137333';
        successMessage.focus();
      }

      contactForm.reset();
    } catch (error) {
      console.error('Failed to submit consultation:', error);

      if (successMessage) {
        successMessage.textContent = '상담 신청 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
        successMessage.hidden = false;
        successMessage.style.color = '#d93025';
        successMessage.focus();
      }
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    }
  });
}

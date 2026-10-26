(() => {
  const dialog = document.getElementById('teamDialog');
  const open = document.getElementById('joinTeam');
  const form = document.getElementById('teamForm');
  const name = document.getElementById('applicantName');
  const phone = document.getElementById('applicantPhone');
  const status = document.getElementById('teamStatus');
  const recipient = 'SharafutdinovAdel';

  open.addEventListener('click', () => {
    status.textContent = '';
    dialog.showModal();
    name.focus();
  });
  document.getElementById('closeTeam').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => open.focus());
  name.addEventListener('input', () => name.setCustomValidity(''));
  phone.addEventListener('input', () => phone.setCustomValidity(''));
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const applicantName = name.value.trim();
    const applicantPhone = phone.value.trim();
    const digits = applicantPhone.replace(/\D/g, '');
    name.setCustomValidity(applicantName ? '' : 'Укажите имя.');
    phone.setCustomValidity(/^\+?[\d\s().-]+$/.test(applicantPhone) && digits.length >= 10 && digits.length <= 15 ? '' : 'Укажите телефон с кодом страны: от 10 до 15 цифр.');
    if (!form.reportValidity()) return;
    const message = `Заявка в команду проекта «Раян»\nИмя: ${applicantName}\nТелефон: ${applicantPhone}`;
    const url = `https://t.me/${recipient}?text=${encodeURIComponent(message)}`;
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Открыть чат повторно';
    status.replaceChildren('Заявка подготовлена. Нажмите «Отправить» в чате Telegram. ', link);
    window.open(url, '_blank', 'noopener,noreferrer');
  });
})();

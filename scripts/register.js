document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('register-form');
    const inviteCodeInput = document.getElementById('invite-code');
    const step2Fields = document.getElementById('step2-fields');
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const telegramCodeInput = document.getElementById('telegram-code');
    const agreeTerms = document.getElementById('agree-terms');
    const agreePrivacy = document.getElementById('agree-privacy');
    const registerBtn = document.getElementById('register-btn');
    const toggleAltBtn = document.getElementById('toggle-alt-btn');
    const errorDiv = document.getElementById('error');
    const successDiv = document.getElementById('success');

    let currentStep = 1;

    function validateForm() {
        const inviteCode = inviteCodeInput ? inviteCodeInput.value.trim() : '';
        const termsChecked = agreeTerms ? agreeTerms.checked : true;
        const privacyChecked = agreePrivacy ? agreePrivacy.checked : true;

        if (currentStep === 1) {
            registerBtn.disabled = !(inviteCode.length >= 4 && termsChecked && privacyChecked);
        } else {
            const username = usernameInput ? usernameInput.value.trim() : '';
            const email = emailInput ? emailInput.value.trim() : '';
            const password = passwordInput ? passwordInput.value : '';
            const telegramCode = telegramCodeInput ? telegramCodeInput.value.trim() : '';

            const allFilled = inviteCode && username && email && password && telegramCode;
            registerBtn.disabled = !(allFilled && termsChecked && privacyChecked);
        }
    }

    if (toggleAltBtn) {
        toggleAltBtn.addEventListener('click', (e) => {
            if (e) e.preventDefault();
            if (currentStep === 1) {
                currentStep = 2;
                if (step2Fields) step2Fields.style.display = 'flex';
                toggleAltBtn.textContent = 'вернуться назад';
            } else {
                currentStep = 1;
                if (step2Fields) step2Fields.style.display = 'none';
                toggleAltBtn.textContent = 'другой способ';
            }
            validateForm();
        });
    }

    [inviteCodeInput, usernameInput, emailInput, passwordInput, telegramCodeInput, agreeTerms, agreePrivacy].forEach(el => {
        if (el) {
            el.addEventListener('input', validateForm);
            el.addEventListener('change', validateForm);
        }
    });

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (errorDiv) errorDiv.textContent = '';
            if (successDiv) successDiv.textContent = '';

            if (currentStep === 1) {
                currentStep = 2;
                if (step2Fields) step2Fields.style.display = 'flex';
                if (toggleAltBtn) toggleAltBtn.textContent = 'вернуться назад';
                validateForm();
                return;
            }

            const inviteCode = inviteCodeInput.value.trim().toUpperCase();
            const username = usernameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const telegramCode = telegramCodeInput ? telegramCodeInput.value.trim() : '';

            if (!inviteCode || !username || !email || !password || !telegramCode) {
                if (errorDiv) errorDiv.textContent = 'Заполните все поля для завершения регистрации';
                return;
            }

            registerBtn.disabled = true;
            registerBtn.textContent = 'Регистрация...';

            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password, inviteCode, telegramCode })
                });

                const data = await response.json();

                if (data.success) {
                    if (successDiv) {
                        successDiv.innerHTML = `🎉 Успешно!<br>Ваш инвайт-код для друга: <b>${data.newInviteCode}</b>`;
                    }
                    setTimeout(() => {
                        window.location.href = '/main';
                    }, 2000);
                } else {
                    if (errorDiv) errorDiv.textContent = data.error || 'Ошибка регистрации';
                    registerBtn.disabled = false;
                    registerBtn.textContent = 'Зарегистрироваться';
                }
            } catch (err) {
                console.error('Registration error:', err);
                if (errorDiv) errorDiv.textContent = 'Ошибка сервера';
                registerBtn.disabled = false;
                registerBtn.textContent = 'Зарегистрироваться';
            }
        });
    }

    validateForm();
});

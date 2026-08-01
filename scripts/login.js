document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault()
    
    const identifier = document.getElementById('login-identifier').value.trim()
    const password = document.getElementById('password').value
    const errorDiv = document.getElementById('error')
    const successDiv = document.getElementById('success')
    
    errorDiv.textContent = ''
    successDiv.textContent = ''
    
    if (!identifier || !password) {
        errorDiv.textContent = 'Заполните все поля'
        return
    }
    
    fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            successDiv.textContent = 'Успешный вход! Перенаправляем...'
            
            // Store user data
            localStorage.setItem('userId', data.user.id)
            localStorage.setItem('username', data.user.username)
            localStorage.setItem('isAdmin', data.user.isAdmin || false)
            localStorage.setItem('userAvatar', data.user.profilePicture || '/default-avatar.jpg')
            
            sessionStorage.setItem('userId', data.user.id)
            sessionStorage.setItem('username', data.user.username)
            sessionStorage.setItem('isAdmin', data.user.isAdmin || false)
            sessionStorage.setItem('userAvatar', data.user.profilePicture || '/default-avatar.jpg')
            
            // Show email prompt if needed
            if (data.needsEmail) {
                showEmailPrompt(data.user.id);
            } else {
                setTimeout(() => { window.location.href = '/' }, 1500);
            }
        } else {
            if (data.requiresVerification) {
                errorDiv.innerHTML = `${data.error}<br><button id="resend-from-login" style="margin-top: 10px; background: #bef1fc; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Отправить письмо снова</button>`
                document.getElementById('resend-from-login')?.addEventListener('click', () => resendVerification(data.userId));
            } else {
                errorDiv.textContent = data.error || 'Ошибка входа';
            }
        }
    })
    .catch(err => {
        console.error('Login error:', err);
        errorDiv.textContent = 'Ошибка сервера';
    });
});

function showEmailPrompt(userId) {
    const container = document.createElement('div');
    container.className = 'email-prompt';
    container.innerHTML = `
        <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border-radius: 12px; box-shadow: 0 0 20px rgba(0,0,0,0.2); z-index: 1000;">
            <h3>Добавьте email</h3>
            <p>Для безопасности, добавьте email к аккаунту</p>
            <input type="email" id="prompt-email" placeholder="Email" style="width: 100%; padding: 8px; margin: 10px 0;">
            <button id="prompt-submit" class="postbutton">Добавить</button>
            <button id="prompt-skip" style="background: none; border: none; cursor: pointer; margin-left: 10px;">Пропустить</button>
        </div>
    `;
    document.body.appendChild(container);
    
    document.getElementById('prompt-submit').onclick = async () => {
        const email = document.getElementById('prompt-email').value.trim();
        if (!email) return;
        
        const res = await fetch('/api/add-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, email })
        });
        const data = await res.json();
        alert(data.message || (data.success ? 'Письмо отправлено! Подтвердите email' : data.error));
        if (data.success) container.remove();
    };
    
    document.getElementById('prompt-skip').onclick = () => {
        container.remove();
        setTimeout(() => { window.location.href = '/' }, 500);
    };
}

async function resendVerification(userId) {
    const email = prompt('Введите email:');
    if (!email) return;
    
    const res = await fetch('/api/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email })
    });
    const data = await res.json();
    alert(data.message || (data.success ? 'Письмо отправлено!' : data.error));
}
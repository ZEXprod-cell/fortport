// cookie-auth.js

let sessionValid = false;

async function verifySession() {
    try {
        const response = await fetch('/api/verify-session', {
            credentials: 'same-origin'
        });
        
        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('sessionValid', 'true');
            localStorage.setItem('userId', data.userId);
            
            // Also fetch user data to get isAdmin and profilePicture
            const userResponse = await fetch(`/api/users/${data.userId}`, {
                credentials: 'same-origin'
            });
            
            if (userResponse.ok) {
                const userData = await userResponse.json();
                localStorage.setItem('username', userData.username);
                localStorage.setItem('userAvatar', userData.profilePicture || '/default-avatar.jpg');
                const response = await fetch('/api/isAdmin', {
                    credentials: 'same-origin'
                });
        
                if (response.ok) {
                    const data = await response.json();
                    localStorage.setItem('isAdmin', data.isAdmin || false);
                }
            }
            
            updateAuthButtons();
            return true;
        }
    } catch (err) {
        console.log('Session verification failed:', err);
    }
    
    // Session invalid - force logout
    clearUserData();
    
    // Pages that REQUIRE authentication
    const protectedPages = [
        '/communities',
        '/friends',
        '/settings',
        '/community/settings',
        '/music',
        '/new_community',
        '/chats'
    ];
    
    const currentPath = window.location.pathname;
    const isProtected = protectedPages.some(page => currentPath === page || currentPath.startsWith(page + '?'));
    
    // Only redirect if:
    // 1. Not already on login/register
    // 2. Not on public pages (/, /about, /support, /privacy, /terms, /post, /photo, /video, /profile, /community)
    // 3. Not during logout
    if (isProtected && 
        currentPath !== '/login' && 
        currentPath !== '/register' &&
        !window._isLoggingOut) {
        window._isLoggingOut = true;
        alert('Your session has expired. Please log in again.');
        window.location.href = '/login';
    }
    return false;
}

async function authenticatedFetch(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        credentials: 'same-origin'
    });
    
    if (response.status === 401) {
        // Session expired
        clearUserData();
        if (!window._isLoggingOut) {
            window._isLoggingOut = true;
            alert('Session expired. Please log in again.');
            window.location.href = '/login';
        }
        throw new Error('Unauthorized');
    }
    
    return response;
}

// Save user display data (from login response)
function setUserData(userData) {
    localStorage.setItem('username', userData.username);
    localStorage.setItem('userAvatar', userData.profilePicture || '/default-avatar.jpg');
    localStorage.setItem('userId', userData.id);
    localStorage.setItem('isAdmin', userData.isAdmin || false);
    localStorage.setItem('sessionValid', 'true');
}

// Clear ALL user data
function clearUserData() {
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('userAvatar');
    localStorage.removeItem('sessionValid');
    localStorage.removeItem('friendNotifications');
    localStorage.removeItem('chatNotifications');
}

// Check if user is logged in via localStorage
function isUserLoggedIn() {
    return localStorage.getItem('sessionValid') === 'true' && localStorage.getItem('userId');
}

function getUserData() {
    return {
        userId: localStorage.getItem('userId'),
        username: localStorage.getItem('username'),
        isAdmin: localStorage.getItem('isAdmin') === 'true',
        userAvatar: localStorage.getItem('userAvatar') || '/default-avatar.jpg'
    };
}

function syncFromLocalStorage() {
    // Just a stub for compatibility
    updateAuthButtons();
}

// ============ NOTIFICATION FUNCTIONS ============
function updateFriendNotifications(count) {
    localStorage.setItem('friendNotifications', count.toString());
    updateNotificationBadges();
}

function updateChatNotifications(count) {
    localStorage.setItem('chatNotifications', count.toString());
    updateNotificationBadges();
}

function getFriendNotifications() {
    return parseInt(localStorage.getItem('friendNotifications') || '0');
}

function getChatNotifications() {
    return parseInt(localStorage.getItem('chatNotifications') || '0');
}

function clearFriendNotifications() {
    localStorage.setItem('friendNotifications', '0');
    updateNotificationBadges();
}

function clearChatNotifications() {
    localStorage.setItem('chatNotifications', '0');
    updateNotificationBadges();
}

function updateNotificationBadges() {
    const friendCount = getFriendNotifications();
    const chatCount = getChatNotifications();
    
    const friendsLink = document.querySelector('a[href="/friends.html"]');
    if (friendsLink) {
        let badge = friendsLink.querySelector('.notification-badge');
        if (friendCount > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.classList.add('notification-badge');
                friendsLink.appendChild(badge);
            }
            badge.textContent = friendCount > 9 ? '9+' : friendCount;
        } else {
            if (badge) badge.remove();
        }
    }
    
    const chatsToggle = document.getElementById('chats-toggle');
    if (chatsToggle) {
        let badge = chatsToggle.querySelector('.notification-badge');
        if (chatCount > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.classList.add('notification-badge');
                chatsToggle.appendChild(badge);
            }
            badge.textContent = chatCount > 9 ? '9+' : chatCount;
        } else {
            if (badge) badge.remove();
        }
    }
}

// Call this on login page after successful login
function onLoginSuccess(userData) {
    setUserData(userData);
    window.location.href = '/';
}

// Call this on page load
document.addEventListener('DOMContentLoaded', () => {
    const protectedPages = [
        '/communities',
        '/friends',
        '/settings',
        '/community/settings',
        '/music',
        '/new_community',
        '/chats',
        '/profile'
    ];
    
    const currentPath = window.location.pathname;
    const isProtected = protectedPages.some(page => currentPath === page || currentPath.startsWith(page + '?'));
    
    // Only verify session on protected pages OR if not on login/register
    if (isProtected || (currentPath !== '/login' && currentPath !== '/register')) {
        verifySession();
    } else {
        updateAuthButtons();
    }
});

// Make functions global
window.setUserData = setUserData;
window.clearUserData = clearUserData;
window.isUserLoggedIn = isUserLoggedIn;
window.getUserData = getUserData;
window.syncFromLocalStorage = syncFromLocalStorage;
window.updateFriendNotifications = updateFriendNotifications;
window.updateChatNotifications = updateChatNotifications;
window.getFriendNotifications = getFriendNotifications;
window.getChatNotifications = getChatNotifications;
window.clearFriendNotifications = clearFriendNotifications;
window.clearChatNotifications = clearChatNotifications;
window.updateNotificationBadges = updateNotificationBadges;
window.verifySession = verifySession;
window.authenticatedFetch = authenticatedFetch;
window.onLoginSuccess = onLoginSuccess;
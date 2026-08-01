let communitiesIsSearchMode = false
let currentCommData = null
let viewingCommUserId = null

// Get DOM elements
const communitiesListContainer = document.getElementById('communities-list-container')
const communitySearchContainer = document.getElementById('community-search-container')
const communitySearchInput = document.getElementById('community-search-input')

function loadCommData(userId) {
    if (!userId) {
        const currentUserId = localStorage.getItem('userId')
        if (!currentUserId) {
            window.location.href = '/login'
            return
        }
        userId = parseInt(currentUserId)
    }
    
    viewingCommUserId = userId
    const currentUserId = parseInt(localStorage.getItem('userId'))
    const isOwnProfile = (userId === currentUserId)

const createButton = document.getElementById('create-community-button');
if (createButton) {
    createButton.style.display = isOwnProfile ? 'inline-block' : 'none';
}
    
    // Update header label
    const myPortsLabel = document.getElementById('myPorts')
    if (myPortsLabel) {
        if (isOwnProfile) {
            myPortsLabel.textContent = 'Мои порты'
        } else {
            fetch(`/api/users/${userId}`)
                .then(r => r.json())
                .then(user => {
                    myPortsLabel.textContent = `Порты ${user.username}`
                })
                .catch(() => {
                    myPortsLabel.textContent = 'Порты пользователя'
                })
        }
    }
    
    // Hide search bar if not own profile
    if (communitySearchInput) {
        communitySearchInput.style.display = isOwnProfile ? 'block' : 'none'
    }
    
    // Choose correct endpoint
    const apiUrl = isOwnProfile 
        ? `/api/user/communities/${userId}` 
        : `/api/users/${userId}/communities`
    
    fetch(apiUrl)
        .then(r => {
            if (!r.ok) throw new Error('Network error')
            return r.json()
        })
        .then(data => {
            let communities = []
            if (isOwnProfile) {
                // Own profile: { communities: [...] }
                communities = data.communities || []
            } else {
                // Other profile: direct array
                communities = Array.isArray(data) ? data : []
            }
            // Store for search results (to know which ones are subscribed)
            currentCommData = { communities: communities }
            
            if (myPortsLabel && isOwnProfile) {
                myPortsLabel.textContent = `Мои порты (${communities.length})`
            }
            displayComms(communities, isOwnProfile)
        })
        .catch(err => {
            console.error('Error loading communities:', err)
            displayComms([], isOwnProfile)
        })
}

// Setup search
function setupSearch() {
    if (!communitySearchInput) return
    
    const currentUserId = parseInt(localStorage.getItem('userId'))
    if (viewingCommUserId && viewingCommUserId !== currentUserId) {
        communitySearchInput.style.display = 'none'
        return
    }
    
    communitySearchInput.addEventListener('input', function(e) {
        const query = e.target.value.trim()
        if (query.length >= 1) {
            performCommunitySearch(query)
        } else if (query.length === 0) {
            exitCommunitySearchMode()
        }
    })
    
    communitySearchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const query = e.target.value.trim()
            if (query.length >= 1) {
                performCommunitySearch(query)
            }
        }
        if (e.key === 'Escape') {
            exitCommunitySearchMode()
            communitySearchInput.value = ''
        }
    })
}

function performCommunitySearch(query) {
    if (!query || query.length < 2) return
    
    fetch(`/api/communities/search?q=${encodeURIComponent(query)}`)
        .then(r => r.json())
        .then(communities => {
            displayCommunitySearchResults(communities)
            communitiesIsSearchMode = true
            
            if (communitiesListContainer) communitiesListContainer.style.display = 'none'
            if (communitySearchContainer) communitySearchContainer.style.display = 'block'
        })
        .catch(err => console.error('Search error:', err))
}

function exitCommunitySearchMode() {
    communitiesIsSearchMode = false
    if (communitiesListContainer) communitiesListContainer.style.display = 'block'
    if (communitySearchContainer) communitySearchContainer.style.display = 'none'
    if (communitySearchInput) communitySearchInput.value = ''
}

function displayCommunitySearchResults(communities) {
    const container = document.getElementById('community-search-list')
    if (!container) return
    
    container.innerHTML = ''
    
    if (!communities || communities.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 30px; color: #666;">Порты не найдены</div>'
        return
    }
    
    const currentUserId = parseInt(localStorage.getItem('userId'))
    const subscribedCommunityIds = currentCommData?.communities?.map(c => c.id) || []
    
    communities.forEach(comm => {
        const isSubscribed = subscribedCommunityIds.includes(comm.id)
        const commCard = document.createElement('div')
        commCard.classList.add('friend-card')
        commCard.innerHTML = `
            <img src="${comm.profilePicture || '/default-avatar.jpg'}" class="friend-card-avatar frutiger-aero-border">
            <div class="friend-card-info" style="display: flex; flex-direction: column; gap: 4px;">
                <a href="/community?id=${comm.id}" class="friend-card-name">${escapeHtml(comm.username)}</a>
                <span class="friend-card-type">${comm.type === 'community' ? 'сообщество' : 'страница'}</span>
                <span class="friend-card-subcount">${comm.subCount || 0} ${comm.type === 'community' ? 'Участников' : 'Подписчиков'}</span>
            </div>
            ${isSubscribed 
                ? `<button class="friend-card-btn" onclick="leaveCommunity(${comm.id})">Отключить</button>`
                : `<button class="friend-card-btn" onclick="joinCommunity(${comm.id})">Подключиться</button>`
            }
        `
        container.appendChild(commCard)
    })
}

function displayComms(communities, showButtons = true) {
    const container = document.getElementById('communities-list')
    if (!container) return
    
    container.innerHTML = ''
    
    if (!communities || communities.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 30px; color: #666;">' 
            + (showButtons ? 'Нет подключённых портов!' : 'У пользователя нет портов') 
            + '</div>'
        return
    }
    
    communities.forEach(comm => {
        const commCard = document.createElement('div')
        commCard.classList.add('friend-card')
        
        let buttonsHtml = ''
        if (showButtons) {
            buttonsHtml = `<button class="friend-card-btn" onclick="leaveCommunity(${comm.id})">Отключить</button>`
        }
        
        const subCount = comm.subCount !== undefined ? comm.subCount : 0
        const subText = comm.subCount !== undefined 
            ? `${subCount} ${comm.type === 'community' ? 'Участников' : 'Подписчиков'}`
            : ''
        
        commCard.innerHTML = `
            <img src="${comm.profilePicture || '/default-avatar.jpg'}" class="friend-card-avatar frutiger-aero-border">
            <div class="friend-card-info" style="display: flex; flex-direction: column; gap: 4px;">
                <a href="/community?id=${comm.id}" class="friend-card-name">${escapeHtml(comm.username)}</a>
                <span class="friend-card-type">${comm.type === 'community' ? 'сообщество' : 'страница'}</span>
                ${subText ? `<span class="friend-card-subcount">${subText}</span>` : ''}
            </div>
            ${buttonsHtml}
        `
        
        container.appendChild(commCard)
    })
}

function joinCommunity(communityId) {
    const userId = localStorage.getItem('userId')
    if (!userId) {
        window.location.href = '/login'
        return
    }
    
    fetch(`/api/communities/${communityId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
        // No body needed; authenticate middleware gets userId from session
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            loadCommData(parseInt(userId))
            exitCommunitySearchMode()
        } else {
            alert('Ошибка: ' + (data.error || 'Не удалось подключиться'))
        }
    })
    .catch(err => console.error('Error joining community:', err))
}

function leaveCommunity(communityId) {
    const userId = localStorage.getItem('userId')
    if (!userId) return
    
    if (!confirm('Отключиться от этого порта?')) return
    
    fetch(`/api/communities/${communityId}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            loadCommData(parseInt(userId))
            if (communitiesIsSearchMode) exitCommunitySearchMode()
        } else {
            alert('Ошибка: ' + (data.error || 'Не удалось отключиться'))
        }
    })
    .catch(err => console.error('Error leaving community:', err))
}

function escapeHtml(str) {
    if (!str) return ''
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search)
    const userIdParam = urlParams.get('id')
    const currentUserId = localStorage.getItem('userId')
    
    let targetUserId
    if (userIdParam) {
        targetUserId = parseInt(userIdParam)
    } else {
        targetUserId = currentUserId ? parseInt(currentUserId) : null
    }
    
    if (!targetUserId) {
        window.location.href = '/login'
        return
    }
    
    setupSearch()
    loadCommData(targetUserId)
    if (window.location.pathname.includes('/communities')) {
    fetch(`/api/users/bio/${viewingUserId}`)
        .then(r => r.json())
        .then(userBio => {
            if (userBio.profileBackground) {
                document.body.style.backgroundImage = `url(${userBio.profileBackground})`;
            }
        })
        .catch(() => {});
}
})

// Make functions global
window.leaveCommunity = leaveCommunity
window.joinCommunity = joinCommunity
window.exitCommunitySearchMode = exitCommunitySearchMode
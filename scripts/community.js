// community.js
import * as PostDisplay from './display-post.js'

// DEBUG FUNCTION
function debug(msg) {
    const debugDiv = document.getElementById('debug-messages');
    if (debugDiv) {
        const timestamp = new Date().toLocaleTimeString();
        debugDiv.innerHTML += `<div>${timestamp}: ${msg}</div>`;
        debugDiv.scrollTop = debugDiv.scrollHeight;
        while (debugDiv.children.length > 20) {
            debugDiv.removeChild(debugDiv.firstChild);
        }
    }
    console.log(msg);
}

let currentCommunity = null
let isEditing = false
let currentLastPostId = null;
let isLoading = false;
let hasMorePosts = true;
let allPosts = [];

// PAGE-WIDE PARAMS FOR POST CREATOR
window.communityPageData = {
    isCommunityPage: false,
    communityId: null,
    communityType: null,
    canPost: false,
    isOwner: false,
    isModerator: false,
    communityName: null,
    communityAvatar: '/default-avatar.jpg'
}

if (!sessionStorage.getItem('userId')) {
    syncFromLocalStorage()
}

const urlParams = new URLSearchParams(window.location.search)
const communityId = urlParams.get('id')

if (!communityId) {
  debug('No community ID provided')
  window.location.href = '/'
}

function escapeHtml(str) {
  if (!str) return ''
  const string = String(str)
  return string
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function loadCommunity() {
  // Reset pagination
  currentLastPostId = null;
  hasMorePosts = true;
  isLoading = false;
  allPosts = [];
  
  // Load community info and first batch of posts
  Promise.all([
    fetch(`/api/communities/${communityId}`).then(r => r.json()),
    fetch(`/api/communities/${communityId}/posts`).then(r => r.json())
  ])
  .then(([community, posts]) => {
    debug(`Community loaded: ${community ? community.username : 'null'}`);
    debug(`Posts loaded: ${posts ? posts.length : 'null'}`);
    
    if (community.error) throw new Error(community.error);
    
    if (community.profileBackground) {
      const body = document.body
      body.style.backgroundImage = `url(${community.profileBackground})`
    }
    
    currentCommunity = community;
    document.title = currentCommunity.username
    
    // SET PAGE-WIDE PARAMS
    const currentUserId = parseInt(localStorage.getItem('userId'))
    const isOwner = community.owner === currentUserId
    const isModerator = community.moderators?.includes(currentUserId)
    const canPost = isOwner || isModerator || community.type === 'community'
    
    window.communityPageData = {
        isCommunityPage: true,
        communityId: parseInt(communityId),
        communityType: community.type,
        canPost: canPost,
        isOwner: isOwner,
        isModerator: isModerator,
        communityName: community.username,
        communityAvatar: community.profilePicture || '/default-avatar.jpg'
    }

    if (currentUserId && canPost) {
        makePostCreator();
    }
    
    displayCommunity(community);
    
    // Store posts and display
    allPosts = posts;
    if (posts.length > 0) {
        currentLastPostId = posts[posts.length - 1].id;
    }
    if (posts.length < 50) {
        hasMorePosts = false;
    }
    displayCommunityPosts(allPosts);
  })
  .catch(err => {
    debug(`ERROR: ${err.message}`);
    const contentDiv = document.getElementById('community-content');
    if (contentDiv) {
      contentDiv.innerHTML = `<div style="text-align: center; padding: 40px; color: #ff4444;">Порт не найден<br><small>${err.message}</small></div>`;
    }
  })
}

function displayCommunityPosts(posts, append = false) {
  debug(`displayCommunityPosts called with ${posts.length} posts, append: ${append}`);
  
  const feedContainer = document.getElementById('community-feed');
  if (!feedContainer) {
    debug('ERROR: community-feed element not found!');
    return;
  }
  
  const postCountElement = document.getElementById('post-count');
  if (postCountElement) {
    postCountElement.textContent = allPosts.length;
  }
  
  PostDisplay.loadUserMap().then(() => {
    if (append) {
      // Append new posts to existing feed
      PostDisplay.appendPosts('community-feed', posts, loadCommunity);
    } else {
      // Replace entire feed (initial load)
      PostDisplay.displayPosts('community-feed', posts, loadCommunity);
    }
  }).catch(err => {
    debug(`Error loading user map: ${err.message}`);
  });
}

// Load more community posts
async function loadMoreCommunityPosts() {
    if (isLoading || !hasMorePosts) return;
    
    isLoading = true;
    
    try {
        const url = `/api/communities/${communityId}/posts?before=${currentLastPostId}&limit=50`;
        const response = await fetch(url);
        const newPosts = await response.json();
        
        if (!newPosts || newPosts.length === 0) {
            hasMorePosts = false;
            isLoading = false;
            return;
        }
        
        // Store the new posts
        const startIndex = allPosts.length;
        allPosts = [...allPosts, ...newPosts];
        currentLastPostId = newPosts[newPosts.length - 1].id;
        
        if (newPosts.length < 50) {
            hasMorePosts = false;
        }
        
        // APPEND the new posts (not replace)
        displayCommunityPosts(newPosts, true);
        
    } catch (err) {
        console.error('Error loading more community posts:', err);
    } finally {
        isLoading = false;
    }
}

function displayCommunity(community) {
  let canEdit = false
  const currentUserId = parseInt(localStorage.getItem('userId'))
  const isSubscribed = community.subscribers?.includes(currentUserId)
  const isOwner = community.owner === currentUserId
  const isModerator = community.moderators?.includes(currentUserId)
  canEdit = isOwner || isModerator

  document.getElementById('community-content').innerHTML = `
    <div class="profile-header">
	<div class="profile-header-contents">
		<div class="profile-header-left">
			<div class="profile-pfp">
				<img src="${community.profilePicture || '/default-avatar.jpg'}" class="profile-picture frutiger-aero-border" style="border-radius:0; border: 6px solid rgb(255 255 255); box-shadow: 4px 4px 18px #0000008f; background:white; cursor:pointer;" onclick="openProfilePicture('${community.profilePicture || ''}')">
			</div>
			<div class="profile-left-buttons" id="profile-buttons">
            			
				${canEdit ? `<button class="profile-btn-btn" style="margin-bottom: 55px;" onclick="window.location.href='/community/settings?id=${community.id}';">Редактировать</button>` : `
${isSubscribed ? `<button class="profile-btn-btn" onclick="unsubscribeFromCommunity(${community.id})" style="margin-bottom: 55px;">Отключиться</button>` : `<button class="profile-btn-btn" onclick="subscribeToCommunity(${community.id})" style="margin-bottom: 55px;">Присоединиться</button>` }
			`}
			</div>
		</div>
		<div class="profile-header-right">
			<div class="profile-right-name"><p>${community.username}</p></div>
			${community.status ? `<div class="profile-right-status">${community.status}</div>` : ``}
			${community.description ? `<div class="profile-right-description">${community.description}</div>` : ``}
			<div class="community-header-right-type">${community.type == 'page' ? `Страница` : `Сообщество`}</div>
			<div class="community-header-right-bday">Порт создан: ${new Date(community.createdAt).toLocaleDateString('en-GB').replace(/\//g, '-')}</div>
			<div class="community-header-subs"><label>Подписчиков:</label><p>${community.subscriberCount}</p></div>
		</div>
		<div class="profile-header-morethings" onclick="openMore()">Правила</div>
	</div>
    </div>
    <div class="profile-neck">
	<div class="profile-neck-left"><ul class="rules-list" id="rules-list">
  ${community.rules 
    ? community.rules.split('\n').filter(rule => rule.trim() !== '').map(rule => `<li>${escapeHtml(rule)}</li>`).join('')
    : '<li>Правила не установлены</li>'
  }
</ul>
	</div>
	<div class="profile-neck-right">
    	</div>
    </div>
    <div class="profile-header-lessthings" onclick="closeMore()">Скрыть</div>
  `
}

function openMore() {
	const neck = document.querySelector('.profile-neck')
	neck.classList.add('open')
	const open = document.querySelector('.profile-header-morethings')
	open.style.transform = "scaleY(0)"
	const close = document.querySelector('.profile-header-lessthings')
	close.style.transform = "scaleY(1)"
	const somethings = document.querySelectorAll('.profile-header-somethings-thing');
	somethings.forEach(el => el.style.transform = "scaleY(0)");
}

function closeMore() {
	const neck = document.querySelector('.profile-neck')
	neck.classList.remove('open')
	const open = document.querySelector('.profile-header-morethings')
	open.style.transform = ''
	const close = document.querySelector('.profile-header-lessthings')
	close.style.transform = ''
	const somethings = document.querySelectorAll('.profile-header-somethings-thing');
	somethings.forEach(el => el.style.transform = '');
}

function displayRules(rulesText, canEdit) {
  const rulesList = document.getElementById('rules-list')
  
  if (!rulesText) {
    rulesList.innerHTML = '<li>Правила не установлены</li>'
    return
  }
  
  const rules = rulesText.split('\n').filter(rule => rule.trim() !== '')
  
  if (rules.length === 0) {
    rulesList.innerHTML = '<li>Правила не установлены</li>'
    return
  }
  
  rulesList.innerHTML = rules.map(rule => `<li>${escapeHtml(rule)}</li>`).join('')
}

async function subscribeToCommunity(communityId) {
  const userId = localStorage.getItem('userId')
  if (!userId) {
    window.location.href = '/login.html'
    return
  }
  try {
    const response = await fetch(`/api/communities/${communityId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    })
    const data = await response.json()
    if (data.success) {
      loadCommunity()
    } else {
      alert('Ошибка: ' + (data.error || 'Не удалось подписаться'))
    }
  } catch (err) {
    console.error('Error subscribing:', err)
    alert('Ошибка сервера')
  }
}

async function unsubscribeFromCommunity(communityId) {
  const userId = localStorage.getItem('userId')
  if (!userId) return
  try {
    const response = await fetch(`/api/communities/${communityId}/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    })
    const data = await response.json()
    if (data.success) {
      loadCommunity()
    } else {
      alert('Ошибка: ' + (data.error || 'Не удалось отписаться'))
    }
  } catch (err) {
    console.error('Error unsubscribing:', err)
    alert('Ошибка сервера')
  }
}

// Scroll listener
function setupCommunityScrollListener() {
    window.addEventListener('scroll', () => {
        const scrollHeight = document.documentElement.scrollHeight;
        const scrollTop = window.scrollY;
        const clientHeight = window.innerHeight;
        
        if (scrollHeight - (scrollTop + clientHeight) < 300) {
            loadMoreCommunityPosts();
        }
    });
}

window.openMore = openMore
window.closeMore = closeMore
window.subscribeToCommunity = subscribeToCommunity
window.unsubscribeFromCommunity = unsubscribeFromCommunity
window.loadCommunity = loadCommunity

loadCommunity();
setupCommunityScrollListener();
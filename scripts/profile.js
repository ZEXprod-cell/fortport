// profile.js
import * as PostDisplay from './display-post.js';

let currentProfileUser = null
let isEditing = false
let newProfilePicture = null
let currentLastPostId = null;
let isLoading = false;
let hasMorePosts = true;
let allPosts = [];

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

// Get user ID from URL
const urlParams = new URLSearchParams(window.location.search)
const userId = urlParams.get('id')

if (!userId) {
  if (currentUserId) {
    //window.location.href = `/profile.html?id=${currentUserId}`
  } else {
    //window.location.href = '/login.html'
  }
}

async function loadFriendsList() {
    const container = document.getElementById('friends-sub-container');
    const label = document.getElementById('friends-label');
    if (!container) return;
    
        const response = await fetch(`/api/users/${userId}/friends`);
        const friends = await response.json();
	if (label) {
            label.textContent = `Друзья (${friends.length})`;
        }
        
        if (!friends || friends.length === 0) {
            const parentLabel = container.parentElement.parentElement;
            if (parentLabel) parentLabel.style.display = 'none';
            checkSubscriptionsVisibility();
            return;
        }
        
        const shuffled = [...friends].sort(() => Math.random() - 0.5);
        const displayFriends = shuffled.slice(0, 6);
        let html = '';
        
        displayFriends.forEach(friend => {
            html += `
                <a href="/profile?id=${friend.id}" class="sub-sub-item">
                    <img src="${friend.profilePicture || '/default-avatar.jpg'}" class="sub-sub-avatar">
                    <span class="sub-sub-name">${escapeHtml(friend.username)}</span>
                </a>
            `;
        });
        
        const emptySlots = 6 - displayFriends.length;
        for (let i = 0; i < emptySlots; i++) {
            html += '<div class="sub-sub-item sub-sub-empty-slot"></div>';
        }
        
        container.innerHTML = html;
        checkSubscriptionsVisibility();
}

async function loadCommunitiesList() {
    const container = document.getElementById('communities-sub-container');
    const label = document.getElementById('communities-label');

        const response = await fetch(`/api/users/${userId}/communities`);
        const communities = await response.json();

	if (label) {
            label.textContent = `Порты (${communities.length})`;
        }
        
        if (!communities || communities.length === 0) {
            const parentLabel = container.parentElement.parentElement;
            if (parentLabel) parentLabel.style.display = 'none';
            checkSubscriptionsVisibility();
            return;
        }
        
        const shuffled = [...communities].sort(() => Math.random() - 0.5);
	const displayCommunities = shuffled.slice(0, 6);
        let html = '';
        
        displayCommunities.forEach(community => {
            html += `
                <a href="/community?id=${community.id}" class="sub-sub-item">
                    <img src="${community.profilePicture || '/default-avatar.jpg'}" class="sub-sub-avatar">
                    <span class="sub-sub-name">${escapeHtml(community.username)}</span>
                </a>
            `;
        });
        
        const emptySlots = 6 - displayCommunities.length;
        for (let i = 0; i < emptySlots; i++) {
            html += '<div class="sub-sub-item sub-sub-empty-slot"></div>';
        }
        
        container.innerHTML = html;
        checkSubscriptionsVisibility();
}

async function loadAudiosList() {
    const container = document.getElementById('audios-sub-container');
    const label = document.getElementById('audios-label');

        const response = await fetch(`/api/users/audios?userId=${userId}`);
        const resJson = await response.json();
        const audios = resJson.audios;

	if (label) {
            label.textContent = `Аудио (${audios.length})`;
        }

    if (!container) return;
        
        if (!audios || audios.length === 0) {
            container.parentElement.style.display = 'none';
            container.parentElement.parentElement.style.paddingBottom = '20px';
            checkSubscriptionsVisibility();
            return;
        }
        
        const shuffled = [...audios].sort(() => Math.random() - 0.5);
	const displayAudios = shuffled.slice(0, 2);
        let html = '';
        
        displayAudios.forEach(audio => {
            html += `
		<div style="display:flex;flex-direction:row; gap:10px; width:50%;">
                    <img src="/ui/icons/audios_aero.webp" style="width:48px; height:48px; background:white; border-radius:4px; border: 2px solid #cccfe0;">
		<div style="display:flex;flex-direction:column;">
                    <span class="profile-audio-name">${escapeHtml(audio.name)}</span>
                    <span class="profile-audio-subname">${escapeHtml(audio.artist_name)}</span>
            	</div>
            	</div>
		`;
        });
        
        container.innerHTML = html;
        checkSubscriptionsVisibility(); 
}

function checkSubscriptionsVisibility() {
    const container = document.querySelector('.profile-box-container');
    if (!container) return;
    
    const friendsVisible = document.getElementById('friends-sub-container')?.parentElement?.style.display !== 'none';
    const communitiesVisible = document.getElementById('communities-sub-container')?.parentElement?.style.display !== 'none';
    
    if (!friendsVisible && !communitiesVisible) {
        container.style.display = 'none';
    } else {
        container.style.display = 'flex';
    }
}

function loadProfile() {
  // Reset pagination
  currentLastPostId = null;
  hasMorePosts = true;
  isLoading = false;
  allPosts = [];
  
  Promise.all([
    fetch(`/api/users/${userId}`).then(r => r.json()),
    fetch(`/api/users/${userId}/posts`).then(r => r.json())
  ])
  .then(([user, posts]) => {
    if (user.error) throw new Error(user.error)
    currentProfileUser = user
    document.title = user.username
    displayProfile(user)
    
    // Store posts and display
    allPosts = posts;
    if (posts.length > 0) {
        currentLastPostId = posts[posts.length - 1].id;
    }
    if (posts.length < 50) {
        hasMorePosts = false;
    }
    displayUserPosts(allPosts);
  })
  .catch(err => {
    document.getElementById('profile-content').innerHTML = `
      <div style="text-align: center; padding: 40px; color: #ff4444;">
        Пользователь не найден
      </div>
    `
  })
}

function displayProfile(user) {
  const currentUserId = localStorage.getItem('userId')
  const isOwnProfile = (currentUserId == user.id)
  renderProfile(user, isOwnProfile)
}

async function renderProfile(user, isOwnProfile) {
  const currentUserId = await localStorage.getItem('userId')
  	const userBioResponse = await fetch(`/api/users/bio/${userId}`);
	const userBio = await userBioResponse.json();

  if (userBio.profileBackground) {
    const body = document.body
    body.style.backgroundImage = `url(${userBio.profileBackground})`
  }
  
  const postBox = document.getElementById('own-profile-post-box')
  if (postBox) {
    postBox.style.display = isOwnProfile ? 'block' : 'none'
  }

  document.getElementById('profile-content').innerHTML = `
    <div class="profile-header">
	<div class="profile-header-contents">
		<div class="profile-header-left">
			<div class="profile-pfp">
				<img src="${user.profilePicture || '/default-avatar.jpg'}" class="profile-picture frutiger-aero-border" style="border-radius:0; border: 6px solid rgb(255 255 255); box-shadow: 4px 4px 18px #0000008f; cursor:pointer;" onclick="openProfilePicture('${user.profilePicture || ''}')">
			</div>
			<div class="profile-left-buttons" id="profile-buttons"></div>
		</div>
		<div class="profile-header-right">
			<div class="profile-right-name"><p>${user.username}</p></div>
			${user.status ? `<div class="profile-right-status">${user.status}</div>` : ``}
			${userBio.description ? `<div class="profile-right-description">${userBio.description}</div>` : ``}
			${userBio.homeCountry ? `<div class="profile-right-homecountry"><img src="/ui/icons/mini_map.webp" style="height:30px; position:absolute; left:10px; bottom:5px;">${userBio.homeCountry}</div>` : ``}
			${userBio.dateOfBirth ? `<div class="profile-right-birthday"><img src="/ui/icons/mini_cake.webp" style="height:30px; position:absolute; right:10px; bottom:5px;">${userBio.dateOfBirth}</div>` : ``}
		</div>
		<div class="profile-header-morethings" onclick="openMore()">Ещё</div>
		<div class="profile-header-somethings">
			<div class="profile-header-somethings-thing"><a href="/friends/?id=${user.id}" style="display: flex; justify-content: center; align-items: center; gap:5px;"><img src="/ui/icons/friends_aero.webp" style="height:32px; width:auto;"><span id="friends-label">Друзья</span></a></div>
			<div class="profile-header-somethings-thing"><a href="/communities/?id=${user.id}" style="display: flex; justify-content: center; align-items: center; gap:5px;"><img src="/ui/icons/communities_aero.webp" style="height:32px; width:auto;"><span id="communities-label">Порты</span></a></div>
			<div class="profile-header-somethings-thing"><a href="/audios?id=${user.id}" style="display: flex; justify-content: center; align-items: center; gap:5px;"><img src="/ui/icons/audios_aero.webp" style="height:32px; width:auto;"><span id="audios-label">Аудиозаписи</span></a></div>
		</div>
	</div>
    </div>
    <div class="profile-neck">
	<div class="profile-neck-left">
		${userBio.education ? `<p><span style="color: #575757;">Образование:</span> ${userBio.education}</p>` : ``}
		${userBio.workplace ? `<p><span style="color: #575757;">Работа:</span> ${userBio.workplace}</p>` : ``}
		${userBio.religion ? `<p><span style="color: #575757;">Религия:</span> ${userBio.religion}</p>` : ``}
                ${((userBio.education || userBio.workplace || userBio.religion) && (userBio.hobbies || userBio.fandoms)) ? `<div class="profile-neck-separator"></div>` : ``}
		${userBio.hobbies ? `<p><span style="color: #575757;">Хобби:</span> ${userBio.hobbies}</p>` : ``}
                ${userBio.hobbies ? `<div class="profile-neck-separator"></div>` : ``}
		${userBio.fandoms ? `<p><span style="color: #575757;">Фандомы:</span> ${userBio.fandoms}</p>` : ``}
	</div>
	<div class="profile-neck-right">
		<div class="profile-neck-right-top">
			<div class="profile-things-container">
				<label>Порты:</label>
				<div id="communities-sub-container">
				</div>
			</div>
			<div class="profile-things-container">
				<label>Друзья:</label>
				<div id="friends-sub-container">
				</div>
			</div>
		</div>
		<div class="profile-audios-container">
			<label>Музыка:</label>
			<div id="audios-sub-container" style="display:flex;flex-direction:row;">
			</div>
		</div>
    	</div>
    </div>
    <div class="profile-header-lessthings" onclick="closeMore()">Скрыть</div>
  `
  
  loadFriendsList();
  loadCommunitiesList();
  loadAudiosList();

  if (isOwnProfile) {
    setTimeout(() => {
      setupPostButton()
      setupEnterKey()
      setupPasteSupport()
    }, 100)
	document.getElementById('profile-buttons').innerHTML = `
      <button class="profile-btn-btn" onclick="window.location.href='/settings'" style="margin-bottom: 55px;">Редактировать</button>
    `
    return
  }

  if (!isOwnProfile && currentUserId) {
    fetch(`/api/users/${currentUserId}`)
      .then(r => r.json())
      .then(currentUserData => {
        return fetch(`/api/users/${user.id}`)
          .then(r => r.json())
          .then(profileUserData => {
            return { currentUserData, profileUserData }
          })
      })
      .then(({ currentUserData, profileUserData }) => {
        const profileUserId = profileUserData.id
        const currentUserIdNum = currentUserId

        const isFriend = currentUserData.friends?.includes(profileUserId)
        const hasPendingToMe = currentUserData.pending?.includes(profileUserId)
        const hasPendingFromMe = profileUserData.pending?.includes(currentUserIdNum)
        
        let buttons = ''
        
        if (isFriend) {
          buttons = `
            <button class="profile-btn-btn" onclick="openChatWithUser(${user.id})">Написать</button>
            <button class="profile-btn-btn" onclick="removeFriend(${user.id})">Отключить Друга</button>
          `
        } else if (hasPendingToMe) {
          buttons = `
            <button class="profile-btn accept-btn" onclick="acceptFriendRequest(${user.id})">Принять подключение</button>
            <button class="profile-btn reject-btn" onclick="rejectFriendRequest(${user.id})">Отклонить</button>
          `
        } else if (hasPendingFromMe) {
          buttons = `
            <button class="profile-btn-btn" onclick="cancelFriendRequest(${user.id})">Отменить заявку</button>
            <button class="profile-btn-btn" onclick="openChatWithUser(${user.id})">Написать</button>
          `
        } else {
          buttons = `
            <button class="profile-btn-btn add-friend" onclick="sendFriendRequest(${user.id})">Добавить в Друзья</button>
            <button class="profile-btn-btn send-message" onclick="openChatWithUser(${user.id})">Написать</button>
          `
        }
        
        document.getElementById('profile-buttons').innerHTML += buttons
      })
      .catch(err => {
        console.error('Error:', err)
        document.getElementById('profile-buttons').innerHTML += `
            <button class="profile-btn-btn add-friend" onclick="sendFriendRequest(${user.id})">Добавить в Друзья</button>
            <button class="profile-btn-btn send-message" onclick="openChatWithUser(${user.id})">Написать</button>
        `
      })
  } else if (!isOwnProfile && !currentUserId) {
    document.getElementById('profile-buttons').innerHTML += `
      <button class="profile-btn-btn" onclick="window.location.href='/login'">Добавить в Друзья</button>
      <button class="profile-btn-btn" onclick="window.location.href='/login'">Написать</button>
    `
  }
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

function displayUserPosts(posts, append = false) {
  PostDisplay.loadUserMap().then(() => {
    if (append) {
      PostDisplay.appendPosts('profile-feed', posts, loadProfile);
    } else {
      PostDisplay.displayPosts('profile-feed', posts, loadProfile);
    }
  })
}

// Load more profile posts
async function loadMoreProfilePosts() {
    if (isLoading || !hasMorePosts) return;
    
    isLoading = true;
    
    try {
        const url = `/api/users/${userId}/posts?before=${currentLastPostId}&limit=50`;
        const response = await fetch(url);
        const newPosts = await response.json();
        
        if (!newPosts || newPosts.length === 0) {
            hasMorePosts = false;
            isLoading = false;
            return;
        }
        
        allPosts = [...allPosts, ...newPosts];
        currentLastPostId = newPosts[newPosts.length - 1].id;
        
        if (newPosts.length < 50) {
            hasMorePosts = false;
        }
        
        // APPEND the new posts (not replace)
        displayUserPosts(newPosts, true);
        
    } catch (err) {
        console.error('Error loading more profile posts:', err);
    } finally {
        isLoading = false;
    }
}

function sendFriendRequest(toUserId) {
  const fromUserId = localStorage.getItem('userId')
  if (!fromUserId) {
    window.location.href = '/login.html'
    return
  }

  fetch('/api/friends/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fromUserId, toUserId })
  })
  .then(r => r.json())
  .then(data => {
    if (data.success) {
      alert('Заявка в друзья отправлена!')
      loadProfile()
    } else {
      alert('Ошибка: ' + (data.error || 'Не удалось отправить заявку'))
    }
  })
}

function acceptFriendRequest(requesterUserId) {
  const currentUserId = localStorage.getItem('userId')
  
  fetch('/api/friends/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      currentUserId,
      requesterUserId
    })
  })
  .then(r => r.json())
  .then(data => {
    if (data.success) {
      alert('Заявка принята!')
      loadProfile()
    }
  })
}

function rejectFriendRequest(requesterUserId) {
  const currentUserId = localStorage.getItem('userId')
  
  fetch('/api/friends/reject', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      currentUserId,
      requesterUserId
    })
  })
  .then(r => r.json())
  .then(data => {
    if (data.success) {
      alert('Заявка отклонена')
      loadProfile()
    }
  })
}

function removeFriend(friendUserId) {
  const currentUserId = localStorage.getItem('userId')
  
  if (!confirm(`Удалить друга?`)) return
  
  fetch('/api/friends/remove', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      currentUserId,
      friendId: friendUserId
    })
  })
  .then(r => r.json())
  .then(data => {
    if (data.success) {
      alert('Пользователь удалён из друзей')
      loadProfile()
    }
  })
}

function cancelFriendRequest(toUserId) {
  const fromUserId = localStorage.getItem('userId')
  
  fetch('/api/friends/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fromUserId,
      toUserId
    })
  })
  .then(r => r.json())
  .then(data => {
    if (data.success) {
      alert('Заявка отменена')
      loadProfile()
    }
  })
}

function openChatWithUser(userId) {
    window.location.href = `/chats?id=${userId}`;
}

function setupPostButton() {
  const postButton = document.getElementById('post-button')
  if (!postButton) return
  
  const newPostButton = postButton.cloneNode(true)
  postButton.parentNode.replaceChild(newPostButton, postButton)
  
  newPostButton.addEventListener('click', async function() {
    const content = document.getElementById('post-input').value.trim()
    const community = ''
    const isAnonymous = false
    const userId = localStorage.getItem('userId')
    
    if (!content && selectedFiles.length === 0) {
      return
    }
    
    const formData = new FormData()
    formData.append('content', content)
    formData.append('userId', userId)
    formData.append('community', community)
    formData.append('isAnonymous', isAnonymous)
    
    selectedFiles.forEach(file => {
      formData.append('files', file)
    })
    
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        body: formData
      })
      
      const data = await response.json()
      
      if (data.success) {
        document.getElementById('post-input').value = ''
        selectedFiles = []
        fileTypes = []
        document.getElementById('files-preview-area').innerHTML = ''
        togglePreviewVisibility()
        loadProfile()
      }
    } catch (err) {
      console.error('Error creating post:', err)
    }
  })
}

function setupEnterKey() {
  const postInput = document.getElementById('post-input')
  if (!postInput) return
  
  postInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const postButton = document.getElementById('post-button')
      if (postButton) postButton.click()
    }
  })
}

function setupPasteSupport() {
  const postInput = document.getElementById('post-input')
  if (!postInput) return
  
  postInput.addEventListener('paste', function(e) {
    const items = e.clipboardData.items
    for (let item of items) {
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault()
        const file = item.getAsFile()
        const fileName = `pasted-image-${Date.now()}.png`
        const imageFile = new File([file], fileName, { type: file.type })
        
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(imageFile)
        document.getElementById('image-input').files = dataTransfer.files
        
        const fileInput = document.getElementById('image-input')
        fileInput.style.border = '2px solid green'
        setTimeout(() => {
          fileInput.style.border = ''
        }, 1000)
        break
      }
    }
  })
}

// Scroll listener for profile
function setupProfileScrollListener() {
    window.addEventListener('scroll', () => {
        const scrollHeight = document.documentElement.scrollHeight;
        const scrollTop = window.scrollY;
        const clientHeight = window.innerHeight;
        
        if (scrollHeight - (scrollTop + clientHeight) < 300) {
            loadMoreProfilePosts();
        }
    });
}

window.openMore = openMore
window.closeMore = closeMore
window.sendFriendRequest = sendFriendRequest
window.acceptFriendRequest = acceptFriendRequest
window.rejectFriendRequest = rejectFriendRequest
window.removeFriend = removeFriend
window.cancelFriendRequest = cancelFriendRequest
window.openChatWithUser = openChatWithUser

loadProfile();
setupProfileScrollListener();
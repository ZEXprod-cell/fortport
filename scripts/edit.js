// edit.js
function getPostAttachments(post) {
  if (Array.isArray(post.files)) {
    return post.files.map((path, index) => ({
      kind: 'existing',
      path,
      type: post.fileTypes?.[index] || 'image',
      name: post.fileNames?.[index] || null
    }))
  }
  if (post.imagePath) {
    return [{ kind: 'existing', path: post.imagePath, type: 'image', name: null }]
  }
  return []
}

function createAttachmentPreview(item) {
  if (item.type === 'video') {
    const video = document.createElement('video')
    video.src = item.previewUrl || item.path
    video.controls = true
    video.preload = 'metadata'
    return video
  }
  if (item.type === 'audio') {
    const audio = document.createElement('audio')
    audio.src = item.previewUrl || item.path
    audio.controls = true
    audio.preload = 'metadata'
    return audio
  }
  const image = document.createElement('img')
  image.src = item.previewUrl || item.path
  image.alt = item.name || 'Вложение поста'
  return image
}

async function saveEditedPost(postId, newContent, attachments, postDiv, onSuccess) {
  const formData = new FormData()
  formData.append('content', newContent)

  const newAttachments = attachments.filter(item => item.kind === 'new')
  newAttachments.forEach(item => formData.append('files', item.file))
  formData.append('attachmentOrder', JSON.stringify(attachments.map(item => {
    if (item.kind === 'existing') {
      return { kind: 'existing', path: item.path, type: item.type }
    }
    return { kind: 'new', uploadIndex: newAttachments.indexOf(item) }
  })))

  const response = await fetch('/api/posts/' + postId, {
    method: 'PUT',
    credentials: 'same-origin',
    body: formData
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Не удалось обновить пост')
  }

  attachments.forEach(item => {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
  })
  if (typeof onSuccess === 'function') onSuccess()
  else location.reload()
}

function enterEditMode(post, postDiv, onSaveSuccess) {
  const attachments = getPostAttachments(post)
  const originalHTML = postDiv.innerHTML
  postDiv.innerHTML = ''

  const editContainer = document.createElement('div')
  editContainer.classList.add('edit-container')

  const attachmentList = document.createElement('div')
  attachmentList.className = 'edit-attachment-list'

  function renderAttachments() {
    attachmentList.innerHTML = ''
    attachments.forEach((item, index) => {
      const card = document.createElement('div')
      card.className = 'edit-attachment-item'
      const preview = createAttachmentPreview(item)
      preview.classList.add('edit-attachment-preview')
      card.appendChild(preview)

      const label = document.createElement('span')
      label.className = 'edit-attachment-name'
      label.textContent = item.name || item.file?.name || `Вложение ${index + 1}`
      card.appendChild(label)

      const removeBtn = document.createElement('button')
      removeBtn.type = 'button'
      removeBtn.className = 'postbutton edit-attachment-remove'
      removeBtn.textContent = 'Удалить вложение'
      removeBtn.addEventListener('click', () => {
        const [removed] = attachments.splice(index, 1)
        if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl)
        renderAttachments()
      })
      card.appendChild(removeBtn)
      attachmentList.appendChild(card)
    })
  }

  renderAttachments()
  editContainer.appendChild(attachmentList)

  const fileInput = document.createElement('input')
  fileInput.type = 'file'
  fileInput.accept = 'image/*,video/*,audio/*'
  fileInput.multiple = true
  fileInput.style.display = 'none'

  const addFilesBtn = document.createElement('button')
  addFilesBtn.type = 'button'
  addFilesBtn.textContent = 'Добавить вложения'
  addFilesBtn.classList.add('postbutton', 'edit-add-files')
  addFilesBtn.addEventListener('click', () => fileInput.click())
  fileInput.addEventListener('change', () => {
    const selectedFiles = Array.from(fileInput.files || [])
    if (attachments.length + selectedFiles.length > 10) {
      alert('В посте может быть не более 10 вложений')
      fileInput.value = ''
      return
    }
    selectedFiles.forEach(file => {
      const mimeGroup = file.type.split('/')[0]
      const type = file.type === 'image/gif' ? 'gif' : mimeGroup
      attachments.push({
        kind: 'new',
        file,
        type,
        name: file.name,
        previewUrl: URL.createObjectURL(file)
      })
    })
    fileInput.value = ''
    renderAttachments()
  })
  editContainer.appendChild(addFilesBtn)
  editContainer.appendChild(fileInput)

  const textEditor = document.createElement('textarea')
  textEditor.value = post.content || ''
  textEditor.classList.add('edit-text-editor')
  textEditor.rows = 6
  editContainer.appendChild(textEditor)

  const buttonRow = document.createElement('div')
  buttonRow.className = 'edit-button-row'

  const saveBtn = document.createElement('button')
  saveBtn.textContent = 'Сохранить'
  saveBtn.classList.add('postbutton')
  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true
    try {
      await saveEditedPost(post.id, textEditor.value, attachments, postDiv, onSaveSuccess)
    } catch (error) {
      console.error('Edit error:', error)
      alert(error.message || 'Ошибка при обновлении поста')
      saveBtn.disabled = false
    }
  })

  const cancelBtn = document.createElement('button')
  cancelBtn.textContent = 'Отмена'
  cancelBtn.classList.add('postbutton')
  cancelBtn.addEventListener('click', () => {
    attachments.forEach(item => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
    })
    if (typeof onSaveSuccess === 'function') onSaveSuccess()
    else postDiv.innerHTML = originalHTML
  })

  buttonRow.appendChild(saveBtn)
  buttonRow.appendChild(cancelBtn)
  editContainer.appendChild(buttonRow)
  postDiv.appendChild(editContainer)
}

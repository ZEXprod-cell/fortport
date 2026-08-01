// delete.js - Generic post deletion that works anywhere

async function deletePost(postId, postElement, onSuccess, options = {}) {
  try {
    const response = await fetch('/api/posts/' + postId, {
      method: 'DELETE',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason: String(options.reason || '').trim(),
        flagId: options.flagId || null
      })
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Не удалось удалить пост')
    }

    if (postElement?.remove) postElement.remove()
    if (typeof onSuccess === 'function') onSuccess()
    return data
  } catch (error) {
    console.error('Delete error:', error)
    alert(error.message || 'Ошибка при удалении поста')
    throw error
  }
}

import { useState, useEffect, useRef } from 'react'
import Icon from './Icon'
import type { ContentItem, ResourceItem } from '../data/contentData'
import { Ha_refitemsesService } from '../generated/services/Ha_refitemsesService'
import type { Ha_refitemses } from '../generated/models/Ha_refitemsesModel'

interface ResourceContentProps {
  content: ContentItem
  resources: ResourceItem[]
  searchTerm: string
  referenceItems?: Ha_refitemses[]
  isManageMode?: boolean
  onManage?: () => void
  onCancelManage?: () => void
  onSaveManage?: (content: ContentItem) => void | Promise<void>
  onAddWidget?: () => void
}

const DEFAULT_JJ_ITEMS: ResourceItem[] = [
  { id: 'jj-resource-0', name: 'J&J Home', type: 'link', url: 'https://jnj.sharepoint.com' },
  { id: 'jj-resource-1', name: 'Ask GS', type: 'link', url: 'https://askgs.jnj.com' },
  { id: 'jj-resource-2', name: 'Viva Engage (formerly Yammer)', type: 'link', url: 'https://engage.cloud.microsoft' },
  { id: 'jj-resource-3', name: 'Workday', type: 'link', url: 'https://wd5.myworkday.com/jnj' },
  { id: 'jj-resource-4', name: 'CREDO Hotline', type: 'link', url: 'https://credohotline.com' },
]

const isValidHttpsUrl = (value: string) => {
  const trimmedValue = value.trim()
  try {
    const url = new URL(trimmedValue)
    return url.protocol === 'https:' && Boolean(url.hostname)
  } catch {
    return false
  }
}

const normalizeValue = (value: string) => value.trim().toLowerCase()

function getInitialManageItems(content: ContentItem, resources: ResourceItem[]): ResourceItem[] {
  if (resources && resources.length > 0) {
    return resources.map((item) => ({ ...item }))
  }
  if (content.resources && content.resources.length > 0) {
    return content.resources.map((item) => ({ ...item }))
  }
  return DEFAULT_JJ_ITEMS.map((item) => ({ ...item }))
}

interface FolderChildFile {
  id: string
  name: string
  size: string
  type: string
  url?: string
}

function inferFileType(fileName: string, filePath?: string): string {
  const target = (fileName || filePath || '').toLowerCase().trim()
  const clean = target.split('?')[0].split('#')[0]
  const extension = clean.split('.').pop()?.trim().toLowerCase()
  switch (extension) {
    case 'pdf':
      return 'PDF'
    case 'xlsx':
    case 'xls':
    case 'csv':
    case 'xlsm':
      return 'Excel'
    case 'doc':
    case 'docx':
    case 'docm':
      return 'Word'
    case 'ppt':
    case 'pptx':
      return 'PPT'
    case 'mp4':
    case 'mov':
    case 'avi':
    case 'mkv':
      return 'Video'
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
      return 'Image'
    case 'zip':
    case 'rar':
    case '7z':
      return 'ZIP'
    case 'txt':
      return 'TXT'
  }
  if (clean.includes('.pdf') || target.includes('pdf')) return 'PDF'
  if (clean.includes('.xls') || clean.includes('.xlsx') || clean.includes('.csv') || target.includes('excel') || target.includes('sheet')) return 'Excel'
  if (clean.includes('.doc') || clean.includes('.docx') || target.includes('word')) return 'Word'
  if (clean.includes('.ppt') || clean.includes('.pptx') || target.includes('powerpoint')) return 'PPT'
  return extension && extension.length <= 5 ? extension.toUpperCase() : 'File'
}

function getFolderChildFiles(
  folderId: string,
  folderName: string,
  items: Ha_refitemses[],
): FolderChildFile[] {
  const normalizedName = (folderName || '').trim().toLowerCase()

  // 1. Match by parent master reference GUID (_ha_refmaster_value or object)
  let matches = items.filter(
    (item) =>
      item.statecode !== 1 &&
      Boolean(folderId) &&
      (item._ha_refmaster_value === folderId ||
        (item.ha_refmaster as any)?.ha_refmastersid === folderId),
  )

  // 2. If no direct ID match, fallback to matching parent master name or path
  if (matches.length === 0 && normalizedName) {
    matches = items.filter((item) => {
      if (item.statecode === 1) return false
      const masterObjName = ((item.ha_refmaster as any)?.ha_name || '').trim().toLowerCase()
      if (masterObjName && masterObjName === normalizedName) return true
      const filePath = (item.ha_filepath || '').trim().toLowerCase()
      if (
        filePath &&
        (filePath.startsWith(`/${normalizedName}`) ||
          filePath.startsWith(`${normalizedName}/`) ||
          filePath.includes(`/${normalizedName}/`) ||
          filePath === normalizedName)
      ) {
        return true
      }
      return false
    })
  }

  return matches.map((item) => {
    const fileType = (item.ha_filetype ?? (item as any).ha_FileType ?? '').toString().trim()
    return {
      id: item.ha_refitemsid,
      name: item.ha_name || 'Document',
      size: item.ha_filesize || '',
      type: fileType || inferFileType(item.ha_name || '', item.ha_filelink || item.ha_filepath || ''),
      url: item.ha_filelink || item.ha_filepath || '',
    }
  })
}

function ResourceContent({
  content,
  resources,
  searchTerm,
  referenceItems,
  isManageMode = false,
  onManage,
  onCancelManage,
  onSaveManage,
  onAddWidget,
}: ResourceContentProps) {
  const [dataverseRefItems, setDataverseRefItems] = useState<Ha_refitemses[]>(
    referenceItems && referenceItems.length > 0 ? referenceItems : [],
  )
  const [isDataverseLoaded, setIsDataverseLoaded] = useState<boolean>(
    Boolean(referenceItems && referenceItems.length > 0),
  )

  useEffect(() => {
    if (referenceItems && referenceItems.length > 0) {
      setDataverseRefItems(referenceItems)
      setIsDataverseLoaded(true)
      return
    }

    let cancelled = false
    const loadItems = async () => {
      try {
        const result = await Ha_refitemsesService.getAll()
        if (!cancelled && result.data) {
          setDataverseRefItems(result.data)
          setIsDataverseLoaded(true)
        }
      } catch (err) {
        console.error('REF ITEMS LOAD ERROR in ResourceContent:', err)
        if (!cancelled) {
          setIsDataverseLoaded(true)
        }
      }
    }

    void loadItems()
    return () => {
      cancelled = true
    }
  }, [referenceItems])
  const isReferenceView = content.section === 'references'
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    if (resources && resources.length > 0) {
      resources.forEach((r) => {
        if (r.type === 'folder' && (r.name.includes('1') || r.count === 4)) {
          initial.add(r.id)
        }
      })
    }
    return initial
  })
  const [starredItems, setStarredItems] = useState<Set<string>>(new Set())
  const [starredFiles, setStarredFiles] = useState<Set<string>>(new Set())
  const [starNotification, setStarNotification] = useState<string | null>(null)
  const starNotificationTimerRef = useRef<number | null>(null)

  const showStarNotification = (message: string) => {
    if (starNotificationTimerRef.current) {
      window.clearTimeout(starNotificationTimerRef.current)
    }
    setStarNotification(message)
    starNotificationTimerRef.current = window.setTimeout(() => {
      setStarNotification(null)
      starNotificationTimerRef.current = null
    }, 5000)
  }

  const toggleStar = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation()
    const isCurrentlyStarred = starredItems.has(id)
    setStarredItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    if (isCurrentlyStarred) {
      showStarNotification(`${name} unpinned`)
    } else {
      showStarNotification(`${name} pinned to your quick links`)
    }
  }

  const toggleFileStar = (e: React.MouseEvent, fileId: string, name: string) => {
    e.stopPropagation()
    const isCurrentlyStarred = starredFiles.has(fileId)
    setStarredFiles((prev) => {
      const next = new Set(prev)
      if (next.has(fileId)) next.delete(fileId)
      else next.add(fileId)
      return next
    })
    if (isCurrentlyStarred) {
      showStarNotification(`${name} unpinned`)
    } else {
      showStarNotification(`${name} pinned to your quick links`)
    }
  }

  // Mode State (isEditing: boolean)
  const [isEditing, setIsEditing] = useState<boolean>(Boolean(isManageMode))

  // 2. Category Title & Description Edit Fields
  const [editTitle, setEditTitle] = useState<string>(content.title || 'J&J')
  const [editDescription, setEditDescription] = useState<string>(
    content.description ||
      (isReferenceView
        ? 'Function overview covering the operating model, the business units in scope and how audit coverage is allocated across them.'
        : `List of Resource Links under ${content.title || 'J&J'}`),
  )

  // 4. Manageable Items List
  const [manageItems, setManageItems] = useState<ResourceItem[]>(() =>
    getInitialManageItems(content, resources),
  )

  // 3. "Add Items" Creation Form inputs
  const [newTitle, setNewTitle] = useState('')
  const [newUrl, setNewUrl] = useState('')

  // Saving state
  const [isSaving, setIsSaving] = useState(false)

  // Inline edit state
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [inlineEditTitle, setInlineEditTitle] = useState('')
  const [inlineEditUrl, setInlineEditUrl] = useState('')

  // Notification / Error state
  const [manageError, setManageError] = useState<string | null>(null)
  const manageErrorTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (manageErrorTimeoutRef.current) {
        window.clearTimeout(manageErrorTimeoutRef.current)
      }
    }
  }, [])

  const showManageError = (message: string) => {
    if (manageErrorTimeoutRef.current) {
      window.clearTimeout(manageErrorTimeoutRef.current)
    }
    setManageError(message)
    manageErrorTimeoutRef.current = window.setTimeout(() => {
      setManageError(null)
      manageErrorTimeoutRef.current = null
    }, 5000)
  }

  // Sync isEditing with isManageMode prop
  useEffect(() => {
    if (isManageMode !== undefined) {
      setIsEditing(Boolean(isManageMode))
    }
  }, [isManageMode])

  // Sync state when content or resources update
  useEffect(() => {
    setEditTitle(content.title || 'J&J')
    setEditDescription(
      content.description ||
        (isReferenceView
          ? 'Function overview covering the operating model, the business units in scope and how audit coverage is allocated across them.'
          : `List of Resource Links under ${content.title || 'J&J'}`),
    )
    setManageItems(getInitialManageItems(content, resources))
    setNewTitle('')
    setNewUrl('')
    setEditingItemId(null)
    setManageError(null)
  }, [content.id, content.title, content.description, resources, isReferenceView])

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((current) => {
      const next = new Set(current)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }

  const handleStartManage = () => {
    setIsEditing(true)
    setManageError(null)
    onManage?.()
  }

  const handleCancelManage = () => {
    // Discard unsaved edits and return to View mode
    setShowDeleteModal(false)
    setItemToDelete(null)
    setEditTitle(content.title || 'J&J')
    setEditDescription(
      content.description ||
        (isReferenceView
          ? 'Function overview covering the operating model, the business units in scope and how audit coverage is allocated across them.'
          : `List of Resource Links under ${content.title || 'J&J'}`),
    )
    setManageItems(getInitialManageItems(content, resources))
    setNewTitle('')
    setNewUrl('')
    setEditingItemId(null)
    setManageError(null)
    setIsEditing(false)
    onCancelManage?.()
  }

  const validateResourceItem = (
    title: string,
    url: string,
    ignoreItemId?: string,
  ): string | null => {
    const trimmedTitle = title.trim()
    const trimmedUrl = url.trim()

    if (!trimmedTitle) {
      return 'Please enter a Link Title.'
    }

    if (!/[a-zA-Z0-9]/.test(trimmedTitle)) {
      return 'Only special characters are not allowed.'
    }

    if (!trimmedUrl) {
      return 'Please enter a Link URL.'
    }

    if (!/[a-zA-Z0-9]/.test(trimmedUrl)) {
      return 'Only special characters are not allowed.'
    }

    const duplicateTitle = manageItems.some(
      (item) =>
        item.id !== ignoreItemId &&
        normalizeValue(item.name) === normalizeValue(trimmedTitle),
    )

    const duplicateUrl = manageItems.some(
      (item) =>
        item.id !== ignoreItemId &&
        item.url &&
        normalizeValue(item.url) === normalizeValue(trimmedUrl),
    )

    if (duplicateTitle && duplicateUrl) {
      return `Title "${trimmedTitle}" and link "${trimmedUrl}" already exist.`
    }

    if (duplicateTitle) {
      return `Title "${trimmedTitle}" already exists.`
    }

    if (!/^https:\/\//i.test(trimmedUrl)) {
      return 'URL should start with https format.'
    }

    if (!isValidHttpsUrl(trimmedUrl)) {
      return 'Please enter a valid HTTPS URL.'
    }

    if (duplicateUrl) {
      return `Link "${trimmedUrl}" already exists.`
    }

    return null
  }

  const handleSaveManage = async () => {
    if (editTitle.trim() && !/[a-zA-Z0-9]/.test(editTitle.trim())) {
      showManageError('Only special characters are not allowed.')
      return
    }

    if (editDescription.trim() && !/[a-zA-Z0-9]/.test(editDescription.trim())) {
      showManageError('Only special characters are not allowed.')
      return
    }

    // Validate each item before persisting
    for (const item of manageItems) {
      const err = validateResourceItem(item.name, item.url || '', item.id)
      if (err) {
        showManageError(err)
        return
      }
    }

    try {
      setIsSaving(true)
      setEditingItemId(null)
      setManageError(null)
      // Persists updates and returns to View mode
      const updatedContent: ContentItem = {
        ...content,
        title: editTitle.trim() || content.title || 'J&J',
        description: editDescription.trim(),
        resources: manageItems,
      }
      await onSaveManage?.(updatedContent)
      setIsEditing(false)
    } catch (caughtError) {
      console.error('Save to Dataverse failed:', caughtError)
      showManageError('Failed to save changes to Dataverse. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmedTitle = newTitle.trim()
    const trimmedUrl = newUrl.trim()

    const validationError = validateResourceItem(trimmedTitle, trimmedUrl)
    if (validationError) {
      showManageError(validationError)
      return
    }

    const newItem: ResourceItem = {
      id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: trimmedTitle,
      type: 'link',
      url: trimmedUrl,
    }

    setManageItems((current) => [...current, newItem])
    setNewTitle('')
    setNewUrl('')
    setManageError(null)
  }

  const handleMoveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= manageItems.length) return
    setManageItems((current) => {
      const next = [...current]
      const [item] = next.splice(index, 1)
      next.splice(target, 0, item)
      return next
    })
  }

  // Delete Confirmation Modal state
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false)
  const [itemToDelete, setItemToDelete] = useState<{
    id: string
    title: string
    parent: string
  } | null>(null)

  const handleRequestDeleteItem = (item: ResourceItem) => {
    const parentName = editTitle.trim() || content.title || 'J&J'
    setItemToDelete({
      id: item.id,
      title: item.name,
      parent: parentName,
    })
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = () => {
    if (!itemToDelete) return
    const id = itemToDelete.id
    setManageItems((current) => current.filter((item) => item.id !== id))
    if (editingItemId === id) {
      setEditingItemId(null)
    }
    if (manageError) {
      setManageError(null)
    }
    setShowDeleteModal(false)
    setItemToDelete(null)
  }

  const handleCancelDelete = () => {
    setShowDeleteModal(false)
    setItemToDelete(null)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showDeleteModal) {
        handleCancelDelete()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showDeleteModal])

  const handleStartInlineEdit = (item: ResourceItem) => {
    setEditingItemId(item.id)
    setInlineEditTitle(item.name)
    setInlineEditUrl(item.url || '')
    setManageError(null)
  }

  const handleSaveInlineEdit = (id: string) => {
    const trimmedTitle = inlineEditTitle.trim()
    const trimmedUrl = inlineEditUrl.trim()

    const validationError = validateResourceItem(trimmedTitle, trimmedUrl, id)
    if (validationError) {
      showManageError(validationError)
      return
    }

    setManageItems((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, name: trimmedTitle, url: trimmedUrl }
          : item,
      ),
    )
    setEditingItemId(null)
    setManageError(null)
  }

  const handleCancelInlineEdit = () => {
    setEditingItemId(null)
    setManageError(null)
  }

  // ==========================================================
  // EDIT MODE (inside section.pane)
  // ==========================================================
  if (isEditing) {
    return (
      <section
        className={`right-content-panel pane is-editing${content.section === 'quickLinks' ? ' quick-links-editing' : ''}`}
      >
        {manageError && (
          <div className="toast-region">
            <div className="toast-pill warning-toast" role="alert">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#00A3FF"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-info toast-icon"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
              <span className="toast-message" style={{ color: '#ffffff' }}>{manageError}</span>
            </div>
          </div>
        )}

        {/* 1. Header Layout */}
        <div className="res-manage-header">
          <h2 className="res-manage-heading">Manage Content</h2>
          <div className="res-manage-header-actions">
            <button
              type="button"
              className="res-manage-cancel-btn"
              onClick={handleCancelManage}
            >
              Cancel
            </button>
            <button
              type="button"
              className="res-manage-save-btn"
              onClick={handleSaveManage}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* 2. Category Title & Description Edit Fields */}
        <div className="res-manage-fields">
          <input
            type="text"
            className="res-manage-category-name"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Category Name"
            aria-label="Category Name"
          />
          <textarea
            className="res-manage-category-desc"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            placeholder="Category Description"
            aria-label="Category Description"
            rows={3}
          />
        </div>

        {/* 3. "Add Items" Creation Form */}
        <div className="res-manage-add-section">
          <div className="res-manage-add-label">Add Items</div>
          {(() => {
            const isAddDisabled = isSaving || !newTitle.trim() || !newUrl.trim()
            return (
              <div className="res-manage-add-row">
                <input
                  type="text"
                  className="res-manage-add-title"
                  placeholder="Link Title"
                  value={newTitle}
                  onChange={(e) => {
                    setNewTitle(e.target.value)
                    if (manageError) setManageError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      if (!isAddDisabled) {
                        handleAddItem()
                      }
                    }
                  }}
                />
                <input
                  type="text"
                  className="res-manage-add-url"
                  placeholder="Link URL"
                  value={newUrl}
                  onChange={(e) => {
                    setNewUrl(e.target.value)
                    if (manageError) setManageError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      if (!isAddDisabled) {
                        handleAddItem()
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  className="res-manage-add-btn"
                  onClick={handleAddItem}
                  disabled={isAddDisabled}
                  style={{
                    backgroundColor: '#ed1b24',
                    color: '#ffffff',
                    opacity: isAddDisabled ? 0.45 : 1,
                    cursor: isAddDisabled ? 'not-allowed' : 'pointer',
                  }}
                >
                  Add
                </button>
              </div>
            )
          })()}
        </div>

        {/* 4. Manageable Items List */}
        <div className="res-list-manage">
          {manageItems.map((item, index) => {
            const isItemEditing = editingItemId === item.id

            if (isItemEditing) {
              return (
                <div key={item.id} className="res-manage-item-row res-manage-item-editing">
                  <div className="res-manage-inline-edit">
                    <input
                      type="text"
                      className="res-manage-inline-input"
                      value={inlineEditTitle}
                      onChange={(e) => {
                        setInlineEditTitle(e.target.value)
                        if (manageError) setManageError(null)
                      }}
                      placeholder="Item Title"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveInlineEdit(item.id)
                        if (e.key === 'Escape') handleCancelInlineEdit()
                      }}
                    />
                    <input
                      type="text"
                      className="res-manage-inline-input"
                      value={inlineEditUrl}
                      onChange={(e) => {
                        setInlineEditUrl(e.target.value)
                        if (manageError) setManageError(null)
                      }}
                      placeholder="Link URL"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveInlineEdit(item.id)
                        if (e.key === 'Escape') handleCancelInlineEdit()
                      }}
                    />
                    <div className="res-manage-inline-actions">
                      <button
                        type="button"
                        className="res-manage-inline-btn res-manage-inline-save"
                        onClick={() => handleSaveInlineEdit(item.id)}
                        title="Save"
                        aria-label="Save"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="lucide lucide-check preview-icon"
                        >
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="res-manage-inline-btn res-manage-inline-cancel"
                        onClick={handleCancelInlineEdit}
                        title="Cancel"
                        aria-label="Cancel"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="lucide lucide-x preview-icon"
                        >
                          <path d="M18 6 6 18" />
                          <path d="m6 6 12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )
            }

            return (
              <div key={item.id} className="res-manage-item-row">
                {/* Left Section (Icon + Label) */}
                <div className="res-manage-item-left">
                  <span className="res-manage-link-chain-icon" aria-hidden="true">
                    <Icon name="link" size={14} />
                  </span>
                  <span className="res-manage-item-name" title={item.name}>
                    {item.name}
                  </span>
                </div>

                {/* Right Action Toolbar */}
                <div className="res-manage-actions-toolbar">
                  {/* Edit Action */}
                  <button
                    type="button"
                    className="res-manage-action-icon-btn edit"
                    onClick={() => handleStartInlineEdit(item)}
                    aria-label={`Edit ${item.name}`}
                    title="Edit"
                  >
                    <Icon name="edit" size={15} className="lucide-pencil" />
                  </button>

                  {/* Move Up Action */}
                  <button
                    type="button"
                    className="res-manage-action-icon-btn move-up"
                    onClick={() => handleMoveItem(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move ${item.name} up`}
                    title="Move up"
                  >
                    <Icon name="arrow-up" size={15} className="lucide-arrow-up" />
                  </button>

                  {/* Move Down Action */}
                  <button
                    type="button"
                    className="res-manage-action-icon-btn move-down"
                    onClick={() => handleMoveItem(index, 1)}
                    disabled={index === manageItems.length - 1}
                    aria-label={`Move ${item.name} down`}
                    title="Move down"
                  >
                    <Icon name="arrow-down" size={15} className="lucide-arrow-down" />
                  </button>

                  {/* Delete Action */}
                  <button
                    type="button"
                    className="res-manage-action-icon-btn delete"
                    onClick={() => handleRequestDeleteItem(item)}
                    aria-label={`Delete ${item.name}`}
                    title="Delete"
                  >
                    <Icon name="trash" size={15} className="lucide-trash-2" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && itemToDelete && (
          <div
            className="modal-backdrop"
            onClick={handleCancelDelete}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-headline"
          >
            <div
              className="modal-dialog modal-dialog-delete"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-delete-badge">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#991b1b"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </div>
              <h3 id="delete-modal-headline" className="modal-headline">
                Delete link?
              </h3>
              <p className="modal-description" style={{ color: '#6e6259' }}>
                <span className="modal-item-highlight" style={{ color: '#6e6259' }}>{itemToDelete.title}</span> will be removed from {itemToDelete.parent}.
              </p>
              <div className="modal-btn-group">
                <button
                  type="button"
                  className="modal-cancel-btn has-nav-tooltip"
                  onClick={handleCancelDelete}
                >
                  Cancel
                  <span className="nav-tooltip nav-tooltip-box" role="tooltip">Cancel</span>
                </button>
                <button
                  type="button"
                  className="modal-delete-confirm-btn has-nav-tooltip"
                  onClick={handleConfirmDelete}
                >
                  Delete
                  <span className="nav-tooltip nav-tooltip-box" role="tooltip">Delete</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    )
  }

  const getFolderChildItemCount = (resource: ResourceItem): number => {
    const countMatch = resource.name.match(/^(.*?)\s*\((\d+)\)$/)
    const rawBaseName = (countMatch ? countMatch[1] : resource.name).trim()
    const baseName = rawBaseName.toLowerCase() === 'data pipeline' ? 'Data Pipeline' : rawBaseName
    const childFiles = getFolderChildFiles(resource.id, baseName, dataverseRefItems)
    return childFiles.length > 0
      ? childFiles.length
      : (isDataverseLoaded ? childFiles.length : (countMatch ? Number(countMatch[2]) : (resource.count ?? 0)))
  }

  // Calculate total resources count for references header:
  // based on link and under the folder hierarchy items count
  const totalResourceCount = resources.reduce((acc, item) => {
    if (item.type === 'folder') {
      return acc + getFolderChildItemCount(item)
    }
    return acc + 1
  }, 0)

  // Ensure breadcrumb always displays heading / category / subcategory
  const breadcrumbParts = (() => {
    if (!content.breadcrumb || content.breadcrumb.length === 0) {
      return [isReferenceView ? 'References' : 'Quick Links', isReferenceView ? 'GA&A' : 'Resource Links', content.title]
    }
    if (content.breadcrumb.length === 1) {
      return [isReferenceView ? 'References' : 'Quick Links', isReferenceView ? 'GA&A' : 'Resource Links', content.breadcrumb[0]]
    }
    if (content.breadcrumb.length === 2) {
      return [content.breadcrumb[0], isReferenceView ? 'GA&A' : 'Resource Links', content.breadcrumb[1]]
    }
    return content.breadcrumb
  })()

  return (
    <section className="right-content-panel pane">
      {starNotification && (
        <div className="toast-region">
          <div className="toast-pill warning-toast" role="status">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#00A3FF"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-info toast-icon"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            <span className="toast-message" style={{ color: '#ffffff' }}>
              {starNotification}
            </span>
          </div>
        </div>
      )}
      {isReferenceView ? (
        <>
          {/* 1. Panel Header & Summary Block: Breadcrumb Row */}
          <div className="ref-breadcrumb-row">
            <nav className="ref-breadcrumb" aria-label="Breadcrumb">
              <span>Reference</span>
              <span className="ref-breadcrumb-sep">/</span>
              <span>GA&A</span>
              <span className="ref-breadcrumb-sep">/</span>
              <span className="ref-breadcrumb-current">{content.title || 'Overview of J&J'}</span>
            </nav>

            {Boolean(onManage) && (
              <div className="ref-manage-trigger">
                <button
                  type="button"
                  className="ref-manage-btn"
                  onClick={handleStartManage}
                  aria-label="Manage content"
                  style={{ color: '#eb1700', fontSize: '12px' }}
                >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#eb1700"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-file-pen preview-icon"
                >
                  <path d="M12.659 22H18a2 2 0 0 0 2-2V8a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 14 2H6a2 2 0 0 0-2 2v9.34" />
                  <path d="M14 2v5a1 1 0 0 0 1 1h5" />
                  <path d="M10.378 12.622a1 1 0 0 1 3 3.003L8.36 20.637a2 2 0 0 1-.854.506l-2.867.837a.5.5 0 0 1-.62-.62l.836-2.869a2 2 0 0 1 .506-.853z" />
                </svg>
                <span style={{ color: '#eb1700', fontSize: '12px' }}>MANAGE</span>
              </button>
            </div>
          )}
          </div>

          {/* 1. Category Overview Block */}
          <div className="ref-category-overview">
            <div className="ref-overview-left">
              <div className="ref-category-badge" aria-hidden="true">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#eb1700"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-folder-open preview-icon"
                >
                  <path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" />
                </svg>
              </div>
              <div className="ref-overview-text">
                <h1 className="ref-overview-title">{content.title || 'Overview of J&J'}</h1>
                <p className="ref-overview-subtitle">
                  {content.description ||
                    'Function overview covering the operating model, the business units in scope and how audit coverage is allocated across them.'}
                </p>
              </div>
            </div>

            <div className="ref-overview-right">
              <button
                className="ref-add-widget-btn"
                type="button"
                onClick={onAddWidget}
              >
                + Add to Home Page Widgets
              </button>
            </div>
          </div>

          {/* 2. "Resources" Section & Card Hierarchy */}
          <div className="ref-resources-section">
            <h2 className="ref-resources-heading">Resources ({totalResourceCount})</h2>
            <div className="ref-resources-list res-list">
              {resources.length > 0 ? (
                resources.map((resource: ResourceItem) => {
                  const isFolder = resource.type === 'folder'
                  const isExpanded = expandedFolders.has(resource.id)

                  if (isFolder) {
                    const countMatch = resource.name.match(/^(.*?)\s*\((\d+)\)$/)
                    const rawBaseName = (countMatch ? countMatch[1] : resource.name).trim()
                    const baseName = rawBaseName.toLowerCase() === 'data pipeline' ? 'Data Pipeline' : rawBaseName
                    const childFiles = getFolderChildFiles(resource.id, baseName, dataverseRefItems)
                    const count = childFiles.length > 0
                      ? childFiles.length
                      : (isDataverseLoaded ? childFiles.length : (countMatch ? Number(countMatch[2]) : (resource.count ?? 0)))

                    return (
                      <div key={resource.id} className={`folder-card ${isExpanded ? 'is-expanded' : ''}`}>
                        {/* 3. Folder Header Row */}
                        <div
                          className="folder-header"
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleFolder(resource.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              toggleFolder(resource.id)
                            }
                          }}
                        >
                          <div className="folder-header-left">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#eb1700"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="lucide lucide-folder-open preview-icon"
                            >
                              <path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" />
                            </svg>
                            <span className="folder-name">{baseName}{' '}<span className="folder-count" style={{ color: '#eb1700' }}>({count})</span></span>
                          </div>

                          <div className="folder-header-right">
                            {isExpanded ? (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#6e6259"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="lucide lucide-chevron-down preview-icon"
                              >
                                <path d="m6 9 6 6 6-6" />
                              </svg>
                            ) : (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#6e6259"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="lucide lucide-chevron-right preview-icon"
                              >
                                <path d="m9 18 6-6-6-6" />
                              </svg>
                            )}
                          </div>
                        </div>

                        {/* 4. Expanded Folder Nested File List */}
                        {isExpanded && (
                          <div className="folder-children">
                            {childFiles.length === 0 ? (
                              <div className="folder-child-row folder-empty-row" style={{ height: '44px', minHeight: '44px', maxHeight: '44px', padding: '0 16px 0 26px', color: '#6e6259', fontSize: '13px', display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}>
                                No files available
                              </div>
                            ) : (
                              childFiles.map((file) => (
                                <div key={file.id} className="folder-child-row folder-doc-row">
                                  <div className="child-left">
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      width="16"
                                      height="16"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="#312c2a"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      className="lucide lucide-file-text preview-icon"
                                      style={{ color: '#312c2a', stroke: '#312c2a' }}
                                    >
                                      <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" />
                                      <path d="M14 2v5a1 1 0 0 0 1 1h5" />
                                      <path d="M10 9H8" />
                                      <path d="M16 13H8" />
                                      <path d="M16 17H8" />
                                    </svg>
                                    <span className="child-file-title doc-name file-name" title={file.name} style={{ color: '#312c2a', fontSize: '13px', fontWeight: 400 }}>{file.name}</span>
                                  </div>

                                  <div className="child-right-toolbar">
                                    {file.size ? (
                                      <span className="child-file-size doc-size file-size meta-item" style={{ color: '#6e6259', fontSize: '12px', fontWeight: 400 }}>
                                        {file.size}
                                      </span>
                                    ) : null}
                                    {file.type ? (
                                      <span className="child-file-type doc-type file-type meta-item" style={{ color: '#6e6259', fontSize: '12px', fontWeight: 400 }}>
                                        {file.type}
                                      </span>
                                    ) : null}
                                    <button
                                      type="button"
                                      className={`child-action-btn star-btn ${starredFiles.has(file.id) ? 'is-starred' : ''}`}
                                      aria-label={`Favorite ${file.name}`}
                                      onClick={(e) => toggleFileStar(e, file.id, file.name)}
                                    >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="15"
                                        height="15"
                                        viewBox="0 0 24 24"
                                        fill={starredFiles.has(file.id) ? '#eb1700' : 'none'}
                                        stroke={starredFiles.has(file.id) ? '#eb1700' : '#6e6259'}
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="lucide lucide-star preview-icon"
                                        style={{
                                          fill: starredFiles.has(file.id) ? '#eb1700' : 'none',
                                          stroke: starredFiles.has(file.id) ? '#eb1700' : '#6e6259',
                                          color: starredFiles.has(file.id) ? '#eb1700' : '#6e6259',
                                        }}
                                      >
                                        <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
                                      </svg>
                                    </button>
                                    <button
                                      type="button"
                                      className="child-action-btn ext-btn"
                                      aria-label={`Open ${file.name}`}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        if (file.url) {
                                          window.open(file.url, '_blank', 'noopener,noreferrer')
                                        }
                                      }}
                                    >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="15"
                                        height="15"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="#6e6259"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="lucide lucide-external-link preview-icon"
                                      >
                                        <path d="M15 3h6v6" />
                                        <path d="M10 14 21 3" />
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )
                  }

                  // 5. Standard Link Cards (Non-folder rows)
                  return (
                    <div
                      key={resource.id}
                      className="standard-link-card"
                      role="link"
                      tabIndex={0}
                      onClick={() => {
                        if (resource.url) {
                          window.open(resource.url, '_blank', 'noopener,noreferrer')
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          if (resource.url) {
                            window.open(resource.url, '_blank', 'noopener,noreferrer')
                          }
                        }
                      }}
                    >
                      <div className="link-card-left">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#eb1700"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="lucide lucide-link-2 preview-icon"
                        >
                          <path d="M9 17H7A5 5 0 0 1 7 7h2" />
                          <path d="M15 7h2a5 5 0 1 1 0 10h-2" />
                          <line x1="8" y1="12" x2="16" y2="12" />
                        </svg>
                        <span className="link-card-title">{resource.name}</span>
                      </div>

                      <div className="link-card-right">
                        <button
                          type="button"
                          className={`link-action-btn star-btn ${starredItems.has(resource.id) ? 'is-starred' : ''}`}
                          aria-label={`Favorite ${resource.name}`}
                          onClick={(e) => toggleStar(e, resource.id, resource.name)}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill={starredItems.has(resource.id) ? '#eb1700' : 'none'}
                            stroke={starredItems.has(resource.id) ? '#eb1700' : '#6e6259'}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="lucide lucide-star preview-icon"
                            style={{
                              fill: starredItems.has(resource.id) ? '#eb1700' : 'none',
                              stroke: starredItems.has(resource.id) ? '#eb1700' : '#6e6259',
                              color: starredItems.has(resource.id) ? '#eb1700' : '#6e6259',
                            }}
                          >
                            <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
                          </svg>
                        </button>

                        <button
                          type="button"
                          className="link-action-btn ext-btn"
                          aria-label={`Open ${resource.name}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (resource.url) {
                              window.open(resource.url, '_blank', 'noopener,noreferrer')
                            }
                          }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#6e6259"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="lucide lucide-external-link preview-icon"
                          >
                            <path d="M15 3h6v6" />
                            <path d="M10 14 21 3" />
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="empty-resource-state">
                  <p>{searchTerm ? <>No resources found matching &ldquo;{searchTerm}&rdquo;</> : 'No resources available.'}</p>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        /* Quick Links (VIEW A) */
        <>
          <div className="panel-top-row">
            <nav className="panel-breadcrumb" aria-label="Breadcrumb">
              {breadcrumbParts.map((part, index) => {
                const isLast = index === breadcrumbParts.length - 1
                return (
                  <span key={`${part}-${index}`} className="breadcrumb-segment">
                    <span className={`breadcrumb-text ${isLast ? 'breadcrumb-active' : ''}`}>
                      {part}
                    </span>
                    {!isLast && <span className="breadcrumb-separator">/</span>}
                  </span>
                )
              })}
            </nav>

            {Boolean(onManage) && (
              <div className="panel-top-manage">
                <button
                  type="button"
                  className="ref-manage-btn ql-manage-top-btn"
                  onClick={handleStartManage}
                  aria-label="Manage content"
                  style={{ color: '#eb1700', fontSize: '12px' }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#eb1700"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-file-pen preview-icon"
                  >
                    <path d="M12.659 22H18a2 2 0 0 0 2-2V8a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 14 2H6a2 2 0 0 0-2 2v9.34" />
                    <path d="M14 2v5a1 1 0 0 0 1 1h5" />
                    <path d="M10.378 12.622a1 1 0 0 1 3 3.003L8.36 20.637a2 2 0 0 1-.854.506l-2.867.837a.5.5 0 0 1-.62-.62l.836-2.869a2 2 0 0 1 .506-.853z" />
                  </svg>
                  <span style={{ color: '#eb1700', fontSize: '12px' }}>MANAGE</span>
                </button>
              </div>
            )}
          </div>

          <div className="panel-section-header">
            <div className="section-header-left">
              <div className="active-section-badge-outline" aria-hidden="true">
                <Icon
                  name="link"
                  size={24}
                  strokeWidth={2}
                />
              </div>

              <div className="active-section-info">
                <h2 className="active-section-title category-title">{content.title}</h2>
                <p className="active-section-subtitle">
                  {content.description || `List of Resource Links under ${content.title}`}
                </p>
              </div>
            </div>
          </div>

          <div className="pane_body">
            <div className="res-list resource-cards-list">
              {resources.length > 0 ? (
                resources.map((resource: ResourceItem) => (
                  <div
                    key={resource.id}
                    className="res-row res-card resource-card-row view-a-row"
                    role="link"
                    tabIndex={0}
                    onClick={() => {
                      if (resource.url) {
                        window.open(resource.url, '_blank', 'noopener,noreferrer')
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        if (resource.url) {
                          window.open(resource.url, '_blank', 'noopener,noreferrer')
                        }
                      }
                    }}
                  >
                    <div className="res-item-left resource-card-left">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#eb1700"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="lucide lucide-link-2 preview-icon res-link-icon"
                      >
                        <path d="M9 17H7A5 5 0 0 1 7 7h2" />
                        <path d="M15 7h2a5 5 0 1 1 0 10h-2" />
                        <line x1="8" y1="12" x2="16" y2="12" />
                      </svg>
                      <span className="res-row__label label-text res-item-title resource-card-title">{resource.name}</span>
                    </div>

                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#6e6259"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-arrow-right preview-icon res-row__arrow"
                      aria-hidden="true"
                    >
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </div>
                ))
              ) : (
                <div className="empty-resource-state">
                  <p>{searchTerm ? <>No resources found matching &ldquo;{searchTerm}&rdquo;</> : 'No resources available.'}</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  )
}

export default ResourceContent
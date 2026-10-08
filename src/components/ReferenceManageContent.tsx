import {
  useEffect,
  useState,
  useRef,
} from 'react'

import { Ha_refitemsesService } from '../generated/services/Ha_refitemsesService'
import { GetSharePointLibrariesService } from '../generated/services/GetSharePointLibrariesService'
import { GetSharePointFoldersService } from '../generated/services/GetSharePointFoldersService'
import type { Ha_refitemses } from '../generated/models/Ha_refitemsesModel'

import type {
  ReferenceMasterDraft,
  ReferenceSite,
  ReferenceSubcategory,
} from '../hooks/useReferences'

import './ReferenceManageContent.css'

interface ReferenceManageContentProps {
  subcategory: ReferenceSubcategory
  sites: ReferenceSite[]
  saving: boolean
  referenceItems?: Ha_refitemses[]
  onCancel: () => void
  onSave: (
    drafts: ReferenceMasterDraft[],
    metadata?: { title: string; description: string },
  ) => Promise<void>
}

/*
 * ---------------------------------------------------------
 * Default items specifically for "Overview of J&J H" / GA&A
 * ---------------------------------------------------------
 */
const DEFAULT_OVERVIEW_ITEMS: ReferenceMasterDraft[] = [
  {
    id: 'ref-m-data-pipeline',
    name: 'Data Pipeline',
    type: 'folder',
    link: '',
    folderName: 'Data Pipeline',
    folderParentPath: '',
    folderPath: '/Data Pipeline',
    siteId: '',
  },
  {
    id: 'ref-m-python-questions',
    name: 'Python Questions',
    type: 'link',
    link: 'https://example.com/python-questions',
    folderName: '',
    folderParentPath: '',
    folderPath: '',
    siteId: '',
  },
  {
    id: 'ref-m-ah',
    name: 'Ah',
    type: 'folder',
    link: '',
    folderName: 'Ah',
    folderParentPath: '',
    folderPath: '/Ah',
    siteId: '',
  },
  {
    id: 'ref-m-ha',
    name: 'Ha',
    type: 'link',
    link: 'https://example.com/ha',
    folderName: '',
    folderParentPath: '',
    folderPath: '',
    siteId: '',
  },
  {
    id: 'ref-m-aw',
    name: 'aw',
    type: 'link',
    link: 'https://example.com/aw',
    folderName: '',
    folderParentPath: '',
    folderPath: '',
    siteId: '',
  },
]

/*
 * ---------------------------------------------------------
 * Icons
 * ---------------------------------------------------------
 */

/* Folder Icon - left side reference section category (lucide-folder-open) */
const FolderCategoryIcon = () => (
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
    className="lucide lucide-folder-open folder-category-icon ref-left-folder-icon"
    style={{ flexShrink: 0, color: '#6e6259', stroke: '#6e6259' }}
    aria-hidden="true"
  >
    <path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" />
  </svg>
)

/* Link Icon - quick link right side child items link icon */
const QuickLinkChildIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#6e6259"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="quick-link-gallery-link-icon ref-left-link-icon"
    style={{ flexShrink: 0, color: '#6e6259', stroke: '#6e6259' }}
    aria-hidden="true"
  >
    <path d="M9 17H7A5 5 0 0 1 7 7h2" />
    <path d="M15 7h2a5 5 0 1 1 0 10h-2" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
)

/* Expand Chevron - > */
const ExpandChevronIcon = ({ isExpanded }: { isExpanded: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#6e6259"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      transition: 'transform 0.15s ease',
      transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
      display: 'block',
      color: '#6e6259',
      stroke: '#6e6259',
    }}
    aria-hidden="true"
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
)

/* Edit Pencil - lucide-pencil */
const PencilActionIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#6e6259"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ color: '#6e6259', stroke: '#6e6259' }}
    aria-hidden="true"
  >
    <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
    <path d="m15 5 4 4" />
  </svg>
)

/* Move Up Arrow - lucide-arrow-up */
const ArrowUpActionIcon = ({ disabled }: { disabled: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke={disabled ? '#d5cfc9' : '#6e6259'}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      color: disabled ? '#d5cfc9' : '#6e6259',
      stroke: disabled ? '#d5cfc9' : '#6e6259',
    }}
    aria-hidden="true"
  >
    <path d="m5 12 7-7 7 7" />
    <path d="M12 19V5" />
  </svg>
)

/* Move Down Arrow - lucide-arrow-down */
const ArrowDownActionIcon = ({ disabled }: { disabled: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke={disabled ? '#d5cfc9' : '#6e6259'}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      color: disabled ? '#d5cfc9' : '#6e6259',
      stroke: disabled ? '#d5cfc9' : '#6e6259',
    }}
    aria-hidden="true"
  >
    <path d="M12 5v14" />
    <path d="m19 12-7 7-7-7" />
  </svg>
)

/* Delete Trash - quick link manage trash icon */
const TrashActionIcon = () => (
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
    style={{ color: '#eb1700', stroke: '#eb1700' }}
    aria-hidden="true"
  >
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v5" />
    <path d="M14 11v5" />
  </svg>
)

const FileSubIcon = () => (
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
    style={{ flexShrink: 0, color: '#312c2a', stroke: '#312c2a' }}
    aria-hidden="true"
  >
    <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" />
    <path d="M14 2v5a1 1 0 0 0 1 1h5" />
    <path d="M10 9H8" />
    <path d="M16 13H8" />
    <path d="M16 17H8" />
  </svg>
)

const ExternalSubLinkIcon = () => (
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
    style={{ flexShrink: 0, color: '#6e6259', stroke: '#6e6259' }}
    aria-hidden="true"
  >
    <path d="M15 3h6v6" />
    <path d="M10 14 21 3" />
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </svg>
)

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

/*
 * ---------------------------------------------------------
 * SharePoint Libraries & Folders Parser Helpers
 * ---------------------------------------------------------
 */
export interface SharePointLibraryItem {
  id: string
  name: string
}

const isValidHttpsUrl = (value: string) => {
  const trimmedValue = value.trim()
  try {
    const url = new URL(trimmedValue)
    return url.protocol === 'https:' && Boolean(url.hostname)
  } catch {
    return false
  }
}

const extractLibraryItem = (item: unknown): SharePointLibraryItem | null => {
  if (typeof item === 'string') {
    const trimmed = item.trim()
    return trimmed.length > 0 ? { id: trimmed, name: trimmed } : null
  }
  if (item && typeof item === 'object') {
    const record = item as Record<string, unknown>
    let nameCandidate: string | null = null
    if (record.RootFolder && typeof record.RootFolder === 'object') {
      const root = record.RootFolder as Record<string, unknown>
      if (typeof root.Name === 'string' && root.Name.trim().length > 0) {
        nameCandidate = root.Name.trim()
      }
    }
    if (!nameCandidate) {
      const candidate =
        record.Title ??
        record.title ??
        record.Name ??
        record.name ??
        record.DisplayName ??
        record.displayName ??
        record.LibraryName ??
        record.libraryName ??
        record.value ??
        record.Value
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        nameCandidate = candidate.trim()
      } else if (candidate && typeof candidate === 'number') {
        nameCandidate = String(candidate)
      }
    }

    const idCandidate =
      record.Id ??
      record.id ??
      record.ID ??
      record.Guid ??
      record.guid ??
      record.LibraryId ??
      record.libraryId ??
      nameCandidate

    const idStr = typeof idCandidate === 'string' ? idCandidate.trim() : (nameCandidate ?? '')
    const nameStr = nameCandidate ?? idStr

    if (nameStr.length > 0) {
      return { id: idStr || nameStr, name: nameStr }
    }
  }
  return null
}

const parseLibrariesOutput = (rawOutput: unknown): SharePointLibraryItem[] => {
  if (!rawOutput) return []

  // If already an array
  if (Array.isArray(rawOutput)) {
    const items = rawOutput
      .map(extractLibraryItem)
      .filter((v): v is SharePointLibraryItem => Boolean(v))
    const seen = new Set<string>()
    return items.filter((item) => {
      const key = `${item.id}-${item.name}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  // If an object
  if (typeof rawOutput === 'object') {
    const obj = rawOutput as Record<string, unknown>
    for (const key of ['value', 'libraries', 'output', 'd', 'results', 'body']) {
      if (Array.isArray(obj[key])) {
        return parseLibrariesOutput(obj[key])
      }
      if (
        obj[key] &&
        typeof obj[key] === 'object' &&
        Array.isArray((obj[key] as any).results)
      ) {
        return parseLibrariesOutput((obj[key] as any).results)
      }
    }
  }

  // If a string
  if (typeof rawOutput === 'string') {
    const trimmed = rawOutput.trim()
    if (!trimmed) return []

    // Try parsing as JSON first
    if (
      (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('"') && trimmed.endsWith('"'))
    ) {
      try {
        const parsed = JSON.parse(trimmed)
        if (typeof parsed === 'string') {
          return parseLibrariesOutput(parsed)
        }
        return parseLibrariesOutput(parsed)
      } catch {
        // Fall through to delimiter splitting
      }
    }

    if (trimmed.includes('\n')) {
      const items = trimmed
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => ({ id: s, name: s }))
      return items
    }
    if (trimmed.includes(';')) {
      const items = trimmed
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => ({ id: s, name: s }))
      return items
    }
    if (trimmed.includes(',')) {
      const items = trimmed
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => ({ id: s, name: s }))
      return items
    }

    return [{ id: trimmed, name: trimmed }]
  }

  return []
}

const extractFolderNameOrPath = (item: unknown): string | null => {
  if (typeof item === 'string') {
    const trimmed = item.trim()
    return trimmed.length > 0 ? trimmed : null
  }
  if (item && typeof item === 'object') {
    const record = item as Record<string, unknown>
    const candidate =
      record.Path ??
      record.path ??
      record.FolderPath ??
      record.folderPath ??
      record.Name ??
      record.name ??
      record.Title ??
      record.title ??
      record.DisplayName ??
      record.displayName ??
      record.ServerRelativeUrl ??
      record.serverRelativeUrl ??
      record.FileRef ??
      record.fileRef ??
      record.value ??
      record.Value
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim()
    }
  }
  return null
}

const parseFoldersOutput = (rawOutput: unknown): string[] => {
  if (!rawOutput) return []

  if (Array.isArray(rawOutput)) {
    const names = rawOutput
      .map(extractFolderNameOrPath)
      .filter((v): v is string => Boolean(v))
    return Array.from(new Set(names))
  }

  if (typeof rawOutput === 'object') {
    const obj = rawOutput as Record<string, unknown>
    for (const key of ['value', 'folders', 'output', 'd', 'results', 'body']) {
      if (Array.isArray(obj[key])) {
        return parseFoldersOutput(obj[key])
      }
      if (
        obj[key] &&
        typeof obj[key] === 'object' &&
        Array.isArray((obj[key] as any).results)
      ) {
        return parseFoldersOutput((obj[key] as any).results)
      }
    }
  }

  if (typeof rawOutput === 'string') {
    const trimmed = rawOutput.trim()
    if (!trimmed) return []

    if (
      (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('"') && trimmed.endsWith('"'))
    ) {
      try {
        const parsed = JSON.parse(trimmed)
        if (typeof parsed === 'string') {
          return parseFoldersOutput(parsed)
        }
        return parseFoldersOutput(parsed)
      } catch {
        // Fall through to delimiter splitting
      }
    }

    if (trimmed.includes('\n')) {
      const items = trimmed
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
      return Array.from(new Set(items))
    }
    if (trimmed.includes(';')) {
      const items = trimmed
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)
      return Array.from(new Set(items))
    }
    if (trimmed.includes(',')) {
      const items = trimmed
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      return Array.from(new Set(items))
    }

    return [trimmed]
  }

  return []
}

/*
 * ---------------------------------------------------------
 * Component: ReferenceManageContent
 * ---------------------------------------------------------
 */
const ReferenceManageContent = ({
  subcategory,
  sites,
  saving,
  referenceItems: propsReferenceItems,
  onCancel,
  onSave,
}: ReferenceManageContentProps) => {
  /*
   * 1. Header Title & Description
   */
  const isOverview = (() => {
    const norm = (subcategory.name || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')
    return norm === 'jj' || norm === 'overviewofjj' || norm === 'overviewofjjh' || norm.includes('overviewofjj')
  })()

  const [contentTitle, setContentTitle] = useState(
    subcategory.name || (isOverview ? 'Overview of J&J H' : ''),
  )
  const [contentDescription, setContentDescription] = useState(
    subcategory.description !== undefined && subcategory.description !== null
      ? subcategory.description
      : isOverview
      ? 'List of contents available under Overview of J&J H'
      : '',
  )

  /*
   * 2. Drafts state
   */
  const [drafts, setDrafts] = useState<ReferenceMasterDraft[]>(
    subcategory.items && subcategory.items.length > 0
      ? subcategory.items.map((item) => ({
          id: item.id,
          name: item.name,
          type: item.type,
          link: item.link ?? '',
          folderName: item.folderName ?? '',
          folderParentPath: item.folderParentPath ?? '',
          folderPath: item.folderPath ?? '',
          siteId: item.siteId ?? '',
        }))
      : isOverview
      ? DEFAULT_OVERVIEW_ITEMS
      : [],
  )

  /*
   * 3. Creation Form Inputs
   */
  const [newType, setNewType] = useState<'folder' | 'link'>('folder')
  const [newName, setNewName] = useState('')
  const [newLink, setNewLink] = useState('')
  const [newFolderSiteId, setNewFolderSiteId] = useState('')
  const [newFolderLibrary, setNewFolderLibrary] = useState('')
  const [newFolderPath, setNewFolderPath] = useState('')

  /*
   * 3b. SharePoint Libraries state from GetSharePointLibraries flow
   */
  const [libraries, setLibraries] = useState<SharePointLibraryItem[]>([])
  const [loadingLibraries, setLoadingLibraries] = useState<boolean>(false)

  /*
   * 3c. SharePoint Folders state from GetSharePointFolders flow
   */
  const [folders, setFolders] = useState<string[]>([])
  const [loadingFolders, setLoadingFolders] = useState<boolean>(false)

  /*
   * 4. Notification & Editing state
   */
  const [notification, setNotification] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<ReferenceMasterDraft | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  /*
   * 4b. Editing Folder SharePoint Libraries & Folders state
   */
  const [editLibraries, setEditLibraries] = useState<SharePointLibraryItem[]>([])
  const [loadingEditLibraries, setLoadingEditLibraries] = useState<boolean>(false)
  const [editFolders, setEditFolders] = useState<string[]>([])
  const [loadingEditFolders, setLoadingEditFolders] = useState<boolean>(false)

  /*
   * 5. Delete Confirmation Modal state
   */
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false)
  const [itemToDelete, setItemToDelete] = useState<{
    id: string
    title: string
  } | null>(null)

  /*
   * 6. Reference folder items from Dataverse
   */
  const [referenceItems, setReferenceItems] = useState<Ha_refitemses[]>(
    propsReferenceItems && propsReferenceItems.length > 0 ? propsReferenceItems : [],
  )

  // Ensure we always have available site addresses, including DataSolutions if not present
  const effectiveSites: ReferenceSite[] = [
    ...sites,
    ...(sites.some(
      (s) =>
        s.name.toLowerCase().includes('datasolutions') ||
        (s.url && s.url.toLowerCase().includes('datasolutions')),
    )
      ? []
      : [
          {
            id: 'site-datasolutions-default',
            name: 'Data Solutions',
            url: 'https://conversedatasolutions.sharepoint.com/sites/DataSolutions',
          },
        ]),
  ]

  const resolveSiteUrl = (siteId: string): string => {
    const selectedSite = effectiveSites.find((s) => s.id === siteId)
    if (!selectedSite) return ''
    if (selectedSite.url && selectedSite.url.trim().length > 0) {
      let u = selectedSite.url.trim()
      if (!u.startsWith('http://') && !u.startsWith('https://')) {
        u = `https://${u}`
      }
      return u
    }
    if (selectedSite.name && selectedSite.name.trim().startsWith('http')) {
      return selectedSite.name.trim()
    }
    const cleanName = (selectedSite.name || '').trim().replace(/\s+/g, '')
    if (cleanName.length > 0) {
      return `https://conversedatasolutions.sharepoint.com/sites/${cleanName}`
    }
    return 'https://conversedatasolutions.sharepoint.com/sites/DataSolutions'
  }

  /*
   * Trigger GetSharePointLibraries flow for a given site ID
   */
  const triggerFlowForSite = async (siteId: string) => {
    if (!siteId) {
      setLibraries([])
      setLoadingLibraries(false)
      setFolders([])
      setLoadingFolders(false)
      return
    }

    const siteUrl = resolveSiteUrl(siteId)
    if (!siteUrl) {
      console.warn('[GetSharePointLibraries] No site URL resolved for site ID:', siteId)
      showNotification('Selected site does not have a valid Site URL.')
      setLibraries([])
      setLoadingLibraries(false)
      setFolders([])
      setLoadingFolders(false)
      return
    }

    console.log('[GetSharePointLibraries] Triggering flow with URL:', siteUrl)
    setLoadingLibraries(true)
    setLibraries([])
    setFolders([])
    setLoadingFolders(false)

    try {
      const payload = {
        text: siteUrl,
        SiteURL: siteUrl,
        siteUrl: siteUrl,
      }
      console.log('[GetSharePointLibraries] Sending payload:', payload)
      const result = await GetSharePointLibrariesService.Run(payload as any)
      console.log('[GetSharePointLibraries] Flow response:', result)

      if (result && !result.success) {
        const errorMsg = result.error?.message || 'Flow execution returned unsuccessful'
        console.error('[GetSharePointLibraries] Flow execution error:', errorMsg, result.error)
        showNotification(`Flow error: ${errorMsg}`)
        setLibraries([])
        return
      }

      const rawOutput = (result as any)?.data?.output ?? (result as any)?.data
      console.log('[GetSharePointLibraries] Raw flow output:', rawOutput)
      const parsed = parseLibrariesOutput(rawOutput)
      console.log('[GetSharePointLibraries] Parsed libraries:', parsed)
      setLibraries(parsed)

      if (parsed.length > 0) {
        showNotification(`Retrieved ${parsed.length} SharePoint ${parsed.length === 1 ? 'library' : 'libraries'}.`)
      } else {
        showNotification('Flow completed, but no libraries were found for this site.')
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      console.error('[GetSharePointLibraries] Exception triggering flow:', err)
      showNotification(`Failed to trigger flow: ${errorMsg}`)
      setLibraries([])
    } finally {
      setLoadingLibraries(false)
    }
  }

  /*
   * Trigger GetSharePointFolders flow for a given site and library
   */
  const triggerFoldersFlow = async (siteIdOrUrl: string, libraryIdOrName: string) => {
    if (!siteIdOrUrl || !libraryIdOrName) {
      setFolders([])
      setLoadingFolders(false)
      return
    }

    const siteUrl = resolveSiteUrl(siteIdOrUrl) || (siteIdOrUrl.startsWith('http') ? siteIdOrUrl : '')
    if (!siteUrl) {
      console.warn('[GetSharePointFolders] No site URL resolved for site:', siteIdOrUrl)
      showNotification('Selected site does not have a valid Site URL.')
      setFolders([])
      setLoadingFolders(false)
      return
    }

    const selectedLib = libraries.find(
      (l) => l.id === libraryIdOrName || l.name === libraryIdOrName,
    )
    const libId = selectedLib?.id || libraryIdOrName
    const libName = selectedLib?.name || libraryIdOrName

    console.log('[GetSharePointFolders] Triggering flow with SiteURL:', siteUrl, 'and LibID:', libId)
    setLoadingFolders(true)
    setFolders([])

    try {
      const payload = {
        text: siteUrl,
        text_1: libId,
        SiteURL: siteUrl,
        siteUrl: siteUrl,
        LibID: libId,
        libId: libId,
        LibraryId: libId,
        Library: libId,
        library: libId,
        libraryName: libName,
      }
      console.log('[GetSharePointFolders] Sending payload:', payload)
      const result = await GetSharePointFoldersService.Run(payload as any)
      console.log('[GetSharePointFolders] Flow response:', result)

      if (result && !result.success) {
        const errorMsg = result.error?.message || 'Flow execution returned unsuccessful'
        console.error('[GetSharePointFolders] Flow execution error:', errorMsg, result.error)
        showNotification(`Folders flow error: ${errorMsg}`)
        setFolders([])
        return
      }

      const rawOutput = (result as any)?.data?.output ?? (result as any)?.data
      console.log('[GetSharePointFolders] Raw folders output:', rawOutput)
      const parsed = parseFoldersOutput(rawOutput)
      console.log('[GetSharePointFolders] Parsed folders:', parsed)
      setFolders(parsed)

      if (parsed.length > 0) {
        showNotification(`Retrieved ${parsed.length} SharePoint ${parsed.length === 1 ? 'folder' : 'folders'}.`)
      } else {
        showNotification('Folders flow completed, but no folders were found in this library.')
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      console.error('[GetSharePointFolders] Exception triggering folders flow:', err)
      showNotification(`Failed to trigger folders flow: ${errorMsg}`)
      setFolders([])
    } finally {
      setLoadingFolders(false)
    }
  }

  /*
   * Site Selection Handler:
   * When user selects a Site address, reset the selected Library, Folder Path, and trigger library flow.
   */
  const handleSiteChange = (siteId: string) => {
    setNewFolderSiteId(siteId)
    setNewFolderLibrary('')
    setNewFolderPath('')
    setFolders([])
    triggerFlowForSite(siteId)
  }

  /*
   * Library Selection Handler:
   * When user selects a Library, reset the selected Folder Path and trigger GetSharePointFolders flow.
   */
  const handleLibraryChange = (libraryVal: string) => {
    setNewFolderLibrary(libraryVal)
    setNewFolderPath('')
    setFolders([])
    if (newFolderSiteId && libraryVal) {
      triggerFoldersFlow(newFolderSiteId, libraryVal)
    }
  }

  /*
   * Sync flow when newFolderSiteId changes
   */
  useEffect(() => {
    if (newFolderSiteId) {
      triggerFlowForSite(newFolderSiteId)
    } else {
      setLibraries([])
      setLoadingLibraries(false)
      setFolders([])
      setLoadingFolders(false)
    }
  }, [newFolderSiteId])

  /*
   * Load content on subcategory mount
   */
  useEffect(() => {
    const isOverview = (() => {
      const norm = (subcategory.name || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')
      return norm === 'jj' || norm === 'overviewofjj' || norm === 'overviewofjjh' || norm.includes('overviewofjj')
    })()

    const initialTitle = subcategory.name || (isOverview ? 'Overview of J&J H' : '')
    const initialDesc =
      subcategory.description !== undefined && subcategory.description !== null
        ? subcategory.description
        : isOverview
        ? 'List of contents available under Overview of J&J H'
        : ''

    setContentTitle(initialTitle)
    setContentDescription(initialDesc)

    if (subcategory.items && subcategory.items.length > 0) {
      setDrafts(
        subcategory.items.map((item) => ({
          id: item.id,
          name: item.name,
          type: item.type,
          link: item.link ?? '',
          folderName: item.folderName ?? '',
          folderParentPath: item.folderParentPath ?? '',
          folderPath: item.folderPath ?? '',
          siteId: item.siteId ?? '',
        })),
      )
    } else if (isOverview) {
      setDrafts(DEFAULT_OVERVIEW_ITEMS)
    } else {
      setDrafts([])
    }

    setNewType('folder')
    setNewName('')
    setNewLink('')
    setNewFolderSiteId('')
    setNewFolderLibrary('')
    setNewFolderPath('')
    setLibraries([])
    setLoadingLibraries(false)
    setNotification(null)
    setEditingId(null)
    setEditDraft(null)
    setExpandedFolders(new Set())
  }, [subcategory])

  /*
   * Load REF Items for expandable folders
   */
  useEffect(() => {
    if (propsReferenceItems && propsReferenceItems.length > 0) {
      setReferenceItems(propsReferenceItems)
      return
    }

    let cancelled = false

    const loadReferenceItems = async () => {
      try {
        const result = await Ha_refitemsesService.getAll()
        if (!cancelled) {
          setReferenceItems(result.data ?? [])
        }
      } catch (error) {
        console.error('REF ITEMS LOAD ERROR:', error)
        if (!cancelled) {
          setReferenceItems([])
        }
      }
    }

    void loadReferenceItems()

    return () => {
      cancelled = true
    }
  }, [propsReferenceItems])

  /*
   * Escape key to close delete modal
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showDeleteModal) {
        setShowDeleteModal(false)
        setItemToDelete(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showDeleteModal])

  /*
   * Get folder items helper from Dataverse REF Items
   */
  const getFolderItems = (folderName: string, folderId?: string | null) => {
    const countMatch = (folderName || '').match(/^(.*?)\s*\((\d+)\)$/)
    const rawClean = (countMatch ? countMatch[1] : folderName).trim()
    const cleanFolderName = rawClean.toLowerCase() === 'data pipeline' ? 'Data Pipeline' : rawClean
    const normalizedName = cleanFolderName.toLowerCase()

    let dvItems = referenceItems.filter(
      (item: any) =>
        item.statecode !== 1 &&
        Boolean(folderId) &&
        (item._ha_refmaster_value === folderId ||
          item.ha_refmaster?.ha_refmastersid === folderId),
    )

    if (dvItems.length === 0 && normalizedName) {
      dvItems = referenceItems.filter((item: any) => {
        if (item.statecode === 1) return false
        const masterObjName = (item.ha_refmaster?.ha_name || '').trim().toLowerCase()
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

    return dvItems.map((f: any) => {
      const fileType = (f.ha_filetype ?? f.ha_FileType ?? '').toString().trim()
      return {
        id: f.ha_refitemsid,
        name: f.ha_name ?? 'Document',
        size: f.ha_filesize ?? '',
        type: fileType || inferFileType(f.ha_name ?? '', f.ha_filelink ?? f.ha_filepath ?? ''),
        link: f.ha_filelink ?? f.ha_filepath ?? '',
      }
    })
  }

  const getFolderCount = (item: ReferenceMasterDraft) => {
    const items = getFolderItems(item.name, item.id)
    return items.length
  }

  const notificationTimeoutRef = useRef<number | null>(null)

  const showNotification = (message: string) => {
    if (notificationTimeoutRef.current) {
      window.clearTimeout(notificationTimeoutRef.current)
    }
    setNotification(message)
    notificationTimeoutRef.current = window.setTimeout(() => {
      setNotification(null)
      notificationTimeoutRef.current = null
    }, 5000)
  }

  const validateLinkItem = (
    title: string,
    url: string,
    ignoreId?: string,
  ): string | null => {
    const trimmedTitle = title.trim()
    const trimmedUrl = url.trim()

    if (!trimmedTitle) {
      return 'Please enter a Title.'
    }

    if (!/[a-zA-Z0-9]/.test(trimmedTitle)) {
      return 'Only special characters are not allowed.'
    }

    if (!trimmedUrl) {
      return 'Please enter a URL.'
    }

    if (!/[a-zA-Z0-9]/.test(trimmedUrl)) {
      return 'Only special characters are not allowed.'
    }

    const duplicateTitle = drafts.some(
      (item) =>
        (item.id ?? item.name) !== ignoreId &&
        item.name.trim().toLowerCase() === trimmedTitle.toLowerCase(),
    )

    const duplicateLink = drafts.some(
      (item) =>
        (item.id ?? item.name) !== ignoreId &&
        item.type === 'link' &&
        Boolean(item.link) &&
        item.link.trim().toLowerCase() === trimmedUrl.toLowerCase(),
    )

    if (duplicateTitle && duplicateLink) {
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

    if (duplicateLink) {
      return `Link "${trimmedUrl}" already exists.`
    }

    return null
  }

  /*
   * Add Item
   */
  const handleAdd = () => {
    const trimmedTitle = newName.trim()
    if (!trimmedTitle) {
      showNotification('Please enter a Title.')
      return
    }

    if (!/[a-zA-Z0-9]/.test(trimmedTitle)) {
      showNotification('Only special characters are not allowed.')
      return
    }

    if (newType === 'link') {
      const trimmedUrl = newLink.trim()
      const errorMsg = validateLinkItem(trimmedTitle, trimmedUrl)
      if (errorMsg) {
        showNotification(errorMsg)
        return
      }

      const newDraft: ReferenceMasterDraft = {
        id: `ref-link-${Date.now()}`,
        name: trimmedTitle,
        type: 'link',
        link: trimmedUrl,
        folderName: '',
        folderParentPath: '',
        folderPath: '',
        siteId: '',
      }

      setDrafts((current) => [...current, newDraft])
      setNewName('')
      setNewLink('')
      return
    }

    // Folder
    if (!newFolderSiteId) {
      showNotification('Please select a Site Address.')
      return
    }
    if (!newFolderLibrary) {
      showNotification('Please select a Library.')
      return
    }
    const duplicateFolderTitle = drafts.some(
      (item) => item.name.trim().toLowerCase() === trimmedTitle.toLowerCase(),
    )
    if (duplicateFolderTitle) {
      showNotification(`Title "${trimmedTitle}" already exists.`)
      return
    }
    const selectedLib = libraries.find(
      (l) => l.id === newFolderLibrary || l.name === newFolderLibrary,
    )
    const libraryDisplayName = selectedLib?.name || newFolderLibrary

    const matchingSite = effectiveSites.find(
      (s) =>
        s.id === newFolderSiteId ||
        (s.url && newFolderSiteId.includes(s.url)),
    )
    const effectiveSiteId = matchingSite?.id || newFolderSiteId

    const newDraft: ReferenceMasterDraft = {
      id: `ref-folder-${Date.now()}`,
      name: trimmedTitle,
      type: 'folder',
      link: '',
      folderName: libraryDisplayName.trim(),
      folderParentPath: '',
      folderPath: newFolderPath.trim(),
      siteId: effectiveSiteId,
    }

    setDrafts((current) => [...current, newDraft])
    setNewName('')
    setNewFolderSiteId('')
    setNewFolderLibrary('')
    setNewFolderPath('')
    setLibraries([])
    setFolders([])
  }

  /*
   * Trigger GetSharePointLibraries flow for editing a folder
   */
  const triggerFlowForEditSite = async (siteId: string): Promise<SharePointLibraryItem[]> => {
    if (!siteId) {
      setEditLibraries([])
      setLoadingEditLibraries(false)
      setEditFolders([])
      setLoadingEditFolders(false)
      return []
    }

    const siteUrl = resolveSiteUrl(siteId)
    if (!siteUrl) {
      setEditLibraries([])
      setLoadingEditLibraries(false)
      setEditFolders([])
      setLoadingEditFolders(false)
      return []
    }

    setLoadingEditLibraries(true)
    try {
      const payload = {
        text: siteUrl,
        SiteURL: siteUrl,
        siteUrl: siteUrl,
      }
      const result = await GetSharePointLibrariesService.Run(payload as any)
      if (result && !result.success) {
        setEditLibraries([])
        return []
      }
      const rawOutput = (result as any)?.data?.output ?? (result as any)?.data
      const parsed = parseLibrariesOutput(rawOutput)
      setEditLibraries(parsed)
      return parsed
    } catch {
      setEditLibraries([])
      return []
    } finally {
      setLoadingEditLibraries(false)
    }
  }

  /*
   * Trigger GetSharePointFolders flow for editing a folder
   */
  const triggerFoldersFlowForEdit = async (
    siteIdOrUrl: string,
    libraryIdOrName: string,
    availableLibs: SharePointLibraryItem[] = [],
  ): Promise<string[]> => {
    if (!siteIdOrUrl || !libraryIdOrName) {
      setEditFolders([])
      setLoadingEditFolders(false)
      return []
    }

    const siteUrl = resolveSiteUrl(siteIdOrUrl) || (siteIdOrUrl.startsWith('http') ? siteIdOrUrl : '')
    if (!siteUrl) {
      setEditFolders([])
      setLoadingEditFolders(false)
      return []
    }

    const libList = availableLibs.length > 0 ? availableLibs : editLibraries
    const selectedLib = libList.find(
      (l) => l.id === libraryIdOrName || l.name === libraryIdOrName,
    )
    const libId = selectedLib?.id || libraryIdOrName
    const libName = selectedLib?.name || libraryIdOrName

    setLoadingEditFolders(true)
    try {
      const payload = {
        text: siteUrl,
        text_1: libId,
        SiteURL: siteUrl,
        siteUrl: siteUrl,
        LibID: libId,
        libId: libId,
        LibraryId: libId,
        Library: libId,
        library: libId,
        libraryName: libName,
      }
      const result = await GetSharePointFoldersService.Run(payload as any)
      if (result && !result.success) {
        setEditFolders([])
        return []
      }
      const rawOutput = (result as any)?.data?.output ?? (result as any)?.data
      const parsed = parseFoldersOutput(rawOutput)
      setEditFolders(parsed)
      return parsed
    } catch {
      setEditFolders([])
      return []
    } finally {
      setLoadingEditFolders(false)
    }
  }

  const handleEditSiteChange = async (siteId: string) => {
    setEditDraft((cur) => (cur ? { ...cur, siteId, folderName: '', folderPath: '' } : cur))
    setEditFolders([])
    if (siteId) {
      await triggerFlowForEditSite(siteId)
    } else {
      setEditLibraries([])
    }
  }

  const handleEditLibraryChange = async (libraryVal: string) => {
    setEditDraft((cur) => (cur ? { ...cur, folderName: libraryVal, folderPath: '' } : cur))
    setEditFolders([])
    if (editDraft?.siteId && libraryVal) {
      await triggerFoldersFlowForEdit(editDraft.siteId, libraryVal, editLibraries)
    }
  }

  const handleEditFolderChange = (folderPathVal: string) => {
    setEditDraft((cur) => (cur ? { ...cur, folderPath: folderPathVal } : cur))
  }

  /*
   * Edit Item
   */
  const handleStartEdit = async (item: ReferenceMasterDraft, index: number) => {
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    setEditingId(item.id ?? `draft-${index}`)
    setEditDraft({ ...item })

    if (item.type === 'folder') {
      const currentSite = item.siteId || ''
      const currentLib = item.folderName || ''
      if (currentSite) {
        const loadedLibs = await triggerFlowForEditSite(currentSite)
        if (currentLib) {
          await triggerFoldersFlowForEdit(currentSite, currentLib, loadedLibs)
        } else {
          setEditFolders([])
        }
      } else {
        setEditLibraries([])
        setEditFolders([])
      }
    }
  }

  const handleCancelEdit = () => {
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    setEditingId(null)
    setEditDraft(null)
    setEditLibraries([])
    setEditFolders([])
    setLoadingEditLibraries(false)
    setLoadingEditFolders(false)
  }

  const handleSaveEdit = () => {
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    if (!editDraft) return
    const trimmedTitle = editDraft.name.trim()
    const currentId = editDraft.id ?? editDraft.name

    if (editDraft.type === 'link') {
      const trimmedUrl = (editDraft.link || '').trim()
      const errorMsg = validateLinkItem(trimmedTitle, trimmedUrl, currentId)
      if (errorMsg) {
        showNotification(errorMsg)
        return
      }
    } else {
      if (!trimmedTitle) {
        showNotification('Please enter a Title.')
        return
      }
      if (!/[a-zA-Z0-9]/.test(trimmedTitle)) {
        showNotification('Only special characters are not allowed.')
        return
      }
      const duplicateTitle = drafts.some(
        (item) =>
          (item.id ?? item.name) !== currentId &&
          item.name.trim().toLowerCase() === trimmedTitle.toLowerCase(),
      )
      if (duplicateTitle) {
        showNotification(`Title "${trimmedTitle}" already exists.`)
        return
      }
    }

    const selectedLib = editLibraries.find(
      (l) => l.id === editDraft.folderName || l.name === editDraft.folderName,
    )
    const libraryDisplayName = selectedLib?.name || editDraft.folderName || ''

    setDrafts((current) =>
      current.map((item) =>
        (item.id ?? item.name) === currentId
          ? {
              ...editDraft,
              name: trimmedTitle,
              link: editDraft.type === 'link' ? editDraft.link.trim() : '',
              folderName: editDraft.type === 'folder' ? libraryDisplayName.trim() : '',
              folderPath: editDraft.type === 'folder' ? (editDraft.folderPath || '').trim() : '',
              siteId: editDraft.type === 'folder' ? (editDraft.siteId || '').trim() : '',
            }
          : item,
      ),
    )

    setEditingId(null)
    setEditDraft(null)
    setEditLibraries([])
    setEditFolders([])
    setLoadingEditLibraries(false)
    setLoadingEditFolders(false)
  }

  /*
   * Delete Item
   */
  const handleRequestDelete = (item: ReferenceMasterDraft) => {
    setItemToDelete({
      id: item.id ?? item.name,
      title: item.name,
    })
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = () => {
    if (!itemToDelete) return
    setDrafts((current) =>
      current.filter((item) => (item.id ?? item.name) !== itemToDelete.id),
    )
    if (editingId === itemToDelete.id) {
      setEditingId(null)
      setEditDraft(null)
    }
    setShowDeleteModal(false)
    setItemToDelete(null)
  }

  const handleCancelDelete = () => {
    setShowDeleteModal(false)
    setItemToDelete(null)
  }

  /*
   * Move Item
   */
  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= drafts.length) return

    setDrafts((current) => {
      const updated = [...current]
      const temp = updated[index]
      updated[index] = updated[targetIndex]
      updated[targetIndex] = temp
      return updated
    })
  }

  /*
   * Folder Expand / Collapse
   */
  const toggleFolder = (key: string) => {
    setExpandedFolders((current) => {
      const next = new Set(current)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  /*
   * Save Changes
   */
  const handleSave = async () => {
    if (saving) return

    if (contentTitle.trim() && !/[a-zA-Z0-9]/.test(contentTitle.trim())) {
      showNotification('Only special characters are not allowed.')
      return
    }

    if (contentDescription.trim() && !/[a-zA-Z0-9]/.test(contentDescription.trim())) {
      showNotification('Only special characters are not allowed.')
      return
    }

    const specialOnlyDraft = drafts.find((d) => d.name.trim() && !/[a-zA-Z0-9]/.test(d.name.trim()))
    if (specialOnlyDraft) {
      showNotification('Only special characters are not allowed.')
      return
    }

    try {
      await onSave(drafts, {
        title: contentTitle.trim() || subcategory.name || '',
        description: contentDescription.trim() || subcategory.description || '',
      })
    } catch (error) {
      console.error('REFERENCE MANAGE SAVE ERROR:', error)
      showNotification(
        error instanceof Error ? error.message : 'Unable to save references.',
      )
    }
  }

  return (
    <section className="right-content-panel pane reference-manage-content">
      {notification && (
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
            <span className="toast-message" style={{ color: '#ffffff' }}>{notification}</span>
          </div>
        </div>
      )}

      {/* =================================================
          1. PANEL HEADER & ACTION CONTROLS
          ================================================= */}
      <div className="ref-manage-header">
        <h2 className="ref-manage-title">Manage Content</h2>

        <div className="ref-manage-header-actions">
          <button
            type="button"
            className="ref-manage-cancel-btn"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="button"
            className="ref-manage-save-btn"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* =================================================
          2. TITLE & DESCRIPTION FORM FIELDS
          ================================================= */}
      <div className="ref-manage-fields-section">
        <div className="ref-manage-field-group">
          <label htmlFor="ref-manage-title-input" className="ref-manage-label">
            Title
          </label>
          <input
            id="ref-manage-title-input"
            type="text"
            className="ref-manage-input-title"
            value={contentTitle}
            onChange={(e) => setContentTitle(e.target.value)}
            disabled={saving}
            placeholder={contentTitle || subcategory.name || 'Title'}
          />
        </div>

        <div className="ref-manage-field-group">
          <label htmlFor="ref-manage-desc-input" className="ref-manage-label">
            Description
          </label>
          <textarea
            id="ref-manage-desc-input"
            className="ref-manage-textarea-desc"
            value={contentDescription}
            onChange={(e) => setContentDescription(e.target.value)}
            disabled={saving}
            placeholder={
              contentDescription ||
              subcategory.description ||
              (contentTitle ? `List of contents available under ${contentTitle}` : 'Description')
            }
            rows={3}
          />
        </div>
      </div>

      {/* =================================================
          3. "RESOURCES (X)" HEADER & MULTI-FIELD CREATION BAR
          ================================================= */}
      <div className="ref-manage-resources-section">
        <h3 className="ref-manage-resources-heading">
          Resources ({drafts.length})
        </h3>

        <div className="ref-manage-creation-row">
          {/* 1. Type Dropdown */}
          <select
            className="ref-manage-type-select"
            value={newType}
            onChange={(e) => setNewType(e.target.value as 'folder' | 'link')}
            disabled={saving}
            aria-label="Resource Type"
          >
            <option value="folder">Add New Folder</option>
            <option value="link">Add New Link</option>
          </select>

          {/* 2. Title Input */}
          <input
            type="text"
            className="ref-manage-creation-title"
            placeholder="Add Title"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            disabled={saving}
            aria-label="Title"
          />

          {newType === 'link' ? (
            /* Link URL input */
            <input
              type="text"
              className="ref-manage-link-url-input"
              placeholder="Add URL"
              value={newLink}
              onChange={(e) => setNewLink(e.target.value)}
              disabled={saving}
              aria-label="URL"
            />
          ) : (
            <>
              {/* 3. Site Address Dropdown */}
              <select
                className={`ref-manage-site-select ${newFolderSiteId ? 'has-value' : 'is-placeholder'}`}
                value={newFolderSiteId}
                onChange={(e) => handleSiteChange(e.target.value)}
                disabled={saving}
                aria-label="Site Address"
              >
                <option value="" disabled hidden>
                  Site Address
                </option>
                {effectiveSites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>

              {/* 4. Library Dropdown */}
              <select
                className={`ref-manage-library-select ${newFolderLibrary ? 'has-value' : 'is-placeholder'}`}
                value={newFolderLibrary}
                onChange={(e) => handleLibraryChange(e.target.value)}
                disabled={saving || loadingLibraries || !newFolderSiteId}
                aria-label="Library"
              >
                <option value="" disabled hidden>
                  {loadingLibraries
                    ? 'Loading libraries...'
                    : !newFolderSiteId
                    ? 'Library'
                    : libraries.length === 0
                    ? 'No libraries found'
                    : 'Library'}
                </option>
                {newFolderLibrary && !libraries.some((l) => l.id === newFolderLibrary || l.name === newFolderLibrary) && (
                  <option value={newFolderLibrary}>{newFolderLibrary}</option>
                )}
                {libraries.map((lib) => (
                  <option key={lib.id || lib.name} value={lib.id || lib.name}>
                    {lib.name}
                  </option>
                ))}
              </select>

              {/* 5. Folder Path Dropdown */}
              <select
                className={`ref-manage-folderpath-select ${newFolderPath ? 'has-value' : 'is-placeholder'}`}
                value={newFolderPath}
                onChange={(e) => setNewFolderPath(e.target.value)}
                disabled={saving || loadingFolders || !newFolderLibrary}
                aria-label="Folder Path"
              >
                <option value="" disabled hidden>
                  {loadingFolders
                    ? 'Loading folders...'
                    : !newFolderLibrary
                    ? 'Folder Path'
                    : folders.length === 0
                    ? 'No folders found'
                    : 'Folder Path'}
                </option>
                {newFolderLibrary && !loadingFolders && (
                  <option value="/">/ (Root Folder)</option>
                )}
                {newFolderPath && newFolderPath !== '/' && !folders.includes(newFolderPath) && (
                  <option value={newFolderPath}>{newFolderPath}</option>
                )}
                {folders.map((folder) => (
                  <option key={folder} value={folder}>
                    {folder}
                  </option>
                ))}
              </select>
            </>
          )}

          {/* 6. "Add" Button */}
          {(() => {
            const isAddDisabled = saving || (
              newType === 'link'
                ? !newName.trim() || !newLink.trim()
                : !newName.trim() || !newFolderSiteId.trim() || !newFolderLibrary.trim() || !newFolderPath.trim()
            )
            return (
              <button
                type="button"
                className="ref-manage-add-btn"
                onClick={handleAdd}
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
            )
          })()}
        </div>


        {/* =================================================
            4. MANAGEABLE RESOURCES ITEM CARDS LIST
            ================================================= */}
        <div className="ref-manage-cards-list">
          {drafts.length === 0 ? (
            <div className="reference-manage-empty" style={{ color: '#312c2a' }}>
              No resources available.
            </div>
          ) : (
            drafts.map((item, index) => {
              const isFolder = item.type === 'folder'
              const itemKey = item.id ?? `draft-${index}`
              const isEditing = editingId === itemKey
              const isExpanded = expandedFolders.has(itemKey)
              const folderCount = getFolderCount(item)

              /* Inline Edit Mode */
              if (isEditing) {
                return (
                  <div key={itemKey} className="ref-manage-card-wrapper">
                    <div className="ref-manage-card-row ref-manage-card-editing">
                      <div className="ref-manage-edit-inputs">
                        {/* 1. Title Input */}
                        <input
                          type="text"
                          className="ref-manage-edit-title-input"
                          value={editDraft?.name ?? ''}
                          onChange={(e) =>
                            setEditDraft((cur) =>
                              cur ? { ...cur, name: e.target.value } : cur,
                            )
                          }
                          placeholder={editDraft?.type === 'folder' ? 'Title' : 'Resource Title'}
                          autoFocus
                          aria-label="Title"
                        />

                        {editDraft?.type === 'link' ? (
                          /* Link URL input */
                          <input
                            type="text"
                            className="ref-manage-edit-link-input"
                            value={editDraft.link}
                            onChange={(e) =>
                              setEditDraft((cur) =>
                                cur ? { ...cur, link: e.target.value } : cur,
                              )
                            }
                            placeholder="URL (https://...)"
                            aria-label="URL"
                          />
                        ) : (
                          <>
                            {/* 2. Site Address Dropdown */}
                            <select
                              className={`ref-manage-edit-site-select ${editDraft?.siteId ? 'has-value' : 'is-placeholder'}`}
                              value={editDraft?.siteId ?? ''}
                              onChange={(e) => handleEditSiteChange(e.target.value)}
                              disabled={saving}
                              aria-label="Site Address"
                            >
                              <option value="" disabled hidden>
                                Site Address
                              </option>
                              {effectiveSites.map((site) => (
                                <option key={site.id} value={site.id}>
                                  {site.name}
                                </option>
                              ))}
                            </select>

                            {/* 3. Library Dropdown */}
                            <select
                              className={`ref-manage-edit-library-select ${editDraft?.folderName ? 'has-value' : 'is-placeholder'}`}
                              value={editDraft?.folderName ?? ''}
                              onChange={(e) => handleEditLibraryChange(e.target.value)}
                              disabled={saving || loadingEditLibraries || !editDraft?.siteId}
                              aria-label="Library"
                            >
                              <option value="" disabled hidden>
                                {loadingEditLibraries
                                  ? 'Loading libraries...'
                                  : !editDraft?.siteId
                                  ? 'Library'
                                  : editLibraries.length === 0
                                  ? 'No libraries found'
                                  : 'Library'}
                              </option>
                              {editDraft?.folderName &&
                                !editLibraries.some(
                                  (l) => l.id === editDraft.folderName || l.name === editDraft.folderName,
                                ) && (
                                  <option value={editDraft.folderName}>{editDraft.folderName}</option>
                                )}
                              {editLibraries.map((lib) => (
                                <option key={lib.id || lib.name} value={lib.id || lib.name}>
                                  {lib.name}
                                </option>
                              ))}
                            </select>

                            {/* 4. Folder Path Dropdown */}
                            <select
                              className={`ref-manage-edit-folderpath-select ${editDraft?.folderPath ? 'has-value' : 'is-placeholder'}`}
                              value={editDraft?.folderPath ?? ''}
                              onChange={(e) => handleEditFolderChange(e.target.value)}
                              disabled={saving || loadingEditFolders || !editDraft?.folderName}
                              aria-label="Folder Path"
                            >
                              <option value="" disabled hidden>
                                {loadingEditFolders
                                  ? 'Loading folders...'
                                  : !editDraft?.folderName
                                  ? 'Folder Path'
                                  : editFolders.length === 0
                                  ? 'No folders found'
                                  : 'Folder Path'}
                              </option>
                              {editDraft?.folderName && !loadingEditFolders && (
                                <option value="/">/ (Root Folder)</option>
                              )}
                              {editDraft?.folderPath &&
                                editDraft.folderPath !== '/' &&
                                !editFolders.includes(editDraft.folderPath) && (
                                  <option value={editDraft.folderPath}>{editDraft.folderPath}</option>
                                )}
                              {editFolders.map((folder) => (
                                <option key={folder} value={folder}>
                                  {folder}
                                </option>
                              ))}
                            </select>
                          </>
                        )}
                      </div>

                      <div className="ref-manage-edit-btns">
                        <button
                          key={`ref-manage-edit-save-btn-${itemKey}`}
                          type="button"
                          className="ref-manage-edit-save-btn"
                          onClick={(e) => {
                            (e.currentTarget as HTMLElement)?.blur()
                            handleSaveEdit()
                          }}
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
                          key={`ref-manage-edit-cancel-btn-${itemKey}`}
                          type="button"
                          className="ref-manage-edit-cancel-btn"
                          onClick={(e) => {
                            (e.currentTarget as HTMLElement)?.blur()
                            handleCancelEdit()
                          }}
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

              /* Normal Card Row */
              const countMatch = item.name.match(/^(.*?)\s*\((\d+)\)$/)
              const rawBaseName = (countMatch ? countMatch[1] : item.name).trim()
              const baseItemName = rawBaseName.toLowerCase() === 'data pipeline' ? 'Data Pipeline' : rawBaseName
              const effectiveFolderCount = countMatch ? Number(countMatch[2]) : folderCount

              return (
                <div key={itemKey} className="ref-manage-card-wrapper">
                  <div
                    className="ref-manage-card-row"
                    onClick={isFolder ? () => toggleFolder(itemKey) : undefined}
                    style={isFolder ? { cursor: 'pointer' } : undefined}
                  >
                    {/* Left Slot (Icon + Name + Counter) */}
                    <div className="ref-card-left">
                      {isFolder ? <FolderCategoryIcon /> : <QuickLinkChildIcon />}
                      <span className="ref-card-label" style={{ color: '#312c2a' }}>
                        {baseItemName}{isFolder && (
                          <>{' '}<span className="ref-card-count" style={{ color: '#eb1700' }}>({effectiveFolderCount})</span></>
                        )}
                      </span>
                    </div>

                    {/* Right Slot (Navigation Arrow + Action Toolbar) */}
                    <div
                      className="ref-card-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Expand Chevron / Arrow (>) - Folders only */}
                      {isFolder && (
                        <button
                          key={`ref-card-chevron-btn-${itemKey}`}
                          type="button"
                          className="ref-card-action-btn ref-card-chevron-btn"
                          onClick={() => toggleFolder(itemKey)}
                          title={isExpanded ? 'Collapse' : 'Expand'}
                          aria-label={isExpanded ? `Collapse ${item.name}` : `Expand ${item.name}`}
                        >
                          <ExpandChevronIcon isExpanded={isExpanded} />
                        </button>
                      )}

                      {/* Edit Pencil */}
                      <button
                        key={`ref-card-edit-btn-${itemKey}`}
                        type="button"
                        className="ref-card-action-btn ref-card-edit-btn"
                        onClick={(e) => {
                          (e.currentTarget as HTMLElement)?.blur()
                          handleStartEdit(item, index)
                        }}
                        title="Edit"
                        aria-label={`Edit ${item.name}`}
                        disabled={saving}
                      >
                        <PencilActionIcon />
                      </button>

                      {/* Move Up Arrow */}
                      <button
                        key={`ref-card-up-btn-${itemKey}`}
                        type="button"
                        className="ref-card-action-btn ref-card-up-btn"
                        onClick={() => handleMove(index, 'up')}
                        disabled={saving || index === 0}
                        title="Move Up"
                        aria-label={`Move ${item.name} up`}
                      >
                        <ArrowUpActionIcon disabled={index === 0} />
                      </button>

                      {/* Move Down Arrow */}
                      <button
                        key={`ref-card-down-btn-${itemKey}`}
                        type="button"
                        className="ref-card-action-btn ref-card-down-btn"
                        onClick={() => handleMove(index, 'down')}
                        disabled={saving || index === drafts.length - 1}
                        title="Move Down"
                        aria-label={`Move ${item.name} down`}
                      >
                        <ArrowDownActionIcon disabled={index === drafts.length - 1} />
                      </button>

                      {/* Delete Trash Bin */}
                      <button
                        key={`ref-card-trash-btn-${itemKey}`}
                        type="button"
                        className="ref-card-action-btn ref-card-trash-btn"
                        onClick={() => handleRequestDelete(item)}
                        disabled={saving}
                        title="Delete"
                        aria-label={`Delete ${item.name}`}
                      >
                        <TrashActionIcon />
                      </button>
                    </div>
                  </div>

                  {/* Expandable Folder Sub-items */}
                  {isFolder && isExpanded && (
                    <div className="ref-manage-folder-subitems">
                      {getFolderItems(baseItemName, item.id).length === 0 ? (
                        <div className="ref-folder-subitem-empty" style={{ color: '#312c2a' }}>
                          No items available.
                        </div>
                      ) : (
                        getFolderItems(baseItemName, item.id).map((file) => (
                          <div key={file.id} className="ref-folder-subitem-row">
                            <div className="ref-folder-subitem-left">
                              <FileSubIcon />
                              <span className="doc-name file-name child-file-title" style={{ color: '#312c2a', fontSize: '12px', fontWeight: 400 }}>{file.name}</span>
                            </div>
                            <div className="ref-folder-subitem-right">
                              {file.size && (
                                <span className="ref-folder-subitem-size doc-size file-size meta-item" style={{ color: '#6e6259', fontSize: '12px', fontWeight: 400 }}>
                                  {file.size}
                                </span>
                              )}
                              {file.type && (
                                <span className="ref-folder-subitem-type doc-type file-type meta-item" style={{ color: '#6e6259', fontSize: '12px', fontWeight: 400 }}>
                                  {file.type}
                                </span>
                              )}
                              {file.link && (
                                <a
                                  href={file.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ref-folder-subitem-link"
                                >
                                  <ExternalSubLinkIcon />
                                </a>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* =================================================
          DELETE CONFIRMATION MODAL
          ================================================= */}
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
              Delete resource?
            </h3>
            <p className="modal-description" style={{ color: '#6e6259' }}>
              <span className="modal-item-highlight" style={{ color: '#6e6259' }}>{itemToDelete.title}</span> will be removed from {contentTitle || subcategory.name || 'this category'}.
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

export default ReferenceManageContent
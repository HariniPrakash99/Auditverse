import { useState } from 'react'
import { sidebarData } from '../data/sidebarData'
import type { SidebarNodeData } from '../data/sidebarData'
import SidebarNode from './SidebarNode'
import type { QuickLinkCategory } from '../hooks/useQuickLinks'

interface SidebarProps {
  selectedItem: string
  onSelectItem: (item: string) => void
  quickLinkCategories?: string[]
  referenceCategories?: string[]
  categoryItems?: Record<string, string[]>
  quickLinkData?: QuickLinkCategory[]
  onManageSection?: (sectionId: string) => void
  onManageCategory?: (
    section: 'quickLinks' | 'references',
    categoryId: string,
    categoryLabel: string,
  ) => void
}

function Sidebar({
  selectedItem,
  onSelectItem,
  quickLinkCategories = [],
  referenceCategories = [],
  categoryItems = {},
  quickLinkData = [],
  onManageSection,
  onManageCategory,
}: SidebarProps) {
  /*
   * Clean hierarchy:
   * QUICK LINKS (expanded ⌃)
   *   - Resource Links (expanded ⌃)
   *   - Auditor Internal Links (collapsed ⌄)
   *   - Auditor External Link (collapsed ⌄)
   * REFERENCES (expanded ⌃)
   *   - GA&A (expanded ⌃)
   *   - Training (collapsed ⌄)
   *   - Access (collapsed ⌄)
   */
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    () => new Set(['quick-links', 'resource-links', 'references', 'gaa']),
  )

  const toggleNode = (id: string) => {
    setExpandedNodes((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectNode = (node: SidebarNodeData) => {
    onSelectItem(node.id)
  }

  const applyCategoryChildren = (node: SidebarNodeData): SidebarNodeData => {
    const labels = categoryItems[node.id]

    if (!labels) {
      return {
        ...node,
        children: node.children?.map(applyCategoryChildren),
      }
    }

    const nextChildren = labels.map((label) => {
      const existingChild = node.children?.find((child) => child.label === label)

      if (existingChild) {
        if (node.id !== 'references') {
          const normLabel = label.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
          const dataverseSubcategory = quickLinkData
            .flatMap((category) => category.subcategories)
            .find(
              (subcategory) =>
                subcategory.name.trim().toLowerCase() === label.trim().toLowerCase() ||
                subcategory.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === normLabel,
            )

          if (dataverseSubcategory) {
            return {
              ...existingChild,
              id: dataverseSubcategory.id,
              label: dataverseSubcategory.name,
              type: 'item' as const,
            }
          }
        }
        return existingChild
      }

      if (node.id !== 'references') {
        const normLabel = label.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
        const dataverseSubcategory = quickLinkData
          .flatMap((category) => category.subcategories)
          .find(
            (subcategory) =>
              subcategory.name.trim().toLowerCase() === label.trim().toLowerCase() ||
              subcategory.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === normLabel,
          )

        if (dataverseSubcategory) {
          return {
            id: dataverseSubcategory.id,
            label: dataverseSubcategory.name,
            type: 'item' as const,
          }
        }
      }

      return {
        id: `${node.id}-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        label,
        type: 'item' as const,
      }
    })

    return {
      ...node,
      children: nextChildren.map(applyCategoryChildren),
    }
  }

  const nodes = sidebarData.map((node) => {
    if (node.id === 'quick-links') {
      const staticCategories = node.children ?? []
      return {
        ...node,
        children: quickLinkCategories.map((label, index) => {
          const staticCategory = staticCategories[index]
          if (!staticCategory) {
            const dynamicId = `quick-links-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
            return applyCategoryChildren({
              id: dynamicId,
              label,
              type: 'category' as const,
              children: [],
            })
          }
          return applyCategoryChildren({
            ...staticCategory,
            label,
          })
        }),
      }
    }

    if (node.id === 'references') {
      const staticCategories = node.children ?? []
      return {
        ...node,
        children: referenceCategories.map((label, index) => {
          const staticCategory = staticCategories[index]
          if (!staticCategory) {
            const dynamicId = `references-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
            return applyCategoryChildren({
              id: dynamicId,
              label,
              type: 'category' as const,
              children: [],
            })
          }
          return applyCategoryChildren({
            ...staticCategory,
            label,
          })
        }),
      }
    }

    return node
  })

  return (
    <nav className="section-nav sidebar-card-container">
      <div className="sidebar-tree">
        {nodes.map((node, index) => (
          <div key={node.id} className="sidebar-section-wrapper">
            {index > 0 && <div className="sidebar-divider" />}
            <SidebarNode
              node={node}
              depth={0}
              isReferenceSection={node.id === 'references'}
              expandedNodes={expandedNodes}
              selectedNode={selectedItem}
              onToggle={toggleNode}
              onSelect={selectNode}
              onManageSection={onManageSection}
              onManageCategory={onManageCategory}
            />
          </div>
        ))}
      </div>
    </nav>
  )
}

export default Sidebar

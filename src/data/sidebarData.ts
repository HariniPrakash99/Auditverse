export type SidebarNodeType = 'heading' | 'category' | 'item'

export interface SidebarNodeData {
  id: string
  label: string
  type: SidebarNodeType
  children?: SidebarNodeData[]
}

export const quickLinkCategories = ['Resource Links', 'Auditor Internal Links', 'Auditor External Link']
export const referenceCategories = ['GA&A', 'Training', 'Access']

export const sidebarData: SidebarNodeData[] = [
  {
    id: 'quick-links', label: 'QUICK LINKS', type: 'heading', children: [
      { id: 'resource-links', label: 'Resource Links', type: 'category', children: [
        { id: 'jj', label: 'J&J', type: 'item' }, { id: 'it', label: 'IT', type: 'item' }, { id: 'gaa-systems', label: 'GA&A Systems', type: 'item' }, { id: 'travel-expenses', label: 'Travel & Expenses', type: 'item' }, { id: 'digital-assets', label: 'Digital Assets', type: 'item' }, { id: 'training-links', label: 'Training', type: 'item' },
      ] },
      { id: 'auditor-internal', label: 'Auditor Internal Links', type: 'category', children: [{ id: 'internal-cai', label: 'CA&I', type: 'item' }, { id: 'internal-rbr', label: 'RBR', type: 'item' }, { id: 'internal-sox', label: 'SOX', type: 'item' }] },
      { id: 'auditor-external', label: 'Auditor External Link', type: 'category', children: [{ id: 'external-cai', label: 'CA&I', type: 'item' }, { id: 'external-rbr', label: 'RBR', type: 'item' }, { id: 'external-sox', label: 'SOX', type: 'item' }] },
    ],
  },
  {
    id: 'references', label: 'REFERENCES', type: 'heading', children: [
      { id: 'gaa', label: 'GA&A', type: 'category', children: [{ id: 'overview-jj', label: 'Overview of J&J', type: 'item' }, { id: 'goals-objectives', label: 'Goals & Objectives', type: 'item' }, { id: 'travel-guidance', label: 'Travel Guidance', type: 'item' }, { id: 'template', label: 'Template', type: 'item' }] },
      { id: 'reference-training', label: 'Training', type: 'category', children: [{ id: 'general-education-ways-of-working', label: 'General Education - Ways of Working', type: 'item' }, { id: 'new-role-hire-onboarding', label: 'New Role/Hire - Onboarding', type: 'item' }, { id: 'new-role-hire-buddy-program', label: 'New Role/Hire - Buddy Program', type: 'item' }, { id: 'new-role-hire-talent-management', label: 'New Role/Hire - Talent Management', type: 'item' }] },
      { id: 'access', label: 'Access', type: 'category', children: [{ id: 'systems-i-sight', label: 'Systems - i-Sight', type: 'item' }, { id: 'systems-mbox', label: 'Systems - MBox', type: 'item' }, { id: 'systems-teammate-plus', label: 'Systems - Teammate+', type: 'item' }, { id: 'systems-tempus', label: 'Systems - Tempus', type: 'item' }, { id: 'ad-groups', label: 'AD Groups', type: 'item' }] },
    ],
  },
]
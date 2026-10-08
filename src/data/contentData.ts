export interface ResourceItem {
  id: string
  name: string
  type: 'link' | 'folder'
  count?: number
  url?: string
}

export interface ContentItem {
  id: string
  title: string
  description?: string
  section: 'quickLinks' | 'references'
  breadcrumb: string[]
  resources: ResourceItem[]
}

const quickLinks = (id: string, title: string, resources: string[], category: string): ContentItem => ({
  id,
  title,
  section: 'quickLinks',
  breadcrumb: ['Quick Links', category, title],
  description: id === 'jj' ? 'List of Resource Links under J&J' : `List of ${category} under ${title}`,
  resources: resources.map((name, index) => ({ id: `${id}-resource-${index}`, name, type: 'link' })),
})

const referenceDescriptions: Record<string, string> = {
  'overview-jj': 'Function overview covering the operating model, the business units in scope and how audit coverage is allocated across them.',
  'goals-objectives': 'The objectives set for the function this year, the measures used to track them and the reporting cadence to the Audit Committee.',
  'travel-guidance': 'Booking, approval and expense guidance for audit travel, including per diem rates and the escalation path for exceptions.',
  template: 'The standard template set used across engagements: planning memos, test sheets, issue write-ups and report shells.',
  'ways-of-working': 'How the function operates day to day: meeting cadence, collaboration norms and the tools used at each stage of an engagement.',
  onboarding: 'First ninety days for new joiners, with the required training, system access requests and check-in milestones.',
  'buddy-program': 'How buddies are paired with new joiners, what the buddy covers in the first weeks and the expected time commitment.',
  'talent-management': 'Goal setting, review cycles and development planning for auditors in their first year in the function.',
  'i-sight': 'Access request steps, role definitions and support contacts for i-Sight case management.',
  mbox: 'Access request steps and folder permission model for MBox document storage.',
  'teammate-plus': 'Licence types, request process and training prerequisites for Teammate+ engagement management.',
  tempus: 'Access request steps and time reporting guidance for Tempus.',
  'ad-groups': 'The Active Directory groups used across GA&A and systems, what each grants and who approves membership.',
}

const reference = (id: string, title: string, category: string): ContentItem => ({
  id,
  title,
  section: 'references',
  breadcrumb: ['References', category, title],
  description: referenceDescriptions[id],
  resources: [
    { id: `${id}-folder-1`, name: 'SharePoint Folder 1', type: 'folder', count: 4 },
    { id: `${id}-folder-2`, name: 'SharePoint Folder 2', type: 'folder', count: 2 },
    { id: `${id}-link-1`, name: 'Link 1', type: 'link' },
    { id: `${id}-link-2`, name: 'Link 2', type: 'link' },
  ],
})

export const contentById: Record<string, ContentItem> = {
  jj: quickLinks('jj', 'J&J', ['J&J Home', 'Ask GS', 'Viva Engage (formerly Yammer)', 'Workday', 'CREDO Hotline'], 'Resource Links'),
  it: quickLinks('it', 'IT', ['Service Desk', 'Software Catalogue', 'Access Request Portal', 'Security Advisories'], 'Resource Links'),
  'gaa-systems': quickLinks('gaa-systems', 'GA&A Systems', ['ARMS', 'Analytics Workbench', 'Finding Register', 'Engagement Calendar'], 'Resource Links'),
  'travel-expenses': quickLinks('travel-expenses', 'Travel & Expenses', ['Concur', 'Travel Policy', 'Per Diem Rates', 'Corporate Card Support'], 'Resource Links'),
  'digital-assets': quickLinks('digital-assets', 'Digital Assets', ['Dashboard Catalogue', 'Test Script Library', 'RPA Inventory', 'Model Register'], 'Resource Links'),
  'training-links': quickLinks('training-links', 'Training', ['Learning Portal', 'CPE Tracker', 'Methodology Curriculum', 'Certification Support'], 'Resource Links'),
  'internal-cai': quickLinks('internal-cai', 'CA&I', ['CA&I Methodology', 'Engagement Planning', 'Issue Tracker'], 'Auditor Internal Links'),
  'internal-rbr': quickLinks('internal-rbr', 'RBR', ['RBR Playbook', 'Risk Assessment Templates', 'Review Calendar'], 'Auditor Internal Links'),
  'internal-sox': quickLinks('internal-sox', 'SOX', ['SOX Testing Guide', 'Control Matrix', 'Deficiency Log'], 'Auditor Internal Links'),
  'external-cai': quickLinks('external-cai', 'CA&I', ['IIA Standards', 'External Guidance Library'], 'Auditor External Link'),
  'external-rbr': quickLinks('external-rbr', 'RBR', ['Regulatory Bulletins', 'Industry Risk Reports'], 'Auditor External Link'),
  'external-sox': quickLinks('external-sox', 'SOX', ['PCAOB Guidance', 'SEC Filings Portal'], 'Auditor External Link'),
  'overview-jj': reference('overview-jj', 'Overview of J&J', 'GA&A'),
  'goals-objectives': reference('goals-objectives', 'Goals & Objectives', 'GA&A'),
  'travel-guidance': reference('travel-guidance', 'Travel Guidance', 'GA&A'),
  template: reference('template', 'Template', 'GA&A'),
  'ways-of-working': reference('ways-of-working', 'Ways of Working', 'Training / General Education'),
  onboarding: reference('onboarding', 'Onboarding', 'Training / New Role/Hire'),
  'buddy-program': reference('buddy-program', 'Buddy Program', 'Training / New Role/Hire'),
  'talent-management': reference('talent-management', 'Talent Management', 'Training / New Role/Hire'),
  'i-sight': reference('i-sight', 'i-Sight', 'Access / Systems'),
  mbox: reference('mbox', 'MBox', 'Access / Systems'),
  'teammate-plus': reference('teammate-plus', 'Teammate+', 'Access / Systems'),
  tempus: reference('tempus', 'Tempus', 'Access / Systems'),
  'ad-groups': reference('ad-groups', 'AD Groups', 'Access'),
  'general-education-ways-of-working': reference('general-education-ways-of-working', 'General Education - Ways of Working', 'Training'),
  'new-role-hire-onboarding': reference('new-role-hire-onboarding', 'New Role/Hire - Onboarding', 'Training'),
  'new-role-hire-buddy-program': reference('new-role-hire-buddy-program', 'New Role/Hire - Buddy Program', 'Training'),
  'new-role-hire-talent-management': reference('new-role-hire-talent-management', 'New Role/Hire - Talent Management', 'Training'),
  'systems-i-sight': reference('systems-i-sight', 'Systems - i-Sight', 'Access'),
  'systems-mbox': reference('systems-mbox', 'Systems - MBox', 'Access'),
  'systems-teammate-plus': reference('systems-teammate-plus', 'Systems - Teammate+', 'Access'),
  'systems-tempus': reference('systems-tempus', 'Systems - Tempus', 'Access'),
}
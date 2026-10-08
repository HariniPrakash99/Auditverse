export interface ReferenceCategory {
  category: string
  name: string
  links: string[]
}

export const resourceCategories: ReferenceCategory[] = [
  { category: 'Resource Links', name: 'J&J', links: ['J&J Home', 'Ask GS', 'Viva Engage (formerly Yammer)', 'Workday', 'CREDO Hotline'] },
]

export const resourceFolders = ['J&J', 'IT', 'GA&A Systems', 'Travel & Expenses', 'Digital Assets', 'Training']
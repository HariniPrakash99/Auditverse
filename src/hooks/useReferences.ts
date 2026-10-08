import { useCallback, useEffect, useState } from 'react'

import { Ha_refcategoriesesService } from '../generated/services/Ha_refcategoriesesService'
import { Ha_refsubcategoriesesService } from '../generated/services/Ha_refsubcategoriesesService'
import { Ha_refmastersesService } from '../generated/services/Ha_refmastersesService'
import { Ha_refsitesesService } from '../generated/services/Ha_refsitesesService'

export interface ReferenceMaster {
  id: string
  name: string
  type: 'folder' | 'link'
  link: string
  folderName: string
  folderParentPath: string
  folderPath: string
  sortOrder: number
  siteId: string
  siteName: string
}

export interface ReferenceSubcategory {
  id: string
  name: string
  description: string
  sortOrder: number
  items: ReferenceMaster[]
}

export interface ReferenceCategory {
  id: string
  name: string
  sortOrder: number
  subcategories: ReferenceSubcategory[]
}

export interface ReferenceCategoryDraft {
  id: string | null
  name: string
}

export interface ReferenceSubcategoryDraft {
  id: string | null
  name: string
  description?: string
}

export interface ReferenceSite {
  id: string
  name: string
  url: string
}

export interface ReferenceMasterDraft {
  id: string | null
  name: string
  type: 'folder' | 'link'
  link: string
  folderName: string
  folderParentPath: string
  folderPath: string
  siteId: string
}

interface ReferencesResult {
  categories: ReferenceCategory[]
  sites: ReferenceSite[]
  loading: boolean
  saving: boolean
  error: string | null
  refresh: () => Promise<void>

  saveCategories: (
    originalCategories: ReferenceCategory[],
    draftCategories: ReferenceCategoryDraft[],
  ) => Promise<void>

  saveCategorySubcategories: (
    category: ReferenceCategory,
    draftSubcategories: ReferenceSubcategoryDraft[],
  ) => Promise<void>

  saveMasters: (
    subcategory: ReferenceSubcategory,
    drafts: ReferenceMasterDraft[],
    metadata?: { title: string; description: string },
  ) => Promise<void>
}

const FOLDER_TYPE = 122970000
const LINK_TYPE = 122970001

const normalizeValue = (value: string) =>
  value.trim().toLowerCase()

const buildHierarchy = (
  categories: any[],
  subcategories: any[],
  masters: any[],
): ReferenceCategory[] => {
  return [...categories]
    .filter((category) => category.statecode !== 1)
    .sort(
      (left, right) =>
        Number(left.ha_sortorder ?? 0) -
        Number(right.ha_sortorder ?? 0),
    )
    .map((category) => {
      const categoryId = category.ha_refcategoriesid

      const categorySubcategories = [...subcategories]
        .filter(
          (subcategory) =>
            subcategory.statecode !== 1 &&
            subcategory._ha_category_value === categoryId,
        )
        .sort(
          (left, right) =>
            Number(left.ha_sortorder ?? 0) -
            Number(right.ha_sortorder ?? 0),
        )
        .map((subcategory) => {
          const subcategoryId =
            subcategory.ha_refsubcategoriesid

          const subcategoryMasters = [...masters]
            .filter(
              (master) =>
                master.statecode !== 1 &&
                master._ha_subcategory_value ===
                  subcategoryId,
            )
            .sort(
              (left, right) =>
                Number(left.ha_sortorder ?? 0) -
                Number(right.ha_sortorder ?? 0),
            )
            .map((master) => ({
              id: master.ha_refmastersid,
              name: master.ha_name ?? '',
              type:
                Number(master.ha_type) === FOLDER_TYPE
                  ? ('folder' as const)
                  : ('link' as const),
              link: master.ha_link ?? '',
              folderName: master.ha_foldername ?? '',
              folderParentPath:
                master.ha_folderparentpath ?? '',
              folderPath:
                master.ha_folderpath ?? '',
              sortOrder: Number(
                master.ha_sortorder ?? 0,
              ),
              siteId:
                master._ha_site_value ?? '',
              siteName:
                master.ha_site?.ha_name ?? '',
            }))

          return {
            id: subcategoryId,
            name: subcategory.ha_name ?? '',
            description:
              subcategory.ha_description ?? '',
            sortOrder: Number(
              subcategory.ha_sortorder ?? 0,
            ),
            items: subcategoryMasters,
          }
        })

      return {
        id: categoryId,
        name: category.ha_name ?? '',
        sortOrder: Number(
          category.ha_sortorder ?? 0,
        ),
        subcategories: categorySubcategories,
      }
    })
}

export function useReferences(): ReferencesResult {
  const [categories, setCategories] =
    useState<ReferenceCategory[]>([])

  const [sites, setSites] =
    useState<ReferenceSite[]>([])

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  const [error, setError] =
    useState<string | null>(null)

  const loadReferences = useCallback(
    async () => {
      try {
        setLoading(true)
        setError(null)

        const [
          categoryResult,
          subcategoryResult,
          masterResult,
          siteResult,
        ] = await Promise.all([
          Ha_refcategoriesesService.getAll(),
          Ha_refsubcategoriesesService.getAll(),
          Ha_refmastersesService.getAll(),
          Ha_refsitesesService.getAll(),
        ])

        const categoryData =
          categoryResult.data ?? []

        const subcategoryData =
          subcategoryResult.data ?? []

        const masterData =
          masterResult.data ?? []

        const siteData =
          siteResult.data ?? []

        setSites(
          siteData
            .filter(
              (site: any) =>
                site.statecode !== 1,
            )
            .map((site: any) => ({
              id: site.ha_refsitesid,
              name: site.ha_name ?? '',
              url: site.ha_siteurl ?? '',
            }))
            .sort((left, right) =>
              left.name.localeCompare(
                right.name,
              ),
            ),
        )

        setCategories(
          buildHierarchy(
            categoryData,
            subcategoryData,
            masterData,
          ),
        )
      } catch (caughtError) {
        console.error(
          'REFERENCE LOAD ERROR:',
          caughtError,
        )

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Unable to load References.',
        )
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  const refresh = useCallback(
    async () => {
      await loadReferences()
    },
    [loadReferences],
  )

  const saveCategories = useCallback(
    async (
      originalCategories: ReferenceCategory[],
      draftCategories: ReferenceCategoryDraft[],
    ) => {
      try {
        setSaving(true)
        setError(null)

        const isGuid = (val: string | null | undefined): boolean =>
          Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val))

        const cleanedCategories = draftCategories.map((category) => ({
          id: category.id,
          name: category.name.trim(),
        }))

        const seenNames = new Set<string>()

        for (const category of cleanedCategories) {
          if (!category.name) {
            throw new Error('Category name cannot be blank.')
          }

          const normalized = normalizeValue(category.name)

          if (seenNames.has(normalized)) {
            throw new Error(`Duplicate category name: "${category.name}".`)
          }

          seenNames.add(normalized)
        }

        // Map draft categories to real Dataverse GUIDs if draft had static ID
        const resolvedDrafts = cleanedCategories.map((draft) => {
          if (isGuid(draft.id)) {
            return draft
          }
          const matchedOriginal = originalCategories.find(
            (orig) =>
              (draft.id && orig.id === draft.id) ||
              orig.name.trim().toLowerCase() === draft.name.trim().toLowerCase() ||
              normalizeValue(orig.name) === normalizeValue(draft.name),
          )
          return {
            id: matchedOriginal?.id || null,
            name: draft.name,
          }
        })

        const resolvedExistingIds = new Set(
          resolvedDrafts.map((d) => d.id).filter((id): id is string => Boolean(id)),
        )

        // 1. DELETE removed categories in Dataverse (with cascade delete for subcategories and masters)
        for (const originalCategory of originalCategories) {
          if (isGuid(originalCategory.id) && !resolvedExistingIds.has(originalCategory.id)) {
            try {
              for (const sub of originalCategory.subcategories) {
                if (isGuid(sub.id)) {
                  for (const master of sub.items) {
                    if (isGuid(master.id)) {
                      try {
                        await Ha_refmastersesService.delete(master.id)
                      } catch (mErr) {
                        console.warn('Failed to delete master during category cascade:', mErr)
                      }
                    }
                  }
                  try {
                    await Ha_refsubcategoriesesService.delete(sub.id)
                  } catch (sErr) {
                    console.warn('Failed to delete subcategory during category cascade:', sErr)
                  }
                }
              }
              await Ha_refcategoriesesService.delete(originalCategory.id)
            } catch (delErr) {
              console.error('Failed to delete reference category:', originalCategory.id, delErr)
            }
          }
        }

        // 2. CREATE or UPDATE categories in Dataverse
        for (let index = 0; index < resolvedDrafts.length; index++) {
          const draftCategory = resolvedDrafts[index]

          if (draftCategory.id && isGuid(draftCategory.id)) {
            await Ha_refcategoriesesService.update(draftCategory.id, {
              ha_name: draftCategory.name,
              ha_sortorder: index + 1,
            } as any)
          } else {
            await Ha_refcategoriesesService.create({
              ha_name: draftCategory.name,
              ha_sortorder: index + 1,
              statecode: 0,
              statuscode: 1,
            } as any)
          }
        }

        await loadReferences()
      } catch (caughtError) {
        console.error('REFERENCE CATEGORY SAVE ERROR:', caughtError)

        const message =
          caughtError instanceof Error
            ? caughtError.message
            : 'Unable to save Reference categories.'

        setError(message)

        throw caughtError
      } finally {
        setSaving(false)
      }
    },
    [loadReferences],
  )

  const saveCategorySubcategories =
    useCallback(
      async (
        category: ReferenceCategory,
        draftSubcategories:
          ReferenceSubcategoryDraft[],
      ) => {
        try {
          setSaving(true)
          setError(null)

          const isGuid = (val: string | null | undefined): boolean =>
            Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val))

          let targetCategoryId = category.id
          if (!isGuid(targetCategoryId)) {
            const catResult = await Ha_refcategoriesesService.getAll()
            const allCats = catResult.data ?? []
            const matchingCat = allCats.find(
              (c: any) =>
                c.statecode !== 1 &&
                (c.ha_name?.toLowerCase().trim() === category.name.toLowerCase().trim() ||
                  normalizeValue(c.ha_name) === normalizeValue(category.name)),
            )
            if (matchingCat?.ha_refcategoriesid) {
              targetCategoryId = matchingCat.ha_refcategoriesid
            }
          }

          const cleanedSubcategories =
            draftSubcategories.map(
              (subcategory) => ({
                id: subcategory.id,
                name:
                  subcategory.name.trim(),
                description:
                  subcategory.description?.trim() ?? '',
              }),
            )

          const seenNames =
            new Set<string>()

          for (
            const subcategory
            of cleanedSubcategories
          ) {
            if (!subcategory.name) {
              throw new Error(
                'Subcategory name cannot be blank.',
              )
            }

            const normalized =
              normalizeValue(
                subcategory.name,
              )

            if (
              seenNames.has(
                normalized,
              )
            ) {
              throw new Error(
                `Duplicate subcategory name: "${subcategory.name}".`,
              )
            }

            seenNames.add(
              normalized,
            )
          }

          // Resolve IDs to real GUIDs if draft had static ID
          const resolvedDraftSubs = cleanedSubcategories.map((draft) => {
            if (isGuid(draft.id)) return draft
            const matchedOrig = category.subcategories.find(
              (orig) =>
                (draft.id && orig.id === draft.id) ||
                orig.name.trim().toLowerCase() === draft.name.trim().toLowerCase() ||
                normalizeValue(orig.name) === normalizeValue(draft.name),
            )
            return {
              id: matchedOrig?.id || null,
              name: draft.name,
              description: draft.description,
            }
          })

          const resolvedExistingSubIds = new Set(
            resolvedDraftSubs.map((s) => s.id).filter((id): id is string => Boolean(id)),
          )

          // 1. DELETE removed subcategories (cascade deleting their masters first)
          for (
            const originalSubcategory
            of category.subcategories
          ) {
            if (
              isGuid(originalSubcategory.id) &&
              !resolvedExistingSubIds.has(
                originalSubcategory.id,
              )
            ) {
              try {
                for (const item of originalSubcategory.items) {
                  if (isGuid(item.id)) {
                    try {
                      await Ha_refmastersesService.delete(item.id)
                    } catch (mErr) {
                      console.warn('Failed to delete master during subcategory deletion:', mErr)
                    }
                  }
                }
                await Ha_refsubcategoriesesService.delete(
                  originalSubcategory.id,
                )
              } catch (sErr) {
                console.error('Failed to delete subcategory:', originalSubcategory.id, sErr)
              }
            }
          }

          // 2. CREATE or UPDATE subcategories in Dataverse
          for (
            let index = 0;
            index <
            resolvedDraftSubs.length;
            index++
          ) {
            const draftSubcategory =
              resolvedDraftSubs[index]

            if (
              draftSubcategory.id && isGuid(draftSubcategory.id)
            ) {
              await Ha_refsubcategoriesesService.update(
                draftSubcategory.id,
                {
                  ha_name:
                    draftSubcategory.name,
                  ha_description:
                    draftSubcategory.description,
                  ha_sortorder:
                    index + 1,
                } as any,
              )
            } else {
              const createPayload: any = {
                ha_name:
                  draftSubcategory.name,
                ha_description:
                  draftSubcategory.description !== undefined && draftSubcategory.description !== null
                    ? draftSubcategory.description
                    : '',
                ha_sortorder:
                  index + 1,
                statecode: 0,
                statuscode: 1,
              }
              if (isGuid(targetCategoryId)) {
                createPayload['ha_Category@odata.bind'] = `/ha_refcategorieses(${targetCategoryId})`
              }
              await Ha_refsubcategoriesesService.create(createPayload)
            }
          }

          await loadReferences()
        } catch (caughtError) {
          console.error(
            'REFERENCE SUBCATEGORY SAVE ERROR:',
            caughtError,
          )

          const message =
            caughtError instanceof Error
              ? caughtError.message
              : 'Unable to save Reference subcategories.'

          setError(message)

          throw caughtError
        } finally {
          setSaving(false)
        }
      },
      [loadReferences],
    )

  const saveMasters = useCallback(
    async (
      subcategory: ReferenceSubcategory,
      drafts: ReferenceMasterDraft[],
      metadata?: { title: string; description: string },
    ) => {
      try {
        setSaving(true)
        setError(null)

        const isGuid = (val: string | null | undefined): boolean =>
          Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val))

        const targetTitle = (metadata?.title ?? subcategory.name).trim()
        const targetDescription = (metadata?.description ?? subcategory.description ?? '').trim()

        let resolvedSubcategoryId = subcategory.id
        if (!isGuid(resolvedSubcategoryId)) {
          try {
            const subResult = await Ha_refsubcategoriesesService.getAll()
            const allSubs = subResult.data ?? []
            const matchingSub = allSubs.find(
              (s: any) =>
                s.statecode !== 1 &&
                (s.ha_name?.toLowerCase().trim() === subcategory.name.toLowerCase().trim() ||
                  normalizeValue(s.ha_name) === normalizeValue(subcategory.name) ||
                  s.ha_name?.toLowerCase().includes('overview')),
            )
            if (matchingSub?.ha_refsubcategoriesid) {
              resolvedSubcategoryId = matchingSub.ha_refsubcategoriesid
            } else {
              // Create subcategory in Dataverse if missing!
              const catResult = await Ha_refcategoriesesService.getAll()
              const allCats = catResult.data ?? []
              const firstCatId = allCats[0]?.ha_refcategoriesid
              const createdSub = await Ha_refsubcategoriesesService.create({
                ha_name: targetTitle || subcategory.name,
                ha_description: targetDescription || '',
                ha_sortorder: 1,
                statecode: 0,
                statuscode: 1,
                ...(firstCatId ? { 'ha_Category@odata.bind': `/ha_refcategorieses(${firstCatId})` } : {}),
              } as any)
              resolvedSubcategoryId =
                (createdSub as any)?.data?.ha_refsubcategoriesid ||
                (createdSub as any)?.ha_refsubcategoriesid ||
                (createdSub as any)?.id
            }
          } catch (lookupErr) {
            console.error('Failed to lookup or create subcategory in Dataverse:', lookupErr)
          }
        }

        // Update subcategory title & description in Dataverse
        if (isGuid(resolvedSubcategoryId) && (targetTitle || targetDescription)) {
          try {
            await Ha_refsubcategoriesesService.update(
              resolvedSubcategoryId,
              {
                ha_name: targetTitle || subcategory.name,
                ha_description: targetDescription,
              } as any,
            )
          } catch (subUpdateError) {
            console.error('REFERENCE SUBCATEGORY TITLE/DESCRIPTION UPDATE ERROR:', subUpdateError)
          }
        }

        const cleanedDrafts = drafts.map((draft) => ({
          ...draft,
          name: draft.name.trim(),
          link: draft.link.trim(),
          folderName: draft.folderName.trim(),
          folderParentPath: draft.folderParentPath.trim(),
          folderPath: draft.folderPath.trim(),
        }))

        const seenNames = new Set<string>()
        const seenLinks = new Set<string>()

        for (const draft of cleanedDrafts) {
          if (!draft.name) {
            throw new Error('Folder/Link name cannot be blank.')
          }
          const normalizedName = normalizeValue(draft.name)
          if (seenNames.has(normalizedName)) {
            throw new Error(`Duplicate resource name: "${draft.name}".`)
          }
          seenNames.add(normalizedName)

          if (draft.type === 'link') {
            if (!draft.link) {
              throw new Error(`Link URL is required for "${draft.name}".`)
            }
            if (!/^https?:\/\//i.test(draft.link)) {
              throw new Error(`Link URL must use HTTPS for "${draft.name}".`)
            }
            const normalizedLink = draft.link.toLowerCase()
            if (seenLinks.has(normalizedLink)) {
              throw new Error(`Duplicate link URL: "${draft.link}".`)
            }
            seenLinks.add(normalizedLink)
          }

          if (draft.type === 'folder' && !draft.folderName) {
            throw new Error(`Library Name is required for "${draft.name}".`)
          }
        }

        const originalMasterIds = new Set(
          subcategory.items
            .map((m) => m.id)
            .filter((id): id is string => isGuid(id)),
        )

        const draftExistingGuids = new Set(
          cleanedDrafts
            .map((draft) => draft.id)
            .filter((id): id is string => isGuid(id)),
        )

        // 1. DELETE removed masters from Dataverse
        for (const originalMaster of subcategory.items) {
          if (
            isGuid(originalMaster.id) &&
            !draftExistingGuids.has(originalMaster.id)
          ) {
            try {
              await Ha_refmastersesService.delete(originalMaster.id)
            } catch (delErr) {
              console.warn('Failed to delete master:', originalMaster.id, delErr)
            }
          }
        }

        const isNewMaster = (draftItem: ReferenceMasterDraft): boolean => {
          if (!draftItem.id) return true
          if (
            draftItem.id.startsWith('ref-link-') ||
            draftItem.id.startsWith('ref-folder-') ||
            draftItem.id.startsWith('new-') ||
            draftItem.id.startsWith('draft-') ||
            draftItem.id.startsWith('temp-') ||
            draftItem.id.startsWith('ref-m-')
          ) {
            return true
          }
          if (!isGuid(draftItem.id)) return true
          return !originalMasterIds.has(draftItem.id)
        }

        // 2. CREATE or UPDATE masters in Dataverse
        for (let index = 0; index < cleanedDrafts.length; index++) {
          const draft = cleanedDrafts[index]

          const commonFields: any = {
            ha_name: draft.name,
            ha_type: draft.type === 'folder' ? FOLDER_TYPE : LINK_TYPE,
            ha_sortorder: index + 1,
            statecode: 0,
            statuscode: 1,
            ha_link: draft.type === 'folder' ? '' : draft.link,
            ha_foldername: draft.type === 'folder' ? draft.folderName : '',
            ha_folderparentpath: draft.type === 'folder' ? draft.folderParentPath : '',
            ha_folderpath: draft.type === 'folder' ? draft.folderPath : '',
          }

          let resolvedSiteId = ''
          if (draft.siteId) {
            const realSite = sites.find(
              (s) =>
                s.id === draft.siteId ||
                (s.url && draft.siteId.includes(s.url)) ||
                (draft.siteId === 'site-datasolutions-default' &&
                  (s.name.toLowerCase().includes('datasolutions') ||
                    s.url.toLowerCase().includes('datasolutions'))),
            )
            resolvedSiteId = realSite?.id || (isGuid(draft.siteId) ? draft.siteId : '')
          }

          if (!isNewMaster(draft) && draft.id) {
            // Update existing record: DO NOT send @odata.bind for ha_SubCategory!
            const updatePayload: any = { ...commonFields }
            if (isGuid(resolvedSiteId)) {
              updatePayload['ha_Site@odata.bind'] = `/ha_refsiteses(${resolvedSiteId})`
            }
            await Ha_refmastersesService.update(draft.id, updatePayload)
          } else {
            // Create new record: attach subcategory and site bindings
            const createPayload: any = { ...commonFields }
            if (isGuid(resolvedSubcategoryId)) {
              createPayload['ha_SubCategory@odata.bind'] = `/ha_refsubcategorieses(${resolvedSubcategoryId})`
            }
            if (isGuid(resolvedSiteId)) {
              createPayload['ha_Site@odata.bind'] = `/ha_refsiteses(${resolvedSiteId})`
            }
            await Ha_refmastersesService.create(createPayload)
          }
        }

        await loadReferences()
      } catch (caughtError) {
        console.error('REFERENCE MASTER SAVE ERROR:', caughtError)
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : 'Unable to save Reference resources.'
        setError(message)
        throw caughtError
      } finally {
        setSaving(false)
      }
    },
    [loadReferences, sites],
  )

  useEffect(() => {
    void loadReferences()
  }, [loadReferences])

  return {
    categories,
    sites,
    loading,
    saving,
    error,
    refresh,
    saveCategories,
    saveCategorySubcategories,
    saveMasters,
  }
}
import { useEffect, useState } from 'react'
import { products as fallbackProducts, testimonials as fallbackTestimonials } from '../data'
import { supabase } from './supabase'

const normalizeArray = (value) => Array.isArray(value) ? value : []
const normalizeObject = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {}

export const mapProductRow = (row) => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  category: row.category,
  image: row.image_url || '',
  summary: row.summary || '',
  overview: row.overview || '',
  benefits: normalizeArray(row.benefits),
  applications: normalizeArray(row.applications),
  specifications: normalizeObject(row.specifications),
  packaging: normalizeArray(row.packaging),
  qualityPoints: normalizeArray(row.quality_points),
  isPublished: row.is_published,
  sortOrder: row.sort_order ?? 0,
})

export const mapTestimonialRow = (row) => ({
  id: row.id,
  quote: row.quote_text,
  name: row.buyer_name,
  role: row.role_or_market || row.company_name || 'Verified buyer',
  companyName: row.company_name,
})

export function usePublishedProducts() {
  const [products, setProducts] = useState(fallbackProducts)
  const [source, setSource] = useState('fallback')

  useEffect(() => {
    let active = true
    if (!supabase) return () => { active = false }

    supabase
      .from('products')
      .select('id,slug,name,category,image_url,summary,overview,benefits,applications,specifications,packaging,quality_points,is_published,sort_order')
      .eq('is_published', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
      .then(({ data, error }) => {
        if (!active || error || !data?.length) return
        setProducts(data.map(mapProductRow))
        setSource('database')
      })

    return () => { active = false }
  }, [])

  return { products, source }
}

export function usePublishedTestimonials() {
  const [testimonials, setTestimonials] = useState(fallbackTestimonials)
  const [source, setSource] = useState('fallback')

  useEffect(() => {
    let active = true
    if (!supabase) return () => { active = false }

    supabase
      .from('testimonials')
      .select('id,buyer_name,company_name,role_or_market,quote_text,is_published,published_at,created_at')
      .eq('is_published', true)
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!active || error) return
        setTestimonials((data ?? []).map(mapTestimonialRow))
        setSource('database')
      })

    return () => { active = false }
  }, [])

  return { testimonials, source }
}

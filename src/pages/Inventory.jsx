import { useState, useEffect, useRef } from 'react'
import {
    RefreshCw,
    Search,
    ChevronDown,
    ArrowUpDown,
    Edit2,
    Plus,
    Pen,
    Loader2,
    X,
    Save,
    Package,
    Trash2,
    ArrowUp,
    ArrowDown
} from 'lucide-react'
import { supabase } from '../supabaseClient'
import { ColumnFilter } from '../components/ui/ColumnFilter'
import { QuantityInput } from '../components/ui/QuantityInput'
import { PriceRangeSlider } from '../components/ui/PriceRangeSlider'
import { useCart } from '../context/CartContext'

export function Inventory() {
    const topRef = useRef(null)
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [totalProducts, setTotalProducts] = useState(0)
    const [totalStock, setTotalStock] = useState(0)
    const [searchTerm, setSearchTerm] = useState(() => {
        const saved = localStorage.getItem('inventory_searchTerm')
        return saved || ''
    })
    const [priceRange, setPriceRange] = useState(() => {
        const saved = localStorage.getItem('inventory_priceRange')
        // Update parsing logic to ignore saved old defaults or values out of bounds
        if (saved) {
             try {
                const parsed = JSON.parse(saved)
                // If saved value is the old [0, 100000], override with new default
                if (parsed[0] === 0 && parsed[1] === 100000) return [100000, 20000000]
                return parsed
             } catch (e) {
                return [100000, 20000000]
             }
        }
        return [100000, 20000000]
    })
    const [showPriceFilter, setShowPriceFilter] = useState(false)

    // Column Filters State (with localStorage persistence)
    const [activeFilters, setActiveFilters] = useState(() => {
        const saved = localStorage.getItem('inventory_activeFilters')
        return saved ? JSON.parse(saved) : {}
    })
    const [filterOptions, setFilterOptions] = useState({
        name: [],
        sku: [],
        referencia: [],
        category: [],
        dispatch_number: [],
        origin: [],
        brand: [],
        color: []
    })

    // Sorting State (with localStorage persistence)
    const [sortColumn, setSortColumn] = useState(() => {
        const saved = localStorage.getItem('inventory_sortColumn')
        return saved || 'name'
    })
    const [sortDirection, setSortDirection] = useState(() => {
        const saved = localStorage.getItem('inventory_sortDirection')
        return saved || 'asc'
    })

    const PREDEFINED_CATEGORIES = [
        'VARIOS',
        'LIBRERIA',
        'INDUMENTARIA',
        'BAZAR',
        'FERRETERIA',
        'ELECTRONICA',
        'COSMETICO O CUIDADO PERSONAL'
    ]

    // Category Management State
    const [showCategoryModal, setShowCategoryModal] = useState(false)
    const [categories, setCategories] = useState(() => {
        const savedCustom = localStorage.getItem('inventory_custom_categories')
        const customCats = savedCustom ? JSON.parse(savedCustom) : []
        const merged = [...new Set([...PREDEFINED_CATEGORIES, ...customCats])]
        return merged.sort().map(c => ({ name: c }))
    })
    const [editingCategory, setEditingCategory] = useState(null)
    const [newCategoryName, setNewCategoryName] = useState('')

    // Mass Update State
    const [showMassCategoryModal, setShowMassCategoryModal] = useState(false)
    const [massCategoryData, setMassCategoryData] = useState({ duplicates: [], newCategory: '', newName: '' })
    const [selectedDuplicates, setSelectedDuplicates] = useState(new Set())

    // Cascading Filter Options
    useEffect(() => {
        const fetchCascadingOptions = async () => {
            // Use RPC for efficient DISTINCT values across all 14k+ products
            const { data, error } = await supabase.rpc('get_product_filter_options')

            if (error) {
                console.error('Error fetching filter options:', error)
                return
            }

            if (data) {
                setFilterOptions({
                    name: data.names || [],
                    sku: data.skus || [],
                    referencia: data.referencias || [],
                    category: categories.length > 0 ? categories.map(c => c.name) : PREDEFINED_CATEGORIES,
                    dispatch_number: data.dispatch_numbers || [],
                    origin: data.origins || [],
                    brand: data.brands || [],
                    color: data.colors || [],
                })
            }
        }
        fetchCascadingOptions()
    }, [activeFilters])

    // Persist filters and search state to localStorage
    useEffect(() => {
        localStorage.setItem('inventory_searchTerm', searchTerm)
    }, [searchTerm])

    useEffect(() => {
        localStorage.setItem('inventory_priceRange', JSON.stringify(priceRange))
    }, [priceRange])

    useEffect(() => {
        localStorage.setItem('inventory_activeFilters', JSON.stringify(activeFilters))
    }, [activeFilters])

    useEffect(() => {
        localStorage.setItem('inventory_sortColumn', sortColumn)
    }, [sortColumn])

    useEffect(() => {
        localStorage.setItem('inventory_sortDirection', sortDirection)
    }, [sortDirection])

    const handleFilterChange = (column, selectedValues) => {
        setActiveFilters(prev => {
            const newFilters = { ...prev }
            if (selectedValues.length === 0) {
                delete newFilters[column]
            } else {
                newFilters[column] = selectedValues
            }
            return newFilters
        })
        setPage(0)
    }

    const handleSort = (column) => {
        if (sortColumn === column) {
            // Toggle direction or reset if already desc
            if (sortDirection === 'asc') {
                setSortDirection('desc')
            } else {
                // Reset to default sort
                setSortColumn('name')
                setSortDirection('asc')
            }
        } else {
            // New column, default to ascending
            setSortColumn(column)
            setSortDirection('asc')
        }
        setPage(0)
    }

    // Cart Context
    const { cart, addToCart, removeFromCart, updateQuantity } = useCart()

    const getQtyInCart = (productId) => {
        if (!cart || !Array.isArray(cart)) return 0
        const item = cart.find(i => i.id === productId)
        return item ? (Number(item.quantity) || 0) : 0
    }

    // Pagination State with Persistence
    const [page, setPage] = useState(() => {
        const saved = localStorage.getItem('inventory_page')
        return saved ? Number(saved) : 0
    })
    const [pageSize, setPageSize] = useState(() => {
        const saved = localStorage.getItem('inventory_pageSize')
        return saved ? Number(saved) : 50
    })

    // Auto-scroll to top when page changes
    useEffect(() => {
        topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, [page])

    // Save state to localStorage
    useEffect(() => {
        localStorage.setItem('inventory_page', page)
        localStorage.setItem('inventory_pageSize', pageSize)
    }, [page, pageSize])

    // Expand State
    const [expandedProducts, setExpandedProducts] = useState(new Set())
    const toggleProductExpand = (id) => {
        setExpandedProducts(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    // Edit State
    const [editingId, setEditingId] = useState(null)
    const [editValues, setEditValues] = useState({ name: '', sku: '', price: '', stock: '', category: '' })
    const [saving, setSaving] = useState(false)
    const [translating, setTranslating] = useState(false)

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchProducts()
        }, 500)

        return () => clearTimeout(delayDebounceFn)
    }, [page, pageSize, searchTerm, activeFilters, priceRange, sortColumn, sortDirection])

    // Applies column filters to a Supabase query builder.
    // Uses exact .in() universally to allow native multiple simultaneous AND filters without 
    // overriding the single query URL parameter 'or' that Supabase uses for .or() calls.
    const applyColumnFilters = (q) => {
        Object.entries(activeFilters).forEach(([col, values]) => {
            if (!values || values.length === 0) return
            q = q.in(col, values)
        })
        return q
    }

    const fetchProducts = async () => {
        setLoading(true)
        try {
            // Lookup dispatches by description to allow searching by dispatch name (e.g. "JUAN 133")
            let dispatchNumbersFromDescription = []
            if (searchTerm) {
                const { data: matchingDispatches } = await supabase
                    .from('dispatches')
                    .select('dispatch_number')
                    .ilike('description', `%${searchTerm}%`)
                if (matchingDispatches && matchingDispatches.length > 0) {
                    dispatchNumbersFromDescription = matchingDispatches.map(d => d.dispatch_number)
                }
            }

            let query = supabase
                .from('products')
                .select('*')
                
            if (sortColumn !== 'totalValue') {
                query = query.order(sortColumn, { ascending: sortDirection === 'asc' })
            }
            
            query = query.range(page * pageSize, (page + 1) * pageSize - 1)

            if (searchTerm || Object.keys(activeFilters).length > 0) {
                if (searchTerm) {
                    // Build OR filter: search by product fields AND by dispatch_number resolved from dispatch descriptions
                    let orFilter = `name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%,referencia.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%,color.ilike.%${searchTerm}%,dispatch_number.ilike.%${searchTerm}%`
                    if (dispatchNumbersFromDescription.length > 0) {
                        orFilter += ',' + dispatchNumbersFromDescription.map(dn => `dispatch_number.eq.${dn}`).join(',')
                    }
                    query = query.or(orFilter)
                }

                query = applyColumnFilters(query)
                // Note: Price total filter (price × stock) is applied client-side after fetching

                let countQuery = supabase
                    .from('products')
                    .select('*', { count: 'exact', head: true })

                if (searchTerm) {
                    let orFilter = `name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%,referencia.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%,color.ilike.%${searchTerm}%,dispatch_number.ilike.%${searchTerm}%`
                    if (dispatchNumbersFromDescription.length > 0) {
                        orFilter += ',' + dispatchNumbersFromDescription.map(dn => `dispatch_number.eq.${dn}`).join(',')
                    }
                    countQuery = countQuery.or(orFilter)
                }
                countQuery = applyColumnFilters(countQuery)
                // Note: Price total filter is applied client-side

                const { count: searchCount, error: countError } = await countQuery

                if (countError) throw countError
                setTotalProducts(searchCount || 0)

                let stockQuery = supabase
                    .from('products')
                    .select('stock')

                if (searchTerm) {
                    let orFilter = `name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%,referencia.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%,color.ilike.%${searchTerm}%,dispatch_number.ilike.%${searchTerm}%`
                    if (dispatchNumbersFromDescription.length > 0) {
                        orFilter += ',' + dispatchNumbersFromDescription.map(dn => `dispatch_number.eq.${dn}`).join(',')
                    }
                    stockQuery = stockQuery.or(orFilter)
                }
                stockQuery = applyColumnFilters(stockQuery)
                // Note: Price total filter is applied client-side

                const { data: stockData } = await stockQuery

                if (stockData) {
                    setTotalStock(stockData.reduce((acc, curr) => acc + (curr.stock || 0), 0))
                }
            } else {
                // No filters active - get totals from RPC or fallback to direct queries
                const { data: stats } = await supabase.rpc('get_dashboard_summary')

                if (stats && stats.totalProducts && stats.totalStock) {
                    setTotalProducts(stats.totalProducts || 0)
                    setTotalStock(stats.totalStock || 0)
                } else {
                    // Fallback: calculate manually if RPC fails
                    const { count } = await supabase.from('products').select('*', { count: 'exact', head: true })
                    setTotalProducts(count || 0)

                    // Calculate total stock
                    const { data: stockData } = await supabase.from('products').select('stock')
                    if (stockData) {
                        setTotalStock(stockData.reduce((acc, curr) => acc + (curr.stock || 0), 0))
                    }
                }
            }

            const { data, error } = await query
            if (error) throw error

            // Apply price total filter (price × stock) on client side
            let filteredData = data || []

            // Filter out products with stock 0 (keep them in DB for invoice history)
            filteredData = filteredData.filter(product => (product.stock || 0) > 0)

            if (priceRange[0] > 100000 || priceRange[1] < 20000000) {
                filteredData = filteredData.filter(product => {
                    const totalPrice = (product.price || 0) * (product.stock || 0)
                    return totalPrice >= priceRange[0] && totalPrice <= priceRange[1]
                })
            }

            if (sortColumn === 'totalValue') {
                filteredData.sort((a, b) => {
                    const valA = (a.price || 0) * (a.stock || 0)
                    const valB = (b.price || 0) * (b.stock || 0)
                    return sortDirection === 'asc' ? valA - valB : valB - valA
                })
            }

            setProducts(filteredData)

            // Auto-delete products with stock 0 (silent, in background)
            autoDeleteZeroStockProducts()

            // Auto-translate products with non-Spanish names (silent, in background)
            // DESACTIVADO: Solo se ejecuta manualmente con el botón "Traducir Todo"
            // autoTranslateProducts()

        } catch (error) {
            console.error('Error fetching inventory:', error)
        } finally {
            setLoading(false)
        }
    }

    const currencyFormatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })
    const numberFormatter = new Intl.NumberFormat('es-AR')

    const formatCurrency = (amount) => currencyFormatter.format(amount)
    const formatNumber = (num) => numberFormatter.format(num)

    const handleAddToCart = (product) => {
        const stock = Number(product.stock) || 0
        const currentQty = getQtyInCart(product.id)
        if (currentQty < stock) {
            addToCart(product, stock - currentQty)
        }
    }

    const startEditing = (product) => {
        setEditingId(product.id)
        setEditValues({
            name: product.name,
            sku: product.sku || '',
            price: product.price,
            stock: product.stock,
            category: product.category,
            referencia: product.referencia || '',
            brand: product.brand || '',
            color: product.color || ''
        })
    }

    const cancelEditing = () => {
        setEditingId(null)
        setEditValues({ name: '', sku: '', price: '', stock: '', category: '', referencia: '', brand: '', color: '' })
    }

    const handleEditChange = (field, value) => {
        setEditValues(prev => ({ ...prev, [field]: value }))
    }

    const translateProductName = async () => {
        if (!editValues.name || translating) return

        setTranslating(true)
        try {
            const originalText = editValues.name.trim()

            // Step 1: Check if translation exists in our dictionary (Supabase cache)
            const { data: cachedTranslation } = await supabase
                .from('translations')
                .select('translated_text')
                .eq('original_text', originalText)
                .eq('source_lang', 'en')
                .eq('target_lang', 'es')
                .maybeSingle()

            if (cachedTranslation) {
                // Use cached translation (faster, no API call needed)
                console.log('✅ Using cached translation')
                setEditValues(prev => ({ ...prev, name: cachedTranslation.translated_text.toLowerCase() }))
                return
            }

            // Step 2: No cache found, call translation API
            console.log('🌐 Fetching new translation from API')
            const response = await fetch(
                `https://api.mymemory.translated.net/get?q=${encodeURIComponent(originalText)}&langpair=en|es`
            )

            if (!response.ok) throw new Error('Translation API error')

            const data = await response.json()

            if (data.responseStatus === 200 && data.responseData?.translatedText) {
                const translatedText = data.responseData.translatedText

                // Step 3: Save translation to dictionary for future use (always lowercase)
                const normalizedTranslation = translatedText.toLowerCase()
                await supabase
                    .from('translations')
                    .insert({
                        original_text: originalText,
                        translated_text: normalizedTranslation,
                        source_lang: 'en',
                        target_lang: 'es'
                    })
                    .select()

                console.log('💾 Translation saved to dictionary')

                // Update the name field with the normalized (uppercase) translation
                setEditValues(prev => ({ ...prev, name: normalizedTranslation }))
            } else {
                alert('No se pudo traducir el nombre. Intenta editarlo manualmente.')
            }
        } catch (error) {
            console.error('Translation error:', error)
            alert('Error al traducir. Verifica tu conexión a internet.')
        } finally {
            setTranslating(false)
        }
    }

    const saveProduct = async (id) => {
        setSaving(true)
        try {
            const newStock = parseInt(editValues.stock) || 0
            const currentProduct = products.find(p => p.id === id)
            const originalName = currentProduct?.name
            let newName = editValues.name

            // 🌐 AUTO-TRANSLATE: Translate to Spanish if needed
            const hasNonSpanishChars = /[^\u0000-\u007F\u00C0-\u00FF\u0100-\u017F\u0180-\u024F\s\d\-_.,;:!?()[\]{}'"\/\\@#$%&*+=<>|~`^]/.test(newName)

            if (hasNonSpanishChars) {
                try {
                    const response = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=es&dt=t&q=' + encodeURIComponent(newName))
                    const data = await response.json()
                    if (data && data[0] && data[0][0] && data[0][0][0]) {
                        newName = data[0][0][0]
                        console.log(`🌐 Auto-translated: "${editValues.name}" → "${newName}"`)
                    }
                } catch (translateError) {
                    console.error('Auto-translation failed:', translateError)
                    // Continue with original name if translation fails
                }
            }

            // 🔄 AUTO-NORMALIZE: Format name based on language/translation
            let normalizedName = newName
            const isOriginalEnglish = currentProduct?.original_name && newName.toUpperCase() === currentProduct.original_name.toUpperCase()
            
            if (isOriginalEnglish) {
                // If it's the original untranslated name, keep it UPPERCASE
                normalizedName = newName.toUpperCase()
            } else {
                // If it's translated or Spanish, Capitalize Each Word
                normalizedName = newName.replace(/\w\S*/g, (txt) => {
                    return txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
                })
            }
            
            const originalCategory = currentProduct?.category
            const newCategory = editValues.category

            // Always update product, even if stock is 0
            const updates = {
                name: normalizedName,
                sku: editValues.sku,
                price: parseFloat(editValues.price) || 0,
                stock: newStock,
                category: newCategory,
                referencia: editValues.referencia,
                brand: editValues.brand,
                color: editValues.color
            }

            const { error } = await supabase
                .from('products')
                .update(updates)
                .eq('id', id)

            if (error) throw error

            setProducts(products.map(p => p.id === id ? { ...p, ...updates } : p))

            // 🧠 AUTO-APRENDIZAJE N8N (Diccionario Centralizado)
            // Si el nombre original y el nuevo son diferentes, le avisamos a N8N
            if (originalName && originalName !== normalizedName) {
                try {
                    // Mismo Webhook de la pantalla de Costos
                    const N8N_DICTIONARY_WEBHOOK = 'https://n8n.neuracall.net/webhook/aprender-traduccion'
                    await fetch(N8N_DICTIONARY_WEBHOOK, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            Ingles: originalName, 
                            Español: normalizedName,                 
                            Categoria: newCategory || 'Varios'
                        })
                    })
                } catch (err) {
                    console.warn('[Dictionary] N8N Webhook falló desde Inventario.', err)
                }
            }

            // Check if category was changed
            if (originalCategory !== newCategory && normalizedName) {
                // Fetch other products with the same name
                const { data: duplicates } = await supabase
                    .from('products')
                    .select('id, name, sku, referencia, category, brand, color')
                    .eq('name', normalizedName)
                    .neq('id', id)
                    .order('category')

                if (duplicates && duplicates.length > 0) {
                    setMassCategoryData({
                        duplicates,
                        newCategory: newCategory || 'Varios',
                        newName: normalizedName
                    })
                    setSelectedDuplicates(new Set(duplicates.map(d => d.id))) // Default select all
                    setShowMassCategoryModal(true)
                }
            }

            // Check if name was changed (likely a translation)
            if (originalName && originalName !== normalizedName) {
                // Count how many other products have the same original name
                const { count } = await supabase
                    .from('products')
                    .select('*', { count: 'exact', head: true })
                    .eq('name', originalName)
                    .neq('id', id)

                if (count && count > 0) {
                    // Ask user if they want to apply translation to all duplicates
                    const applyToAll = window.confirm(
                        `✨ Encontré ${count} producto${count > 1 ? 's' : ''} más con el nombre "${originalName}".\\n\\n` +
                        `¿Quieres traducirlos todos a "${normalizedName}"?`
                    )

                    if (applyToAll) {
                        // Update all products with the same original name
                        const { error: batchError } = await supabase
                            .from('products')
                            .update({ name: normalizedName })
                            .eq('name', originalName)

                        if (batchError) {
                            console.error('Error updating duplicates:', batchError)
                            alert('Error al actualizar productos duplicados')
                        } else {
                            // Refresh products to show updated names
                            await fetchProducts()
                            alert(`✅ ${count} producto${count > 1 ? 's' : ''} actualizado${count > 1 ? 's' : ''} exitosamente!`)
                        }
                    }
                }
            }

            setEditingId(null)
        } catch (error) {
            console.error('Error updating product:', error)
            alert('Error al actualizar el producto')
        } finally {
            setSaving(false)
        }
    }

    const handleMassCategoryUpdate = async () => {
        if (selectedDuplicates.size === 0) {
            setShowMassCategoryModal(false)
            return
        }

        setSaving(true)
        try {
            const idsToUpdate = Array.from(selectedDuplicates)
            
            const { error: batchError } = await supabase
                .from('products')
                .update({ category: massCategoryData.newCategory })
                .in('id', idsToUpdate)

            if (batchError) {
                console.error('Error updating category for duplicates:', batchError)
                alert('Error al actualizar categoría de productos duplicados')
            } else {
                await fetchProducts()
                alert(`✅ ${idsToUpdate.length} producto(s) actualizado(s) exitosamente a "${massCategoryData.newCategory}"!`)
            }
        } catch (error) {
            console.error('Error en cambio masivo:', error)
        } finally {
            setSaving(false)
            setShowMassCategoryModal(false)
        }
    }

    const deleteProduct = async (id) => {
        // Confirm deletion
        const product = products.find(p => p.id === id)
        if (!product) return

        setSaving(true)
        try {
            // Check if product is referenced in invoice_items
            const { data: invoiceItems, error: checkError } = await supabase
                .from('invoice_items')
                .select('id', { count: 'exact', head: true })
                .eq('product_id', id)

            if (checkError) throw checkError

            // If product is in invoices, prevent deletion
            if (invoiceItems && invoiceItems.length > 0) {
                alert(
                    `❌ No se puede eliminar "${product.name}"\n\n` +
                    `Este producto está incluido en facturas existentes.\n\n` +
                    `Si querés ocultarlo del inventario, cambiá el stock a 0.`
                )
                setSaving(false)
                return
            }

            // Confirm deletion
            const confirmed = window.confirm(
                `¿Estás seguro que querés eliminar "${product.name}"?\n\n` +
                `Esta acción no se puede deshacer.`
            )

            if (!confirmed) {
                setSaving(false)
                return
            }

            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', id)

            if (error) throw error

            // Remove from local state and cart
            removeFromCart(id)
            setProducts(products.filter(p => p.id !== id))
            setTotalProducts(prev => prev - 1)
            setTotalStock(prev => prev - (product.stock || 0))

            alert('✅ Producto eliminado exitosamente')
        } catch (error) {
            console.error('Error deleting product:', error)
            alert('Error al eliminar el producto')
        } finally {
            setSaving(false)
        }
    }

    const deleteZeroStockProducts = async () => {
        // Confirm action
        const confirmed = window.confirm(
            '⚠️ ¿Estás seguro que querés eliminar TODOS los productos con stock 0?\\n\\n' +
            'Esta acción eliminará permanentemente los productos que no estén en facturas.\\n\\n' +
            'Los productos que estén en facturas NO serán eliminados.'
        )

        if (!confirmed) return

        setSaving(true)
        try {
            // Get all products with stock 0
            const { data: zeroStockProducts, error: fetchError } = await supabase
                .from('products')
                .select('id, name')
                .eq('stock', 0)

            if (fetchError) throw fetchError

            if (!zeroStockProducts || zeroStockProducts.length === 0) {
                alert('✅ No hay productos con stock 0 para eliminar')
                setSaving(false)
                return
            }

            console.log(`Found ${zeroStockProducts.length} products with stock 0`)

            let deletedCount = 0
            let skippedCount = 0
            const errors = []

            // Delete each product (checking for invoice references)
            for (const product of zeroStockProducts) {
                try {
                    // Check if product is in any invoice
                    const { count, error: checkError } = await supabase
                        .from('invoice_items')
                        .select('id', { count: 'exact', head: true })
                        .eq('product_id', product.id)

                    if (checkError) {
                        errors.push(`Error checking ${product.name}: ${checkError.message}`)
                        continue
                    }

                    if (count && count > 0) {
                        // Skip products that are in invoices
                        skippedCount++
                        console.log(`Skipping ${product.name} (in ${count} invoices)`)
                        continue
                    }

                    // Delete product
                    const { error: deleteError } = await supabase
                        .from('products')
                        .delete()
                        .eq('id', product.id)

                    if (deleteError) {
                        errors.push(`Error deleting ${product.name}: ${deleteError.message}`)
                    } else {
                        deletedCount++
                        console.log(`Deleted ${product.name}`)
                    }
                } catch (err) {
                    errors.push(`Error processing ${product.name}: ${err.message}`)
                }
            }

            // Show results
            let message = `✅ Operación completada:\\n\\n`
            message += `• Productos eliminados: ${deletedCount}\\n`
            if (skippedCount > 0) {
                message += `• Productos omitidos (en facturas): ${skippedCount}\\n`
            }
            if (errors.length > 0) {
                message += `\\n⚠️ Errores: ${errors.length}\\n`
                console.error('Deletion errors:', errors)
            }

            alert(message)

            // Refresh products list
            await fetchProducts()
        } catch (error) {
            console.error('Error deleting zero stock products:', error)
            alert('❌ Error al eliminar productos: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    const autoDeleteZeroStockProducts = async () => {
        // Automatic deletion of products with stock 0 (silent, no confirmations)
        try {
            // Get all products with stock 0
            const { data: zeroStockProducts, error: fetchError } = await supabase
                .from('products')
                .select('id, name')
                .eq('stock', 0)

            if (fetchError) throw fetchError
            if (!zeroStockProducts || zeroStockProducts.length === 0) {
                console.log('✅ No products with stock 0 found')
                return
            }

            console.log(`🗑️ Found ${zeroStockProducts.length} products with stock 0`)
            console.log(`🔍 Checking which ones can be deleted...`)

            let deletedCount = 0
            let skippedCount = 0

            // Delete each product (checking for invoice references)
            for (const product of zeroStockProducts) {
                try {
                    // Check if product is in any invoice
                    const { count, error: checkError } = await supabase
                        .from('invoice_items')
                        .select('id', { count: 'exact', head: true })
                        .eq('product_id', product.id)

                    if (checkError || (count && count > 0)) {
                        // Skip products that are in invoices or have errors
                        skippedCount++
                        console.log(`⏭️ Skipped "${product.name}" (in ${count} invoices)`)
                        continue
                    }

                    // Delete product
                    const { error: deleteError } = await supabase
                        .from('products')
                        .delete()
                        .eq('id', product.id)

                    if (!deleteError) {
                        deletedCount++
                        console.log(`🗑️ Deleted "${product.name}"`)
                    }
                } catch (err) {
                    // Silent error handling
                    skippedCount++
                    console.error(`❌ Error deleting "${product.name}":`, err.message)
                }
            }

            console.log(`\n✅ Auto-delete complete!`)
            console.log(`   • Deleted: ${deletedCount}`)
            console.log(`   • Skipped: ${skippedCount} (in invoices or errors)`)

            if (deletedCount > 0) {
                // Refresh products to remove deleted ones from view
                console.log('🔄 Refreshing inventory...')
                await fetchProducts()
            }
        } catch (error) {
            console.error('❌ Error in auto-delete zero stock:', error)
        }
    }

    const autoTranslateProducts = async () => {
        // Automatic translation of products from English to Spanish (silent, in background)
        // Only runs once per session to avoid repeated translations
        const hasTranslated = sessionStorage.getItem('hasAutoTranslated')
        if (hasTranslated) {
            console.log('⏭️ Auto-translation already ran this session')
            return
        }

        try {
            // Get ALL products to translate (with pagination for 7500+ products)
            console.log('📥 Fetching all products from database...')

            let allProducts = []
            let page = 0
            const pageSize = 1000
            let hasMore = true

            while (hasMore) {
                const { data: pageData, error: fetchError } = await supabase
                    .from('products')
                    .select('id, name')
                    .range(page * pageSize, (page + 1) * pageSize - 1)

                if (fetchError) throw fetchError

                if (pageData && pageData.length > 0) {
                    allProducts = [...allProducts, ...pageData]
                    console.log(`📦 Fetched page ${page + 1}: ${pageData.length} products (Total: ${allProducts.length})`)
                    page++
                    hasMore = pageData.length === pageSize
                } else {
                    hasMore = false
                }
            }

            if (allProducts.length === 0) {
                console.log('❌ No products found')
                return
            }

            console.log(`✅ Total products fetched: ${allProducts.length}`)
            console.log(`🌐 Starting translation process...`)

            let translatedCount = 0
            let errorCount = 0
            const batchSize = 15 // Increased batch size for better performance
            const totalBatches = Math.ceil(allProducts.length / batchSize)

            for (let i = 0; i < allProducts.length; i += batchSize) {
                const batch = allProducts.slice(i, i + batchSize)
                const currentBatch = Math.floor(i / batchSize) + 1

                console.log(`📦 Processing batch ${currentBatch}/${totalBatches}...`)

                await Promise.all(batch.map(async (product) => {
                    try {
                        console.log(`🔍 Translating: "${product.name}"`)

                        // Translate from English to Spanish
                        const response = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=es&dt=t&q=' + encodeURIComponent(product.name))
                        const data = await response.json()

                        console.log(`📥 API Response for "${product.name}":`, data[0]?.[0]?.[0])

                        if (data && data[0] && data[0][0] && data[0][0][0]) {
                            const translatedName = data[0][0][0].toLowerCase()
                            const originalName = product.name

                            console.log(`🔄 Will update "${originalName}" → "${translatedName}"`)

                            // Always update with translation
                            const { error: updateError } = await supabase
                                .from('products')
                                .update({ name: translatedName })
                                .eq('id', product.id)

                            if (!updateError) {
                                translatedCount++
                                if (translatedName !== originalName) {
                                    console.log(`✅ [${translatedCount}/${allProducts.length}] "${originalName}" → "${translatedName}"`)
                                } else {
                                    console.log(`⏭️ [${translatedCount}/${allProducts.length}] "${originalName}" (sin cambios)`)
                                }
                            } else {
                                errorCount++
                                console.error(`❌ Error updating "${originalName}":`, updateError.message)
                            }
                        } else {
                            console.error(`❌ Invalid API response for "${product.name}"`)
                        }
                    } catch (err) {
                        errorCount++
                        console.error(`❌ Error translating "${product.name}":`, err.message)
                    }
                }))

                // Delay between batches to avoid rate limiting
                if (i + batchSize < allProducts.length) {
                    await new Promise(resolve => setTimeout(resolve, 300))
                }
            }

            console.log(`\n✅ Translation complete!`)
            console.log(`   • Translated: ${translatedCount}`)
            console.log(`   • Errors: ${errorCount}`)
            console.log(`   • Skipped: ${allProducts.length - translatedCount - errorCount}`)

            // Mark as translated for this session
            sessionStorage.setItem('hasAutoTranslated', 'true')

            if (translatedCount > 0) {
                // Refresh products to show translated names
                fetchProducts()
            }
        } catch (error) {
            console.error('❌ Error in auto-translate:', error)
        }
    }

    // ==================== CATEGORY MANAGEMENT ====================

    // Note: PREDEFINED_CATEGORIES moved to component top so it can initialize state

    const fetchCategories = async () => {
        // Now loaded directly from state/localStorage to avoid legacy database pollution.
        // The user specifically requested filters to be strictly linked to management,
        // without the "extra" old categories that are still attached to products.
        const savedCustom = localStorage.getItem('inventory_custom_categories')
        const customCats = savedCustom ? JSON.parse(savedCustom) : []
        const merged = [...new Set([...PREDEFINED_CATEGORIES, ...customCats])]
        setCategories(merged.sort().map(c => ({ name: c })))
    }

    const createCategory = async () => {
        if (!newCategoryName.trim()) {
            alert('❌ Por favor ingresá un nombre para la categoría')
            return
        }

        const normalizedName = newCategoryName.trim().toUpperCase()

        // Check if category already exists
        if (categories.some(cat => cat.name === normalizedName)) {
            alert('❌ Esta categoría ya existe')
            return
        }

        // Add to local state and localStorage
        const savedCustom = localStorage.getItem('inventory_custom_categories')
        const customCats = savedCustom ? JSON.parse(savedCustom) : []
        
        if (!PREDEFINED_CATEGORIES.includes(normalizedName) && !customCats.includes(normalizedName)) {
            customCats.push(normalizedName)
            localStorage.setItem('inventory_custom_categories', JSON.stringify(customCats))
        }

        const newCats = [...categories, { name: normalizedName }].sort((a, b) => a.name.localeCompare(b.name))
        setCategories(newCats)
        setNewCategoryName('')
        alert(`✅ Categoría "${normalizedName}" creada. Ahora podés asignarla a productos.`)
    }

    const updateCategory = async (oldName, newName) => {
        if (!newName.trim()) {
            alert('❌ El nombre de la categoría no puede estar vacío')
            return
        }

        const normalizedNewName = newName.trim().toUpperCase()

        if (oldName === normalizedNewName) {
            setEditingCategory(null)
            return
        }

        const confirmed = window.confirm(
            `⚠️ ¿Estás seguro que querés renombrar la categoría "${oldName}" a "${normalizedNewName}"?\n\n` +
            'Esto actualizará TODOS los productos con esta categoría.'
        )

        if (!confirmed) {
            setEditingCategory(null)
            return
        }

        setSaving(true)
        try {
            // Update all products with this category
            const { error } = await supabase
                .from('products')
                .update({ category: normalizedNewName })
                .eq('category', oldName)

            if (error) throw error

            // Update local state and localStorage
            const savedCustom = localStorage.getItem('inventory_custom_categories')
            let customCats = savedCustom ? JSON.parse(savedCustom) : []
            
            // Remove old from custom if it was there, add new
            if (customCats.includes(oldName)) {
                customCats = customCats.filter(c => c !== oldName)
            }
            if (!PREDEFINED_CATEGORIES.includes(normalizedNewName) && !customCats.includes(normalizedNewName)) {
                customCats.push(normalizedNewName)
            }
            localStorage.setItem('inventory_custom_categories', JSON.stringify(customCats))

            const newCats = categories.map(cat =>
                cat.name === oldName ? { name: normalizedNewName } : cat
            ).sort((a, b) => a.name.localeCompare(b.name))
            
            setCategories(newCats)
            setEditingCategory(null)
            await fetchProducts()
            alert(`✅ Categoría actualizada exitosamente`)
        } catch (error) {
            console.error('Error updating category:', error)
            alert('❌ Error al actualizar la categoría: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    const deleteCategory = async (categoryName) => {
        // Check how many products use this category
        const { count, error: countError } = await supabase
            .from('products')
            .select('id', { count: 'exact', head: true })
            .eq('category', categoryName)

        if (countError) {
            console.error('Error checking category usage:', countError)
            alert('❌ Error al verificar el uso de la categoría')
            return
        }

        const confirmed = window.confirm(
            `⚠️ ¿Estás seguro que querés eliminar la categoría "${categoryName}"?\n\n` +
            (count > 0
                ? `Hay ${count} producto${count > 1 ? 's' : ''} usando esta categoría.\nSe les quitará la categoría.`
                : 'No hay productos usando esta categoría.'
            )
        )

        if (!confirmed) return

        setSaving(true)
        try {
            // Remove category from all products
            const { error } = await supabase
                .from('products')
                .update({ category: null })
                .eq('category', categoryName)

            if (error) throw error

            // Update local state and localStorage
            const savedCustom = localStorage.getItem('inventory_custom_categories')
            if (savedCustom) {
                let customCats = JSON.parse(savedCustom)
                customCats = customCats.filter(c => c !== categoryName)
                localStorage.setItem('inventory_custom_categories', JSON.stringify(customCats))
            }

            setCategories(categories.filter(cat => cat.name !== categoryName))
            await fetchProducts()
            alert(`✅ Categoría eliminada exitosamente`)
        } catch (error) {
            console.error('Error deleting category:', error)
            alert('❌ Error al eliminar la categoría: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    // Sync category filter options when categories state changes
    useEffect(() => {
        setFilterOptions(prev => ({
            ...prev,
            category: categories.map(c => c.name)
        }))
    }, [categories])

    // Load categories on mount
    useEffect(() => {
        fetchCategories()
    }, [])

    const displayProducts = products

    return (
        <div ref={topRef} className="relative z-10 p-8">
            <div className="space-y-6 relative">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white transition-colors">Gestión de Inventario</h2>
                        <p className="text-slate-500 dark:text-slate-400">Administra el stock físico de Neuracall.</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={fetchProducts}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg transition-colors shadow-sm"
                        >
                            {loading ? <Loader2 className="animate-spin w-[18px] h-[18px]" /> : <RefreshCw className="w-[18px] h-[18px]" />}
                            Sincronizar
                        </button>
                        <button
                            onClick={() => setShowCategoryModal(true)}
                            disabled={loading || saving}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white rounded-lg transition-colors shadow-sm"
                            title="Gestionar categorías de productos"
                        >
                            <Package className="w-[18px] h-[18px]" />
                            Categorías
                        </button>
                        {/* BOTÓN DESACTIVADO A PEDIDO DEL USUARIO (Se consolidó el flujo de Diccionario vía N8N y Google Sheets)
                        <button
                            onClick={() => {
                                sessionStorage.removeItem('hasAutoTranslated')
                                autoTranslateProducts()
                            }}
                            disabled={loading || saving}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg transition-colors shadow-sm"
                            title="Traducir todos los productos del inglés al español"
                        >
                            <span className="text-sm">🌐</span>
                            Traducir Todo
                        </button>
                        */}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-slate-900 dark:bg-gradient-to-br dark:from-cyan-900/30 dark:to-cyan-950/30 border border-slate-200 dark:border-cyan-800/50 rounded-xl p-6 shadow-sm dark:shadow-none transition-all">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-500 dark:text-slate-400 text-sm uppercase">Total de Productos</p>
                                <h3 className="text-3xl font-bold text-slate-900 dark:text-cyan-400 mt-1 transition-colors">{formatNumber(totalProducts)}</h3>
                            </div>
                            <div className="bg-cyan-50 dark:bg-cyan-500/10 p-3 rounded-lg transition-colors">
                                <svg className="w-8 h-8 text-cyan-600 dark:text-cyan-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 dark:bg-gradient-to-br dark:from-emerald-900/30 dark:to-emerald-950/30 border border-slate-200 dark:border-emerald-800/50 rounded-xl p-6 shadow-sm dark:shadow-none transition-all">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-500 dark:text-slate-400 text-sm uppercase">Stock Total</p>
                                <h3 className="text-3xl font-bold text-slate-900 dark:text-emerald-400 mt-1 transition-colors">{formatNumber(totalStock)}</h3>
                            </div>
                            <div className="bg-emerald-50 dark:bg-emerald-500/10 p-3 rounded-lg transition-colors">
                                <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input
                            placeholder="Buscar por producto, SKU, despacho (ej: 030974S) o referencia..."
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 placeholder-slate-400 dark:placeholder-slate-600 transition-all shadow-sm dark:shadow-none"
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xl dark:shadow-none transition-all pb-20">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-500 dark:text-slate-400">
                            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 font-mono text-[10px] border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="px-2 py-2 w-[180px]">
                                        <div className="flex items-center gap-1">
                                            <ColumnFilter
                                                label="PRODUCTO"
                                                column="name"
                                                options={filterOptions.name}
                                                selected={activeFilters.name || []}
                                                onFilter={handleFilterChange}
                                            />
                                            <button
                                                onClick={() => handleSort('name')}
                                                className={`p-1 rounded transition-colors ${sortColumn === 'name'
                                                    ? 'text-cyan-500 bg-cyan-500/10'
                                                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                                    }`}
                                                title={`Ordenar por producto`}
                                            >
                                                {sortColumn === 'name' ? (
                                                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                                ) : (
                                                    <ArrowUpDown className="w-3 h-3 opacity-50" />
                                                )}
                                            </button>
                                        </div>
                                    </th>
                                    <th className="px-2 py-2 w-[80px]">
                                        <ColumnFilter
                                            label="SKU"
                                            column="sku"
                                            options={filterOptions.sku}
                                            selected={activeFilters.sku || []}
                                            onFilter={handleFilterChange}
                                        />
                                    </th>
                                    <th className="px-2 py-2 w-[70px]">
                                        <ColumnFilter
                                            label="MARCA"
                                            column="brand"
                                            options={filterOptions.brand}
                                            selected={activeFilters.brand || []}
                                            onFilter={handleFilterChange}
                                        />
                                    </th>
                                    <th className="px-2 py-2 w-[70px]">
                                        <ColumnFilter
                                            label="COLOR"
                                            column="color"
                                            options={filterOptions.color}
                                            selected={activeFilters.color || []}
                                            onFilter={handleFilterChange}
                                        />
                                    </th>
                                    <th className="px-2 py-2 w-[100px]">
                                        <div className="flex items-center gap-1">
                                            <ColumnFilter
                                                label="REF."
                                                column="referencia"
                                                options={filterOptions.referencia}
                                                selected={activeFilters.referencia || []}
                                                onFilter={handleFilterChange}
                                            />
                                            <button
                                                onClick={() => handleSort('referencia')}
                                                className={`p-1 rounded transition-colors ${sortColumn === 'referencia'
                                                    ? 'text-cyan-500 bg-cyan-500/10'
                                                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                                    }`}
                                                title={`Ordenar por referencia`}
                                            >
                                                {sortColumn === 'referencia' ? (
                                                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                                ) : (
                                                    <ArrowUpDown className="w-3 h-3 opacity-50" />
                                                )}
                                            </button>
                                        </div>
                                    </th>
                                    <th className="px-2 py-2 w-[70px]">
                                        <ColumnFilter
                                            label="CAT."
                                            column="category"
                                            options={filterOptions.category}
                                            selected={activeFilters.category || []}
                                            onFilter={handleFilterChange}
                                        />
                                    </th>
                                    <th className="px-2 py-2 w-[70px]">
                                        <ColumnFilter
                                            label="DESP."
                                            column="dispatch_number"
                                            options={filterOptions.dispatch_number}
                                            selected={activeFilters.dispatch_number || []}
                                            onFilter={handleFilterChange}
                                        />
                                    </th>
                                    <th className="px-2 py-2 w-[80px]">
                                        <ColumnFilter
                                            label="ORIGEN"
                                            column="origin"
                                            options={filterOptions.origin}
                                            selected={activeFilters.origin || []}
                                            onFilter={handleFilterChange}
                                        />
                                    </th>
                                    <th className="px-2 py-2 text-right w-[90px] pt-4">
                                        <div className="flex items-center justify-end gap-1">
                                            <span>PRECIO</span>
                                            <button
                                                onClick={() => handleSort('price')}
                                                className={`p-1 rounded transition-colors ${sortColumn === 'price'
                                                    ? 'text-cyan-500 bg-cyan-500/10'
                                                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                                    }`}
                                                title={`Ordenar por precio`}
                                            >
                                                {sortColumn === 'price' ? (
                                                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                                ) : (
                                                    <ArrowUpDown className="w-3 h-3 opacity-50" />
                                                )}
                                            </button>
                                        </div>
                                    </th>
                                    <th className="px-2 py-2 text-center pt-4 w-[60px]" title="Stock Físico Real">STOCK</th>
                                    <th className="px-2 py-2 text-right w-[90px]">
                                        <div className="flex items-center justify-end gap-1">
                                            <div className="relative inline-block">
                                                <button
                                                    onClick={() => setShowPriceFilter(!showPriceFilter)}
                                                    className="flex items-center gap-1 text-[10px] font-mono hover:text-cyan-500 transition-colors"
                                                >
                                                    VALOR TOTAL
                                                    <ChevronDown className={`w-3 h-3 transition-transform ${showPriceFilter ? 'rotate-180' : ''}`} />
                                                </button>
                                            {showPriceFilter && (
                                                <div className="absolute right-0 top-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-xl z-50 min-w-[320px]">
                                                    <PriceRangeSlider
                                                        min={100000}
                                                        max={20000000}
                                                        value={priceRange}
                                                        onChange={(newRange) => {
                                                            setPriceRange(newRange)
                                                            setPage(0)
                                                        }}
                                                    />
                                                    <div className="flex gap-2 mt-4">
                                                        <button
                                                            onClick={() => {
                                                                setPriceRange([100000, 20000000])
                                                                setPage(0)
                                                            }}
                                                            className="flex-1 px-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                                        >
                                                            Limpiar
                                                        </button>
                                                        <button
                                                            onClick={() => setShowPriceFilter(false)}
                                                            className="flex-1 px-3 py-1.5 text-xs bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
                                                        >
                                                            Aplicar
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleSort('totalValue')}
                                            className={`p-1 rounded transition-colors ${sortColumn === 'totalValue'
                                                ? 'text-cyan-500 bg-cyan-500/10'
                                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                                }`}
                                            title={`Ordenar por valor total`}
                                        >
                                            {sortColumn === 'totalValue' ? (
                                                sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                            ) : (
                                                <ArrowUpDown className="w-3 h-3 opacity-50" />
                                            )}
                                        </button>
                                    </div>
                                    </th>
                                    <th className="px-2 py-2 text-center pt-4 w-[80px]">ACCIONES</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {displayProducts.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan="10" className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <Package className="w-8 h-8 opacity-20" />
                                                <p>No se encontraron productos en la base de datos.</p>
                                                <p className="text-xs">Asegúrate de haber importado los datos a Supabase.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                {displayProducts.map((product, index) => (
                                    <tr key={index} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="px-3 py-2 font-medium text-slate-900 dark:text-white text-xs" title={product.name}>
                                            {editingId === product.id ? (
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        autoFocus
                                                        className="flex-1 bg-slate-100 dark:bg-slate-800 border border-cyan-500 rounded px-2 py-1 outline-none"
                                                        value={editValues.name}
                                                        onChange={(e) => handleEditChange('name', e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') saveProduct(product.id)
                                                            if (e.key === 'Escape') cancelEditing()
                                                        }}
                                                    />
                                                </div>
                                            ) : (
                                                <div 
                                                    className="flex flex-col cursor-pointer" 
                                                    onClick={() => toggleProductExpand(product.id)}
                                                    title="Click para ver nombre completo"
                                                >
                                                    <span className={expandedProducts.has(product.id) ? "break-words whitespace-normal text-cyan-400 dark:text-cyan-300 transition-colors" : "truncate max-w-[150px] transition-colors"}>
                                                        {product.name}
                                                    </span>
                                                    {product.original_name && (
                                                        <span className={expandedProducts.has(product.id) ? "text-[9.5px] text-slate-400 italic font-mono mt-0.5 break-words whitespace-normal" : "truncate max-w-[150px] text-[9.5px] text-slate-400 italic font-mono mt-0.5"}>
                                                            {product.original_name}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-2 py-2 font-mono text-[10px]">
                                            {editingId === product.id ? (
                                                <input
                                                    type="text"
                                                    className="w-24 bg-slate-100 dark:bg-slate-800 border border-cyan-500 rounded px-1 py-1 outline-none text-slate-900 dark:text-white"
                                                    value={editValues.sku || ''}
                                                    onChange={(e) => handleEditChange('sku', e.target.value)}
                                                    placeholder="Código"
                                                />
                                            ) : (
                                                product.sku || 'N/A'
                                            )}
                                        </td>
                                        <td className="px-2 py-2 font-mono text-[10px]">
                                            {editingId === product.id ? (
                                                <input
                                                    type="text"
                                                    className="w-16 bg-slate-100 dark:bg-slate-800 border border-cyan-500 rounded px-1 py-1 outline-none text-slate-900 dark:text-white"
                                                    value={editValues.brand || ''}
                                                    onChange={(e) => handleEditChange('brand', e.target.value)}
                                                    placeholder="-"
                                                />
                                            ) : (
                                                <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] border ${product.brand ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-transparent'} whitespace-nowrap overflow-hidden text-ellipsis max-w-[80px]`}>
                                                    {product.brand || '-'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-2 py-2 font-mono text-[10px]">
                                            {editingId === product.id ? (
                                                <input
                                                    type="text"
                                                    className="w-16 bg-slate-100 dark:bg-slate-800 border border-cyan-500 rounded px-1 py-1 outline-none text-slate-900 dark:text-white"
                                                    value={editValues.color || ''}
                                                    onChange={(e) => handleEditChange('color', e.target.value)}
                                                    placeholder="-"
                                                />
                                            ) : (
                                                <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] border ${product.color ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-transparent'} whitespace-nowrap overflow-hidden text-ellipsis max-w-[80px]`}>
                                                    {product.color || '-'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-1 py-2 text-slate-400 text-[10px]">
                                            {editingId === product.id ? (
                                                <input
                                                    type="text"
                                                    className="w-20 bg-slate-100 dark:bg-slate-800 border border-cyan-500 rounded px-1 py-1 outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
                                                    value={editValues.referencia || ''}
                                                    onChange={(e) => handleEditChange('referencia', e.target.value)}
                                                    placeholder="-"
                                                />
                                            ) : (
                                                product.referencia || '-'
                                            )}
                                        </td>
                                        <td className="px-2 py-2">
                                            {editingId === product.id ? (
                                                <select
                                                    className="w-full bg-white dark:bg-slate-900 border border-cyan-500 rounded px-2 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500/50"
                                                    value={editValues.category || ''}
                                                    onChange={(e) => handleEditChange('category', e.target.value)}
                                                >
                                                    <option value="" className="text-slate-400 dark:text-slate-500">Seleccionar...</option>
                                                    {categories.map(cat => (
                                                        <option key={cat.name} value={cat.name} className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">
                                                            {cat.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <span className="inline-block px-1.5 py-0.5 rounded-full text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                                                    {product.category || 'Varios'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-2 py-2">
                                            <span className="px-1 py-0.5 rounded bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[9px] border border-blue-200 dark:border-blue-500/30 font-mono">
                                                {product.dispatch_number || '-'}
                                            </span>
                                        </td>
                                        <td className="px-2 py-2">
                                            <span className="inline-block px-1.5 py-0.5 rounded text-[9px] bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30">
                                                {product.origin || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-2 py-2 text-right font-mono text-[10px]">
                                            {editingId === product.id ? (
                                                <input
                                                    type="number"
                                                    className="w-20 bg-slate-100 dark:bg-slate-800 border border-cyan-500 rounded px-1 py-0.5 outline-none text-right"
                                                    value={editValues.price}
                                                    onChange={(e) => handleEditChange('price', e.target.value)}
                                                />
                                            ) : (
                                                formatCurrency(product.price || 0)
                                            )}
                                        </td>
                                        <td className="px-2 py-2 text-center">
                                            {editingId === product.id ? (
                                                <input
                                                    type="number"
                                                    className="w-16 bg-slate-100 dark:bg-slate-800 border border-cyan-500 rounded px-1 py-0.5 outline-none text-center"
                                                    value={editValues.stock}
                                                    onChange={(e) => handleEditChange('stock', e.target.value)}
                                                />
                                            ) : (
                                                <span className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-[10px] font-semibold ${Number(product.stock) === 0
                                                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                                                    : Number(product.stock) < 10
                                                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800'
                                                        : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                                    }`}>
                                                    {formatNumber(product.stock || 0)}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-2 py-2 text-right font-mono font-semibold text-[10px]">
                                            {formatCurrency((product.price || 0) * (product.stock || 0))}
                                        </td>
                                        <td className="px-2 py-2">
                                            <div className="flex items-center justify-end gap-2">
                                                {getQtyInCart(product.id) > 0 ? (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => removeFromCart(product.id)}
                                                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all bg-red-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 hover:text-rose-700"
                                                            title="Quitar del carrito"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>

                                                        <div className="flex items-center h-8 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                                                            <QuantityInput
                                                                initialValue={getQtyInCart(product.id)}
                                                                stock={product.stock}
                                                                onChange={(val) => updateQuantity(product.id, val)}
                                                                className="w-12 h-full bg-transparent text-xs font-bold text-center text-cyan-600 dark:text-cyan-400 outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                            />
                                                            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
                                                            <span className="text-[10px] text-slate-400 pr-2">
                                                                / {product.stock}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button
                                                        title="Agregar a Factura"
                                                        onClick={() => handleAddToCart(product)}
                                                        disabled={product.stock <= 0}
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-600 hover:text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        <Plus className="w-[18px] h-[18px]" />
                                                    </button>
                                                )}

                                                {editingId === product.id ? (
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={() => saveProduct(product.id)}
                                                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white"
                                                        >
                                                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                        </button>
                                                        <button
                                                            onClick={cancelEditing}
                                                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            title="Editar producto"
                                                            onClick={() => startEditing(product)}
                                                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white"
                                                        >
                                                            <Pen className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            title="Eliminar producto"
                                                            onClick={() => deleteProduct(product.id)}
                                                            disabled={saving}
                                                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 transition-colors">
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                            Página <span className="font-mono text-slate-900 dark:text-white">{page + 1}</span> de {Math.ceil(totalProducts / pageSize)} • {formatNumber(totalProducts)} registros
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <label className="text-sm text-slate-500 dark:text-slate-400">Mostrar:</label>
                                <select
                                    value={pageSize}
                                    onChange={(e) => {
                                        setPageSize(Number(e.target.value))
                                        setPage(0)
                                    }}
                                    className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white rounded text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="50">50</option>
                                    <option value="100">100</option>
                                    <option value="500">500</option>
                                    <option value="1000">1000</option>
                                </select>
                            </div>
                            <div className="flex gap-1 items-center">
                                <button
                                    onClick={() => setPage(p => Math.max(0, p - 1))}
                                    disabled={page === 0 || loading}
                                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                >
                                    <ChevronDown className="w-4 h-4 rotate-90 text-slate-500 dark:text-slate-400" />
                                </button>

                                {(() => {
                                    const totalPages = Math.ceil(totalProducts / pageSize);
                                    let pages = [];

                                    if (totalPages <= 7) {
                                        pages = Array.from({ length: totalPages }, (_, i) => i);
                                    } else {
                                        if (page < 4) {
                                            pages = [0, 1, 2, 3, 4, -1, totalPages - 1];
                                        } else if (page > totalPages - 5) {
                                            pages = [0, -1, totalPages - 5, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1];
                                        } else {
                                            pages = [0, -1, page - 1, page, page + 1, -1, totalPages - 1];
                                        }
                                    }

                                    return pages.map((p, i) => (
                                        p === -1 ? (
                                            <span key={`sep-${i}`} className="px-2 text-slate-400">...</span>
                                        ) : (
                                            <button
                                                key={p}
                                                onClick={() => setPage(p)}
                                                className={`min-w-[32px] h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-colors ${page === p
                                                    ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20'
                                                    : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                                                    }`}
                                            >
                                                {p + 1}
                                            </button>
                                        )
                                    ));
                                })()}

                                <button
                                    onClick={() => setPage(p => (p + 1) * pageSize < totalProducts ? p + 1 : p)}
                                    disabled={(page + 1) * pageSize >= totalProducts || loading}
                                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                >
                                    <ChevronDown className="w-4 h-4 -rotate-90 text-slate-500 dark:text-slate-400" />
                                </button>
                            </div>
                            {/* Jump to page */}
                            {Math.ceil(totalProducts / pageSize) > 7 && (
                                <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200 dark:border-slate-700">
                                    <span className="text-xs text-slate-400 whitespace-nowrap">Ir a:</span>
                                    <input
                                        type="number"
                                        min={1}
                                        max={Math.ceil(totalProducts / pageSize)}
                                        placeholder={page + 1}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                const totalPages = Math.ceil(totalProducts / pageSize)
                                                const target = parseInt(e.target.value)
                                                if (!isNaN(target) && target >= 1 && target <= totalPages) {
                                                    setPage(target - 1)
                                                    e.target.value = ''
                                                }
                                            }
                                        }}
                                        className="w-14 h-8 text-center text-xs font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>


            </div>

            {/* Category Management Modal */}
            {showCategoryModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden border border-slate-200 dark:border-slate-700">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Package className="w-6 h-6 text-white" />
                                <h2 className="text-2xl font-bold text-white">Gestión de Categorías</h2>
                            </div>
                            <button
                                onClick={() => setShowCategoryModal(false)}
                                className="text-white/80 hover:text-white transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
                            {/* Create New Category */}
                            <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                                <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-300 mb-3">Nueva Categoría</h3>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && createCategory()}
                                        placeholder="Nombre de la categoría..."
                                        className="flex-1 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                    <button
                                        onClick={createCategory}
                                        disabled={saving}
                                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg transition-colors text-sm font-medium"
                                    >
                                        Crear
                                    </button>
                                </div>
                            </div>

                            {/* Categories List */}
                            <div>
                                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                                    Categorías Existentes ({categories.length})
                                </h3>
                                {categories.length === 0 ? (
                                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                                        <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        <p>No hay categorías creadas</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {categories.map((category) => (
                                            <div
                                                key={category.name}
                                                className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
                                            >
                                                {editingCategory === category.name ? (
                                                    <>
                                                        <input
                                                            type="text"
                                                            defaultValue={category.name}
                                                            onKeyPress={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    updateCategory(category.name, e.target.value)
                                                                } else if (e.key === 'Escape') {
                                                                    setEditingCategory(null)
                                                                }
                                                            }}
                                                            onBlur={(e) => updateCategory(category.name, e.target.value)}
                                                            autoFocus
                                                            className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                        />
                                                        <button
                                                            onClick={() => setEditingCategory(null)}
                                                            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                                                            {category.name}
                                                        </span>
                                                        <button
                                                            onClick={() => setEditingCategory(category.name)}
                                                            disabled={saving}
                                                            className="p-1.5 text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 transition-colors"
                                                            title="Editar categoría"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => deleteCategory(category.name)}
                                                            disabled={saving}
                                                            className="p-1.5 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                                                            title="Eliminar categoría"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                            <button
                                onClick={() => setShowCategoryModal(false)}
                                className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors text-sm font-medium"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Mass Category Update Modal */}
            {showMassCategoryModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col">
                        <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-6 flex flex-shrink-0 items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Package className="w-6 h-6 text-white" />
                                <h2 className="text-xl font-bold text-white">Actualización Masiva de Categoría</h2>
                            </div>
                            <button
                                onClick={() => setShowMassCategoryModal(false)}
                                className="text-white/80 hover:text-white transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            <p className="text-slate-600 dark:text-slate-300 mb-4">
                                Encontramos <strong>{massCategoryData.duplicates.length}</strong> productos más con el nombre "{massCategoryData.newName}".<br/>
                                Seleccioná a cuáles querés aplicarles la nueva categoría <strong>"{massCategoryData.newCategory}"</strong>.
                            </p>
                            
                            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                        <tr>
                                            <th className="px-4 py-3 w-12 text-center">
                                                <input 
                                                    type="checkbox" 
                                                    className="w-4 h-4 text-cyan-500 rounded border-slate-300"
                                                    checked={selectedDuplicates.size === massCategoryData.duplicates.length && massCategoryData.duplicates.length > 0}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedDuplicates(new Set(massCategoryData.duplicates.map(d => d.id)))
                                                        } else {
                                                            setSelectedDuplicates(new Set())
                                                        }
                                                    }}
                                                />
                                            </th>
                                            <th className="px-4 py-3">REF / SKU</th>
                                            <th className="px-4 py-3">Marca / Color</th>
                                            <th className="px-4 py-3">Categoría Actual</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {massCategoryData.duplicates.map((prod) => (
                                            <tr key={prod.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer" onClick={() => {
                                                const newSet = new Set(selectedDuplicates)
                                                if (newSet.has(prod.id)) newSet.delete(prod.id)
                                                else newSet.add(prod.id)
                                                setSelectedDuplicates(newSet)
                                            }}>
                                                <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                    <input 
                                                        type="checkbox" 
                                                        className="w-4 h-4 text-cyan-500 rounded border-slate-300"
                                                        checked={selectedDuplicates.has(prod.id)}
                                                        onChange={(e) => {
                                                            const newSet = new Set(selectedDuplicates)
                                                            if (e.target.checked) newSet.add(prod.id)
                                                            else newSet.delete(prod.id)
                                                            setSelectedDuplicates(newSet)
                                                        }}
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-mono text-xs">
                                                    {prod.referencia || '-'} / {prod.sku || '-'}
                                                </td>
                                                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                                    {prod.brand || '-'} / {prod.color || '-'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                                                        {prod.category || 'Varios'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 flex-shrink-0">
                            <button
                                onClick={() => setShowMassCategoryModal(false)}
                                disabled={saving}
                                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors text-sm font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleMassCategoryUpdate}
                                disabled={saving || selectedDuplicates.size === 0}
                                className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-800 disabled:opacity-50 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Aplicar a {selectedDuplicates.size} producto(s)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

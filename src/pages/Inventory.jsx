import { useState, useEffect, useRef } from 'react'
import {
    RefreshCw,
    Search,
    ChevronDown,
    ArrowUpDown,
    Plus,
    Pen,
    Loader2,
    X,
    Save,
    Package,
    Trash2
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
    const [searchTerm, setSearchTerm] = useState('')
    const [priceRange, setPriceRange] = useState([0, 100000])
    const [showPriceFilter, setShowPriceFilter] = useState(false)

    // Column Filters State
    const [activeFilters, setActiveFilters] = useState({})
    const [filterOptions, setFilterOptions] = useState({
        name: [],
        sku: [],
        referencia: [],
        category: [],
        dispatch_number: [],
        origin: []
    })

    // Cascading Filter Options
    useEffect(() => {
        const fetchCascadingOptions = async () => {
            let baseQuery = supabase
                .from('products')
                .select('name, sku, referencia, category, dispatch_number, origin')

            Object.entries(activeFilters).forEach(([col, values]) => {
                if (values.length > 0) baseQuery = baseQuery.in(col, values)
            })

            const { data } = await baseQuery

            if (data) {
                const getOptions = (key) => [...new Set(data.map(i => i[key]).filter(Boolean))].sort()

                setFilterOptions({
                    name: getOptions('name'),
                    sku: getOptions('sku'),
                    referencia: getOptions('referencia'),
                    category: getOptions('category'),
                    dispatch_number: getOptions('dispatch_number'),
                    origin: getOptions('origin'),
                })
            }
        }
        fetchCascadingOptions()
    }, [activeFilters])

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

    // Edit State
    const [editingId, setEditingId] = useState(null)
    const [editValues, setEditValues] = useState({ name: '', price: '', stock: '' })
    const [saving, setSaving] = useState(false)
    const [translating, setTranslating] = useState(false)

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchProducts()
        }, 500)

        return () => clearTimeout(delayDebounceFn)
    }, [page, pageSize, searchTerm, activeFilters, priceRange])

    const fetchProducts = async () => {
        setLoading(true)
        try {
            let query = supabase
                .from('products')
                .select('*')
                .order('name', { ascending: true })
                .range(page * pageSize, (page + 1) * pageSize - 1)

            if (searchTerm || Object.keys(activeFilters).length > 0) {
                if (searchTerm) {
                    query = query.or(`name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%,referencia.ilike.%${searchTerm}%`)
                }

                Object.entries(activeFilters).forEach(([col, values]) => {
                    if (values.length > 0) query = query.in(col, values)
                })

                // Price range filter
                if (priceRange[0] > 0 || priceRange[1] < 100000) {
                    query = query.gte('price', priceRange[0]).lte('price', priceRange[1])
                }

                let countQuery = supabase
                    .from('products')
                    .select('*', { count: 'exact', head: true })

                if (searchTerm) {
                    countQuery = countQuery.or(`name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%,referencia.ilike.%${searchTerm}%`)
                }
                Object.entries(activeFilters).forEach(([col, values]) => {
                    if (values.length > 0) countQuery = countQuery.in(col, values)
                })
                if (priceRange[0] > 0 || priceRange[1] < 100000) {
                    countQuery = countQuery.gte('price', priceRange[0]).lte('price', priceRange[1])
                }

                const { count: searchCount, error: countError } = await countQuery

                if (countError) throw countError
                setTotalProducts(searchCount || 0)

                let stockQuery = supabase
                    .from('products')
                    .select('stock')

                if (searchTerm) {
                    stockQuery = stockQuery.or(`name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%,referencia.ilike.%${searchTerm}%`)
                }
                Object.entries(activeFilters).forEach(([col, values]) => {
                    if (values.length > 0) stockQuery = stockQuery.in(col, values)
                })
                if (priceRange[0] > 0 || priceRange[1] < 100000) {
                    stockQuery = stockQuery.gte('price', priceRange[0]).lte('price', priceRange[1])
                }

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
            setProducts(data || [])

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
            price: product.price,
            stock: product.stock
        })
    }

    const cancelEditing = () => {
        setEditingId(null)
        setEditValues({ name: '', price: '', stock: '' })
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
                setEditValues(prev => ({ ...prev, name: cachedTranslation.translated_text }))
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

                // Step 3: Save translation to dictionary for future use
                await supabase
                    .from('translations')
                    .insert({
                        original_text: originalText,
                        translated_text: translatedText,
                        source_lang: 'en',
                        target_lang: 'es'
                    })
                    .select()

                console.log('💾 Translation saved to dictionary')

                // Update the name field with the translation
                setEditValues(prev => ({ ...prev, name: translatedText }))
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
            const newName = editValues.name

            if (newStock <= 0) {
                // Delete product if stock is 0 or less
                const { error } = await supabase
                    .from('products')
                    .delete()
                    .eq('id', id)

                if (error) throw error

                // Remove from local state and cart
                removeFromCart(id)
                setProducts(products.filter(p => p.id !== id))
                setTotalProducts(prev => prev - 1)
                setTotalStock(prev => prev - (products.find(p => p.id === id)?.stock || 0))
            } else {
                // Update product normally
                const updates = {
                    name: editValues.name,
                    price: parseFloat(editValues.price) || 0,
                    stock: newStock
                }

                const { error } = await supabase
                    .from('products')
                    .update(updates)
                    .eq('id', id)

                if (error) throw error

                setProducts(products.map(p => p.id === id ? { ...p, ...updates } : p))

                // Check if name was changed (likely a translation)
                if (originalName && originalName !== newName) {
                    // Count how many other products have the same original name
                    const { count } = await supabase
                        .from('products')
                        .select('*', { count: 'exact', head: true })
                        .eq('name', originalName)
                        .neq('id', id)

                    if (count && count > 0) {
                        // Ask user if they want to apply translation to all duplicates
                        const applyToAll = window.confirm(
                            `✨ Encontré ${count} producto${count > 1 ? 's' : ''} más con el nombre "${originalName}".\n\n` +
                            `¿Quieres traducirlos todos a "${newName}"?`
                        )

                        if (applyToAll) {
                            // Update all products with the same original name
                            const { error: batchError } = await supabase
                                .from('products')
                                .update({ name: newName })
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
            }

            setEditingId(null)
        } catch (error) {
            console.error('Error updating product:', error)
            alert('Error al actualizar el producto')
        } finally {
            setSaving(false)
        }
    }

    const displayProducts = products

    return (
        <div ref={topRef} className="relative z-10 p-8">
            <div className="space-y-6 relative">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white transition-colors">Gestión de Inventario</h2>
                        <p className="text-slate-500 dark:text-slate-400">Administra el stock físico de Neuracall.</p>
                    </div>
                    <button
                        onClick={fetchProducts}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg transition-colors shadow-sm"
                    >
                        {loading ? <Loader2 className="animate-spin w-[18px] h-[18px]" /> : <RefreshCw className="w-[18px] h-[18px]" />}
                        Sincronizar
                    </button>
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
                            placeholder="Buscar general..."
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
                                    <th className="px-3 py-2 min-w-[200px]">
                                        <ColumnFilter
                                            label="PRODUCTO"
                                            column="name"
                                            options={filterOptions.name}
                                            selected={activeFilters.name || []}
                                            onFilter={handleFilterChange}
                                        />
                                    </th>
                                    <th className="px-3 py-2 min-w-[120px]">SKU</th>
                                    <th className="px-3 py-2 min-w-[120px]">
                                        <ColumnFilter
                                            label="REFERENCIA"
                                            column="referencia"
                                            options={filterOptions.referencia}
                                            selected={activeFilters.referencia || []}
                                            onFilter={handleFilterChange}
                                        />
                                    </th>
                                    <th className="px-3 py-2">
                                        <ColumnFilter
                                            label="CAT."
                                            column="category"
                                            options={filterOptions.category}
                                            selected={activeFilters.category || []}
                                            onFilter={handleFilterChange}
                                        />
                                    </th>
                                    <th className="px-3 py-2">
                                        <ColumnFilter
                                            label="DESP."
                                            column="dispatch_number"
                                            options={filterOptions.dispatch_number}
                                            selected={activeFilters.dispatch_number || []}
                                            onFilter={handleFilterChange}
                                        />
                                    </th>
                                    <th className="px-3 py-2 text-center pt-4">ORIGEN</th>
                                    <th className="px-3 py-2 text-right">
                                        <div className="relative inline-block">
                                            <button
                                                onClick={() => setShowPriceFilter(!showPriceFilter)}
                                                className="flex items-center gap-1 text-[10px] font-mono hover:text-cyan-500 transition-colors"
                                            >
                                                PRECIO
                                                <ChevronDown className={`w-3 h-3 transition-transform ${showPriceFilter ? 'rotate-180' : ''}`} />
                                            </button>
                                            {showPriceFilter && (
                                                <div className="absolute right-0 top-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-xl z-50 min-w-[320px]">
                                                    <PriceRangeSlider
                                                        min={0}
                                                        max={100000}
                                                        value={priceRange}
                                                        onChange={(newRange) => {
                                                            setPriceRange(newRange)
                                                            setPage(0)
                                                        }}
                                                    />
                                                    <div className="flex gap-2 mt-4">
                                                        <button
                                                            onClick={() => {
                                                                setPriceRange([0, 100000])
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
                                    </th>
                                    <th className="px-3 py-2 text-center pt-4" title="Stock Físico Real">STOCK</th>
                                    <th className="px-3 py-2 text-right pt-4">VALOR TOTAL</th>
                                    <th className="px-3 py-2 text-center pt-4">ACCIONES</th>
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
                                                    <button
                                                        onClick={translateProductName}
                                                        disabled={translating || !editValues.name}
                                                        title="Traducir al español"
                                                        className="flex-shrink-0 w-7 h-7 rounded flex items-center justify-center transition-all bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {translating ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <span className="text-sm">🌐</span>
                                                        )}
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="truncate max-w-[150px]">{product.name}</div>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 font-mono">
                                            {product.sku || 'N/A'}
                                        </td>
                                        <td className="px-3 py-2 text-slate-400">
                                            {product.referencia || '-'}
                                        </td>
                                        <td className="px-3 py-2">
                                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                                                {product.category || 'Varios'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2">
                                            <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[9px] border border-blue-200 dark:border-blue-500/30 font-mono">
                                                {product.dispatch_number || '-'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2">
                                            <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] border border-amber-200 dark:border-amber-500/30">
                                                {product.origin || 'CHINA'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono text-slate-700 dark:text-slate-200 text-xs">
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
                                        <td className="px-3 py-2 text-center font-bold text-xs text-slate-900 dark:text-white">
                                            {editingId === product.id ? (
                                                <input
                                                    type="number"
                                                    className="w-16 bg-slate-100 dark:bg-slate-800 border border-cyan-500 rounded px-1 py-0.5 outline-none text-center"
                                                    value={editValues.stock}
                                                    onChange={(e) => handleEditChange('stock', e.target.value)}
                                                />
                                            ) : (
                                                formatNumber(product.stock || 0)
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-right font-medium text-emerald-600 dark:text-emerald-400 text-xs">
                                            {editingId === product.id ? (
                                                (() => {
                                                    const price = parseFloat(editValues.price) || 0
                                                    const stock = parseInt(editValues.stock) || 0
                                                    const neto = price * stock
                                                    return formatCurrency(neto)
                                                })()
                                            ) : (
                                                formatCurrency(product.neto || 0)
                                            )}
                                        </td>
                                        <td className="px-3 py-2">
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
                                                    <button
                                                        title="Editar producto"
                                                        onClick={() => startEditing(product)}
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white"
                                                    >
                                                        <Pen className="w-4 h-4" />
                                                    </button>
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
                        </div>
                    </div>
                </div>


            </div>
        </div>
    )
}

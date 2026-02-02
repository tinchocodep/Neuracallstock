import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { Package, AlertTriangle, AlertCircle, DollarSign, RefreshCw, TrendingUp } from 'lucide-react'

// Dashboard v2.2 - FORCE REBUILD - Fixed inventory with range(0,99999)
export function Dashboard() {
    const [companyName, setCompanyName] = useState('Loading...')
    const [metrics, setMetrics] = useState({
        totalValue: 0,
        totalProducts: 0,
        totalStock: 0,
        lowStock: 0,
        outOfStock: 0
    })
    const [categories, setCategories] = useState([])
    const [alerts, setAlerts] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchDashboardData()
    }, [])

    async function fetchDashboardData() {
        setLoading(true)
        try {
            // 1. Fetch Company Name
            const { data: companyData } = await supabase
                .from('companies')
                .select('name')
                .limit(1)
                .maybeSingle()

            if (companyData) setCompanyName(companyData.name)
            else setCompanyName('Mi Empresa')

            // 2. Fetch Metrics via RPC for accuracy, with fallback
            const { data: stats, error: statsError } = await supabase.rpc('get_dashboard_summary')

            if (stats && stats.totalProducts && stats.totalStock) {
                // RPC succeeded with valid data
                setMetrics({
                    totalValue: stats.totalValue || 0,
                    totalProducts: stats.totalProducts || 0,
                    totalStock: stats.totalStock || 0,
                    lowStock: stats.lowStock || 0,
                    outOfStock: stats.outOfStock || 0
                })
            } else {
                // Fallback: calculate manually if RPC fails or returns incomplete data
                console.warn('RPC get_dashboard_summary failed or incomplete, using fallback calculations')

                // Get total products count
                const { count } = await supabase.from('products').select('*', { count: 'exact', head: true })

                // Get all products data for calculations (remove 1000 limit)
                const { data: allProducts } = await supabase
                    .from('products')
                    .select('stock, neto')
                    .range(0, 99999) // Fetch up to 100k products instead of default 1000

                console.log('🔍 DEBUG: Products fetched:', allProducts?.length || 0)
                console.log('🔍 DEBUG: First 3 products:', allProducts?.slice(0, 3))

                if (allProducts) {
                    const totalStock = allProducts.reduce((acc, curr) => acc + (curr.stock || 0), 0)
                    const totalValue = allProducts.reduce((acc, curr) => acc + (curr.neto || 0), 0)

                    console.log('📊 DEBUG: Total products fetched:', allProducts.length)
                    console.log('📊 DEBUG: Total stock calculated:', totalStock)
                    console.log('📊 DEBUG: Total value (neto) calculated:', totalValue)
                    console.log('📊 DEBUG: Sample neto values:', allProducts.slice(0, 5).map(p => ({ stock: p.stock, neto: p.neto })))

                    // Count out of stock
                    const outOfStock = allProducts.filter(p => (p.stock || 0) === 0).length

                    setMetrics({
                        totalValue: totalValue,
                        totalProducts: count || 0,
                        totalStock: totalStock,
                        lowStock: 0, // We don't have a threshold defined, so keeping as 0
                        outOfStock: outOfStock
                    })
                }
            }

            // 3. Fetch separate data for Lists (Categories, Alerts)
            // Fetching a sample for categories/alerts or top items
            // Using a simpler query for alerts:
            const { data: alertItems } = await supabase
                .from('products')
                .select('*')
                .eq('stock', 0)
                .limit(5)

            setAlerts(alertItems || [])

            // Fetch ALL products for accurate category distribution
            const { data: products } = await supabase
                .from('products')
                .select('category, stock, price, neto') // minimal fields
                .range(0, 99999) // Fetch all products instead of just 1000

            if (products) {
                const catMap = {}
                products.forEach(p => {
                    const val = (p.neto || 0) // Using NETO directly as requested
                    const cat = p.category || 'Sin Categoría'
                    if (!catMap[cat]) catMap[cat] = { name: cat, value: 0, count: 0 }
                    catMap[cat].value += val
                    catMap[cat].count++
                })

                const sortedCats = Object.values(catMap).sort((a, b) => b.value - a.value).slice(0, 5)
                const maxCatVal = sortedCats.length > 0 ? sortedCats[0].value : 1
                // Calculate total value of Sample to get correct percentages relative to sample
                const sampleTotalVal = products.reduce((acc, p) => acc + (p.neto || 0), 0) || 1

                setCategories(sortedCats.map(c => ({
                    ...c,
                    percentage: (c.value / sampleTotalVal) * 100,
                    relativePercentage: (c.value / maxCatVal) * 100
                })))
            }

        } catch (err) {
            console.error('Error fetching dashboard:', err)
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount)
    }

    const formatNumber = (num) => {
        return new Intl.NumberFormat('es-AR').format(num)
    }

    if (loading) {
        return (
            <div className="p-8">
                <div className="animate-pulse">
                    <div className="h-8 w-48 bg-white/10 rounded mb-2"></div>
                    <div className="h-4 w-32 bg-white/10 rounded mb-8"></div>
                    <div className="h-40 w-full bg-white/10 rounded-2xl mb-6"></div>
                    <div className="grid grid-cols-4 gap-6 mb-6">
                        {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-white/10 rounded-xl"></div>)}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <>
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0 opacity-30 dark:opacity-100 transition-opacity">
                <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-cyan-900/20 rounded-full blur-3xl"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-indigo-900/20 rounded-full blur-3xl"></div>
            </div>

            <div className="relative z-10 p-8">
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            <div>
                                <h2 className="text-3xl font-bold text-slate-900 dark:text-white uppercase transition-colors">{companyName}</h2>
                                <p className="text-slate-500 dark:text-slate-400">Métricas clave del inventario</p>
                            </div>
                        </div>
                        <button
                            onClick={fetchDashboardData}
                            className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-cyan-600 dark:text-cyan-400 border border-slate-200 dark:border-slate-700 rounded-lg text-sm flex items-center gap-2 transition shadow-sm"
                        >
                            <div className="text-xs">🔄</div>
                            Sync Clientes
                        </button>
                    </div>

                    {/* Main Stats Card */}
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/40 dark:to-emerald-950/40 border-2 border-emerald-200 dark:border-emerald-700/50 rounded-2xl p-8 shadow-xl dark:shadow-2xl transition-all">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-emerald-600 dark:text-emerald-400 text-sm font-semibold uppercase tracking-wide mb-2 transition-colors">Valor Inventario</p>
                                <h1 className="text-5xl md:text-6xl font-bold text-emerald-900 dark:text-white transition-colors">{formatCurrency(metrics.totalValue)}</h1>
                                <p className="text-emerald-700/70 dark:text-emerald-300/70 mt-2 text-sm transition-colors">Valor total del stock actual • {formatNumber(metrics.totalStock)} unidades</p>
                            </div>
                            <div className="bg-emerald-500/10 dark:bg-emerald-500/20 p-6 rounded-2xl transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-dollar-sign w-16 h-16 text-emerald-600 dark:text-emerald-400 transition-colors" aria-hidden="true"><line x1="12" x2="12" y1="2" y2="22"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Productos */}
                        <div className="bg-white dark:bg-slate-900 dark:bg-gradient-to-br dark:from-cyan-900/30 dark:to-cyan-950/30 border border-slate-200 dark:border-cyan-800/50 rounded-xl p-6 shadow-sm dark:shadow-none transition-all">
                            <div className="flex items-center justify-between mb-3">
                                <div className="bg-cyan-50 dark:bg-cyan-500/10 p-3 rounded-lg transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-package w-6 h-6 text-cyan-600 dark:text-cyan-400 transition-colors" aria-hidden="true"><path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"></path><path d="M12 22V12"></path><polyline points="3.29 7 12 12 20.71 7"></polyline><path d="m7.5 4.27 9 5.15"></path></svg>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">Productos</p>
                            </div>
                            <h3 className="text-3xl font-bold text-slate-900 dark:text-white transition-colors">{metrics.totalProducts}</h3>
                            <p className="text-xs text-cyan-600 dark:text-cyan-400 mt-1 transition-colors">Total de productos</p>
                        </div>

                        {/* Stock */}
                        <div className="bg-white dark:bg-slate-900 dark:bg-gradient-to-br dark:from-blue-900/30 dark:to-blue-950/30 border border-slate-200 dark:border-blue-800/50 rounded-xl p-6 shadow-sm dark:shadow-none transition-all">
                            <div className="flex items-center justify-between mb-3">
                                <div className="bg-blue-50 dark:bg-blue-500/10 p-3 rounded-lg transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-box w-6 h-6 text-blue-600 dark:text-blue-400 transition-colors" aria-hidden="true"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path><path d="m3.3 7 8.7 5 8.7-5"></path><path d="M12 22V12"></path></svg>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">Stock</p>
                            </div>
                            <h3 className="text-3xl font-bold text-slate-900 dark:text-white transition-colors">{formatNumber(metrics.totalStock)}</h3>
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 transition-colors">Unidades totales</p>
                        </div>

                        {/* Stock Bajo */}
                        <div className="bg-white dark:bg-slate-900 dark:bg-gradient-to-br dark:from-amber-900/30 dark:to-amber-950/30 border border-slate-200 dark:border-amber-800/50 rounded-xl p-6 shadow-sm dark:shadow-none transition-all">
                            <div className="flex items-center justify-between mb-3">
                                <div className="bg-amber-50 dark:bg-amber-500/10 p-3 rounded-lg transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-triangle-alert w-6 h-6 text-amber-600 dark:text-amber-400 transition-colors" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">Stock Bajo</p>
                            </div>
                            <h3 className="text-3xl font-bold text-slate-900 dark:text-white transition-colors">{metrics.lowStock}</h3>
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 transition-colors">Productos en alerta</p>
                        </div>

                        {/* Agotados */}
                        <div className="bg-white dark:bg-slate-900 dark:bg-gradient-to-br dark:from-red-900/30 dark:to-red-950/30 border border-slate-200 dark:border-red-800/50 rounded-xl p-6 shadow-sm dark:shadow-none transition-all">
                            <div className="flex items-center justify-between mb-3">
                                <div className="bg-red-50 dark:bg-red-500/10 p-3 rounded-lg transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-archive w-6 h-6 text-red-600 dark:text-red-400 transition-colors" aria-hidden="true"><rect width="20" height="5" x="2" y="3" rx="1"></rect><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"></path><path d="M10 12h4"></path></svg>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">Agotados</p>
                            </div>
                            <h3 className="text-3xl font-bold text-slate-900 dark:text-white transition-colors">{metrics.outOfStock}</h3>
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1 transition-colors">Sin stock</p>
                        </div>
                    </div>

                    {/* Bottom Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Top Categories */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm dark:shadow-none transition-all">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trending-down text-cyan-600 dark:text-cyan-400" aria-hidden="true"><path d="M16 17h6v-6"></path><path d="m22 17-8.5-8.5-5 5L2 7"></path></svg>
                                Top Categorías por Valor
                            </h3>

                            <div className="space-y-4">
                                {categories.map((cat, index) => (
                                    <div key={index} className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-700 dark:text-slate-300 font-medium transition-colors">{cat.name}</span>
                                            <span className="text-slate-900 dark:text-white font-mono transition-colors">{formatCurrency(cat.value)}</span>
                                        </div>
                                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 transition-colors">
                                            <div
                                                className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all"
                                                style={{ width: `${cat.relativePercentage}%` }}
                                            ></div>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-slate-500">
                                            <span>{cat.count} productos</span>
                                            <span>{cat.percentage.toFixed(1)}%</span>
                                        </div>
                                    </div>
                                ))}
                                {categories.length === 0 && (
                                    <p className="text-slate-500 text-center py-4">No hay datos de categorías disponibles</p>
                                )}
                            </div>
                        </div>

                        {/* Stock Alerts */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm dark:shadow-none transition-all">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-triangle-alert text-amber-500 dark:text-amber-400" ariaHidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>
                                Alertas de Stock
                            </h3>

                            <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                                {alerts.map((item, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-transparent transition-colors">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate transition-colors">{item.name}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono transition-colors">{item.sku || 'SIN SKU'}</p>
                                        </div>
                                        <div className="ml-4 text-right">
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded text-xs font-semibold transition-colors">AGOTADO</span>
                                        </div>
                                    </div>
                                ))}
                                {alerts.length === 0 && (
                                    <p className="text-slate-500 text-center py-4">No hay alertas activas</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

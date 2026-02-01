
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import {
    TrendingUp,
    Users,
    Map,
    ShoppingBag,
    Filter,
    Calendar,
    FileText,
    Download
} from 'lucide-react'

export function Analysis() {
    const [stats, setStats] = useState({
        totalSales: 0,
        invoiceCount: 0,
        avgTicket: 0,
        activeProvinces: 0
    })
    const [monthlySales, setMonthlySales] = useState([])
    const [topClients, setTopClients] = useState([])
    const [provinceSales, setProvinceSales] = useState([])
    const [invoices, setInvoices] = useState([])
    const [loading, setLoading] = useState(true)

    // Filters
    const [year, setYear] = useState(new Date().getFullYear())
    const [invoiceType, setInvoiceType] = useState('Todas')
    const [jurisdiction, setJurisdiction] = useState('Todas')

    const years = [2024, 2025, 2026]

    useEffect(() => {
        fetchAnalytics()
    }, [])

    const fetchAnalytics = async () => {
        setLoading(true)
        try {
            // Fetch all invoices with client data
            const { data, error } = await supabase
                .from('invoices')
                .select(`
                    id, 
                    total, 
                    type,
                    created_at,
                    invoice_number,
                    cae,
                    client:clients (name, jurisdiction)
                `)
                .order('created_at', { ascending: false })

            if (error) throw error

            const formatted = (data || []).map(inv => ({
                ...inv,
                total: Number(inv.total) || 0,
                year: new Date(inv.created_at).getFullYear(),
                month: new Date(inv.created_at).getMonth(),
                state: inv.client?.jurisdiction || 'Sin Especificar'
            }))

            setInvoices(formatted)

        } catch (err) {
            console.error("Error fetching analytics:", err)
        } finally {
            setLoading(false)
        }
    }

    // Filtered Data Computation
    const filteredData = useMemo(() => {
        return invoices.filter(inv => {
            const matchesYear = inv.year === year
            const matchesType = invoiceType === 'Todas' || inv.type === invoiceType
            const matchesJurisdiction = jurisdiction === 'Todas' || inv.state === jurisdiction
            return matchesYear && matchesType && matchesJurisdiction
        })
    }, [invoices, year, invoiceType, jurisdiction])

    // Derived Statistics
    useEffect(() => {
        if (!filteredData) return

        // 1. KPIs
        const totalSales = filteredData.reduce((acc, curr) => acc + curr.total, 0)
        const invoiceCount = filteredData.length
        const avgTicket = invoiceCount > 0 ? totalSales / invoiceCount : 0
        const activeProvinces = new Set(filteredData.map(i => i.state)).size

        setStats({ totalSales, invoiceCount, avgTicket, activeProvinces })

        // 2. Monthly Sales (Ensure all 12 months present)
        const monthNames = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ]

        const monthlyData = monthNames.map((name, index) => {
            const monthInvoices = filteredData.filter(inv => inv.month === index)
            const total = monthInvoices.reduce((sum, inv) => sum + inv.total, 0)
            return {
                name,
                total,
                count: monthInvoices.length,
                percentage: totalSales > 0 ? (total / totalSales) * 100 : 0
            }
        })
        setMonthlySales(monthlyData)

        // 3. Top Clients
        const clientMap = {}
        filteredData.forEach(inv => {
            const name = inv.client?.name || 'Desconocido'
            if (!clientMap[name]) clientMap[name] = { name, total: 0, count: 0 }
            clientMap[name].total += inv.total
            clientMap[name].count += 1
        })
        setTopClients(Object.values(clientMap).sort((a, b) => b.total - a.total).slice(0, 10))

        // 4. Province Stats
        const provMap = {}
        filteredData.forEach(inv => {
            const state = inv.state
            if (!provMap[state]) provMap[state] = 0
            provMap[state] += inv.total
        })
        setProvinceSales(Object.keys(provMap).map(p => ({
            name: p,
            value: provMap[p],
            percentage: totalSales > 0 ? (provMap[p] / totalSales) * 100 : 0
        })).sort((a, b) => b.value - a.value))

    }, [filteredData])


    const formatCurrency = (value) => {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value)
    }

    const availableProvinces = [...new Set(invoices.map(i => i.state))].sort()

    return (
        <div className="p-8 h-[calc(100vh-64px)] overflow-y-auto custom-scrollbar flex flex-col gap-6">

            {/* Header + Filters */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Análisis y Reportes</h1>
                <p className="text-slate-500 mb-4 -mt-4">Visualiza el rendimiento de ventas y clientes</p>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 text-cyan-500 font-bold mb-4">
                        <Filter className="w-4 h-4" />
                        <h3>Filtros</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Año</label>
                            <select
                                value={year}
                                onChange={(e) => setYear(Number(e.target.value))}
                                className="bg-slate-950 border border-slate-800 text-white rounded-lg p-2.5 focus:border-cyan-500 outline-none"
                            >
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Tipo de Factura</label>
                            <select
                                value={invoiceType}
                                onChange={(e) => setInvoiceType(e.target.value)}
                                className="bg-slate-950 border border-slate-800 text-white rounded-lg p-2.5 focus:border-cyan-500 outline-none"
                            >
                                <option value="Todas">Todas</option>
                                <option value="A">Factura A</option>
                                <option value="B">Factura B</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Jurisdicción</label>
                            <select
                                value={jurisdiction}
                                onChange={(e) => setJurisdiction(e.target.value)}
                                className="bg-slate-950 border border-slate-800 text-white rounded-lg p-2.5 focus:border-cyan-500 outline-none"
                            >
                                <option value="Todas">Todas</option>
                                {availableProvinces.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group hover:scale-[1.02] transition-transform">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <TrendingUp className="w-8 h-8 opacity-80" />
                            <span className="text-xs font-bold opacity-70 bg-black/20 px-2 py-1 rounded">VENTAS TOTALES</span>
                        </div>
                        <h3 className="text-3xl font-bold mb-1">{formatCurrency(stats.totalSales)}</h3>
                        <p className="text-sm opacity-80">{stats.invoiceCount} facturas</p>
                    </div>
                </div>

                <div className="bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group hover:scale-[1.02] transition-transform">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <ShoppingBag className="w-8 h-8 opacity-80" />
                            <span className="text-xs font-bold opacity-70 bg-black/20 px-2 py-1 rounded">TICKET PROMEDIO</span>
                        </div>
                        <h3 className="text-3xl font-bold mb-1">{formatCurrency(stats.avgTicket)}</h3>
                        <p className="text-sm opacity-80">Por factura</p>
                    </div>
                </div>

                <div className="bg-gradient-to-r from-fuchsia-600 to-pink-500 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group hover:scale-[1.02] transition-transform">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <Map className="w-8 h-8 opacity-80" />
                            <span className="text-xs font-bold opacity-70 bg-black/20 px-2 py-1 rounded">PROVINCIAS</span>
                        </div>
                        <h3 className="text-3xl font-bold mb-1">{stats.activeProvinces}</h3>
                        <p className="text-sm opacity-80">Activas</p>
                    </div>
                </div>
            </div>

            {/* Tables Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Clients */}
                <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <Users className="w-5 h-5 text-cyan-500" />
                        Ranking de Clientes
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-950 border-b border-slate-800">
                                <tr>
                                    <th className="px-4 py-3">#</th>
                                    <th className="px-4 py-3">Cliente</th>
                                    <th className="px-4 py-3 text-right">Ventas</th>
                                    <th className="px-4 py-3 text-right">Facturas</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800 text-slate-300">
                                {topClients.map((client, i) => (
                                    <tr key={i} className="hover:bg-slate-800/50">
                                        <td className="px-4 py-3 text-cyan-500 font-bold">{i + 1}</td>
                                        <td className="px-4 py-3 font-medium">{client.name}</td>
                                        <td className="px-4 py-3 text-right font-mono font-bold text-white">
                                            {formatCurrency(client.total)}
                                        </td>
                                        <td className="px-4 py-3 text-right">{client.count}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Province Stats */}
                <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <Map className="w-5 h-5 text-cyan-500" />
                        Análisis por Provincia
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-950 border-b border-slate-800">
                                <tr>
                                    <th className="px-4 py-3">Provincia</th>
                                    <th className="px-4 py-3 text-right">Ventas</th>
                                    <th className="px-4 py-3 text-right">%</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800 text-slate-300">
                                {provinceSales.map((prov, i) => (
                                    <tr key={i} className="hover:bg-slate-800/50">
                                        <td className="px-4 py-3 font-medium">{prov.name}</td>
                                        <td className="px-4 py-3 text-right font-mono font-bold text-white">
                                            {formatCurrency(prov.value)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-cyan-500">
                                            {prov.percentage.toFixed(1)}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Monthly Sales */}
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-cyan-500" />
                    Ventas Mensuales {year}
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-950 border-b border-slate-800">
                            <tr>
                                <th className="px-4 py-3">Mes</th>
                                <th className="px-4 py-3 text-right">Ventas</th>
                                <th className="px-4 py-3 text-right">Facturas</th>
                                <th className="px-4 py-3 w-1/3">Visual</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {monthlySales.map((month, i) => (
                                <tr key={i} className="hover:bg-slate-800/50">
                                    <td className="px-4 py-3 text-slate-300 font-medium">{month.name}</td>
                                    <td className="px-4 py-3 text-right font-bold font-mono text-white">
                                        {formatCurrency(month.total)}
                                    </td>
                                    <td className="px-4 py-3 text-right text-slate-400">{month.count}</td>
                                    <td className="px-4 py-3">
                                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                                                style={{ width: `${month.percentage}%` }}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Invoice History */}
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-cyan-500" />
                        Historial de Facturas
                    </h3>
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg border border-slate-700 transition-colors">
                        <Download className="w-3 h-3" />
                        Exportar
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-950 border-b border-slate-800">
                            <tr>
                                <th className="px-4 py-3">Fecha</th>
                                <th className="px-4 py-3">Número</th>
                                <th className="px-4 py-3 text-center">Tipo</th>
                                <th className="px-4 py-3">Cliente</th>
                                <th className="px-4 py-3 text-right">Total</th>
                                <th className="px-4 py-3 text-right">CAE</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300">
                            {filteredData.map((inv, i) => (
                                <tr key={i} className="hover:bg-slate-800/50">
                                    <td className="px-4 py-3">{new Date(inv.created_at).toLocaleDateString('es-AR')}</td>
                                    <td className="px-4 py-3 font-mono text-cyan-400">{inv.invoice_number}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${inv.type === 'A' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                inv.type === 'B' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                                    inv.type === 'C' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                        'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                            }`}>
                                            {inv.type}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-medium text-white">{inv.client?.name}</td>
                                    <td className="px-4 py-3 text-right font-bold font-mono text-white">
                                        {formatCurrency(inv.total)}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-xs text-emerald-500">
                                        {inv.cae}
                                    </td>
                                </tr>
                            ))}
                            {filteredData.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="px-6 py-10 text-center text-slate-500">
                                        No se encontraron facturas con los filtros seleccionados
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    )
}

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Search,
    User,
    FileText,
    X,
    Download,
    RotateCcw,
    Eye,
    Receipt,
    Loader2,
    ChevronDown
} from 'lucide-react'
import { supabase } from '../supabaseClient'

const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value)
}

export function Accounts() {
    const [searchTerm, setSearchTerm] = useState('')
    const [clients, setClients] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedClient, setSelectedClient] = useState(null)

    useEffect(() => {
        fetchClients()
    }, [searchTerm])

    const fetchClients = async () => {
        setLoading(true)
        try {
            let query = supabase
                .from('clients')
                .select('*')
                .order('name')

            if (searchTerm) {
                // Search by name or CUIT
                query = query.or(`name.ilike.%${searchTerm}%,cuit.ilike.%${searchTerm}%`)
            }

            const { data, error } = await query

            if (error) throw error
            setClients(data || [])
        } catch (err) {
            console.error('Error fetching clients:', err)
            // Mock Data Fallback
            if (searchTerm === '') {
                setClients([
                    { id: 1, name: 'ALAN MARTIN FENIGER', cuit: '20297512197', condition: 'Resp. Inscripto' },
                    { id: 2, name: 'ARIEL RUBEN CORDON', cuit: '20076136476', condition: 'Resp. Inscripto' },
                    { id: 3, name: 'BARBARA SARHAYD HOSTOS GOMEZ', cuit: '27956676768', condition: 'Resp. Inscripto' },
                    { id: 4, name: 'DONGSHENG LIAN', cuit: '20940174105', condition: 'Resp. Inscripto' },
                    { id: 5, name: 'ENJOY S. A. S.', cuit: '30717515828', condition: 'Resp. Inscripto' },
                    { id: 6, name: 'EVERMORE S.R.L.', cuit: '30712281959', condition: 'Resp. Inscripto' },
                ])
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="bg-gradient-to-r from-cyan-500 to-blue-600 w-8 h-8 rounded-lg flex items-center justify-center text-white">
                            <Receipt className="w-5 h-5" />
                        </span>
                        Cuentas Corrientes
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Gestión y estado de cuenta de clientes</p>
                </div>

                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Buscar por Nombre o CUIT..."
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-slate-900 dark:text-white transition-all shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {clients.map(client => (
                        <ClientCard
                            key={client.id}
                            client={client}
                            onClick={() => setSelectedClient(client)}
                        />
                    ))}
                </div>
            )}

            {selectedClient && (
                <AccountStatusModal
                    client={selectedClient}
                    onClose={() => setSelectedClient(null)}
                />
            )}
        </div>
    )
}

function ClientCard({ client, onClick }) {
    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm hover:shadow-md hover:border-cyan-500/30 transition-all group relative overflow-hidden">
            <div className="flex items-start justify-between mb-2">
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:bg-cyan-500/10 group-hover:text-cyan-500 transition-colors">
                    <User className="w-4 h-4" />
                </div>
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-medium">
                    {client.condition || 'Consumidor Final'}
                </span>
            </div>

            <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate mb-0.5" title={client.name}>
                {client.name}
            </h3>
            <p className="text-[10px] text-slate-500 font-mono mb-3">CUIT: {client.cuit}</p>

            <button
                onClick={onClick}
                className="w-full py-1.5 flex items-center justify-center gap-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-[11px] font-medium transition-colors border border-slate-200 dark:border-slate-700"
            >
                <FileText className="w-3 h-3" />
                Ver Estado
            </button>
        </div>
    )
}

function AccountStatusModal({ client, onClose }) {
    const navigate = useNavigate()
    const [invoices, setInvoices] = useState([])
    const [stats, setStats] = useState({ total_billed: 0, count: 0 })
    const [loading, setLoading] = useState(true)
    const [selectedPdf, setSelectedPdf] = useState(null)
    const [expandedInvoices, setExpandedInvoices] = useState(new Set())

    useEffect(() => {
        const fetchInvoices = async () => {
            setLoading(true)
            try {
                // Fetch invoices linked to client ID (exclude credit notes from main list)
                const { data, error } = await supabase
                    .from('invoices')
                    .select('*')
                    .eq('client_id', client.id)
                    .neq('type', 'NC')
                    .order('created_at', { ascending: false })

                if (error) throw error

                // Fetch all credit notes for this client
                const { data: creditNotes } = await supabase
                    .from('invoices')
                    .select('*')
                    .eq('client_id', client.id)
                    .eq('type', 'NC')
                    .order('created_at', { ascending: false })

                const formattedInvoices = (data || []).map(inv => {
                    // Check if invoice_number looks like a UUID (contains dashes and is long)
                    const isUUID = inv.invoice_number && inv.invoice_number.includes('-') && inv.invoice_number.length > 20

                    // If it's a UUID, try to use 'number' field or format the UUID nicely
                    let displayNumber = inv.invoice_number || inv.number || 'N/A'
                    if (isUUID) {
                        // Try to use the 'number' field if it exists and is not a UUID
                        if (inv.number && !inv.number.includes('-')) {
                            displayNumber = inv.number
                        } else {
                            // Format UUID to show last 8 characters
                            displayNumber = `#${inv.invoice_number.slice(-8).toUpperCase()}`
                        }
                    }

                    // Find related credit notes for this invoice
                    const relatedCreditNotes = (creditNotes || []).filter(
                        cn => cn.original_invoice_id === inv.id
                    )

                    return {
                        id: inv.id,
                        date: inv.date || inv.created_at,
                        number: displayNumber,
                        type: inv.type ? inv.type.replace('Factura ', '').trim() : 'N/A',
                        total: inv.total,
                        cae: inv.cae,
                        url: inv.pdf_url,
                        client_id: inv.client_id,
                        client_name: inv.client_name,
                        client_cuit: inv.client_cuit,
                        creditNotes: relatedCreditNotes.map(cn => ({
                            id: cn.id,
                            number: cn.invoice_number,
                            date: cn.date || cn.created_at,
                            total: cn.total,
                            cae: cn.cae,
                            url: cn.pdf_url
                        }))
                    }
                })

                setInvoices(formattedInvoices)
                setStats({
                    total_billed: formattedInvoices.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0),
                    count: formattedInvoices.length
                })

            } catch (err) {
                console.error('Error fetching invoices:', err)
                setInvoices([])
            } finally {
                setLoading(false)
            }
        }

        if (client?.id) {
            fetchInvoices()
        }
    }, [client])

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-950 w-full max-w-4xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Estado de Cuenta</h2>
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
                                <span className="uppercase">{client.name}</span>
                                <span>•</span>
                                <span>{client.cuit}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto bg-slate-50/50 dark:bg-slate-950">

                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="bg-slate-900 dark:bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden group">
                            <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <DollarSignIcon />
                            </div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total Facturado Histórico</p>
                            <h3 className="text-3xl font-bold text-emerald-400 font-mono tracking-tight">
                                {formatCurrency(stats.total_billed)}
                            </h3>
                        </div>

                        <div className="bg-slate-900 dark:bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden group">
                            <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <FileText className="w-16 h-16 text-cyan-400" />
                            </div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Cantidad de Comprobantes</p>
                            <div className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-cyan-500" />
                                <h3 className="text-3xl font-bold text-white font-mono">
                                    {stats.count}
                                </h3>
                            </div>
                        </div>
                    </div>

                    {/* Table Section */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-lg">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Historial de Movimientos</h3>
                            <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                <Download className="w-3.5 h-3.5" />
                                Descargar Reporte
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                                    <tr>
                                        <th className="px-6 py-3">Fecha</th>
                                        <th className="px-6 py-3">Número</th>
                                        <th className="px-6 py-3">Tipo</th>
                                        <th className="px-6 py-3 text-right">Total</th>
                                        <th className="px-6 py-3 text-center">CAE</th>
                                        <th className="px-6 py-3 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {invoices.map((inv) => {
                                        const isExpanded = expandedInvoices.has(inv.id)
                                        const hasCreditNotes = inv.creditNotes && inv.creditNotes.length > 0

                                        return (
                                            <React.Fragment key={inv.id}>
                                                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                    <td className="px-6 py-3 font-medium text-slate-700 dark:text-slate-300">
                                                        <div className="flex items-center gap-2">
                                                            {hasCreditNotes && (
                                                                <button
                                                                    onClick={() => {
                                                                        const newExpanded = new Set(expandedInvoices)
                                                                        if (isExpanded) {
                                                                            newExpanded.delete(inv.id)
                                                                        } else {
                                                                            newExpanded.add(inv.id)
                                                                        }
                                                                        setExpandedInvoices(newExpanded)
                                                                    }}
                                                                    className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                                                                >
                                                                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                                </button>
                                                            )}
                                                            {new Date(inv.date).toLocaleDateString('es-AR')}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3 font-mono text-slate-500">
                                                        <div className="flex items-center gap-2">
                                                            {inv.number}
                                                            {hasCreditNotes && (
                                                                <span className="px-1.5 py-0.5 bg-orange-500/10 text-orange-400 text-[10px] rounded border border-orange-500/20 font-bold">
                                                                    {inv.creditNotes.length} NC
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold font-mono">
                                                            {inv.type}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-3 text-right font-bold text-white font-mono">
                                                        {formatCurrency(inv.total)}
                                                    </td>
                                                    <td className="px-6 py-3 text-center font-mono text-emerald-500 text-[10px]">
                                                        {inv.cae}
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => inv.url && setSelectedPdf(inv)}
                                                                disabled={!inv.url}
                                                                className={`p-1.5 rounded transition-colors group relative inline-flex ${inv.url
                                                                    ? 'text-cyan-400 hover:bg-cyan-400/10 cursor-pointer'
                                                                    : 'text-slate-600 cursor-not-allowed opacity-50'
                                                                    }`}
                                                                title={inv.url ? "Ver PDF" : "PDF no disponible"}
                                                            >
                                                                <FileText className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => navigate('/credit-note', { state: { invoice: inv } })}
                                                                className="p-1.5 text-rose-400 hover:bg-rose-400/10 rounded transition-colors group relative"
                                                                title="Generar Nota de Crédito"
                                                            >
                                                                <RotateCcw className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>

                                                {/* Credit Notes Expansion */}
                                                {isExpanded && hasCreditNotes && (
                                                    <tr className="bg-slate-800/20">
                                                        <td colSpan="6" className="px-6 py-3">
                                                            <div className="pl-8 space-y-2">
                                                                <div className="text-xs font-bold text-orange-400 mb-2">Notas de Crédito Asociadas:</div>
                                                                {inv.creditNotes.map(cn => (
                                                                    <div key={cn.id} className="flex items-center justify-between bg-slate-900 border border-slate-700 rounded-lg px-4 py-2">
                                                                        <div className="flex items-center gap-4 text-xs">
                                                                            <span className="text-slate-400">
                                                                                {new Date(cn.date).toLocaleDateString('es-AR')}
                                                                            </span>
                                                                            <span className="font-mono text-orange-400">
                                                                                NC: {cn.number}
                                                                            </span>
                                                                            <span className="font-mono text-emerald-500 text-[10px]">
                                                                                CAE: {cn.cae}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex items-center gap-3">
                                                                            <span className="font-bold text-orange-400 font-mono">
                                                                                {formatCurrency(cn.total)}
                                                                            </span>
                                                                            {cn.url && (
                                                                                <button
                                                                                    onClick={() => setSelectedPdf(cn)}
                                                                                    className="p-1 text-cyan-400 hover:bg-cyan-400/10 rounded transition-colors"
                                                                                    title="Ver PDF de NC"
                                                                                >
                                                                                    <FileText className="w-3.5 h-3.5" />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {invoices.length === 0 && !loading && (
                            <div className="p-8 text-center text-slate-500 text-sm">
                                No se encontraron movimientos.
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
                    >
                        Cerrar
                    </button>
                </div>

                {selectedPdf && (
                    <PdfViewerModal
                        invoice={selectedPdf}
                        onClose={() => setSelectedPdf(null)}
                    />
                )}
            </div>
        </div>
    )
}

function PdfViewerModal({ invoice, onClose }) {
    if (!invoice?.url) return null

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#1a1c23] w-full max-w-6xl h-[90vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl border border-slate-700">
                {/* PDF Header */}
                <div className="px-6 py-4 bg-[#0F1115] border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-500">
                            <Eye className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Vista Previa de Factura</h2>
                            <div className="flex items-center gap-3 text-xs font-mono mt-1">
                                <span className="text-slate-400">Factura_{invoice.number}.pdf</span>
                                {invoice.cae && (
                                    <span className="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded border border-emerald-500/20 font-bold flex items-center gap-1">
                                        CAE: {invoice.cae}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <a
                            href={invoice.url}
                            download={`Factura_${invoice.number}.pdf`}
                            className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Descargar PDF
                        </a>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* PDF Content */}
                <div className="flex-1 bg-slate-900 relative">
                    <iframe
                        src={`${invoice.url}#toolbar=1&view=FitH`}
                        className="w-full h-full"
                        title="PDF Viewer"
                    />
                </div>
            </div>
        </div>
    )
}

// Helpers
const DollarSignIcon = () => (
    <svg className="w-16 h-16 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
)

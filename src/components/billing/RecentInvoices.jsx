import { useState, useEffect } from 'react'
import { FileText, ExternalLink, Clock } from 'lucide-react'
import { supabase } from '../../supabaseClient'

const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value)
}

const TYPE_STYLES = {
    'A': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'B': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'C': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'NC': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    'M': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
}

const getTypeBadgeClass = (type) => TYPE_STYLES[type] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'

/**
 * Compact list of recently emitted invoices.
 * Placed in the Billing sidebar; refreshes when `refreshKey` changes.
 */
export function RecentInvoices({ refreshKey = 0 }) {
    const [invoices, setInvoices] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchRecent()
    }, [refreshKey])

    const fetchRecent = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('invoices')
            .select(`
                id,
                invoice_number,
                type,
                total,
                cae,
                date,
                created_at,
                pdf_url,
                clients ( name )
            `)
            .or('is_quote.eq.false,is_quote.is.null')
            .order('created_at', { ascending: false })
            .limit(5)

        if (!error && data) {
            setInvoices(data)
        }
        setLoading(false)
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return ''
        const d = new Date(dateStr)
        return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
    }

    if (loading && invoices.length === 0) {
        return (
            <div className="mt-4 pt-4 border-t border-slate-800">
                <div className="flex items-center gap-2 text-slate-500 text-xs mb-3">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="font-bold uppercase tracking-wider">Últimas Emitidas</span>
                </div>
                <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-12 bg-slate-900/50 rounded-lg animate-pulse" />
                    ))}
                </div>
            </div>
        )
    }

    if (invoices.length === 0) return null

    return (
        <div className="mt-4 pt-4 border-t border-slate-800">
            <div className="flex items-center gap-2 text-slate-500 text-xs mb-3">
                <Clock className="w-3.5 h-3.5" />
                <span className="font-bold uppercase tracking-wider">Últimas Emitidas</span>
            </div>

            <div className="space-y-1.5">
                {invoices.map(inv => (
                    <div
                        key={inv.id}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 flex items-center justify-between gap-2 hover:border-slate-700 transition-colors group"
                    >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${getTypeBadgeClass(inv.type)}`}>
                                {inv.type}
                            </span>
                            <div className="min-w-0">
                                <div className="text-xs text-white font-medium truncate">
                                    {inv.clients?.name || 'Sin cliente'}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
                                    <span>#{inv.invoice_number}</span>
                                    <span>•</span>
                                    <span>{formatDate(inv.date)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-mono text-cyan-400 font-bold">
                                {formatCurrency(inv.total)}
                            </span>
                            {inv.pdf_url && (
                                <a
                                    href={inv.pdf_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-slate-600 hover:text-cyan-400 transition-colors opacity-0 group-hover:opacity-100"
                                    title="Ver PDF"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

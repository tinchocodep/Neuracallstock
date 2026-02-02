import { useState, useEffect } from 'react'
import {
    Search,
    RotateCcw,
    History,
    Plus,
    FileText,
    CheckCircle2,
    ChevronRight,
    ArrowLeft
} from 'lucide-react'
import { supabase } from '../supabaseClient'
import { InvoiceResultModal } from '../components/billing/InvoiceResultModal'

const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value)
}

export function Returns() {
    const [view, setView] = useState('new') // 'history' | 'new'

    return (
        <div className="p-6 h-[calc(100vh-64px)] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="bg-gradient-to-r from-rose-500 to-orange-600 w-8 h-8 rounded-lg flex items-center justify-center text-white">
                            <RotateCcw className="w-5 h-5" />
                        </span>
                        Devoluciones
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Gestión de devoluciones y notas de crédito</p>
                </div>

                <div className="flex bg-slate-100 dark:bg-slate-900 rounded-xl p-1 border border-slate-200 dark:border-slate-800">
                    <button
                        onClick={() => setView('new')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${view === 'new'
                            ? 'bg-cyan-600 text-white shadow-lg'
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            }`}
                    >
                        <RotateCcw className="w-4 h-4" />
                        Nueva Devolución
                    </button>
                    <button
                        onClick={() => setView('history')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${view === 'history'
                            ? 'bg-cyan-600 text-white shadow-lg'
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            }`}
                    >
                        <History className="w-4 h-4" />
                        Historial NC
                    </button>
                </div>
            </div>

            {view === 'history' ? <ReturnsHistory /> : <NewReturn onCancel={() => setView('history')} />}
        </div>
    )
}

function ReturnsHistory() {
    const [history, setHistory] = useState([])

    return (
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl flex-1 overflow-hidden flex flex-col shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                        <tr>
                            <th className="px-6 py-4">Fecha</th>
                            <th className="px-6 py-4">Tipo</th>
                            <th className="px-6 py-4">Nota de Crédito</th>
                            <th className="px-6 py-4">Factura Original</th>
                            <th className="px-6 py-4">Cliente</th>
                            <th className="px-6 py-4 text-center">Items</th>
                            <th className="px-6 py-4 text-right">Total</th>
                            <th className="px-6 py-4 text-right">CAE</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {history.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="px-6 py-20 text-center text-slate-500">
                                    No hay notas de crédito registradas
                                </td>
                            </tr>
                        ) : (
                            history.map((item, i) => (
                                <tr key={i}>
                                    {/* Map rows here */}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function NewReturn({ onCancel }) {
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedInvoice, setSelectedInvoice] = useState(null)
    const [invoices, setInvoices] = useState([])
    const [loading, setLoading] = useState(false)
    const [creditNoteResult, setCreditNoteResult] = useState(null)

    useEffect(() => {
        fetchInvoices()
    }, [searchTerm])

    const fetchInvoices = async () => {
        setLoading(true)
        try {
            // NOTE: This assumes 'invoices' table exists with related 'invoice_items' or 'invoices_detail'
            // Since schema varies, we'll try to fetch. If it fails, we fall back to mock data.
            // NOTE: We only join 'clients' and 'invoice_items'. 
            // We use the 'product_name' directly from 'invoice_items' as requested by user.
            // This avoids potential missing FK/RLS issues with 'products' table.
            let query = supabase
                .from('invoices')
                .select(`
                    id, 
                    invoice_number, 
                    type, 
                    total, 
                    cae, 
                    created_at,
                    client:clients (*),
                    items:invoice_items (
                        id,
                        quantity,
                        unit_price,
                        product_name,
                        product_id,
                        product:products (
                            sku,
                            dispatch_number,
                            origin
                        )
                    )
                `)
                .neq('type', 'NC') // Exclude credit notes from Returns module
                .order('created_at', { ascending: false })

            // Execute query
            const { data, error } = await query
            if (error) {
                console.error("Supabase Query Error:", error)
                throw error
            }

            let filtered = data || []

            // ALWAYS exclude credit notes from Returns module
            filtered = filtered.filter(inv => inv.type !== 'NC')

            if (searchTerm) {
                filtered = filtered.filter(inv =>
                    inv.invoice_number?.includes(searchTerm) ||
                    inv.client?.name?.toLowerCase().includes(searchTerm.toLowerCase())
                )
            } else {
                // If no search term, take latest 50
                filtered = filtered.slice(0, 50)
            }

            // Map to UI format
            const formatted = filtered.map(inv => ({
                id: inv.id,
                number: inv.invoice_number,
                type: inv.type || 'A',
                client: inv.client,
                clientName: inv.client?.name || 'Cliente Desconocido',
                date: new Date(inv.created_at).toLocaleDateString('es-AR'),
                total: inv.total,
                cae: inv.cae,
                items: inv.items?.map(item => {
                    // Get data from products table if available
                    let dispatch = item.product?.dispatch_number || '-'
                    let origin = item.product?.origin || '-'
                    let sku = item.product?.sku || ''
                    const name = item.product_name || 'Item Desconocido'

                    // Fallback: parse Dispatch/Origin from name string if not in products table
                    if (dispatch === '-' || origin === '-') {
                        const match = name.match(/\(Desp:\s*(.*?)\s*Org:\s*(.*?)\)/)
                        if (match) {
                            if (dispatch === '-') dispatch = match[1]
                            if (origin === '-') origin = match[2]
                        }
                    }

                    return {
                        id: item.id,
                        productId: item.product_id,
                        name: name,
                        sku: sku,
                        dispatch: dispatch,
                        origin: origin,
                        price: item.unit_price,
                        stock: item.quantity // Original quantity sold
                    }
                }) || []
            }))


            // Fetch credit notes for all invoices to check which are fully refunded
            const { data: creditNotes, error: cnError } = await supabase
                .from('invoices')
                .select('original_invoice_id, total, invoice_number')
                .eq('type', 'NC')
                .in('original_invoice_id', formatted.map(inv => inv.id))

            console.log('=== CREDIT NOTES FETCHED ===', creditNotes)
            if (cnError) console.error('Error fetching credit notes:', cnError)

            // Calculate total refunded for each invoice
            const refundedTotals = {}
            creditNotes?.forEach(cn => {
                if (cn.original_invoice_id) {
                    // NC totals are negative, so we need absolute value
                    const cnAmount = Math.abs(cn.total)
                    refundedTotals[cn.original_invoice_id] = (refundedTotals[cn.original_invoice_id] || 0) + cnAmount
                    console.log(`NC ${cn.invoice_number}: $${cnAmount} for invoice ${cn.original_invoice_id}`)
                }
            })

            console.log('=== REFUNDED TOTALS ===', refundedTotals)

            // Filter out invoices that are fully refunded
            const availableForReturn = formatted.filter(inv => {
                const refunded = refundedTotals[inv.id] || 0
                const invoiceTotal = Math.abs(inv.total)
                const isFullyRefunded = refunded >= invoiceTotal - 0.01 // Allow for floating point errors

                console.log(`Invoice ${inv.number}: Total=$${invoiceTotal}, Refunded=$${refunded}, FullyRefunded=${isFullyRefunded}`)

                return !isFullyRefunded
            })

            console.log(`=== FILTERING RESULTS: ${formatted.length} invoices -> ${availableForReturn.length} available for return ===`)

            setInvoices(availableForReturn)

            if (formatted.length === 0 && searchTerm) {
                console.log("No found invoices in DB matching search");
            }

        } catch (err) {
            console.error("Error fetching invoices:", err)
            // No rollback to mocks
            setInvoices([])
        } finally {
            setLoading(false)
        }
    }

    const filteredInvoices = invoices // Filtering happens in fetch now or fallback


    return (
        <>
            <div className="flex gap-6 h-full overflow-hidden">
                {/* Left Panel: Invoice List */}
                <div className="w-1/3 flex flex-col gap-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-4">
                        <h3 className="text-white font-bold flex items-center gap-2">
                            <Search className="w-4 h-4 text-cyan-500" />
                            Buscar Factura con Saldo
                        </h3>
                        <input
                            type="text"
                            placeholder="Buscar por número, cliente..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                        {filteredInvoices.map(inv => (
                            <div
                                key={inv.id}
                                onClick={() => setSelectedInvoice(inv)}
                                className={`p-4 rounded-xl border cursor-pointer transition-all group ${selectedInvoice?.id === inv.id
                                    ? 'bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border-cyan-500/50 shadow-lg shadow-cyan-900/10'
                                    : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-800'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-mono text-cyan-500 font-bold">{inv.number}</span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${inv.type === 'A' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                        inv.type === 'B' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                            inv.type === 'C' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                        }`}>
                                        {inv.type}
                                    </span>
                                </div>
                                <h4 className="text-white font-bold text-sm mb-3 truncate">{inv.clientName}</h4>
                                <div className="flex justify-between items-end">
                                    <span className="text-slate-500 text-xs">{inv.date}</span>
                                    <span className="text-emerald-400 font-bold font-mono">{formatCurrency(inv.total)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Panel: Return Details */}
                <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col overflow-hidden">
                    {selectedInvoice ? (
                        <ReturnDetails
                            invoice={selectedInvoice}
                            setCreditNoteResult={setCreditNoteResult}
                            setSelectedInvoice={setSelectedInvoice}
                        />
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
                            <FileText className="w-16 h-16 mb-4 opacity-20" />
                            <p>Selecciona una factura para comenzar la devolución</p>
                        </div>
                    )}
                </div>
            </div>

            <InvoiceResultModal
                isOpen={!!creditNoteResult}
                onClose={() => {
                    setCreditNoteResult(null)
                    setSelectedInvoice(null) // Return to invoice list
                }}
                invoiceData={creditNoteResult}
            />
        </>
    )
}

function ReturnDetails({ invoice, setCreditNoteResult, setSelectedInvoice }) {
    const [returnQuantities, setReturnQuantities] = useState({})
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Reset quantities when invoice changes
    useEffect(() => {
        setReturnQuantities({})
    }, [invoice.id])

    const handleQuantityChange = (itemId, val) => {
        const num = parseInt(val) || 0
        setReturnQuantities(prev => ({
            ...prev,
            [itemId]: num
        }))
    }

    const totalRefund = (invoice.items || []).reduce((acc, item) => {
        const qty = returnQuantities[item.id] || 0
        return acc + (qty * item.price)
    }, 0)

    const totalItems = Object.values(returnQuantities).reduce((a, b) => a + b, 0)

    const handleGenerateCreditNote = async () => {
        setIsSubmitting(true)
        try {
            const webhookUrl = import.meta.env.VITE_INVOICE_WEBHOOK_URL || 'https://n8n.neuracall.net/webhook-test/NeuraUSUARIOPRUEBA'

            // Prepare items to return
            const itemsToReturn = invoice.items
                .filter(item => returnQuantities[item.id] > 0)
                .map(item => ({
                    productId: item.id,
                    productName: item.name,
                    quantity: returnQuantities[item.id],
                    unitPrice: item.price,
                    vatRate: 0, // Credit notes typically don't have VAT
                    sku: item.sku || '',
                    dispatchNumber: item.dispatch || '',
                    origin: item.origin || '',
                    subtotal: returnQuantities[item.id] * item.price
                }))

            const payload = {
                type: invoice.type, // Mismo tipo que la factura original (A, B, C, etc.)
                creditnote: true, // Flag para indicar que es nota de crédito
                originalInvoiceNumber: invoice.number,
                originalInvoiceCae: invoice.cae || '',
                client: invoice.client,
                items: itemsToReturn,
                totals: {
                    subtotal: totalRefund,
                    discountPercentage: 0,
                    discountAmount: 0,
                    netTaxable: totalRefund,
                    vatTotal: 0,
                    total: totalRefund
                },
                date: new Date().toISOString().split('T')[0]
            }

            console.log('=== CREDIT NOTE PAYLOAD ===')
            console.log(JSON.stringify(payload, null, 2))

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (response.ok) {
                // Log all headers for debugging
                console.log('=== RESPONSE HEADERS ===')
                for (let [key, value] of response.headers.entries()) {
                    console.log(`${key}: ${value}`)
                }

                const cae = response.headers.get('CAE') || response.headers.get('x-cae')
                const creditNoteId = response.headers.get('x-invoice-id')
                const creditNoteNumber = response.headers.get('x-invoice-number')

                console.log('Credit Note CAE:', cae)
                console.log('Credit Note Number:', creditNoteNumber)

                // CRITICAL: Only return stock if CAE is received (confirms note was registered in AFIP)
                if (!cae) {
                    console.error('No CAE received from webhook')
                    throw new Error('La nota de crédito no fue registrada en AFIP. No se recibió CAE.')
                }

                // Return stock to inventory ONLY after CAE confirmation
                console.log('=== RETURNING STOCK TO INVENTORY ===')
                for (const item of itemsToReturn) {
                    const quantityToReturn = item.quantity

                    // Get current stock
                    const { data: productData, error: fetchError } = await supabase
                        .from('products')
                        .select('stock')
                        .eq('id', item.productId)
                        .maybeSingle()

                    if (fetchError) {
                        console.error(`Error fetching product ${item.productId}:`, fetchError)
                        continue
                    }

                    if (productData) {
                        const currentStock = Number(productData.stock) || 0
                        const newStock = currentStock + quantityToReturn

                        console.log(`Returning ${quantityToReturn} units of ${item.productName}:`, {
                            currentStock,
                            quantityToReturn,
                            newStock
                        })

                        const { error: stockError } = await supabase
                            .from('products')
                            .update({ stock: newStock })
                            .eq('id', item.productId)

                        if (stockError) {
                            console.error(`Error returning stock for ${item.productName}:`, stockError)
                        } else {
                            console.log(`✓ Stock returned for ${item.productName}`)
                        }
                    }
                }
                console.log('=== STOCK RETURN COMPLETE ===')

                // Save credit note to database and upload PDF
                console.log('=== SAVING CREDIT NOTE TO DATABASE ===')

                // Get PDF blob from response
                const pdfBlob = await response.blob()

                // Upload PDF to Supabase Storage
                const fileName = `credit_note_${creditNoteNumber || creditNoteId}_${Date.now()}.pdf`
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('invoices')
                    .upload(fileName, pdfBlob, {
                        contentType: 'application/pdf',
                        upsert: false
                    })

                let pdfUrl = null
                if (uploadError) {
                    console.error('Error uploading PDF:', uploadError)
                } else {
                    const { data: { publicUrl } } = supabase.storage
                        .from('invoices')
                        .getPublicUrl(fileName)
                    pdfUrl = publicUrl
                    console.log('PDF uploaded successfully:', pdfUrl)
                }

                // Get company_id from client
                const companyId = invoice.client?.company_id || '7f85f721-c30a-4195-a393-f5b00beebfd9'

                // Save credit note to invoices table
                const { data: creditNoteData, error: saveError } = await supabase
                    .from('invoices')
                    .insert({
                        invoice_number: creditNoteNumber || creditNoteId,
                        type: 'NC', // Nota de Crédito
                        client_id: invoice.client?.id,
                        company_id: companyId,
                        subtotal: -Math.abs(totalRefund),
                        discount_percentage: 0,
                        discount_amount: 0,
                        net_taxable: -Math.abs(totalRefund),
                        vat_total: 0,
                        total: -Math.abs(totalRefund), // Negative for credit note
                        cae: cae,
                        date: new Date().toISOString(),
                        pdf_url: pdfUrl,
                        original_invoice_id: invoice.id // Link to original invoice
                    })
                    .select()
                    .single()

                if (saveError) {
                    console.error('Error saving credit note:', saveError)
                } else {
                    console.log('✓ Credit note saved to database:', creditNoteData)
                }

                // Show preview modal with credit note result
                setCreditNoteResult({
                    cae: cae,
                    invoiceNumber: creditNoteNumber || creditNoteId,
                    pdfUrl: pdfUrl
                })

                // Reset quantities (selectedInvoice will be reset when modal closes)
                setReturnQuantities({})
            } else {
                // Try to get error details from response
                let errorMessage = 'Error del servidor'
                try {
                    const errorData = await response.json()
                    errorMessage = errorData.message || errorData.error || JSON.stringify(errorData)
                } catch (e) {
                    errorMessage = `HTTP ${response.status}: ${response.statusText}`
                }
                console.error('Server error response:', errorMessage)
                throw new Error(errorMessage)
            }
        } catch (error) {
            console.error('Error generating credit note:', error)
            alert('Hubo un error al generar la nota de crédito: ' + error.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-cyan-500" />
                    Detalle de Devolución
                </h3>
                <div className="text-right">
                    <div className="flex items-center gap-2 justify-end mb-1">
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-white/10 text-white border border-white/20">
                            {invoice.type} {invoice.number}
                        </span>
                    </div>
                    <p className="text-[10px] text-cyan-600 font-mono">CAE: {invoice.cae}</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {invoice.items && invoice.items.length > 0 ? (
                    invoice.items.map(item => (
                        <div key={item.id} className="bg-slate-950/50 border border-slate-800 rounded-xl p-4">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="text-white font-bold text-sm mb-1">{item.name}</h4>
                                    <p className="text-xs text-slate-500">
                                        (Desp: {item.dispatch} Org: {item.origin})
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Precio Unit: <span className="text-slate-300 font-mono">{formatCurrency(item.price)}</span>
                                    </p>
                                </div>
                                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded text-[10px] font-bold">
                                    Disp: {item.stock}
                                </span>
                            </div>

                            <div className="flex items-center gap-4 bg-slate-900 p-2 rounded-lg border border-slate-800">
                                <span className="text-xs font-bold text-slate-400 uppercase ml-2">DEVOLVER:</span>
                                <input
                                    type="number"
                                    min="0"
                                    max={item.stock}
                                    value={returnQuantities[item.id] || ''}
                                    onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                    placeholder="0"
                                    className="flex-1 bg-transparent text-right text-white font-mono outline-none px-2"
                                />
                                <span className="text-xs text-slate-500 mr-2">unid.</span>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-10 text-slate-600">
                        No hay items disponibles para devolver en esta factura.
                    </div>
                )}
            </div>

            <div className="mt-6 pt-6 border-t border-slate-800">
                <div className="flex justify-between items-center mb-6">
                    <span className="text-slate-400 text-sm">Devolviendo</span>
                    <span className="text-white font-bold">{totalItems} items</span>
                </div>
                <div className="flex justify-between items-center mb-8">
                    <span className="text-white font-bold text-lg">Total a Reintegrar</span>
                    <span className="text-cyan-400 font-bold text-2xl font-mono">{formatCurrency(totalRefund)}</span>
                </div>

                <button
                    disabled={totalItems === 0 || isSubmitting}
                    onClick={handleGenerateCreditNote}
                    className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-cyan-900/20 flex items-center justify-center gap-2"
                >
                    {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                        <>
                            <CheckCircle2 className="w-5 h-5" />
                            Generar Nota de Crédito
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}

import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useCompanyConfig } from '../hooks/useCompanyConfig'

const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value)
}

export function CreditNote() {
    const location = useLocation()
    const navigate = useNavigate()
    const { config: companyConfig } = useCompanyConfig()
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [pdfUrl, setPdfUrl] = useState(null)

    // Get invoice data from navigation state
    const invoice = location.state?.invoice

    useEffect(() => {
        if (!invoice) {
            // If no invoice data, redirect back to accounts
            navigate('/accounts')
        }
    }, [invoice, navigate])

    const generateCreditNote = async () => {
        setLoading(true)
        setResult(null)
        setPdfUrl(null)

        try {
            // PRODUCCIÓN: Usar webhook de producción (no test)
            const webhookUrl = 'https://n8n.neuracall.net/webhook/NeuraUSUARIOPRUEBA'

            if (!webhookUrl) {
                throw new Error('Webhook URL no configurada')
            }

            // Fetch full invoice details including items
            const { data: fullInvoice, error: fetchError } = await supabase
                .from('invoices')
                .select('*, items:invoice_items(*)')
                .eq('id', invoice.id)
                .single()

            if (fetchError) throw fetchError

            const payload = {
                type: invoice.type.replace('Factura', 'Nota de Crédito'), // Convert "Factura B" to "Nota de Crédito B"
                client: {
                    id: invoice.client_id,
                    name: invoice.client_name,
                    cuit: invoice.client_cuit,
                    address: invoice.client_address || '',
                    taxCondition: invoice.client_tax_condition || 'Responsable Inscripto',
                    jurisdiction: invoice.client_jurisdiction || 'CABA',
                    email: invoice.client_email || ''
                },
                items: (fullInvoice.items || []).map(item => ({
                    productId: item.product_id,
                    productName: item.product_name,
                    quantity: Number(item.quantity) || 0,
                    unitPrice: Number(item.unit_price) || 0,
                    vatRate: Number(item.vat_rate) || 0,
                    sku: item.sku || '',
                    dispatchNumber: item.dispatch_number || '',
                    origin: item.origin || '',
                    subtotal: Number(item.subtotal) || 0
                })),
                subtotal: Number(invoice.subtotal) || 0,
                discountPercentage: Number(invoice.discount_percentage) || 0,
                discountAmount: Number(invoice.discount_amount) || 0,
                netTaxable: Number(invoice.net_taxable) || 0,
                vatTotal: Number(invoice.vat_total) || 0,
                total: Number(invoice.total) || 0,
                originalInvoice: {
                    number: invoice.number,
                    cae: invoice.cae,
                    date: invoice.date
                },
                date: new Date().toISOString()
            }

            console.log('=== CREDIT NOTE PAYLOAD ===')
            console.log(JSON.stringify(payload, null, 2))
            console.log('===========================')

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const contentType = response.headers.get('content-type') || ''
            const cae = response.headers.get('CAE') || response.headers.get('x-cae')
            const creditNoteId = response.headers.get('x-invoice-id') || response.headers.get('x-credit-note-id')

            console.log('=== RESPONSE HEADERS ===')
            response.headers.forEach((value, key) => {
                console.log(`${key}: ${value}`)
            })
            console.log('========================')

            let finalPdfUrl = null

            if (!contentType.includes('application/json')) {
                // Binary PDF response
                const pdfBlob = await response.blob()
                const blobUrl = URL.createObjectURL(pdfBlob)
                setPdfUrl(blobUrl)

                // Upload to Supabase Storage
                try {
                    const fileName = `credit-note-${Date.now()}.pdf`
                    const { data: uploadData, error: uploadError } = await supabase.storage
                        .from('invoices')
                        .upload(fileName, pdfBlob, {
                            contentType: 'application/pdf',
                            cacheControl: '3600'
                        })

                    if (uploadError) throw uploadError

                    const { data: { publicUrl } } = supabase.storage
                        .from('invoices')
                        .getPublicUrl(fileName)

                    finalPdfUrl = publicUrl
                } catch (uploadError) {
                    console.error('Supabase upload failed:', uploadError)
                    finalPdfUrl = blobUrl
                }
            } else {
                // JSON response with URL
                const data = await response.json()
                finalPdfUrl = data.file || data.pdf_url || data.url
                if (finalPdfUrl) {
                    setPdfUrl(finalPdfUrl)
                }
            }

            // Save credit note to database
            const { error: dbError } = await supabase
                .from('invoices')
                .insert({
                    client_id: invoice.client_id,
                    client_name: invoice.client_name,
                    client_cuit: invoice.client_cuit,
                    type: payload.type,
                    number: creditNoteId || `CN-${Date.now()}`,
                    cae: cae || 'PENDING',
                    date: payload.date,
                    subtotal: payload.subtotal,
                    discount_percentage: payload.discountPercentage,
                    discount_amount: payload.discountAmount,
                    net_taxable: payload.netTaxable,
                    vat_total: payload.vatTotal,
                    total: payload.total,
                    pdf_url: finalPdfUrl,
                    original_invoice_id: invoice.id
                })

            if (dbError) {
                console.error('Database save error:', dbError)
            }

            setResult({
                success: true,
                cae: cae || 'N/A',
                creditNoteId: creditNoteId || 'N/A',
                pdfUrl: finalPdfUrl
            })

        } catch (error) {
            console.error('Error generating credit note:', error)
            setResult({
                success: false,
                error: error.message
            })
        } finally {
            setLoading(false)
        }
    }

    if (!invoice) {
        return null
    }

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/accounts')}
                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-400" />
                </button>
                <div>
                    <h1 className="text-3xl font-bold text-white">Generar Nota de Crédito</h1>
                    <p className="text-slate-400 text-sm mt-1">Anulación de factura existente</p>
                </div>
            </div>

            {/* Original Invoice Info */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-cyan-500" />
                    Factura Original
                </h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-slate-500">Número:</span>
                        <p className="text-white font-mono">{invoice.number}</p>
                    </div>
                    <div>
                        <span className="text-slate-500">Tipo:</span>
                        <p className="text-white">{invoice.type}</p>
                    </div>
                    <div>
                        <span className="text-slate-500">Cliente:</span>
                        <p className="text-white">{invoice.client_name}</p>
                    </div>
                    <div>
                        <span className="text-slate-500">CUIT:</span>
                        <p className="text-white font-mono">{invoice.client_cuit}</p>
                    </div>
                    <div>
                        <span className="text-slate-500">Fecha:</span>
                        <p className="text-white">{new Date(invoice.date).toLocaleDateString('es-AR')}</p>
                    </div>
                    <div>
                        <span className="text-slate-500">Total:</span>
                        <p className="text-white font-bold">{formatCurrency(invoice.total)}</p>
                    </div>
                    <div>
                        <span className="text-slate-500">CAE:</span>
                        <p className="text-emerald-400 font-mono text-xs">{invoice.cae}</p>
                    </div>
                </div>
            </div>

            {/* Generate Button */}
            {!result && (
                <button
                    onClick={generateCreditNote}
                    disabled={loading}
                    className="w-full py-4 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 disabled:from-slate-700 disabled:to-slate-700 text-white rounded-xl font-bold text-lg transition-all shadow-lg disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Generando Nota de Crédito...
                        </>
                    ) : (
                        <>
                            <FileText className="w-5 h-5" />
                            Generar Nota de Crédito
                        </>
                    )}
                </button>
            )}

            {/* Result */}
            {result && (
                <div className={`border rounded-xl p-6 ${result.success ? 'bg-emerald-900/20 border-emerald-800' : 'bg-rose-900/20 border-rose-800'}`}>
                    <div className="flex items-center gap-3 mb-4">
                        {result.success ? (
                            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                        ) : (
                            <AlertCircle className="w-6 h-6 text-rose-400" />
                        )}
                        <h3 className="text-lg font-bold text-white">
                            {result.success ? 'Nota de Crédito Generada' : 'Error al Generar'}
                        </h3>
                    </div>

                    {result.success ? (
                        <div className="space-y-3">
                            <div>
                                <span className="text-slate-400 text-sm">CAE:</span>
                                <p className="text-emerald-400 font-mono">{result.cae}</p>
                            </div>
                            <div>
                                <span className="text-slate-400 text-sm">Número:</span>
                                <p className="text-white font-mono">{result.creditNoteId}</p>
                            </div>
                            {pdfUrl && (
                                <div className="flex gap-2 mt-4">
                                    <a
                                        href={pdfUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-center font-medium transition-colors"
                                    >
                                        Abrir PDF
                                    </a>
                                    <button
                                        onClick={() => navigate('/accounts')}
                                        className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                                    >
                                        Volver a Cuentas
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            <p className="text-rose-400">{result.error}</p>
                            <button
                                onClick={() => setResult(null)}
                                className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                            >
                                Reintentar
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

import { useState, useEffect } from 'react'
import { X, Search, Plus, Minus, ShoppingCart, Printer, User, Trash2, FileText, Edit, UserPlus, Globe, Calendar } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { supabase } from '../supabaseClient'
import { ClientModal } from '../components/clients/ClientModal'
import { QuantityInput } from '../components/ui/QuantityInput'
import { InvoiceResultModal } from '../components/billing/InvoiceResultModal'

const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value)
}

export function Billing() {
    const { cart, removeFromCart, updateQuantity, addToCart, clearCart, updateCartItem } = useCart()
    const [invoiceType, setInvoiceType] = useState('B')

    // Client State
    const [clientSearch, setClientSearch] = useState('')
    const [clients, setClients] = useState([])
    const [selectedClient, setSelectedClient] = useState(null)
    const [showClientModal, setShowClientModal] = useState(false)
    const [editingClient, setEditingClient] = useState(null)
    const [loadingClients, setLoadingClients] = useState(false)
    const [isClientInputFocused, setIsClientInputFocused] = useState(false)
    const [isProductInputFocused, setIsProductInputFocused] = useState(false)

    // Product State
    const [productSearch, setProductSearch] = useState('')
    const [products, setProducts] = useState([]) // Stores inventory or search results
    const [loadingProducts, setLoadingProducts] = useState(false)
    const [selectedTaxRate, setSelectedTaxRate] = useState(0.21)

    // Invoice Submission State
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [discountPercentage, setDiscountPercentage] = useState(0)
    const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0])
    const [invoiceResult, setInvoiceResult] = useState(null)

    // Invoice Types
    const types = ['A', 'B', 'C', 'M', 'T', 'MIPYME', 'Presupuesto']

    // Initial Fetches
    const fetchInitialProducts = async () => {
        setLoadingProducts(true)
        const { data } = await supabase
            .from('products')
            .select('*')
            .limit(20)
        setProducts(data || [])
        setLoadingProducts(false)
    }

    const fetchInitialClients = async () => {
        setLoadingClients(true)
        const { data } = await supabase
            .from('clients')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10)
        setClients(data || [])
        setLoadingClients(false)
    }

    // Reset loop (on mount)
    useEffect(() => {
        setClientSearch('')
        setClientSearch('')
        setProductSearch('')
        setDiscountPercentage(0)
        setSelectedTaxRate(0.21)
        fetchInitialProducts()
        fetchInitialClients()
    }, [])

    // Auto-set Exento when Factura C is selected
    useEffect(() => {
        if (invoiceType === 'C') {
            setSelectedTaxRate(0)
            // Update all cart items to Exento
            cart.forEach(item => {
                updateCartItem(item.id, { taxRate: 0 })
            })
        }
    }, [invoiceType])

    // Search Effects
    useEffect(() => {
        const searchClients = async () => {
            if (clientSearch.length < 2) {
                if (clientSearch.length === 0) fetchInitialClients()
                return
            }
            setLoadingClients(true)
            const { data } = await supabase
                .from('clients')
                .select('*')
                .or(`name.ilike.%${clientSearch}%,cuit.ilike.%${clientSearch}%`)
                .limit(10)
            setClients(data || [])
            setLoadingClients(false)
        }
        const timeout = setTimeout(searchClients, 300)
        return () => clearTimeout(timeout)
    }, [clientSearch])

    useEffect(() => {
        const searchProducts = async () => {
            if (productSearch.length < 2) {
                if (productSearch.length === 0) fetchInitialProducts()
                return
            }
            setLoadingProducts(true)
            const { data } = await supabase
                .from('products')
                .select('*')
                .or(`name.ilike.%${productSearch}%,sku.ilike.%${productSearch}%`)
                .limit(20)
            setProducts(data || [])
            setLoadingProducts(false)
        }
        const timeout = setTimeout(searchProducts, 300)
        return () => clearTimeout(timeout)
    }, [productSearch])

    // Handlers
    const handleExternalCuitSearch = async () => {
        const cuitToSearch = clientSearch.replace(/\D/g, '')
        if (cuitToSearch.length !== 11) {
            setEditingClient(null)
            setShowClientModal(true)
            return
        }

        setLoadingClients(true)
        try {
            const response = await fetch('https://n8n.neuracall.net/webhook/BuscarPersonas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cuit: cuitToSearch })
            })

            if (response.ok) {
                const rawData = await response.json()
                const validItems = (Array.isArray(rawData) ? rawData : [rawData]).filter(i => i.name || i.razonSocial)

                if (validItems.length > 0) {
                    const item = validItems[0]
                    const clientTemplate = {
                        name: item.name || item.razonSocial,
                        cuit: cuitToSearch,
                        tax_condition: item.taxCondition || 'Responsable Inscripto',
                        jurisdiction: item.jurisdiction || 'CABA',
                        address: item.address || item.domicilioFiscal,
                        email: item.email || ''
                    }
                    setEditingClient(clientTemplate)
                    setShowClientModal(true)
                } else {
                    alert('No se encontraron datos externos. Puede cargar manualmente.')
                    setEditingClient(null)
                    setShowClientModal(true)
                }
            } else {
                throw new Error('Error en búsqueda externa')
            }
        } catch (e) {
            console.error(e)
            setEditingClient(null)
            setShowClientModal(true)
        } finally {
            setLoadingClients(false)
        }
    }

    const handleSelectClient = (client) => {
        setSelectedClient(client)
        if (client.tax_condition === 'Responsable Inscripto') {
            setInvoiceType('A')
        } else {
            setInvoiceType('B')
        }
        setClientSearch('')
        setIsClientInputFocused(false)
    }

    const handleNewClient = () => {
        setEditingClient(null)
        setShowClientModal(true)
    }

    const handleEditClient = () => {
        setEditingClient(selectedClient)
        setShowClientModal(true)
    }

    const handleGenerateInvoice = async () => {
        setIsSubmitting(true)
        try {
            const webhookUrl = import.meta.env.VITE_INVOICE_WEBHOOK_URL || 'https://n8n.neuracall.net/webhook-test/facturastock'

            const payload = {
                type: invoiceType,
                client: selectedClient,
                items: safeCart.map(item => {
                    const quantity = Number(item.quantity) || 1
                    const unitPrice = Number(item.price) || 0
                    const vatRate = item.taxRate !== undefined && !isNaN(item.taxRate) ? Number(item.taxRate) : 0

                    return {
                        productId: item.id || item.productId,
                        productName: item.name || item.productName || item.description,
                        quantity,
                        unitPrice,
                        vatRate,
                        sku: item.sku || '',
                        dispatchNumber: item.dispatchNumber || item.dispatch_number || '',
                        origin: item.origin || '',
                        subtotal: quantity * unitPrice
                    }
                }),
                totals: {
                    subtotal: isNaN(subtotal) ? 0 : subtotal,
                    discountPercentage: isNaN(discountPercentage) ? 0 : discountPercentage,
                    discountAmount: isNaN(discountAmount) ? 0 : discountAmount,
                    netTaxable: isNaN(net) ? 0 : net,
                    vatTotal: isNaN(ivaAmount) ? 0 : ivaAmount,
                    total: isNaN(total) ? 0 : total
                },
                date: invoiceDate  // Format: YYYY-MM-DD (ARCA compatible)
            }

            console.log('=== PAYLOAD SENT TO WEBHOOK ===')
            console.log(JSON.stringify(payload, null, 2))
            console.log('===============================')

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (response.ok) {
                const contentType = response.headers.get('content-type') || ''

                // Debug: mostrar TODOS los headers
                console.log('=== ALL RESPONSE HEADERS ===')
                for (let [key, value] of response.headers.entries()) {
                    console.log(`${key}: ${value}`)
                }
                console.log('===========================')

                const cae = response.headers.get('CAE') || response.headers.get('x-cae')
                const invoiceId = response.headers.get('x-invoice-id')
                const invoiceNumber = response.headers.get('x-invoice-number')

                console.log('Extracted CAE:', cae)
                console.log('Extracted Invoice ID:', invoiceId)
                console.log('Extracted Invoice Number:', invoiceNumber)

                let pdfUrl = null
                let storedPdfUrl = null

                // If n8n returns a PDF, handle it
                // Manejo inteligente de respuesta (JSON con URL o Binario directo)
                if (contentType.includes('application/json')) {
                    const jsonResponse = await response.json()
                    const dataItem = Array.isArray(jsonResponse) ? jsonResponse[0] : jsonResponse

                    console.log('Respuesta del Webhook (JSON):', dataItem)

                    if (dataItem && dataItem.file) {
                        // ESTRATEGIA MIXTA:
                        // 1. Usamos la URL original para mostrarla YA en el modal (evita problemas de CORS en visualización)
                        pdfUrl = dataItem.file
                        console.log('Usando URL original para visualización:', pdfUrl)

                        // 2. Intentamos hacer el backup en Supabase en segundo plano
                        try {
                            // Por defecto guardamos la original, por si falla el backup
                            storedPdfUrl = dataItem.file

                            console.log('Intentando backup en Supabase...')
                            const externalPdfRes = await fetch(dataItem.file)

                            if (externalPdfRes.ok) {
                                const initialBlob = await externalPdfRes.blob()
                                // Forzamos tipo PDF
                                const pdfBlob = new Blob([initialBlob], { type: 'application/pdf' })

                                console.log('Backup Blob size:', pdfBlob.size)

                                if (pdfBlob.size > 100) {
                                    const pdfFileName = `factura_${invoiceId || Date.now()}.pdf`
                                    const { error: uploadError } = await supabase.storage
                                        .from('invoices')
                                        .upload(pdfFileName, pdfBlob, {
                                            contentType: 'application/pdf',
                                            upsert: true
                                        })

                                    if (!uploadError) {
                                        const { data: urlData } = supabase.storage
                                            .from('invoices')
                                            .getPublicUrl(pdfFileName)

                                        // Si todo salió perfecto, usamos la URL permanente de Supabase para la DB
                                        storedPdfUrl = urlData?.publicUrl
                                        console.log('Backup exitoso en Supabase:', storedPdfUrl)
                                    } else {
                                        console.warn('Falló subida a Supabase, usando URL original.', uploadError)
                                    }
                                }
                            }
                        } catch (e) {
                            console.error('Error en backup de PDF (usando original):', e)
                            storedPdfUrl = dataItem.file
                        }
                    }
                } else {
                    // Fallback: Procesar como binario directo si no es JSON
                    try {
                        const pdfBlob = await response.blob()
                        if (pdfBlob.size > 0) {
                            pdfUrl = URL.createObjectURL(pdfBlob)
                            const pdfFileName = `factura_${invoiceId || Date.now()}.pdf`
                            const { error: uploadError } = await supabase.storage
                                .from('invoices')
                                .upload(pdfFileName, pdfBlob, {
                                    contentType: 'application/pdf',
                                    upsert: true
                                })

                            if (!uploadError) {
                                const { data: urlData } = supabase.storage
                                    .from('invoices')
                                    .getPublicUrl(pdfFileName)
                                storedPdfUrl = urlData?.publicUrl
                            }
                        }
                    } catch (e) {
                        console.error('Error procesando blob del PDF:', e)
                    }
                }

                // Validate that we received a CAE before saving
                if (!cae) {
                    console.error('No CAE received from webhook')
                    console.error('Response headers:', Array.from(response.headers.entries()))
                    alert('Error: El webhook no devolvió un CAE en los headers. Verifica la configuración de N8N.')
                    throw new Error('No CAE received')
                }

                const finalCae = cae
                const finalInvoiceId = invoiceNumber || invoiceId || ('INV_' + Date.now())

                // ALWAYS save invoice to database when response is OK and CAE exists
                console.log('Saving invoice to database...', { invoiceId, cae, invoiceType, clientId: selectedClient?.id })

                // Get company_id from authenticated user
                const { data: { user } } = await supabase.auth.getUser()
                let companyId = '7f85f721-c30a-4195-a393-f5b00beebfd9' // Default fallback

                if (user) {
                    // Try to get company_id from user metadata or profile
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('company_id')
                        .eq('id', user.id)
                        .single()

                    if (profile?.company_id) {
                        companyId = profile.company_id
                    }
                }

                console.log('Using company_id:', companyId)

                const { data: invoiceData, error: invoiceError } = await supabase
                    .from('invoices')
                    .insert({
                        invoice_number: invoiceNumber || invoiceId,
                        type: invoiceType,
                        client_id: selectedClient?.id,
                        company_id: companyId,
                        subtotal: isNaN(subtotal) ? 0 : subtotal,
                        discount_percentage: isNaN(discountPercentage) ? 0 : discountPercentage,
                        discount_amount: isNaN(discountAmount) ? 0 : discountAmount,
                        net_taxable: isNaN(net) ? 0 : net,
                        vat_total: isNaN(ivaAmount) ? 0 : ivaAmount,
                        total: isNaN(total) ? 0 : total,
                        cae: cae,
                        date: invoiceDate,
                        // CRITICAL FIX: Ensure we save A URL, either the permanent one or the original temp one
                        pdf_url: storedPdfUrl || (dataItem && dataItem.file) || null
                    })
                    .select()
                    .single()

                if (invoiceError) {
                    console.error('❌ Error saving invoice:', invoiceError)
                    console.error('Error details:', {
                        message: invoiceError.message,
                        code: invoiceError.code,
                        details: invoiceError.details,
                        hint: invoiceError.hint
                    })
                    alert(`Error guardando factura en base de datos: ${invoiceError.message}\n\nPosible problema de permisos RLS. Verifica las políticas de seguridad en Supabase.`)
                }

                // CRITICAL: Always update stock after successful webhook response, regardless of DB save status
                console.log('=== UPDATING STOCK ===')
                console.log('Cart items to process:', safeCart.length)

                for (const item of safeCart) {
                    const quantityToDeduct = Number(item.quantity) || 0
                    const currentStock = Number(item.stock) || 0
                    const newStock = Math.max(0, currentStock - quantityToDeduct)

                    console.log(`Updating product ${item.id} (${item.name}):`, {
                        currentStock,
                        quantityToDeduct,
                        newStock
                    })

                    const { data: updateData, error: stockError } = await supabase
                        .from('products')
                        .update({ stock: newStock })
                        .eq('id', item.id)
                        .select()

                    if (stockError) {
                        console.error(`Error updating stock for product ${item.id}:`, stockError)
                    } else {
                        console.log(`✓ Stock updated successfully for ${item.name}:`, updateData)
                    }
                }
                console.log('=== STOCK UPDATE COMPLETE ===')

                // Save invoice items if invoice was saved successfully
                if (invoiceData) {
                    console.log('Invoice saved:', invoiceData)
                    console.log('=== SAVING INVOICE ITEMS ===')
                    console.log('Cart items to save:', safeCart.length)

                    // Save invoice items
                    const itemsToInsert = safeCart.map(item => ({
                        invoice_id: invoiceData.id,
                        product_id: item.id,
                        product_name: item.name,
                        quantity: Number(item.quantity) || 0,
                        unit_price: Number(item.price) || 0,
                        vat_rate: item.taxRate !== undefined ? item.taxRate : 0.21,
                        company_id: companyId
                    }))

                    console.log('Items to insert:', JSON.stringify(itemsToInsert, null, 2))

                    const { data: insertedItems, error: itemsError } = await supabase
                        .from('invoice_items')
                        .insert(itemsToInsert)
                        .select()

                    if (itemsError) {
                        console.error('❌ Error saving invoice items:', itemsError)
                        alert(`ADVERTENCIA: La factura se guardó pero hubo un error al guardar los items: ${itemsError.message}`)
                    } else {
                        console.log('✓ Invoice items saved successfully:', insertedItems)
                    }
                } else {
                    console.warn('⚠️ Invoice data is null, skipping items save')
                }

                // Show modal with invoice result
                setInvoiceResult({
                    cae: cae,
                    invoiceNumber: invoiceNumber || invoiceId,
                    pdfUrl: pdfUrl
                })

                clearCart()
                setInvoiceType('B')
                setSelectedClient(null)
                setDiscountPercentage(0)
            } else {
                throw new Error('Error del servidor')
            }
        } catch (error) {
            console.error(error)
            alert('Hubo un error al generar la factura.')
        } finally {
            setIsSubmitting(false)
        }
    }

    // Calculations
    const safeCart = Array.isArray(cart) ? cart : []
    const subtotal = safeCart.reduce((acc, item) => acc + ((Number(item.price) || 0) * (Number(item.quantity) || 0)), 0)

    const discountAmount = subtotal * (discountPercentage / 100)
    const net = subtotal - discountAmount

    // Calculate VAT per item based on its stored taxRate (or default 0.21)
    // CRITICAL: If invoiceType is 'C', VAT MUST be 0.
    // For 'A', 'B' and others, we calculate VAT based on item rates.
    const ivaAmount = invoiceType === 'C' ? 0 : safeCart.reduce((acc, item) => {
        const itemTotal = (Number(item.price) || 0) * (Number(item.quantity) || 0)
        // Apply proportional discount to item
        const itemNet = itemTotal * (1 - (discountPercentage / 100))
        const itemTaxRate = item.taxRate !== undefined ? item.taxRate : 0.21
        return acc + (itemNet * itemTaxRate)
    }, 0)

    const total = net + ivaAmount

    return (
        <div className="h-[calc(100vh-2rem)] flex flex-col pt-4 pb-4 animate-in fade-in duration-300">
            {/* Top Bar */}
            <div className="h-20 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-950 shrink-0 rounded-t-2xl border-t border-x mx-4">
                <div className="flex items-center gap-4 w-1/4">
                    <div className="bg-emerald-500/10 p-2.5 rounded-xl text-emerald-500 border border-emerald-500/20">
                        <FileText className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white leading-none tracking-tight">Nueva Factura</h1>
                        <p className="text-[10px] text-emerald-500 mt-1.5 font-bold uppercase tracking-wider">Comprobante Electrónico</p>
                    </div>
                </div>

                {/* Centered Invoice Types */}
                <div className="flex-1 flex justify-center">
                    <div className="flex bg-slate-900 p-1.5 rounded-xl border border-slate-800 shadow-inner">
                        {types.map(t => (
                            <button
                                key={t}
                                onClick={() => setInvoiceType(t)}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all relative ${invoiceType === t
                                    ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/50 scale-105 z-10'
                                    : 'text-slate-500 hover:text-white hover:bg-slate-800'
                                    }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="w-1/4 flex justify-end">
                    {/* Placeholder for future actions */}
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden mx-4 border-x border-b border-slate-800 rounded-b-2xl bg-slate-950">
                {/* Main Content (Left) */}
                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-6">

                    {/* Client Section */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-cyan-500">
                                <User className="w-5 h-5" />
                                <h2 className="font-bold">Datos del Cliente</h2>
                            </div>
                            {/* Previously Created Clients Hint */}
                            {!selectedClient && clients.length > 0 && !clientSearch && (
                                <span className="text-xs text-slate-500">Mostrando últimos clientes</span>
                            )}
                        </div>

                        {!selectedClient ? (
                            <div className="relative z-20">
                                <div className="flex gap-2">
                                    <div className="relative flex-1 group">
                                        <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-cyan-500 transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="Buscar cliente por nombre o CUIT..."
                                            value={clientSearch}
                                            onClick={() => {
                                                if (!clientSearch) fetchInitialClients()
                                            }}
                                            onFocus={() => setIsClientInputFocused(true)}
                                            onBlur={() => {
                                                setTimeout(() => setIsClientInputFocused(false), 200)
                                            }}
                                            onChange={e => setClientSearch(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-12 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                                            autoFocus
                                        />

                                        <div className="absolute right-2 top-2 bottom-2 flex items-center border-l border-slate-800 pl-2">
                                            <button
                                                onClick={handleExternalCuitSearch}
                                                className="h-full px-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1"
                                                title="Buscar datos en padrón (WebHook)"
                                            >
                                                <span className="text-xs font-mono bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">/</span>
                                                <Globe className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {isClientInputFocused && (clients.length > 0 || loadingClients) && (
                                            <div className="absolute top-full mt-2 left-0 w-full bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-30 max-h-[300px] overflow-y-auto">
                                                {loadingClients && <div className="p-4 text-center text-slate-400 text-xs">Buscando...</div>}
                                                {clients.map(client => (
                                                    <button
                                                        key={client.id}
                                                        onClick={() => handleSelectClient(client)}
                                                        className="w-full text-left px-4 py-3 hover:bg-slate-700 border-b border-slate-700/50 last:border-0 flex justify-between items-center group"
                                                    >
                                                        <div>
                                                            <div className="text-white font-bold">{client.name}</div>
                                                            <div className="text-xs text-slate-400 font-mono">{client.cuit}</div>
                                                        </div>
                                                        <span className="text-xs text-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity font-bold">Seleccionar</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={handleNewClient}
                                        className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-500 rounded-xl px-4 flex items-center justify-center transition-colors"
                                        title="Crear Nuevo Cliente Manualmente"
                                    >
                                        <UserPlus className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex justify-between items-center animate-in fade-in zoom-in-95 duration-200">
                                <div>
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        {selectedClient.name}
                                        <span className="text-xs font-normal text-slate-500 ml-2 border border-slate-800 px-2 py-0.5 rounded bg-slate-900">
                                            {selectedClient.cuit}
                                        </span>
                                    </h3>
                                    <div className="flex gap-4 mt-1 text-sm text-slate-400">
                                        <span>{selectedClient.tax_condition}</span>
                                        <span>•</span>
                                        <span>{selectedClient.jurisdiction}</span>
                                        <span>•</span>
                                        <span>{selectedClient.address}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={handleEditClient} className="p-2 bg-slate-900 hover:bg-slate-800 text-cyan-500 rounded-lg border border-slate-800 transition-colors">
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => setSelectedClient(null)} className="p-2 bg-slate-900 hover:bg-slate-800 text-rose-500 rounded-lg border border-slate-800 transition-colors">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Add Items Section */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 flex flex-col flex-1 min-h-[500px]">
                        <div className="flex items-center gap-2 mb-4 text-cyan-500">
                            <Plus className="w-5 h-5" />
                            <h2 className="font-bold">Agregar Items</h2>
                        </div>

                        {/* Search Products */}
                        <div className="grid grid-cols-12 gap-4 mb-6 relative z-10">
                            <div className="col-span-8 relative">
                                <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="Buscar en inventario..."
                                    value={productSearch}
                                    onChange={e => setProductSearch(e.target.value)}
                                    // Fix: Toggle dropdown on focus
                                    onFocus={() => setIsProductInputFocused(true)}
                                    onBlur={() => setTimeout(() => setIsProductInputFocused(false), 200)}
                                    onClick={() => {
                                        if (!productSearch) fetchInitialProducts()
                                    }}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                                />

                                {/* Inventory / Search Results Dropdown */}
                                {isProductInputFocused && (products.length > 0 || loadingProducts) && (
                                    <div className="absolute top-full mt-2 left-0 w-full bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-[400px] overflow-y-auto z-20">
                                        {loadingProducts && <div className="p-3 text-center text-slate-500 text-xs">Cargando inventario...</div>}

                                        {!loadingProducts && products.length === 0 && (
                                            <div className="p-4 text-center text-slate-400">No se encontraron productos</div>
                                        )}

                                        {products.map(prod => (
                                            <div key={prod.id} className="p-3 border-b border-slate-700/50 hover:bg-slate-700 flex justify-between items-center group">
                                                <div className="flex-1">
                                                    <div className="flex justify-between">
                                                        <div className="text-white font-bold text-sm line-clamp-1">{prod.name}</div>
                                                        <span className="text-cyan-500 font-mono text-sm ml-2 whitespace-nowrap">{formatCurrency(prod.price)}</span>
                                                    </div>
                                                    <div className="text-xs text-slate-400 mt-0.5 flex items-center justify-between">
                                                        <span className="font-mono bg-slate-900 px-1 rounded">{prod.sku}</span>
                                                        <span className={`${prod.stock < 10 ? 'text-rose-500' : 'text-emerald-500'} font-medium`}>
                                                            Stock: {prod.stock}
                                                        </span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        addToCart({ ...prod, taxRate: selectedTaxRate }, 1)
                                                    }}
                                                    className="ml-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="col-span-4">
                                <select
                                    value={selectedTaxRate}
                                    onChange={(e) => {
                                        const newRate = Number(e.target.value)
                                        setSelectedTaxRate(newRate)
                                        // Update all items in cart to match this new global rate
                                        if (safeCart.length > 0) {
                                            safeCart.forEach(item => {
                                                updateCartItem(item.id, { taxRate: newRate })
                                            })
                                        }
                                    }}
                                    className="w-full h-full bg-slate-950 border border-slate-800 rounded-xl px-4 text-white focus:outline-none focus:border-cyan-500 appearance-none"
                                >
                                    <option value={0.21}>IVA 21% (Default)</option>
                                    <option value={0.105}>IVA 10.5%</option>
                                    <option value={0.27}>IVA 27%</option>
                                    <option value={0}>Exento</option>
                                </select>
                            </div>
                        </div>

                        {/* Cart Table */}
                        <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-inner">
                            <div className="grid grid-cols-12 gap-4 p-4 border-b border-slate-800 bg-slate-900 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <div className="col-span-5">Producto</div>
                                <div className="col-span-2 text-center">Cant</div>
                                <div className="col-span-2 text-right">Unitario</div>
                                <div className="col-span-1 text-right">IVA</div>
                                <div className="col-span-2 text-right">Subtotal</div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                                {safeCart.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
                                        <ShoppingCart className="w-12 h-12 mb-3" />
                                        <p>El carrito está vacío</p>
                                    </div>
                                ) : (
                                    safeCart.map((item, idx) => (
                                        <div key={idx} className="grid grid-cols-12 gap-4 p-3 hover:bg-slate-900 rounded-lg items-center text-sm group transition-colors border border-transparent hover:border-slate-800">
                                            <div className="col-span-5 flex items-center gap-3">
                                                <button onClick={() => removeFromCart(item.id)} className="text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                                <div className="overflow-hidden">
                                                    <div className="text-white font-medium line-clamp-1" title={item.name}>{item.name}</div>
                                                    <div className="text-xs text-slate-500 font-mono">{item.sku}</div>
                                                </div>
                                            </div>
                                            <div className="col-span-2 flex justify-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <div className="flex items-center bg-slate-900 rounded-lg border border-slate-800 h-8">
                                                        <button onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))} className="px-2 hover:text-white text-slate-500 hover:bg-slate-800 h-full rounded-l-lg">-</button>
                                                        <QuantityInput
                                                            initialValue={item.quantity}
                                                            stock={item.stock}
                                                            onChange={(val) => updateQuantity(item.id, val)}
                                                            className="px-0 font-mono text-white w-10 bg-transparent text-center text-xs outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                        />
                                                        <button onClick={() => updateQuantity(item.id, Math.min(item.stock, item.quantity + 1))} className="px-2 hover:text-white text-slate-500 hover:bg-slate-800 h-full rounded-r-lg">+</button>
                                                    </div>
                                                    <span className="text-[9px] text-slate-500 font-mono">
                                                        {item.stock - item.quantity} disponible
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="col-span-2 text-right font-mono text-slate-400">
                                                {formatCurrency(item.price)}
                                            </div>
                                            <div className="col-span-1 text-right text-slate-500 text-xs mt-0.5">
                                                {item.taxRate === 0 ? 'Exento' : `${(item.taxRate * 100).toFixed(1)}%`}
                                            </div>
                                            <div className="col-span-2 text-right font-mono font-bold text-cyan-500">
                                                {formatCurrency(item.price * item.quantity)}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar (Right) - Summary */}
                <div className="w-96 bg-slate-900 border-l border-slate-800 p-6 flex flex-col shadow-xl z-20">
                    <h3 className="text-cyan-500 font-bold mb-6 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                        Resumen de Factura
                    </h3>

                    <div className="space-y-4 mb-auto">
                        <div className="flex items-center gap-2 text-slate-400 text-sm mb-4">
                            <Calendar className="w-4 h-4 text-cyan-500" />
                            <span>Fecha de Facturación:</span>
                            <input
                                type="date"
                                value={invoiceDate}
                                onChange={(e) => setInvoiceDate(e.target.value)}
                                className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-cyan-500"
                            />
                        </div>

                        <div className="flex justify-between text-sm text-slate-400">
                            <span>Subtotal Bruto</span>
                            <span className="font-mono text-white">{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-slate-400 items-center">
                            <span>% Descuento</span>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={discountPercentage}
                                    onChange={(e) => {
                                        const val = Math.min(100, Math.max(0, Number(e.target.value)))
                                        setDiscountPercentage(val)
                                    }}
                                    className="w-12 bg-slate-950 px-1 py-0.5 rounded text-xs border border-slate-800 text-center text-white focus:outline-none focus:border-cyan-500"
                                />
                                <span className="font-mono text-rose-500">-{formatCurrency(discountAmount)}</span>
                            </div>
                        </div>
                        <div className="h-px bg-slate-800 my-2"></div>
                        <div className="flex justify-between text-sm text-slate-400">
                            <span>Neto Gravado</span>
                            <span className="font-mono text-white">{formatCurrency(net)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-slate-400">
                            <span>IVA Total</span>
                            <span className="font-mono text-white">{formatCurrency(ivaAmount)}</span>
                        </div>

                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mt-4 shadow-lg">
                            <div className="flex justify-between items-center text-lg font-bold text-white">
                                <span>TOTAL</span>
                                <span className="text-2xl text-cyan-400 font-mono tracking-tight">{formatCurrency(total)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={handleGenerateInvoice}
                            disabled={isSubmitting || !selectedClient || safeCart.length === 0}
                            className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-cyan-900/40 transition-all flex items-center justify-center gap-2 group transform active:scale-[0.98]"
                        >
                            {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <Printer className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    Generar Factura
                                </>
                            )}
                        </button>

                        {!selectedClient && (
                            <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-2 text-center animate-pulse">
                                <p className="text-xs text-rose-500 font-medium">
                                    * Seleccione un cliente para continuar
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ClientModal
                isOpen={showClientModal}
                onClose={() => setShowClientModal(false)}
                clientToEdit={editingClient}
                onSave={(client) => {
                    setSelectedClient(client)
                    if (client.tax_condition === 'Responsable Inscripto') {
                        setInvoiceType('A')
                    } else {
                        setInvoiceType('B')
                    }
                    setClientSearch('')
                    setClients([])
                }}
            />

            <InvoiceResultModal
                isOpen={invoiceResult !== null}
                onClose={() => setInvoiceResult(null)}
                invoiceData={invoiceResult}
            />
        </div >
    )
}

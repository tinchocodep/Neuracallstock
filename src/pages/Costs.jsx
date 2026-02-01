import { useState, useEffect } from 'react'
import {
    Package,
    Upload,
    DollarSign,
    Plus,
    Clock,
    CheckCircle2,
    Box,
    ChevronRight,
    ChevronLeft,
    ChevronDown,
    Loader2,
    X,
    FileSpreadsheet,
    Send,
    Calculator
} from 'lucide-react'
import { supabase } from '../supabaseClient'

export function Costs() {
    const [step, setStep] = useState(1)
    const [selectedDispatch, setSelectedDispatch] = useState(null)
    const [loading, setLoading] = useState(false)

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header / Progress Bar */}
            <div className="bg-gradient-to-r from-cyan-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-cyan-500/20">
                <h1 className="text-2xl font-bold mb-2">Sistema de Neteo de Costos</h1>
                <p className="text-cyan-200 text-sm mb-8">Importa productos y distribuye costos proporcionalmente</p>

                <div className="flex items-center justify-between px-10 relative">
                    {/* Progress Line Background */}
                    <div className="absolute left-0 top-1/2 w-full h-0.5 bg-slate-700 -z-0"></div>

                    {/* Steps */}
                    {[
                        { id: 1, label: 'Seleccionar Despacho', icon: Box },
                        { id: 2, label: 'Subir Productos', icon: Upload },
                        { id: 3, label: 'Subir Costos', icon: DollarSign },
                    ].map((s) => (
                        <div key={s.id} className="relative z-10 flex flex-col items-center gap-3">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${step >= s.id
                                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/50 scale-110'
                                : 'bg-slate-800 text-slate-400 border border-slate-600'
                                }`}>
                                <s.icon className="w-6 h-6" />
                            </div>
                            <span className={`text-xs font-medium tracking-wide ${step >= s.id ? 'text-cyan-400' : 'text-slate-500'
                                }`}>
                                {s.label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm min-h-[500px] relative overflow-hidden">
                {step === 1 && <DispatchSelection onSelect={(d) => {
                    setSelectedDispatch(d)
                    if (d.status === 'open') {
                        setStep(3)
                    } else if (d.status === 'completed') {
                        setStep(3) // Review costs
                    } else {
                        setStep(2) // Default pending -> step 2
                    }
                }} />}
                {step === 2 && <ProductUpload
                    dispatch={selectedDispatch}
                    onNext={(dispatchData) => {
                        // Update dispatch with data from N8N
                        if (dispatchData) {
                            setSelectedDispatch({ ...selectedDispatch, ...dispatchData })
                        }
                        setStep(3)
                    }}
                    onBack={() => setStep(1)}
                />}
                {step === 3 && <CostsForm dispatch={selectedDispatch} onBack={() => setStep(2)} />}
            </div>
        </div>
    )
}

// ------------------------------------------------------------------
// STEP 1: SELECT DISPATCH
// ------------------------------------------------------------------
function DispatchSelection({ onSelect }) {
    const [isCreating, setIsCreating] = useState(false)
    const [dispatches, setDispatches] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [page, setPage] = useState(0)
    const [pageSize, setPageSize] = useState(10)
    const [totalCount, setTotalCount] = useState(0)

    // Form State
    const [newDispatch, setNewDispatch] = useState({ dispatch_number: '', description: '', origin: 'CHINA' })

    // Use default company_id (profiles table doesn't exist yet)
    const defaultCompanyId = 'afffddf6-0c49-40e1-bc01-5f44af0b9015'

    useEffect(() => {
        setPage(0)
    }, [searchTerm])

    useEffect(() => {
        fetchDispatches()
    }, [searchTerm, page, pageSize])

    const fetchDispatches = async () => {
        setLoading(true)
        try {
            let query = supabase
                .from('dispatches')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false })

            if (searchTerm) {
                query = query.ilike('dispatch_number', `%${searchTerm}%`)
            }

            const from = page * pageSize
            const to = from + pageSize - 1

            const { data, count, error } = await query.range(from, to)

            if (error) throw error
            setDispatches(data || [])
            setTotalCount(count || 0)
        } catch (err) {
            console.error('Error fetching dispatches:', err)
            // Mock data Fallback (Schema matched to request)
            if (searchTerm === '') {
                setDispatches([
                    { id: 1, dispatch_number: '013950N', description: 'JUAN130', origin: 'CHINA', status: 'pending', created_at: new Date().toISOString() },
                    { id: 2, dispatch_number: '010570X', description: 'FM-44', origin: 'CHINA', status: 'completed', created_at: new Date().toISOString() },
                    { id: 3, dispatch_number: 'TEST-OPEN', description: 'DISPATCH-OPEN', origin: 'CHINA', status: 'open', created_at: new Date().toISOString() },
                ])
            }
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = async () => {
        // Validate required fields
        if (!newDispatch.dispatch_number || !newDispatch.description) {
            alert('Por favor completa todos los campos requeridos')
            return
        }

        // Don't create in Supabase - N8N will do it in STEP 2
        // Just pass the data to STEP 2
        setIsCreating(false)
        onSelect({
            ...newDispatch,
            company_id: defaultCompanyId,
            status: 'new',  // Indicates it needs to be created by N8N
            id: null  // No ID yet - will be set by N8N response
        })
        setNewDispatch({ dispatch_number: '', description: '', origin: 'CHINA' })
    }

    if (isCreating) {
        return (
            <div className="p-8 max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Crear Nuevo Despacho</h2>
                    <button onClick={() => setIsCreating(false)} className="mx-auto text-slate-400 hover:text-white"><X /></button>
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-400">Número de Despacho *</label>
                        <input
                            value={newDispatch.dispatch_number}
                            onChange={e => setNewDispatch({ ...newDispatch, dispatch_number: e.target.value })}
                            placeholder="Ej: DESP-001"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white outline-none focus:border-cyan-500 transition-colors"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-400">Referencia / Descripción (opcional)</label>
                        <input
                            value={newDispatch.description}
                            onChange={e => setNewDispatch({ ...newDispatch, description: e.target.value })}
                            placeholder="Ej: PROVEEDOR-XYZ-REF-123"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white outline-none focus:border-cyan-500 transition-colors"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-400">Origen *</label>
                        <div className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white">CHINA</div>
                    </div>

                    <div className="pt-6 flex gap-4">
                        <button
                            onClick={handleCreate}
                            className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-cyan-900/20"
                        >
                            Crear Despacho
                        </button>
                        <button
                            onClick={() => setIsCreating(false)}
                            className="px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-3 rounded-xl transition-all"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 h-full flex flex-col">
            {/* Toolbar */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Seleccionar Despacho</h2>
                    <p className="text-slate-500 text-xs">Administra tus importaciones y costos</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-xl transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2 text-sm"
                >
                    <Plus className="w-4 h-4" />
                    Nuevo Despacho
                </button>
            </div>

            {/* Search */}
            <div className="mb-6 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Send className="h-4 w-4 text-slate-400 rotate-90" />
                </div>
                <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl leading-5 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500 sm:text-sm"
                    placeholder="Buscar por número de despacho..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Table Header */}
            <div className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 grid grid-cols-12 px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider rounded-t-xl">
                <div className="col-span-4 pl-8">Despacho</div>
                <div className="col-span-4">Referencia</div>
                <div className="col-span-2 text-center">Origen</div>
                <div className="col-span-2 text-right">Estado</div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto min-h-[300px]">
                {loading ? (
                    <div className="flex justify-center items-center h-40">
                        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
                    </div>
                ) : dispatches.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                        <Box className="w-8 h-8 mb-2 opacity-50" />
                        <p className="text-xs">No se encontraron despachos</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {dispatches.map((d) => (
                            <div
                                key={d.id}
                                onClick={() => onSelect(d)}
                                className="grid grid-cols-12 px-4 py-3 items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors text-xs text-slate-700 dark:text-slate-300 group"
                            >
                                <div className="col-span-4 flex items-center gap-3">
                                    <Box className="w-4 h-4 text-slate-400 group-hover:text-cyan-500 transition-colors" />
                                    <span className="font-bold text-slate-900 dark:text-white font-mono">{d.dispatch_number}</span>
                                </div>
                                <div className="col-span-4 truncate pr-2 text-slate-500">
                                    {d.description || '-'}
                                </div>
                                <div className="col-span-2 text-center text-slate-500">
                                    {d.origin}
                                </div>
                                <div className="col-span-2 text-right">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${d.status === 'completed'
                                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                        : d.status === 'open'
                                            ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                            : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                        }`}>
                                        {d.status === 'completed' ? 'Completado' : d.status === 'open' ? 'En Proceso' : 'Pendiente'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 rounded-b-xl">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                    Mostrando <span className="font-bold text-slate-900 dark:text-white">{dispatches.length}</span> de <span className="font-bold text-slate-900 dark:text-white">{totalCount}</span>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Filas:</span>
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value))
                                setPage(0)
                            }}
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded px-2 py-1 outline-none focus:border-cyan-500 text-slate-700 dark:text-white"
                        >
                            {[10, 20, 50, 100, 500].map(size => (
                                <option key={size} value={size}>{size}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0 || loading}
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-slate-500 dark:text-slate-400"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-mono w-12 text-center text-slate-500 dark:text-slate-400">
                            {page + 1} / {Math.max(1, Math.ceil(totalCount / pageSize))}
                        </span>
                        <button
                            onClick={() => setPage(p => (p + 1) * pageSize < totalCount ? p + 1 : p)}
                            disabled={(page + 1) * pageSize >= totalCount || loading}
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-slate-500 dark:text-slate-400"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ------------------------------------------------------------------
// STEP 2: UPLOAD PRODUCTS
// ------------------------------------------------------------------
// ------------------------------------------------------------------
// STEP 2: UPLOAD PRODUCTS
// ------------------------------------------------------------------
function ProductUpload({ dispatch, onNext, onBack }) {
    const [uploading, setUploading] = useState(false)
    const [selectedFile, setSelectedFile] = useState(null)
    const fileInputRef = useState(null) // We use a callback ref or simple ID, but useRef is better. 
    // Since we can't easily add useRef hook import without changing top of file, 
    // we'll use document.getElementById for simplicity or just a simple handler.

    // Better to use a standard input
    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0])
        }
    }

    const handleUpload = async () => {
        if (!selectedFile) return

        setUploading(true)

        try {
            const formData = new FormData()
            formData.append('file', selectedFile)

            // Send dispatch data to N8N (N8N will create the dispatch)
            formData.append('dispatchNumber', dispatch.dispatch_number)
            formData.append('description', dispatch.description || '')  // Changed from dispatchReference to description
            formData.append('companyId', dispatch.company_id)
            formData.append('origin', dispatch.origin)

            // N8N WEBHOOK URL
            // In development, use proxy to avoid CORS. In production, use direct URL.
            const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            const N8N_WEBHOOK_URL = isDevelopment
                ? '/api/n8n/webhook/LecturaDeInvoice'
                : (import.meta.env.VITE_N8N_COST_INVOICE_UPLOAD || 'https://n8n.neuracall.net/webhook/LecturaDeInvoice')

            console.log('Sending to n8n:', Object.fromEntries(formData))
            console.log('Using webhook URL:', N8N_WEBHOOK_URL)

            const response = await fetch(N8N_WEBHOOK_URL, {
                method: 'POST',
                body: formData
            })

            if (!response.ok) throw new Error('Upload failed')

            // N8N responds with the created dispatch_id
            const result = await response.json()
            console.log('N8N Response:', result)

            // Update dispatch with the ID returned by N8N
            if (result.dispatch_id) {
                dispatch.id = result.dispatch_id
                dispatch.status = 'pending'
                dispatch.total_fob_usd = result.total_fob_usd || 0
                console.log('Dispatch created with ID:', result.dispatch_id)
                console.log('Total FOB USD:', result.total_fob_usd)
            } else {
                throw new Error('N8N did not return dispatch_id')
            }

            // Pass dispatch data to parent
            onNext({
                id: result.dispatch_id,
                total_fob_usd: result.total_fob_usd,
                status: 'pending'
            })
        } catch (error) {
            console.error('Error uploading file:', error)
            alert('Error al subir el archivo: ' + error.message)
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="p-10 flex flex-col items-center justify-center min-h-[400px] text-center">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Cargar Productos al Despacho {dispatch.dispatch_number}</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md">
                Sube el archivo Excel con el listado de productos recibidos.
                Esto actualizará el stock automáticamente.
            </p>

            <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
            />

            <label
                htmlFor="file-upload"
                className={`border-2 border-dashed rounded-2xl p-10 w-full max-w-xl transition-all cursor-pointer group flex flex-col items-center ${selectedFile
                    ? 'border-cyan-500 bg-cyan-500/10'
                    : 'border-slate-700 bg-slate-900/30 hover:bg-slate-900/50'
                    }`}
            >
                {selectedFile ? (
                    <>
                        <FileSpreadsheet className="w-12 h-12 text-cyan-500 mb-4" />
                        <p className="text-cyan-400 font-bold">{selectedFile.name}</p>
                        <p className="text-xs text-cyan-500/70 mt-1">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                    </>
                ) : (
                    <>
                        <Upload className="w-12 h-12 text-slate-500 group-hover:text-cyan-500 mb-4 transition-colors" />
                        <p className="text-slate-300 font-medium group-hover:text-white">Click para seleccionar Excel</p>
                        <p className="text-xs text-slate-500 mt-2">o arrastra el archivo aquí</p>
                    </>
                )}
            </label>

            {selectedFile && (
                <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="mt-6 bg-cyan-600 hover:bg-cyan-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {uploading ? (
                        <>
                            <Loader2 className="animate-spin w-5 h-5" />
                            Procesando...
                        </>
                    ) : (
                        <>
                            <Send className="w-5 h-5" />
                            Enviar a Procesar
                        </>
                    )}
                </button>
            )}

            <button onClick={onBack} className="mt-8 text-slate-500 hover:text-white text-sm">Volver</button>
        </div>
    )
}

// ------------------------------------------------------------------
// STEP 3: UPLOAD COSTS
// ------------------------------------------------------------------
function CostsForm({ dispatch, onBack }) {
    const [costs, setCosts] = useState({
        totalFob: 0,
        tipoDeCambio: '',
        flete: '',
        derechos: '',
        estadisticas: '',
        impuestosInternacionales: '',
        impuestoPais: '',
        oficializacion: '',
        sertear: '',
        gastosInternos: '',
        terminal: '',
        almacenaje: '',
        ivetra: '',
        tap: '',
        honorarios: '',
        utilidad: ''
    })
    const [submitting, setSubmitting] = useState(false)
    const [loading, setLoading] = useState(true)

    // Helper function to format number with thousand separators
    const formatNumber = (value) => {
        if (!value) return ''
        // Remove all non-digit characters except decimal point
        const cleanValue = value.toString().replace(/[^\d.]/g, '')
        const parts = cleanValue.split('.')
        // Add thousand separators to integer part
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
        return parts.join(',')
    }

    // Helper function to parse formatted number back to float
    const parseFormattedNumber = (value) => {
        if (!value) return 0
        // Remove thousand separators (dots) and replace decimal comma with dot
        return parseFloat(value.replace(/\./g, '').replace(/,/g, '.')) || 0
    }

    useEffect(() => {
        fetchDispatchTotal()
    }, [dispatch.id])

    const fetchDispatchTotal = async () => {
        setLoading(true)
        try {
            // Use total_fob_usd from dispatch if available (comes from N8N response)
            if (dispatch.total_fob_usd) {
                console.log('Using total_fob_usd from dispatch:', dispatch.total_fob_usd)
                setCosts(prev => ({ ...prev, totalFob: dispatch.total_fob_usd }))
                setLoading(false)
                return
            }

            // Fallback: fetch from database for existing dispatches
            const { data: dispatchData, error } = await supabase
                .from('dispatches')
                .select('total_fob_usd')
                .eq('id', dispatch.id)
                .maybeSingle()

            if (error) throw error

            const fobTotal = dispatchData?.total_fob_usd || 0
            setCosts(prev => ({ ...prev, totalFob: fobTotal }))
        } catch (err) {
            console.error('Error fetching dispatch total:', err)
            // Fallback to 0 if error
            setCosts(prev => ({ ...prev, totalFob: 0 }))
        } finally {
            setLoading(false)
        }
    }

    const handleCostChange = (field, value) => {
        // Store the raw numeric value
        const numericValue = value.replace(/[^\d.,]/g, '')
        setCosts(prev => ({ ...prev, [field]: numericValue }))
    }

    // Calculate utilidad (23% of subtotal)
    const calculateUtilidad = () => {
        console.log('🔵 BOTÓN CALCULAR UTILIDAD CLICKEADO')
        console.log('Costs actuales:', costs)

        // Validate tipo de cambio
        const tipoDeCambio = parseFormattedNumber(costs.tipoDeCambio)
        console.log('Tipo de cambio parseado:', tipoDeCambio)
        if (tipoDeCambio === 0) {
            alert('Debe ingresar el tipo de cambio primero')
            return
        }

        // Calculate total FOB in ARS
        const totalFobARS = costs.totalFob * tipoDeCambio

        // Calculate total costs (all costs except tipo de cambio and utilidad)
        const totalCosts =
            parseFormattedNumber(costs.flete) +
            parseFormattedNumber(costs.derechos) +
            parseFormattedNumber(costs.estadisticas) +
            parseFormattedNumber(costs.impuestosInternacionales) +
            parseFormattedNumber(costs.impuestoPais) +
            parseFormattedNumber(costs.oficializacion) +
            parseFormattedNumber(costs.sertear) +
            parseFormattedNumber(costs.gastosInternos) +
            parseFormattedNumber(costs.terminal) +
            parseFormattedNumber(costs.almacenaje) +
            parseFormattedNumber(costs.ivetra) +
            parseFormattedNumber(costs.tap) +
            parseFormattedNumber(costs.honorarios)

        // Calculate subtotal
        const subtotal = totalFobARS + totalCosts

        // Calculate 23% utilidad
        const utilidadAmount = subtotal * 0.23

        // Update utilidad field with formatted value
        setCosts(prev => ({ ...prev, utilidad: utilidadAmount.toFixed(2) }))

        alert(
            `Cálculo de Utilidad (23%):\n\n` +
            `FOB ARS: $${totalFobARS.toLocaleString('es-AR', { minimumFractionDigits: 2 })}\n` +
            `Costos: $${totalCosts.toLocaleString('es-AR', { minimumFractionDigits: 2 })}\n` +
            `Subtotal: $${subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}\n\n` +
            `Utilidad (23%): $${utilidadAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
        )
    }

    const handleSubmit = async () => {
        console.log('🟢 BOTÓN NETEAR COSTOS CLICKEADO')
        console.log('Dispatch:', dispatch)
        console.log('Costs:', costs)

        setSubmitting(true)
        try {
            // 0. Validate dispatch has an ID
            if (!dispatch.id) {
                alert('Error: El despacho no tiene un ID válido. Por favor, recarga la página e intenta de nuevo.')
                console.error('Dispatch object:', dispatch)
                setSubmitting(false)
                return
            }

            console.log('Dispatch ID:', dispatch.id)
            console.log('Dispatch Number:', dispatch.dispatch_number)


            // 1. Fetch all products for this dispatch
            console.log('\n🔍 BUSCANDO PRODUCTOS...')
            console.log('Dispatch Number:', dispatch.dispatch_number, '(type:', typeof dispatch.dispatch_number, ')')
            console.log('Company ID:', dispatch.company_id, '(type:', typeof dispatch.company_id, ')')

            // First, try to find ANY products with this dispatch_number (no filters)
            console.log('\n📊 Paso 1: Buscando SIN filtros...')
            const { data: allProducts, error: allError } = await supabase
                .from('products')
                .select('id, name, dispatch_number, company_id')
                .eq('dispatch_number', dispatch.dispatch_number)

            console.log('Productos encontrados sin filtro de company:', allProducts?.length || 0)
            if (allProducts && allProducts.length > 0) {
                console.log('Company IDs en productos:', [...new Set(allProducts.map(p => p.company_id))])
                console.log('Primer producto:', allProducts[0])
            }

            // Now try with company_id filter
            console.log('\n📊 Paso 2: Buscando CON filtro de company_id...')
            const { data: products, error: fetchError } = await supabase
                .from('products')
                .select('*')
                .eq('dispatch_number', dispatch.dispatch_number)
                .eq('company_id', dispatch.company_id)

            console.log('Productos encontrados con company_id:', products?.length || 0)

            // If mismatch, show the issue
            if (allProducts?.length > 0 && (!products || products.length === 0)) {
                console.error('⚠️ PROBLEMA DETECTADO:')
                console.error('  - Hay', allProducts.length, 'productos con dispatch_number:', dispatch.dispatch_number)
                console.error('  - Pero 0 productos con company_id:', dispatch.company_id)
                console.error('  - Company IDs en productos:', allProducts.map(p => p.company_id))
                console.error('  - Company ID del despacho:', dispatch.company_id)
            }

            // Log first product details to see what fields N8N is using
            if (products && products.length > 0) {
                console.log('\n📦 PRIMER PRODUCTO (para diagnóstico):')
                console.log('  - name:', products[0].name)
                console.log('  - price:', products[0].price)
                console.log('  - unit_price_usd:', products[0].unit_price_usd)
                console.log('  - stock:', products[0].stock)
                console.log('  - Todos los campos:', products[0])
            }

            if (fetchError) {
                console.error('❌ Error al buscar productos:', fetchError)
                throw fetchError
            }

            // Use allProducts if products is empty (fallback)
            const finalProducts = (products && products.length > 0) ? products : allProducts

            if (!finalProducts || finalProducts.length === 0) {
                console.error('❌ NO SE ENCONTRARON PRODUCTOS')
                console.error('Dispatch number buscado:', dispatch.dispatch_number)

                // Query to show what dispatch_numbers actually exist
                const { data: allDispatchNumbers } = await supabase
                    .from('products')
                    .select('dispatch_number')
                    .not('dispatch_number', 'is', null)
                    .limit(100)

                const uniqueDispatchNumbers = [...new Set(allDispatchNumbers?.map(p => p.dispatch_number) || [])]
                console.error('📋 Dispatch numbers que SÍ existen en la BD:', uniqueDispatchNumbers)

                alert(
                    `❌ No se encontraron productos para el despacho "${dispatch.dispatch_number}"\n\n` +
                    `Posibles causas:\n` +
                    `1. El archivo Excel no se subió correctamente (revisa si hubo error de CORS)\n` +
                    `2. N8N guardó los productos con otro dispatch_number\n` +
                    `3. Los productos están en otra company\n\n` +
                    `Dispatch numbers en la BD: ${uniqueDispatchNumbers.slice(0, 5).join(', ')}${uniqueDispatchNumbers.length > 5 ? '...' : ''}\n\n` +
                    `Revisa la consola para más detalles.`
                )
                setSubmitting(false)
                return
            }

            console.log('✅ Productos encontrados:', products.length)

            console.log('=== COST DISTRIBUTION START ===')
            console.log('Products:', products.length)
            console.log('Total FOB USD:', costs.totalFob)

            // 2. Validate tipo de cambio
            const tipoDeCambio = parseFormattedNumber(costs.tipoDeCambio)
            if (tipoDeCambio === 0) {
                alert('Debe ingresar el tipo de cambio')
                setSubmitting(false)
                return
            }

            // 3. Validate utilidad is calculated
            if (!costs.utilidad || parseFormattedNumber(costs.utilidad) === 0) {
                alert('Debe calcular la utilidad primero usando el botón "Calcular Utilidad (23%)"')
                setSubmitting(false)
                return
            }

            // 3. Calculate total FOB in ARS (applying exchange rate)
            const totalFobARS = costs.totalFob * tipoDeCambio
            console.log('Total FOB ARS:', totalFobARS)

            // 4. Calculate total costs (all costs except tipo de cambio and utilidad)
            const totalCosts =
                parseFormattedNumber(costs.flete) +
                parseFormattedNumber(costs.derechos) +
                parseFormattedNumber(costs.estadisticas) +
                parseFormattedNumber(costs.impuestosInternacionales) +
                parseFormattedNumber(costs.impuestoPais) +
                parseFormattedNumber(costs.oficializacion) +
                parseFormattedNumber(costs.sertear) +
                parseFormattedNumber(costs.gastosInternos) +
                parseFormattedNumber(costs.terminal) +
                parseFormattedNumber(costs.almacenaje) +
                parseFormattedNumber(costs.ivetra) +
                parseFormattedNumber(costs.tap) +
                parseFormattedNumber(costs.honorarios)

            console.log('Total Costs (ARS):', totalCosts)

            // 5. Calculate subtotal and utilidad
            const subtotal = totalFobARS + totalCosts
            const utilidadAmount = parseFormattedNumber(costs.utilidad)
            console.log('Subtotal (FOB ARS + Costs):', subtotal)
            console.log('Utilidad (23%):', utilidadAmount)

            // 7. Calculate total to distribute
            const totalToDistribute = subtotal + utilidadAmount
            console.log('Total to Distribute:', totalToDistribute)

            if (costs.totalFob === 0) {
                alert('El total FOB es 0, no se puede distribuir')
                return
            }

            // 8. Distribute costs proportionally to each product
            const updatedProducts = products.map(product => {
                // Calculate product's FOB value in USD
                // N8N stores the unit price in 'unit_price_usd' field, not 'price'
                const unitPrice = product.unit_price_usd || product.price || 0
                const productFobUSD = unitPrice * product.stock

                // Calculate product's proportion of total FOB
                const proportion = productFobUSD / costs.totalFob

                // Calculate product's share of total to distribute
                const productShare = totalToDistribute * proportion

                // Calculate final price per unit in ARS
                const pricePerUnitARS = productShare / product.stock

                console.log(`\nProduct ${product.name}:`)
                console.log(`  Price USD: $${unitPrice.toFixed(2)}`)
                console.log(`  Quantity: ${product.stock}`)
                console.log(`  FOB USD: $${productFobUSD.toFixed(2)}`)
                console.log(`  Proportion: ${(proportion * 100).toFixed(2)}%`)
                console.log(`  Share of Total: $${productShare.toFixed(2)}`)
                console.log(`  Final Price per Unit (ARS): $${pricePerUnitARS.toFixed(2)}`)

                return {
                    id: product.id,
                    price: pricePerUnitARS  // This is the final price in ARS
                }
            })

            // 6. Update all products in database
            console.log('\n=== UPDATING PRODUCTS ===')
            console.log('Total products to update:', updatedProducts.length)

            for (let i = 0; i < updatedProducts.length; i++) {
                const product = updatedProducts[i]
                console.log(`Updating product ${i + 1}/${updatedProducts.length} - ID: ${product.id}, New Price: $${product.price.toFixed(2)}`)

                const { error: updateError } = await supabase
                    .from('products')
                    .update({ price: product.price })
                    .eq('id', product.id)

                if (updateError) {
                    console.error(`❌ Error updating product ${product.id}:`, updateError)
                    throw updateError
                }
                console.log(`✅ Product ${product.id} updated successfully`)
            }

            console.log('✅ All products updated successfully')

            // 7. Update dispatch status to 'completed' and save FOB totals
            console.log('\n=== UPDATING DISPATCH ===')
            console.log('Dispatch ID to update:', dispatch.id)
            console.log('New status: completed')
            console.log('Total FOB USD:', costs.totalFob)
            console.log('Total FOB ARS:', totalFobARS)

            const { error: dispatchError } = await supabase
                .from('dispatches')
                .update({
                    status: 'completed',
                    total_fob_usd: costs.totalFob,
                    total_fob_ars: totalFobARS
                })
                .eq('id', dispatch.id)

            if (dispatchError) {
                console.error('❌ Error updating dispatch:', dispatchError)
                throw dispatchError
            }

            console.log('✅ Dispatch updated successfully')

            console.log('=== COST DISTRIBUTION COMPLETE ===')

            alert(`✅ Costos distribuidos exitosamente!\n\n` +
                `${products.length} productos actualizados\n\n` +
                `FOB Total (USD): $${costs.totalFob.toLocaleString('es-AR', { minimumFractionDigits: 2 })}\n` +
                `Tipo de Cambio: $${tipoDeCambio.toLocaleString('es-AR', { minimumFractionDigits: 2 })}\n` +
                `FOB Total (ARS): $${totalFobARS.toLocaleString('es-AR', { minimumFractionDigits: 2 })}\n\n` +
                `Costos: $${totalCosts.toLocaleString('es-AR', { minimumFractionDigits: 2 })}\n` +
                `Subtotal: $${subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}\n` +
                `Utilidad (23%): $${utilidadAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}\n\n` +
                `Total Distribuido: $${totalToDistribute.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`)

            // Refresh the page
            window.location.reload()

        } catch (err) {
            console.error('❌ ERROR EN NETEO DE COSTOS:')
            console.error('Error completo:', err)
            console.error('Mensaje:', err.message)
            console.error('Stack:', err.stack)
            console.error('Dispatch actual:', dispatch)
            console.error('Costos actuales:', costs)
            alert('Error al distribuir costos: ' + err.message + '\n\nRevisa la consola para más detalles (F12)')
        } finally {
            setSubmitting(false)
        }
    }

    const costFields = [
        { key: 'tipoDeCambio', label: 'Tipo de Cambio' },
        { key: 'flete', label: 'Flete' },
        { key: 'derechos', label: 'Derechos' },
        { key: 'estadisticas', label: 'Estadísticas' },
        { key: 'impuestosInternacionales', label: 'Impuestos Internacionales' },
        { key: 'impuestoPais', label: 'Impuesto País' },
        { key: 'oficializacion', label: 'Oficialización' },
        { key: 'sertear', label: 'Sertear' },
        { key: 'gastosInternos', label: 'Gastos Internos' },
        { key: 'terminal', label: 'Terminal' },
        { key: 'almacenaje', label: 'Almacenaje' },
        { key: 'ivetra', label: 'Ivetra' },
        { key: 'tap', label: 'TAP' },
        { key: 'honorarios', label: 'Honorarios' },
        { key: 'utilidad', label: 'Utilidad' }
    ]

    if (loading) {
        return (
            <div className="p-8 h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
            </div>
        )
    }

    return (
        <div className="p-8 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Cargar Costos de Importación</h2>
                    <p className="text-sm text-slate-500">Despacho: <span className="text-cyan-400 font-mono">{dispatch.dispatch_number}</span></p>
                </div>
                {/* Action Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={calculateUtilidad}
                        disabled={submitting}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                    >
                        <Calculator className="w-5 h-5" />
                        Calcular Utilidad (23%)
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || !costs.utilidad}
                        className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Procesando...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-5 h-5" />
                                Netear Costos
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* FOB Total Card */}
            <div className="mb-6 bg-gradient-to-r from-cyan-900 to-slate-900 rounded-xl p-6 border border-cyan-500/20">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-cyan-400 text-sm font-medium mb-1">Total FOB (Cargado Automáticamente)</p>
                        <p className="text-white text-3xl font-bold font-mono">${costs.totalFob.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <DollarSign className="w-12 h-12 text-cyan-500/30" />
                </div>
            </div>

            {/* Cost Fields Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto pb-20">
                {costFields.map((field) => (
                    <div key={field.key} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-2">{field.label}</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={costs[field.key]}
                                onChange={(e) => handleCostChange(field.key, e.target.value)}
                                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg pl-6 pr-3 py-2 text-slate-900 dark:text-white outline-none focus:border-cyan-500 transition-colors font-mono"
                            />
                        </div>
                    </div>
                ))}
            </div>

            <button onClick={onBack} className="mt-4 text-slate-500 hover:text-white text-sm">← Volver</button>
        </div>
    )
}

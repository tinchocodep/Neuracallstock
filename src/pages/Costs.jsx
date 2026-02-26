import { useState, useEffect, useCallback } from 'react'
import {
    Upload,
    DollarSign,
    Plus,
    CheckCircle2,
    Box,
    ChevronRight,
    ChevronLeft,
    Loader2,
    X,
    FileSpreadsheet,
    Send,
    Calculator,
    Trash2,
    FilePlus2
} from 'lucide-react'
import { supabase } from '../supabaseClient'

// ─────────────────────────────────────────────
// ROOT ORCHESTRATOR
// Manages step navigation and selected dispatch.
// Single responsibility: routing between steps.
// ─────────────────────────────────────────────
export function Costs() {
    const [step, setStep] = useState(1)
    const [selectedDispatch, setSelectedDispatch] = useState(null)

    const handleDispatchSelect = (d) => {
        setSelectedDispatch(d)
        // Pending = products uploaded, costs not yet distributed → skip to CostsForm
        if (d.status === 'pending' || d.status === 'completed') {
            setStep(3)
            return
        }
        // Default: new dispatch → go to upload step
        setStep(2)
    }

    const handleUploadDone = (updatedDispatch) => {
        if (updatedDispatch) {
            setSelectedDispatch(prev => ({ ...prev, ...updatedDispatch }))
        }
        setStep(3)
    }

    const handleReset = () => {
        setSelectedDispatch(null)
        setStep(1)
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* ── Header / Progress Bar ── */}
            <div className="bg-gradient-to-r from-cyan-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-cyan-500/20">
                <h1 className="text-2xl font-bold mb-2">Sistema de Neteo de Costos</h1>
                <p className="text-cyan-200 text-sm mb-8">Importá productos y distribuí costos proporcionalmente</p>

                <div className="flex items-center justify-between px-10 relative">
                    <div className="absolute left-0 top-1/2 w-full h-0.5 bg-slate-700 -z-0" />
                    {[
                        { id: 1, label: 'Seleccionar Despacho', icon: Box },
                        { id: 2, label: 'Subir Invoices', icon: Upload },
                        { id: 3, label: 'Netear Costos', icon: DollarSign },
                    ].map((s) => (
                        <div key={s.id} className="relative z-10 flex flex-col items-center gap-3">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${step >= s.id
                                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/50 scale-110'
                                : 'bg-slate-800 text-slate-400 border border-slate-600'
                                }`}>
                                <s.icon className="w-6 h-6" />
                            </div>
                            <span className={`text-xs font-medium tracking-wide ${step >= s.id ? 'text-cyan-400' : 'text-slate-500'}`}>
                                {s.label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Content Area ── */}
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm min-h-[500px] relative overflow-hidden">

                {/* STEP 1: Pick or create a dispatch */}
                {step === 1 && (
                    <DispatchSelection onSelect={handleDispatchSelect} />
                )}

                {/* STEP 2: Upload 1 or 2 invoice Excels */}
                {step === 2 && selectedDispatch && (
                    <InvoiceUpload
                        dispatch={selectedDispatch}
                        onNext={handleUploadDone}
                        onBack={() => { setSelectedDispatch(null); setStep(1) }}
                    />
                )}

                {/* STEP 3: Net costs */}
                {step === 3 && selectedDispatch && (
                    <CostsForm
                        dispatch={selectedDispatch}
                        onBack={() => setStep(2)}
                        onReset={handleReset}
                    />
                )}
            </div>
        </div>
    )
}


// ─────────────────────────────────────────────
// STEP 1: SELECT OR CREATE DISPATCH
// Responsibility: find/create a single dispatch.
// ─────────────────────────────────────────────
function DispatchSelection({ onSelect }) {
    const [isCreating, setIsCreating] = useState(false)
    const [dispatches, setDispatches] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [page, setPage] = useState(0)
    const [pageSize, setPageSize] = useState(10)
    const [totalCount, setTotalCount] = useState(0)
    const [newDispatch, setNewDispatch] = useState({ dispatch_number: '', description: '', origin: 'CHINA' })
    const [userCompanyId, setUserCompanyId] = useState(null)

    // Fetch user's company_id on mount
    useEffect(() => {
        const fetchUserCompanyId = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('company_id')
                .eq('id', user.id)
                .single()
            if (profile) setUserCompanyId(profile.company_id)
        }
        fetchUserCompanyId()
    }, [])

    // Debounced search
    useEffect(() => {
        setPage(0)
        const timer = setTimeout(fetchDispatches, 300)
        return () => clearTimeout(timer)
    }, [searchTerm])

    useEffect(() => { fetchDispatches() }, [page, pageSize])

    const fetchDispatches = useCallback(async () => {
        setLoading(true)
        try {
            let query = supabase
                .from('dispatches')
                .select('id, dispatch_number, description, origin, status, created_at, company_id', { count: 'exact' })
                .order('created_at', { ascending: false })

            if (searchTerm) query = query.ilike('dispatch_number', `%${searchTerm}%`)

            const from = page * pageSize
            const { data, count, error } = await query.range(from, from + pageSize - 1)
            if (error) throw error
            setDispatches(data || [])
            setTotalCount(count || 0)
        } catch (err) {
            console.error('Error fetching dispatches:', err)
        } finally {
            setLoading(false)
        }
    }, [searchTerm, page, pageSize])

    // Resolve company_id — inline fallback for race conditions
    const resolveCompanyId = async () => {
        if (userCompanyId) return userCompanyId
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return null
        const { data: profile } = await supabase
            .from('user_profiles').select('company_id').eq('id', user.id).single()
        return profile?.company_id || null
    }

    const handleCreate = async () => {
        if (!newDispatch.dispatch_number || !newDispatch.description) {
            alert('Por favor completá el número de despacho y la referencia')
            return
        }
        const companyId = await resolveCompanyId()
        if (!companyId) {
            alert('Error: No se pudo obtener la empresa del usuario. Recargá la página.')
            return
        }
        // Create dispatch directly in Supabase — N8N will only insert products
        const { data: created, error } = await supabase
            .from('dispatches')
            .insert({
                dispatch_number: newDispatch.dispatch_number,
                description: newDispatch.description,
                origin: newDispatch.origin || 'CHINA',
                company_id: companyId,
                status: 'open'
            })
            .select('id, dispatch_number, description, origin, status, company_id')
            .single()

        if (error) {
            if (error.code === '23505') {
                alert(`El despacho "${newDispatch.dispatch_number}" ya existe. Buscalo en la lista y seleccionalo.`)
            } else {
                alert('Error al crear el despacho: ' + error.message)
            }
            return
        }

        setIsCreating(false)
        onSelect(created)
        setNewDispatch({ dispatch_number: '', description: '', origin: 'CHINA' })
        fetchDispatches()
    }

    const handleDeleteDispatch = async (dispatch, e) => {
        e.stopPropagation()

        // Primera confirmación — muestra detalles del despacho
        const confirmed = window.confirm(
            `⚠️ ELIMINAR DESPACHO\n\n` +
            `N° Despacho: ${dispatch.dispatch_number}\n` +
            `Referencia: ${dispatch.description || '—'}\n\n` +
            `Esto eliminará PERMANENTEMENTE:\n` +
            `• El despacho\n` +
            `• Todos sus productos asociados\n\n` +
            `¿Estás seguro? Esta acción NO se puede deshacer.`
        )
        if (!confirmed) return

        // Segunda confirmación — barrera anti-misclick
        const doubleCheck = window.confirm(
            `Última confirmación:\n\n¿Eliminar definitivamente "${dispatch.dispatch_number}"?`
        )
        if (!doubleCheck) return

        try {
            setLoading(true)
            // Limpiar productos por dispatch_id (flujo nuevo)
            await supabase.from('products').delete().eq('dispatch_id', dispatch.id)
            // Limpiar productos por dispatch_number (retrocompatibilidad con productos legados)
            await supabase.from('products').delete().eq('dispatch_number', dispatch.dispatch_number)
            // Eliminar el despacho
            const { error } = await supabase.from('dispatches').delete().eq('id', dispatch.id)
            if (error) throw error
            console.log(`[Dispatch] ✅ Eliminado: ${dispatch.dispatch_number}`)
            fetchDispatches()
        } catch (err) {
            console.error('Error deleting dispatch:', err)
            alert('Error al eliminar el despacho: ' + err.message)
            setLoading(false)
        }
    }

    const statusLabel = (s) => s === 'completed' ? 'Completado' : s === 'open' ? 'En Proceso' : 'Pendiente'
    const statusColor = (s) => s === 'completed'
        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
        : s === 'open'
            ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
            : 'bg-amber-500/10 text-amber-500 border-amber-500/20'

    if (isCreating) {
        return (
            <div className="p-8 max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Crear Nuevo Despacho</h2>
                    <button onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-white transition-colors"><X /></button>
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
                        <label className="text-sm font-medium text-slate-400">Referencia / Descripción *</label>
                        <input
                            value={newDispatch.description}
                            onChange={e => setNewDispatch({ ...newDispatch, description: e.target.value })}
                            placeholder="Ej: PROVEEDOR-XYZ-REF-123"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white outline-none focus:border-cyan-500 transition-colors"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-400">Origen</label>
                        <div className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-400">CHINA</div>
                    </div>
                    <div className="pt-4 flex gap-4">
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
                    <p className="text-slate-500 text-xs mt-0.5">Seleccioná un despacho existente o creá uno nuevo</p>
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
                    className="block w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500 sm:text-sm"
                    placeholder="Buscar por número de despacho..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Table Header */}
            <div className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 grid grid-cols-12 px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider rounded-t-xl">
                <div className="col-span-4 pl-8">Despacho</div>
                <div className="col-span-3">Referencia</div>
                <div className="col-span-2 text-center">Origen</div>
                <div className="col-span-2 text-right">Estado</div>
                <div className="col-span-1" />
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
                        {dispatches.map((d) => {
                            const isPending = d.status === 'pending'
                            return (
                                <div
                                    key={d.id}
                                    onClick={() => onSelect(d)}
                                    className={`grid grid-cols-12 px-4 py-3 items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors text-xs text-slate-700 dark:text-slate-300 group ${isPending ? 'bg-amber-500/5 hover:bg-amber-500/10' : ''}`}
                                >
                                    <div className="col-span-4 flex items-center gap-3">
                                        <Box className={`w-4 h-4 transition-colors ${isPending ? 'text-amber-500' : 'text-slate-400 group-hover:text-cyan-500'}`} />
                                        <span className="font-bold text-slate-900 dark:text-white font-mono">{d.dispatch_number}</span>
                                        {isPending && (
                                            <span className="text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded px-1 py-0.5 font-bold tracking-wide">
                                                RETOMAR →
                                            </span>
                                        )}
                                    </div>
                                    <div className="col-span-3 truncate pr-2 text-slate-500">{d.description || '-'}</div>
                                    <div className="col-span-2 text-center text-slate-500">{d.origin}</div>
                                    <div className="col-span-2 text-right">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusColor(d.status)}`}>
                                            {statusLabel(d.status)}
                                        </span>
                                    </div>
                                    <div className="col-span-1 flex justify-center">
                                        <button
                                            onClick={(e) => handleDeleteDispatch(d, e)}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-all"
                                            title="Eliminar despacho"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
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
                            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0) }}
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded px-2 py-1 outline-none focus:border-cyan-500 text-slate-700 dark:text-white"
                        >
                            {[10, 20, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0 || loading}
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors text-slate-500 dark:text-slate-400"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-mono w-12 text-center text-slate-500 dark:text-slate-400">
                            {page + 1} / {Math.max(1, Math.ceil(totalCount / pageSize))}
                        </span>
                        <button
                            onClick={() => setPage(p => (p + 1) * pageSize < totalCount ? p + 1 : p)}
                            disabled={(page + 1) * pageSize >= totalCount || loading}
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors text-slate-500 dark:text-slate-400"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}


// ─────────────────────────────────────────────
// STEP 2: UPLOAD 1 OR 2 INVOICES
// Responsibility: manage files and call N8N.
// Both invoices belong to the SAME dispatch.
// ─────────────────────────────────────────────
function InvoiceUpload({ dispatch, onNext, onBack }) {
    const [file1, setFile1] = useState(null)
    const [file2, setFile2] = useState(null)
    const [hasSecondInvoice, setHasSecondInvoice] = useState(false)
    const [uploadingStep, setUploadingStep] = useState(null) // null | 'invoice1' | 'invoice2' | 'done'

    const N8N_URL = 'https://n8n.neuracall.net/webhook/LecturaDeInvoice'

    // Resolve company_id — fallback fetch if not on dispatch object
    const resolveCompanyId = async () => {
        if (dispatch?.company_id && dispatch.company_id !== 'null') return dispatch.company_id
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return null
        const { data: profile } = await supabase
            .from('user_profiles').select('company_id').eq('id', user.id).single()
        return profile?.company_id || null
    }

    // ── 2 llamadas secuenciales a N8N (1 archivo por llamada) ─────────────
    // N8N solo procesa 1 archivo por ejecución del workflow.
    // Cada invoice = 1 llamada separada → N8N inserta sus productos.
    const buildSingleFormData = (file, invoiceRole, invoiceIndex, companyId) => {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('dispatchId', dispatch.id)            // ID ya creado en Supabase
        fd.append('dispatchNumber', dispatch.dispatch_number)
        fd.append('description', dispatch.description || '')
        fd.append('origin', dispatch.origin || 'CHINA')
        fd.append('companyId', companyId)
        fd.append('invoiceRole', invoiceRole)            // 'primary' | 'secondary'
        fd.append('invoiceIndex', String(invoiceIndex)) // '1' | '2'
        fd.append('totalInvoices', hasSecondInvoice ? '2' : '1')
        return fd
    }

    const callN8N = async (file, invoiceRole, invoiceIndex, companyId) => {
        const fd = buildSingleFormData(file, invoiceRole, invoiceIndex, companyId)
        console.log(`[N8N] Invoice ${invoiceIndex} (${invoiceRole}) | dispatch: ${dispatch.dispatch_number} | id: ${dispatch.id}`)
        const response = await fetch(N8N_URL, { method: 'POST', body: fd })
        if (!response.ok) throw new Error(`N8N error (invoice ${invoiceIndex}): HTTP ${response.status}`)
        const text = await response.text()
        if (!text?.trim()) return 0
        try {
            const result = JSON.parse(text)
            console.log(`[N8N] Response (invoice ${invoiceIndex}):`, result)
            return result.total_fob_usd || 0
        } catch { return 0 }
    }

    const handleProcessAll = async () => {
        if (!file1) return
        if (hasSecondInvoice && !file2) return

        if (!dispatch.id) {
            alert('Error: el despacho no tiene ID. Por favor recargá la página.')
            return
        }

        try {
            const companyId = await resolveCompanyId()
            if (!companyId) { alert('Error: no se pudo obtener la empresa del usuario.'); return }

            // ── Llamada 1: Invoice principal ──
            setUploadingStep('invoice1')
            const fob1 = await callN8N(file1, 'primary', 1, companyId)

            if (!hasSecondInvoice) {
                // 1 sola invoice → avanzar a neteo
                onNext({ id: dispatch.id, total_fob_usd: fob1, status: 'pending' })
                return
            }

            // ── Llamada 2: Invoice secundaria (mismo dispatch) ──
            setUploadingStep('invoice2')
            const fob2 = await callN8N(file2, 'secondary', 2, companyId)

            setUploadingStep('done')
            onNext({ id: dispatch.id, total_fob_usd: fob1 + fob2, status: 'pending' })

        } catch (err) {
            console.error('[InvoiceUpload] Error:', err)
            alert('Error al subir el archivo: ' + err.message)
        } finally {
            if (uploadingStep !== 'done') setUploadingStep(null)
        }
    }

    const isUploading = uploadingStep !== null && uploadingStep !== 'done'
    const canSubmit = file1 && (!hasSecondInvoice || file2) && !isUploading

    return (
        <div className="p-8 flex flex-col items-center gap-6 min-h-[500px]">
            {/* Header */}
            <div className="text-center w-full max-w-2xl">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    Cargar Invoices — Despacho <span className="font-mono text-cyan-400">{dispatch.dispatch_number}</span>
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                    {hasSecondInvoice
                        ? 'Subí los archivos Excel de ambas invoices. Se procesarán en el mismo despacho.'
                        : 'Subí el archivo Excel con los productos de la invoice.'}
                </p>
            </div>

            {/* Upload Zones */}
            <div className="flex flex-col gap-4 w-full max-w-2xl">
                {/* Invoice 1 — always visible */}
                <UploadZone
                    file={file1}
                    setFile={setFile1}
                    inputId="invoice-file-1"
                    label="Invoice 1 — Principal"
                    accent="cyan"
                    isProcessing={uploadingStep === 'invoice1'}
                    isDisabled={isUploading}
                />

                {/* Toggle button for 2nd invoice */}
                {!hasSecondInvoice && !isUploading && (
                    <button
                        onClick={() => setHasSecondInvoice(true)}
                        className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-xl py-4 text-slate-500 hover:text-cyan-400 transition-all group text-sm font-medium"
                    >
                        <FilePlus2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        + Agregar 2da Invoice (opcional)
                    </button>
                )}

                {/* Invoice 2 — conditional */}
                {hasSecondInvoice && (
                    <div className="relative">
                        <button
                            onClick={() => { setHasSecondInvoice(false); setFile2(null) }}
                            disabled={isUploading}
                            className="absolute -top-2 -right-2 z-10 w-6 h-6 rounded-full bg-slate-700 hover:bg-red-600 text-slate-300 hover:text-white flex items-center justify-center transition-all disabled:opacity-40"
                            title="Quitar 2da invoice"
                        >
                            <X className="w-3 h-3" />
                        </button>
                        <UploadZone
                            file={file2}
                            setFile={setFile2}
                            inputId="invoice-file-2"
                            label="Invoice 2 — Secundaria"
                            accent="purple"
                            isProcessing={uploadingStep === 'invoice2'}
                            isWaiting={uploadingStep === 'invoice1'}
                            isDisabled={isUploading}
                        />
                    </div>
                )}
            </div>

            {/* Submit */}
            <button
                onClick={handleProcessAll}
                disabled={!canSubmit}
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-10 py-3 rounded-xl font-bold shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
                {isUploading ? (
                    <>
                        <Loader2 className="animate-spin w-5 h-5" />
                        {uploadingStep === 'invoice1' ? 'Procesando Invoice 1...' : 'Procesando Invoice 2...'}
                    </>
                ) : (
                    <>
                        <Send className="w-5 h-5" />
                        {hasSecondInvoice ? 'Enviar Ambas Invoices' : 'Enviar Invoice'}
                    </>
                )}
            </button>

            <button onClick={onBack} className="text-slate-500 hover:text-white text-sm transition-colors">← Volver</button>
        </div>
    )
}

// ─────────────────────────────────────────────
// REUSABLE UPLOAD ZONE
// Responsibility: single file drag/drop area.
// ─────────────────────────────────────────────
function UploadZone({ file, setFile, inputId, label, accent, isProcessing, isWaiting, isDisabled }) {
    const borderColor = accent === 'purple' ? 'border-purple-500/30' : 'border-cyan-500/30'
    const accentText = accent === 'purple' ? 'text-purple-400' : 'text-cyan-400'
    const activeFileBorder = accent === 'purple' ? 'border-purple-500 bg-purple-500/10' : 'border-cyan-500 bg-cyan-500/10'
    const activeFileText = accent === 'purple' ? 'text-purple-300' : 'text-cyan-300'
    const fileIcon = accent === 'purple' ? 'text-purple-400' : 'text-cyan-400'

    return (
        <div className={`flex flex-col gap-3 p-5 rounded-2xl border-2 ${borderColor} bg-slate-900/40 ${isDisabled ? 'opacity-60 pointer-events-none' : ''}`}>
            <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider ${accentText}`}>{label}</span>
                {isProcessing && (
                    <span className="flex items-center gap-1 text-xs text-amber-400">
                        <Loader2 className="w-3 h-3 animate-spin" /> Procesando con N8N...
                    </span>
                )}
                {isWaiting && (
                    <span className="text-xs text-slate-500">Esperando Invoice 1...</span>
                )}
            </div>
            <input
                type="file"
                id={inputId}
                className="hidden"
                accept=".xlsx,.xls,.csv"
                disabled={isDisabled}
                onChange={e => e.target.files?.[0] && setFile(e.target.files[0])}
            />
            <label
                htmlFor={inputId}
                className={`w-full border-2 border-dashed rounded-xl p-6 flex flex-col items-center cursor-pointer transition-all group
                    ${file ? activeFileBorder : 'border-slate-700 hover:border-slate-500'}`}
            >
                {file ? (
                    <>
                        <FileSpreadsheet className={`w-10 h-10 mb-2 ${fileIcon}`} />
                        <p className={`font-bold text-sm ${activeFileText}`}>{file.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
                    </>
                ) : (
                    <>
                        <Upload className="w-10 h-10 text-slate-600 group-hover:text-slate-400 mb-2 transition-colors" />
                        <p className="text-slate-400 text-sm font-medium">Seleccionar Excel</p>
                        <p className="text-slate-600 text-xs mt-0.5">.xlsx · .xls · .csv</p>
                    </>
                )}
            </label>
            {file && (
                <button
                    onClick={() => setFile(null)}
                    className="text-xs text-slate-500 hover:text-red-400 transition-colors self-center"
                >
                    Quitar archivo
                </button>
            )}
        </div>
    )
}


// ─────────────────────────────────────────────
// STEP 3: NET COSTS
// Responsibility: collect cost inputs and
// distribute proportionally across all products
// of the single selected dispatch.
// ─────────────────────────────────────────────
function CostsForm({ dispatch, onBack, onReset }) {
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
    const [reviewProducts, setReviewProducts] = useState(null)
    const [loadingReview, setLoadingReview] = useState(false)
    const [showReview, setShowReview] = useState(false)

    // ── Decimal input helpers ──

    const formatDecimalInput = (rawDigits) => {
        if (!rawDigits) return ''
        const digits = String(rawDigits).replace(/\D/g, '')
        if (!digits) return ''
        const padded = digits.padStart(3, '0')
        const intPart = padded.slice(0, -2)
        const decPart = padded.slice(-2)
        const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
        return `${intFormatted},${decPart}`
    }

    const parseFormattedNumber = (value) => {
        if (!value) return 0
        if (/^\d+$/.test(String(value))) return parseInt(value, 10) / 100
        return parseFloat(String(value).replace(/\./g, '').replace(/,/g, '.')) || 0
    }

    const handleCostChange = (field, rawInput) => {
        const cleanDigits = rawInput.replace(/\D/g, '').replace(/^0+/, '') || ''
        setCosts(prev => ({ ...prev, [field]: cleanDigits }))
    }

    // ── Load FOB total from dispatch ──
    useEffect(() => {
        const fetchFOB = async () => {
            setLoading(true)
            try {
                let fob = dispatch.total_fob_usd || 0
                if (!fob && dispatch.id) {
                    const { data } = await supabase
                        .from('dispatches')
                        .select('total_fob_usd')
                        .eq('id', dispatch.id)
                        .maybeSingle()
                    fob = data?.total_fob_usd || 0
                }
                setCosts(prev => ({ ...prev, totalFob: fob }))
            } catch (err) {
                console.error('Error fetching FOB:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchFOB()
    }, [dispatch.id])

    // ── Calculate utilidad (23% of subtotal) ──
    const calculateUtilidad = () => {
        const tipoDeCambio = parseFormattedNumber(costs.tipoDeCambio)
        if (tipoDeCambio === 0) { alert('Debe ingresar el tipo de cambio primero'); return }

        const totalFobARS = costs.totalFob * tipoDeCambio
        const totalCosts = sumCostFields(costs)
        const subtotal = totalFobARS + totalCosts
        const utilidadAmount = subtotal * 0.23
        const utilidadRawDigits = Math.round(utilidadAmount * 100).toString()

        setCosts(prev => ({ ...prev, utilidad: utilidadRawDigits }))

        alert(
            `Cálculo de Utilidad (23%):\n\n` +
            `FOB Total ARS: $${totalFobARS.toLocaleString('es-AR', { minimumFractionDigits: 2 })}\n` +
            `Costos: $${totalCosts.toLocaleString('es-AR', { minimumFractionDigits: 2 })}\n` +
            `Subtotal: $${subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}\n\n` +
            `✅ Utilidad (23%): $${utilidadAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
        )
    }

    // ── Submit: distribute costs proportionally ──
    const handleSubmit = async () => {
        if (!dispatch.id) {
            alert('Error: El despacho no tiene un ID válido. Recargá la página.')
            return
        }
        const tipoDeCambio = parseFormattedNumber(costs.tipoDeCambio)
        if (tipoDeCambio === 0) { alert('Debe ingresar el tipo de cambio'); return }
        if (!costs.utilidad || parseFormattedNumber(costs.utilidad) === 0) {
            alert('Debe calcular la utilidad primero usando el botón "Calcular Utilidad (23%)"')
            return
        }
        setSubmitting(true)
        try {
            // 1. Fetch ALL products of this dispatch
            console.log('[CostsForm] Fetching products for dispatch:', dispatch.dispatch_number)
            const { data: products, error: fetchErr } = await supabase
                .from('products')
                .select('*')
                .eq('dispatch_number', dispatch.dispatch_number)

            if (fetchErr) throw fetchErr
            if (!products || products.length === 0) {
                alert('❌ No se encontraron productos para este despacho.\nVerificá que los Excels se hayan subido correctamente.')
                return
            }
            console.log(`[CostsForm] Found ${products.length} products`)

            // 2. Calculate distribution
            const totalFobARS = costs.totalFob * tipoDeCambio
            const totalCosts = sumCostFields(costs)
            const subtotal = totalFobARS + totalCosts
            const utilidadAmount = subtotal * 0.23
            const totalToDistribute = subtotal + utilidadAmount

            if (costs.totalFob === 0) { alert('El total FOB es 0, no se puede distribuir'); return }

            console.log('[CostsForm] Total to distribute (ARS):', totalToDistribute)

            // 3. Distribute proportionally by product FOB value
            const updatedProducts = products.map(product => {
                const unitPrice = product.unit_price_usd || product.price || 0
                const productFobUSD = unitPrice * product.stock
                const proportion = productFobUSD / costs.totalFob
                const productShare = totalToDistribute * proportion
                const pricePerUnitARS = product.stock > 0 ? productShare / product.stock : 0
                return {
                    id: product.id,
                    stock: product.stock,
                    price: pricePerUnitARS,
                    neto: pricePerUnitARS * product.stock
                }
            })

            // 4. Batch update products
            for (const p of updatedProducts) {
                const { error } = await supabase
                    .from('products')
                    .update({ price: p.price, neto: p.neto })
                    .eq('id', p.id)
                if (error) throw error
            }
            console.log(`[CostsForm] ✅ ${updatedProducts.length} products updated`)

            // 5. Mark dispatch as completed
            const fobARS = costs.totalFob * tipoDeCambio
            const { error: dispatchErr } = await supabase
                .from('dispatches')
                .update({ status: 'completed', total_fob_usd: costs.totalFob, total_fob_ars: fobARS })
                .eq('id', dispatch.id)
            if (dispatchErr) throw dispatchErr
            console.log('[CostsForm] ✅ Dispatch marked as completed')

            alert(
                `✅ Costos distribuidos exitosamente!\n\n` +
                `Despacho: ${dispatch.dispatch_number}\n` +
                `${updatedProducts.length} productos actualizados\n\n` +
                `FOB Total (USD): $${costs.totalFob.toLocaleString('es-AR', { minimumFractionDigits: 2 })}\n` +
                `Tipo de Cambio: $${tipoDeCambio.toLocaleString('es-AR', { minimumFractionDigits: 2 })}\n` +
                `FOB Total (ARS): $${totalFobARS.toLocaleString('es-AR', { minimumFractionDigits: 2 })}\n\n` +
                `Costos: $${totalCosts.toLocaleString('es-AR', { minimumFractionDigits: 2 })}\n` +
                `Subtotal: $${subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}\n` +
                `Utilidad (23%): $${utilidadAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}\n\n` +
                `Total Distribuido: $${totalToDistribute.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
            )

            if (onReset) onReset()

        } catch (err) {
            console.error('❌ Error en neteo de costos:', err)
            alert('Error al distribuir costos: ' + err.message + '\n\nRevisa la consola para más detalles (F12)')
        } finally {
            setSubmitting(false)
        }
    }

    // ── Load products for verification panel ──
    const loadReviewProducts = async () => {
        setLoadingReview(true)
        try {
            const { data } = await supabase
                .from('products')
                .select('id, sku, name, stock, unit_price_usd, price, dispatch_number')
                .eq('dispatch_number', dispatch.dispatch_number)
            setReviewProducts(data || [])
            setShowReview(true)
        } catch (err) {
            console.error('Error loading review products:', err)
        } finally {
            setLoadingReview(false)
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
        <div className="p-8 h-full flex flex-col overflow-y-auto">
            {/* ── Header ── */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Cargar Costos de Importación</h2>
                    <span className="inline-flex items-center gap-1.5 text-xs bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-full px-3 py-0.5 font-mono mt-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block" />
                        {dispatch.dispatch_number}
                    </span>
                </div>
                {/* Action Buttons */}
                <div className="flex gap-2 flex-wrap justify-end">
                    <button
                        onClick={loadReviewProducts}
                        disabled={loadingReview}
                        className="bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white font-bold py-2.5 px-4 rounded-xl transition-all flex items-center gap-2 text-sm"
                    >
                        {loadingReview ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                        Ver Productos
                    </button>
                    <button
                        onClick={calculateUtilidad}
                        disabled={submitting}
                        className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 text-sm"
                    >
                        <Calculator className="w-4 h-4" />
                        Calcular Utilidad (23%)
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || !costs.utilidad}
                        className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-700 text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2 text-sm"
                    >
                        {submitting ? (
                            <><Loader2 className="w-4 h-4 animate-spin" />Procesando...</>
                        ) : (
                            <><CheckCircle2 className="w-4 h-4" />Netear Costos</>
                        )}
                    </button>
                </div>
            </div>

            {/* ── FOB Total Card ── */}
            <div className="mb-6 bg-gradient-to-r from-cyan-900 to-slate-900 rounded-xl p-6 border border-cyan-500/20">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-cyan-400 text-sm font-medium mb-1">Total FOB — Despacho {dispatch.dispatch_number}</p>
                        <p className="text-white text-3xl font-bold font-mono">
                            ${costs.totalFob.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-cyan-500/60 text-xs mt-1">Suma de todas las invoices del despacho (USD)</p>
                    </div>
                    <DollarSign className="w-12 h-12 text-cyan-500/30" />
                </div>
            </div>

            {/* ── Panel de Verificación ── */}
            {showReview && reviewProducts && (
                <div className="mb-6 border border-slate-700 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-800">
                        <span className="text-sm font-bold text-white">
                            Verificación de Productos — {reviewProducts.length} ítems
                        </span>
                        <button onClick={() => setShowReview(false)} className="text-slate-400 hover:text-white text-xs">
                            Cerrar ✕
                        </button>
                    </div>
                    <ProductReviewTable products={reviewProducts} />
                </div>
            )}

            {/* ── Cost Fields ── */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-20">
                {costFields.map((field) => (
                    <div key={field.key} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-2">{field.label}</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                            <input
                                type="text"
                                inputMode="numeric"
                                placeholder="0,00"
                                value={formatDecimalInput(costs[field.key])}
                                onChange={(e) => handleCostChange(field.key, e.target.value)}
                                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg pl-6 pr-3 py-2 text-slate-900 dark:text-white outline-none focus:border-cyan-500 transition-colors font-mono text-right"
                            />
                        </div>
                        {costs[field.key] ? (
                            <p className="text-[10px] text-slate-400 mt-1 text-right font-mono">
                                = ${parseFormattedNumber(costs[field.key]).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                            </p>
                        ) : null}
                    </div>
                ))}
            </div>

            <button onClick={onBack} className="mt-4 text-slate-500 hover:text-white text-sm transition-colors">← Volver</button>
        </div>
    )
}


// ─────────────────────────────────────────────
// HELPERS (pure functions — no side effects)
// ─────────────────────────────────────────────

/** Sum all cost fields except tipoDeCambio and utilidad */
function sumCostFields(costs) {
    const parseFormattedNumber = (v) => {
        if (!v) return 0
        if (/^\d+$/.test(String(v))) return parseInt(v, 10) / 100
        return parseFloat(String(v).replace(/\./g, '').replace(/,/g, '.')) || 0
    }
    return (
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
    )
}

// ─────────────────────────────────────────────
// PRODUCT REVIEW TABLE
// Responsibility: display-only table of products.
// ─────────────────────────────────────────────
function ProductReviewTable({ products }) {
    const totalQty = products.reduce((s, p) => s + (p.stock || 0), 0)
    const totalFobUSD = products.reduce((s, p) => s + ((p.unit_price_usd || 0) * (p.stock || 0)), 0)

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-xs">
                <thead>
                    <tr className="border-b border-slate-700 text-slate-400">
                        <th className="px-4 py-2 text-left font-medium">Código</th>
                        <th className="px-4 py-2 text-left font-medium">Producto</th>
                        <th className="px-4 py-2 text-right font-medium">Cantidad</th>
                        <th className="px-4 py-2 text-right font-medium">P. Unit USD</th>
                        <th className="px-4 py-2 text-right font-medium">FOB (USD)</th>
                        <th className="px-4 py-2 text-right font-medium">P. Neteado ARS</th>
                    </tr>
                </thead>
                <tbody>
                    {products.map((p, i) => {
                        const unitUSD = p.unit_price_usd || 0
                        const fobUSD = unitUSD * (p.stock || 0)
                        const hasPrice = (p.price || 0) > 0
                        return (
                            <tr key={p.id} className={`border-b border-slate-800/50 ${i % 2 === 0 ? 'bg-slate-900/20' : ''}`}>
                                <td className="px-4 py-2.5 font-mono text-slate-400 text-[11px] whitespace-nowrap">{p.sku || '—'}</td>
                                <td className="px-4 py-2.5 text-slate-200 max-w-[200px] truncate">{p.name}</td>
                                <td className="px-4 py-2.5 text-right font-mono text-slate-300">{p.stock?.toLocaleString('es-AR')}</td>
                                <td className="px-4 py-2.5 text-right font-mono text-slate-300">${unitUSD.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                                <td className="px-4 py-2.5 text-right font-mono text-slate-300">${fobUSD.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                                <td className="px-4 py-2.5 text-right font-mono">
                                    {hasPrice
                                        ? <span className="text-green-400">${(p.price || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                                        : <span className="text-slate-600 italic">pendiente</span>
                                    }
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
                <tfoot>
                    <tr className="border-t border-slate-700 font-bold">
                        <td className="px-4 py-2.5" />
                        <td className="px-4 py-2.5 text-slate-400">TOTAL</td>
                        <td className="px-4 py-2.5 text-right font-mono text-white">{totalQty.toLocaleString('es-AR')}</td>
                        <td className="px-4 py-2.5" />
                        <td className="px-4 py-2.5 text-right font-mono text-white">${totalFobUSD.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                        <td className="px-4 py-2.5" />
                    </tr>
                </tfoot>
            </table>
        </div>
    )
}

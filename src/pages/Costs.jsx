import { useState, useEffect, useCallback, useMemo } from 'react'
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
    Calculator,
    Trash2
} from 'lucide-react'
import { supabase } from '../supabaseClient'

export function Costs() {
    const [step, setStep] = useState(1)
    const [selectedDispatch, setSelectedDispatch] = useState(null)
    const [secondDispatch, setSecondDispatch] = useState(null)
    // addingSecond: true = the user is picking a 2nd dispatch (re-uses DispatchSelection)
    const [addingSecond, setAddingSecond] = useState(false)

    const handleFirstDispatchSelect = (d) => {
        setSelectedDispatch(d)
        // Pending = products uploaded but costs not yet distributed → skip to CostsForm
        if (d.status === 'pending') {
            setSecondDispatch(null) // single-dispatch resume (can't know if there was a pair)
            setStep(3)
            return
        }
        // Completed = already neted, allow reviewing/re-netting costs directly
        if (d.status === 'completed') {
            setStep(3)
            return
        }
        // Default: stay on step 1 in "confirm group" sub-view
    }

    const handleSecondDispatchSelect = (d) => {
        setSecondDispatch(d)
        setAddingSecond(false)
    }

    const handleProceedToUpload = () => setStep(2)

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header / Progress Bar */}
            <div className="bg-gradient-to-r from-cyan-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-cyan-500/20">
                <h1 className="text-2xl font-bold mb-2">Sistema de Neteo de Costos</h1>
                <p className="text-cyan-200 text-sm mb-8">Importa productos y distribuye costos proporcionalmente</p>

                <div className="flex items-center justify-between px-10 relative">
                    <div className="absolute left-0 top-1/2 w-full h-0.5 bg-slate-700 -z-0"></div>
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
                            <span className={`text-xs font-medium tracking-wide ${step >= s.id ? 'text-cyan-400' : 'text-slate-500'}`}>
                                {s.label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm min-h-[500px] relative overflow-hidden">

                {/* STEP 1A: Pick primary dispatch (no dispatch selected yet) */}
                {step === 1 && !selectedDispatch && !addingSecond && (
                    <DispatchSelection
                        onSelect={handleFirstDispatchSelect}
                        title="Seleccionar Despacho Principal"
                    />
                )}

                {/* STEP 1B: Confirm group — primary selected, decide if adding 2nd */}
                {step === 1 && selectedDispatch && !addingSecond && (
                    <DispatchGroupConfirm
                        primaryDispatch={selectedDispatch}
                        secondDispatch={secondDispatch}
                        onAddSecond={() => setAddingSecond(true)}
                        onRemoveSecond={() => setSecondDispatch(null)}
                        onBack={() => { setSelectedDispatch(null); setSecondDispatch(null) }}
                        onContinue={handleProceedToUpload}
                    />
                )}

                {/* STEP 1C: Pick secondary dispatch */}
                {step === 1 && addingSecond && (
                    <DispatchSelection
                        onSelect={handleSecondDispatchSelect}
                        excludeId={selectedDispatch?.id}
                        title="Seleccionar Segundo Despacho"
                        isSecondary
                        onBack={() => setAddingSecond(false)}
                    />
                )}

                {/* STEP 2: Upload Excel(s) */}
                {step === 2 && (
                    <ProductUpload
                        dispatch={selectedDispatch}
                        secondDispatch={secondDispatch}
                        onNext={(dispatchData) => {
                            if (dispatchData) {
                                setSelectedDispatch(prev => ({ ...prev, ...dispatchData.primary }))
                                if (dispatchData.secondary) {
                                    setSecondDispatch(prev => ({ ...prev, ...dispatchData.secondary }))
                                }
                            }
                            setStep(3)
                        }}
                        onBack={() => setStep(1)}
                    />
                )}

                {/* STEP 3: Net costs */}
                {step === 3 && (
                    <CostsForm
                        dispatch={selectedDispatch}
                        secondDispatch={secondDispatch}
                        onBack={() => setStep(2)}
                    />
                )}
            </div>
        </div>
    )
}

// ------------------------------------------------------------------
// STEP 1B: DISPATCH GROUP CONFIRM
// Lets the user review selected dispatches and optionally add a 2nd
// ------------------------------------------------------------------
function DispatchGroupConfirm({ primaryDispatch, secondDispatch, onAddSecond, onRemoveSecond, onBack, onContinue }) {
    const statusLabel = (s) => s === 'completed' ? 'Completado' : s === 'open' ? 'En Proceso' : 'Pendiente'
    const statusColor = (s) => s === 'completed'
        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        : s === 'open'
            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'

    return (
        <div className="p-8 flex flex-col items-center justify-center min-h-[420px] gap-6 animate-in fade-in duration-200">
            <div className="text-center mb-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Confirmar Grupo de Despachos</h2>
                <p className="text-sm text-slate-500 mt-1">Podés trabajar con uno o dos despachos a la vez</p>
            </div>

            {/* Dispatch Cards */}
            <div className="flex gap-4 w-full max-w-2xl">
                {/* Primary */}
                <div className="flex-1 bg-slate-900 border-2 border-cyan-500/50 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Despacho 1 · Principal</span>
                        <Box className="w-3.5 h-3.5 text-cyan-500" />
                    </div>
                    <p className="text-white font-bold font-mono text-lg">{primaryDispatch.dispatch_number}</p>
                    <p className="text-slate-400 text-xs mt-1">{primaryDispatch.description || '—'}</p>
                    <span className={`mt-3 inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusColor(primaryDispatch.status)}`}>
                        {statusLabel(primaryDispatch.status)}
                    </span>
                </div>

                {/* Secondary — empty slot or filled */}
                {secondDispatch ? (
                    <div className="flex-1 bg-slate-900 border-2 border-purple-500/50 rounded-2xl p-5 relative">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Despacho 2 · Secundario</span>
                        </div>
                        <p className="text-white font-bold font-mono text-lg">{secondDispatch.dispatch_number}</p>
                        <p className="text-slate-400 text-xs mt-1">{secondDispatch.description || '—'}</p>
                        <span className={`mt-3 inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusColor(secondDispatch.status)}`}>
                            {statusLabel(secondDispatch.status)}
                        </span>
                        <button
                            onClick={onRemoveSecond}
                            className="absolute top-3 right-3 text-slate-500 hover:text-red-400 transition-colors"
                            title="Quitar 2do despacho"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={onAddSecond}
                        className="flex-1 border-2 border-dashed border-slate-700 hover:border-purple-500/60 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-purple-400 transition-all group"
                    >
                        <Plus className="w-8 h-8 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-medium">Agregar 2do Despacho</span>
                        <span className="text-[10px] text-slate-600">(opcional)</span>
                    </button>
                )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 w-full max-w-2xl">
                <button
                    onClick={onBack}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-all"
                >
                    ← Volver
                </button>
                <button
                    onClick={onContinue}
                    className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-2.5 rounded-xl transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
                >
                    <ChevronRight className="w-4 h-4" />
                    {secondDispatch ? 'Continuar con 2 Despachos' : 'Continuar con 1 Despacho'}
                </button>
            </div>
        </div>
    )
}


// ------------------------------------------------------------------
// STEP 1: SELECT DISPATCH
// ------------------------------------------------------------------
function DispatchSelection({ onSelect, title, excludeId, isSecondary = false, onBack }) {
    const [isCreating, setIsCreating] = useState(false)
    const [dispatches, setDispatches] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [page, setPage] = useState(0)
    const [pageSize, setPageSize] = useState(10)
    const [totalCount, setTotalCount] = useState(0)

    // Form State
    const [newDispatch, setNewDispatch] = useState({ dispatch_number: '', description: '', origin: 'CHINA' })

    // Get company_id from authenticated user's profile
    const [userCompanyId, setUserCompanyId] = useState(null)

    // Fetch user's company_id on mount
    useEffect(() => {
        const fetchUserCompanyId = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile } = await supabase
                    .from('user_profiles')
                    .select('company_id')
                    .eq('id', user.id)
                    .single()

                if (profile) {
                    setUserCompanyId(profile.company_id)
                }
            }
        }
        fetchUserCompanyId()
    }, [])

    // Debounced search to avoid excessive queries
    useEffect(() => {
        setPage(0)
        const timer = setTimeout(() => {
            fetchDispatches()
        }, 300) // 300ms debounce
        return () => clearTimeout(timer)
    }, [searchTerm])

    useEffect(() => {
        fetchDispatches()
    }, [page, pageSize])

    const fetchDispatches = useCallback(async () => {
        setLoading(true)
        try {
            // FIX: Include company_id so existing dispatches carry it when selected
            let query = supabase
                .from('dispatches')
                .select('id, dispatch_number, description, origin, status, created_at, company_id', { count: 'exact' })
                .order('created_at', { ascending: false })

            if (searchTerm) {
                query = query.ilike('dispatch_number', `%${searchTerm}%`)
            }

            const from = page * pageSize
            const to = from + pageSize - 1

            const { data, count, error } = await query.range(from, to)

            if (error) throw error
            // Filter out the already-selected primary dispatch
            const filtered = excludeId ? (data || []).filter(d => d.id !== excludeId) : (data || [])
            setDispatches(filtered)
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
    }, [searchTerm, page, pageSize])

    const handleCreate = async () => {
        // Validate required fields
        if (!newDispatch.dispatch_number || !newDispatch.description) {
            alert('Por favor completa todos los campos requeridos')
            return
        }

        // FIX: Ensure company_id is resolved — inline fetch if race condition left it null
        let resolvedCompanyId = userCompanyId
        if (!resolvedCompanyId) {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile } = await supabase
                    .from('user_profiles')
                    .select('company_id')
                    .eq('id', user.id)
                    .single()
                resolvedCompanyId = profile?.company_id || null
            }
        }

        if (!resolvedCompanyId) {
            alert('Error: No se pudo obtener la empresa del usuario. Por favor recargá la página e intentá de nuevo.')
            return
        }

        // Don't create in Supabase - N8N will do it in STEP 2
        // Just pass the data to STEP 2
        setIsCreating(false)
        onSelect({
            ...newDispatch,
            company_id: resolvedCompanyId,
            status: 'new',  // Indicates it needs to be created by N8N
            id: null  // No ID yet - will be set by N8N response
        })
        setNewDispatch({ dispatch_number: '', description: '', origin: 'CHINA' })
    }

    const handleDeleteDispatch = async (dispatch, e) => {
        e.stopPropagation()
        if (!window.confirm(`¿Eliminar el despacho "${dispatch.dispatch_number}"?\n\nEsto también eliminará todos los productos asociados. Esta acción no se puede deshacer.`)) return
        try {
            setLoading(true)
            // Delete associated products first (FK constraint)
            await supabase.from('products').delete().eq('dispatch_id', dispatch.id)
            // Delete the dispatch
            const { error } = await supabase.from('dispatches').delete().eq('id', dispatch.id)
            if (error) throw error
            fetchDispatches()
        } catch (err) {
            console.error('Error deleting dispatch:', err)
            alert('Error al eliminar el despacho: ' + err.message)
            setLoading(false)
        }
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
        <div className={`p-6 h-full flex flex-col ${isSecondary ? 'border-l-4 border-purple-500/40' : ''}`}>
            {/* Toolbar */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    {isSecondary && onBack && (
                        <button onClick={onBack} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                    )}
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                            {title || 'Seleccionar Despacho'}
                        </h2>
                        <p className="text-slate-500 text-xs">
                            {isSecondary ? 'Seleccioná el segundo despacho para netear en conjunto' : 'Administra tus importaciones y costos'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className={`${isSecondary ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-900/20' : 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-500/20'} text-white font-bold py-2 px-4 rounded-xl transition-all shadow-lg flex items-center gap-2 text-sm`}
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
                <div className="col-span-3">Referencia</div>
                <div className="col-span-2 text-center">Origen</div>
                <div className="col-span-2 text-right">Estado</div>
                <div className="col-span-1"></div>
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
                                    <div className="col-span-3 truncate pr-2 text-slate-500">
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
// Handles single OR dual dispatch upload. Uploads are sequential.
// Despacho 1 stays 'pending' while Despacho 2 is being processed.
// Each N8N call carries groupRole + groupSize for workflow clarity.
// ------------------------------------------------------------------
function ProductUpload({ dispatch, secondDispatch, onNext, onBack }) {
    const [selectedFile1, setSelectedFile1] = useState(null)
    const [selectedFile2, setSelectedFile2] = useState(null)
    const [uploadingStep, setUploadingStep] = useState(null) // null | 'primary' | 'secondary' | 'done'
    const isDual = !!secondDispatch
    const groupSize = isDual ? 2 : 1

    // Resolve company_id — inline fetch as fallback for race conditions
    const resolveCompanyId = async (d) => {
        if (d?.company_id && d.company_id !== 'null') return d.company_id
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return null
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('company_id')
            .eq('id', user.id)
            .single()
        return profile?.company_id || null
    }

    // Build FormData for a single dispatch upload
    const buildFormData = (file, d, groupRole) => {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('dispatchNumber', d.dispatch_number)
        fd.append('description', d.description || '')
        fd.append('origin', d.origin || 'CHINA')
        fd.append('groupRole', groupRole)          // 'primary' or 'secondary'
        fd.append('groupSize', String(groupSize))   // '1' or '2'
        return fd
    }

    // Upload one file to N8N and return updated dispatch fields
    const uploadToN8N = async (file, d, companyId, groupRole) => {
        const fd = buildFormData(file, d, groupRole)
        fd.append('companyId', companyId)
        const N8N_URL = 'https://n8n.neuracall.net/webhook/LecturaDeInvoice'
        console.log(`[N8N] Sending ${groupRole} dispatch:`, d.dispatch_number, `| groupSize: ${groupSize}`)
        const response = await fetch(N8N_URL, { method: 'POST', body: fd })
        if (!response.ok) throw new Error(`N8N error (${groupRole}): HTTP ${response.status}`)
        const text = await response.text()
        if (!text?.trim()) throw new Error(`N8N response empty for ${groupRole} dispatch`)
        const result = JSON.parse(text)
        console.log(`[N8N] Response (${groupRole}):`, result)
        if (!result.dispatch_id) throw new Error(`N8N did not return dispatch_id for ${groupRole}`)
        return { id: result.dispatch_id, total_fob_usd: result.total_fob_usd || 0, status: 'pending' }
    }

    const handleProcessAll = async () => {
        if (!selectedFile1) return
        if (isDual && !selectedFile2) return

        try {
            // --- Upload Despacho 1 (Primary) ---
            setUploadingStep('primary')
            const companyId1 = await resolveCompanyId(dispatch)
            if (!companyId1) { alert('Error: no se pudo obtener empresa del usuario.'); return }
            const primaryResult = await uploadToN8N(selectedFile1, dispatch, companyId1, 'primary')

            if (!isDual) {
                // Single dispatch — straight to step 3
                onNext({ primary: primaryResult })
                return
            }

            // Despacho 1 queda en 'pending' — esperando al segundo
            // --- Upload Despacho 2 (Secondary) ---
            setUploadingStep('secondary')
            const companyId2 = await resolveCompanyId(secondDispatch)
            if (!companyId2) { alert('Error: no se pudo obtener empresa del usuario (despacho 2).'); return }
            const secondaryResult = await uploadToN8N(selectedFile2, secondDispatch, companyId2, 'secondary')

            setUploadingStep('done')
            onNext({ primary: primaryResult, secondary: secondaryResult })
        } catch (err) {
            console.error('[ProductUpload] Error:', err)
            alert('Error al subir el archivo: ' + err.message)
        } finally {
            if (uploadingStep !== 'done') setUploadingStep(null)
        }
    }

    const isUploading = uploadingStep !== null && uploadingStep !== 'done'
    const canSubmit = selectedFile1 && (!isDual || selectedFile2) && !isUploading

    // Reusable upload zone
    const UploadZone = ({ file, setFile, inputId, label, accent, dispatch: d }) => (
        <div className={`flex-1 flex flex-col items-center gap-4 p-6 rounded-2xl border-2 
            ${isUploading ? 'opacity-60 pointer-events-none' : ''}
            ${accent === 'cyan' ? 'border-cyan-500/30 bg-slate-900/40' : 'border-purple-500/30 bg-slate-900/40'}`}>
            <div className="text-center">
                <span className={`text-xs font-bold uppercase tracking-wider ${accent === 'cyan' ? 'text-cyan-400' : 'text-purple-400'}`}>
                    {label}
                </span>
                <p className="text-white font-bold font-mono mt-1">{d.dispatch_number}</p>
                {uploadingStep === (accent === 'cyan' ? 'primary' : 'secondary') && (
                    <span className="flex items-center justify-center gap-1 text-xs text-amber-400 mt-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Procesando con N8N...
                    </span>
                )}
                {uploadingStep !== null && uploadingStep !== (accent === 'cyan' ? 'primary' : 'secondary') && uploadingStep !== 'done' && accent !== 'cyan' && (
                    <span className="text-xs text-slate-500 mt-1">Esperando al Despacho 1...</span>
                )}
            </div>
            <input type="file" id={inputId} className="hidden" accept=".xlsx,.xls,.csv" disabled={isUploading}
                onChange={e => e.target.files?.[0] && setFile(e.target.files[0])} />
            <label htmlFor={inputId}
                className={`w-full border-2 border-dashed rounded-xl p-8 flex flex-col items-center cursor-pointer transition-all group
                    ${file
                        ? (accent === 'cyan' ? 'border-cyan-500 bg-cyan-500/10' : 'border-purple-500 bg-purple-500/10')
                        : 'border-slate-700 hover:border-slate-500'}`}>
                {file ? (
                    <>
                        <FileSpreadsheet className={`w-10 h-10 mb-2 ${accent === 'cyan' ? 'text-cyan-400' : 'text-purple-400'}`} />
                        <p className={`font-bold text-sm ${accent === 'cyan' ? 'text-cyan-300' : 'text-purple-300'}`}>{file.name}</p>
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
            {file && <button onClick={() => setFile(null)} className="text-xs text-slate-500 hover:text-red-400 transition-colors">Quitar archivo</button>}
        </div>
    )

    return (
        <div className="p-8 flex flex-col items-center gap-6 min-h-[500px]">
            <div className="text-center">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {isDual ? 'Cargar Productos — 2 Despachos' : `Cargar Productos al Despacho ${dispatch.dispatch_number}`}
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                    {isDual
                        ? 'Subí los Excels de ambos despachos. Se procesarán secuencialmente en N8N.'
                        : 'Subí el archivo Excel con el listado de productos recibidos.'}
                </p>
            </div>

            <div className="flex gap-4 w-full max-w-3xl">
                <UploadZone file={selectedFile1} setFile={setSelectedFile1}
                    inputId="file-upload-1" label="Despacho 1 · Principal"
                    accent="cyan" dispatch={dispatch} />
                {isDual && (
                    <UploadZone file={selectedFile2} setFile={setSelectedFile2}
                        inputId="file-upload-2" label="Despacho 2 · Secundario"
                        accent="purple" dispatch={secondDispatch} />
                )}
            </div>

            <button
                onClick={handleProcessAll}
                disabled={!canSubmit}
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-10 py-3 rounded-xl font-bold shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
                {isUploading ? (
                    <>
                        <Loader2 className="animate-spin w-5 h-5" />
                        {uploadingStep === 'primary' ? 'Procesando Despacho 1...' : 'Procesando Despacho 2...'}
                    </>
                ) : (
                    <>
                        <Send className="w-5 h-5" />
                        {isDual ? 'Enviar Ambos Despachos' : 'Enviar a Procesar'}
                    </>
                )}
            </button>

            <button onClick={onBack} className="text-slate-500 hover:text-white text-sm transition-colors">← Volver</button>
        </div>
    )
}




// ------------------------------------------------------------------
// STEP 3: UPLOAD COSTS
// ------------------------------------------------------------------
function CostsForm({ dispatch, secondDispatch, onBack }) {
    const isDual = Boolean(secondDispatch)
    const [costs, setCosts] = useState({
        totalFob: 0,
        fobPrimary: 0,
        fobSecondary: 0,
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
    const [reviewProducts, setReviewProducts] = useState(null) // { d1: [], d2: [] } loaded for verification
    const [loadingReview, setLoadingReview] = useState(false)
    const [showReview, setShowReview] = useState(false)

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
        // If value is raw digits (no comma yet), treat as cents → divide by 100
        if (/^\d+$/.test(value.toString())) {
            return parseInt(value, 10) / 100
        }
        // Remove thousand separators (dots) and replace decimal comma with dot
        return parseFloat(value.toString().replace(/\./g, '').replace(/,/g, '.')) || 0
    }

    /**
     * Formats raw digit string as Argentine decimal input.
     * e.g. "123" → "1,23"  |  "1234567" → "12.345,67"
     */
    const formatDecimalInput = (rawDigits) => {
        if (!rawDigits) return ''
        // Ensure only digits
        const digits = rawDigits.replace(/\D/g, '')
        if (!digits) return ''
        // Pad to at least 3 digits so we always have 2 decimal places
        const padded = digits.padStart(3, '0')
        const intPart = padded.slice(0, -2)             // everything except last 2 digits
        const decPart = padded.slice(-2)                // last 2 digits = decimals
        // Add thousand separators (dot) to integer part
        const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
        return `${intFormatted},${decPart}`
    }

    useEffect(() => {
        fetchDispatchTotal()
    }, [dispatch.id, secondDispatch?.id])

    const fetchDispatchTotal = async () => {
        setLoading(true)
        try {
            // Resolve FOB for primary dispatch
            let fob1 = dispatch.total_fob_usd || 0
            if (!fob1 && dispatch.id) {
                const { data } = await supabase.from('dispatches').select('total_fob_usd').eq('id', dispatch.id).maybeSingle()
                fob1 = data?.total_fob_usd || 0
            }

            // Resolve FOB for secondary dispatch (if any)
            let fob2 = 0
            if (secondDispatch) {
                fob2 = secondDispatch.total_fob_usd || 0
                if (!fob2 && secondDispatch.id) {
                    const { data } = await supabase.from('dispatches').select('total_fob_usd').eq('id', secondDispatch.id).maybeSingle()
                    fob2 = data?.total_fob_usd || 0
                }
            }

            const combinedFob = fob1 + fob2
            console.log(`[CostsForm] FOB D1: ${fob1} | FOB D2: ${fob2} | Combined: ${combinedFob}`)
            setCosts(prev => ({ ...prev, totalFob: combinedFob, fobPrimary: fob1, fobSecondary: fob2 }))
        } catch (err) {
            console.error('Error fetching dispatch total:', err)
            setCosts(prev => ({ ...prev, totalFob: 0 }))
        } finally {
            setLoading(false)
        }
    }

    const handleCostChange = (field, rawInput) => {
        // Extract all digits from the possibly-formatted string the browser gives us
        const allDigits = rawInput.replace(/\D/g, '')
        // Strip leading zeros so the visual padding from formatDecimalInput doesn't
        // accumulate in state. E.g. "0,01" + "2" → browser gives "0,012" → allDigits "0012"
        // → after trimLeadingZeros: "12" → formatDecimalInput("12") → "0,12" ✅
        const cleanDigits = allDigits.replace(/^0+/, '') || ''
        setCosts(prev => ({ ...prev, [field]: cleanDigits }))
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

        // Update utilidad field: store as raw digits (cents) for auto-decimal display
        const utilidadRawDigits = Math.round(utilidadAmount * 100).toString()
        setCosts(prev => ({ ...prev, utilidad: utilidadRawDigits }))

        // Build per-dispatch breakdown for dual mode
        const isDualCalc = !!secondDispatch
        let dispatchDetail = ''
        if (isDualCalc && costs.totalFob > 0) {
            const weight1 = (costs.fobPrimary || 0) / costs.totalFob
            const weight2 = (costs.fobSecondary || 0) / costs.totalFob
            const fob1ARS = (costs.fobPrimary || 0) * tipoDeCambio
            const fob2ARS = (costs.fobSecondary || 0) * tipoDeCambio
            const subtotal1 = fob1ARS + totalCosts * weight1
            const subtotal2 = fob2ARS + totalCosts * weight2
            const utilidad1 = subtotal1 * 0.23
            const utilidad2 = subtotal2 * 0.23
            dispatchDetail =
                `\n── Desglose por Despacho ──\n` +
                `D1 (${dispatch.dispatch_number}):\n` +
                `  FOB: $${fob1ARS.toLocaleString('es-AR', { minimumFractionDigits: 2 })} (${(weight1 * 100).toFixed(1)}%)\n` +
                `  Utilidad D1: $${utilidad1.toLocaleString('es-AR', { minimumFractionDigits: 2 })}\n\n` +
                `D2 (${secondDispatch.dispatch_number}):\n` +
                `  FOB: $${fob2ARS.toLocaleString('es-AR', { minimumFractionDigits: 2 })} (${(weight2 * 100).toFixed(1)}%)\n` +
                `  Utilidad D2: $${utilidad2.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
        }

        alert(
            `Cálculo de Utilidad (23%):\n\n` +
            `FOB Total ARS: $${totalFobARS.toLocaleString('es-AR', { minimumFractionDigits: 2 })}\n` +
            `Costos: $${totalCosts.toLocaleString('es-AR', { minimumFractionDigits: 2 })}\n` +
            `Subtotal: $${subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}\n\n` +
            `✅ Utilidad Total (23%): $${utilidadAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}` +
            dispatchDetail
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


            // 1. Fetch products from Despacho 1
            console.log('\n🔍 BUSCANDO PRODUCTOS DESPACHO 1...')
            const { data: productsD1, error: fetchError1 } = await supabase
                .from('products')
                .select('*')
                .eq('dispatch_number', dispatch.dispatch_number)
                .eq('company_id', dispatch.company_id)

            // Fallback no-company filter for D1 if company mismatch
            let finalProductsD1 = productsD1
            if ((!productsD1 || productsD1.length === 0) && !fetchError1) {
                const { data: fallback } = await supabase.from('products').select('*').eq('dispatch_number', dispatch.dispatch_number)
                finalProductsD1 = fallback
            }
            if (fetchError1) throw fetchError1
            console.log(`✅ D1 productos: ${finalProductsD1?.length || 0}`)

            // 2. Fetch products from Despacho 2 (if dual)
            let finalProductsD2 = []
            if (secondDispatch) {
                console.log('\n🔍 BUSCANDO PRODUCTOS DESPACHO 2...')
                const { data: productsD2, error: fetchError2 } = await supabase
                    .from('products')
                    .select('*')
                    .eq('dispatch_number', secondDispatch.dispatch_number)
                    .eq('company_id', secondDispatch.company_id)

                finalProductsD2 = productsD2 || []
                if ((!productsD2 || productsD2.length === 0) && !fetchError2) {
                    const { data: fallback } = await supabase.from('products').select('*').eq('dispatch_number', secondDispatch.dispatch_number)
                    finalProductsD2 = fallback || []
                }
                if (fetchError2) throw fetchError2
                console.log(`✅ D2 productos: ${finalProductsD2.length}`)
            }

            // 3. Combine into a single pool for proportional distribution
            const allProducts = [...(finalProductsD1 || []), ...finalProductsD2]

            if (!allProducts || allProducts.length === 0) {
                alert(`❌ No se encontraron productos para los despachos seleccionados.\nRevisa que los Excels se hayan subido correctamente.`)
                setSubmitting(false)
                return
            }

            console.log(`✅ Pool total de productos: ${allProducts.length} (D1: ${finalProductsD1?.length || 0} + D2: ${finalProductsD2.length})`)

            console.log('=== COST DISTRIBUTION START ===')
            console.log('Products:', allProducts.length)
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
            // CRITICAL FIX: Always recalculate utilidad from subtotal (don't trust stored value)
            // This prevents issues with incorrectly formatted values
            const utilidadAmount = subtotal * 0.23
            console.log('Subtotal (FOB ARS + Costs):', subtotal)
            console.log('Utilidad (23% recalculated):', utilidadAmount)

            // 7. Calculate total to distribute
            const totalToDistribute = subtotal + utilidadAmount
            console.log('Total to Distribute:', totalToDistribute)

            if (costs.totalFob === 0) {
                alert('El total FOB es 0, no se puede distribuir')
                return
            }

            // 8. Distribute costs proportionally to each product in the combined pool
            const updatedProducts = allProducts.map(product => {
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
                const originalProduct = allProducts[i]

                // Calculate neto = price * stock
                const neto = product.price * originalProduct.stock

                console.log(`Updating product ${i + 1}/${updatedProducts.length} - ID: ${product.id}`)
                console.log(`  New Price: $${product.price.toFixed(2)}`)
                console.log(`  Stock: ${originalProduct.stock}`)
                console.log(`  Neto (price × stock): $${neto.toFixed(2)}`)

                const { error: updateError } = await supabase
                    .from('products')
                    .update({
                        price: product.price,
                        neto: neto
                    })
                    .eq('id', product.id)

                if (updateError) {
                    console.error(`❌ Error updating product ${product.id}:`, updateError)
                    throw updateError
                }
                console.log(`✅ Product ${product.id} updated successfully`)
            }

            console.log('✅ All products updated successfully')

            // 7. Update dispatch(es) status to 'completed'
            console.log('\n=== UPDATING DISPATCH(ES) ===')

            // Primary dispatch — store its own FOB ARS (fob1 * tipoDeCambio)
            const fob1ARS = (costs.fobPrimary || costs.totalFob) * tipoDeCambio
            const { error: dispatchError1 } = await supabase
                .from('dispatches')
                .update({ status: 'completed', total_fob_usd: costs.fobPrimary || costs.totalFob, total_fob_ars: fob1ARS })
                .eq('id', dispatch.id)
            if (dispatchError1) throw dispatchError1
            console.log('✅ Despacho 1 updated to completed')

            // Secondary dispatch (if any)
            if (secondDispatch?.id) {
                const fob2ARS = (costs.fobSecondary || 0) * tipoDeCambio
                const { error: dispatchError2 } = await supabase
                    .from('dispatches')
                    .update({ status: 'completed', total_fob_usd: costs.fobSecondary || 0, total_fob_ars: fob2ARS })
                    .eq('id', secondDispatch.id)
                if (dispatchError2) throw dispatchError2
                console.log('✅ Despacho 2 updated to completed')
            }

            console.log('✅ Dispatch updated successfully')

            console.log('=== COST DISTRIBUTION COMPLETE ===')

            const dispatchInfo = secondDispatch
                ? `Despacho 1: ${dispatch.dispatch_number}\nDespacho 2: ${secondDispatch.dispatch_number}`
                : `Despacho: ${dispatch.dispatch_number}`

            alert(`✅ Costos distribuidos exitosamente!\n\n` +
                `${allProducts.length} productos actualizados\n` +
                `${dispatchInfo}\n\n` +
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

    // Load products for the verification panel
    const loadReviewProducts = async () => {
        setLoadingReview(true)
        try {
            const { data: d1 } = await supabase.from('products').select('id, sku, name, stock, unit_price_usd, price, dispatch_number').eq('dispatch_number', dispatch.dispatch_number)
            let d2 = []
            if (secondDispatch) {
                const { data } = await supabase.from('products').select('id, sku, name, stock, unit_price_usd, price, dispatch_number').eq('dispatch_number', secondDispatch.dispatch_number)
                d2 = data || []
            }
            setReviewProducts({ d1: d1 || [], d2 })
            setShowReview(true)
        } catch (err) {
            console.error('Error loading review products:', err)
        } finally {
            setLoadingReview(false)
        }
    }

    return (
        <div className="p-8 h-full flex flex-col overflow-y-auto">
            {/* ── HEADER ── */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Cargar Costos de Importación</h2>
                    <div className="flex flex-wrap gap-2 mt-1">
                        <span className="inline-flex items-center gap-1.5 text-xs bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-full px-3 py-0.5 font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block" />
                            D1: {dispatch.dispatch_number}
                        </span>
                        {isDual && (
                            <span className="inline-flex items-center gap-1.5 text-xs bg-purple-500/10 border border-purple-500/30 text-purple-400 rounded-full px-3 py-0.5 font-mono">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block" />
                                D2: {secondDispatch.dispatch_number}
                            </span>
                        )}
                    </div>
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

            {/* ── FOB CARDS ── */}
            {isDual ? (
                <div className="grid grid-cols-3 gap-3 mb-6">
                    {/* D1 */}
                    <div className="bg-cyan-900/30 border border-cyan-500/20 rounded-xl p-4">
                        <p className="text-cyan-400 text-xs font-medium mb-1">FOB Despacho 1</p>
                        <p className="text-white text-xl font-bold font-mono">${(costs.fobPrimary || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
                        <p className="text-cyan-500/60 text-[10px] font-mono mt-0.5">{dispatch.dispatch_number}</p>
                    </div>
                    {/* D2 */}
                    <div className="bg-purple-900/30 border border-purple-500/20 rounded-xl p-4">
                        <p className="text-purple-400 text-xs font-medium mb-1">FOB Despacho 2</p>
                        <p className="text-white text-xl font-bold font-mono">${(costs.fobSecondary || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
                        <p className="text-purple-500/60 text-[10px] font-mono mt-0.5">{secondDispatch.dispatch_number}</p>
                    </div>
                    {/* Combined */}
                    <div className="bg-gradient-to-r from-cyan-900 to-slate-900 border border-cyan-500/20 rounded-xl p-4">
                        <p className="text-cyan-400 text-xs font-medium mb-1">FOB Total Combinado</p>
                        <p className="text-white text-xl font-bold font-mono">${(costs.totalFob || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
                        <p className="text-cyan-500/60 text-[10px] mt-0.5">Base para distribuir costos</p>
                    </div>
                </div>
            ) : (
                <div className="mb-6 bg-gradient-to-r from-cyan-900 to-slate-900 rounded-xl p-6 border border-cyan-500/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-cyan-400 text-sm font-medium mb-1">Total FOB (Cargado Automáticamente)</p>
                            <p className="text-white text-3xl font-bold font-mono">${costs.totalFob.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                        <DollarSign className="w-12 h-12 text-cyan-500/30" />
                    </div>
                </div>
            )}

            {/* ── PANEL DE VERIFICACIÓN ── */}
            {showReview && reviewProducts && (
                <div className="mb-6 border border-slate-700 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-800">
                        <span className="text-sm font-bold text-white">Verificación de Productos y Precios</span>
                        <button onClick={() => setShowReview(false)} className="text-slate-400 hover:text-white text-xs">Cerrar ✕</button>
                    </div>

                    {/* D1 Table */}
                    <ProductReviewTable
                        label={`Despacho 1 — ${dispatch.dispatch_number}`}
                        products={reviewProducts.d1}
                        colorClass="cyan"
                    />

                    {/* D2 Table */}
                    {isDual && reviewProducts.d2.length > 0 && (
                        <ProductReviewTable
                            label={`Despacho 2 — ${secondDispatch.dispatch_number}`}
                            products={reviewProducts.d2}
                            colorClass="purple"
                        />
                    )}
                </div>
            )}

            {/* ── COST FIELDS ── */}
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

            <button onClick={onBack} className="mt-4 text-slate-500 hover:text-white text-sm">← Volver</button>
        </div>
    )
}

// Sub-component: tabla de verificación liviana
function ProductReviewTable({ label, products, colorClass }) {
    const accent = colorClass === 'purple'
        ? { border: 'border-purple-500/20', header: 'bg-purple-900/30 text-purple-400', badge: 'bg-purple-500/10 text-purple-300 border-purple-500/20' }
        : { border: 'border-cyan-500/20', header: 'bg-cyan-900/30 text-cyan-400', badge: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20' }

    const totalQty = products.reduce((s, p) => s + (p.stock || 0), 0)
    const totalFobUSD = products.reduce((s, p) => s + ((p.unit_price_usd || 0) * (p.stock || 0)), 0)

    return (
        <div className={`border-t ${accent.border}`}>
            <div className={`px-4 py-2 ${accent.header} flex items-center justify-between text-xs font-bold`}>
                <span>{label}</span>
                <span className={`px-2 py-0.5 rounded-full border ${accent.badge}`}>{products.length} productos</span>
            </div>
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
        </div>
    )
}



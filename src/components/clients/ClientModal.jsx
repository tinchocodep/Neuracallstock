
import { useState, useEffect } from 'react'
import { X, Save, Building2, MapPin, Mail, CreditCard, Search, Globe, ChevronDown } from 'lucide-react'
import { supabase } from '../../supabaseClient'

export function ClientModal({ isOpen, onClose, clientToEdit = null, onSave }) {
    const [formData, setFormData] = useState({
        name: '',
        cuit: '',
        tax_condition: 'Responsable Inscripto',
        address: '',
        jurisdiction: 'CABA',
        email: ''
    })
    const [loading, setLoading] = useState(false)
    const [searchingCuit, setSearchingCuit] = useState(false)
    const [foundAddresses, setFoundAddresses] = useState([]) // Store multiple addresses if found
    const [error, setError] = useState(null)

    useEffect(() => {
        if (clientToEdit) {
            setFormData({
                name: clientToEdit.name || '',
                cuit: clientToEdit.cuit || '',
                tax_condition: clientToEdit.tax_condition || 'Responsable Inscripto',
                address: clientToEdit.address || '',
                jurisdiction: clientToEdit.jurisdiction || 'CABA',
                email: clientToEdit.email || ''
            })
            setFoundAddresses([])
        } else {
            // Reset for new client
            setFormData({
                name: '',
                cuit: '',
                tax_condition: 'Responsable Inscripto',
                address: '',
                jurisdiction: 'CABA',
                email: ''
            })
            setFoundAddresses([])
        }
        setError(null)
    }, [clientToEdit, isOpen])

    const handleCuitSearch = async () => {
        const cuitToSearch = formData.cuit.replace(/\D/g, '')
        if (cuitToSearch.length !== 11) {
            setError('Ingrese un CUIT válido (11 dígitos) para buscar.')
            return
        }

        setSearchingCuit(true)
        setError(null)
        setFoundAddresses([])

        try {
            const WEBHOOK_CUIT_URL = 'https://n8n.neuracall.net/webhook/BuscarPersonas'
            const response = await fetch(WEBHOOK_CUIT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cuit: cuitToSearch })
            })

            if (response.ok) {
                const rawData = await response.json()
                const dataItems = Array.isArray(rawData) ? rawData : [rawData]

                // Filter out empty items
                const validItems = dataItems.filter(item => item.name || item.razonSocial)

                if (validItems.length > 0) {
                    const primaryData = validItems[0]

                    // Update form data with found info
                    setFormData(prev => ({
                        ...prev,
                        name: primaryData.name || primaryData.razonSocial || '',
                        tax_condition: primaryData.taxCondition || 'Responsable Inscripto',
                        jurisdiction: primaryData.jurisdiction || 'CABA',
                        address: primaryData.address || primaryData.domicilioFiscal || '',
                        email: primaryData.email || prev.email // Keep existing email if none returned
                    }))

                    // If multiple items have addresses, let user choose
                    if (validItems.length > 0) {
                        const addresses = validItems.map(item => ({
                            address: item.address || item.domicilioFiscal,
                            type: item.tipoDomicilio || 'Fiscal'
                        })).filter(addr => addr.address)

                        // Remove duplicates
                        const uniqueAddresses = [...new Map(addresses.map(item => [item.address, item])).values()]

                        if (uniqueAddresses.length > 1) {
                            setFoundAddresses(uniqueAddresses)
                        }
                    }
                } else {
                    setError('No se encontraron datos para este CUIT.')
                }
            } else {
                throw new Error('Error en búsqueda externa')
            }
        } catch (err) {
            console.error(err)
            setError('Error al buscar datos del CUIT.')
        } finally {
            setSearchingCuit(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const payload = {
                ...formData,
                // Ensure CUIT is clean
                cuit: formData.cuit.replace(/\D/g, '') // strip format if they typed it
            }

            if (clientToEdit && clientToEdit.id) {
                // Update
                const { data, error } = await supabase
                    .from('clients')
                    .update(payload)
                    .eq('id', clientToEdit.id)
                    .select()
                    .single()

                if (error) throw error
                if (onSave) onSave(data)
            } else {
                // Insert
                const { data, error } = await supabase
                    .from('clients')
                    .insert([payload])
                    .select()
                    .single()

                if (error) throw error
                if (onSave) onSave(data)
            }
            onClose()
        } catch (err) {
            console.error(err)
            setError(err.message || 'Error al guardar el cliente')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="bg-cyan-500/10 p-2 rounded-lg text-cyan-500">
                            {clientToEdit ? <Building2 className="w-6 h-6" /> : <PlusUserIcon />}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">
                                {clientToEdit ? 'Editar Cliente' : 'Nuevo Cliente'}
                            </h2>
                            <p className="text-sm text-slate-400">
                                {clientToEdit ? 'Modificar datos del cliente' : 'Agregar a la base de datos de Neuracall'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-rose-500/10 text-rose-500 p-3 rounded-lg text-sm border border-rose-500/20">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Razón Social / Nombre</label>
                        <input
                            type="text"
                            required
                            placeholder="Ej: Empresa S.A."
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">CUIT / DNI</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    required
                                    placeholder="30-12345678-9"
                                    value={formData.cuit}
                                    onChange={e => setFormData({ ...formData, cuit: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-4 pr-10 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                                />
                                <button
                                    type="button"
                                    onClick={handleCuitSearch}
                                    disabled={searchingCuit}
                                    className="absolute right-2 top-2 bottom-2 p-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-500 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50"
                                    title="Buscar datos por CUIT"
                                >
                                    {searchingCuit ? (
                                        <div className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                                    ) : (
                                        <Search className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Condición Fiscal</label>
                            <select
                                value={formData.tax_condition}
                                onChange={e => setFormData({ ...formData, tax_condition: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                            >
                                <option>Responsable Inscripto</option>
                                <option>Monotributista</option>
                                <option>Consumidor Final</option>
                                <option>Exento</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dirección Fiscal</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-slate-600" />
                            <input
                                type="text"
                                placeholder="Calle Falsa 123, CABA"
                                value={formData.address}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                            />
                        </div>
                        {/* Multiple Address Selector */}
                        {foundAddresses.length > 1 && (
                            <div className="mt-2 bg-slate-800/50 rounded-lg p-2 border border-slate-800 animate-in slide-in-from-top-2">
                                <p className="text-xs text-slate-400 mb-2 px-1">Múltiples direcciones encontradas:</p>
                                <div className="space-y-1 max-h-[100px] overflow-y-auto custom-scrollbar">
                                    {foundAddresses.map((addr, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, address: addr.address })}
                                            className={`w-full text-left text-xs px-3 py-2 rounded-md transition-colors flex items-center justify-between ${formData.address === addr.address
                                                ? 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20'
                                                : 'hover:bg-slate-800 text-slate-300'
                                                }`}
                                        >
                                            <span className="truncate">{addr.address}</span>
                                            {formData.address === addr.address && <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Jurisdicción</label>
                            <select
                                value={formData.jurisdiction}
                                onChange={e => setFormData({ ...formData, jurisdiction: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                            >
                                <option>CABA</option>
                                <option>Buenos Aires</option>
                                <option>Córdoba</option>
                                <option>Santa Fe</option>
                                <option>Mendoza</option>
                                {/* Add more as needed */}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-600" />
                                <input
                                    type="email"
                                    placeholder="cliente@ejemplo.com"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-bold transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-lg shadow-cyan-900/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {loading ? 'Guardando...' : (
                                <>
                                    <Save className="w-4 h-4" />
                                    {clientToEdit ? 'Guardar Cambios' : 'Guardar Cliente'}
                                </>
                            )}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    )
}

function PlusUserIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="8.5" cy="7" r="4"></circle>
            <line x1="20" y1="8" x2="20" y2="14"></line>
            <line x1="23" y1="11" x2="17" y2="11"></line>
        </svg>
    )
}

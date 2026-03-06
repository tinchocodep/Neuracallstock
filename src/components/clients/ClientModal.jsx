
import { useState, useEffect } from 'react'
import { X, Save, Building2, MapPin, Mail, CreditCard, Search, Globe, ChevronDown } from 'lucide-react'
import { supabase } from '../../supabaseClient'

export function ClientModal({ isOpen, onClose, clientToEdit = null, onSave }) {
    const [formData, setFormData] = useState({
        name: '',
        cuit: '',
        tax_condition: 'Responsable Inscripto',
        address: '',
        addresses: [],
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
                addresses: clientToEdit.addresses || [],
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
                addresses: [],
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
            const WEBHOOK_CUIT_URL = 'https://n8n.neuracall.net/webhook/BuscarPersonasPruebaDomicilio'
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

                    // Extract new structured addresses
                    const webhookAddresses = primaryData.addresses || []
                    const addressList = webhookAddresses.map(addr => addr.address).filter(Boolean)
                    const primaryAddress = primaryData.primaryAddress || (addressList.length > 0 ? addressList[0] : '')

                    // Update form data with found info
                    setFormData(prev => ({
                        ...prev,
                        name: primaryData.name || primaryData.razonSocial || '',
                        tax_condition: primaryData.taxCondition || 'Responsable Inscripto',
                        jurisdiction: primaryData.jurisdiction || (webhookAddresses[0]?.jurisdiction) || 'CABA',
                        address: primaryAddress || primaryData.domicilioFiscal || '',
                        addresses: addressList || [],
                        email: primaryData.email || prev.email // Keep existing email if none returned
                    }))

                    if (addressList.length > 1) {
                        const formattedFound = webhookAddresses.map(addr => ({
                            address: addr.address,
                            type: addr.addressType || 'Fiscal'
                        }))
                        setFoundAddresses(formattedFound)
                    } else {
                        setFoundAddresses([])
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
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dirección Fiscal Principal</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-slate-600" />
                            <input
                                type="text"
                                placeholder="Calle Falsa 123, CABA"
                                value={formData.address}
                                onChange={e => {
                                    const newAddress = e.target.value;
                                    setFormData(prev => {
                                        // Update primary and ensure it's in the array if not already
                                        const prevAddresses = Array.isArray(prev.addresses) ? prev.addresses : [];
                                        const newAddresses = [...prevAddresses];
                                        if (prev.address && newAddresses.includes(prev.address)) {
                                            newAddresses[newAddresses.indexOf(prev.address)] = newAddress;
                                        } else if (newAddress && !newAddresses.includes(newAddress)) {
                                            newAddresses.push(newAddress);
                                        }
                                        return { ...prev, address: newAddress, addresses: newAddresses };
                                    })
                                }}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                            />
                        </div>

                        {/* Multiple Address Selector / Manager */}
                        {formData.addresses && formData.addresses.length > 0 && (
                            <div className="mt-2 bg-slate-800/50 rounded-lg p-2 border border-slate-800 animate-in slide-in-from-top-2">
                                <p className="text-xs text-slate-400 mb-2 px-1">Direcciones registradas (clic para fijar como principal):</p>
                                <div className="space-y-1 max-h-[120px] overflow-y-auto custom-scrollbar">
                                    {formData.addresses.map((addr, idx) => (
                                        <div key={idx} className="flex items-center gap-2 group">
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, address: addr }))}
                                                className={`flex-1 text-left text-xs px-3 py-2 rounded-md transition-colors flex items-center justify-between ${formData.address === addr
                                                    ? 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20'
                                                    : 'hover:bg-slate-800 text-slate-300 border border-transparent'
                                                    }`}
                                            >
                                                <span className="truncate">{addr}</span>
                                                {formData.address === addr && <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 flex-shrink-0" />}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setFormData(prev => {
                                                        const prevAddresses = Array.isArray(prev.addresses) ? prev.addresses : [];
                                                        return {
                                                            ...prev,
                                                            addresses: prevAddresses.filter((_, i) => i !== idx),
                                                            address: prev.address === addr ? (prevAddresses.find((_, i) => i !== idx) || '') : prev.address
                                                        }
                                                    })
                                                }}
                                                className="p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                id="newAddressInput"
                                placeholder="Agregar otra dirección..."
                                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (e.target.value.trim()) {
                                            const val = e.target.value.trim();
                                            setFormData(prev => {
                                                const prevAddresses = Array.isArray(prev.addresses) ? prev.addresses : [];
                                                return {
                                                    ...prev,
                                                    addresses: prevAddresses.includes(val) ? prevAddresses : [...prevAddresses, val],
                                                    address: prev.address || val // Set as main if empty
                                                }
                                            });
                                            e.target.value = '';
                                        }
                                    }
                                }}
                            />
                            <button
                                type="button"
                                className="px-3 bg-slate-800 hover:bg-slate-700 text-cyan-500 rounded-lg text-xs font-medium transition-colors"
                                onClick={() => {
                                    const input = document.getElementById('newAddressInput');
                                    if (input && input.value.trim()) {
                                        const val = input.value.trim();
                                        setFormData(prev => {
                                            const prevAddresses = Array.isArray(prev.addresses) ? prev.addresses : [];
                                            return {
                                                ...prev,
                                                addresses: prevAddresses.includes(val) ? prevAddresses : [...prevAddresses, val],
                                                address: prev.address || val
                                            }
                                        });
                                        input.value = '';
                                    }
                                }}
                            >
                                Añadir
                            </button>
                        </div>
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

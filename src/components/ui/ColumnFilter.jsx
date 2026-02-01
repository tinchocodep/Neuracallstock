import { useState, useEffect, useRef } from 'react'
import {
    Search,
    ChevronDown,
    ArrowUpDown,
} from 'lucide-react'

// Custom Column Filter Component
export const ColumnFilter = ({ column, icon: Icon, options = [], onFilter, label, selected = [] }) => {
    const [isOpen, setIsOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const containerRef = useRef(null)

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const filteredOptions = options.filter(opt =>
        String(opt).toLowerCase().includes(searchTerm.toLowerCase())
    )

    const toggleOption = (opt) => {
        const newSelected = selected.includes(opt)
            ? selected.filter(s => s !== opt)
            : [...selected, opt]
        onFilter(column, newSelected)
    }

    // Calculate position for fixed dropdown
    const [coords, setCoords] = useState({ top: 0, left: 0 })

    const toggleOpen = () => {
        if (!isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect()
            setCoords({
                top: rect.bottom + window.scrollY + 8,
                left: rect.left + window.scrollX
            })
        }
        setIsOpen(!isOpen)
    }

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={toggleOpen}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all border ${selected.length > 0
                    ? 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
            >
                {label}
                {selected.length > 0 && (
                    <span className="flex items-center justify-center w-4 h-4 text-[9px] bg-cyan-500 text-white rounded-full">
                        {selected.length}
                    </span>
                )}
                {Icon ? <Icon className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {isOpen && (
                <div
                    className="fixed w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-[9999] animate-in fade-in zoom-in-95 duration-200"
                    style={{ top: coords.top, left: coords.left }}
                >
                    <div className="p-3">
                        <div className="relative mb-3">
                            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Buscar..."
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="max-h-48 overflow-y-auto space-y-1 mb-3 pr-1">
                            {filteredOptions.length === 0 ? (
                                <p className="text-xs text-slate-400 text-center py-2">No se encontraron resultados</p>
                            ) : (
                                filteredOptions.map((opt, i) => (
                                    <label key={i} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded cursor-pointer group">
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selected.includes(opt)
                                            ? 'bg-cyan-500 border-cyan-500'
                                            : 'border-slate-300 dark:border-slate-600 group-hover:border-cyan-500/50'
                                            }`}>
                                            {selected.includes(opt) && <ArrowUpDown className="w-2.5 h-2.5 text-white" />}
                                        </div>
                                        <span className="text-xs text-slate-700 dark:text-slate-300 truncate">{opt || '(Vacío)'}</span>
                                        {/* Hidden checkbox for logic if needed, but we use onClick on label/div */}
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={selected.includes(opt)}
                                            onChange={() => toggleOption(opt)}
                                        />
                                    </label>
                                ))
                            )}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                            <button
                                onClick={() => onFilter(column, [])}
                                className="text-[10px] text-slate-500 hover:text-red-500 transition-colors"
                            >
                                Borrar filtro
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="px-3 py-1 bg-cyan-500 hover:bg-cyan-600 text-white text-[10px] font-medium rounded transition-colors"
                            >
                                Listo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

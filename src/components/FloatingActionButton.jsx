import { useState } from 'react'
import { Plus, X, FileText, Package, DollarSign, BarChart3, RotateCcw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function FloatingActionButton() {
    const [isOpen, setIsOpen] = useState(false)
    const navigate = useNavigate()

    const actions = [
        { icon: FileText, label: 'Nueva Factura', path: '/billing', color: 'from-blue-600 to-blue-500' },
        { icon: Package, label: 'Nuevo Producto', path: '/inventory', color: 'from-green-600 to-green-500' },
        { icon: DollarSign, label: 'Centro de Costos', path: '/costs', color: 'from-purple-600 to-purple-500' },
        { icon: RotateCcw, label: 'Nota de Crédito', path: '/credit-note', color: 'from-orange-600 to-orange-500' },
        { icon: BarChart3, label: 'Análisis', path: '/analytics', color: 'from-pink-600 to-pink-500' }
    ]


    const handleActionClick = (path) => {
        navigate(path)
        setIsOpen(false)
    }

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {/* Action Menu */}
            <div className={`absolute bottom-20 right-0 flex flex-col gap-3 transition-all duration-300 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                {actions.map((action, index) => (
                    <button
                        key={action.label}
                        onClick={() => handleActionClick(action.path)}
                        className={`group flex items-center gap-3 transition-all duration-300`}
                        style={{ transitionDelay: isOpen ? `${index * 50}ms` : '0ms' }}
                    >
                        {/* Label */}
                        <span className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                            {action.label}
                        </span>

                        {/* Icon Button */}
                        <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${action.color} shadow-lg flex items-center justify-center hover:scale-110 transition-transform`}>
                            <action.icon className="w-6 h-6 text-white" />
                        </div>
                    </button>
                ))}
            </div>

            {/* Main FAB Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-16 h-16 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 shadow-2xl shadow-cyan-500/50 flex items-center justify-center hover:scale-110 transition-all duration-300 ${isOpen ? 'rotate-45' : 'rotate-0'}`}
            >
                {isOpen ? (
                    <X className="w-8 h-8 text-white" />
                ) : (
                    <Plus className="w-8 h-8 text-white" />
                )}
            </button>
        </div>
    )
}

import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
    LayoutDashboard,
    Package,
    DollarSign,
    Wallet,
    RotateCcw,
    ChartColumn,
    ShoppingCart,
    Settings,
    LogOut
} from 'lucide-react'
import logo from '../../assets/logo.png'
import { supabase } from '../../supabaseClient'
import { SettingsModal } from '../settings/SettingsModal'
import { useCart } from '../../context/CartContext'

const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value)
}

export function Sidebar() {
    const location = useLocation()
    const navigate = useNavigate()
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const { cart, target, setTarget } = useCart()

    // Defensive calculation
    const safeCart = Array.isArray(cart) ? cart : []
    const subtotal = safeCart.reduce((acc, item) => {
        const price = Number(item.price) || 0
        const quantity = Number(item.quantity) || 0
        return acc + (price * quantity)
    }, 0)

    const iva = subtotal * 0.21
    const total = subtotal + iva
    const cartCount = safeCart.length

    const handleLogout = async () => {
        await supabase.auth.signOut()
        navigate('/login')
    }

    const isActive = (path) => location.pathname === path

    const LinkItem = ({ path, icon: Icon, label }) => (
        <Link
            to={path}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive(path)
                ? "bg-cyan-50 text-cyan-700 border border-cyan-200 shadow-sm dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/50 dark:shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                }`}
        >
            <Icon width={20} height={20} className={isActive(path) ? "" : "opacity-70"} />
            <span className="font-medium">{label}</span>
        </Link>
    )

    return (
        <>
            <aside className="w-64 bg-[var(--sidebar-bg)] border-r border-slate-200 dark:border-slate-800 flex flex-col shadow-xl z-20 transition-colors duration-300">
                <div className="p-6 flex items-center space-x-3 border-b border-slate-100 dark:border-slate-800">
                    <img alt="NeuraStock Logo" className="w-12 h-12 object-contain" src={logo} />
                    <div>
                        <h1 className="text-xl font-bold tracking-wider text-slate-900 dark:text-white transition-colors">NeuraStock</h1>
                        <p className="text-xs text-slate-500 dark:text-slate-500 uppercase tracking-widest">Smart Inventory</p>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-2">
                    <LinkItem path="/" icon={LayoutDashboard} label="Dashboard" />
                    <LinkItem path="/inventory" icon={Package} label="Inventario" />
                    <LinkItem path="/costs" icon={DollarSign} label="Centro de Costos" />
                    <LinkItem path="/accounts" icon={Wallet} label="Cuentas Corrientes" />
                    <LinkItem path="/returns" icon={RotateCcw} label="Devoluciones" />
                    <LinkItem path="/analytics" icon={ChartColumn} label="Análisis" />
                </nav>

                <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    {/* Invoice Card */}
                    <div className="relative bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 mb-5 shadow-[4px_4px_0px_0px_rgba(203,213,225,1)] dark:shadow-[4px_4px_0px_0px_rgba(2,6,23,1)] transform transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(6,182,212,0.3)]">
                        <Link
                            to="/billing"
                            className="w-full flex items-center justify-center gap-3 mb-4 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 group"
                        >
                            <ShoppingCart className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                            <span className="font-bold tracking-wide text-sm">FACTURACIÓN</span>
                            {cartCount > 0 && (
                                <span className="bg-white/20 backdrop-blur-md text-white border border-white/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    {cartCount}
                                </span>
                            )}
                        </Link>

                        {cartCount > 0 && (
                            <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                                <div className="space-y-1 text-xs">
                                    <div className="flex justify-between text-slate-500 dark:text-slate-400">
                                        <span>Subtotal:</span>
                                        <span className="font-mono">{formatCurrency(subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-500 dark:text-slate-400">
                                        <span>IVA (21%):</span>
                                        <span className="font-mono">{formatCurrency(iva)}</span>
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                    <span className="font-bold text-slate-900 dark:text-white text-sm">Total:</span>
                                    <span className="font-bold font-mono text-cyan-600 dark:text-cyan-400 text-sm">
                                        {formatCurrency(total)}
                                    </span>
                                </div>

                                <div className="pt-2">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-4 h-4 rounded-full border border-rose-500 flex items-center justify-center">
                                            <div className={`w-1.5 h-1.5 bg-rose-500 rounded-full ${target > 0 && total < target ? 'animate-pulse' : ''}`}></div>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400 tracking-wider">OBJETIVO</span>
                                        <div className="flex-1 bg-slate-200 dark:bg-slate-800 rounded px-2 py-1 flex items-center gap-1">
                                            <span className="text-[10px] text-slate-500">$</span>
                                            <input
                                                type="text"
                                                placeholder="Sin límite"
                                                value={target ? new Intl.NumberFormat('es-AR').format(target) : ''}
                                                onChange={(e) => {
                                                    // Remove dots and validate number
                                                    const rawValue = e.target.value.replace(/\./g, '')
                                                    if (rawValue === '' || /^\d+$/.test(rawValue)) {
                                                        setTarget(Number(rawValue))
                                                    }
                                                }}
                                                className="w-full bg-transparent border-none text-[10px] text-slate-900 dark:text-white outline-none placeholder-slate-500 font-mono"
                                            />
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    {target > 0 && (
                                        <div className="space-y-1">
                                            <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full transition-all duration-500 ease-out rounded-full ${total >= target ? 'bg-emerald-500' : 'bg-gradient-to-r from-rose-500 to-amber-500'}`}
                                                    style={{ width: `${Math.min(100, (total / target) * 100)}%` }}
                                                ></div>
                                            </div>
                                            <div className="flex justify-between text-[9px] font-medium">
                                                <span className={`${total >= target ? 'text-emerald-500' : 'text-slate-400'}`}>
                                                    {total >= target ? '¡Objetivo Completado!' : `${((total / target) * 100).toFixed(0)}%`}
                                                </span>
                                                {total < target && (
                                                    <span className="text-slate-400">
                                                        Faltan {formatCurrency(target - total)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors mb-2"
                    >
                        <Settings width={16} height={16} />
                        <span>Configuración</span>
                    </button>

                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
                    >
                        <LogOut width={16} height={16} />
                        <span>Cerrar Sesión</span>
                    </button>

                    <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800 flex justify-center">
                        <a href="https://neuracall.net/" target="_blank" rel="noopener noreferrer" className="opacity-70 hover:opacity-100 transition-opacity flex flex-col items-center">
                            <span className="text-[10px] text-slate-400 mb-1">Powered by</span>
                            <div className="flex items-center gap-1">
                                <img src="/src/assets/neuracall_web_logo.png" alt="Neuracall" className="h-5" />
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Neuracall</span>
                            </div>
                        </a>
                    </div>
                </div>
            </aside>
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </>
    )
}

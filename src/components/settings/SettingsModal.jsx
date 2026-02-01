import { useState, useEffect } from 'react'
import { Moon, Sun, X, Check } from 'lucide-react'

export function SettingsModal({ isOpen, onClose }) {
    const [isDark, setIsDark] = useState(false)
    const [selectedColor, setSelectedColor] = useState('default')

    // Initialize theme state from DOM or localStorage
    useEffect(() => {
        const isDarkMode = document.documentElement.classList.contains('dark')
        setIsDark(isDarkMode)
    }, [isOpen]) // specific dependency to re-check when opened

    const toggleTheme = (mode) => {
        const isDarkStr = mode === 'dark'
        setIsDark(isDarkStr)
        if (isDarkStr) {
            document.documentElement.classList.add('dark')
            localStorage.setItem('theme', 'dark')
        } else {
            document.documentElement.classList.remove('dark')
            localStorage.setItem('theme', 'light')
        }
    }

    // This handles the "Default" color reset as per the CSS provided
    // For other colors, we would need specific hex codes.
    const handleColorChange = (color) => {
        setSelectedColor(color)
        if (color === 'default') {
            document.documentElement.style.removeProperty('--app-bg')
            document.documentElement.style.removeProperty('--sidebar-bg')
        }
        // Future implementation for other colors...
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Configuración</h2>
                    <button
                        onClick={onClose}
                        className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Appearance */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Apariencia</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => toggleTheme('dark')}
                                className={`relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${isDark ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}
                            >
                                <div className={`p-3 rounded-full ${isDark ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                                    <Moon className="w-6 h-6" />
                                </div>
                                <span className={`font-medium ${isDark ? 'text-indigo-400' : 'text-slate-600 dark:text-slate-400'}`}>Modo Oscuro</span>
                                {isDark && (
                                    <div className="absolute top-3 right-3 text-indigo-500 bg-white dark:bg-slate-900 rounded-full p-0.5">
                                        <Check className="w-3.5 h-3.5" strokeWidth={3} />
                                    </div>
                                )}
                            </button>

                            <button
                                onClick={() => toggleTheme('light')}
                                className={`relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${!isDark ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}
                            >
                                <div className={`p-3 rounded-full ${!isDark ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                                    <Sun className="w-6 h-6" />
                                </div>
                                <span className={`font-medium ${!isDark ? 'text-indigo-400' : 'text-slate-600 dark:text-slate-400'}`}>Modo Claro</span>
                                {!isDark && (
                                    <div className="absolute top-3 right-3 text-indigo-500 bg-white dark:bg-slate-900 rounded-full p-0.5">
                                        <Check className="w-3.5 h-3.5" strokeWidth={3} />
                                    </div>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Background Color */}
                    <div className="space-y-3 pt-2">
                        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Color de Fondo</h3>
                        <div className="flex flex-wrap gap-3">
                            {[
                                { id: 'default', colorClass: 'bg-slate-500', title: 'Default' },
                                { id: 'blue', colorClass: 'bg-blue-500', title: 'Azul' },
                                { id: 'violet', colorClass: 'bg-violet-500', title: 'Violeta' },
                                { id: 'emerald', colorClass: 'bg-emerald-500', title: 'Verde' },
                                { id: 'pink', colorClass: 'bg-pink-500', title: 'Rosa' },
                                { id: 'orange', colorClass: 'bg-orange-500', title: 'Naranja' }
                            ].map((theme) => (
                                <button
                                    key={theme.id}
                                    onClick={() => handleColorChange(theme.id)}
                                    className={`w-12 h-12 rounded-full ${theme.colorClass} relative transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 focus:ring-gray-400 border-2 ${selectedColor === theme.id ? 'border-white dark:border-slate-800 ring-2 ring-slate-400' : 'border-transparent'}`}
                                    title={theme.title}
                                >
                                    {selectedColor === theme.id && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Check className="text-white w-6 h-6 drop-shadow-md" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800/50">
                        <p className="text-sm text-slate-600 dark:text-slate-400 text-center">Más configuraciones próximamente...</p>
                    </div>
                </div>

                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium rounded-lg hover:opacity-90 transition-opacity"
                    >
                        Listo
                    </button>
                </div>
            </div>
        </div>
    )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { User, Lock, Loader2 } from 'lucide-react'
import logo from '../assets/logo.png'
import neuracallLogo from '../assets/neuracall-logo.jpg'

export function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [message, setMessage] = useState(null)
    const navigate = useNavigate()

    const handleLogin = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setMessage(null)

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) throw error

            if (data.user) {
                navigate('/')
            }
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }




    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#1e293b] via-[#0f172a] to-[#020617] relative overflow-hidden py-12">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-[1000px] pointer-events-none">
                <div className="absolute top-[20%] left-[20%] w-[400px] h-[400px] bg-primary/20 rounded-full blur-[100px] opacity-30 animate-pulse" />
                <div className="absolute bottom-[20%] right-[20%] w-[300px] h-[300px] bg-blue-600/20 rounded-full blur-[100px] opacity-20" />
            </div>

            <a
                href="https://neuracall.net/"
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-6 right-6 z-20 block transition-transform hover:scale-110 active:scale-95"
            >
                <img
                    src={neuracallLogo}
                    alt="Neuracall"
                    className="w-16 h-16 object-contain rounded-full opacity-30 hover:opacity-100 transition-all duration-700 animate-pulse hover:animate-none"
                />
            </a>

            <div className="w-full max-w-[420px] px-4 relative z-10">
                <div className="text-center mb-10">
                    <div className="flex justify-center mb-8">
                        <div className="relative">
                            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                            <img
                                src={logo}
                                alt="Neuracall Logo"
                                className="relative w-32 h-auto object-contain drop-shadow-2xl"
                            />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight font-sans">NeuraStock</h1>
                    <p className="text-secondary/60 text-sm font-sans">Smart Inventory System</p>
                    <p className="text-secondary/40 text-[10px] mt-2 italic font-sans max-w-[300px] mx-auto leading-tight">
                        "Automatizar lo rutinario para que los humanos se dediquen a lo extraordinario"
                    </p>
                </div>

                <form onSubmit={handleLogin} className="bg-[#0f172a]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl ring-1 ring-white/10 space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-secondary uppercase tracking-wider ml-1 font-sans">
                            Usuario
                        </label>
                        <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary group-focus-within:text-primary transition-colors" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Ingrese su usuario"
                                className="w-full bg-[#0f172a] border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-secondary/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-sans"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-secondary uppercase tracking-wider ml-1 font-sans">
                            Contraseña
                        </label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary group-focus-within:text-primary transition-colors" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Ingrese su contraseña"
                                className="w-full bg-[#0f172a] border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-secondary/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-sans"
                                required
                            />
                        </div>
                    </div>

                    {
                        error && (
                            <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm text-center font-sans">
                                {error}
                            </div>
                        )
                    }

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/25 transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-sans"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                INGRESANDO...
                            </>
                        ) : (
                            'INGRESAR'
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-secondary/40 text-xs font-sans">
                        © 2025 Neuracall Systems. All rights reserved.
                    </p>
                </div>
            </div >
        </div >
    )
}

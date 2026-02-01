import { Sidebar } from './Sidebar'

export function Layout({ children }) {
    return (
        <div className="flex h-screen bg-[var(--app-bg)] text-slate-900 dark:text-slate-200 overflow-hidden font-sans transition-colors duration-300">
            <Sidebar />
            <main className="flex-1 overflow-auto bg-[var(--app-bg)] relative transition-colors duration-300">
                {children}
            </main>
        </div>
    )
}

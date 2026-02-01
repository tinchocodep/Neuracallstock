import { X, Download, FileText, CheckCircle2 } from 'lucide-react'

export function InvoiceResultModal({ isOpen, onClose, invoiceData }) {
    if (!isOpen || !invoiceData) return null

    const { cae, invoiceNumber, pdfUrl } = invoiceData

    const handleDownload = () => {
        const link = document.createElement('a')
        link.href = pdfUrl
        link.download = `Factura_${invoiceNumber || 'documento'}.pdf`
        link.click()
    }

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-500/20 p-2 rounded-xl">
                            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Factura Generada Exitosamente</h2>
                            <p className="text-xs text-slate-400">Documento fiscal registrado en ARCA</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Invoice Info */}
                <div className="flex gap-4 p-4 bg-slate-950/50 border-b border-slate-800">
                    <div className="flex-1 bg-slate-900 rounded-xl p-4 border border-slate-800">
                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">CAE</div>
                        <div className="text-lg font-mono font-bold text-cyan-400">{cae || 'N/A'}</div>
                    </div>
                    <div className="flex-1 bg-slate-900 rounded-xl p-4 border border-slate-800">
                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Número de Factura</div>
                        <div className="text-lg font-mono font-bold text-white">{invoiceNumber || 'N/A'}</div>
                    </div>
                </div>

                {/* PDF Preview */}
                <div className="flex-1 p-4 min-h-[400px] overflow-hidden">
                    {pdfUrl ? (
                        <iframe
                            src={pdfUrl}
                            className="w-full h-full min-h-[400px] rounded-xl border border-slate-800 bg-white"
                            title="Vista previa de factura"
                        />
                    ) : (
                        <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center text-slate-500 bg-slate-950 rounded-xl border border-slate-800">
                            <FileText className="w-16 h-16 mb-4 opacity-30" />
                            <p>No se pudo cargar la vista previa del PDF</p>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="flex gap-3 p-4 border-t border-slate-800">
                    {pdfUrl && (
                        <>
                            <a
                                href={pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                            >
                                <FileText className="w-5 h-5" />
                                Abrir PDF
                            </a>
                            <button
                                onClick={handleDownload}
                                className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                            >
                                <Download className="w-5 h-5" />
                                Descargar
                            </button>
                        </>
                    )}
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    )
}

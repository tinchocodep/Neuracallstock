import { useState, useEffect, useRef } from 'react'
import { DollarSign } from 'lucide-react'

export function PriceRangeSlider({ min = 0, max = 100000, value = [0, 100000], onChange }) {
    const [localValue, setLocalValue] = useState(value)
    const [isDragging, setIsDragging] = useState(null)
    const sliderRef = useRef(null)

    useEffect(() => {
        setLocalValue(value)
    }, [value])

    const formatPrice = (price) => {
        if (price >= 1000000) return `$${(price / 1000000).toFixed(1)}M`
        if (price >= 1000) return `$${(price / 1000).toFixed(0)}K`
        return `$${price}`
    }

    const handleMouseDown = (index) => (e) => {
        e.preventDefault()
        setIsDragging(index)
    }

    const handleMouseMove = (e) => {
        if (isDragging === null || !sliderRef.current) return

        const rect = sliderRef.current.getBoundingClientRect()
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
        const newValue = Math.round(min + percent * (max - min))

        const newRange = [...localValue]
        newRange[isDragging] = newValue

        // Ensure min doesn't exceed max and vice versa
        if (isDragging === 0 && newValue > localValue[1]) {
            newRange[0] = localValue[1]
        } else if (isDragging === 1 && newValue < localValue[0]) {
            newRange[1] = localValue[0]
        } else {
            newRange[isDragging] = newValue
        }

        setLocalValue(newRange)
    }

    const handleMouseUp = () => {
        if (isDragging !== null) {
            onChange(localValue)
            setIsDragging(null)
        }
    }

    useEffect(() => {
        if (isDragging !== null) {
            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
            return () => {
                document.removeEventListener('mousemove', handleMouseMove)
                document.removeEventListener('mouseup', handleMouseUp)
            }
        }
    }, [isDragging, localValue])

    const minPercent = ((localValue[0] - min) / (max - min)) * 100
    const maxPercent = ((localValue[1] - min) / (max - min)) * 100

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <DollarSign className="w-4 h-4" />
                <span className="font-medium">Rango de Precio</span>
            </div>

            <div className="relative pt-2 pb-6" ref={sliderRef}>
                {/* Track */}
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full relative">
                    {/* Active range */}
                    <div
                        className="absolute h-full bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-full"
                        style={{
                            left: `${minPercent}%`,
                            right: `${100 - maxPercent}%`
                        }}
                    />
                </div>

                {/* Min handle */}
                <div
                    className="absolute top-0 w-5 h-5 bg-white dark:bg-slate-800 border-2 border-cyan-500 rounded-full cursor-pointer shadow-lg hover:scale-110 transition-transform"
                    style={{ left: `calc(${minPercent}% - 10px)` }}
                    onMouseDown={handleMouseDown(0)}
                >
                    <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-[10px] font-mono text-cyan-600 dark:text-cyan-400 whitespace-nowrap">
                        {formatPrice(localValue[0])}
                    </div>
                </div>

                {/* Max handle */}
                <div
                    className="absolute top-0 w-5 h-5 bg-white dark:bg-slate-800 border-2 border-cyan-500 rounded-full cursor-pointer shadow-lg hover:scale-110 transition-transform"
                    style={{ left: `calc(${maxPercent}% - 10px)` }}
                    onMouseDown={handleMouseDown(1)}
                >
                    <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-[10px] font-mono text-cyan-600 dark:text-cyan-400 whitespace-nowrap">
                        {formatPrice(localValue[1])}
                    </div>
                </div>
            </div>
        </div>
    )
}

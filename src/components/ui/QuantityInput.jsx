import { useState, useEffect } from 'react'

export function QuantityInput({ initialValue, stock, onChange, className = "" }) {
    const [value, setValue] = useState(initialValue)

    useEffect(() => {
        setValue(initialValue)
    }, [initialValue])

    const handleChange = (e) => {
        const val = e.target.value
        setValue(val)

        // Only trigger update if it's a valid number and not empty
        // This allows typing "1" then "0" to get "10" without intermediate flashes
        // But for immediate feedback, we might want to update. 
        // However, updating immediately causes the "clamping to 1" issue if we backspace to empty.

        if (val !== '' && !isNaN(val)) {
            onChange(Number(val))
        }
    }

    const handleBlur = () => {
        if (value === '' || isNaN(Number(value)) || Number(value) < 1) {
            // Invalid, reset to 1
            setValue(1)
            onChange(1)
        } else if (Number(value) > stock) {
            // Cap at stock
            setValue(stock)
            onChange(stock)
        } else {
            // Just ensure the formatted/number value is consistent
            // Trigger change to ensure parent is synced if handleChange didn't catch it
            onChange(Number(value))
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.target.blur()
        }
    }

    return (
        <input
            type="number"
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={className}
            min="1"
            max={stock}
        />
    )
}

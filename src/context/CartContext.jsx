import { createContext, useContext, useState, useEffect } from 'react'

const CartContext = createContext()

export function CartProvider({ children }) {
    const [cart, setCart] = useState(() => {
        try {
            const saved = localStorage.getItem('neuracall_cart')
            const parsed = saved ? JSON.parse(saved) : []
            return Array.isArray(parsed) ? parsed : []
        } catch (error) {
            console.error('Error parsing cart from localStorage:', error)
            return []
        }
    })

    useEffect(() => {
        try {
            localStorage.setItem('neuracall_cart', JSON.stringify(cart || []))
        } catch (error) {
            console.error('Error saving cart to localStorage:', error)
        }
    }, [cart])

    const addToCart = (product, quantity = 1) => {
        setCart(prev => {
            if (!Array.isArray(prev)) return [] // Safety check

            const safeProduct = { ...product } // Create copy
            const qtyToAdd = Number(quantity) || 1
            const productStock = Number(safeProduct.stock) || 0

            const existingIndex = prev.findIndex(item => item.id === safeProduct.id)

            if (existingIndex >= 0) {
                const newCart = [...prev]
                const item = newCart[existingIndex]
                const currentQty = Number(item.quantity) || 0
                const newQty = Math.min(currentQty + qtyToAdd, productStock)

                newCart[existingIndex] = { ...item, ...safeProduct, quantity: newQty }
                return newCart
            }

            return [...prev, { ...safeProduct, quantity: Math.min(qtyToAdd, productStock) }]
        })
    }

    const updateCartItem = (productId, updates) => {
        setCart(prev => prev.map(item => {
            if (item.id === productId) {
                return { ...item, ...updates }
            }
            return item
        }))
    }

    const updateQuantity = (productId, newQuantity) => {
        setCart(prev => prev.map(item => {
            if (item.id === productId) {
                const stock = Number(item.stock) || 0
                const validQty = Math.max(1, Math.min(Number(newQuantity) || 1, stock))
                return { ...item, quantity: validQty }
            }
            return item
        }))
    }

    const removeFromCart = (productId) => {
        setCart(prev => prev.filter(item => item.id !== productId))
    }

    const clearCart = () => setCart([])

    const [target, setTarget] = useState(() => {
        try {
            const saved = localStorage.getItem('neuracall_target')
            return saved ? Number(saved) : 0
        } catch {
            return 0
        }
    })

    useEffect(() => {
        localStorage.setItem('neuracall_target', target)
    }, [target])

    const value = {
        cart,
        target,
        setTarget,
        addToCart,
        updateQuantity,
        updateCartItem,
        removeFromCart,
        clearCart
    }

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    )
}

export function useCart() {
    const context = useContext(CartContext)
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider')
    }
    return context
}

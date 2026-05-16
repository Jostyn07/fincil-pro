'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/src/app/lib/supabase'
import Link from 'next/link'

type ProductoInventario = {
  id: string
  nombre: string
  precio_venta: number
  stock_disponible: number
  stock_reservado: number
  vendido: number
}

function formatPesos(valor: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(valor)
}

export default function NuevoPedido() {

  const [usuarioId, setUsuarioId] = useState<string | null>(null)
  const [productosDisponibles, setProductosDisponibles] = useState<ProductoInventario[]>([])

  const [cliente, setCliente] = useState('')
  const [telefono, setTelefono] = useState('')
  const [direccion, setDireccion] = useState('')
  const [ciudad, setCiudad] = useState('')

  const [modoProducto, setModoProducto] = useState<'inventario' | 'manual'>('inventario')
  const [productoManual, setProductoManual] = useState('')
  const [precioManual, setPrecioManual] = useState(0)
  const [productoId, setProductoId] = useState('')
  const [cantidad, setCantidad] = useState(1)
  const [fechaEntrega, setFechaEntrega] = useState('')
  const [metodoPago, setMetodoPago] = useState('')
  const [notas, setNotas] = useState('')

  const [guardando, setGuardando] = useState(false)
  const [exito, setExito] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function inicializar() {
      const { data: userData } = await supabase.auth.getUser()
      if (userData.user) setUsuarioId(userData.user.id)

      const { data: prods } = await supabase
        .from('productos')
        .select('id, nombre, precio_venta, stock_disponible, stock_reservado, vendido')
        .order('nombre')
      if (prods) setProductosDisponibles(prods as ProductoInventario[])
    }
    inicializar()
  }, [])

  // productoId es UUID string — comparar con string, no Number
  const productoSeleccionado = productosDisponibles.find((p) => p.id === productoId)

  const precioUnitario = modoProducto === 'inventario'
    ? (productoSeleccionado?.precio_venta ?? 0)
    : precioManual

  const total = precioUnitario * cantidad

  const stockReal = productoSeleccionado
    ? productoSeleccionado.stock_disponible - productoSeleccionado.stock_reservado - productoSeleccionado.vendido
    : 0

  const stockDisponible = modoProducto === 'manual'
    ? true
    : productoSeleccionado
      ? stockReal >= cantidad
      : true

  async function handleGuardar() {
    setError('')

    if (!cliente) { setError('El nombre del cliente es obligatorio'); return }
    if (!telefono) { setError('El teléfono es obligatorio'); return }
    if (modoProducto === 'inventario' && !productoId) { setError('Selecciona un producto'); return }
    if (modoProducto === 'manual' && !productoManual) { setError('Escribe el nombre del producto'); return }
    if (modoProducto === 'manual' && precioManual <= 0) { setError('El precio debe ser mayor a 0'); return }
    if (!fechaEntrega) { setError('La fecha de entrega es obligatoria'); return }
    if (!usuarioId) { setError('Error de sesión. Recarga la página.'); return }

    setGuardando(true)

    try {
      // Paso 1 — Cliente
      const { data: clienteExistente } = await supabase
        .from('clientes')
        .select('id')
        .eq('usuario_id', usuarioId)
        .eq('telefono', telefono)
        .maybeSingle()

      let clienteId: string

      if (clienteExistente) {
        clienteId = clienteExistente.id
      } else {
        const { data: nuevoCliente, error: errorCliente } = await supabase
          .from('clientes')
          .insert({ usuario_id: usuarioId, nombre: cliente, telefono, direccion, ciudad })
          .select('id')
          .single()
        if (errorCliente || !nuevoCliente) {
          setError('Error al guardar el cliente.'); setGuardando(false); return
        }
        clienteId = nuevoCliente.id
      }

      // Paso 2 — Pedido
      const { data: nuevoPedido, error: errorPedido } = await supabase
        .from('pedidos')
        .insert({
          usuario_id: usuarioId,
          cliente_id: clienteId,
          fecha_entrega: fechaEntrega,
          estado: 'Recibido',
          metodo_pago: metodoPago,
          total: total,
          notas: notas,
        })
        .select('id')
        .single()

      if (errorPedido || !nuevoPedido) {
        setError('Error al guardar el pedido.'); setGuardando(false); return
      }

      // Paso 3 — Item del pedido
      const { error: errorItem } = await supabase
        .from('pedido_items')
        .insert({
          pedido_id: nuevoPedido.id,
          usuario_id: usuarioId,
          producto_id: modoProducto === 'inventario' ? productoId : null,
          nombre_manual: modoProducto === 'manual'
            ? productoManual
            : productoSeleccionado?.nombre ?? '',
          cantidad: cantidad,
          precio_unitario: precioUnitario,
        })

      if (errorItem) {
        setError('Error al guardar el producto del pedido.'); setGuardando(false); return
      }

      // Paso 4 — Descontar stock si viene del inventario
      if (modoProducto === 'inventario' && productoSeleccionado) {
        await supabase
          .from('productos')
          .update({ stock_reservado: productoSeleccionado.stock_reservado + cantidad })
          .eq('id', productoId)
      }

      setGuardando(false)
      setExito(true)

    } catch {
      setError('Ocurrió un error inesperado.'); setGuardando(false)
    }
  }

  if (exito) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Pedido creado!</h2>
        <p className="text-gray-500 mb-8">
          El pedido de <strong>{cliente}</strong> fue registrado exitosamente.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/dashboard/pedidos"
            className="bg-[#0f1e35] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#162740] transition-colors">
            Ver todos los pedidos
          </Link>
          <button
            onClick={() => {
              setExito(false)
              setCliente(''); setTelefono(''); setDireccion(''); setCiudad('')
              setProductoId(''); setCantidad(1); setFechaEntrega('')
              setMetodoPago(''); setNotas(''); setProductoManual(''); setPrecioManual(0)
            }}
            className="border border-gray-200 text-gray-600 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            Crear otro pedido
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">

      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/pedidos" className="text-gray-400 hover:text-gray-600 transition-colors">
          ← Volver
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">➕ Nuevo pedido</h1>
          <p className="text-gray-500 text-sm">Completa los datos del pedido</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>
      )}

      <div className="space-y-6">

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-4">👤 Datos del cliente</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre <span className="text-red-500">*</span></label>
              <input type="text" value={cliente} onChange={(e) => setCliente(e.target.value)}
                placeholder="Nombre completo"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono <span className="text-red-500">*</span></label>
              <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)}
                placeholder="300 123 4567"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
              <input type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)}
                placeholder="Calle 10 #20-30"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
              <input type="text" value={ciudad} onChange={(e) => setCiudad(e.target.value)}
                placeholder="Barranquilla"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-4">📦 Datos del pedido</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Producto <span className="text-red-500">*</span></label>
              <div className="flex gap-2 mb-3">
                {(['inventario', 'manual'] as const).map((modo) => (
                  <button key={modo} type="button" onClick={() => setModoProducto(modo)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      modoProducto === modo
                        ? 'bg-[#0f1e35] text-white border-[#0f1e35]'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}>
                    {modo === 'inventario' ? '📦 Desde inventario' : '✏️ Escribir manualmente'}
                  </button>
                ))}
              </div>

              {modoProducto === 'inventario' && (
                <select value={productoId} onChange={(e) => setProductoId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7] bg-white">
                  <option value="">Selecciona un producto</option>
                  {productosDisponibles.map((p) => {
                    const stockActual = p.stock_disponible - p.stock_reservado - p.vendido
                    return (
                      <option key={p.id} value={p.id}>
                        {p.nombre} — {formatPesos(p.precio_venta)} (Stock: {stockActual})
                      </option>
                    )
                  })}
                </select>
              )}

              {modoProducto === 'manual' && (
                <div className="space-y-3">
                  <input type="text" value={productoManual} onChange={(e) => setProductoManual(e.target.value)}
                    placeholder="Nombre del producto o servicio"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]" />
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Precio unitario (COP)</label>
                    <input type="number" min={0} value={precioManual} onChange={(e) => setPrecioManual(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]" />
                  </div>
                  <div className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                    💡 Este producto no se descontará del inventario.
                  </div>
                </div>
              )}

              {modoProducto === 'inventario' && productoId && !stockDisponible && (
                <div className="mt-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  ⚠️ Stock insuficiente. Solo hay {stockReal} unidades disponibles.
                </div>
              )}
              {modoProducto === 'inventario' && productoId && stockDisponible && (
                <div className="mt-2 text-xs text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                  ✅ Stock disponible
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad <span className="text-red-500">*</span></label>
              <input type="number" min={1} value={cantidad} onChange={(e) => setCantidad(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total</label>
              <div className="w-full border border-gray-100 bg-gray-50 rounded-lg px-3 py-2 text-sm font-bold text-[#0f1e35]">
                {total > 0 ? formatPesos(total) : '—'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de entrega <span className="text-red-500">*</span></label>
              <input type="date" value={fechaEntrega} onChange={(e) => setFechaEntrega(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago</label>
              <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7] bg-white">
                <option value="">Seleccionar</option>
                {['Efectivo','Transferencia','Nequi','Daviplata','Contraentrega','Crédito'].map(m => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas u observaciones</label>
              <textarea value={notas} onChange={(e) => setNotas(e.target.value)}
                placeholder="Instrucciones especiales, referencias de entrega, etc."
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7] resize-none" />
            </div>

          </div>
        </div>

        <div className="flex gap-3 justify-end pb-8">
          <Link href="/dashboard/pedidos"
            className="border border-gray-200 text-gray-600 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            Cancelar
          </Link>
          <button onClick={handleGuardar} disabled={guardando || !stockDisponible}
            className="bg-[#0f1e35] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#162740] transition-colors disabled:opacity-50">
            {guardando ? 'Guardando...' : '✅ Crear pedido'}
          </button>
        </div>

      </div>
    </div>
  )
}
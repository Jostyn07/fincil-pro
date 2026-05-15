'use client'
import { useEffect } from 'react'
import { supabase } from '@/src/app/lib/supabase'
import { useState } from 'react'
import Link from 'next/link'

// Productos de ejemplo — después los jalamos de Supabase
const productosDisponibles = [
  { id: 1, nombre: 'Torta de chocolate', precio: 45000, stock: 5 },
  { id: 2, nombre: 'Cupcake vainilla',   precio: 18000, stock: 12 },
  { id: 3, nombre: 'Agua 600ml',         precio: 2500,  stock: 24 },
]

function formatPesos(valor: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(valor)
}

export default function NuevoPedido() {
  const [usuarioId, setUsuarioId] = useState<string | null>(null)

  useEffect(() => {
    async function obtenerUsuario() {
      const { data } = await supabase.auth.getUser()
      if (data.user) {
        setUsuarioId(data.user.id)
      }
    }
    obtenerUsuario()
  }, [])

  // Datos del cliente
  const [cliente, setCliente]       = useState('')
  const [telefono, setTelefono]     = useState('')
  const [direccion, setDireccion]   = useState('')
  const [ciudad, setCiudad]         = useState('')

  // Datos del pedido
  const [modoProducto, setModoProducto] = useState<'inventario' | 'manual'>('inventario')
  const [productoManual, setProductoManual] = useState('')
  const [precioManual, setPrecioManual] = useState(0)
  const [productoId, setProductoId] = useState('')
  const [cantidad, setCantidad]     = useState(1)
  const [fechaEntrega, setFechaEntrega] = useState('')
  const [metodoPago, setMetodoPago] = useState('')
  const [notas, setNotas]           = useState('')

  // Control de UI
  const [guardando, setGuardando]   = useState(false)
  const [exito, setExito]           = useState(false)
  const [error, setError]           = useState('')

  const productoSeleccionado = productosDisponibles.find(
    (p) => p.id === Number(productoId)
  )
  const precioUnitario = modoProducto === 'inventario'
    ? (productoSeleccionado?.precio ?? 0)
    : precioManual
  const total = precioUnitario * cantidad
  const stockDisponible = modoProducto === 'manual'
    ? true
    : productoSeleccionado
      ? productoSeleccionado.stock >= cantidad
      : true

  async function handleGuardar() {
    setError('')
    console.log('usuarioId:', usuarioId)
    // Validaciones
    if (!cliente) { setError('El nombre del cliente es obligatorio'); return }
    if (!telefono) { setError('El teléfono es obligatorio'); return }
    if (modoProducto === 'inventario' && !productoId) {
      setError('Selecciona un producto del inventario'); return
    }
    if (modoProducto === 'manual' && !productoManual) {
      setError('Escribe el nombre del producto'); return
    }
    if (modoProducto === 'manual' && precioManual <= 0) {
      setError('El precio debe ser mayor a 0'); return
    }
    if (!fechaEntrega) { setError('La fecha de entrega es obligatoria'); return }
    if (!usuarioId) { setError('Error de sesión. Recarga la página.'); return }

    setGuardando(true)

    try {
      // ── PASO 1: Guardar o crear el cliente ──
      // Buscamos si ya existe un cliente con ese teléfono
      const { data: clienteExistente } = await supabase
        .from('clientes')
        .select('id')
        .eq('usuario_id', usuarioId)
        .eq('telefono', telefono)
        .maybeSingle()

      let clienteId: string

      if (clienteExistente) {
        // Ya existe, usamos su id
        clienteId = clienteExistente.id
      } else {
        // No existe, lo creamos
        const { data: nuevoCliente, error: errorCliente } = await supabase
          .from('clientes')
          .insert({
            usuario_id: usuarioId,
            nombre: cliente,
            telefono: telefono,
            direccion: direccion,
            ciudad: ciudad,
          })
          .select('id')
          .single()

        if (errorCliente || !nuevoCliente) {
          setError('Error al guardar el cliente. Intenta de nuevo.')
          setGuardando(false)
          return
        }

        clienteId = nuevoCliente.id
      }

      // ── PASO 2: Crear el pedido ──
      // const nombreProducto = modoProducto === 'inventario'? productoSeleccionado?.nombre : productoManual

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
        setError('Error al guardar el pedido. Intenta de nuevo.')
        setGuardando(false)
        return
      }

      // ── PASO 3: Guardar el item del pedido ──
      const { error: errorItem } = await supabase
        .from('pedido_items')
        .insert({
          // pedido_id: null,
          pedido_id: nuevoPedido.id,
          usuario_id: usuarioId,
          producto_id: modoProducto === 'inventario' ? Number(productoId) : null,
          nombre_manual: modoProducto === 'manual' ? productoManual : null,
          cantidad: cantidad,
          precio_unitario: precioUnitario,
        })

      if (errorItem) {
        setError('Error al guardar el producto del pedido.')
        setGuardando(false)
        return
      }

      // ── TODO SALIÓ BIEN ──
      setGuardando(false)
      setExito(true)

    } catch {
      setError('Ocurrió un error inesperado. Intenta de nuevo.')
      setGuardando(false)
    }
  }

  // Pantalla de éxito
  if (exito) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          ¡Pedido creado!
        </h2>
        <p className="text-gray-500 mb-8">
          El pedido de <strong>{cliente}</strong> fue registrado exitosamente.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/dashboard/pedidos"
            className="bg-[#0f1e35] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#162740] transition-colors"
          >
            Ver todos los pedidos
          </Link>
          <button
            onClick={() => {
              setExito(false)
              setCliente(''); setTelefono(''); setDireccion('')
              setCiudad(''); setProductoId(''); setCantidad(1)
              setFechaEntrega(''); setMetodoPago(''); setNotas('')
            }}
            className="border border-gray-200 text-gray-600 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Crear otro pedido
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">

      {/* ── ENCABEZADO ── */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard/pedidos"
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          ← Volver
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">➕ Nuevo pedido</h1>
          <p className="text-gray-500 text-sm">Completa los datos del pedido</p>
        </div>
      </div>

      {/* ── ERROR ── */}
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-6">

        {/* ── SECCIÓN 1: DATOS DEL CLIENTE ── */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-4">
            👤 Datos del cliente
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                placeholder="Nombre completo"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="300 123 4567"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dirección de entrega
              </label>
              <input
                type="text"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Calle 10 #20-30"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ciudad
              </label>
              <input
                type="text"
                value={ciudad}
                onChange={(e) => setCiudad(e.target.value)}
                placeholder="Barranquilla"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]"
              />
            </div>

          </div>
        </div>

        {/* ── SECCIÓN 2: DATOS DEL PEDIDO ── */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-4">
            📦 Datos del pedido
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Producto <span className="text-red-500">*</span>
              </label>

              {/* Toggle inventario / manual */}
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setModoProducto('inventario')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    modoProducto === 'inventario'
                      ? 'bg-[#0f1e35] text-white border-[#0f1e35]'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  📦 Desde inventario
                </button>
                <button
                  type="button"
                  onClick={() => setModoProducto('manual')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    modoProducto === 'manual'
                      ? 'bg-[#0f1e35] text-white border-[#0f1e35]'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  ✏️ Escribir manualmente
                </button>
              </div>

              {/* Selector de inventario */}
              {modoProducto === 'inventario' && (
                <select
                  value={productoId}
                  onChange={(e) => setProductoId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7] bg-white"
                >
                  <option value="">Selecciona un producto</option>
                  {productosDisponibles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} — {formatPesos(p.precio)} (Stock: {p.stock})
                    </option>
                  ))}
                </select>
              )}

              {/* Entrada manual */}
              {modoProducto === 'manual' && (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={productoManual}
                    onChange={(e) => setProductoManual(e.target.value)}
                    placeholder="Nombre del producto o servicio"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]"
                  />
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Precio unitario (COP)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={precioManual}
                      onChange={(e) => setPrecioManual(Number(e.target.value))}
                      placeholder="0"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]"
                    />
                  </div>
                  <div className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                    💡 Este producto no se descontará del inventario. Si quieres controlarlo, agrégalo primero en la sección Inventario.
                  </div>
                </div>
              )}

              {/* Alertas de stock */}
              {modoProducto === 'inventario' && productoId && !stockDisponible && (
                <div className="mt-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  ⚠️ Stock insuficiente. Solo hay {productoSeleccionado?.stock} unidades disponibles.
                </div>
              )}
              {modoProducto === 'inventario' && productoId && stockDisponible && (
                <div className="mt-2 text-xs text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                  ✅ Stock disponible
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cantidad <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                value={cantidad}
                onChange={(e) => setCantidad(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total
              </label>
              <div className="w-full border border-gray-100 bg-gray-50 rounded-lg px-3 py-2 text-sm font-bold text-[#0f1e35]">
                {total > 0 ? formatPesos(total) : '—'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de entrega <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={fechaEntrega}
                onChange={(e) => setFechaEntrega(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Método de pago
              </label>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7] bg-white"
              >
                <option value="">Seleccionar</option>
                <option>Efectivo</option>
                <option>Transferencia</option>
                <option>Nequi</option>
                <option>Daviplata</option>
                <option>Contraentrega</option>
                <option>Crédito</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas u observaciones
              </label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Instrucciones especiales, referencias de entrega, etc."
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7] resize-none"
              />
            </div>

          </div>
        </div>

        {/* ── BOTONES ── */}
        <div className="flex gap-3 justify-end pb-8">
          <Link
            href="/dashboard/pedidos"
            className="border border-gray-200 text-gray-600 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </Link>
          <button
            onClick={handleGuardar}
            disabled={guardando || !stockDisponible}
            className="bg-[#0f1e35] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#162740] transition-colors disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : '✅ Crear pedido'}
          </button>
        </div>

      </div>
    </div>
  )
}
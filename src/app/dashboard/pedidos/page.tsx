'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/src/app/lib/supabase'

// type Cliente = { nombre: string; telefono: string }

type Pedido = {
  id: string
  numero_pedido: number
  fecha_entrega: string
  estado: string
  estado_pago: string
  total: number
  notas: string
  clientes: { nombre: string; telefono: string } | null
  pedido_items: { nombre_manual: string; cantidad: number; producto_id: string | null }[]
}

const estados = ['Todos', 'Recibido', 'En producción', 'Listo', 'En camino', 'Entregado', 'Cancelado']

function colorEstado(estado: string) {
  const colores: { [key: string]: string } = {
    'Recibido':      'bg-gray-100 text-gray-700',
    'En producción': 'bg-yellow-100 text-yellow-700',
    'Listo':         'bg-blue-100 text-blue-700',
    'En camino':     'bg-purple-100 text-purple-700',
    'Entregado':     'bg-green-100 text-green-700',
    'Cancelado':     'bg-red-100 text-red-700',
  }
  return colores[estado] || 'bg-gray-100 text-gray-700'
}

function formatPesos(valor: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(valor)
}

export default function Pedidos() {

  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [cargando, setCargando] = useState(true)
  const [filtro, setFiltro] = useState('Todos')
  const [busqueda, setBusqueda] = useState('')

  async function cargarPedidos() {
    const { data, error } = await supabase
      .from('pedidos')
      .select(`
        id,
        numero_pedido,
        fecha_entrega,
        estado,
        estado_pago,
        total,
        notas,
        clientes (nombre, telefono),
        pedido_items (nombre_manual, cantidad)
      `)
      .order('numero_pedido', { ascending: false })
    if (!error && data) setPedidos(data as unknown as Pedido[])
  }

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      await cargarPedidos()
      setCargando(false)
    }
    cargar()
  }, [])

  async function cambiarEstado(pedidoId: string, nuevoEstado: string) {
    await supabase
      .from('pedidos')
      .update({ estado: nuevoEstado })
      .eq('id', pedidoId)

    if (nuevoEstado === 'Entregado') {
      const { data: pedido } = await supabase
        .from('pedidos')
        .select(`
          id, total, metodo_pago, usuario_id,
          clientes (nombre),
          pedido_items (nombre_manual, cantidad, producto_id)
        `)
        .eq('id', pedidoId)
        .single()

      if (pedido) {

        // ── Mover stock de reservado a vendido ──
        for (const item of pedido.pedido_items ?? []) {
          if (item.producto_id) {

            // 1 — Actualizar producto: reservado → vendido
            const { data: producto } = await supabase
              .from('productos')
              .select('stock_reservado, vendido')
              .eq('id', item.producto_id)
              .single()

            if (producto) {
              await supabase
                .from('productos')
                .update({
                  stock_reservado: Math.max(0, producto.stock_reservado - item.cantidad),
                  vendido: producto.vendido + item.cantidad,
                })
                .eq('id', item.producto_id)
            }

            // 2 — Descontar materias primas según receta
            const { data: recetas } = await supabase
              .from('recetas')
              .select('materia_prima_id, cantidad_requerida')
              .eq('producto_id', item.producto_id)

            for (const receta of recetas ?? []) {
              const { data: materia } = await supabase
                .from('materias_primas')
                .select('stock_actual')
                .eq('id', receta.materia_prima_id)
                .single()

              if (materia) {
                const descuento = receta.cantidad_requerida * item.cantidad
                await supabase
                  .from('materias_primas')
                  .update({
                    stock_actual: Math.max(0, materia.stock_actual - descuento),
                  })
                  .eq('id', receta.materia_prima_id)
              }
            }
          }
        }

        // ── Crear ingreso pendiente ──
        const { data: ingresoExistente } = await supabase
          .from('ingresos')
          .select('id')
          .eq('pedido_id', pedidoId)
          .maybeSingle()

        if (!ingresoExistente) {
          const nombreCliente = Array.isArray(pedido.clientes)
            ? pedido.clientes[0]?.nombre
            : (pedido.clientes as { nombre: string } | null)?.nombre

          const nombreProducto = pedido.pedido_items?.[0]?.nombre_manual ?? ''

          await supabase.from('ingresos').insert({
            usuario_id: pedido.usuario_id,
            pedido_id: pedidoId,
            fecha: new Date().toISOString().split('T')[0],
            categoria: 'Venta de productos',
            producto: nombreProducto,
            cliente: nombreCliente ?? '',
            cantidad: 1,
            precio_unitario: pedido.total,
            total: pedido.total,
            forma_pago: pedido.metodo_pago ?? '',
            confirmado: false,
          })
        }
      }
    }

    await cargarPedidos()
  }

  async function marcarCobrado(pedidoId: string) {
    await supabase
      .from('pedidos')
      .update({ estado_pago: 'Cobrado' })
      .eq('id', pedidoId)

    // Confirmar el ingreso asociado
    await supabase
      .from('ingresos')
      .update({ confirmado: true })
      .eq('pedido_id', pedidoId)

    await cargarPedidos()
  }


  const pedidosFiltrados = pedidos.filter((p) => {
    const coincideEstado = filtro === 'Todos' || p.estado === filtro
    const nombreCliente = p.clientes?.nombre?.toLowerCase() || ''
    const nombreProducto = p.pedido_items?.[0]?.nombre_manual?.toLowerCase() || ''
    const coincideBusqueda =
      nombreCliente.includes(busqueda.toLowerCase()) ||
      nombreProducto.includes(busqueda.toLowerCase())
    return coincideEstado && coincideBusqueda
  })

  function contarEstado(estado: string) {
    if (estado === 'Todos') return pedidos.length
    return pedidos.filter((p) => p.estado === estado).length
  }

  return (
    <div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📋 Pedidos</h1>
          <p className="text-gray-500 text-sm mt-1">
            {pedidosFiltrados.length} pedido{pedidosFiltrados.length !== 1 ? 's' : ''}
            {filtro !== 'Todos' ? ` en estado "${filtro}"` : ' en total'}
          </p>
        </div>
        <Link
          href="/dashboard/pedidos/nuevo"
          className="bg-[#0f1e35] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#162740] transition-colors flex items-center gap-2"
        >
          ➕ Nuevo pedido
        </Link>
      </div>

      <div className="flex gap-2 flex-wrap mb-4">
        {estados.map((estado) => (
          <button
            key={estado}
            onClick={() => setFiltro(estado)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filtro === estado
                ? 'bg-[#0f1e35] text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {estado}
            <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
              filtro === estado ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {contarEstado(estado)}
            </span>
          </button>
        ))}
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por cliente o producto..."
          className="w-full max-w-sm border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">#</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">CLIENTE</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">PRODUCTO</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">TOTAL</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">ENTREGA</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">ESTADO</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">CAMBIAR ESTADO</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">COBRO</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    Cargando pedidos...
                  </td>
                </tr>
              ) : pedidosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <div className="text-3xl mb-2">📭</div>
                    No hay pedidos con ese filtro
                  </td>
                </tr>
              ) : (
                pedidosFiltrados.map((pedido) => (
                  <tr key={pedido.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-gray-400 font-mono">
                      #{String(pedido.numero_pedido).padStart(3, '0')}
                    </td>
                    <td className="py-3 px-4">
                    <div>{pedido.clientes?.nombre}</div>
                    <div>{pedido.clientes?.telefono}</div>
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {pedido.pedido_items?.[0]?.nombre_manual || '—'}
                      {pedido.notas && (
                        <div className="text-xs text-gray-400 mt-0.5">📝 {pedido.notas}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-800">
                      {formatPesos(pedido.total)}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {pedido.fecha_entrega
                        ? new Date(pedido.fecha_entrega + 'T00:00:00').toLocaleDateString('es-CO')
                        : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorEstado(pedido.estado)}`}>
                        {pedido.estado}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={pedido.estado}
                        onChange={(e) => cambiarEstado(pedido.id, e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-[#00c9a7]"
                      >
                        {estados.slice(1).map((e) => (
                          <option key={e} value={e}>{e}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      {pedido.estado === 'Entregado' ? (
                        pedido.estado_pago === 'Cobrado' ? (
                          <span className="text-xs text-green-600 font-medium">✅ Cobrado</span>
                        ) : (
                          <button
                            onClick={() => marcarCobrado(pedido.id)}
                            className="text-xs bg-[#00c9a7] text-white px-2 py-1 rounded-lg hover:bg-[#00b396] transition-colors"
                          >
                            Marcar cobrado
                          </button>
                        )
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
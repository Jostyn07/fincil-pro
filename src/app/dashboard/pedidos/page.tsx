'use client'

import { useState } from 'react'
import Link from 'next/link'

// Datos estáticos por ahora — después conectamos Supabase
const pedidosEjemplo = [
  { id: 1, numero: 1, cliente: 'María García',  telefono: '3001234567', producto: 'Torta de chocolate', cantidad: 2, total: 90000, entrega: '16/05/2026', estado: 'En producción', notas: 'Decoración de rosas' },
  { id: 2, numero: 2, cliente: 'Carlos López',  telefono: '3109876543', producto: 'Cupcake vainilla',   cantidad: 3, total: 54000, entrega: '15/05/2026', estado: 'Listo',          notas: '' },
  { id: 3, numero: 3, cliente: 'Ana Martínez',  telefono: '3207654321', producto: 'Torta de chocolate', cantidad: 1, total: 45000, entrega: '14/05/2026', estado: 'En camino',     notas: 'Sin gluten' },
  { id: 4, numero: 4, cliente: 'Pedro Gómez',   telefono: '3154321098', producto: 'Cupcake vainilla',   cantidad: 6, total: 108000, entrega: '18/05/2026', estado: 'Recibido',     notas: '' },
  { id: 5, numero: 5, cliente: 'Laura Díaz',    telefono: '3012345678', producto: 'Torta de chocolate', cantidad: 1, total: 45000, entrega: '13/05/2026', estado: 'Entregado',    notas: '' },
]

const estados = ['Todos', 'Recibido', 'En producción', 'Listo', 'En camino', 'Entregado', 'Cancelado']

function colorEstado(estado: string) {
  const colores: { [key: string]: string } = {
    'Recibido':       'bg-gray-100 text-gray-700',
    'En producción':  'bg-yellow-100 text-yellow-700',
    'Listo':          'bg-blue-100 text-blue-700',
    'En camino':      'bg-purple-100 text-purple-700',
    'Entregado':      'bg-green-100 text-green-700',
    'Cancelado':      'bg-red-100 text-red-700',
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

  const [filtro, setFiltro] = useState('Todos')
  const [busqueda, setBusqueda] = useState('')

  // Filtrar pedidos según estado y búsqueda
  const pedidosFiltrados = pedidosEjemplo.filter((pedido) => {
    const coincideEstado = filtro === 'Todos' || pedido.estado === filtro
    const coincideBusqueda =
      pedido.cliente.toLowerCase().includes(busqueda.toLowerCase()) ||
      pedido.producto.toLowerCase().includes(busqueda.toLowerCase())
    return coincideEstado && coincideBusqueda
  })

  // Contar pedidos por estado para las pastillas
  function contarEstado(estado: string) {
    if (estado === 'Todos') return pedidosEjemplo.length
    return pedidosEjemplo.filter((p) => p.estado === estado).length
  }

  return (
    <div>

      {/* ── ENCABEZADO ── */}
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

      {/* ── FILTROS POR ESTADO ── */}
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

      {/* ── BÚSQUEDA ── */}
      <div className="mb-4">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por cliente o producto..."
          className="w-full max-w-sm border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]"
        />
      </div>

      {/* ── TABLA DE PEDIDOS ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">#</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">CLIENTE</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">PRODUCTO</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">CANT.</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">TOTAL</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">ENTREGA</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">ESTADO</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {pedidosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <div className="text-3xl mb-2">📭</div>
                    No hay pedidos con ese filtro
                  </td>
                </tr>
              ) : (
                pedidosFiltrados.map((pedido) => (
                  <tr
                    key={pedido.id}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-4 text-gray-400 font-mono">
                      #{String(pedido.numero).padStart(3, '0')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-800">{pedido.cliente}</div>
                      <div className="text-xs text-gray-400">{pedido.telefono}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-gray-700">{pedido.producto}</div>
                      {pedido.notas && (
                        <div className="text-xs text-gray-400 mt-0.5">📝 {pedido.notas}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-600">{pedido.cantidad}</td>
                    <td className="py-3 px-4 font-semibold text-gray-800">
                      {formatPesos(pedido.total)}
                    </td>
                    <td className="py-3 px-4 text-gray-600">{pedido.entrega}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorEstado(pedido.estado)}`}>
                        {pedido.estado}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button className="text-xs text-[#00c9a7] hover:underline font-medium">
                        Ver detalle →
                      </button>
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
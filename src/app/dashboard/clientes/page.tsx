'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/src/app/lib/supabase'

type Cliente = {
  id: string
  nombre: string
  telefono: string
  direccion: string
  ciudad: string
  notas: string
  creado_en: string
  total_pedidos?: number
  total_gastado?: number
}

type PedidoCliente = {
  id: string
  numero_pedido: number
  total: number
  estado: string
  fecha_entrega: string
}

type ClienteConPedidos = Cliente & {
  pedidos: PedidoCliente[]
}

export default function Clientes() {

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null)
  const [pedidosCliente, setPedidosCliente] = useState<PedidoCliente[]>([])

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      const { data } = await supabase
        .from('clientes')
        .select(`
          *,
          pedidos (id, total, estado, fecha_entrega, numero_pedido)
        `)
        .order('nombre')
      if (data) {
        const clientesConStats = (data as ClienteConPedidos[]).map((c) => ({
          ...c,
          total_pedidos: c.pedidos?.length ?? 0,
          total_gastado: c.pedidos?.reduce((sum: number, p: PedidoCliente) => sum + (p.total ?? 0), 0) ?? 0,
        }))
        setClientes(clientesConStats)
      }
      setCargando(false)
    }
    cargar()
  }, [])

  function verDetalle(cliente: Cliente) {
    setClienteSeleccionado(cliente)
    const c = clientes.find(cl => cl.id === cliente.id) as ClienteConPedidos
    setPedidosCliente(c?.pedidos ?? [])
  }

  function formatPesos(valor: number) {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(valor)
  }

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

  const clientesFiltrados = clientes.filter((c) =>
    c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.telefono?.includes(busqueda) ||
    c.ciudad?.toLowerCase().includes(busqueda.toLowerCase())
  )

  // Vista de detalle del cliente
  if (clienteSeleccionado) {
    return (
      <div className="max-w-2xl mx-auto">

        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setClienteSeleccionado(null)}
            className="text-gray-400 hover:text-gray-600 transition-colors">
            ← Volver
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{clienteSeleccionado.nombre}</h1>
            <p className="text-gray-500 text-sm">Historial del cliente</p>
          </div>
        </div>

        {/* Tarjeta de info */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">📋 Información</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-400">Teléfono</span>
              <p className="font-medium text-gray-800">{clienteSeleccionado.telefono || '—'}</p>
            </div>
            <div>
              <span className="text-gray-400">Ciudad</span>
              <p className="font-medium text-gray-800">{clienteSeleccionado.ciudad || '—'}</p>
            </div>
            <div className="sm:col-span-2">
              <span className="text-gray-400">Dirección</span>
              <p className="font-medium text-gray-800">{clienteSeleccionado.direccion || '—'}</p>
            </div>
            {clienteSeleccionado.notas && (
              <div className="sm:col-span-2">
                <span className="text-gray-400">Notas</span>
                <p className="font-medium text-gray-800">{clienteSeleccionado.notas}</p>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
            <div className="text-2xl font-bold text-[#0f1e35]">{clienteSeleccionado.total_pedidos}</div>
            <div className="text-sm text-gray-500 mt-1">Pedidos totales</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
            <div className="text-2xl font-bold text-[#00c9a7]">{formatPesos(clienteSeleccionado.total_gastado ?? 0)}</div>
            <div className="text-sm text-gray-500 mt-1">Total gastado</div>
          </div>
        </div>

        {/* Historial de pedidos */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">📦 Historial de pedidos</h2>
          </div>
          {pedidosCliente.length === 0 ? (
            <div className="py-10 text-center text-gray-400">
              <div className="text-3xl mb-2">📭</div>
              Sin pedidos registrados
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">#</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">TOTAL</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">ENTREGA</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">ESTADO</th>
                </tr>
              </thead>
              <tbody>
                {pedidosCliente.map((p: PedidoCliente) => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-400 font-mono">
                      #{String(p.numero_pedido).padStart(3, '0')}
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-800">{formatPesos(p.total)}</td>
                    <td className="py-3 px-4 text-gray-600">
                      {p.fecha_entrega
                        ? new Date(p.fecha_entrega + 'T00:00:00').toLocaleDateString('es-CO')
                        : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorEstado(p.estado)}`}>
                        {p.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    )
  }

  // Vista principal — lista de clientes
  return (
    <div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">👥 Clientes</h1>
        <p className="text-gray-500 text-sm mt-1">
          {clientes.length} cliente{clientes.length !== 1 ? 's' : ''} registrado{clientes.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="mb-4">
        <input type="text" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, teléfono o ciudad..."
          className="w-full max-w-sm border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">CLIENTE</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">TELÉFONO</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">CIUDAD</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">PEDIDOS</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">TOTAL GASTADO</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">DETALLE</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr><td colSpan={6} className="py-12 text-center text-gray-400">Cargando...</td></tr>
              ) : clientesFiltrados.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-gray-400">
                  <div className="text-3xl mb-2">📭</div>
                  {busqueda ? 'No hay resultados para esa búsqueda' : 'Los clientes aparecen aquí al crear pedidos'}
                </td></tr>
              ) : (
                clientesFiltrados.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-medium text-gray-800">{c.nombre}</td>
                    <td className="py-3 px-4 text-gray-600">{c.telefono || '—'}</td>
                    <td className="py-3 px-4 text-gray-500">{c.ciudad || '—'}</td>
                    <td className="py-3 px-4 text-gray-700 font-medium">{c.total_pedidos}</td>
                    <td className="py-3 px-4 font-semibold text-gray-800">{formatPesos(c.total_gastado ?? 0)}</td>
                    <td className="py-3 px-4">
                      <button onClick={() => verDetalle(c)}
                        className="text-xs text-[#00c9a7] hover:underline font-medium">
                        Ver historial →
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
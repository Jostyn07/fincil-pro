'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/src/app/lib/supabase'

type PedidoReciente = {
  id: string
  numero_pedido: number
  total: number
  estado: string
  fecha_entrega: string
  clientes: { nombre: string } | null
  pedido_items: { nombre_manual: string }[]
}

type AlertaStock = {
  id: string
  nombre: string
  stock_actual: number
  tipo: 'producto' | 'materia'
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

export default function Dashboard() {

  const [ingresosMes, setIngresosMes] = useState(0)
  const [gastosMes, setGastosMes] = useState(0)
  const [pedidosActivos, setPedidosActivos] = useState(0)
  const [pedidosRecientes, setPedidosRecientes] = useState<PedidoReciente[]>([])
  const [alertasStock, setAlertasStock] = useState<AlertaStock[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargar() {
      setCargando(true)

      const ahora = new Date()
      const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString()
      const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0).toISOString()

      const inicioMesFecha = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString().split('T')[0]
      const finMesFecha = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0).toISOString().split('T')[0]

      const [
        { data: pedidosEntregados },
        { data: activos },
        { data: recientes },
        { data: productosStockBajo },
        { data: materiasStockBajo },
        { data: gastosDelMes },
      ] = await Promise.all([

        // Ingresos del mes — pedidos entregados
        supabase.from('pedidos')
          .select('total')
          .eq('estado', 'Entregado')
          .eq('estado_pago', 'Cobrado')
          .gte('fecha_creacion', inicioMes)
          .lte('fecha_creacion', finMes),

        // Pedidos activos
        supabase.from('pedidos')
          .select('id', { count: 'exact' })
          .not('estado', 'in', '("Entregado","Cancelado")'),

        // Pedidos recientes
        supabase.from('pedidos')
          .select(`
            id, numero_pedido, total, estado, fecha_entrega,
            clientes (nombre),
            pedido_items (nombre_manual)
          `)
          .order('numero_pedido', { ascending: false })
          .limit(5),

        // Productos con stock bajo
        supabase.from('productos')
          .select('id, nombre, stock_disponible')
          .filter('stock_disponible', 'lte', 'stock_minimo'),

        // Materias primas con stock bajo
        supabase.from('materias_primas')
          .select('id, nombre, stock_actual, stock_minimo')
          .filter('stock_actual', 'lte', 'stock_minimo'),

        // Gastos del mes
        supabase.from('gastos')
          .select('valor')
          .gte('fecha', inicioMesFecha)
          .lte('fecha', finMesFecha),
      ])

      // Calcular ingresos
      const total = pedidosEntregados?.reduce((sum, p) => sum + (p.total ?? 0), 0) ?? 0
      setIngresosMes(total)

      // Calcular gastos
      const totalGastos = gastosDelMes?.reduce((sum, g) => sum + (g.valor ?? 0), 0) ?? 0
      setGastosMes(totalGastos)

      // Pedidos activos
      setPedidosActivos(activos?.length ?? 0)

      // Pedidos recientes
      if (recientes) setPedidosRecientes(recientes as unknown as PedidoReciente[])

      // Alertas de stock
      const alertas: AlertaStock[] = []
      productosStockBajo?.forEach(p => alertas.push({
        id: p.id, nombre: p.nombre, stock_actual: p.stock_disponible, tipo: 'producto'
      }))
      materiasStockBajo?.forEach(m => {
        if (m.stock_actual <= m.stock_minimo) alertas.push({
          id: m.id, nombre: m.nombre, stock_actual: m.stock_actual, tipo: 'materia'
        })
      })
      setAlertasStock(alertas)

      setCargando(false)
    }
    cargar()
  }, [])




  const kpis = [
    {
      titulo: 'Ingresos del mes',
      valor: cargando ? '...' : formatPesos(ingresosMes),
      icono: '💰',
      color: 'bg-blue-50',
      colorTexto: 'text-blue-600',
    },
    {
      titulo: 'Gastos del mes',
      valor: cargando ? '...' : formatPesos(gastosMes),
      icono: '📤',
      color: 'bg-red-50',
      colorTexto: 'text-red-600',
    },
    {
      titulo: 'Utilidad neta',
      valor: cargando ? '...' : formatPesos(ingresosMes - gastosMes),
      icono: '📊',
      color: ingresosMes - gastosMes >= 0 ? 'bg-green-50' : 'bg-red-50',
      colorTexto: ingresosMes - gastosMes >= 0 ? 'text-green-600' : 'text-red-600',
    },
    {
      titulo: 'Pedidos activos',
      valor: cargando ? '...' : String(pedidosActivos),
      icono: '📋',
      color: 'bg-orange-50',
      colorTexto: 'text-orange-600',
    },
  ]

  return (
    <div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Buenos días 👋</h1>
        <p className="text-gray-500 mt-1">Aquí tienes el resumen de tu negocio</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi) => (
          <div key={kpi.titulo} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${kpi.color} text-xl mb-3`}>
              {kpi.icono}
            </div>
            <div className={`text-2xl font-bold ${kpi.colorTexto} mb-1`}>{kpi.valor}</div>
            <div className="text-sm font-medium text-gray-700">{kpi.titulo}</div>
          </div>
        ))}
      </div>

      {/* Alertas + Pedidos recientes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

        {/* Alertas de stock */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-4">📦 Estado del inventario</h2>
          {cargando ? (
            <p className="text-sm text-gray-400">Cargando...</p>
          ) : alertasStock.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="text-4xl mb-3">✅</div>
              <p className="text-sm font-medium text-green-600">Todo en orden</p>
              <p className="text-xs text-gray-400 mt-1">Sin alertas de stock</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alertasStock.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-red-700">{a.nombre}</p>
                    <p className="text-xs text-red-400">
                      {a.tipo === 'producto' ? 'Producto' : 'Materia prima'} · Stock: {a.stock_actual}
                    </p>
                  </div>
                  <span className="text-red-500 text-lg">⚠️</span>
                </div>
              ))}
              <Link href="/dashboard/inventario"
                className="block text-xs text-center text-[#00c9a7] hover:underline mt-2">
                Ver inventario →
              </Link>
            </div>
          )}
        </div>

        {/* Pedidos recientes */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">📋 Pedidos recientes</h2>
            <Link href="/dashboard/pedidos"
              className="text-xs text-[#00c9a7] hover:underline font-medium">
              Ver todos →
            </Link>
          </div>

          {cargando ? (
            <p className="text-sm text-gray-400">Cargando...</p>
          ) : pedidosRecientes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center text-gray-400">
              <div className="text-3xl mb-2">📭</div>
              <p className="text-sm">Aún no hay pedidos registrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-2 text-xs font-medium text-gray-400">#</th>
                    <th className="text-left py-2 px-2 text-xs font-medium text-gray-400">CLIENTE</th>
                    <th className="text-left py-2 px-2 text-xs font-medium text-gray-400">PRODUCTO</th>
                    <th className="text-left py-2 px-2 text-xs font-medium text-gray-400">TOTAL</th>
                    <th className="text-left py-2 px-2 text-xs font-medium text-gray-400">ESTADO</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidosRecientes.map((p) => (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-2 text-gray-400 font-mono text-xs">
                        #{String(p.numero_pedido).padStart(3, '0')}
                      </td>
                      <td className="py-3 px-2 font-medium text-gray-700">
                        {Array.isArray(p.clientes) ? p.clientes[0]?.nombre : p.clientes?.nombre}
                      </td>
                      <td className="py-3 px-2 text-gray-500">
                        {p.pedido_items?.[0]?.nombre_manual || '—'}
                      </td>
                      <td className="py-3 px-2 font-semibold text-gray-800">
                        {formatPesos(p.total)}
                      </td>
                      <td className="py-3 px-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorEstado(p.estado)}`}>
                          {p.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Accesos rápidos */}
      <div>
        <h2 className="font-semibold text-gray-800 mb-4">Accesos rápidos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { nombre: 'Nuevo pedido',  href: '/dashboard/pedidos/nuevo',      icono: '➕', color: 'bg-blue-50 text-blue-700'    },
            { nombre: 'Inventario',    href: '/dashboard/inventario',          icono: '📦', color: 'bg-orange-50 text-orange-700' },
            { nombre: 'Recetas',       href: '/dashboard/inventario/recetas',  icono: '🍳', color: 'bg-green-50 text-green-700'  },
            { nombre: 'Clientes',      href: '/dashboard/clientes',            icono: '👥', color: 'bg-purple-50 text-purple-700' },
            { nombre: 'Finanzas',      href: '/dashboard/finanzas',            icono: '💰', color: 'bg-teal-50 text-teal-700'    },
            { nombre: 'Configuración', href: '/dashboard/configuracion',       icono: '⚙️', color: 'bg-gray-50 text-gray-700'    },
          ].map((acceso) => (
            <Link key={acceso.nombre} href={acceso.href}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border border-gray-100 hover:shadow-md transition-shadow text-center ${acceso.color}`}>
              <span className="text-2xl mb-2">{acceso.icono}</span>
              <span className="text-xs font-medium">{acceso.nombre}</span>
            </Link>
          ))}
        </div>
      </div>

    </div>
  )
}
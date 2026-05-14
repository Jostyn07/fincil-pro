import Link from 'next/link'

export default function Dashboard() {

  // Por ahora datos estáticos — después los conectamos a Supabase
  const kpis = [
    {
      titulo: 'Ingresos del mes',
      valor: '$0',
      cambio: 'Sin datos aún',
      icono: '💰',
      color: 'bg-blue-50',
      colorTexto: 'text-blue-600',
    },
    {
      titulo: 'Gastos del mes',
      valor: '$0',
      cambio: 'Sin datos aún',
      icono: '📤',
      color: 'bg-red-50',
      colorTexto: 'text-red-600',
    },
    {
      titulo: 'Utilidad neta',
      valor: '$0',
      cambio: 'Sin datos aún',
      icono: '📊',
      color: 'bg-green-50',
      colorTexto: 'text-green-600',
    },
    {
      titulo: 'Pedidos activos',
      valor: '0',
      cambio: 'Sin pedidos aún',
      icono: '📋',
      color: 'bg-orange-50',
      colorTexto: 'text-orange-600',
    },
  ]

  const pedidosRecientes = [
    { numero: 1, cliente: 'María García',  producto: 'Torta de chocolate', entrega: '16/05/2026', estado: 'En producción' },
    { numero: 2, cliente: 'Carlos López',  producto: 'Cupcake vainilla',   entrega: '15/05/2026', estado: 'Listo' },
    { numero: 3, cliente: 'Ana Martínez',  producto: 'Torta de chocolate', entrega: '14/05/2026', estado: 'En camino' },
  ]

  // Color según estado del pedido
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

  return (
    <div>

      {/* ── ENCABEZADO ── */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">
          Buenos días 👋
        </h1>
        <p className="text-gray-500 mt-1">
          Aquí tienes el resumen de tu negocio
        </p>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi) => (
          <div
            key={kpi.titulo}
            className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
          >
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${kpi.color} text-xl mb-3`}>
              {kpi.icono}
            </div>
            <div className={`text-2xl font-bold ${kpi.colorTexto} mb-1`}>
              {kpi.valor}
            </div>
            <div className="text-sm font-medium text-gray-700">
              {kpi.titulo}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {kpi.cambio}
            </div>
          </div>
        ))}
      </div>

      {/* ── FILA: ALERTAS + PEDIDOS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

        {/* Alertas de inventario */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-4">
            📦 Estado del inventario
          </h2>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-sm font-medium text-green-600">
              Todo en orden
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Sin alertas de stock
            </p>
          </div>
        </div>

        {/* Pedidos recientes */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">
              📋 Pedidos recientes
            </h2>
            <Link href="/dashboard/pedidos" className="text-xs text-[#00c9a7] hover:underline font-medium">
              Ver todos →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-400">#</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-400">CLIENTE</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-400">PRODUCTO</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-400">ENTREGA</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-400">ESTADO</th>
                </tr>
              </thead>
              <tbody>
                {pedidosRecientes.map((pedido) => (
                  <tr
                    key={pedido.numero}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-2 text-gray-400">#{pedido.numero}</td>
                    <td className="py-3 px-2 font-medium text-gray-700">{pedido.cliente}</td>
                    <td className="py-3 px-2 text-gray-500">{pedido.producto}</td>
                    <td className="py-3 px-2 text-gray-500">{pedido.entrega}</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorEstado(pedido.estado)}`}>
                        {pedido.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>

      {/* ── NAVEGACIÓN RÁPIDA ── */}
      <div>
        <h2 className="font-semibold text-gray-800 mb-4">
          Accesos rápidos
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { nombre: 'Nuevo pedido',  href: '/dashboard/nuevo',  icono: '➕', color: 'bg-blue-50 text-blue-700'   },
            { nombre: 'Inventario',    href: '/dashboard/inventario',      icono: '📦', color: 'bg-orange-50 text-orange-700' },
            { nombre: 'Recetas',       href: '/dashboard/recetas',         icono: '🍳', color: 'bg-green-50 text-green-700'  },
            { nombre: 'Clientes',      href: '/dashboard/clientes',        icono: '👥', color: 'bg-purple-50 text-purple-700' },
            { nombre: 'Finanzas',      href: '/dashboard/finanzas',        icono: '💰', color: 'bg-teal-50 text-teal-700'   },
            { nombre: 'Configuración', href: '/dashboard/configuracion',   icono: '⚙️', color: 'bg-gray-50 text-gray-700'   },
          ].map((acceso) => (
            <Link
              key={acceso.nombre}
              href={acceso.href}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border border-gray-100 hover:shadow-md transition-shadow text-center ${acceso.color}`}
            >
              <span className="text-2xl mb-2">{acceso.icono}</span>
              <span className="text-xs font-medium">{acceso.nombre}</span>
            </Link>
          ))}
        </div>
      </div>

    </div>
  )
}
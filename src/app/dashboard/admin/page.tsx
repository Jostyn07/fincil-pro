'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/app/lib/supabase'

const ADMIN_EMAIL = 'jostynag12@gmail.com'

type Usuario = {
  id: string
  nombre_negocio: string
  ciudad: string
  created_at: string
  cantidadPedidos: number
  cantidadIngresos: number
  activo: boolean
}

type RegistroDia = {
  dia: string
  total: number
}

type EventoReciente = {
  id: string
  nombre_negocio: string
  ciudad: string
  created_at: string
}

type TooltipState = {
  x: number
  y: number
  dia: string
  total: number
} | null

function formatFecha(fechaStr: string): string {
  const ahora = new Date()
  const fecha = new Date(fechaStr)
  const diffMs = ahora.getTime() - fecha.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHoras = Math.floor(diffMin / 60)
  const diffDias = Math.floor(diffHoras / 24)

  if (diffMin < 1) return 'hace un momento'
  if (diffMin < 60) return `hace ${diffMin} minuto${diffMin !== 1 ? 's' : ''}`
  if (diffHoras < 24) return `hace ${diffHoras} hora${diffHoras !== 1 ? 's' : ''}`
  return `hace ${diffDias} día${diffDias !== 1 ? 's' : ''}`
}

function GraficaRegistros({ datos }: { datos: RegistroDia[] }) {
  const [tooltip, setTooltip] = useState<TooltipState>(null)

  if (datos.length === 0) {
    return <p className="text-sm text-gray-400">Sin datos disponibles</p>
  }

  const ANCHO = 700
  const ALTO = 220
  const PAD_IZQ = 40
  const PAD_ABAJO = 40
  const PAD_ARRIBA = 16
  const PAD_DER = 20
  const anchGrafica = ANCHO - PAD_IZQ - PAD_DER
  const altGrafica = ALTO - PAD_ABAJO - PAD_ARRIBA
  const maxVal = Math.max(...datos.map(d => d.total), 1)
  const paso = anchGrafica / datos.length
  const anchBarra = Math.max(4, paso - 3)

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        className="w-full"
        style={{ minWidth: 480 }}
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Y axis guides */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = PAD_ARRIBA + altGrafica * (1 - pct)
          return (
            <g key={pct}>
              <line x1={PAD_IZQ} x2={ANCHO - PAD_DER} y1={y} y2={y} stroke="#f0f0f0" strokeWidth={1} />
              <text x={PAD_IZQ - 6} y={y + 4} textAnchor="end" fontSize={10} fill="#9ca3af">
                {Math.round(maxVal * pct)}
              </text>
            </g>
          )
        })}

        {/* Bars */}
        {datos.map((d, i) => {
          const altBarra = Math.max(0, (d.total / maxVal) * altGrafica)
          const x = PAD_IZQ + i * paso + (paso - anchBarra) / 2
          const y = PAD_ARRIBA + altGrafica - altBarra
          return (
            <rect
              key={d.dia}
              x={x}
              y={y}
              width={anchBarra}
              height={altBarra}
              fill="#00c9a7"
              rx={2}
              className="cursor-pointer hover:opacity-70 transition-opacity"
              onMouseEnter={(e) => {
                const svgEl = e.currentTarget.ownerSVGElement as SVGSVGElement
                const rect = svgEl.getBoundingClientRect()
                setTooltip({
                  x: ((e.clientX - rect.left) / rect.width) * ANCHO,
                  y: ((e.clientY - rect.top) / rect.height) * ALTO,
                  dia: d.dia,
                  total: d.total,
                })
              }}
            />
          )
        })}

        {/* X axis labels every 5 days */}
        {datos.map((d, i) => {
          if (i % 5 !== 0) return null
          const x = PAD_IZQ + i * paso + paso / 2
          const fecha = new Date(d.dia + 'T12:00:00')
          return (
            <text key={d.dia} x={x} y={ALTO - 8} textAnchor="middle" fontSize={9} fill="#9ca3af">
              {fecha.getDate()}/{fecha.getMonth() + 1}
            </text>
          )
        })}

        {/* Inline tooltip */}
        {tooltip && (
          <g>
            <rect x={tooltip.x + 8} y={tooltip.y - 40} width={108} height={38} rx={4} fill="#1f2937" opacity={0.9} />
            <text x={tooltip.x + 16} y={tooltip.y - 24} fontSize={10} fill="#d1fae5">{tooltip.dia}</text>
            <text x={tooltip.x + 16} y={tooltip.y - 9} fontSize={11} fontWeight="bold" fill="white">
              {tooltip.total} registro{tooltip.total !== 1 ? 's' : ''}
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}

export default function AdminPanel() {
  const router = useRouter()

  const [cargando, setCargando] = useState(true)
  const [totalUsuarios, setTotalUsuarios] = useState(0)
  const [usuariosActivosMes, setUsuariosActivosMes] = useState(0)
  const [registrosHoy, setRegistrosHoy] = useState(0)
  const [registrosPorDia, setRegistrosPorDia] = useState<RegistroDia[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [eventosRecientes, setEventosRecientes] = useState<EventoReciente[]>([])

  useEffect(() => {
    async function cargar() {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user || userData.user.email !== ADMIN_EMAIL) {
        router.push('/dashboard')
        return
      }

      const ahora = new Date()
      const hace30Dias = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000)
      const hace7Dias = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000)
      const hoyISO = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).toISOString()
      const hace30ISO = hace30Dias.toISOString().split('T')[0]
      const hace7ISO = hace7Dias.toISOString().split('T')[0]

      const { data: todosUsuarios } = await supabase
        .from('usuarios')
        .select('id, nombre_negocio, ciudad, created_at')
        .order('created_at', { ascending: false })

      if (!todosUsuarios) {
        setCargando(false)
        return
      }

      setTotalUsuarios(todosUsuarios.length)
      setRegistrosHoy(todosUsuarios.filter(u => (u.created_at ?? '') >= hoyISO).length)

      const [
        { data: pedidosTodos },
        { data: ingresosTodos },
        { data: pedidosMes },
        { data: ingresosMes },
        { data: pedidos7 },
      ] = await Promise.all([
        supabase.from('pedidos').select('usuario_id'),
        supabase.from('ingresos').select('usuario_id'),
        supabase.from('pedidos').select('usuario_id').gte('fecha_creacion', hace30ISO),
        supabase.from('ingresos').select('usuario_id').gte('fecha', hace30ISO),
        supabase.from('pedidos').select('usuario_id').gte('fecha_creacion', hace7ISO),
      ])

      const activosMesIds = new Set([
        ...(pedidosMes?.map(p => p.usuario_id) ?? []),
        ...(ingresosMes?.map(i => i.usuario_id) ?? []),
      ])
      setUsuariosActivosMes(activosMesIds.size)

      const activos7Ids = new Set(pedidos7?.map(p => p.usuario_id) ?? [])

      const pedidosCount: Record<string, number> = {}
      pedidosTodos?.forEach(p => {
        pedidosCount[p.usuario_id] = (pedidosCount[p.usuario_id] ?? 0) + 1
      })

      const ingresosCount: Record<string, number> = {}
      ingresosTodos?.forEach(i => {
        ingresosCount[i.usuario_id] = (ingresosCount[i.usuario_id] ?? 0) + 1
      })

      setUsuarios(
        todosUsuarios.map(u => ({
          id: u.id,
          nombre_negocio: u.nombre_negocio ?? '',
          ciudad: u.ciudad ?? '',
          created_at: u.created_at,
          cantidadPedidos: pedidosCount[u.id] ?? 0,
          cantidadIngresos: ingresosCount[u.id] ?? 0,
          activo: activos7Ids.has(u.id),
        }))
      )

      // Chart: fill last 30 days with zeros then count registrations
      const diasMap: Record<string, number> = {}
      for (let i = 29; i >= 0; i--) {
        const d = new Date(ahora)
        d.setDate(ahora.getDate() - i)
        diasMap[d.toISOString().split('T')[0]] = 0
      }
      todosUsuarios.forEach(u => {
        const dia = (u.created_at ?? '').split('T')[0]
        if (dia in diasMap) diasMap[dia]++
      })
      setRegistrosPorDia(Object.entries(diasMap).map(([dia, total]) => ({ dia, total })))

      setEventosRecientes(
        todosUsuarios.slice(0, 10).map(u => ({
          id: u.id,
          nombre_negocio: u.nombre_negocio ?? '',
          ciudad: u.ciudad ?? '',
          created_at: u.created_at,
        }))
      )

      setCargando(false)
    }

    cargar()
  }, [router])

  const usuariosFiltrados = usuarios.filter(u => {
    const q = busqueda.toLowerCase()
    return (
      u.nombre_negocio.toLowerCase().includes(q) ||
      u.ciudad.toLowerCase().includes(q)
    )
  })

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-gray-400 text-sm">Verificando acceso...</div>
      </div>
    )
  }

  return (
    <div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-gray-800">🔐 Panel Admin</h1>
          <span className="bg-[#0f1e35] text-[#00c9a7] text-xs font-semibold px-3 py-1 rounded-full tracking-wide">
            Solo tú puedes ver esto
          </span>
        </div>
        <p className="text-gray-500 mt-1 text-sm">Vista general de todos los usuarios de Fincil Pro</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 text-xl mb-3">👥</div>
          <div className="text-2xl font-bold text-blue-600 mb-1">{totalUsuarios}</div>
          <div className="text-sm font-medium text-gray-700">Total usuarios registrados</div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-green-50 text-xl mb-3">📈</div>
          <div className="text-2xl font-bold text-green-600 mb-1">{usuariosActivosMes}</div>
          <div className="text-sm font-medium text-gray-700">Activos este mes</div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-purple-50 text-xl mb-3">🆕</div>
          <div className="text-2xl font-bold text-purple-600 mb-1">{registrosHoy}</div>
          <div className="text-sm font-medium text-gray-700">Registros hoy</div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-teal-50 text-xl mb-3">💰</div>
          <div className="text-2xl font-bold text-[#00c9a7] mb-1">$0</div>
          <div className="text-sm font-medium text-gray-700">Ingresos plataforma</div>
          <div className="text-xs text-gray-400 mt-0.5">Integración Wompi pendiente</div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-8">
        <h2 className="font-semibold text-gray-800 mb-4">📅 Registros por día — últimos 30 días</h2>
        <GraficaRegistros datos={registrosPorDia} />
      </div>

      {/* Users table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="font-semibold text-gray-800">👥 Todos los usuarios</h2>
            <p className="text-xs text-gray-400 mt-0.5">{totalUsuarios} registrados · ordenados por más recientes</p>
          </div>
          <input
            type="text"
            placeholder="Buscar por negocio o ciudad..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7] w-full sm:w-64"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">ID</th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">NEGOCIO</th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">CIUDAD</th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">REGISTRO</th>
                <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500">PEDIDOS</th>
                <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500">INGRESOS</th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">ESTADO</th>
              </tr>
            </thead>
            <tbody>
              {usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <div className="text-3xl mb-2">🔍</div>
                    {busqueda ? `Sin resultados para "${busqueda}"` : 'Sin usuarios registrados'}
                  </td>
                </tr>
              ) : (
                usuariosFiltrados.map((u) => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-3 text-gray-400 text-xs font-mono">{u.id.slice(0, 8)}…</td>
                    <td className="py-3 px-3 font-medium text-gray-800">{u.nombre_negocio || '—'}</td>
                    <td className="py-3 px-3 text-gray-500">{u.ciudad || '—'}</td>
                    <td className="py-3 px-3 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(u.created_at).toLocaleDateString('es-CO')}
                    </td>
                    <td className="py-3 px-3 text-center font-medium text-gray-700">{u.cantidadPedidos}</td>
                    <td className="py-3 px-3 text-center font-medium text-gray-700">{u.cantidadIngresos}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        u.activo
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent activity */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h2 className="font-semibold text-gray-800 mb-4">🕐 Actividad reciente</h2>
        {eventosRecientes.length === 0 ? (
          <p className="text-sm text-gray-400">Sin actividad reciente</p>
        ) : (
          <div className="space-y-1">
            {eventosRecientes.map((e) => (
              <div key={e.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                <div className="w-8 h-8 rounded-full bg-[#00c9a7]/10 flex items-center justify-center text-sm flex-shrink-0">
                  👤
                </div>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Nuevo usuario:</span>{' '}
                  {e.nombre_negocio || 'Sin nombre'}{' '}—{' '}
                  {e.ciudad || 'Sin ciudad'}{' '}—{' '}
                  <span className="text-gray-400">{formatFecha(e.created_at)}</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

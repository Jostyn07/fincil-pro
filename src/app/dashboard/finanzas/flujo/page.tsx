'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/src/app/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

type Cuenta = {
  id: string
  nombre: string
  tipo: string
  saldo: number
}

type PedidoPorCobrar = {
  id: string
  numero_pedido: number
  total: number
  fecha_entrega: string
  clientes: { nombre: string } | { nombre: string }[] | null
  pedido_items: { nombre_manual: string }[]
}

type CuentaPorCobrar = {
  id: string
  descripcion: string
  cliente: string
  valor: number
  cobrado: boolean
}

type CuentaPorPagar = {
  id: string
  descripcion: string
  proveedor: string
  valor: number
  pagado: boolean
  fecha_vencimiento: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPesos(valor: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(valor)
}

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]'

// ─── Component ────────────────────────────────────────────────────────────────

export default function FlujoCaja() {
  const [pestana, setPestana] = useState<'saldos' | 'cobrar' | 'pagar' | 'resumen'>('saldos')
  const [usuarioId, setUsuarioId] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)

  // ── Saldos ──
  const [cuentas, setCuentas] = useState<Cuenta[]>([])
  const [mostrarFormCuenta, setMostrarFormCuenta] = useState(false)
  const [cNombre, setCNombre] = useState('')
  const [cTipo, setCTipo] = useState('efectivo')
  const [cSaldo, setCSaldo] = useState(0)
  const [saldosEditados, setSaldosEditados] = useState<Record<string, number>>({})
  const [guardandoCuenta, setGuardandoCuenta] = useState(false)

  // ── Por cobrar ──
  const [pedidosPorCobrar, setPedidosPorCobrar] = useState<PedidoPorCobrar[]>([])
  const [cuentasPorCobrar, setCuentasPorCobrar] = useState<CuentaPorCobrar[]>([])
  const [mostrarFormCobrar, setMostrarFormCobrar] = useState(false)
  const [coDescripcion, setCoDescripcion] = useState('')
  const [coCliente, setCoCliente] = useState('')
  const [coValor, setCoValor] = useState(0)
  const [guardandoCobrar, setGuardandoCobrar] = useState(false)

  // ── Por pagar ──
  const [cuentasPorPagar, setCuentasPorPagar] = useState<CuentaPorPagar[]>([])
  const [mostrarFormPagar, setMostrarFormPagar] = useState(false)
  const [paDescripcion, setPaDescripcion] = useState('')
  const [paProveedor, setPaProveedor] = useState('')
  const [paValor, setPaValor] = useState(0)
  const [paFechaVencimiento, setPaFechaVencimiento] = useState('')
  const [guardandoPagar, setGuardandoPagar] = useState(false)

  // ─── Load ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function inicializar() {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return
      setUsuarioId(userData.user.id)
      await cargarTodo()
    }
    inicializar()
  }, [])

  async function cargarTodo() {
    setCargando(true)
    const [
      { data: ctasData },
      { data: pedidosData },
      { data: cobrarData },
      { data: pagarData },
    ] = await Promise.all([
      supabase.from('cuentas').select('id, nombre, tipo, saldo').order('nombre'),
      supabase.from('pedidos')
        .select('id, numero_pedido, total, fecha_entrega, clientes(nombre), pedido_items(nombre_manual)')
        .eq('estado', 'Entregado')
        .eq('estado_pago', 'Pendiente'),
      supabase.from('cuentas_por_cobrar').select('*').eq('cobrado', false).order('fecha_creacion', { ascending: false }),
      supabase.from('cuentas_por_pagar').select('*').eq('pagado', false).order('fecha_vencimiento'),
    ])
    if (ctasData) setCuentas(ctasData as Cuenta[])
    if (pedidosData) setPedidosPorCobrar(pedidosData as unknown as PedidoPorCobrar[])
    if (cobrarData) setCuentasPorCobrar(cobrarData as CuentaPorCobrar[])
    if (pagarData) setCuentasPorPagar(pagarData as CuentaPorPagar[])
    setCargando(false)
  }

  // ─── Saldos ───────────────────────────────────────────────────────────────

  async function agregarCuenta() {
    if (!usuarioId || !cNombre.trim()) return
    setGuardandoCuenta(true)
    await supabase.from('cuentas').insert({
      usuario_id: usuarioId,
      nombre: cNombre.trim(),
      tipo: cTipo,
      saldo: cSaldo,
    })
    setCNombre(''); setCTipo('efectivo'); setCSaldo(0)
    setMostrarFormCuenta(false)
    setGuardandoCuenta(false)
    await cargarTodo()
  }

  async function guardarSaldo(id: string) {
    const nuevoSaldo = saldosEditados[id]
    if (nuevoSaldo === undefined) return
    await supabase.from('cuentas').update({ saldo: nuevoSaldo }).eq('id', id)
    setSaldosEditados(prev => { const next = { ...prev }; delete next[id]; return next })
    await cargarTodo()
  }

  async function eliminarCuenta(id: string) {
    if (!confirm('¿Eliminar esta cuenta?')) return
    await supabase.from('cuentas').delete().eq('id', id)
    await cargarTodo()
  }

  // ─── Por cobrar ───────────────────────────────────────────────────────────

  async function marcarPedidoCobrado(pedido: PedidoPorCobrar) {
    await Promise.all([
      supabase.from('pedidos').update({ estado_pago: 'Cobrado' }).eq('id', pedido.id),
      supabase.from('ingresos').update({ confirmado: true }).eq('pedido_id', pedido.id),
    ])
    await cargarTodo()
  }

  async function agregarCuentaCobrar() {
    if (!usuarioId || coValor <= 0) return
    setGuardandoCobrar(true)
    await supabase.from('cuentas_por_cobrar').insert({
      usuario_id: usuarioId,
      descripcion: coDescripcion,
      cliente: coCliente,
      valor: coValor,
      cobrado: false,
    })
    setCoDescripcion(''); setCoCliente(''); setCoValor(0)
    setMostrarFormCobrar(false)
    setGuardandoCobrar(false)
    await cargarTodo()
  }

  async function marcarCobrada(cuenta: CuentaPorCobrar) {
    if (!usuarioId) return
    await Promise.all([
      supabase.from('cuentas_por_cobrar').update({ cobrado: true }).eq('id', cuenta.id),
      supabase.from('ingresos').insert({
        usuario_id: usuarioId,
        fecha: new Date().toISOString().split('T')[0],
        categoria: 'Otros ingresos',
        descripcion: cuenta.descripcion,
        cliente: cuenta.cliente,
        cantidad: 1,
        precio_unitario: cuenta.valor,
        total: cuenta.valor,
        confirmado: true,
        pedido_id: null,
      }),
    ])
    await cargarTodo()
  }

  // ─── Por pagar ────────────────────────────────────────────────────────────

  async function agregarCuentaPagar() {
    if (!usuarioId || paValor <= 0) return
    setGuardandoPagar(true)
    await supabase.from('cuentas_por_pagar').insert({
      usuario_id: usuarioId,
      descripcion: paDescripcion,
      proveedor: paProveedor,
      valor: paValor,
      pagado: false,
      fecha_vencimiento: paFechaVencimiento || null,
    })
    setPaDescripcion(''); setPaProveedor(''); setPaValor(0); setPaFechaVencimiento('')
    setMostrarFormPagar(false)
    setGuardandoPagar(false)
    await cargarTodo()
  }

  async function marcarPagada(id: string) {
    await supabase.from('cuentas_por_pagar').update({ pagado: true }).eq('id', id)
    await cargarTodo()
  }

  async function eliminarCuentaPagar(id: string) {
    if (!confirm('¿Eliminar esta cuenta por pagar?')) return
    await supabase.from('cuentas_por_pagar').delete().eq('id', id)
    await cargarTodo()
  }

  // ─── Computed ─────────────────────────────────────────────────────────────

  const totalDisponible = cuentas.reduce((sum, c) => sum + c.saldo, 0)
  const totalPorCobrarPedidos = pedidosPorCobrar.reduce((sum, p) => sum + p.total, 0)
  const totalPorCobrarManual = cuentasPorCobrar.reduce((sum, c) => sum + c.valor, 0)
  const totalPorCobrar = totalPorCobrarPedidos + totalPorCobrarManual
  const totalPorPagar = cuentasPorPagar.reduce((sum, c) => sum + c.valor, 0)
  const saldoProyectado = totalDisponible + totalPorCobrar - totalPorPagar

  const hoy = new Date().toISOString().split('T')[0]
  const proximosVencimientos = [...cuentasPorPagar]
    .sort((a, b) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento))
    .slice(0, 5)

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">💸 Flujo de caja</h1>
        <p className="text-gray-500 text-sm mt-1">Control de saldos, cuentas por cobrar y por pagar</p>
      </div>

      {/* Pestañas */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {([
          { key: 'saldos',  label: '🏦 Saldos' },
          { key: 'cobrar',  label: '📥 Por cobrar' },
          { key: 'pagar',   label: '📤 Por pagar' },
          { key: 'resumen', label: '📊 Resumen' },
        ] as const).map((tab) => (
          <button key={tab.key} onClick={() => setPestana(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              pestana === tab.key
                ? 'bg-[#0f1e35] text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── SALDOS ──────────────────────────────────────────────────────── */}
      {pestana === 'saldos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total disponible</p>
              <p className="text-2xl font-bold text-[#0f1e35]">{formatPesos(totalDisponible)}</p>
            </div>
            <button onClick={() => setMostrarFormCuenta(true)}
              className="bg-[#0f1e35] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#162740] transition-colors">
              ➕ Nueva cuenta
            </button>
          </div>

          {mostrarFormCuenta && (
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-800 mb-4">Nueva cuenta</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                  <input type="text" value={cNombre} onChange={e => setCNombre(e.target.value)}
                    placeholder="Ej: Caja principal"
                    className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select value={cTipo} onChange={e => setCTipo(e.target.value)}
                    className={inputCls + ' bg-white'}>
                    <option value="efectivo">Efectivo</option>
                    <option value="nequi">Nequi</option>
                    <option value="daviplata">Daviplata</option>
                    <option value="banco">Banco</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Saldo inicial (COP)</label>
                  <input type="number" min={0} value={cSaldo || ''} placeholder="0"
                    onChange={e => setCSaldo(Number(e.target.value))}
                    className={inputCls} />
                </div>
              </div>
              <div className="flex gap-3 mt-4 justify-end">
                <button onClick={() => { setCNombre(''); setCTipo('efectivo'); setCSaldo(0); setMostrarFormCuenta(false) }}
                  className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
                  Cancelar
                </button>
                <button onClick={agregarCuenta} disabled={guardandoCuenta || !cNombre.trim()}
                  className="bg-[#00c9a7] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#00b396] disabled:opacity-50">
                  {guardandoCuenta ? 'Guardando...' : 'Guardar cuenta'}
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">CUENTA</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">TIPO</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">SALDO</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 text-right">ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {cargando ? (
                    <tr><td colSpan={4} className="py-12 text-center text-gray-400">Cargando...</td></tr>
                  ) : cuentas.length === 0 ? (
                    <tr><td colSpan={4} className="py-12 text-center text-gray-400">
                      <div className="text-3xl mb-2">🏦</div>
                      <p>No hay cuentas registradas</p>
                      <p className="text-xs mt-1">Agrega una cuenta para empezar a controlar tu flujo</p>
                    </td></tr>
                  ) : cuentas.map(cuenta => {
                    const editando = saldosEditados[cuenta.id] !== undefined
                    return (
                      <tr key={cuenta.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 font-medium text-gray-800">{cuenta.nombre}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 capitalize">
                            {cuenta.tipo}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {editando ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={saldosEditados[cuenta.id] || ''}
                                placeholder="0"
                                onChange={e => setSaldosEditados(prev => ({ ...prev, [cuenta.id]: Number(e.target.value) }))}
                                className="w-36 border border-[#00c9a7] rounded-lg px-2 py-1 text-sm focus:outline-none"
                              />
                              <button onClick={() => guardarSaldo(cuenta.id)}
                                className="text-xs bg-[#00c9a7] text-white px-3 py-1 rounded-lg hover:bg-[#00b396]">
                                Guardar
                              </button>
                              <button onClick={() => setSaldosEditados(prev => { const next = { ...prev }; delete next[cuenta.id]; return next })}
                                className="text-xs text-gray-400 hover:text-gray-600">
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setSaldosEditados(prev => ({ ...prev, [cuenta.id]: cuenta.saldo }))}
                              className="font-semibold text-teal-600 hover:underline text-left">
                              {formatPesos(cuenta.saldo)}
                            </button>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button onClick={() => eliminarCuenta(cuenta.id)}
                            className="text-xs text-red-400 hover:text-red-600">
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                {cuentas.length > 0 && (
                  <tfoot className="bg-gray-50 border-t border-gray-100">
                    <tr>
                      <td colSpan={2} className="py-3 px-4 text-sm font-semibold text-gray-700">Total disponible</td>
                      <td colSpan={2} className="py-3 px-4 text-sm font-bold text-teal-600">{formatPesos(totalDisponible)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── POR COBRAR ──────────────────────────────────────────────────── */}
      {pestana === 'cobrar' && (
        <div className="space-y-6">

          {/* Sección A — Pedidos automáticos */}
          <div>
            <h2 className="font-semibold text-gray-800 mb-3">📋 Pedidos entregados pendientes de cobro</h2>
            {cargando ? (
              <p className="text-sm text-gray-400">Cargando...</p>
            ) : pedidosPorCobrar.length === 0 ? (
              <div className="bg-green-50 border border-green-100 rounded-xl p-5 text-center">
                <div className="text-3xl mb-2">✅</div>
                <p className="text-sm font-medium text-green-700">Sin pedidos pendientes de cobro</p>
              </div>
            ) : (
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
                        <th className="py-3 px-4"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {pedidosPorCobrar.map(p => {
                        const nombreCliente = Array.isArray(p.clientes) ? p.clientes[0]?.nombre : p.clientes?.nombre
                        return (
                          <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-4 text-gray-400 font-mono text-xs">
                              #{String(p.numero_pedido).padStart(3, '0')}
                            </td>
                            <td className="py-3 px-4 font-medium text-gray-800">{nombreCliente || '—'}</td>
                            <td className="py-3 px-4 text-gray-600">{p.pedido_items?.[0]?.nombre_manual || '—'}</td>
                            <td className="py-3 px-4 font-semibold text-blue-600">{formatPesos(p.total)}</td>
                            <td className="py-3 px-4 text-gray-500 text-xs">
                              {p.fecha_entrega
                                ? new Date(p.fecha_entrega + 'T00:00:00').toLocaleDateString('es-CO')
                                : '—'}
                            </td>
                            <td className="py-3 px-4">
                              <button onClick={() => marcarPedidoCobrado(p)}
                                className="text-xs bg-[#00c9a7] text-white px-3 py-1 rounded-lg hover:bg-[#00b396] transition-colors">
                                Marcar cobrado
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Sección B — Manual */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-800">📝 Cuentas por cobrar (manual)</h2>
              <button onClick={() => setMostrarFormCobrar(true)}
                className="bg-[#0f1e35] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#162740] transition-colors">
                ➕ Agregar
              </button>
            </div>

            {mostrarFormCobrar && (
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-4">
                <h3 className="font-semibold text-gray-800 mb-4">Nueva cuenta por cobrar</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                    <input type="text" value={coDescripcion} onChange={e => setCoDescripcion(e.target.value)}
                      placeholder="Ej: Saldo pendiente torta"
                      className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                    <input type="text" value={coCliente} onChange={e => setCoCliente(e.target.value)}
                      placeholder="Nombre del cliente"
                      className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Valor (COP) *</label>
                    <input type="number" min={0} value={coValor || ''} placeholder="0"
                      onChange={e => setCoValor(Number(e.target.value))}
                      className={inputCls} />
                  </div>
                </div>
                <div className="flex gap-3 mt-4 justify-end">
                  <button onClick={() => { setCoDescripcion(''); setCoCliente(''); setCoValor(0); setMostrarFormCobrar(false) }}
                    className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
                    Cancelar
                  </button>
                  <button onClick={agregarCuentaCobrar} disabled={guardandoCobrar || coValor <= 0}
                    className="bg-[#00c9a7] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#00b396] disabled:opacity-50">
                    {guardandoCobrar ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            )}

            {cargando ? (
              <p className="text-sm text-gray-400">Cargando...</p>
            ) : cuentasPorCobrar.length === 0 ? (
              <div className="bg-gray-50 rounded-xl p-5 text-center text-gray-400">
                <div className="text-3xl mb-2">📭</div>
                <p className="text-sm">Sin cuentas por cobrar registradas</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">DESCRIPCIÓN</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">CLIENTE</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">VALOR</th>
                        <th className="py-3 px-4"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cuentasPorCobrar.map(c => (
                        <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 text-gray-700">{c.descripcion || '—'}</td>
                          <td className="py-3 px-4 text-gray-600">{c.cliente || '—'}</td>
                          <td className="py-3 px-4 font-semibold text-blue-600">{formatPesos(c.valor)}</td>
                          <td className="py-3 px-4">
                            <button onClick={() => marcarCobrada(c)}
                              className="text-xs bg-[#00c9a7] text-white px-3 py-1 rounded-lg hover:bg-[#00b396] transition-colors">
                              Marcar cobrado
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── POR PAGAR ───────────────────────────────────────────────────── */}
      {pestana === 'pagar' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total por pagar</p>
              <p className="text-2xl font-bold text-red-600">{formatPesos(totalPorPagar)}</p>
            </div>
            <button onClick={() => setMostrarFormPagar(true)}
              className="bg-[#0f1e35] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#162740] transition-colors">
              ➕ Agregar
            </button>
          </div>

          {mostrarFormPagar && (
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-800 mb-4">Nueva cuenta por pagar</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <input type="text" value={paDescripcion} onChange={e => setPaDescripcion(e.target.value)}
                    placeholder="Ej: Arriendo local"
                    className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                  <input type="text" value={paProveedor} onChange={e => setPaProveedor(e.target.value)}
                    placeholder="Nombre del proveedor"
                    className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor (COP) *</label>
                  <input type="number" min={0} value={paValor || ''} placeholder="0"
                    onChange={e => setPaValor(Number(e.target.value))}
                    className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de vencimiento</label>
                  <input type="date" value={paFechaVencimiento} onChange={e => setPaFechaVencimiento(e.target.value)}
                    className={inputCls} />
                </div>
              </div>
              <div className="flex gap-3 mt-4 justify-end">
                <button onClick={() => { setPaDescripcion(''); setPaProveedor(''); setPaValor(0); setPaFechaVencimiento(''); setMostrarFormPagar(false) }}
                  className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
                  Cancelar
                </button>
                <button onClick={agregarCuentaPagar} disabled={guardandoPagar || paValor <= 0}
                  className="bg-[#00c9a7] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#00b396] disabled:opacity-50">
                  {guardandoPagar ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          )}

          {cargando ? (
            <p className="text-sm text-gray-400">Cargando...</p>
          ) : cuentasPorPagar.length === 0 ? (
            <div className="bg-green-50 border border-green-100 rounded-xl p-5 text-center">
              <div className="text-3xl mb-2">✅</div>
              <p className="text-sm font-medium text-green-700">Sin cuentas pendientes por pagar</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">DESCRIPCIÓN</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">PROVEEDOR</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">VALOR</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">VENCIMIENTO</th>
                      <th className="py-3 px-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cuentasPorPagar.map(c => {
                      const vencida = c.fecha_vencimiento && c.fecha_vencimiento < hoy
                      return (
                        <tr key={c.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${vencida ? 'bg-red-50/50' : ''}`}>
                          <td className="py-3 px-4 text-gray-700">{c.descripcion || '—'}</td>
                          <td className="py-3 px-4 text-gray-600">{c.proveedor || '—'}</td>
                          <td className="py-3 px-4 font-semibold text-red-600">{formatPesos(c.valor)}</td>
                          <td className="py-3 px-4">
                            {c.fecha_vencimiento ? (
                              <span className={`text-xs font-medium ${vencida ? 'text-red-600' : 'text-gray-600'}`}>
                                {vencida ? '⚠️ ' : ''}
                                {new Date(c.fecha_vencimiento + 'T00:00:00').toLocaleDateString('es-CO')}
                              </span>
                            ) : <span className="text-gray-400 text-xs">—</span>}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2 justify-end">
                              <button onClick={() => marcarPagada(c.id)}
                                className="text-xs bg-[#00c9a7] text-white px-3 py-1 rounded-lg hover:bg-[#00b396] transition-colors">
                                Marcar pagado
                              </button>
                              <button onClick={() => eliminarCuentaPagar(c.id)}
                                className="text-xs text-red-400 hover:text-red-600">
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── RESUMEN ─────────────────────────────────────────────────────── */}
      {pestana === 'resumen' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="text-xs text-gray-400 mb-1">TOTAL DISPONIBLE</div>
              <div className="text-2xl font-bold text-[#0f1e35]">
                {cargando ? '...' : formatPesos(totalDisponible)}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {cuentas.length} cuenta{cuentas.length !== 1 ? 's' : ''}
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="text-xs text-gray-400 mb-1">TOTAL POR COBRAR</div>
              <div className="text-2xl font-bold text-blue-600">
                {cargando ? '...' : formatPesos(totalPorCobrar)}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {pedidosPorCobrar.length} pedido{pedidosPorCobrar.length !== 1 ? 's' : ''} · {cuentasPorCobrar.length} manual{cuentasPorCobrar.length !== 1 ? 'es' : ''}
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="text-xs text-gray-400 mb-1">TOTAL POR PAGAR</div>
              <div className="text-2xl font-bold text-red-600">
                {cargando ? '...' : formatPesos(totalPorPagar)}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {cuentasPorPagar.length} cuenta{cuentasPorPagar.length !== 1 ? 's' : ''}
              </div>
            </div>
            <div className={`rounded-xl p-5 shadow-sm border ${
              saldoProyectado >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'
            }`}>
              <div className="text-xs text-gray-400 mb-1">SALDO PROYECTADO</div>
              <div className={`text-2xl font-bold ${saldoProyectado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {cargando ? '...' : formatPesos(saldoProyectado)}
              </div>
              <div className="text-xs text-gray-400 mt-1">Disponible + cobrar − pagar</div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-4">📅 Próximos vencimientos</h3>
            {cargando ? (
              <p className="text-sm text-gray-400">Cargando...</p>
            ) : proximosVencimientos.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Sin vencimientos próximos</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">DESCRIPCIÓN</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">PROVEEDOR</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">VALOR</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">VENCE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proximosVencimientos.map(c => {
                      const vencida = c.fecha_vencimiento && c.fecha_vencimiento < hoy
                      return (
                        <tr key={c.id} className="border-t border-gray-50">
                          <td className="py-2 px-3 text-gray-700">{c.descripcion || '—'}</td>
                          <td className="py-2 px-3 text-gray-500">{c.proveedor || '—'}</td>
                          <td className="py-2 px-3 font-medium text-red-600">{formatPesos(c.valor)}</td>
                          <td className="py-2 px-3">
                            <span className={`text-xs font-medium ${vencida ? 'text-red-600' : 'text-gray-600'}`}>
                              {vencida ? '⚠️ Vencida — ' : ''}
                              {c.fecha_vencimiento
                                ? new Date(c.fecha_vencimiento + 'T00:00:00').toLocaleDateString('es-CO')
                                : '—'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

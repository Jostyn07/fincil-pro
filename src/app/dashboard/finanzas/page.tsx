'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/src/app/lib/supabase'

type Ingreso = {
  id: string
  fecha: string
  descripcion: string
  categoria: string
  producto: string
  cliente: string
  cantidad: number
  precio_unitario: number
  total: number
  forma_pago: string
  observaciones: string
}

type Gasto = {
  id: string
  fecha: string
  descripcion: string
  categoria: string
  tipo: string
  proveedor: string
  valor: number
  forma_pago: string
  tiene_soporte: boolean
  observaciones: string
}

const categoriasIngreso = [
  'Venta de productos',
  'Venta de servicios',
  'Comisiones',
  'Otros ingresos',
]

const categoriasGasto = [
  'Arriendo',
  'Servicios públicos',
  'Nómina',
  'Materias primas',
  'Publicidad y marketing',
  'Transporte',
  'Equipos y herramientas',
  'Mantenimiento',
  'Impuestos',
  'Otros gastos',
]

function formatPesos(valor: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(valor)
}

export default function Finanzas() {

  const [pestana, setPestana] = useState<'ingresos' | 'gastos' | 'resumen'>('ingresos')
  const [usuarioId, setUsuarioId] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)

  // Datos
  const [ingresos, setIngresos] = useState<Ingreso[]>([])
  const [gastos, setGastos] = useState<Gasto[]>([])

  // Formulario ingreso
  const [mostrarFormIngreso, setMostrarFormIngreso] = useState(false)
  const [iFecha, setIFecha] = useState(new Date().toISOString().split('T')[0])
  const [iDescripcion, setIDescripcion] = useState('')
  const [iCategoria, setICategoria] = useState('Venta de productos')
  const [iProducto, setIProducto] = useState('')
  const [iCliente, setICliente] = useState('')
  const [iCantidad, setICantidad] = useState(1)
  const [iPrecioUnitario, setIPrecioUnitario] = useState(0)
  const [iFormaPago, setIFormaPago] = useState('')
  const [iObservaciones, setIObservaciones] = useState('')
  const [guardandoIngreso, setGuardandoIngreso] = useState(false)

  // Formulario gasto
  const [mostrarFormGasto, setMostrarFormGasto] = useState(false)
  const [gFecha, setGFecha] = useState(new Date().toISOString().split('T')[0])
  const [gDescripcion, setGDescripcion] = useState('')
  const [gCategoria, setGCategoria] = useState('Publicidad y marketing')
  const [gTipo, setGTipo] = useState('Variable')
  const [gProveedor, setGProveedor] = useState('')
  const [gValor, setGValor] = useState(0)
  const [gFormaPago, setGFormaPago] = useState('')
  const [gTieneSoporte, setGTieneSoporte] = useState(false)
  const [gObservaciones, setGObservaciones] = useState('')
  const [guardandoGasto, setGuardandoGasto] = useState(false)

  const iTotal = iCantidad * iPrecioUnitario

  type PedidoSinIngreso = {
    id: string
    numero_pedido: number
    total: number
    metodo_pago: string
    clientes: { nombre: string } | { nombre: string }[] | null
    pedido_items: { nombre_manual: string }[]
    }

    // Y cambia el estado
    const [pedidosSinIngreso, setPedidosSinIngreso] = useState<PedidoSinIngreso[]>([])

    useEffect(() => {
    async function inicializar() {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) return
        setUsuarioId(userData.user.id)

        // Cargar datos inline en lugar de llamar cargarDatos()
        setCargando(true)
        const mesActual = new Date().toISOString().slice(0, 7)
        const [{ data: ing }, { data: gas }] = await Promise.all([
        supabase.from('ingresos').select('*').gte('fecha', `${mesActual}-01`).order('fecha', { ascending: false }),
        supabase.from('gastos').select('*').gte('fecha', `${mesActual}-01`).order('fecha', { ascending: false }),
        ])
        if (ing) setIngresos(ing as Ingreso[])
        if (gas) setGastos(gas as Gasto[])
        setCargando(false)

        const { data: ingresosConPedido } = await supabase
        .from('ingresos').select('pedido_id').not('pedido_id', 'is', null)
        const pedidoIdsConIngreso = ingresosConPedido?.map(i => i.pedido_id) ?? []

        const { data: pedidosEntregados } = await supabase
        .from('pedidos')
        .select(`id, numero_pedido, total, metodo_pago, clientes (nombre), pedido_items (nombre_manual)`)
        .eq('estado', 'Entregado')

        const sinIngreso = pedidosEntregados?.filter(p => !pedidoIdsConIngreso.includes(p.id)) ?? []
        setPedidosSinIngreso(sinIngreso as unknown as PedidoSinIngreso[])
    }
    inicializar()
    }, [])

    async function cargarDatos() {
    setCargando(true)
    const mesActual = new Date().toISOString().slice(0, 7)
    const [{ data: ing }, { data: gas }] = await Promise.all([
        supabase.from('ingresos')
        .select('*')
        .gte('fecha', `${mesActual}-01`)
        .order('fecha', { ascending: false }),
        supabase.from('gastos')
        .select('*')
        .gte('fecha', `${mesActual}-01`)
        .order('fecha', { ascending: false }),
    ])
    if (ing) setIngresos(ing as Ingreso[])
    if (gas) setGastos(gas as Gasto[])
    setCargando(false)

    // Paso 1 — obtener pedido_ids que ya tienen ingreso
    const { data: ingresosConPedido } = await supabase
        .from('ingresos')
        .select('pedido_id')
        .not('pedido_id', 'is', null)

    const pedidoIdsConIngreso = ingresosConPedido?.map(i => i.pedido_id) ?? []

    // Paso 2 — obtener pedidos entregados
    const { data: pedidosEntregados } = await supabase
        .from('pedidos')
        .select(`
        id, numero_pedido, total, metodo_pago,
        clientes (nombre),
        pedido_items (nombre_manual)
        `)
        .eq('estado', 'Entregado')

    // Paso 3 — filtrar los que no tienen ingreso
    const sinIngreso = pedidosEntregados?.filter(
        p => !pedidoIdsConIngreso.includes(p.id)
    ) ?? []

    setPedidosSinIngreso(sinIngreso as unknown as PedidoSinIngreso[])
    }

  function limpiarFormIngreso() {
    setIFecha(new Date().toISOString().split('T')[0])
    setIDescripcion(''); setICategoria('Venta de productos')
    setIProducto(''); setICliente(''); setICantidad(1)
    setIPrecioUnitario(0); setIFormaPago(''); setIObservaciones('')
    setMostrarFormIngreso(false)
  }

  function limpiarFormGasto() {
    setGFecha(new Date().toISOString().split('T')[0])
    setGDescripcion(''); setGCategoria('Publicidad y marketing')
    setGTipo('Variable'); setGProveedor(''); setGValor(0)
    setGFormaPago(''); setGTieneSoporte(false); setGObservaciones('')
    setMostrarFormGasto(false)
  }

  async function guardarIngreso() {
    if (!usuarioId || iPrecioUnitario <= 0) return
    setGuardandoIngreso(true)
    await supabase.from('ingresos').insert({
      usuario_id: usuarioId,
      fecha: iFecha,
      descripcion: iDescripcion,
      categoria: iCategoria,
      producto: iProducto,
      cliente: iCliente,
      cantidad: iCantidad,
      precio_unitario: iPrecioUnitario,
      total: iTotal,
      forma_pago: iFormaPago,
      observaciones: iObservaciones,
    })
    limpiarFormIngreso()
    setGuardandoIngreso(false)
    await cargarDatos()
  }

  async function guardarGasto() {
    if (!usuarioId || gValor <= 0) return
    setGuardandoGasto(true)
    await supabase.from('gastos').insert({
      usuario_id: usuarioId,
      fecha: gFecha,
      descripcion: gDescripcion,
      categoria: gCategoria,
      tipo: gTipo,
      proveedor: gProveedor,
      valor: gValor,
      forma_pago: gFormaPago,
      tiene_soporte: gTieneSoporte,
      observaciones: gObservaciones,
    })
    limpiarFormGasto()
    setGuardandoGasto(false)
    await cargarDatos()
  }

  async function eliminarIngreso(id: string) {
    if (!confirm('¿Eliminar este ingreso?')) return
    await supabase.from('ingresos').delete().eq('id', id)
    await cargarDatos()
  }

  async function eliminarGasto(id: string) {
    if (!confirm('¿Eliminar este gasto?')) return
    await supabase.from('gastos').delete().eq('id', id)
    await cargarDatos()
  }

  // Totales para resumen
  const totalIngresos = ingresos.reduce((sum, i) => sum + i.total, 0)
  const totalGastos = gastos.reduce((sum, g) => sum + g.valor, 0)
  const utilidad = totalIngresos - totalGastos
  const gastosFijos = gastos.filter(g => g.tipo === 'Fijo').reduce((sum, g) => sum + g.valor, 0)
  const gastosVariables = gastos.filter(g => g.tipo === 'Variable').reduce((sum, g) => sum + g.valor, 0)

  const formasPago = ['Efectivo', 'Transferencia', 'Nequi', 'Daviplata', 'Tarjeta', 'Crédito']


  async function registrarIngresosDesdePedido(pedido: PedidoSinIngreso) {
  if (!usuarioId) return
  const nombreCliente = Array.isArray(pedido.clientes)
    ? pedido.clientes[0]?.nombre
    : pedido.clientes?.nombre

  await supabase.from('ingresos').insert({
    usuario_id: usuarioId,
    pedido_id: pedido.id,
    fecha: new Date().toISOString().split('T')[0],
    categoria: 'Venta de productos',
    producto: pedido.pedido_items?.[0]?.nombre_manual ?? '',
    cliente: nombreCliente ?? '',
    cantidad: 1,
    precio_unitario: pedido.total,
    total: pedido.total,
    forma_pago: pedido.metodo_pago ?? '',
    confirmado: true,
  })
  await cargarDatos()
}
  return (
    <div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">💰 Finanzas</h1>
        <p className="text-gray-500 text-sm mt-1">
          Registro del mes actual — {new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Pestañas */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {([
          { key: 'ingresos', label: '📥 Ingresos' },
          { key: 'gastos',   label: '📤 Gastos' },
          { key: 'resumen',  label: '📊 Resumen del mes' },
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

      {/* ── INGRESOS ── */}
      {pestana === 'ingresos' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-sm text-gray-500">{ingresos.length} registro{ingresos.length !== 1 ? 's' : ''} este mes</p>
              <p className="text-lg font-bold text-blue-600">{formatPesos(totalIngresos)}</p>
            </div>
            {pedidosSinIngreso.length > 0 && (
            <div className="mb-4 bg-amber-50 border border-amber-100 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-amber-800 mb-2">
                ⚠️ {pedidosSinIngreso.length} pedido{pedidosSinIngreso.length !== 1 ? 's' : ''} entregado{pedidosSinIngreso.length !== 1 ? 's' : ''} sin ingreso registrado
                </h3>
                <div className="space-y-2">
                {pedidosSinIngreso.map((p) => {
                    const nombreCliente = Array.isArray(p.clientes)
                    ? p.clientes[0]?.nombre
                    : p.clientes?.nombre
                    return (
                    <div key={p.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-100">
                        <div>
                        <span className="text-sm font-medium text-gray-800">
                            #{String(p.numero_pedido).padStart(3, '0')} — {nombreCliente}
                        </span>
                        <span className="text-xs text-gray-400 ml-2">
                            {formatPesos(p.total)}
                        </span>
                        </div>
                        <button
                        onClick={() => registrarIngresosDesdePedido(p)}
                        className="text-xs bg-[#00c9a7] text-white px-3 py-1 rounded-lg hover:bg-[#00b396] transition-colors"
                        >
                        Registrar ingreso
                        </button>
                    </div>
                    )
                })}
                </div>
            </div>
            )}
            <button onClick={() => setMostrarFormIngreso(true)}
              className="bg-[#0f1e35] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#162740] transition-colors">
              ➕ Registrar ingreso
            </button>
          </div>

          {mostrarFormIngreso && (
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-4">
              <h3 className="font-semibold text-gray-800 mb-4">Nuevo ingreso</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                  <input type="date" value={iFecha} onChange={(e) => setIFecha(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <select value={iCategoria} onChange={(e) => setICategoria(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7] bg-white">
                    {categoriasIngreso.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <input type="text" value={iDescripcion} onChange={(e) => setIDescripcion(e.target.value)}
                    placeholder="Descripción del ingreso"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Producto / Servicio</label>
                  <input type="text" value={iProducto} onChange={(e) => setIProducto(e.target.value)}
                    placeholder="Nombre del producto o servicio"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                  <input type="text" value={iCliente} onChange={(e) => setICliente(e.target.value)}
                    placeholder="Nombre del cliente"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Forma de pago</label>
                  <select value={iFormaPago} onChange={(e) => setIFormaPago(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7] bg-white">
                    <option value="">Seleccionar</option>
                    {formasPago.map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                  <input type="number" min={1} value={iCantidad} onChange={(e) => setICantidad(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio unitario (COP) *</label>
                  <input type="number" min={0} value={iPrecioUnitario} onChange={(e) => setIPrecioUnitario(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]" />
                </div>

                {iTotal > 0 && (
                  <div className="sm:col-span-2 bg-blue-50 px-4 py-2 rounded-lg text-sm text-blue-700">
                    Total: <strong>{formatPesos(iTotal)}</strong>
                  </div>
                )}

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                  <input type="text" value={iObservaciones} onChange={(e) => setIObservaciones(e.target.value)}
                    placeholder="Notas adicionales"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]" />
                </div>

              </div>
              <div className="flex gap-3 mt-4 justify-end">
                <button onClick={limpiarFormIngreso}
                  className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
                  Cancelar
                </button>
                <button onClick={guardarIngreso} disabled={guardandoIngreso || iPrecioUnitario <= 0}
                  className="bg-[#00c9a7] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#00b396] disabled:opacity-50">
                  {guardandoIngreso ? 'Guardando...' : 'Guardar ingreso'}
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">FECHA</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">DESCRIPCIÓN</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">CATEGORÍA</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">PRODUCTO</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">CLIENTE</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">CANT.</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">PRECIO UNIT.</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">TOTAL</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">PAGO</th>
                    <th className="py-3 px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {cargando ? (
                    <tr><td colSpan={10} className="py-12 text-center text-gray-400">Cargando...</td></tr>
                  ) : ingresos.length === 0 ? (
                    <tr><td colSpan={10} className="py-12 text-center text-gray-400">
                      <div className="text-3xl mb-2">📭</div>Sin ingresos registrados este mes
                    </td></tr>
                  ) : (
                    ingresos.map((i) => (
                      <tr key={i.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-3 text-gray-600">
                          {new Date(i.fecha + 'T00:00:00').toLocaleDateString('es-CO')}
                        </td>
                        <td className="py-3 px-3 text-gray-700">{i.descripcion || '—'}</td>
                        <td className="py-3 px-3 text-gray-500 text-xs">{i.categoria}</td>
                        <td className="py-3 px-3 text-gray-700">{i.producto || '—'}</td>
                        <td className="py-3 px-3 text-gray-700">{i.cliente || '—'}</td>
                        <td className="py-3 px-3 text-gray-600">{i.cantidad}</td>
                        <td className="py-3 px-3 text-gray-600">{formatPesos(i.precio_unitario)}</td>
                        <td className="py-3 px-3 font-semibold text-blue-600">{formatPesos(i.total)}</td>
                        <td className="py-3 px-3 text-gray-500 text-xs">{i.forma_pago || '—'}</td>
                        <td className="py-3 px-3">
                          <button onClick={() => eliminarIngreso(i.id)}
                            className="text-xs text-red-400 hover:text-red-600">
                            Eliminar
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
      )}

      {/* ── GASTOS ── */}
      {pestana === 'gastos' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-sm text-gray-500">{gastos.length} registro{gastos.length !== 1 ? 's' : ''} este mes</p>
              <p className="text-lg font-bold text-red-600">{formatPesos(totalGastos)}</p>
            </div>
            <button onClick={() => setMostrarFormGasto(true)}
              className="bg-[#0f1e35] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#162740] transition-colors">
              ➕ Registrar gasto
            </button>
          </div>

          {mostrarFormGasto && (
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-4">
              <h3 className="font-semibold text-gray-800 mb-4">Nuevo gasto</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                  <input type="date" value={gFecha} onChange={(e) => setGFecha(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <select value={gCategoria} onChange={(e) => setGCategoria(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7] bg-white">
                    {categoriasGasto.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <input type="text" value={gDescripcion} onChange={(e) => setGDescripcion(e.target.value)}
                    placeholder="Descripción del gasto"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select value={gTipo} onChange={(e) => setGTipo(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7] bg-white">
                    <option>Fijo</option>
                    <option>Variable</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                  <input type="text" value={gProveedor} onChange={(e) => setGProveedor(e.target.value)}
                    placeholder="Nombre del proveedor"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor (COP) *</label>
                  <input type="number" min={0} value={gValor} onChange={(e) => setGValor(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Forma de pago</label>
                  <select value={gFormaPago} onChange={(e) => setGFormaPago(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7] bg-white">
                    <option value="">Seleccionar</option>
                    {formasPago.map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>

                <div className="flex items-center gap-3 pt-6">
                  <input type="checkbox" id="soporte" checked={gTieneSoporte}
                    onChange={(e) => setGTieneSoporte(e.target.checked)}
                    className="w-4 h-4 accent-[#00c9a7]" />
                  <label htmlFor="soporte" className="text-sm font-medium text-gray-700">
                    ¿Tiene soporte (factura/recibo)?
                  </label>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                  <input type="text" value={gObservaciones} onChange={(e) => setGObservaciones(e.target.value)}
                    placeholder="Notas adicionales"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]" />
                </div>

              </div>
              <div className="flex gap-3 mt-4 justify-end">
                <button onClick={limpiarFormGasto}
                  className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
                  Cancelar
                </button>
                <button onClick={guardarGasto} disabled={guardandoGasto || gValor <= 0}
                  className="bg-[#00c9a7] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#00b396] disabled:opacity-50">
                  {guardandoGasto ? 'Guardando...' : 'Guardar gasto'}
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">FECHA</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">DESCRIPCIÓN</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">CATEGORÍA</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">TIPO</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">PROVEEDOR</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">VALOR</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">PAGO</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">SOPORTE</th>
                    <th className="py-3 px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {cargando ? (
                    <tr><td colSpan={9} className="py-12 text-center text-gray-400">Cargando...</td></tr>
                  ) : gastos.length === 0 ? (
                    <tr><td colSpan={9} className="py-12 text-center text-gray-400">
                      <div className="text-3xl mb-2">📭</div>Sin gastos registrados este mes
                    </td></tr>
                  ) : (
                    gastos.map((g) => (
                      <tr key={g.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-3 text-gray-600">
                          {new Date(g.fecha + 'T00:00:00').toLocaleDateString('es-CO')}
                        </td>
                        <td className="py-3 px-3 text-gray-700">{g.descripcion || '—'}</td>
                        <td className="py-3 px-3 text-gray-500 text-xs">{g.categoria}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            g.tipo === 'Fijo'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}>
                            {g.tipo}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-gray-500">{g.proveedor || '—'}</td>
                        <td className="py-3 px-3 font-semibold text-red-600">{formatPesos(g.valor)}</td>
                        <td className="py-3 px-3 text-gray-500 text-xs">{g.forma_pago || '—'}</td>
                        <td className="py-3 px-3 text-center">
                          {g.tiene_soporte ? '✅' : '❌'}
                        </td>
                        <td className="py-3 px-3">
                          <button onClick={() => eliminarGasto(g.id)}
                            className="text-xs text-red-400 hover:text-red-600">
                            Eliminar
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
      )}

      {/* ── RESUMEN ── */}
      {pestana === 'resumen' && (
        <div className="space-y-6">

          {/* KPIs del mes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="text-xs text-gray-400 mb-1">INGRESOS DEL MES</div>
              <div className="text-2xl font-bold text-blue-600">{formatPesos(totalIngresos)}</div>
              <div className="text-xs text-gray-400 mt-1">{ingresos.length} registros</div>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="text-xs text-gray-400 mb-1">GASTOS DEL MES</div>
              <div className="text-2xl font-bold text-red-600">{formatPesos(totalGastos)}</div>
              <div className="text-xs text-gray-400 mt-1">{gastos.length} registros</div>
            </div>
            <div className={`rounded-xl p-5 shadow-sm border ${
              utilidad >= 0
                ? 'bg-green-50 border-green-100'
                : 'bg-red-50 border-red-100'
            }`}>
              <div className="text-xs text-gray-400 mb-1">UTILIDAD NETA</div>
              <div className={`text-2xl font-bold ${utilidad >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPesos(utilidad)}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {utilidad >= 0 ? '✅ Ganancia' : '⚠️ Pérdida'}
              </div>
            </div>
          </div>

          {/* Desglose gastos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-800 mb-4">📊 Desglose de gastos</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Gastos fijos</span>
                  <span className="font-medium text-blue-600">{formatPesos(gastosFijos)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Gastos variables</span>
                  <span className="font-medium text-orange-600">{formatPesos(gastosVariables)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-gray-100 pt-3">
                  <span className="text-sm font-semibold text-gray-700">Total gastos</span>
                  <span className="font-bold text-red-600">{formatPesos(totalGastos)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-800 mb-4">📈 P&G del mes</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Ingresos totales</span>
                  <span className="font-medium text-blue-600">{formatPesos(totalIngresos)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">(-) Gastos totales</span>
                  <span className="font-medium text-red-600">({formatPesos(totalGastos)})</span>
                </div>
                <div className="flex justify-between items-center border-t border-gray-100 pt-3">
                  <span className="text-sm font-semibold text-gray-700">Utilidad neta</span>
                  <span className={`font-bold ${utilidad >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPesos(utilidad)}
                  </span>
                </div>
                {totalIngresos > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Margen neto</span>
                    <span className={`text-sm font-medium ${utilidad >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {((utilidad / totalIngresos) * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Gastos por categoría */}
          {gastos.length > 0 && (
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-800 mb-4">🏷️ Gastos por categoría</h3>
              <div className="space-y-2">
                {Object.entries(
                  gastos.reduce((acc, g) => {
                    acc[g.categoria] = (acc[g.categoria] || 0) + g.valor
                    return acc
                  }, {} as Record<string, number>)
                )
                  .sort((a, b) => b[1] - a[1])
                  .map(([categoria, valor]) => (
                    <div key={categoria} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700">{categoria}</span>
                          <span className="font-medium text-gray-800">{formatPesos(valor)}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#0f1e35] rounded-full"
                            style={{ width: `${(valor / totalGastos) * 100}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 w-12 text-right">
                        {((valor / totalGastos) * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  )
}
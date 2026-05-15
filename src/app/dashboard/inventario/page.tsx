'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/src/app/lib/supabase'

type Producto = {
  id: string
  nombre: string
  descripcion: string
  tipo: string
  costo_unitario: number
  precio_venta: number
  stock_disponible: number
  stock_reservado: number
  stock_minimo: number
  vendido: number
  observaciones: string
}

type MateriaPrima = {
  id: string
  nombre: string
  unidad: string
  stock_actual: number
  stock_minimo: number
  costo_unitario: number
  proveedor: string
  observaciones: string
}

function estadoStock(actual: number, minimo: number) {
  if (actual <= 0) return { texto: 'SIN STOCK', clase: 'bg-red-100 text-red-700' }
  if (actual <= minimo) return { texto: 'STOCK BAJO', clase: 'bg-yellow-100 text-yellow-700' }
  return { texto: 'OK', clase: 'bg-green-100 text-green-700' }
}

function formatPesos(valor: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(valor)
}

function formatPorcentaje(valor: number) {
  return isFinite(valor) ? `${valor.toFixed(1)}%` : '—'
}

export default function Inventario() {

  const [pestana, setPestana] = useState<'productos' | 'materias'>('productos')
  const [productos, setProductos] = useState<Producto[]>([])
  const [materias, setMaterias] = useState<MateriaPrima[]>([])
  const [cargando, setCargando] = useState(true)
  const [usuarioId, setUsuarioId] = useState<string | null>(null)

  // Formulario producto
  const [mostrarFormProducto, setMostrarFormProducto] = useState(false)
  const [pNombre, setPNombre] = useState('')
  const [pDescripcion, setPDescripcion] = useState('')
  const [pTipo, setPTipo] = useState('Producido')
  const [pCosto, setPCosto] = useState(0)
  const [pPrecio, setPPrecio] = useState(0)
  const [pStockInicial, setPStockInicial] = useState(0)
  const [pStockReservado, setPStockReservado] = useState(0)
  const [pStockMin, setPStockMin] = useState(0)
  const [pObservaciones, setPObservaciones] = useState('')
  const [guardandoProducto, setGuardandoProducto] = useState(false)

  // Formulario materia prima
  const [mostrarFormMateria, setMostrarFormMateria] = useState(false)
  const [mNombre, setMNombre] = useState('')
  const [mUnidad, setMUnidad] = useState('')
  const [mStock, setMStock] = useState(0)
  const [mStockMin, setMStockMin] = useState(0)
  const [mCosto, setMCosto] = useState(0)
  const [mProveedor, setMProveedor] = useState('')
  const [mObservaciones, setMObservaciones] = useState('')
  const [guardandoMateria, setGuardandoMateria] = useState(false)

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      const { data: userData } = await supabase.auth.getUser()
      if (userData.user) {
        setUsuarioId(userData.user.id)
        await cargarDatos()
      }
      setCargando(false)
    }
    cargar()
  }, [])

  async function cargarDatos() {
    const [{ data: prods }, { data: mats }] = await Promise.all([
      supabase.from('productos').select('*').order('nombre'),
      supabase.from('materias_primas').select('*').order('nombre'),
    ])
    if (prods) setProductos(prods as Producto[])
    if (mats) setMaterias(mats as MateriaPrima[])
  }

  async function guardarProducto() {
    if (!pNombre || !usuarioId) return
    setGuardandoProducto(true)
    await supabase.from('productos').insert({
      usuario_id: usuarioId,
      nombre: pNombre,
      descripcion: pDescripcion,
      tipo: pTipo,
      costo_unitario: pCosto,
      precio_venta: pPrecio,
      stock_disponible: pStockInicial,
      stock_reservado: pStockReservado,
      stock_minimo: pStockMin,
      vendido: 0,
      observaciones: pObservaciones,
    })
    setPNombre(''); setPDescripcion(''); setPCosto(0); setPPrecio(0)
    setPStockInicial(0); setPStockReservado(0); setPStockMin(0); setPObservaciones('')
    setMostrarFormProducto(false)
    setGuardandoProducto(false)
    await cargarDatos()
  }

  async function guardarMateria() {
    if (!mNombre || !mUnidad || !usuarioId) return
    setGuardandoMateria(true)
    await supabase.from('materias_primas').insert({
      usuario_id: usuarioId,
      nombre: mNombre,
      unidad: mUnidad,
      stock_actual: mStock,
      stock_minimo: mStockMin,
      costo_unitario: mCosto,
      proveedor: mProveedor,
      observaciones: mObservaciones,
    })
    setMNombre(''); setMUnidad(''); setMStock(0)
    setMStockMin(0); setMCosto(0); setMProveedor(''); setMObservaciones('')
    setMostrarFormMateria(false)
    setGuardandoMateria(false)
    await cargarDatos()
  }

  return (
    <div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">📦 Inventario</h1>
        <p className="text-gray-500 text-sm mt-1">Controla tus productos y materias primas</p>
      </div>

      {/* Pestañas */}
      <div className="flex gap-2 mb-6">
        {(['productos', 'materias'] as const).map((tab) => (
          <button key={tab} onClick={() => setPestana(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              pestana === tab
                ? 'bg-[#0f1e35] text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {tab === 'productos' ? '📦 Productos' : '🧪 Materias primas'}
          </button>
        ))}
      </div>

      {/* ── PRODUCTOS ── */}
      {pestana === 'productos' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">{productos.length} producto{productos.length !== 1 ? 's' : ''}</p>
            <button onClick={() => setMostrarFormProducto(!mostrarFormProducto)}
              className="bg-[#0f1e35] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#162740] transition-colors">
              ➕ Agregar producto
            </button>
          </div>

          {mostrarFormProducto && (
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-4">
              <h3 className="font-semibold text-gray-800 mb-4">Nuevo producto</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                  <input type="text" value={pNombre} onChange={(e) => setPNombre(e.target.value)}
                    placeholder="Nombre del producto"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                  <select value={pTipo} onChange={(e) => setPTipo(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7] bg-white">
                    <option>Producido</option>
                    <option>Comprado para reventa</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <input type="text" value={pDescripcion} onChange={(e) => setPDescripcion(e.target.value)}
                    placeholder="Descripción breve del producto"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Costo unitario (COP)</label>
                  <input type="number" min={0} value={pCosto} onChange={(e) => setPCosto(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio de venta (COP)</label>
                  <input type="number" min={0} value={pPrecio} onChange={(e) => setPPrecio(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]" />
                </div>

                {/* Margen calculado en tiempo real */}
                {pCosto > 0 && pPrecio > 0 && (
                  <div className="sm:col-span-2 bg-teal-50 px-4 py-2 rounded-lg text-sm text-teal-700">
                    Margen de ganancia: <strong>{formatPorcentaje((pPrecio - pCosto) / pCosto * 100)}</strong>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock inicial</label>
                  <input type="number" min={0} value={pStockInicial} onChange={(e) => setPStockInicial(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock reservado</label>
                  <input type="number" min={0} value={pStockReservado} onChange={(e) => setPStockReservado(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock mínimo</label>
                  <input type="number" min={0} value={pStockMin} onChange={(e) => setPStockMin(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                  <input type="text" value={pObservaciones} onChange={(e) => setPObservaciones(e.target.value)}
                    placeholder="Notas adicionales"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]" />
                </div>

              </div>
              <div className="flex gap-3 mt-4 justify-end">
                <button onClick={() => setMostrarFormProducto(false)}
                  className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
                  Cancelar
                </button>
                <button onClick={guardarProducto} disabled={guardandoProducto || !pNombre}
                  className="bg-[#00c9a7] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#00b396] disabled:opacity-50">
                  {guardandoProducto ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">NOMBRE</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">TIPO</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">COSTO</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">PRECIO</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">MARGEN</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">RESERVADO</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">VENDIDO</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">STOCK ACTUAL</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">MÍNIMO</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">ESTADO</th>
                  </tr>
                </thead>
                <tbody>
                  {cargando ? (
                    <tr><td colSpan={10} className="py-12 text-center text-gray-400">Cargando...</td></tr>
                  ) : productos.length === 0 ? (
                    <tr><td colSpan={10} className="py-12 text-center text-gray-400">
                      <div className="text-3xl mb-2">📭</div>No hay productos registrados
                    </td></tr>
                  ) : (
                    productos.map((p) => {
                      const stockActual = p.stock_disponible - p.stock_reservado - p.vendido
                      const margen = p.costo_unitario > 0
                        ? (p.precio_venta - p.costo_unitario) / p.costo_unitario * 100
                        : 0
                      const estado = estadoStock(stockActual, p.stock_minimo)
                      return (
                        <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-3 font-medium text-gray-800">
                            {p.nombre}
                            {p.descripcion && <div className="text-xs text-gray-400">{p.descripcion}</div>}
                          </td>
                          <td className="py-3 px-3 text-xs text-gray-500">{p.tipo}</td>
                          <td className="py-3 px-3 text-gray-700">{formatPesos(p.costo_unitario)}</td>
                          <td className="py-3 px-3 text-gray-700">{formatPesos(p.precio_venta)}</td>
                          <td className="py-3 px-3 text-teal-600 font-medium">{formatPorcentaje(margen)}</td>
                          <td className="py-3 px-3 text-gray-600">{p.stock_reservado}</td>
                          <td className="py-3 px-3 text-gray-600">{p.vendido}</td>
                          <td className="py-3 px-3 font-semibold text-gray-800">{stockActual}</td>
                          <td className="py-3 px-3 text-gray-500">{p.stock_minimo}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${estado.clase}`}>
                              {estado.texto}
                            </span>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── MATERIAS PRIMAS ── */}
      {pestana === 'materias' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">{materias.length} materia{materias.length !== 1 ? 's' : ''} prima{materias.length !== 1 ? 's' : ''}</p>
            <button onClick={() => setMostrarFormMateria(!mostrarFormMateria)}
              className="bg-[#0f1e35] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#162740] transition-colors">
              ➕ Agregar materia prima
            </button>
          </div>

          {mostrarFormMateria && (
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-4">
              <h3 className="font-semibold text-gray-800 mb-4">Nueva materia prima</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                  <input type="text" value={mNombre} onChange={(e) => setMNombre(e.target.value)}
                    placeholder="Ej: Harina de trigo"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unidad *</label>
                  <select value={mUnidad} onChange={(e) => setMUnidad(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7] bg-white">
                    <option value="">Seleccionar</option>
                    {['kg','g','litros','ml','unidades','metros','cm'].map(u => (
                      <option key={u}>{u}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock actual</label>
                  <input type="number" min={0} value={mStock} onChange={(e) => setMStock(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock mínimo</label>
                  <input type="number" min={0} value={mStockMin} onChange={(e) => setMStockMin(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Costo unitario (COP)</label>
                  <input type="number" min={0} value={mCosto} onChange={(e) => setMCosto(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                  <input type="text" value={mProveedor} onChange={(e) => setMProveedor(e.target.value)}
                    placeholder="Nombre del proveedor"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]" />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                  <input type="text" value={mObservaciones} onChange={(e) => setMObservaciones(e.target.value)}
                    placeholder="Notas adicionales"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]" />
                </div>

              </div>
              <div className="flex gap-3 mt-4 justify-end">
                <button onClick={() => setMostrarFormMateria(false)}
                  className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
                  Cancelar
                </button>
                <button onClick={guardarMateria} disabled={guardandoMateria || !mNombre || !mUnidad}
                  className="bg-[#00c9a7] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#00b396] disabled:opacity-50">
                  {guardandoMateria ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">MATERIAL</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">UNIDAD</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">STOCK ACTUAL</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">MÍNIMO</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">COSTO UNIT.</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">VALOR TOTAL</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">PROVEEDOR</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">ESTADO</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">OBSERVACIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {cargando ? (
                    <tr><td colSpan={9} className="py-12 text-center text-gray-400">Cargando...</td></tr>
                  ) : materias.length === 0 ? (
                    <tr><td colSpan={9} className="py-12 text-center text-gray-400">
                      <div className="text-3xl mb-2">📭</div>No hay materias primas registradas
                    </td></tr>
                  ) : (
                    materias.map((m) => {
                      const estado = estadoStock(m.stock_actual, m.stock_minimo)
                      const valorTotal = m.stock_actual * m.costo_unitario
                      return (
                        <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-3 font-medium text-gray-800">{m.nombre}</td>
                          <td className="py-3 px-3 text-gray-500">{m.unidad}</td>
                          <td className="py-3 px-3 font-semibold text-gray-800">{m.stock_actual}</td>
                          <td className="py-3 px-3 text-gray-500">{m.stock_minimo}</td>
                          <td className="py-3 px-3 text-gray-700">{formatPesos(m.costo_unitario)}</td>
                          <td className="py-3 px-3 font-medium text-gray-800">{formatPesos(valorTotal)}</td>
                          <td className="py-3 px-3 text-gray-500">{m.proveedor || '—'}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${estado.clase}`}>
                              {estado.texto}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-gray-400 text-xs">{m.observaciones || '—'}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
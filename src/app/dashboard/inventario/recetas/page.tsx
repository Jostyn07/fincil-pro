'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/src/app/lib/supabase'

type Producto = {
  id: string
  nombre: string
  tipo: string
}

type MateriaPrima = {
  id: string
  nombre: string
  unidad: string
}

type Ingrediente = {
  id: string
  materia_prima_id: string
  cantidad_requerida: number
  materias_primas: {
    nombre: string
    unidad: string
    costo_unitario: number
  }[]
}

export default function Recetas() {

    const [productos, setProductos] = useState<Producto[]>([])
    const [materias, setMaterias] = useState<MateriaPrima[]>([])
    const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null)
    const [ingredientes, setIngredientes] = useState<Ingrediente[]>([])
    const [cargando, setCargando] = useState(true)

    // Formulario nuevo ingrediente
    const [materiaId, setMateriaId] = useState('')
    const [cantidad, setCantidad] = useState(0)
    const [guardando, setGuardando] = useState(false)

    const [manoObra, setManoObra] = useState(0)
    const [gastosVariables, setGastosVariables] = useState(0)
    const [guardandoCosto, setGuardandoCosto] = useState(false)

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return

      const [{ data: prods }, { data: mats }] = await Promise.all([
        supabase.from('productos')
          .select('id, nombre, tipo')
          .eq('tipo', 'Producido')
          .order('nombre'),
        supabase.from('materias_primas')
          .select('id, nombre, unidad')
          .order('nombre'),
      ])

      if (prods) setProductos(prods)
      if (mats) setMaterias(mats)
      setCargando(false)
    }
    cargar()
  }, [])

    async function cargarIngredientes(productoId: string) {
    const { data } = await supabase
        .from('recetas')
        .select(`
        id,
        materia_prima_id,
        cantidad_requerida,
        materias_primas (nombre, unidad, costo_unitario)
        `)
        .eq('producto_id', productoId)
    if (data) setIngredientes(data as unknown as Ingrediente[])
    }

  async function seleccionarProducto(producto: Producto) {
    setProductoSeleccionado(producto)
    setMateriaId('')
    setCantidad(0)
    await cargarIngredientes(producto.id)
  }

  async function agregarIngrediente() {
    if (!productoSeleccionado || !materiaId || cantidad <= 0) return
    setGuardando(true)

    await supabase.from('recetas').insert({
      producto_id: productoSeleccionado.id,
      materia_prima_id: materiaId,
      cantidad_requerida: cantidad,
    })

    setMateriaId('')
    setCantidad(0)
    await cargarIngredientes(productoSeleccionado.id)
    setGuardando(false)
  }

  async function eliminarIngrediente(id: string) {
    await supabase.from('recetas').delete().eq('id', id)
    if (productoSeleccionado) await cargarIngredientes(productoSeleccionado.id)
  }

  // Materias primas que aún no están en la receta
  const materiasDisponibles = materias.filter(
    (m) => !ingredientes.some((i) => i.materia_prima_id === m.id)
  )

  const costoMateriales = ingredientes.reduce((sum, i) => {
    return sum + (i.cantidad_requerida * (i.materias_primas[0]?.costo_unitario ?? 0))
    }, 0)

    const costoTotal = costoMateriales + manoObra + gastosVariables

    function formatPesos(valor: number) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(valor)
    }

  if (cargando) {
    return <div className="py-20 text-center text-gray-400">Cargando...</div>
  }

    async function guardarCostoEnProducto() {
        if (!productoSeleccionado) return
        setGuardandoCosto(true)
        await supabase
            .from('productos')
            .update({ costo_unitario: costoTotal })
            .eq('id', productoSeleccionado.id)
        setGuardandoCosto(false)
        alert(`✅ Costo de producción guardado: ${formatPesos(costoTotal)}`)
    }

  return (
    <div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">🍳 Recetas</h1>
        <p className="text-gray-500 text-sm mt-1">
          Define los ingredientes necesarios para producir cada producto
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── LISTA DE PRODUCTOS ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800 text-sm">Productos producidos</h2>
          </div>

          {productos.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm px-4">
              <div className="text-3xl mb-2">📭</div>
              No hay productos de tipo Producido.
              Agrégalos primero en Inventario.
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {productos.map((p) => (
                <button
                  key={p.id}
                  onClick={() => seleccionarProducto(p)}
                  className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                    productoSeleccionado?.id === p.id
                      ? 'bg-[#00c9a7]/10 text-[#00c9a7] font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {p.nombre}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── RECETA DEL PRODUCTO ── */}
        <div className="lg:col-span-2">
          {!productoSeleccionado ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 py-20 text-center text-gray-400">
              <div className="text-4xl mb-3">👈</div>
              <p className="text-sm">Selecciona un producto para ver o editar su receta</p>
            </div>
          ) : (
            <div className="space-y-4">

              {/* Encabezado */}
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <h2 className="font-semibold text-gray-800 mb-1">
                  Receta de: <span className="text-[#00c9a7]">{productoSeleccionado.nombre}</span>
                </h2>
                <p className="text-xs text-gray-400">
                  Ingredientes necesarios para producir 1 unidad
                </p>
              </div>

              {/* Ingredientes actuales */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-800 text-sm">Ingredientes</h3>
                </div>

                {ingredientes.length === 0 ? (
                  <div className="py-8 text-center text-gray-400 text-sm">
                    Esta receta no tiene ingredientes aún
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">MATERIAL</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">CANTIDAD</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">UNIDAD</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">COSTO UNIT.</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">SUBTOTAL</th>
                        <th className="py-3 px-4"></th>
                    </tr>
                    </thead>
                    <tbody>
                    {ingredientes.map((i) => {
                        const costoUnit = i.materias_primas[0]?.costo_unitario ?? 0
                        const subtotal = i.cantidad_requerida * costoUnit
                        return (
                        <tr key={i.id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium text-gray-800">{i.materias_primas[0]?.nombre}</td>
                            <td className="py-3 px-4 text-gray-700">{i.cantidad_requerida}</td>
                            <td className="py-3 px-4 text-gray-500">{i.materias_primas[0]?.unidad}</td>
                            <td className="py-3 px-4 text-gray-600">{formatPesos(costoUnit)}</td>
                            <td className="py-3 px-4 font-medium text-gray-800">{formatPesos(subtotal)}</td>
                            <td className="py-3 px-4 text-right">
                            <button onClick={() => eliminarIngrediente(i.id)}
                                className="text-xs text-red-400 hover:text-red-600 transition-colors">
                                Eliminar
                            </button>
                            </td>
                        </tr>
                        )
                    })}
                    </tbody>
                      {ingredientes.map((i) => (
                        <tr key={i.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium text-gray-800">
                            {i.materias_primas[0].nombre}
                          </td>
                          <td className="py-3 px-4 text-gray-700">{i.cantidad_requerida}</td>
                          <td className="py-3 px-4 text-gray-500">{i.materias_primas[0].unidad}</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => eliminarIngrediente(i.id)}
                              className="text-xs text-red-400 hover:text-red-600 transition-colors"
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))}
                  </table>
                )}
              </div>

              {/* Agregar ingrediente */}
              {materiasDisponibles.length > 0 && (
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                  <h3 className="font-semibold text-gray-800 text-sm mb-4">
                    ➕ Agregar ingrediente
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Materia prima
                      </label>
                      <select
                        value={materiaId}
                        onChange={(e) => setMateriaId(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7] bg-white"
                      >
                        <option value="">Seleccionar</option>
                        {materiasDisponibles.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.nombre} ({m.unidad})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Cantidad
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        value={cantidad}
                        onChange={(e) => setCantidad(Number(e.target.value))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]"
                      />
                    </div>

                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={agregarIngrediente}
                      disabled={guardando || !materiaId || cantidad <= 0}
                      className="bg-[#0f1e35] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#162740] transition-colors disabled:opacity-50"
                    >
                      {guardando ? 'Guardando...' : 'Agregar'}
                    </button>
                  </div>
                </div>
              )}

                {/* Costos adicionales */}
                {productoSeleccionado && (
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                    <h3 className="font-semibold text-gray-800 text-sm mb-4">
                    💰 Costos adicionales por unidad
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                        Mano de obra (COP)
                        </label>
                        <input type="number" min={0} value={manoObra}
                        onChange={(e) => setManoObra(Number(e.target.value))}
                        placeholder="0"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                        Otros gastos variables (COP)
                        </label>
                        <input type="number" min={0} value={gastosVariables}
                        onChange={(e) => setGastosVariables(Number(e.target.value))}
                        placeholder="Ej: empaque, transporte..."
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]" />
                    </div>
                    </div>

                    {/* Resumen de costos */}
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm mb-4">
                    <div className="flex justify-between text-gray-600">
                        <span>Materiales</span>
                        <span>{formatPesos(costoMateriales)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                        <span>Mano de obra</span>
                        <span>{formatPesos(manoObra)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                        <span>Otros gastos</span>
                        <span>{formatPesos(gastosVariables)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-gray-800 border-t border-gray-200 pt-2">
                        <span>Costo total por unidad</span>
                        <span className="text-[#00c9a7]">{formatPesos(costoTotal)}</span>
                    </div>
                    </div>

                    <div className="flex justify-end">
                    <button onClick={guardarCostoEnProducto} disabled={guardandoCosto || costoTotal === 0}
                        className="bg-[#0f1e35] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#162740] transition-colors disabled:opacity-50">
                        {guardandoCosto ? 'Guardando...' : '💾 Guardar costo en producto'}
                    </button>
                    </div>
                </div>
                )}

              {/* Aviso si no hay materias primas */}
              {materias.length === 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-700">
                  ⚠️ No tienes materias primas registradas. Agrégalas primero en Inventario → Materias primas.
                </div>
              )}

            </div>
          )}
        </div>

      </div>
    </div>
  )
}
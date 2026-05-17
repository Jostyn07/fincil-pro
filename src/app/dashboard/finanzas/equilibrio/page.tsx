'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/src/app/lib/supabase'

function formatPesos(valor: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(valor)
}

function formatPorcentaje(valor: number) {
  return isFinite(valor) ? `${valor.toFixed(1)}%` : '0%'
}

export default function Equilibrio() {

  const [cargando, setCargando] = useState(true)
  const [ingresosMes, setIngresosMes] = useState(0)
  const [gastosFijos, setGastosFijos] = useState(0)
  const [gastosVariables, setGastosVariables] = useState(0)

  // Gastos fijos adicionales manuales (que no están en el mes actual)
  const [gastosFijosExtra, setGastosFijosExtra] = useState(0)

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      const mesActual = new Date().toISOString().slice(0, 7)

      const [{ data: ing }, { data: gas }] = await Promise.all([
        supabase.from('ingresos')
          .select('total')
          .eq('confirmado', true)
          .gte('fecha', `${mesActual}-01`),
        supabase.from('gastos')
          .select('valor, tipo')
          .gte('fecha', `${mesActual}-01`),
      ])

      const totalIngresos = ing?.reduce((sum, i) => sum + i.total, 0) ?? 0
      const totalFijos = gas?.filter(g => g.tipo === 'Fijo').reduce((sum, g) => sum + g.valor, 0) ?? 0
      const totalVariables = gas?.filter(g => g.tipo === 'Variable').reduce((sum, g) => sum + g.valor, 0) ?? 0

      setIngresosMes(totalIngresos)
      setGastosFijos(totalFijos)
      setGastosVariables(totalVariables)
      setCargando(false)
    }
    cargar()
  }, [])

  // Cálculos
  const totalGastosFijos = gastosFijos + gastosFijosExtra
  const margenContribucion = ingresosMes > 0
    ? ((ingresosMes - gastosVariables) / ingresosMes) * 100
    : 0
  const puntoEquilibrio = margenContribucion > 0
    ? (totalGastosFijos / (margenContribucion / 100))
    : 0
  const diferencia = ingresosMes - puntoEquilibrio
  const porcentajeAlcanzado = puntoEquilibrio > 0
    ? Math.min((ingresosMes / puntoEquilibrio) * 100, 100)
    : 0
  const superado = ingresosMes >= puntoEquilibrio && puntoEquilibrio > 0

  if (cargando) {
    return <div className="py-20 text-center text-gray-400">Cargando...</div>
  }

  return (
    <div className="max-w-3xl mx-auto">

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">⚖️ Punto de equilibrio</h1>
        <p className="text-gray-500 text-sm mt-1">
          ¿Cuánto necesitas vender para no perder? — {new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Datos del mes */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-6">
        <h2 className="font-semibold text-gray-800 mb-4">📊 Datos del mes actual</h2>
        <p className="text-xs text-gray-400 mb-4">
          Estos valores vienen de tus registros de Ingresos y Gastos. Si quieres ajustar los gastos fijos para la proyección, usa el campo adicional abajo.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-xs text-blue-500 font-medium mb-1">INGRESOS DEL MES</div>
            <div className="text-xl font-bold text-blue-700">{formatPesos(ingresosMes)}</div>
            <div className="text-xs text-blue-400 mt-1">Ventas cobradas</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <div className="text-xs text-red-500 font-medium mb-1">GASTOS FIJOS</div>
            <div className="text-xl font-bold text-red-700">{formatPesos(gastosFijos)}</div>
            <div className="text-xs text-red-400 mt-1">Arriendo, nómina, etc.</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="text-xs text-orange-500 font-medium mb-1">GASTOS VARIABLES</div>
            <div className="text-xl font-bold text-orange-700">{formatPesos(gastosVariables)}</div>
            <div className="text-xs text-orange-400 mt-1">Materias primas, etc.</div>
          </div>
        </div>

        {/* Gastos fijos adicionales */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Gastos fijos adicionales (COP)
          </label>
          <p className="text-xs text-gray-400 mb-2">
            Agrega gastos fijos que no hayas registrado este mes (ej: deudas, cuotas fijas)
          </p>
          <input
            type="number" min={0}
            value={gastosFijosExtra || ''}
            placeholder="0"
            onChange={(e) => setGastosFijosExtra(Number(e.target.value))}
            className="w-full sm:w-64 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]"
          />
        </div>
      </div>

      {/* Resultado */}
      {ingresosMes === 0 && gastosFijos === 0 ? (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-6 text-center">
          <div className="text-3xl mb-2">📭</div>
          <p className="text-sm text-amber-700 font-medium">
            No hay datos registrados este mes
          </p>
          <p className="text-xs text-amber-500 mt-1">
            Registra tus ingresos y gastos en Finanzas para calcular el punto de equilibrio
          </p>
        </div>
      ) : (
        <div className="space-y-4">

          {/* Margen de contribución */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-4">🧮 Cálculo</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-gray-700">Ingresos del mes</span>
                </div>
                <span className="font-medium text-blue-600">{formatPesos(ingresosMes)}</span>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-gray-700">(-) Gastos variables</span>
                </div>
                <span className="font-medium text-orange-600">({formatPesos(gastosVariables)})</span>
              </div>
              <div className="flex justify-between items-center border-t border-gray-100 pt-3">
                <div>
                  <span className="font-medium text-gray-700">Margen de contribución</span>
                  <p className="text-xs text-gray-400">De cada $100 vendidos, cuánto queda para cubrir gastos fijos</p>
                </div>
                <span className="font-bold text-teal-600 text-lg">{formatPorcentaje(margenContribucion)}</span>
              </div>
              <div className="flex justify-between items-center border-t border-gray-100 pt-3">
                <div>
                  <span className="text-gray-700">Total gastos fijos</span>
                  {gastosFijosExtra > 0 && (
                    <p className="text-xs text-gray-400">Incluye {formatPesos(gastosFijosExtra)} adicionales</p>
                  )}
                </div>
                <span className="font-medium text-red-600">({formatPesos(totalGastosFijos)})</span>
              </div>
            </div>
          </div>

          {/* Punto de equilibrio */}
          <div className={`rounded-xl p-5 shadow-sm border ${
            superado ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'
          }`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-800">⚖️ Punto de equilibrio</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Ventas mínimas para no perder dinero este mes
                </p>
              </div>
              <span className={`text-2xl font-bold ${superado ? 'text-green-600' : 'text-red-600'}`}>
                {formatPesos(puntoEquilibrio)}
              </span>
            </div>


    {/* Punto de equilibrio */}
    {puntoEquilibrio === 0 && gastosFijos === 0 ? (
    <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 shadow-sm">
        <div className="flex items-start justify-between mb-3">
        <div>
            <h3 className="font-semibold text-gray-800">⚖️ Punto de equilibrio</h3>
            <p className="text-xs text-gray-500 mt-0.5">
            No aplica — no tienes gastos fijos registrados
            </p>
        </div>
        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full font-medium">
            Sin gastos fijos
        </span>
        </div>

        <div className="bg-white rounded-lg p-4 space-y-2 text-sm mb-3">
        <div className="flex justify-between">
            <span className="text-gray-600">Ingresos del mes</span>
            <span className="font-medium text-blue-600">{formatPesos(ingresosMes)}</span>
        </div>
        <div className="flex justify-between">
            <span className="text-gray-600">(-) Gastos variables</span>
            <span className="font-medium text-orange-600">({formatPesos(gastosVariables)})</span>
        </div>
        <div className="flex justify-between border-t border-gray-100 pt-2">
            <span className="font-semibold text-gray-700">Ganancia neta estimada</span>
            <span className="font-bold text-green-600">{formatPesos(ingresosMes - gastosVariables)}</span>
        </div>
        </div>

        <div className="bg-blue-100 rounded-lg p-3 text-sm text-blue-700">
        ✅ <strong>No tienes gastos fijos registrados.</strong> Toda tu venta cubre primero 
        los gastos variables y el resto es ganancia. Registra gastos fijos en Finanzas 
        para ver tu punto de equilibrio real.
        </div>
    </div>
    ) : (
    <div className={`rounded-xl p-5 shadow-sm border ${
        superado ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'
    }`}>
        <div className="flex items-start justify-between mb-4">
        <div>
            <h3 className="font-semibold text-gray-800">⚖️ Punto de equilibrio</h3>
            <p className="text-xs text-gray-500 mt-0.5">
            Ventas mínimas para no perder dinero este mes
            </p>
        </div>
        <span className={`text-2xl font-bold ${superado ? 'text-green-600' : 'text-red-600'}`}>
            {formatPesos(puntoEquilibrio)}
        </span>
        </div>

        {/* Barra de progreso */}
        <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>$0</span>
            <span>{formatPesos(puntoEquilibrio)}</span>
        </div>
        <div className="h-4 bg-white/60 rounded-full overflow-hidden">
            <div
            className={`h-full rounded-full transition-all duration-500 ${
                superado ? 'bg-green-500' : 'bg-red-400'
            }`}
            style={{ width: `${porcentajeAlcanzado}%` }}
            />
        </div>
        <div className="flex justify-between text-xs mt-1">
            <span className="text-gray-500">
            Llevas {formatPorcentaje(porcentajeAlcanzado)}
            </span>
            <span className="font-medium text-gray-700">
            {formatPesos(ingresosMes)} vendidos
            </span>
        </div>
        </div>

        {/* Mensaje */}
        <div className={`rounded-lg p-3 text-sm ${
        superado ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
        {superado ? (
            <>
            ✅ <strong>¡Superaste el punto de equilibrio!</strong> Llevas{' '}
            <strong>{formatPesos(diferencia)}</strong> de ganancia neta este mes.
            </>
        ) : (
            <>
            ⚠️ Te faltan <strong>{formatPesos(Math.abs(diferencia))}</strong> en ventas 
            para cubrir todos tus gastos fijos este mes.
            </>
        )}
        </div>
    </div>
    )}
          </div>

          {/* Escenarios */}
          {puntoEquilibrio > 0 && <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-4">📈 Escenarios</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 rounded-lg">
                  <tr>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">ESCENARIO</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">VENTAS NECESARIAS</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">RESULTADO</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">ESTADO</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Solo cubrir gastos', multiplicador: 1, color: 'text-gray-600' },
                    { label: '10% de ganancia', multiplicador: 1.1, color: 'text-blue-600' },
                    { label: '20% de ganancia', multiplicador: 1.2, color: 'text-teal-600' },
                    { label: '30% de ganancia', multiplicador: 1.3, color: 'text-green-600' },
                  ].map((escenario) => {
                    const ventasNecesarias = puntoEquilibrio * escenario.multiplicador
                    const ganancia = ventasNecesarias - puntoEquilibrio
                    const alcanzado = ingresosMes >= ventasNecesarias
                    return (
                      <tr key={escenario.label} className="border-t border-gray-50">
                        <td className="py-3 px-3 text-gray-700">{escenario.label}</td>
                        <td className={`py-3 px-3 font-medium ${escenario.color}`}>
                          {formatPesos(ventasNecesarias)}
                        </td>
                        <td className="py-3 px-3 text-gray-500">
                          {escenario.multiplicador === 1 ? '—' : `+${formatPesos(ganancia)}`}
                        </td>
                        <td className="py-3 px-3">
                          {alcanzado ? (
                            <span className="text-xs text-green-600 font-medium">✅ Alcanzado</span>
                          ) : (
                            <span className="text-xs text-gray-400">
                              Faltan {formatPesos(ventasNecesarias - ingresosMes)}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>}

          {/* Explicación */}
          <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500 space-y-1">
            <p><strong>¿Cómo se calcula?</strong></p>
            <p>1. Margen de contribución = (Ingresos - Gastos variables) ÷ Ingresos</p>
            <p>2. Punto de equilibrio = Gastos fijos ÷ Margen de contribución</p>
            <p>Ejemplo: Si tienes $500.000 en gastos fijos y tu margen es 60%, necesitas vender $833.333 para no perder.</p>
          </div>

        </div>
      )}

    </div>
  )
}
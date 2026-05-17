'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/src/app/lib/supabase'

type GastoPersonal = {
  id: string
  fecha: string
  descripcion: string
  categoria: string
  valor: number
  salio_del_negocio: boolean
  observaciones: string
}

const categoriasPersonal = [
  'Alimentación',
  'Transporte',
  'Vivienda',
  'Salud',
  'Educación',
  'Entretenimiento',
  'Ropa y calzado',
  'Servicios personales',
  'Otros gastos personales',
]

function formatPesos(valor: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(valor)
}

export default function Personal() {

  const [usuarioId, setUsuarioId] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [guardandoGasto, setGuardandoGasto] = useState(false)
  const [exito, setExito] = useState(false)

  // Sueldo del negocio
  const [sueldoMensual, setSueldoMensual] = useState(0)
  const [mePague, setMePague] = useState(false)
  const [montoPagado, setMontoPagado] = useState(0)
  const [personalId, setPersonalId] = useState<string | null>(null)

  // Gastos personales
  const [gastos, setGastos] = useState<GastoPersonal[]>([])
  const [mostrarForm, setMostrarForm] = useState(false)
  const [gFecha, setGFecha] = useState(new Date().toISOString().split('T')[0])
  const [gDescripcion, setGDescripcion] = useState('')
  const [gCategoria, setGCategoria] = useState('Alimentación')
  const [gValor, setGValor] = useState(0)
  const [gSalioDelNegocio, setGSalioDelNegocio] = useState(false)
  const [gObservaciones, setGObservaciones] = useState('')

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return
      setUsuarioId(userData.user.id)

      const { data: personalData } = await supabase
        .from('personal')
        .select('*')
        .eq('usuario_id', userData.user.id)
        .maybeSingle()

      if (personalData) {
        setPersonalId(personalData.id)
        setSueldoMensual(personalData.sueldo_mensual)
        setMePague(personalData.me_pague)
        setMontoPagado(personalData.monto_pagado)
      }

      const mesActual = new Date().toISOString().slice(0, 7)
      const { data: gastosData } = await supabase
        .from('gastos_personales')
        .select('*')
        .eq('usuario_id', userData.user.id)
        .gte('fecha', `${mesActual}-01`)
        .order('fecha', { ascending: false })

      if (gastosData) setGastos(gastosData as GastoPersonal[])
      setCargando(false)
    }
    cargar()
  }, [])

  async function guardarSueldo() {
    if (!usuarioId) return
    setGuardando(true)

    if (personalId) {
      await supabase.from('personal').update({
        sueldo_mensual: sueldoMensual,
        me_pague: mePague,
        monto_pagado: mePague ? montoPagado : 0,
      }).eq('id', personalId)
    } else {
      const { data } = await supabase.from('personal').insert({
        usuario_id: usuarioId,
        sueldo_mensual: sueldoMensual,
        me_pague: mePague,
        monto_pagado: mePague ? montoPagado : 0,
      }).select('id').single()
      if (data) setPersonalId(data.id)
    }

    setGuardando(false)
    setExito(true)
    setTimeout(() => setExito(false), 3000)
  }

  async function guardarGasto() {
    if (!usuarioId || gValor <= 0) return
    setGuardandoGasto(true)

    await supabase.from('gastos_personales').insert({
      usuario_id: usuarioId,
      fecha: gFecha,
      descripcion: gDescripcion,
      categoria: gCategoria,
      valor: gValor,
      salio_del_negocio: gSalioDelNegocio,
      observaciones: gObservaciones,
    })

    setGFecha(new Date().toISOString().split('T')[0])
    setGDescripcion('')
    setGCategoria('Alimentación')
    setGValor(0)
    setGSalioDelNegocio(false)
    setGObservaciones('')
    setMostrarForm(false)
    setGuardandoGasto(false)

    const mesActual = new Date().toISOString().slice(0, 7)
    const { data } = await supabase
      .from('gastos_personales')
      .select('*')
      .eq('usuario_id', usuarioId)
      .gte('fecha', `${mesActual}-01`)
      .order('fecha', { ascending: false })
    if (data) setGastos(data as GastoPersonal[])
  }

  async function eliminarGasto(id: string) {
    if (!confirm('¿Eliminar este gasto?')) return
    await supabase.from('gastos_personales').delete().eq('id', id)
    setGastos(gastos.filter(g => g.id !== id))
  }

  const totalGastos = gastos.reduce((sum, g) => sum + g.valor, 0)
  const gastosDelNegocio = gastos.filter(g => g.salio_del_negocio).reduce((sum, g) => sum + g.valor, 0)
  const gastosPersonalesPuros = totalGastos - gastosDelNegocio
  const diferenciaSueldo = sueldoMensual - montoPagado

  if (cargando) {
    return <div className="py-20 text-center text-gray-400">Cargando...</div>
  }

  return (
    <div className="max-w-3xl mx-auto">

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">👤 Personal</h1>
        <p className="text-gray-500 text-sm mt-1">
          Separa tus finanzas personales de las del negocio
        </p>
      </div>

      {/* Sueldo del negocio */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-6">
        <h2 className="font-semibold text-gray-800 mb-4">💼 Mi sueldo del negocio</h2>
        <p className="text-xs text-gray-400 mb-4">
          Asígnate un sueldo fijo mensual para separar lo que gana el negocio de lo que tú ganas.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sueldo mensual (COP)
            </label>
            <input
              type="number" min={0}
              value={sueldoMensual || ''}
              placeholder="0"
              onChange={(e) => setSueldoMensual(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]"
            />
          </div>

          <div className="flex items-center gap-3 pt-6">
            <input
              type="checkbox" id="mepague" checked={mePague}
              onChange={(e) => setMePague(e.target.checked)}
              className="w-4 h-4 accent-[#00c9a7]"
            />
            <label htmlFor="mepague" className="text-sm font-medium text-gray-700">
              ¿Me pagué este mes?
            </label>
          </div>

          {mePague && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monto pagado (COP)
              </label>
              <input
                type="number" min={0}
                value={montoPagado || ''}
                placeholder="0"
                onChange={(e) => setMontoPagado(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]"
              />
            </div>
          )}
        </div>

        {sueldoMensual > 0 && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Sueldo acordado</span>
              <span className="font-medium">{formatPesos(sueldoMensual)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pagado este mes</span>
              <span className="font-medium text-green-600">{formatPesos(mePague ? montoPagado : 0)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2">
              <span className="font-semibold text-gray-700">Pendiente</span>
              <span className={`font-bold ${diferenciaSueldo > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {diferenciaSueldo > 0 ? formatPesos(diferenciaSueldo) : '✅ Al día'}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 justify-end">
          {exito && <span className="text-sm text-green-600">✅ Guardado</span>}
          <button onClick={guardarSueldo} disabled={guardando}
            className="bg-[#0f1e35] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#162740] transition-colors disabled:opacity-50">
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* Gastos personales */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-800">🛒 Gastos personales del mes</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Registra tus gastos personales — marca cuáles salieron del negocio
            </p>
          </div>
          <button onClick={() => setMostrarForm(true)}
            className="bg-[#0f1e35] text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[#162740] transition-colors">
            ➕ Agregar
          </button>
        </div>

        {mostrarForm && (
          <div className="p-5 border-b border-gray-100 bg-gray-50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Fecha</label>
                <input type="date" value={gFecha} onChange={(e) => setGFecha(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7] bg-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Categoría</label>
                <select value={gCategoria} onChange={(e) => setGCategoria(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7] bg-white">
                  {categoriasPersonal.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
                <input type="text" value={gDescripcion} onChange={(e) => setGDescripcion(e.target.value)}
                  placeholder="¿En qué gastaste?"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Valor (COP) *</label>
                <input
                  type="number" min={0}
                  value={gValor || ''}
                  placeholder="0"
                  onChange={(e) => setGValor(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]" />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <input type="checkbox" id="salio" checked={gSalioDelNegocio}
                  onChange={(e) => setGSalioDelNegocio(e.target.checked)}
                  className="w-4 h-4 accent-[#00c9a7]" />
                <label htmlFor="salio" className="text-xs font-medium text-gray-700">
                  ¿Salió del negocio?
                </label>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Observaciones</label>
                <input type="text" value={gObservaciones} onChange={(e) => setGObservaciones(e.target.value)}
                  placeholder="Notas adicionales"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]" />
              </div>
            </div>
            <div className="flex gap-3 mt-4 justify-end">
              <button onClick={() => setMostrarForm(false)}
                className="border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs hover:bg-gray-100">
                Cancelar
              </button>
              <button onClick={guardarGasto} disabled={guardandoGasto || gValor <= 0}
                className="bg-[#00c9a7] text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[#00b396] disabled:opacity-50">
                {guardandoGasto ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        )}

        {gastos.length > 0 && (
          <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
            <div className="p-4 text-center">
              <div className="text-lg font-bold text-gray-800">{formatPesos(totalGastos)}</div>
              <div className="text-xs text-gray-400 mt-0.5">Total gastos</div>
            </div>
            <div className="p-4 text-center">
              <div className="text-lg font-bold text-red-600">{formatPesos(gastosDelNegocio)}</div>
              <div className="text-xs text-gray-400 mt-0.5">Salió del negocio</div>
            </div>
            <div className="p-4 text-center">
              <div className="text-lg font-bold text-blue-600">{formatPesos(gastosPersonalesPuros)}</div>
              <div className="text-xs text-gray-400 mt-0.5">Gastos propios</div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">FECHA</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">DESCRIPCIÓN</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">CATEGORÍA</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">VALOR</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">¿DEL NEGOCIO?</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {gastos.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-gray-400">
                  <div className="text-3xl mb-2">📭</div>
                  Sin gastos personales este mes
                </td></tr>
              ) : (
                gastos.map((g) => (
                  <tr key={g.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-gray-600">
                      {new Date(g.fecha + 'T00:00:00').toLocaleDateString('es-CO')}
                    </td>
                    <td className="py-3 px-4 text-gray-700">{g.descripcion || '—'}</td>
                    <td className="py-3 px-4 text-gray-500 text-xs">{g.categoria}</td>
                    <td className="py-3 px-4 font-semibold text-gray-800">{formatPesos(g.valor)}</td>
                    <td className="py-3 px-4 text-center">
                      {g.salio_del_negocio
                        ? <span className="text-xs text-red-600 font-medium">⚠️ Del negocio</span>
                        : <span className="text-xs text-gray-400">Personal</span>}
                    </td>
                    <td className="py-3 px-4">
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

      {gastosDelNegocio > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-700">
          ⚠️ <strong>{formatPesos(gastosDelNegocio)}</strong> de tus gastos personales salieron del negocio este mes.
          Recuerda registrarlos también en la sección de <strong>Gastos</strong> del negocio para que el P&G sea correcto.
        </div>
      )}

    </div>
  )
}
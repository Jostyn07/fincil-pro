'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/src/app/lib/supabase'
import Image from 'next/image'

type Configuracion = {
  nombre_negocio: string
  telefono: string
  ciudad: string
  logo_url: string
}

export default function Configuracion() {

  const [config, setConfig] = useState<Configuracion>({
    nombre_negocio: '',
    telefono: '',
    ciudad: '',
    logo_url: '',
  })
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito] = useState(false)
  const [usuarioId, setUsuarioId] = useState<string | null>(null)
  const [subiendoLogo, setSubiendoLogo] = useState(false)

  useEffect(() => {
    async function cargar() {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return
      setUsuarioId(userData.user.id)

      const { data } = await supabase
        .from('usuarios')
        .select('nombre_negocio, telefono, ciudad, logo_url')
        .eq('id', userData.user.id)
        .single()

      if (data) setConfig(data)
      setCargando(false)
    }
    cargar()
  }, [])

  async function subirLogo(archivo: File) {
    if (!usuarioId) return
    setSubiendoLogo(true)

    const extension = archivo.name.split('.').pop()
    const ruta = `logos/${usuarioId}.${extension}`

    const { error } = await supabase.storage
      .from('logos')
      .upload(ruta, archivo, { upsert: true })

    if (!error) {
      const { data: urlData } = supabase.storage
        .from('logos')
        .getPublicUrl(ruta)
      setConfig(prev => ({ ...prev, logo_url: urlData.publicUrl }))
    }
    setSubiendoLogo(false)
  }

  async function guardar() {
    if (!usuarioId) return
    setGuardando(true)
    setExito(false)

    await supabase
      .from('usuarios')
      .update({
        nombre_negocio: config.nombre_negocio,
        telefono: config.telefono,
        ciudad: config.ciudad,
        logo_url: config.logo_url,
      })
      .eq('id', usuarioId)

    setGuardando(false)
    setExito(true)
    setTimeout(() => setExito(false), 3000)
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        Cargando configuración...
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto">

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">⚙️ Configuración</h1>
        <p className="text-gray-500 text-sm mt-1">Datos de tu negocio</p>
      </div>

      <div className="space-y-5">

        {/* Logo */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-4">🖼️ Logo del negocio</h2>

          <div className="flex items-center gap-5">
            {/* Preview */}
            <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden flex-shrink-0">
              {config.logo_url ? (
                <Image
                    src={config.logo_url}
                    alt="Logo"
                    width={80}
                    height={80}
                    className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-3xl">🏪</span>
              )}
            </div>

            <div className="flex-1">
              <label className="block">
                <span className="sr-only">Subir logo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const archivo = e.target.files?.[0]
                    if (archivo) subirLogo(archivo)
                  }}
                  className="block w-full text-sm text-gray-500
                    file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0
                    file:text-sm file:font-medium file:bg-[#0f1e35] file:text-white
                    hover:file:bg-[#162740] cursor-pointer"
                />
              </label>
              <p className="text-xs text-gray-400 mt-2">
                {subiendoLogo ? '⏳ Subiendo...' : 'PNG, JPG o SVG. Máximo 2MB.'}
              </p>
              {config.logo_url && (
                <button
                  onClick={() => setConfig(prev => ({ ...prev, logo_url: '' }))}
                  className="text-xs text-red-400 hover:text-red-600 mt-1"
                >
                  Eliminar logo
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Datos del negocio */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-4">🏢 Datos del negocio</h2>
          <div className="space-y-4">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del negocio
              </label>
              <input
                type="text"
                value={config.nombre_negocio}
                onChange={(e) => setConfig(prev => ({ ...prev, nombre_negocio: e.target.value }))}
                placeholder="Ej: Pastelería Dulce Hogar"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono de contacto
              </label>
              <input
                type="tel"
                value={config.telefono}
                onChange={(e) => setConfig(prev => ({ ...prev, telefono: e.target.value }))}
                placeholder="300 123 4567"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ciudad
              </label>
              <input
                type="text"
                value={config.ciudad}
                onChange={(e) => setConfig(prev => ({ ...prev, ciudad: e.target.value }))}
                placeholder="Barranquilla"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c9a7]"
              />
            </div>

          </div>
        </div>

        {/* Botón guardar */}
        <div className="flex items-center gap-3 justify-end">
          {exito && (
            <span className="text-sm text-green-600 font-medium">
              ✅ Guardado correctamente
            </span>
          )}
          <button
            onClick={guardar}
            disabled={guardando}
            className="bg-[#0f1e35] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#162740] transition-colors disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>

      </div>
    </div>
  )
}
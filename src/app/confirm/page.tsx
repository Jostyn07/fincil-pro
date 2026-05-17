'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/app/lib/supabase'

export default function Confirm() {
  const router = useRouter()
  const [mensaje, setMensaje] = useState('Verificando tu cuenta...')
  const [error, setError] = useState('')

  useEffect(() => {
    async function verificar() {
      const { data, error } = await supabase.auth.getSession()

      if (error || !data.session) {
        setError('El enlace es inválido o ya expiró. Intenta registrarte de nuevo.')
        return
      }

      // Registrar aceptación de términos si no existe
      const { data: terminosExistentes } = await supabase
        .from('aceptacion_terminos')
        .select('id')
        .eq('usuario_id', data.session.user.id)
        .maybeSingle()

      if (!terminosExistentes) {
        await supabase.from('aceptacion_terminos').insert({
          usuario_id: data.session.user.id,
          version: 'v1.0-2026-05',
          user_agent: navigator.userAgent,
        })
      }

      setMensaje('¡Cuenta verificada! Redirigiendo...')
      setTimeout(() => router.push('/dashboard'), 1500)
    }

    verificar()
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 w-full max-w-md text-center">
        {error ? (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Enlace inválido</h2>
            <p className="text-gray-500 text-sm mb-6">{error}</p>
            <a href="/registro"
              className="bg-[#0f1e35] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#162740] transition-colors">
              Volver al registro
            </a>
          </>
        ) : (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">{mensaje}</h2>
            <p className="text-gray-400 text-sm">Espera un momento...</p>
          </>
        )}
      </div>
    </div>
  )
}
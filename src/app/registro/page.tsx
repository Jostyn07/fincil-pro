'use client'

import { useState } from 'react'
import { supabase } from '@/src/app/lib/supabase'
import Link from 'next/link'

export default function Registro() {

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [aceptoTerminos, setAceptoTerminos] = useState(false)

  async function handleRegistro() {
    setError('')

    if (!aceptoTerminos) {
      setError('Debes aceptar los Términos y Condiciones para continuar')
      return
    }

    // Verificar que las contraseñas coincidan
    if (password !== confirmar) {
      setError('Las contraseñas no coinciden')
      return
    }

    // Verificar longitud mínima
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setCargando(true)

    const { error } = await supabase.auth.signUp({
      email: email,
      password: password,
    })

    setCargando(false)

    if (error) {
      setError('No se pudo crear la cuenta. Verifica tu email.')
      return
    }

    // ← Registrar aceptación de términos
    const { data: userData } = await supabase.auth.getUser()
    if (userData.user) {
      await supabase.from('aceptacion_terminos').insert({
        usuario_id: userData.user.id,
        version: 'v1.0-2026-05',
        user_agent: navigator.userAgent,
      })
    }

    // Registro exitoso
    setExito(true)
  }

  // Pantalla de éxito
  if (exito) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            ¡Cuenta creada!
          </h2>
          <p className="text-gray-500 mb-6">
            Revisa tu correo y confirma tu cuenta para poder ingresar.
          </p>
          <Link href="/" className="block w-full bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 transition-colors text-center">
            Ir al login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">

        <div className="text-center mb-8">
          <div className="text-3xl font-bold text-gray-800">Fincil Pro</div>
          <p className="text-gray-500 mt-1">Crea tu cuenta</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contraseña
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirmar contraseña
          </label>
          <input
            type="password"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            placeholder="Repite tu contraseña"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mb-5 flex items-start gap-3">
          <input
            type="checkbox"
            id="terminos"
            checked={aceptoTerminos}
            onChange={(e) => setAceptoTerminos(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-blue-600 shrink-0"
          />
          <label htmlFor="terminos" className="text-sm text-gray-600 leading-snug">
            He leído y acepto los{' '}
            <a href="/terminos" target="_blank" className="text-blue-600 hover:underline font-medium">
              Términos y Condiciones, Política de Privacidad y Política de Cookies
            </a>
          </label>
        </div>

        <button
          onClick={handleRegistro}
          disabled={cargando || !aceptoTerminos}
          className="w-full bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 mb-4"
        >
          {cargando ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>

        <p className="text-center text-sm text-gray-500">
          ¿Ya tienes cuenta?{' '}
          <Link href="/" className="text-blue-600 hover:underline font-medium">
            Inicia sesión
          </Link>
        </p>

      </div>
    </div>
  )
}
'use client'

import { useState } from 'react'
import { supabase } from '@/src/app/lib/supabase'

export default function Login() {
  // Guardamos lo que el usuario escribe
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Guaramos mensajes de error o carga
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  // Esta funcion se ejecuta cuando el usario le da click en entrar
  async function handleLogin() {
    // Limpiamos erroes anteriores
    setError('')
    setCargando(true)

    // Le pedimos a supabase que verique el usuario
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    })

    setCargando(false)

    // Si Supabase devuelve un error, lo mostramos
    if (error) {
      setError('Email o contraseña incorrectos')
      return
    }
    window.location.href = '/dashboard'
  }

  return (
    <div className='min-h-screen bg-gray-100 flex items-center justify-center'>
      <div className='bg-white p-8 rounded-lg shadow-md w-full max-w-md'>
        {/* logo y titulo */}
        <div className="text-center mb-8">
          <div className="text-3xl font-bold text-gray-800">Fincil Pro</div>
          <p className='text-gray-500 mt-1'>Ingresa a tu cuenta</p>
        </div>

        {/* Mensaje de error */}
        {error && (
          <div className='bg-red-50 text-red-600 p-3 rounded-md mb-4 text-sm'>
            {error}
          </div>
        )}

        {/* Input de email */}
        <div className="mb-4">
          <label className='block text-sm font-medium text-gray-700 mb-1'>
            Email
          </label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder='josenicolas@email.com' className='w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500' />
        </div>

        {/* Input de contraseña */}
        <div className="mb-6">
          <label className='block text-sm font-medium text-gary-700 mb-1'>
            Contraseña
          </label>
          <input type="password" value={password} onChange={(e => setPassword(e.target.value))} placeholder='********' className='w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500' />
        </div>

        {/* Botón de login */}
        <button onClick={handleLogin} disabled={cargando} className='w-full bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 transition-colors disabled:opacity-50'>
          {cargando ? 'Entrando...' : 'Entrar'}
        </button>

        <p className='text-center text-sm text-gray-500 mt-4'>
          ¿No tienes cuenta?{' '}
          <a href="/registro" className='text-blue-600 hover:underline font-medium'>
          Registrate</a>
        </p>
      </div>
    </div>
  )
}
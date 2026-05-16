'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/src/app/lib/supabase'

// Lista de páginas del menú lateral
const navegacion = [
  { nombre: 'Dashboard',    href: '/dashboard',                 icono: '📊' },
  { nombre: 'Pedidos',      href: '/dashboard/pedidos',         icono: '📋' },
  { nombre: 'Inventario',   href: '/dashboard/inventario',      icono: '📦' },
  { nombre: 'Recetas',      href: '/dashboard/inventario/recetas',         icono: '🍳' },
  { nombre: 'Clientes',     href: '/dashboard/clientes',        icono: '👥' },
  { nombre: 'Finanzas',     href: '/dashboard/finanzas',        icono: '💰' },
  { nombre: 'Configuración',href: '/dashboard/configuracion',   icono: '⚙️' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {

  const pathname = usePathname()
  const [menuAbierto, setMenuAbierto] = useState(false)

  async function cerrarSesion() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const [nombreNegocio, setNombreNegocio] = useState('Mi Negocio')

  useEffect(() => {
    async function cargarNegocio() {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return
      const { data } = await supabase
        .from('usuarios')
        .select('nombre_negocio')
        .eq('id', userData.user.id)
        .single()
      if (data?.nombre_negocio) setNombreNegocio(data.nombre_negocio)
    }
    cargarNegocio()
  }, [])
  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* ── SIDEBAR ESCRITORIO ── */}
      <aside className="hidden md:flex flex-col w-64 bg-[#0f1e35] min-h-screen fixed left-0 top-0">

        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <div className="text-white font-bold text-xl tracking-wide">
            Fincil <span className="text-[#00c9a7]">Pro</span>
          </div>
          <div className="text-white/40 text-xs mt-1 truncate">{nombreNegocio}</div>
        </div>

        

        {/* Navegación */}
        <nav className="flex-1 p-4 space-y-1">
          {navegacion.map((item) => {
            const activo = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  activo
                    ? 'bg-[#00c9a7] text-[#0f1e35]'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="text-base">{item.icono}</span>
                {item.nombre}
              </Link>
            )
          })}
        </nav>

        {/* Cerrar sesión */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={cerrarSesion}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors w-full"
          >
            <span>🚪</span>
            Cerrar sesión
          </button>
        </div>

      </aside>

      {/* ── ÁREA PRINCIPAL ── */}
      <div className="flex-1 md:ml-64">

        {/* Navbar móvil */}
        <header className="md:hidden bg-[#0f1e35] px-4 py-3 flex items-center justify-between">
          <div className="text-white font-bold">
            Fincil <span className="text-[#00c9a7]">Pro</span>
          </div>
          <button
            onClick={() => setMenuAbierto(!menuAbierto)}
            className="text-white text-2xl"
          >
            {menuAbierto ? '✕' : '☰'}
          </button>
        </header>

        {/* Menú móvil desplegable */}
        {menuAbierto && (
          <div className="md:hidden bg-[#0f1e35] px-4 pb-4 space-y-1">
            {navegacion.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuAbierto(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                <span>{item.icono}</span>
                {item.nombre}
              </Link>
            ))}
            <button
              onClick={cerrarSesion}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors w-full"
            >
              <span>🚪</span>
              Cerrar sesión
            </button>
          </div>
        )}

        {/* Contenido de la página */}
        <main className="p-6">
          {children}
        </main>

      </div>
    </div>
  )
}
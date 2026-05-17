'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/app/lib/supabase'

const VERSION_TERMINOS = 'v1.0-2026-05'

export default function Terminos() {

  const router = useRouter()
  const [usuarioId, setUsuarioId] = useState<string | null>(null)
  const [aceptando, setAceptando] = useState(false)
  const [llegóAlFinal, setLlegóAlFinal] = useState(false)
  const contenidoRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function verificar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      // Si ya aceptó, ir al dashboard
      const { data } = await supabase
        .from('aceptacion_terminos')
        .select('id')
        .eq('usuario_id', user.id)
        .maybeSingle()
      if (data) { router.push('/dashboard'); return }

      setUsuarioId(user.id)
    }
    verificar()
  }, [router])

  function handleScroll() {
    const el = contenidoRef.current
    if (!el) return
    const llegó = el.scrollTop + el.clientHeight >= el.scrollHeight - 40
    if (llegó) setLlegóAlFinal(true)
  }

  async function aceptarTerminos() {
    if (!usuarioId) return
    setAceptando(true)
    await supabase.from('aceptacion_terminos').insert({
      usuario_id: usuarioId,
      version: VERSION_TERMINOS,
      user_agent: navigator.userAgent,
    })
    router.push('/dashboard')
  }

  async function rechazarTerminos() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (!usuarioId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Header */}
      <header className="bg-[#0f1e35] px-6 py-4 flex items-center justify-between">
        <div className="text-white font-bold text-lg">
          Fincil <span className="text-[#00c9a7]">Pro</span>
        </div>
        <div className="text-white/50 text-xs">Paso final antes de ingresar</div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-start py-8 px-4">
        <div className="w-full max-w-3xl">

          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Términos, Condiciones y Privacidad</h1>
            <p className="text-gray-500 text-sm mt-2">
              Lee el documento completo. El botón de aceptar se habilita al llegar al final.
            </p>
          </div>

          {/* Documento scrolleable */}
          <div
            ref={contenidoRef}
            onScroll={handleScroll}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 h-[60vh] overflow-y-auto text-sm text-gray-700 leading-relaxed space-y-6"
          >

            {/* ── 1. TÉRMINOS Y CONDICIONES ── */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-1">1. Términos y Condiciones de Uso</h2>
              <p className="text-xs text-gray-400 mb-4">Última actualización: Mayo de 2026</p>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">1.1 Identificación del prestador</h3>
                  <p>Toolkap es una marca de productos digitales operada por su propietario con correo de contacto <strong>toolkapcorp@gmail.com</strong>, con domicilio en Barranquilla, Colombia.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">1.2 Aceptación de los términos</h3>
                  <p>Al registrarse, acceder o usar Fincil Pro (en adelante "el Servicio"), el usuario acepta estos Términos y Condiciones en su totalidad. Si no está de acuerdo, debe abstenerse de usar el Servicio.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">1.3 Descripción del servicio</h3>
                  <p className="mb-2">Fincil Pro es una plataforma web de gestión empresarial para emprendedores y pequeños negocios. Incluye módulos de:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                    <li>Control de inventario y materias primas</li>
                    <li>Gestión de pedidos y clientes</li>
                    <li>Registro de ingresos y gastos</li>
                    <li>Cálculo de punto de equilibrio</li>
                    <li>Módulo de recetas y costos de producción</li>
                    <li>Control financiero personal</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">1.4 Período de prueba gratuita</h3>
                  <p>Al registrarse, el usuario obtiene 3 días de acceso gratuito sin necesidad de ingresar datos de pago. Al vencer el período de prueba, el acceso queda suspendido hasta que se active una suscripción.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">1.5 Planes y precios</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left py-2 px-3 font-semibold text-gray-600">Plan</th>
                          <th className="text-left py-2 px-3 font-semibold text-gray-600">Precio</th>
                          <th className="text-left py-2 px-3 font-semibold text-gray-600">Facturación</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t border-gray-100">
                          <td className="py-2 px-3">Mensual</td>
                          <td className="py-2 px-3 font-medium">$10.000 COP</td>
                          <td className="py-2 px-3">Cada 30 días</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-gray-500">Los precios pueden cambiar con previo aviso de 15 días calendario al correo registrado.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">1.6 Pago y renovación automática</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                    <li>El cobro se realiza a través de <strong>Wompi</strong>, pasarela de pagos de Bancolombia.</li>
                    <li>La suscripción se renueva automáticamente cada 30 días.</li>
                    <li>El usuario autoriza expresamente el cobro recurrente al activar su suscripción.</li>
                    <li>Toolkap no almacena datos de tarjetas de crédito — estos son manejados exclusivamente por Wompi.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">1.7 Cancelación</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                    <li>El usuario puede cancelar su suscripción en cualquier momento desde la configuración de su cuenta.</li>
                    <li>Al cancelar, el acceso se mantiene hasta el final del período ya pagado.</li>
                    <li>No se realizan reembolsos por períodos parciales.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">1.8 Derecho de retracto</h3>
                  <p>De conformidad con la Ley 1480 de 2011 (Estatuto del Consumidor de Colombia), el usuario tiene derecho a retractarse dentro de los 5 días hábiles siguientes a la activación de su suscripción paga. Para ejercer este derecho debe escribir a <strong>toolkapcorp@gmail.com</strong>. Una vez ejercido el retracto, se reembolsará el valor pagado dentro de los 30 días siguientes.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">1.9 Obligaciones del usuario</h3>
                  <p className="mb-1">El usuario se compromete a:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                    <li>Proporcionar información veraz al registrarse</li>
                    <li>No compartir su cuenta con terceros</li>
                    <li>No usar el Servicio para actividades ilegales</li>
                    <li>No intentar vulnerar la seguridad de la plataforma</li>
                    <li>No realizar ingeniería inversa sobre el software</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">1.10 Propiedad intelectual</h3>
                  <p>El código, diseño, marca y contenido de Fincil Pro son propiedad exclusiva de Toolkap. Los datos ingresados por el usuario son propiedad del usuario.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">1.11 Disponibilidad del servicio</h3>
                  <p>Toolkap no garantiza disponibilidad ininterrumpida del Servicio. Se realizarán esfuerzos razonables para mantener una disponibilidad del 99%. Las interrupciones por mantenimiento serán notificadas con anticipación cuando sea posible.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">1.12 Limitación de responsabilidad</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                    <li>Fincil Pro es una herramienta de apoyo para la gestión empresarial.</li>
                    <li>Las decisiones financieras, contables o de negocio tomadas con base en la información registrada en la plataforma son responsabilidad exclusiva del usuario.</li>
                    <li>Toolkap no es responsable por pérdidas económicas derivadas del uso o mal uso del Servicio.</li>
                    <li>Toolkap no presta servicios de asesoría contable, financiera o legal.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">1.13 Modificaciones</h3>
                  <p>Toolkap se reserva el derecho de modificar estos Términos en cualquier momento. Los cambios serán notificados al correo registrado con al menos 15 días de anticipación. El uso continuado del Servicio después de la notificación implica aceptación de los cambios.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">1.14 Terminación</h3>
                  <p>Toolkap puede suspender o terminar el acceso de un usuario que incumpla estos Términos, sin previo aviso y sin derecho a reembolso.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">1.15 Ley aplicable y jurisdicción</h3>
                  <p>Estos Términos se rigen por las leyes de la República de Colombia. Cualquier controversia será resuelta ante los jueces competentes de la ciudad de Barranquilla, Colombia.</p>
                </div>
              </div>
            </section>

            {/* ── 2. POLÍTICA DE PRIVACIDAD ── */}
            <section className="pt-4 border-t border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 mb-1">2. Política de Privacidad y Tratamiento de Datos Personales</h2>
              <p className="text-xs text-gray-400 mb-4">Última actualización: Mayo de 2026</p>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">2.1 Responsable del tratamiento</h3>
                  <p>Toolkap — toolkapcorp@gmail.com — Barranquilla, Colombia.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">2.2 Marco legal</h3>
                  <p>Esta política se rige por la Ley 1581 de 2012 (Ley de Protección de Datos Personales de Colombia), el Decreto 1377 de 2013 y las normas que los complementen o modifiquen.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">2.3 Datos que recolectamos</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left py-2 px-3 font-semibold text-gray-600">Dato</th>
                          <th className="text-left py-2 px-3 font-semibold text-gray-600">Finalidad</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {[
                          ['Nombre y correo electrónico', 'Creación y gestión de la cuenta'],
                          ['Ciudad', 'Personalización del servicio'],
                          ['Datos de pago (procesados por Wompi)', 'Facturación — no los almacenamos'],
                          ['Datos del negocio (ingresos, gastos, pedidos, inventario)', 'Prestación del servicio'],
                          ['Dirección IP y datos de uso', 'Seguridad y mejora del servicio'],
                        ].map(([dato, fin]) => (
                          <tr key={dato}>
                            <td className="py-2 px-3 text-gray-700">{dato}</td>
                            <td className="py-2 px-3 text-gray-500">{fin}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">2.4 Finalidades del tratamiento</h3>
                  <p className="mb-1">Los datos personales serán usados para:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                    <li>Crear y gestionar la cuenta del usuario</li>
                    <li>Prestar el Servicio contratado</li>
                    <li>Enviar notificaciones sobre el Servicio</li>
                    <li>Mejorar la plataforma mediante análisis de uso agregado</li>
                    <li>Cumplir obligaciones legales</li>
                  </ul>
                  <p className="mt-2 text-gray-500">No vendemos, alquilamos ni compartimos datos personales con terceros para fines comerciales.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">2.5 Datos del negocio</h3>
                  <p>Los datos que el usuario ingresa sobre su negocio (pedidos, clientes, ingresos, gastos, inventario) son de su exclusiva propiedad. Toolkap los almacena únicamente para prestar el Servicio y no los analiza individualmente ni los comparte con terceros.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">2.6 Terceros que acceden a datos</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left py-2 px-3 font-semibold text-gray-600">Tercero</th>
                          <th className="text-left py-2 px-3 font-semibold text-gray-600">Propósito</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {[
                          ['Supabase', 'Almacenamiento de datos en la nube'],
                          ['Wompi (Bancolombia)', 'Procesamiento de pagos'],
                          ['Vercel', 'Hosting de la aplicación'],
                        ].map(([tercero, prop]) => (
                          <tr key={tercero}>
                            <td className="py-2 px-3 font-medium text-gray-700">{tercero}</td>
                            <td className="py-2 px-3 text-gray-500">{prop}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-gray-500">Estos proveedores tienen sus propias políticas de privacidad y están sujetos a acuerdos de confidencialidad.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">2.7 Tiempo de conservación</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                    <li>Los datos se conservan mientras la cuenta esté activa.</li>
                    <li>Al cancelar la cuenta, los datos se eliminan dentro de los 30 días siguientes a la solicitud.</li>
                    <li>Algunos datos pueden conservarse por obligaciones legales hasta por 5 años.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">2.8 Derechos del titular</h3>
                  <p className="mb-1">De conformidad con la Ley 1581 de 2012, el usuario tiene derecho a:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                    <li>Conocer los datos que tenemos sobre él</li>
                    <li>Actualizar sus datos personales</li>
                    <li>Rectificar datos incorrectos</li>
                    <li>Suprimir sus datos (derecho al olvido)</li>
                    <li>Revocar la autorización de tratamiento</li>
                  </ul>
                  <p className="mt-2">Para ejercer estos derechos escribir a: <strong>toolkapcorp@gmail.com</strong>. Tiempo de respuesta: máximo 10 días hábiles.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">2.9 Seguridad de los datos</h3>
                  <p className="mb-1">Toolkap implementa medidas técnicas y organizativas para proteger los datos:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                    <li>Cifrado SSL/TLS en todas las comunicaciones</li>
                    <li>Autenticación segura mediante Supabase Auth</li>
                    <li>Políticas de acceso por fila (Row Level Security) — cada usuario solo ve sus propios datos</li>
                    <li>Backups periódicos</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">2.10 Autorización</h3>
                  <p>Al registrarse en Fincil Pro, el usuario autoriza expresamente el tratamiento de sus datos personales según esta Política de Privacidad.</p>
                </div>
              </div>
            </section>

            {/* ── 3. POLÍTICA DE COOKIES ── */}
            <section className="pt-4 border-t border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 mb-1">3. Política de Cookies</h2>
              <p className="text-xs text-gray-400 mb-4">Última actualización: Mayo de 2026</p>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">3.1 ¿Qué son las cookies?</h3>
                  <p>Las cookies son pequeños archivos de texto que se almacenan en el dispositivo del usuario cuando visita un sitio web.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">3.2 Cookies que usamos</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left py-2 px-3 font-semibold text-gray-600">Cookie</th>
                          <th className="text-left py-2 px-3 font-semibold text-gray-600">Tipo</th>
                          <th className="text-left py-2 px-3 font-semibold text-gray-600">Finalidad</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        <tr>
                          <td className="py-2 px-3">Sesión de Supabase</td>
                          <td className="py-2 px-3">Necesaria</td>
                          <td className="py-2 px-3 text-gray-500">Mantener la sesión del usuario activa</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3">Preferencias de UI</td>
                          <td className="py-2 px-3">Funcional</td>
                          <td className="py-2 px-3 text-gray-500">Recordar configuraciones del usuario</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">3.3 Cookies de terceros</h3>
                  <p>Fincil Pro no utiliza cookies de seguimiento, publicidad o análisis de comportamiento de terceros.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">3.4 Control de cookies</h3>
                  <p>El usuario puede configurar su navegador para rechazar cookies, pero esto puede afectar el funcionamiento del Servicio. La sesión de autenticación depende de cookies necesarias.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">3.5 Consentimiento</h3>
                  <p>Al usar Fincil Pro, el usuario acepta el uso de las cookies descritas en esta política.</p>
                </div>
              </div>
            </section>

            {/* ── 4. POLÍTICA DE REEMBOLSOS ── */}
            <section className="pt-4 border-t border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 mb-1">4. Política de Reembolsos</h2>
              <p className="text-xs text-gray-400 mb-4">Última actualización: Mayo de 2026</p>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">4.1 Período de prueba</h3>
                  <p>Los 3 días de prueba gratuita no generan cobro. No aplica reembolso.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">4.2 Suscripción mensual</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                    <li>No se realizan reembolsos por períodos parciales del mes.</li>
                    <li>Si el usuario ejerce el derecho de retracto dentro de los 5 días hábiles siguientes al primer pago, se reembolsa el 100% del valor.</li>
                    <li>Fallas técnicas imputables a Toolkap que impidan el uso del Servicio por más de 72 horas continuas darán derecho a un crédito proporcional.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">4.3 Solicitudes</h3>
                  <p>Escribir a <strong>toolkapcorp@gmail.com</strong> con el asunto "Solicitud de reembolso" indicando el motivo y los datos de la cuenta.</p>
                </div>
              </div>
            </section>

            {/* Firma */}
            <div className="pt-4 border-t border-gray-100 text-center text-xs text-gray-400">
              Toolkap SAS · toolkapcorp@gmail.com · Barranquilla, Colombia · Versión {VERSION_TERMINOS}
            </div>

          </div>

          {/* Indicador de scroll */}
          {!llegóAlFinal && (
            <div className="text-center text-xs text-gray-400 mt-3 animate-pulse">
              Desplázate hasta el final para habilitar el botón de aceptar ↓
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={rechazarTerminos}
              className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              No acepto — cerrar sesión
            </button>
            <button
              onClick={aceptarTerminos}
              disabled={!llegóAlFinal || aceptando}
              className="flex-1 bg-[#00c9a7] text-white py-3 rounded-xl text-sm font-semibold hover:bg-[#00b396] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {aceptando ? 'Guardando...' : 'Acepto los términos y condiciones'}
            </button>
          </div>

          <p className="text-center text-xs text-gray-400 mt-3">
            Al aceptar, queda registrado el consentimiento con fecha, hora y dispositivo.
          </p>

        </div>
      </div>
    </div>
  )
}

"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, ArrowLeft, FileText, Users, CreditCard, Shield } from "lucide-react"
import Link from "next/link"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/auth" className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-slate-900 rounded-xl">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">ComercioFlow</h1>
              <p className="text-xs text-slate-600">comercioflow.com.ar</p>
            </div>
          </Link>
          <Link href="/auth">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al inicio
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-50 to-blue-50 py-16 sm:py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="mb-6 text-4xl font-bold text-slate-900 sm:text-5xl">Términos de Servicio</h1>
          <p className="mx-auto max-w-3xl text-lg leading-relaxed text-slate-600 sm:text-xl">
            Estos términos establecen las reglas y condiciones para el uso de ComercioFlow. Por favor, léelos
            cuidadosamente antes de usar nuestros servicios.
          </p>
          <p className="mt-4 text-sm text-slate-500">Última actualización: Enero 2024</p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 sm:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Introduction */}
            <Card className="border-0 shadow-lg">
              <CardContent className="pt-8">
                <h2 className="mb-4 text-2xl font-bold text-slate-900">1. Aceptación de los términos</h2>
                <p className="mb-4 leading-relaxed text-slate-600">
                  Al acceder y usar ComercioFlow, aceptas estar sujeto a estos Términos de Servicio y todas las leyes y
                  regulaciones aplicables. Si no estás de acuerdo con alguno de estos términos, no debes usar nuestros
                  servicios.
                </p>
                <p className="leading-relaxed text-slate-600">
                  Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios entrarán en
                  vigor inmediatamente después de su publicación en nuestro sitio web.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-2xl">2. Descripción del servicio</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="mb-4 leading-relaxed text-slate-600">
                  ComercioFlow es una plataforma de gestión empresarial diseñada para negocios de servicios. Ofrecemos
                  herramientas para:
                </p>
                <ul className="mb-4 space-y-2 text-slate-600">
                  <li>• Gestión de citas y calendario</li>
                  <li>• Administración de clientes</li>
                  <li>• Procesamiento de pagos</li>
                  <li>• Generación de reportes</li>
                  <li>• Marketing automatizado</li>
                  <li>• Gestión de empleados</li>
                </ul>
                <p className="leading-relaxed text-slate-600">
                  Nos esforzamos por mantener el servicio disponible 24/7, pero no garantizamos un tiempo de actividad
                  del 100%. Podemos realizar mantenimientos programados con previo aviso.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                  <CardTitle className="text-2xl">3. Cuentas de usuario</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="mb-4 leading-relaxed text-slate-600">
                  Para usar ComercioFlow, debes crear una cuenta proporcionando información precisa y completa. Eres
                  responsable de:
                </p>
                <ul className="mb-4 space-y-2 text-slate-600">
                  <li>• Mantener la confidencialidad de tu contraseña</li>
                  <li>• Todas las actividades que ocurran bajo tu cuenta</li>
                  <li>• Notificarnos inmediatamente sobre cualquier uso no autorizado</li>
                  <li>• Proporcionar información veraz y actualizada</li>
                </ul>
                <p className="leading-relaxed text-slate-600">
                  Nos reservamos el derecho de suspender o terminar cuentas que violen estos términos o que sean
                  utilizadas para actividades fraudulentas o ilegales.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-purple-600" />
                  </div>
                  <CardTitle className="text-2xl">4. Pagos y facturación</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="mb-4 leading-relaxed text-slate-600">
                  Los planes de pago se facturan mensualmente por adelantado. Al suscribirte a un plan de pago:
                </p>
                <ul className="mb-4 space-y-2 text-slate-600">
                  <li>• Autorizas cargos recurrentes a tu método de pago</li>
                  <li>• Los precios están sujetos a cambios con 30 días de aviso</li>
                  <li>• No ofrecemos reembolsos por períodos parciales</li>
                  <li>• Puedes cancelar tu suscripción en cualquier momento</li>
                </ul>
                <p className="leading-relaxed text-slate-600">
                  Si tu pago falla, intentaremos cobrarlo nuevamente. Si no podemos procesar el pago después de varios
                  intentos, tu cuenta puede ser suspendida hasta que se resuelva el problema de pago.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="pt-8">
                <h2 className="mb-4 text-2xl font-bold text-slate-900">5. Uso aceptable</h2>
                <p className="mb-4 leading-relaxed text-slate-600">Al usar ComercioFlow, te comprometes a no:</p>
                <ul className="mb-4 space-y-2 text-slate-600">
                  <li>• Usar el servicio para actividades ilegales o no autorizadas</li>
                  <li>• Intentar acceder a cuentas de otros usuarios</li>
                  <li>• Interferir con el funcionamiento del servicio</li>
                  <li>• Enviar spam o contenido malicioso</li>
                  <li>• Violar derechos de propiedad intelectual</li>
                  <li>• Realizar ingeniería inversa del software</li>
                </ul>
                <p className="leading-relaxed text-slate-600">
                  Nos reservamos el derecho de investigar y tomar medidas legales apropiadas contra cualquier uso que
                  viole estos términos.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Shield className="w-6 h-6 text-orange-600" />
                  </div>
                  <CardTitle className="text-2xl">6. Limitación de responsabilidad</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="mb-4 leading-relaxed text-slate-600">
                  {`ComercioFlow se proporciona "tal cual" y no garantizamos que el servicio sea ininterrumpido o libre de errores.`}
                </p>
                <ul className="mb-4 space-y-2 text-slate-600">
                  <li>• Daños indirectos, incidentales o consecuentes</li>
                  <li>• Pérdida de datos, ganancias o oportunidades comerciales</li>
                  <li>• Interrupciones del servicio o errores técnicos</li>
                  <li>• Acciones de terceros o fuerza mayor</li>
                </ul>
                <p className="leading-relaxed text-slate-600">
                  Nuestra responsabilidad total no excederá el monto pagado por el servicio en los 12 meses anteriores.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="pt-8">
                <h2 className="mb-4 text-2xl font-bold text-slate-900">7. Terminación</h2>
                <p className="mb-4 leading-relaxed text-slate-600">
                  Puedes cancelar tu cuenta en cualquier momento desde la configuración de tu perfil. Al cancelar:
                </p>
                <ul className="mb-4 space-y-2 text-slate-600">
                  <li>• Tu acceso terminará al final del período de facturación actual</li>
                  <li>• Tus datos se conservarán por 30 días para posible reactivación</li>
                  <li>• Después de 30 días, los datos se eliminarán permanentemente</li>
                  <li>• Puedes solicitar una copia de tus datos antes de la eliminación</li>
                </ul>
                <p className="leading-relaxed text-slate-600">
                  Nos reservamos el derecho de terminar cuentas que violen estos términos con o sin previo aviso.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="pt-8">
                <h2 className="mb-4 text-2xl font-bold text-slate-900">8. Ley aplicable</h2>
                <p className="mb-4 leading-relaxed text-slate-600">
                  Estos términos se rigen por las leyes de la República Argentina. Cualquier disputa será resuelta en
                  los tribunales competentes de la Ciudad Autónoma de Buenos Aires.
                </p>
                <p className="leading-relaxed text-slate-600">
                  Si alguna disposición de estos términos se considera inválida, las disposiciones restantes
                  permanecerán en pleno vigor y efecto.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="pt-8">
                <h2 className="mb-4 text-2xl font-bold text-slate-900">9. Contacto</h2>
                <p className="mb-4 leading-relaxed text-slate-600">
                  Si tienes preguntas sobre estos Términos de Servicio, puedes contactarnos:
                </p>
                <div className="space-y-2 text-slate-600">
                  <p>• Email: legal@comercioflow.com.ar</p>
                  <p>• Teléfono: +54 11 4000-0000</p>
                  <p>• Dirección: Buenos Aires, Argentina</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-slate-900 py-16 text-white sm:py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">¿Listo para comenzar?</h2>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-slate-300 sm:text-xl">
            Al crear tu cuenta, aceptas estos términos y puedes comenzar a usar ComercioFlow inmediatamente.
          </p>
          <Link href="/auth">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-4">
              Crear cuenta gratis
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}

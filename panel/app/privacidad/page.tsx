"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, ArrowLeft, Shield, Eye, Lock, Database } from "lucide-react"
import Link from "next/link"

export default function PrivacyPage() {
  const sections = [
    {
      icon: Eye,
      title: "Información que recopilamos",
      content: [
        "Información de cuenta: nombre, email, teléfono y datos de facturación",
        "Información del negocio: nombre, dirección, tipo de servicios",
        "Datos de uso: cómo interactúas con nuestra plataforma",
        "Información técnica: dirección IP, tipo de navegador, dispositivo",
      ],
    },
    {
      icon: Database,
      title: "Cómo usamos tu información",
      content: [
        "Proporcionar y mejorar nuestros servicios",
        "Procesar pagos y transacciones",
        "Enviar comunicaciones importantes sobre tu cuenta",
        "Personalizar tu experiencia en la plataforma",
        "Cumplir con obligaciones legales y regulatorias",
      ],
    },
    {
      icon: Shield,
      title: "Protección de datos",
      content: [
        "Encriptación SSL/TLS para todas las transmisiones de datos",
        "Servidores seguros con acceso restringido",
        "Copias de seguridad automáticas y cifradas",
        "Auditorías de seguridad regulares",
        "Cumplimiento con estándares internacionales de seguridad",
      ],
    },
    {
      icon: Lock,
      title: "Tus derechos",
      content: [
        "Acceder a tu información personal",
        "Corregir datos inexactos o incompletos",
        "Solicitar la eliminación de tus datos",
        "Portabilidad de datos a otros servicios",
        "Retirar el consentimiento en cualquier momento",
      ],
    },
  ]

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
          <h1 className="mb-6 text-4xl font-bold text-slate-900 sm:text-5xl">Política de Privacidad</h1>
          <p className="mx-auto max-w-3xl text-lg leading-relaxed text-slate-600 sm:text-xl">
            En ComercioFlow, proteger tu privacidad y la de tus clientes es nuestra prioridad. Conoce cómo recopilamos,
            usamos y protegemos tu información.
          </p>
          <p className="mt-4 text-sm text-slate-500">Última actualización: Enero 2024</p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 sm:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* Introduction */}
            <Card className="mb-12 border-0 shadow-lg">
              <CardContent className="pt-8">
                <h2 className="mb-4 text-2xl font-bold text-slate-900">Introducción</h2>
                <p className="mb-4 leading-relaxed text-slate-600">
                  {`ComercioFlow ("nosotros", "nuestro" o "la empresa") se compromete a proteger y respetar tu privacidad.
            Esta Política de Privacidad explica cómo recopilamos, usamos, divulgamos y protegemos tu información
            cuando utilizas nuestros servicios.`}
                </p>
                <p className="leading-relaxed text-slate-600">
                  {`Al usar ComercioFlow, aceptas las prácticas descritas en esta política. Si no estás de acuerdo con
            algún aspecto de esta política, por favor no uses nuestros servicios.`}
                </p>
              </CardContent>
            </Card>

            {/* Sections */}
            <div className="space-y-8">
              {sections.map((section, index) => (
                <Card key={index} className="border-0 shadow-lg">
                  <CardHeader>
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <section.icon className="w-6 h-6 text-blue-600" />
                      </div>
                      <CardTitle className="text-2xl">{section.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {section.content.map((item, itemIndex) => (
                        <li key={itemIndex} className="flex items-start">
                          <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                          <span className="leading-relaxed text-slate-600">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Additional Sections */}
            <div className="space-y-8 mt-12">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl">Cookies y tecnologías similares</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 leading-relaxed text-slate-600">
                    Utilizamos cookies y tecnologías similares para mejorar tu experiencia, analizar el uso de nuestros
                    servicios y personalizar el contenido. Puedes controlar las cookies a través de la configuración de
                    tu navegador.
                  </p>
                  <p className="leading-relaxed text-slate-600">
                    Las cookies esenciales son necesarias para el funcionamiento básico de la plataforma y no pueden ser
                    desactivadas. Las cookies analíticas y de marketing pueden ser desactivadas sin afectar la
                    funcionalidad principal.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl">Compartir información con terceros</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 leading-relaxed text-slate-600">
                    No vendemos, alquilamos ni compartimos tu información personal con terceros para fines comerciales.
                    Solo compartimos información en las siguientes circunstancias:
                  </p>
                  <ul className="space-y-2 text-slate-600">
                    <li>• Con proveedores de servicios que nos ayudan a operar la plataforma</li>
                    <li>• Cuando sea requerido por ley o autoridades competentes</li>
                    <li>• Para proteger nuestros derechos, propiedad o seguridad</li>
                    <li>• Con tu consentimiento explícito</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl">Retención de datos</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 leading-relaxed text-slate-600">
                    Conservamos tu información personal solo durante el tiempo necesario para cumplir con los propósitos
                    descritos en esta política, a menos que la ley requiera o permita un período de retención más largo.
                  </p>
                  <p className="leading-relaxed text-slate-600">
                    Cuando solicites la eliminación de tu cuenta, eliminaremos tu información personal dentro de 30
                    días, excepto la información que debemos conservar por obligaciones legales o contables.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl">Contacto</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 leading-relaxed text-slate-600">
                    Si tienes preguntas sobre esta Política de Privacidad o sobre cómo manejamos tu información
                    personal, puedes contactarnos:
                  </p>
                  <div className="space-y-2 text-slate-600">
                    <p>• Email: privacidad@comercioflow.com.ar</p>
                    <p>• Teléfono: +54 11 4000-0000</p>
                    <p>• Dirección: Buenos Aires, Argentina</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-slate-900 py-16 text-white sm:py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">¿Tienes preguntas sobre privacidad?</h2>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-slate-300 sm:text-xl">
            Nuestro equipo está disponible para aclarar cualquier duda sobre cómo protegemos tu información.
          </p>
          <Link href="/contacto">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-4">
              Contactar equipo de privacidad
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}

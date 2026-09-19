"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Building2, Users, Target, Award, ArrowLeft } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export default function AboutPage() {
  const team = [
    {
      name: "Juan Carlos Mendoza",
      role: "CEO & Fundador",
      description: "15 años de experiencia en tecnología y gestión empresarial.",
      image: "/placeholder.svg?height=200&width=200",
    },
    {
      name: "María Elena Rodríguez",
      role: "CTO",
      description: "Experta en desarrollo de software y arquitectura de sistemas.",
      image: "/placeholder.svg?height=200&width=200",
    },
    {
      name: "Diego Fernández",
      role: "Director de Producto",
      description: "Especialista en UX/UI y experiencia del usuario.",
      image: "/placeholder.svg?height=200&width=200",
    },
  ]

  const values = [
    {
      icon: Target,
      title: "Innovación",
      description:
        "Desarrollamos soluciones tecnológicas que realmente resuelven problemas reales de los negocios argentinos.",
    },
    {
      icon: Users,
      title: "Compromiso",
      description: "Estamos comprometidos con el éxito de cada uno de nuestros clientes y sus negocios.",
    },
    {
      icon: Award,
      title: "Calidad",
      description: "Ofrecemos productos de alta calidad con soporte técnico excepcional en español.",
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
          <h1 className="mb-6 text-4xl font-bold text-slate-900 sm:text-5xl">Sobre ComercioFlow</h1>
          <p className="mx-auto max-w-3xl text-lg leading-relaxed text-slate-600 sm:text-xl">
            Somos una empresa argentina dedicada a transformar la gestión de negocios de servicios a través de la
            tecnología.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 sm:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="mb-6 text-3xl font-bold text-slate-900 sm:text-4xl">Nuestra Misión</h2>
              <p className="text-lg leading-relaxed text-slate-600 sm:text-xl">
                Empoderar a los emprendedores y dueños de negocios de servicios en Argentina con herramientas
                tecnológicas que les permitan crecer, optimizar sus operaciones y brindar una mejor experiencia a sus
                clientes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              {values.map((value, index) => (
                <Card key={index} className="text-center border-0 shadow-lg">
                  <CardContent className="pt-8">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <value.icon className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="mb-3 text-xl font-semibold text-slate-900">{value.title}</h3>
                    <p className="leading-relaxed text-slate-600">{value.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="bg-slate-50 py-16 sm:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="mb-8 text-center text-3xl font-bold text-slate-900 sm:text-4xl">Nuestra Historia</h2>
            <div className="prose prose-lg mx-auto text-slate-600">
              <p className="text-xl leading-relaxed mb-6">
                ComercioFlow nació en 2020 cuando nuestro fundador, Juan Carlos Mendoza, se dio cuenta de que muchos
                negocios de servicios en Argentina estaban perdiendo oportunidades por no tener herramientas digitales
                adecuadas.
              </p>
              <p className="text-lg leading-relaxed mb-6">
                Después de trabajar con cientos de salones de belleza, barberías y spas, identificamos los principales
                desafíos: gestión manual de citas, pérdida de clientes por falta de seguimiento, y dificultades para
                aceptar pagos digitales.
              </p>
              <p className="text-lg leading-relaxed mb-6">
                Así nació ComercioFlow: una plataforma diseñada específicamente para el mercado argentino, que entiende
                las necesidades locales y ofrece soluciones prácticas y accesibles.
              </p>
              <p className="text-lg leading-relaxed">
                Hoy, más de 10,000 negocios confían en nosotros para gestionar sus operaciones diarias y hacer crecer
                sus ventas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 sm:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="mb-4 text-3xl font-bold text-slate-900 sm:text-4xl">Nuestro Equipo</h2>
            <p className="mx-auto max-w-2xl text-lg text-slate-600 sm:text-xl">
              Un equipo apasionado por la tecnología y comprometido con el éxito de los negocios argentinos.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {team.map((member, index) => (
              <Card key={index} className="text-center border-0 shadow-lg">
                <CardContent className="pt-8">
                  <Image
                    src={member.image || "/placeholder.svg"}
                    alt={member.name}
                    width={128}
                    height={128}
                    className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
                  />
                  <h3 className="mb-2 text-xl font-semibold text-slate-900">{member.name}</h3>
                  <p className="text-blue-600 font-medium mb-3">{member.role}</p>
                  <p className="leading-relaxed text-slate-600">{member.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-slate-900 py-16 text-white sm:py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">¿Quieres ser parte de nuestra historia?</h2>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-slate-300 sm:text-xl">
            Únete a miles de negocios que ya transformaron su gestión con ComercioFlow.
          </p>
          <Link href="/auth">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-4">
              Comenzar gratis
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}

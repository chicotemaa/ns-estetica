"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Building2, Mail, Phone, MapPin, Clock, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simular envío
    setTimeout(() => {
      setIsSubmitting(false)
      setSubmitted(true)
    }, 2000)
  }

  const contactInfo = [
    {
      icon: Mail,
      title: "Email",
      content: "hola@comercioflow.com.ar",
      description: "Respuesta en menos de 24 horas",
    },
    {
      icon: Phone,
      title: "Teléfono",
      content: "+54 11 4000-0000",
      description: "Lunes a Viernes de 9 a 18hs",
    },
    {
      icon: MapPin,
      title: "Oficina",
      content: "Buenos Aires, Argentina",
      description: "Palermo, CABA",
    },
    {
      icon: Clock,
      title: "Horarios",
      content: "Lun - Vie: 9:00 - 18:00",
      description: "Sáb: 10:00 - 14:00",
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
          <h1 className="mb-6 text-4xl font-bold text-slate-900 sm:text-5xl">Contáctanos</h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl">
            ¿Tienes preguntas? Nuestro equipo está aquí para ayudarte. Contáctanos y te responderemos lo antes posible.
          </p>
        </div>
      </section>

      {/* Contact Info */}
      <section className="py-16 sm:py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            {contactInfo.map((info, index) => (
              <Card key={index} className="text-center border-0 shadow-lg">
                <CardContent className="pt-8">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <info.icon className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-slate-900">{info.title}</h3>
                  <p className="mb-1 font-medium text-slate-900">{info.content}</p>
                  <p className="text-sm text-slate-600">{info.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="bg-slate-50 py-16 sm:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <Card className="border-0 shadow-xl">
                <CardHeader className="text-center">
                  <CardTitle className="text-3xl">Envíanos un mensaje</CardTitle>
                  <p className="mt-2 text-slate-600">Completa el formulario y nos pondremos en contacto contigo</p>
                </CardHeader>
                <CardContent>
                  {submitted ? (
                    <div className="text-center py-8">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Mail className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="mb-2 text-xl font-semibold text-slate-900">¡Mensaje enviado!</h3>
                    <p className="mb-6 text-slate-600">
                      Gracias por contactarnos. Te responderemos en menos de 24 horas.
                    </p>
                    <Button onClick={() => setSubmitted(false)} variant="outline">
                      Enviar otro mensaje
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">Nombre *</Label>
                        <Input id="firstName" placeholder="Juan" required disabled={isSubmitting} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Apellido *</Label>
                        <Input id="lastName" placeholder="Pérez" required disabled={isSubmitting} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input id="email" type="email" placeholder="tu@email.com" required disabled={isSubmitting} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Teléfono</Label>
                      <Input id="phone" type="tel" placeholder="+54 11 1234-5678" disabled={isSubmitting} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="business">Nombre del Negocio</Label>
                      <Input id="business" placeholder="Mi Salón de Belleza" disabled={isSubmitting} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject">Asunto *</Label>
                      <Input id="subject" placeholder="¿En qué podemos ayudarte?" required disabled={isSubmitting} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Mensaje *</Label>
                      <Textarea
                        id="message"
                        placeholder="Cuéntanos más detalles sobre tu consulta..."
                        rows={5}
                        required
                        disabled={isSubmitting}
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? "Enviando mensaje..." : "Enviar mensaje"}
                    </Button>

                    <p className="text-center text-xs text-slate-600">
                      Al enviar este formulario, aceptas nuestra{" "}
                      <Link href="/privacidad" className="text-blue-600 hover:underline">
                        Política de Privacidad
                      </Link>
                    </p>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 sm:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="mb-4 text-3xl font-bold text-slate-900 sm:text-4xl">Preguntas Frecuentes</h2>
            <p className="mx-auto max-w-2xl text-lg text-slate-600 sm:text-xl">
              Encuentra respuestas rápidas a las consultas más comunes
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-6">
            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <h3 className="mb-2 text-lg font-semibold text-slate-900">
                  ¿Cuánto tiempo toma configurar ComercioFlow?
                </h3>
                <p className="text-slate-600">
                  La configuración inicial toma aproximadamente 5-10 minutos. Nuestro asistente de configuración te guía
                  paso a paso para que puedas empezar a usar la plataforma inmediatamente.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <h3 className="mb-2 text-lg font-semibold text-slate-900">¿Ofrecen soporte técnico en español?</h3>
                <p className="text-slate-600">
                  Sí, todo nuestro soporte técnico es en español y está disponible de lunes a viernes de 9 a 18hs.
                  También tenemos una base de conocimientos completa y tutoriales en video.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <h3 className="mb-2 text-lg font-semibold text-slate-900">
                  ¿Puedo cancelar mi suscripción en cualquier momento?
                </h3>
                <p className="text-slate-600">
                  Absolutamente. No hay compromisos a largo plazo. Puedes cancelar tu suscripción en cualquier momento
                  desde tu panel de configuración, y mantendrás acceso hasta el final de tu período de facturación.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}

"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Building2,
  Search,
  Book,
  Video,
  MessageCircle,
  ArrowLeft,
  Calendar,
  Users,
  CreditCard,
  BarChart3,
} from "lucide-react"
import Link from "next/link"

export default function HelpPage() {
  const categories = [
    {
      icon: Calendar,
      title: "Gestión de Citas",
      description: "Aprende a configurar y gestionar tu calendario de citas",
      articles: 12,
      color: "bg-blue-100 text-blue-600",
    },
    {
      icon: Users,
      title: "Clientes",
      description: "Administra tu base de clientes y su información",
      articles: 8,
      color: "bg-green-100 text-green-600",
    },
    {
      icon: CreditCard,
      title: "Pagos",
      description: "Configura métodos de pago y facturación",
      articles: 6,
      color: "bg-purple-100 text-purple-600",
    },
    {
      icon: BarChart3,
      title: "Reportes",
      description: "Genera y analiza reportes de tu negocio",
      articles: 5,
      color: "bg-orange-100 text-orange-600",
    },
  ]

  const popularArticles = [
    {
      title: "Cómo configurar tu primer servicio",
      category: "Primeros pasos",
      readTime: "3 min",
    },
    {
      title: "Configurar recordatorios automáticos por WhatsApp",
      category: "Automatización",
      readTime: "5 min",
    },
    {
      title: "Integrar Mercado Pago para pagos online",
      category: "Pagos",
      readTime: "7 min",
    },
    {
      title: "Generar reportes de ventas mensuales",
      category: "Reportes",
      readTime: "4 min",
    },
    {
      title: "Gestionar horarios de empleados",
      category: "Empleados",
      readTime: "6 min",
    },
  ]

  const quickActions = [
    {
      icon: Video,
      title: "Ver tutoriales en video",
      description: "Aprende con nuestros videos paso a paso",
      action: "Ver videos",
    },
    {
      icon: MessageCircle,
      title: "Chat en vivo",
      description: "Habla directamente con nuestro equipo",
      action: "Iniciar chat",
    },
    {
      icon: Book,
      title: "Guía de inicio rápido",
      description: "Todo lo que necesitas para empezar",
      action: "Descargar PDF",
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
          <h1 className="mb-6 text-4xl font-bold text-slate-900 sm:text-5xl">Centro de Ayuda</h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl">
            Encuentra respuestas, tutoriales y guías para aprovechar al máximo ComercioFlow
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transform text-slate-400" />
            <Input placeholder="Buscar en la ayuda..." className="pl-12 py-4 text-lg border-0 shadow-lg" />
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="py-14 sm:py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="mb-4 text-3xl font-bold text-slate-900">¿Necesitas ayuda inmediata?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {quickActions.map((action, index) => (
              <Card
                key={index}
                className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
              >
                <CardContent className="pt-8">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <action.icon className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold text-slate-900">{action.title}</h3>
                  <p className="mb-4 text-slate-600">{action.description}</p>
                  <Button variant="outline">{action.action}</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="bg-slate-50 py-16 sm:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="mb-4 text-3xl font-bold text-slate-900 sm:text-4xl">Explora por categorías</h2>
            <p className="mx-auto max-w-2xl text-lg text-slate-600 sm:text-xl">
              Encuentra información específica sobre cada funcionalidad de ComercioFlow
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {categories.map((category, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg ${category.color} flex items-center justify-center mb-4`}>
                    <category.icon className="w-6 h-6" />
                  </div>
                  <CardTitle className="text-xl">{category.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-slate-600">{category.description}</p>
                  <p className="text-sm text-blue-600 font-medium">{category.articles} artículos</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Articles */}
      <section className="py-16 sm:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="mb-4 text-3xl font-bold text-slate-900 sm:text-4xl">Artículos más populares</h2>
            <p className="mx-auto max-w-2xl text-lg text-slate-600 sm:text-xl">Los temas que más consultan nuestros usuarios</p>
          </div>
          <div className="max-w-4xl mx-auto">
            {popularArticles.map((article, index) => (
              <Card key={index} className="mb-4 border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
                <CardContent className="py-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="mb-2 text-lg font-semibold text-slate-900">{article.title}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{article.category}</span>
                        <span>{article.readTime} de lectura</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      Leer →
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Support */}
      <section className="bg-slate-900 py-16 text-white sm:py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">¿No encontraste lo que buscabas?</h2>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-slate-300 sm:text-xl">
            Nuestro equipo de soporte está disponible para ayudarte con cualquier consulta específica.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contacto">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-4">
                Contactar soporte
              </Button>
            </Link>
              <Button
                size="lg"
                variant="outline"
                className="border-slate-600 bg-transparent px-8 py-4 text-lg text-white hover:bg-slate-800"
              >
                Programar llamada
              </Button>
            </div>
          <p className="mt-6 text-sm text-slate-400">Respuesta garantizada en menos de 24 horas</p>
        </div>
      </section>
    </div>
  )
}

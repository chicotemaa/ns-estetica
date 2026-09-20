import { NextRequest, NextResponse } from 'next/server';

const slug = 'natalia-sanchez-estetica';
const allowed = new Set(['catalog', 'availability', 'bookings']);

async function forward(request: NextRequest, path: string[], method: 'GET' | 'POST') {
  if (path.length !== 1 || !allowed.has(path[0]) || (method === 'POST') !== (path[0] === 'bookings')) {
    return NextResponse.json({ error: { message: 'Ruta no disponible.' } }, { status: 404 });
  }
  if (method === 'POST' && request.headers.get('origin') !== request.nextUrl.origin) {
    return NextResponse.json({ error: { message: 'Origen no permitido.' } }, { status: 403 });
  }
  const token = request.cookies.get('ns_customer')?.value;
  const configured = process.env.ESTETICA_BACKEND_URL;
  if (!configured) return NextResponse.json({ error: { message: 'Las reservas todavía no están configuradas.' } }, { status: 503 });
  let origin: string;
  try {
    const url = new URL(configured);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    origin = url.origin;
  } catch {
    return NextResponse.json({ error: { message: 'Configuración de reservas inválida.' } }, { status: 503 });
  }
  const target = new URL(`/api/public/${slug}/${path[0]}`, origin);
  if (path[0] === 'availability') target.search = request.nextUrl.search;
  try {
    const response = await fetch(target, {
      method,
      headers: method === 'POST' ? {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Idempotency-Key': request.headers.get('Idempotency-Key') || '',
      } : undefined,
      body: method === 'POST' ? await request.text() : undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    return new NextResponse(await response.text(), {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' },
    });
  } catch {
    return NextResponse.json({ error: { message: 'No pudimos conectar con las reservas. Intentá nuevamente.' } }, { status: 502 });
  }
}

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  return forward(request, params.path, 'GET');
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  return forward(request, params.path, 'POST');
}

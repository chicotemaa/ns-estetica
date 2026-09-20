import { NextRequest, NextResponse } from 'next/server';
const cookieName='ns_customer';
const allowed: Record<string,string[]>={config:['GET'],me:['GET'],challenge:['POST'],verify:['POST'],profile:['PUT'],logout:['POST']};
async function forward(request:NextRequest,path:string[],method:string) {
  const action=path[0];
  const headers={'Cache-Control':'no-store'};
  if(path.length!==1||!allowed[action]?.includes(method)) return NextResponse.json({error:'Ruta no disponible.'},{status:404,headers});
  if(method!=='GET' && request.headers.get('origin')!==request.nextUrl.origin) return NextResponse.json({error:'Origen no permitido.'},{status:403,headers});
  const base=process.env.ESTETICA_BACKEND_URL,secret=process.env.CUSTOMER_PROXY_SECRET;
  if(!base||!secret) return NextResponse.json({error:'El acceso por email estará disponible próximamente.'},{status:503,headers});
  try {
    const raw=method==='GET'?undefined:await request.text();
    if(raw&&raw.length>8000) return NextResponse.json({error:'Solicitud demasiado grande.'},{status:413,headers});
    // Google and payment routes are intentionally outside this public email-account flow.
    let body=raw?JSON.parse(raw):undefined;
    if(action==='challenge'||action==='verify') body={...body,kind:'email'};
    const token=request.cookies.get(cookieName)?.value;
    const upstream=await fetch(new URL('/api/customer/'+action,base),{method,cache:'no-store',signal:AbortSignal.timeout(20000),headers:{'Content-Type':'application/json','x-customer-proxy-key':secret,...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});
    const result=await upstream.json();
    if(!upstream.ok) return NextResponse.json({error:result.error?.message || 'No pudimos completar el acceso.'},{status:upstream.status,headers});
    const output=NextResponse.json(action==='verify'?{account:result.account}:result,{headers});
    if(action==='verify') {
      if(typeof result.sessionToken!=='string'||!/^[\w-]{43}$/.test(result.sessionToken)) throw Error('Invalid session');
      output.cookies.set(cookieName,result.sessionToken,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:7*86400});
    }
    if(action==='logout') output.cookies.set(cookieName,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:0});
    return output;
  } catch { return NextResponse.json({error:'No pudimos conectar. Volvé a intentar.'},{status:502,headers}); }
}
type Context={params:{path:string[]}};
export const GET=(r:NextRequest,c:Context)=>forward(r,c.params.path,'GET');
export const POST=(r:NextRequest,c:Context)=>forward(r,c.params.path,'POST');
export const PUT=(r:NextRequest,c:Context)=>forward(r,c.params.path,'PUT');


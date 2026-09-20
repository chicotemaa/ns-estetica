import Site from '@/components/website/Site';
import { getSiteCatalog, mergeWebsite } from '@/lib/public-site';
export const dynamic = 'force-dynamic';
export default async function Page() { const catalog=await getSiteCatalog(); return <Site initial={mergeWebsite(catalog.website)} catalog={catalog}/>; }

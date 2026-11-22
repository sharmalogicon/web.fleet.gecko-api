import { ServiceTypesListView } from '@/components/service-types/ServiceTypesListView'

export const metadata = { title: 'Service Types | Fleet' }

interface PageProps {
  searchParams: Promise<{ search?: string; category?: string }>
}

/** Fleet service tasks, read in the browser. */
export default async function ServiceTypesPage({ searchParams }: PageProps) {
  const params = await searchParams
  return <ServiceTypesListView search={params.search ?? ''} category={params.category ?? 'ALL'} />
}

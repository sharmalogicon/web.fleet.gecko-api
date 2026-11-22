import { ChecklistView } from '@/components/inspections/ChecklistPages'

export const metadata = { title: 'Inspection Checklist | Fleet' }

export default async function ChecklistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ChecklistView id={id} />
}

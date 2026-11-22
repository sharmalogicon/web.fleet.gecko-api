import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useFieldArray, useForm } from 'react-hook-form'
import { LineItemsEditor, type LineColumn } from './LineItemsEditor'

type Row = { code: string; level: string }

const columns: LineColumn<Row>[] = [
  { id: 'code', header: 'Trade', cell: (r) => <span>{r.code}</span> },
  { id: 'level', header: 'Level', cell: (r) => <span>{r.level}</span> },
]

function setup(props: Partial<Parameters<typeof LineItemsEditor<Row>>[0]> = {}) {
  const onAdd = vi.fn()
  const onRemove = vi.fn()
  render(
    <LineItemsEditor<Row>
      items={[{ code: 'MECHANIC', level: 'SENIOR' }, { code: 'WELDER', level: 'TRAINEE' }]}
      columns={columns}
      getKey={(r) => r.code}
      onAdd={onAdd}
      onRemove={onRemove}
      addLabel="Add skill"
      removeLabel="Remove"
      emptyText="No skills"
      {...props}
    />,
  )
  return { onAdd, onRemove }
}

describe('LineItemsEditor', () => {
  it('renders a row per item with its cells and number', () => {
    setup()
    expect(screen.getByText('Trade')).toBeInTheDocument()
    expect(screen.getByText('MECHANIC')).toBeInTheDocument()
    expect(screen.getByText('TRAINEE')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('shows the empty text without rows', () => {
    setup({ items: [] })
    expect(screen.getByText('No skills')).toBeInTheDocument()
  })

  it('adds and removes rows through the callbacks', () => {
    const { onAdd, onRemove } = setup()
    fireEvent.click(screen.getByRole('button', { name: /add skill/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove 2' }))
    expect(onAdd).toHaveBeenCalledTimes(1)
    expect(onRemove).toHaveBeenCalledWith(1)
  })

  it('hides add and remove when read-only', () => {
    setup({ readOnly: true })
    expect(screen.queryByRole('button', { name: /add skill/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /remove/i })).toBeNull()
  })

  it('shows a row error and a list error', () => {
    setup({ rowError: (i) => (i === 1 ? 'Listed twice' : undefined), error: 'Check the skills' })
    expect(screen.getByText('Listed twice')).toBeInTheDocument()
    expect(screen.getByText('Check the skills')).toBeInTheDocument()
  })
})

/** With react-hook-form, as the technician form uses it. */
function SkillsForm() {
  const form = useForm<{ skills: Row[] }>({ defaultValues: { skills: [{ code: 'MECHANIC', level: 'SKILLED' }] } })
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'skills' })
  return (
    <LineItemsEditor<Row & { id: string }>
      items={fields}
      getKey={(f) => f.id}
      columns={[{ id: 'code', header: 'Trade', cell: (_f, i) => <input aria-label={`trade ${i + 1}`} {...form.register(`skills.${i}.code`)} /> }]}
      onAdd={() => append({ code: '', level: 'SKILLED' })}
      onRemove={remove}
      addLabel="Add skill"
      removeLabel="Remove"
      emptyText="No skills"
    />
  )
}

describe('LineItemsEditor + useFieldArray', () => {
  it('adds an empty row and removes the first one', () => {
    render(<SkillsForm />)
    expect(screen.getByLabelText('trade 1')).toHaveValue('MECHANIC')
    fireEvent.click(screen.getByRole('button', { name: /add skill/i }))
    expect(screen.getByLabelText('trade 2')).toHaveValue('')
    fireEvent.click(screen.getByRole('button', { name: 'Remove 1' }))
    expect(screen.getByLabelText('trade 1')).toHaveValue('')
    expect(screen.queryByLabelText('trade 2')).toBeNull()
  })
})

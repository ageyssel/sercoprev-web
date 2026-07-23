'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { AppIcon } from '@/components/AppIcon'

export type CompanySelectorOption = {
  id: string
  razon_social: string
  nombre_fantasia: string | null
  rut?: string | null
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function displayName(company: CompanySelectorOption) {
  return company.nombre_fantasia?.trim() || company.razon_social
}

function editDistance(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index)

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex]
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitution = previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1)
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        substitution,
      )
    }
    previous.splice(0, previous.length, ...current)
  }

  return previous[right.length]
}

function scoreField(field: string, query: string) {
  if (!field || !query) return 0
  if (field === query) return 120
  if (field.startsWith(query)) return 110

  const words = field.split(' ')
  if (words.some((word) => word.startsWith(query))) return 100
  if (field.includes(query)) return 90

  const queryTokens = query.split(' ').filter(Boolean)
  if (queryTokens.length > 1 && queryTokens.every((token) => field.includes(token))) {
    return 80 + Math.min(queryTokens.length, 5)
  }

  if (query.length >= 3) {
    const candidates = [field, ...words].filter((candidate) => candidate.length >= 3)
    const allowedDistance = Math.max(1, Math.floor(query.length * 0.28))
    const closest = Math.min(...candidates.map((candidate) => editDistance(candidate, query)))
    if (closest <= allowedDistance) return 65 - closest * 5
  }

  return 0
}

function companyScore(company: CompanySelectorOption, rawQuery: string) {
  const query = normalize(rawQuery)
  if (!query) return 1

  const fields = [company.nombre_fantasia ?? '', company.razon_social, company.rut ?? '']
    .map(normalize)
    .filter(Boolean)

  return Math.max(...fields.map((field) => scoreField(field, query)), 0)
}

export function CompanySearchSelector({
  companies,
  selectedId,
}: {
  companies: CompanySelectorOption[]
  selectedId?: string | null
}) {
  const router = useRouter()
  const pathname = usePathname()
  const listboxId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const selectedCompany = companies.find((company) => company.id === selectedId) ?? null
  const [query, setQuery] = useState(selectedCompany ? displayName(selectedCompany) : '')
  const [selectedCompanyId, setSelectedCompanyId] = useState(selectedCompany?.id ?? '')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    function closeOnOutsidePointer(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutsidePointer)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer)
  }, [])

  const matches = useMemo(() => {
    return companies
      .map((company) => ({ company, score: companyScore(company, query) }))
      .filter(({ score }) => score > 0)
      .sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score
        return displayName(left.company).localeCompare(displayName(right.company), 'es', { sensitivity: 'base' })
      })
      .slice(0, 8)
      .map(({ company }) => company)
  }, [companies, query])

  function openCompany(company: CompanySelectorOption) {
    setQuery(displayName(company))
    setSelectedCompanyId(company.id)
    setActiveIndex(0)
    setOpen(false)
    router.push(`${pathname}?empresa=${encodeURIComponent(company.id)}`)
  }

  function submitSelection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const exact = companies.find((company) => normalize(displayName(company)) === normalize(query))
    const current = companies.find((company) => company.id === selectedCompanyId)
    const choice = exact ?? matches[0] ?? current
    if (choice) openCompany(choice)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((current) => Math.min(current + 1, Math.max(matches.length - 1, 0)))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((current) => Math.max(current - 1, 0))
    } else if (event.key === 'Enter' && open && matches[activeIndex]) {
      event.preventDefault()
      openCompany(matches[activeIndex])
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  const activeOptionId = open && matches[activeIndex] ? `${listboxId}-${matches[activeIndex].id}` : undefined

  return (
    <form onSubmit={submitSelection} className="w-full lg:w-auto">
      <input type="hidden" name="empresa" value={selectedCompanyId} />
      <div ref={containerRef} className="relative flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
        <div className="relative min-w-0 flex-1 lg:w-[360px]">
          <AppIcon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            role="combobox"
            aria-label="Buscar empresa cliente"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={activeOptionId}
            autoComplete="off"
            placeholder="Buscar empresa cliente…"
            className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-10 text-sm font-bold text-[#17324a] outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-[#134b78] focus:ring-4 focus:ring-[#134b78]/10"
            onFocus={(event) => {
              setActiveIndex(0)
              setOpen(true)
              event.currentTarget.select()
            }}
            onChange={(event) => {
              setQuery(event.target.value)
              setSelectedCompanyId('')
              setActiveIndex(0)
              setOpen(true)
            }}
            onKeyDown={handleKeyDown}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setSelectedCompanyId('')
                setActiveIndex(0)
                setOpen(true)
              }}
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#134b78]/30"
              aria-label="Limpiar búsqueda de empresa"
            >
              <AppIcon name="x" className="h-4 w-4" />
            </button>
          )}

          {open && (
            <div id={listboxId} role="listbox" className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-[#0f2438]/15">
              {matches.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-sm font-black text-[#17324a]">No encontramos coincidencias</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Pruebe con otra parte del nombre de la empresa.</p>
                </div>
              ) : (
                matches.map((company, index) => {
                  const primary = displayName(company)
                  const secondaryParts = [company.nombre_fantasia ? company.razon_social : null, company.rut].filter(Boolean)
                  const isActive = index === activeIndex
                  const isSelected = company.id === selectedId

                  return (
                    <button
                      key={company.id}
                      id={`${listboxId}-${company.id}`}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => openCompany(company)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${isActive ? 'bg-[#eaf3f9]' : 'hover:bg-slate-50'}`}
                    >
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isSelected ? 'bg-[#134b78] text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <AppIcon name={isSelected ? 'check' : 'building'} className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-black text-[#17324a]">{primary}</span>
                        {secondaryParts.length > 0 && <span className="mt-0.5 block truncate text-xs text-slate-500">{secondaryParts.join(' · ')}</span>}
                      </span>
                    </button>
                  )
                })
              )}
              {companies.length > 8 && matches.length === 8 && (
                <p className="px-3 pb-2 pt-3 text-center text-[11px] font-bold text-slate-400">Mostrando las 8 coincidencias más cercanas</p>
              )}
            </div>
          )}
        </div>
        <button type="submit" disabled={companies.length === 0} className="h-11 shrink-0 rounded-xl bg-[#0f2438] px-5 text-sm font-black text-white transition hover:bg-[#173d5c] disabled:cursor-not-allowed disabled:opacity-50">
          Abrir
        </button>
      </div>
      <p className="mt-1.5 text-xs font-medium text-slate-500">Escriba parte del nombre y seleccione una coincidencia.</p>
    </form>
  )
}

import { NextResponse } from 'next/server'
import { syncAllOfficialData } from '@/lib/official-data'

export const dynamic = 'force-dynamic'

async function secureEqual(left: string, right: string) {
  const encoder = new TextEncoder()
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(left)),
    crypto.subtle.digest('SHA-256', encoder.encode(right)),
  ])
  const leftBytes = new Uint8Array(leftHash)
  const rightBytes = new Uint8Array(rightHash)
  if (leftBytes.length !== rightBytes.length) return false
  let difference = 0
  for (let index = 0; index < leftBytes.length; index += 1) difference |= leftBytes[index] ^ rightBytes[index]
  return difference === 0
}

export async function POST(request: Request) {
  const expected = process.env.OFFICIAL_SYNC_TOKEN?.trim() ?? ''
  const provided = request.headers.get('x-sercoprev-sync-token')?.trim() ?? ''
  if (!expected || !provided || !(await secureEqual(expected, provided))) {
    return NextResponse.json({ status: 'not_found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
  }

  try {
    const sources = await syncAllOfficialData()
    const successful = sources.filter((source) => source.ok).length
    const status = successful === sources.length ? 'ok' : successful > 0 ? 'degraded' : 'error'
    return NextResponse.json(
      { status, synchronizedAt: new Date().toISOString(), sources },
      {
        status: successful > 0 ? 200 : 503,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
          'X-Robots-Tag': 'noindex, nofollow, noarchive',
        },
      },
    )
  } catch (error) {
    console.error('Error inesperado durante sincronización de datos oficiales:', error)
    return NextResponse.json(
      { status: 'error', message: 'OFFICIAL_SYNC_FAILED' },
      { status: 503, headers: { 'Cache-Control': 'no-store, max-age=0' } },
    )
  }
}

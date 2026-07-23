// The OpenNext worker is generated during `npm run build:cloudflare`.
// @ts-expect-error Generated module is intentionally unavailable before the build step.
import handler from './.open-next/worker.js'

type WorkerSelfReference = {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>
}

type ScheduledEnvironment = {
  WORKER_SELF_REFERENCE: WorkerSelfReference
  OFFICIAL_SYNC_TOKEN?: string
}

type ScheduledContext = {
  waitUntil(promise: Promise<unknown>): void
}

async function synchronizeOfficialData(env: ScheduledEnvironment) {
  const token = env.OFFICIAL_SYNC_TOKEN?.trim()
  if (!token) {
    console.error('OFFICIAL_SYNC_TOKEN is not configured; official data synchronization was skipped.')
    return
  }

  const response = await env.WORKER_SELF_REFERENCE.fetch('https://www.sercoprev.cl/api/internal/sync-official-data', {
    method: 'POST',
    headers: {
      'x-sercoprev-sync-token': token,
      'user-agent': 'SERCOPREV-Official-Data-Scheduler/1.0',
    },
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`OFFICIAL_SYNC_HTTP_${response.status}:${body.slice(0, 300)}`)
  }

  console.log('Official data synchronization completed.', await response.text())
}

export default {
  fetch: handler.fetch,
  async scheduled(_event: unknown, env: ScheduledEnvironment, context: ScheduledContext) {
    context.waitUntil(synchronizeOfficialData(env))
  },
}

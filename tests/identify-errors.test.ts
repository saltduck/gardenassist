import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { onRequestPost as openAiIdentify } from '../functions/api/ai/identify'
import type { SessionD1 } from '../functions/api/_shared/session'

function makeDb(): SessionD1 {
  return {
    prepare(query: string) {
      return {
        bind() {
          return {
            async all() {
              if (query.includes('JOIN users')) return { results: [{ id: 'u1', email: 'u@example.com' }] }
              if (query.includes('rate_limit_buckets')) return { results: [{ count: 1 }] }
              return { results: [] }
            },
            async run() {},
          }
        },
        async all() {
          return { results: [] }
        },
        async run() {},
      }
    },
  }
}

describe('plant identify error handling', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does not automatically call OpenAI fallback after Plant.id failure in PlantForm', () => {
    const source = readFileSync(resolve('src/pages/PlantForm.tsx'), 'utf8')

    expect(source).not.toMatch(/catch\s*\{[\s\S]{0,200}identifyPlantOpenAI/)
  })

  it('does not expose raw OpenAI quota and billing text to users', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            message:
              'You exceeded your current quota, please check your plan and billing details. For more information on this error, read the docs: https://platform.openai.com/docs/guides/error-codes/api-errors.',
          },
        }),
        { status: 429, statusText: 'Too Many Requests' }
      )
    )

    const form = new FormData()
    form.append('image', new Blob(['fake'], { type: 'image/jpeg' }), 'plant.jpg')
    const res = await openAiIdentify({
      request: new Request('https://example.test/api/ai/identify', {
        method: 'POST',
        headers: { Cookie: 'ga_session=s1' },
        body: form,
      }),
      env: { DB: makeDb(), OPENAI_API_KEY: 'sk-test' },
    })
    const body = (await res.json()) as { error?: string }

    expect(res.status).toBe(429)
    expect(body.error).toBe('OpenAI 识别服务当前不可用，请稍后再试或手动填写植物信息')
    expect(body.error).not.toContain('billing')
    expect(body.error).not.toContain('platform.openai.com')
  })
})

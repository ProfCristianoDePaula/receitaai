import { onRequestPost as recipes } from '../functions/api/recipes'
import { onRequestPost as images } from '../functions/api/images'

interface AiBinding { run(model: string, input: Record<string, unknown>): Promise<unknown> }
interface Env { AI: AiBinding; ASSETS: { fetch(request: Request): Promise<Response> } }

const routes: Record<string, typeof recipes> = {
  '/api/recipes': recipes,
  '/api/images': images
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const handler = routes[new URL(request.url).pathname]
    if (!handler) return env.ASSETS.fetch(request)
    if (request.method !== 'POST') {
      return Response.json({ error: 'Método não permitido.' }, { status: 405, headers: { Allow: 'POST' } })
    }
    return handler({ request, env })
  }
}

interface AiBinding { run(model: string, input: Record<string, unknown>): Promise<unknown> }
interface Env { AI: AiBinding }
type PagesFunction<E> = (context: { request: Request; env: E }) => Response | Promise<Response>
interface ImageRequest { name?: unknown; description?: unknown; imagePrompt?: unknown }

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = await request.json() as ImageRequest
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 100) : ''
    const description = typeof body.description === 'string' ? body.description.trim().slice(0, 400) : ''
    const suppliedPrompt = typeof body.imagePrompt === 'string' ? body.imagePrompt.trim().slice(0, 1500) : ''
    if (!name || !suppliedPrompt) return Response.json({ error: 'Dados da receita incompletos para gerar a imagem.' }, { status: 400 })

    const prompt = `Professional editorial food photography of the finished dish: ${name}. ${description}. ${suppliedPrompt}. The food must look appetizing, realistic and physically plausible, served on a beautiful ceramic plate, warm natural window light, refined rustic gourmet styling, close-up three-quarter angle, shallow depth of field, high detail, no people, no text, no typography, no logo, no watermark.`
    const result = await env.AI.run('@cf/black-forest-labs/flux-1-schnell', { prompt, steps: 4 }) as { image?: string }
    if (!result.image) throw new Error('O serviço de imagens não retornou uma imagem.')
    return Response.json({ image: `data:image/jpeg;base64,${result.image}` }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('image generation error', error)
    return Response.json({ error: error instanceof Error ? error.message : 'Não foi possível gerar a imagem.' }, { status: 502 })
  }
}

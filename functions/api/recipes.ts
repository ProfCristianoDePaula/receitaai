interface AiBinding { run(model: string, input: Record<string, unknown>): Promise<unknown> }
interface Env { AI: AiBinding }
type PagesFunction<E> = (context: { request: Request; env: E }) => Response | Promise<Response>
interface RequestBody {
  ingredients?: unknown
  mealType?: unknown
  maxPreparationTime?: unknown
  servings?: unknown
  preferences?: unknown
}

const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast'
const recipeSchema = {
  type: 'object',
  properties: {
    recipes: {
      type: 'array', minItems: 3, maxItems: 3,
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' }, description: { type: 'string' }, preparationTime: { type: 'integer' },
          difficulty: { type: 'string', enum: ['Fácil', 'Médio', 'Avançado'] }, servings: { type: 'integer' },
          ingredients: { type: 'array', items: { type: 'object', properties: {
            name: { type: 'string' }, quantity: { type: 'string' }, available: { type: 'boolean' }, optional: { type: 'boolean' }
          }, required: ['name', 'quantity', 'available'] } },
          instructions: { type: 'array', minItems: 3, items: { type: 'string' } },
          pantryMatch: { type: 'integer' }, extraIngredients: { type: 'array', items: { type: 'string' } },
          imagePrompt: { type: 'string' }
        },
        required: ['name', 'description', 'preparationTime', 'difficulty', 'servings', 'ingredients', 'instructions', 'pantryMatch', 'extraIngredients', 'imagePrompt']
      }
    }
  }, required: ['recipes']
}

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = await request.json() as RequestBody
    if (!Array.isArray(body.ingredients)) return json({ error: 'Informe uma lista de ingredientes.' }, 400)
    const ingredients = body.ingredients.map(String).map(x => x.trim()).filter(Boolean).slice(0, 30)
    if (ingredients.length === 0) return json({ error: 'Adicione pelo menos um ingrediente.' }, 400)
    if (ingredients.some(x => x.length > 60)) return json({ error: 'Cada ingrediente deve ter até 60 caracteres.' }, 400)

    const mealType = typeof body.mealType === 'string' ? body.mealType.slice(0, 40) : 'Qualquer refeição'
    const maxTime = Math.min(240, Math.max(5, Number(body.maxPreparationTime) || 40))
    const servings = Math.min(12, Math.max(1, Number(body.servings) || 2))
    const preferences = Array.isArray(body.preferences) ? body.preferences.map(String).slice(0, 8) : []

    const system = `Você é um chef e nutricionista culinário especializado em cozinha doméstica brasileira. Crie exatamente três receitas diferentes, realistas e executáveis. Responda exclusivamente no JSON solicitado. Regras obrigatórias: (1) Não invente que o usuário possui ingredientes que não informou. (2) Em ingredients, available=true somente para itens que correspondam aos ingredientes informados; os demais devem ser false e aparecer também em extraIngredients. (3) Ingredientes básicos como água, sal, pimenta e óleo podem ser sugeridos como adicionais, nunca presumidos como disponíveis. (4) Separe ingredientes opcionais e identifique-os com optional=true. (5) Não faça alegações médicas ou nutricionais terapêuticas. (6) Respeite o tempo máximo e o tipo de refeição. (7) As três opções devem ser realmente distintas. (8) pantryMatch deve ser um inteiro de 0 a 100, calculado considerando os ingredientes disponíveis em relação aos ingredientes não opcionais. (9) Escreva em português brasileiro, com quantidades plausíveis e instruções claras. (10) imagePrompt deve ser uma descrição em inglês para fotografia gastronômica fotorrealista, prato pronto em louça elegante, iluminação natural, enquadramento editorial, sem texto, sem letras, sem marca d'água.`
    const user = `Ingredientes disponíveis: ${ingredients.join(', ')}. Tipo de refeição: ${mealType}. Tempo máximo: ${maxTime} minutos. Porções: ${servings}. Preferências: ${preferences.join(', ') || 'Nenhuma'}. Gere três receitas.`

    const result = await env.AI.run(MODEL, {
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      max_tokens: 3600,
      response_format: { type: 'json_schema', json_schema: recipeSchema }
    }) as { response?: string; result?: { response?: string } }

    const raw = result.response ?? result.result?.response
    if (!raw) throw new Error('O modelo não retornou conteúdo estruturado.')
    const parsed = JSON.parse(raw) as { recipes?: Record<string, unknown>[] }
    if (!Array.isArray(parsed.recipes) || parsed.recipes.length !== 3) throw new Error('A IA não retornou exatamente três receitas. Tente novamente.')

    const recipes = parsed.recipes.map((recipe, index) => ({
      id: `recipe-${Date.now()}-${index}`,
      name: String(recipe.name ?? `Receita ${index + 1}`).slice(0, 100),
      description: String(recipe.description ?? '').slice(0, 500),
      preparationTime: Math.min(240, Math.max(1, Number(recipe.preparationTime) || maxTime)),
      difficulty: ['Fácil', 'Médio', 'Avançado'].includes(String(recipe.difficulty)) ? recipe.difficulty : 'Fácil',
      servings,
      ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients.slice(0, 30) : [],
      instructions: Array.isArray(recipe.instructions) ? recipe.instructions.slice(0, 15).map(String) : [],
      pantryMatch: Math.min(100, Math.max(0, Number(recipe.pantryMatch) || 0)),
      extraIngredients: Array.isArray(recipe.extraIngredients) ? recipe.extraIngredients.slice(0, 20).map(String) : [],
      imagePrompt: String(recipe.imagePrompt ?? `${recipe.name}, photorealistic food photography`).slice(0, 1800)
    }))
    return json({ recipes })
  } catch (error) {
    console.error('recipes error', error)
    return json({ error: error instanceof Error ? error.message : 'Não foi possível gerar as receitas. Tente novamente.' }, 502)
  }
}

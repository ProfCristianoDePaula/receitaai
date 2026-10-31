import type { GenerateRecipesRequest, Recipe } from '../types'

async function readError(response: Response): Promise<string> {
  try {
    const data = await response.json() as { error?: string }
    return data.error || `Erro ${response.status}`
  } catch {
    return `Erro ${response.status}: não foi possível concluir a solicitação.`
  }
}

export async function generateRecipes(payload: GenerateRecipesRequest): Promise<Recipe[]> {
  const response = await fetch('/api/recipes', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  })
  if (!response.ok) throw new Error(await readError(response))
  const data = await response.json() as { recipes: Recipe[] }
  return data.recipes
}

export async function generateImage(recipe: Recipe): Promise<string> {
  const response = await fetch('/api/images', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: recipe.name, description: recipe.description, imagePrompt: recipe.imagePrompt }),
  })
  if (!response.ok) throw new Error(await readError(response))
  const data = await response.json() as { image: string }
  return data.image
}

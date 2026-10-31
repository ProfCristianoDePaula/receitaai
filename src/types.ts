export type MealType = 'Qualquer refeição' | 'Café da manhã' | 'Almoço' | 'Jantar' | 'Lanche' | 'Sobremesa'
export type Difficulty = 'Fácil' | 'Médio' | 'Avançado'

export interface Recipe {
  id: string
  name: string
  description: string
  preparationTime: number
  difficulty: Difficulty
  servings: number
  ingredients: { name: string; quantity: string; available: boolean; optional?: boolean }[]
  instructions: string[]
  pantryMatch: number
  extraIngredients: string[]
  imagePrompt: string
  imageUrl?: string
}

export interface GenerateRecipesRequest {
  ingredients: string[]
  mealType: MealType
  maxPreparationTime: number
  servings: number
  preferences: string[]
}

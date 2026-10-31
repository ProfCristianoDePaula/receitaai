import { useState } from 'react'
import { ChefHat, Sparkles, Plus, X, Clock3, Users, Heart, Utensils, Leaf, Flame, ArrowRight, Check, LoaderCircle, Sun, Moon, Image as ImageIcon, ChevronDown, CookingPot, Bookmark, Info } from 'lucide-react'
import { generateImage, generateRecipes } from './lib/api'
import type { GenerateRecipesRequest, MealType, Recipe } from './types'

const suggestions = ['Frango', 'Ovos', 'Tomate', 'Arroz', 'Queijo', 'Batata', 'Cebola', 'Cenoura']
const mealTypes: MealType[] = ['Qualquer refeição', 'Café da manhã', 'Almoço', 'Jantar', 'Lanche', 'Sobremesa']
const preferenceOptions = ['Econômica', 'Vegetariana', 'Low carb', 'Sem lactose', 'Rica em proteínas', 'Pouca louça']

function App() {
  const [ingredients, setIngredients] = useState<string[]>(['Frango', 'Arroz', 'Tomate', 'Cebola', 'Queijo'])
  const [draft, setDraft] = useState('')
  const [mealType, setMealType] = useState<MealType>('Almoço')
  const [maxTime, setMaxTime] = useState(40)
  const [servings, setServings] = useState(2)
  const [preferences, setPreferences] = useState<string[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loadingRecipes, setLoadingRecipes] = useState(false)
  const [loadingImages, setLoadingImages] = useState(false)
  const [imageProgress, setImageProgress] = useState(0)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Recipe | null>(null)
  const [favorites, setFavorites] = useState<string[]>(() => JSON.parse(localStorage.getItem('receitaai-favorites') || '[]') as string[])
  const [dark, setDark] = useState(false)
  const [showPreferences, setShowPreferences] = useState(false)

  const canGenerate = ingredients.length > 0 && !loadingRecipes && !loadingImages

  function addIngredient(value = draft) {
    const clean = value.trim().replace(/\s+/g, ' ')
    if (!clean || ingredients.some(item => item.toLocaleLowerCase('pt-BR') === clean.toLocaleLowerCase('pt-BR'))) return
    if (ingredients.length >= 30) { setError('Você pode adicionar até 30 ingredientes.'); return }
    setIngredients(current => [...current, clean])
    setDraft(''); setError('')
  }

  function togglePreference(value: string) {
    setPreferences(current => current.includes(value) ? current.filter(item => item !== value) : [...current, value])
  }

  async function handleGenerate() {
    if (!canGenerate) return
    setError(''); setSelected(null); setLoadingRecipes(true); setRecipes([])
    try {
      const payload: GenerateRecipesRequest = { ingredients, mealType, maxPreparationTime: maxTime, servings, preferences }
      const generated = await generateRecipes(payload)
      setRecipes(generated)
      setLoadingRecipes(false); setLoadingImages(true); setImageProgress(0)
      let completed = 0
      const withImages = await Promise.all(generated.map(async recipe => {
        try {
          const imageUrl = await generateImage(recipe)
          completed += 1; setImageProgress(completed)
          return { ...recipe, imageUrl }
        } catch (imageError) {
          completed += 1; setImageProgress(completed)
          return { ...recipe, imageError: imageError instanceof Error ? imageError.message : 'Imagem indisponível' } as Recipe & { imageError: string }
        }
      }))
      setRecipes(withImages)
      const failures = withImages.filter(recipe => !recipe.imageUrl).length
      if (failures) setError(`${failures} imagem(ns) não puderam ser geradas. As receitas continuam disponíveis.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocorreu um erro inesperado.')
    } finally { setLoadingRecipes(false); setLoadingImages(false) }
  }

  function toggleFavorite(recipe: Recipe) {
    setFavorites(current => {
      const next = current.includes(recipe.name) ? current.filter(name => name !== recipe.name) : [...current, recipe.name]
      localStorage.setItem('receitaai-favorites', JSON.stringify(next)); return next
    })
  }

  return (
    <div className={dark ? 'app dark' : 'app'}>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="ReceitaAI início"><span className="brand-mark"><ChefHat size={23}/></span><span>receita<span className="brand-ai">AI</span></span></a>
        <nav className="nav-links"><a href="#como-funciona">Como funciona</a><a href="#receitas">Minhas receitas</a></nav>
        <div className="top-actions"><span className="ai-pill"><Sparkles size={13}/> Cozinha com IA</span><button className="icon-button" onClick={() => setDark(!dark)} aria-label="Alternar tema">{dark ? <Sun size={18}/> : <Moon size={18}/>}</button></div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-line"/> CRIATIVIDADE À MESA, TODOS OS DIAS</div>
            <h1>Sua cozinha.<br/><em>Novas possibilidades.</em></h1>
            <p className="hero-description">Conte o que tem na geladeira. A gente transforma seus ingredientes em ideias deliciosas — com um toque de inteligência artificial.</p>
            <div className="hero-note"><span className="note-icon"><Leaf size={16}/></span><span>Menos desperdício, mais sabor e criatividade.</span></div>
          </div>
          <div className="hero-image-wrap"><img className="hero-image" src="https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1100&q=85" alt="Mesa posta com ingredientes frescos e prato colorido"/><div className="image-caption"><span className="caption-dot"/> INSPIRAÇÃO QUE COMEÇA NA SUA DESPENSA</div><div className="floating-card"><span className="floating-icon"><Sparkles size={17}/></span><span><b>Ideias fresquinhas</b><small>Feitas com o que você tem</small></span></div></div>
        </section>

        <section className="workspace" aria-label="Gerador de receitas">
          <div className="section-heading"><div><span className="step-label">01 — SUA DESPENSA</span><h2>O que temos por aqui?</h2><p>Adicione os ingredientes que você já tem em casa.</p></div><span className="ingredient-count">{ingredients.length}/30 ingredientes</span></div>
          <div className="ingredient-panel">
            <div className="ingredient-input-row"><div className="input-icon"><Plus size={19}/></div><input value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addIngredient() } }} placeholder="Ex.: abobrinha, leite, manjericão..." aria-label="Adicionar ingrediente"/><button className="add-button" onClick={() => addIngredient()} disabled={!draft.trim()}><Plus size={17}/> Adicionar</button></div>
            <div className="ingredient-tags">{ingredients.length ? ingredients.map(item => <span className="ingredient-tag" key={item}>{item}<button onClick={() => setIngredients(current => current.filter(value => value !== item))} aria-label={`Remover ${item}`}><X size={13}/></button></span>) : <span className="empty-ingredients">Sua lista está vazia. Adicione pelo menos um ingrediente.</span>}</div>
            <div className="suggestion-row"><span>SUGESTÕES</span>{suggestions.filter(item => !ingredients.includes(item)).slice(0, 6).map(item => <button className="suggestion" key={item} onClick={() => addIngredient(item)}>+ {item}</button>)}</div>
          </div>

          <div className="section-heading options-heading"><div><span className="step-label">02 — DO SEU JEITO</span><h2>Vamos personalizar?</h2><p>Alguns detalhes para deixar as sugestões com a sua cara.</p></div></div>
          <div className="preferences-grid">
            <label className="field"><span><Utensils size={15}/> Tipo de refeição</span><div className="select-wrap"><select value={mealType} onChange={event => setMealType(event.target.value as MealType)}>{mealTypes.map(type => <option key={type}>{type}</option>)}</select><ChevronDown size={16}/></div></label>
            <label className="field"><span><Clock3 size={15}/> Tempo máximo</span><div className="range-field"><input type="range" min="10" max="120" step="5" value={maxTime} onChange={event => setMaxTime(Number(event.target.value))}/><b>{maxTime} min</b></div></label>
            <label className="field"><span><Users size={15}/> Quantas pessoas?</span><div className="stepper"><button onClick={() => setServings(Math.max(1, servings - 1))} aria-label="Diminuir porções">−</button><b>{servings}</b><button onClick={() => setServings(Math.min(12, servings + 1))} aria-label="Aumentar porções">+</button></div></label>
          </div>
          <div className="preference-toggle"><button onClick={() => setShowPreferences(!showPreferences)}><span><Leaf size={16}/> Preferências alimentares <small>Opcional</small></span><ChevronDown className={showPreferences ? 'rotated' : ''} size={17}/></button>{showPreferences && <div className="preference-chips">{preferenceOptions.map(option => <button key={option} onClick={() => togglePreference(option)} className={preferences.includes(option) ? 'preference-chip active' : 'preference-chip'}>{preferences.includes(option) && <Check size={13}/>} {option}</button>)}</div>}</div>
          <div className="generate-row"><div className="generate-explainer"><Sparkles size={18}/><span><b>3 receitas únicas, feitas para você.</b><small>Com imagens geradas por inteligência artificial.</small></span></div><button className="generate-button" disabled={!canGenerate} onClick={handleGenerate}>{loadingRecipes || loadingImages ? <><LoaderCircle className="spin" size={18}/> {loadingRecipes ? 'Criando receitas...' : `Criando imagens ${imageProgress}/3`}</> : <><Sparkles size={17}/> Descobrir receitas <ArrowRight size={17}/></>}</button></div>
          {error && <div className="error-message"><Info size={17}/>{error}</div>}
        </section>

        {(loadingRecipes || loadingImages || recipes.length > 0) && <section className="results-section" id="receitas">
          <div className="results-title"><div><span className="step-label">03 — HORA DE SABOREAR</span><h2>{loadingRecipes ? 'Pensando em combinações...' : loadingImages ? 'Suas receitas estão quase prontas' : 'Olha só o que você pode preparar!'}</h2><p>{loadingRecipes ? 'Nosso chef virtual está combinando seus ingredientes.' : loadingImages ? `Gerando fotografias dos pratos (${imageProgress} de 3 concluídas).` : 'Três ideias deliciosas usando o que você tem à mão.'}</p></div><span className="results-sparkle"><Sparkles size={24}/></span></div>
          {(loadingRecipes || loadingImages) && <div className="loading-bar"><span style={{ width: loadingRecipes ? '28%' : `${30 + imageProgress * 23}%` }}/></div>}
          <div className="recipe-grid">{recipes.map((recipe, index) => <article className="recipe-card" key={recipe.id}><div className="recipe-photo-wrap">{recipe.imageUrl ? <img className="recipe-photo" src={recipe.imageUrl} alt={`Imagem ilustrativa de ${recipe.name}`}/> : <div className="photo-placeholder"><ImageIcon size={28}/><span>{loadingImages ? 'Preparando a foto...' : 'Imagem indisponível'}</span></div>}<span className="recipe-number">0{index + 1}</span><button className={favorites.includes(recipe.name) ? 'favorite-button saved' : 'favorite-button'} onClick={() => toggleFavorite(recipe)} aria-label="Salvar receita"><Heart size={17} fill={favorites.includes(recipe.name) ? 'currentColor' : 'none'}/></button></div><div className="recipe-content"><div className="recipe-meta"><span><Clock3 size={13}/>{recipe.preparationTime} min</span><span><Flame size={13}/>{recipe.difficulty}</span></div><h3>{recipe.name}</h3><p>{recipe.description}</p><div className="match-row"><span>Combina com sua despensa</span><b>{recipe.pantryMatch}%</b></div><div className="match-track"><span style={{ width: `${recipe.pantryMatch}%` }}/></div><button className="details-button" onClick={() => setSelected(recipe)}>Ver receita completa <ArrowRight size={16}/></button></div></article>)}</div>
        </section>}

        {!recipes.length && !loadingRecipes && <section className="how-section" id="como-funciona"><div className="how-heading"><span className="step-label">SIMPLES ASSIM</span><h2>Da geladeira para a mesa.</h2></div><div className="how-grid"><div className="how-card"><span className="how-number">01</span><span className="how-icon"><CookingPot size={22}/></span><h3>Você conta</h3><p>Liste os ingredientes esquecidos na geladeira ou na despensa.</p></div><div className="how-card"><span className="how-number">02</span><span className="how-icon"><Sparkles size={22}/></span><h3>A IA cria</h3><p>Nosso chef virtual combina os ingredientes em três receitas possíveis.</p></div><div className="how-card"><span className="how-number">03</span><span className="how-icon"><Utensils size={22}/></span><h3>Você prepara</h3><p>Escolha seu prato, confira o passo a passo e bom apetite!</p></div></div></section>}
        {favorites.length > 0 && <section className="favorites-strip"><Bookmark size={17}/><span>{favorites.length} receita(s) salva(s) neste navegador.</span></section>}
      </main>
      <footer><a className="brand footer-brand" href="#top"><span className="brand-mark"><ChefHat size={18}/></span><span>receita<span className="brand-ai">AI</span></span></a><span>Feito com carinho e uma pitada de inteligência artificial.</span><span>© {new Date().getFullYear()} ReceitaAI</span></footer>

      {selected && <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setSelected(null) }}><section className="recipe-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close" onClick={() => setSelected(null)} aria-label="Fechar"><X size={20}/></button>{selected.imageUrl && <img className="modal-image" src={selected.imageUrl} alt={selected.name}/>}<div className="modal-body"><div className="recipe-meta"><span><Clock3 size={14}/>{selected.preparationTime} minutos</span><span><Users size={14}/>{selected.servings} porções</span><span><Flame size={14}/>{selected.difficulty}</span></div><h2 id="modal-title">{selected.name}</h2><p className="modal-description">{selected.description}</p><div className="modal-columns"><div><h3>Ingredientes</h3><ul className="ingredient-list">{selected.ingredients.map((item, index) => <li key={`${item.name}-${index}`} className={!item.available ? 'extra-item' : ''}><span>{item.name}{item.optional ? ' (opcional)' : ''}<small>{item.available ? 'Você já tem' : 'Adicionar à lista'}</small></span><b>{item.quantity}</b></li>)}</ul></div><div><h3>Modo de preparo</h3><ol className="instruction-list">{selected.instructions.map((step, index) => <li key={index}><span>{index + 1}</span><p>{step}</p></li>)}</ol></div></div><div className="modal-footnote"><Info size={15}/> Confira os ingredientes e o ponto de cozimento antes de servir. As sugestões são geradas por IA e podem precisar de ajustes.</div></div></section></div>}
    </div>
  )
}

export default App

import { useState } from 'react'

export default function EncounterCreationWindow({
  enemies,
  items,
  characters,
  encounters,
  disabled,
  onCreate
}) {
  const [name, setName] = useState('')
  const [enemyId, setEnemyId] = useState('')
  const [characterId, setCharacterId] = useState('')
  const [lootItemIds, setLootItemIds] = useState([])
  const [error, setError] = useState('')

  function createEncounter(event) {
    event.preventDefault()
    const enemy = enemies.find((entry) => entry.id === enemyId)
    const campaignCharacter = characters.find((entry) => entry.id === characterId)
    const lootTable = items.filter((item) => lootItemIds.includes(item.id))

    if (!name.trim() || !enemy || !campaignCharacter || lootTable.length === 0) {
      setError('Enter a name and choose a campaign character, enemy, and at least one item for the temporary loot pool.')
      return
    }

    setError('')
    onCreate({ name: name.trim(), enemy, lootTable, campaignCharacter })
    setName('')
    setEnemyId('')
    setCharacterId('')
    setLootItemIds([])
  }

  return (
    <section className="card p-3 p-md-4 mt-4" aria-labelledby="encounter-creation-heading">
      <h2 id="encounter-creation-heading" className="h3">Create Encounter</h2>
      <p>Configure an encounter by selecting a campaign character, enemy, and available loot.</p>
      <form className="row g-3" onSubmit={createEncounter}>
        <div className="col-12">
          <label className="form-label" htmlFor="encounter-name">Encounter name</label>
          <input
            id="encounter-name"
            className="form-control"
            required
            maxLength={100}
            disabled={disabled}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="col-md-4">
          <label className="form-label" htmlFor="encounter-character">Campaign character</label>
          <select
            id="encounter-character"
            className="form-select"
            required
            disabled={disabled}
            value={characterId}
            onChange={(event) => setCharacterId(event.target.value)}
          >
            <option value="">Choose a character</option>
            {characters.map((character) => (
              <option key={character.id} value={character.id}>{character.profile.name}</option>
            ))}
          </select>
        </div>
        <div className="col-md-4">
          <label className="form-label" htmlFor="encounter-enemy">Enemy</label>
          <select
            id="encounter-enemy"
            className="form-select"
            required
            disabled={disabled}
            value={enemyId}
            onChange={(event) => setEnemyId(event.target.value)}
          >
            <option value="">Choose an enemy</option>
            {enemies.map((enemy) => (
              <option key={enemy.id} value={enemy.id}>{enemy.name}</option>
            ))}
          </select>
        </div>
        <div className="col-md-4">
          <label className="form-label" htmlFor="encounter-loot">Loot (item templates)</label>
          <select
            id="encounter-loot"
            className="form-select"
            multiple
            required
            disabled={disabled}
            value={lootItemIds}
            onChange={(event) => setLootItemIds(
              Array.from(event.target.selectedOptions, (option) => option.value)
            )}
          >
            {items.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
          {items.length === 0 && <small className="form-text">Create item templates first.</small>}
        </div>
        {error && <p className="col-12 text-danger mb-0" role="alert">{error}</p>}
        <div className="col-12">
          <button className="btn btn-primary" type="submit" disabled={disabled || enemies.length === 0 || items.length === 0 || characters.length === 0}>
            Create encounter
          </button>
        </div>
      </form>
      {encounters.length > 0 && (
        <div className="mt-4" aria-live="polite">
          <h3 className="h5">Created Encounters</h3>
          <ul className="list-group">
            {encounters.map((encounter) => (
              <li className="list-group-item" key={encounter.id}>
                <strong>{encounter.name}</strong> — {encounter.enemy.name} for {encounter.campaignCharacter.profile.name}
                <span> — Loot: {encounter.lootTable.map((item) => item.name).join(', ')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

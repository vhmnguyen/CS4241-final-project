import { useState, useEffect } from 'react'
import EncounterCreationWindow from './EncounterCreationWindow'
import Encounter from './Encounter'

// Displays campaigns and their characters, inventories, and equipment controls.
export default function CampaignManager({
  campaigns,
  characters,
  items,
  enemies,
  encounters,
  disabled,
  onChange,
  onEquip,
}) {

  const [encounterName, setEncounterName] = useState('')
  const [enemyId, setEnemyId] = useState('')
  const [characterId, setCharacterId] = useState('')
  const [lootItemId, setLootItemId] = useState()
  const [lootTableItems, setLootTableItems] = useState([])

  const [encounterCharacter, setEncounterCharacter] = useState()
  const [selectedEncounter, setSelectedEncounter] = useState()
  const [localEncounters, setLocalEncounters] = useState(encounters)

  const [selected, setSelected] = useState('')
  const [name, setName] = useState('')

  const campaign =
    campaigns.find((entry) => entry.id === selected) || campaigns[0]
  // Creates a campaign, selects it, clears the name after a successful save.
  async function createCampaign(event) {
    event.preventDefault()
    const savedCampaign = await onChange('/campaigns/add', { name })
    if (savedCampaign) {
      setSelected(savedCampaign.id)
      setName('')
    }
  }

  async function addToLootTable() {
    console.log(items)
    console.log(lootItemId)
    const item = items.find((entry) => entry.id === lootItemId)
    setLootTableItems([...lootTableItems, item])
    console.log(lootTableItems)
  }

  // Adds a copy of the selected starting character to the active campaign.
  function addCharacter(event) {
    event.preventDefault()
    const characterId = new FormData(event.currentTarget).get('characterId')
    return onChange('/campaigns/join', { campaignId: campaign.id, characterId })
  }

  // Adds a copy of the chosen item template to this character's inventory.
  function addInventoryItem(event, characterId) {
    event.preventDefault()
    const itemId = new FormData(event.currentTarget).get('itemId')
    return onChange('/campaigns/inventory/add', {
      campaignId: campaign.id,
      characterId,
      itemId
    })
  }

  function changeCharacterCurrentHPEncounter(currHp, characterId) {
    return onChange('/campaigns/character/hp', {
      campaignId: campaign.id,
      characterId,
      currHp
    })
  }

  function addInventoryItemEncounter(itemId, characterId) {
    return onChange('/campaigns/inventory/add', {
      campaignId: campaign.id,
      characterId,
      itemId
    })
  }

  // Removes an inventory copy and unequips it if it was equipped
  function removeInventoryItem(characterId, itemId) {
    return onChange('/campaigns/inventory/remove', {
      campaignId: campaign.id,
      characterId,
      itemId
    })
  }

  async function createEncounter(event) {
    event.preventDefault()

    return onChange('/campaigns/encounters/add', {
        name: encounterName,
        lootTableItems: lootTableItems,
        enemyId
      })
  }

  function equipItem(itemId, characterId, campaignId) {
    onEquip(itemId, characterId, campaignId);
  }

  const availableCharacters = characters.filter(
    (character) =>
      !campaign?.characters.some(
        (member) => member.sourceCharacterId === character.id
      )
  )
  return (
    <section
      className="card p-3 p-md-4 mt-4"
      aria-labelledby="campaign-heading"
    >
      <h2 id="campaign-heading">Campaigns</h2>
      <p>
        Each campaign saves its own character progress and inventory. Joining
        copies the character's current starting stats without their equipment.
        Later template edits do not change campaign copies.
      </p>
      <form className="d-flex flex-wrap gap-2 mb-3" onSubmit={createCampaign}>
        <label htmlFor="campaign-name">Campaign name</label>
        <input
          id="campaign-name"
          className="form-control"
          required
          maxLength={100}
          value={name}
          disabled={disabled}
          onChange={(event) => setName(event.target.value)}
        />
        <button className="btn btn-primary" disabled={disabled}>
          Create campaign
        </button>
      </form>
      {!campaign ? (
        <p>No campaigns yet.</p>
      ) : (
        <>
          <label htmlFor="campaign-select">Active campaign</label>
          <select
            id="campaign-select"
            className="form-select mb-3"
            value={campaign.id}
            disabled={disabled}
            onChange={(event) => setSelected(event.target.value)}
          >
            {campaigns.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
          <form
            key={campaign.id}
            className="d-flex flex-wrap gap-2 mb-3"
            onSubmit={addCharacter}
          >
            <label htmlFor="campaign-character">Starting character</label>
            <select
              id="campaign-character"
              name="characterId"
              className="form-select"
              required
              disabled={disabled}
              defaultValue=""
            >
              <option value="" disabled>
                Choose a character
              </option>
              {availableCharacters.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
            <button className="btn btn-outline-primary" disabled={disabled}>
              Add to campaign
            </button>
          </form>
          {campaign.characters.length === 0 && <p>Add a character to begin.</p>}
          {campaign.characters.map((member) => (
            <article className="border rounded p-3 mb-3" key={member.id}>
              <h3 className="h4">{member.profile.name}</h3>
              <p>
                {member.profile.class} · {member.profile.species} · Level{' '}
                {member.level} · HP {member.currHp}/{member.baseMaxHp}
              </p>
              <form
                className="d-flex flex-wrap gap-2 mb-3"
                onSubmit={(event) => addInventoryItem(event, member.id)}
              >
                <label htmlFor={`grant-${member.id}`}>Add an item copy</label>
                <select
                  id={`grant-${member.id}`}
                  className="form-select"
                  name="itemId"
                  required
                  disabled={disabled}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Choose an item template
                  </option>
                  {items.map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <button className="btn btn-outline-primary" disabled={disabled}>
                  Add to inventory
                </button>
              </form>
              <label htmlFor={`equipment-${member.id}`}>
                Equipped item (one slot)
              </label>
              <select
                id={`equipment-${member.id}`}
                className="form-select mb-3"
                disabled={disabled}
                value={member.equippedItemId || ''}
                onChange={(event) => equipItem(event.target.value, member.id, campaign.id)}
              >
                <option value="">No item</option>
                {member.inventory.map((item, index) => (
                  <option key={item.id} value={item.id}>
                    {item.name} (copy {index + 1})
                  </option>
                ))}
              </select>
              <p>
                Inventory: {member.inventory.length} items. Modifiers are saved
                for future combat; they do not change campaign stats yet.
              </p>
              <ul className="list-group">
                {member.inventory.map((item, index) => (
                  <li className="list-group-item" key={item.id}>
                    <strong>
                      {item.name} (copy {index + 1})
                    </strong>{' '}
                    {member.equippedItemId === item.id && (
                      <span>— Equipped</span>
                    )}
                    <p>{item.description}</p>
                    <p>
                      Modifier: {item.modifierType} +{item.modifier}
                    </p>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      disabled={disabled}
                      onClick={() => removeInventoryItem(member.id, item.id)}
                    >
                      Remove {item.name} (copy {index + 1})
                    </button>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </>
      )}
      <section className="card p-3 p-md-4 mt-4" aria-labelledby="encounter-creation-heading">
        <h2 id="encounter-creation-heading" className="h3">Create Encounter</h2>
        <p>Configure an encounter by selecting a campaign character, enemy, and available loot.</p>
        <form className="d-flex flex-wrap gap-2 mb-3" onSubmit={(event) => createEncounter(event)}>
          <div className="col-12">
            <label className="form-label" htmlFor="encounter-name">Encounter name</label>
            <input
                id="encounter-name"
                className="form-control"
                required
                maxLength={100}
                disabled={disabled}
                value={encounterName}
                onChange={(event) => setEncounterName(event.target.value)}
            />
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
          <div className="form-select mb-3">
            <label className="form-label" htmlFor="encounter-loot">Loot (item templates)</label>
            <select
                id="encounter-loot"
                className="form-select"
                required
                disabled={disabled}
                defaultValue=""
                onChange={() => setLootItemId(event.target.value)}
            >
              <option value="" disabled>
                Choose an item template
              </option>
              {items.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            {items.length === 0 && <small className="form-text">Create item templates first.</small>}
            <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                disabled={disabled}
                onClick={() => {
                    lootItemId?
                    addToLootTable() : null;
                  }
                }
            >Add to encounter loot</button>
              <ul className="list-group">
                {lootTableItems.map((item, index) => (
                    <li className="list-group-item" key={item.id}>
                      <strong>
                        {item.name} (copy {index + 1})
                      </strong>{' '}
                      <p>{item.description}</p>
                      <p>
                        Modifier: {item.modifierType} +{item.modifier}
                      </p>
                      <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          disabled={disabled}
                          onClick={() => lootTableItems((prev) => prev.filter((_, i) => i !== index))}
                      >
                        Remove {item.name} (copy {index + 1})
                      </button>
                    </li>
                ))}
              </ul>
          </div>
          <button className="btn btn-sm btn-outline-primary">Add Encounter</button>
        </form>
      </section>
      <section className="card p-3 p-md-4 mt-4" aria-labelledby="encounter-playing-heading">
        <h2 id="encounter-playing-heading" className="h3">Play Encounter</h2>
        <p>Select an Encounter to play</p>
        <select
            id="encounters"
            className="form-select"
            required
            disabled={disabled}
            defaultValue=""
            onChange={(event) =>setSelectedEncounter(encounters.find((e) => {
              return e.id === event.target.value;
            }))}
        >
          <option value="" disabled>
            Choose an encounter
          </option>
          {encounters.map((encounter) => (
              <option key={encounter.id} value={encounter.id}>{encounter.name}</option>
          ))}
        </select>
        <h2 id="encounter-playing-heading" className="h3">Select Player Character</h2>
        <p>Select an Character to play in this encounter</p>
        <select
            id="playerCharacters"
            className="form-select"
            required
            disabled={disabled}
            defaultValue=""
            onChange={() => setEncounterCharacter(campaign.characters.find((c) => {
              return c.id === event.target.value;
            }))}
        >
          <option value="" disabled>
            Choose an Character
          </option>
          {!campaign ? (
              <option value="" disabled>Placeholder</option>
          ) : (
              campaign.characters.map((character) => (
                  <option key={character.id} value={character.id}>{character.profile.name}</option>
              )
          ))}
        </select>
        {(() => {
          if (!campaign && selectedEncounter !== undefined && encounterCharacterId !== undefined) {
            console.log("=== Encounter Debug ===", {
              name: selectedEncounter?.name,
              localLootTable: selectedEncounter?.lootTableItems,
              Character: encounterCharacter,
              Enemy: enemies?.find(
                  (enemy) => enemy.id === selectedEncounter?.enemyId
              ),
              addItem: addInventoryItemEncounter,
              saveCharacterHpToCampaign: changeCharacterCurrentHPEncounter,
              campaignId: selected,
            });
          }

          return null;
        })()}
        {!campaign || selectedEncounter === undefined || encounterCharacter === undefined ? (
            <p>Select an encounter and a character to begin encounter</p>
        ) : (
          <Encounter
            name={selectedEncounter.name}
            localLootTable={selectedEncounter.lootTableItems}
            Character={encounterCharacter}
            Enemy={enemies.find((enemy) => {
              return enemy.id === selectedEncounter.enemyId;
            })}
            addItem={addInventoryItemEncounter}
            saveCharacterHpToCampaign={changeCharacterCurrentHPEncounter}
            campaignId={selected}
          />
        )}
      </section>
    </section>
  )
}

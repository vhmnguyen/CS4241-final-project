import { useEffect, useRef, useState } from 'react'
import CharacterForm, { emptyCharacter } from './CharacterForm'
import CharacterTable from './CharacterTable'
import Feedback from './Feedback'
import ItemManager from './ItemManager'
import EnemyManager from './EnemyManager'
import CampaignManager from './CampaignManager'

export default function Tracker({
  api = window.partyApi,
  campaignPage = false
}) {
  const [user, setUser] = useState(null)
  const [characters, setCharacters] = useState([])
  const [items, setItems] = useState([])
  const [enemies, setEnemies] = useState([])
  const [encounters, setEncounters] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [draft, setDraft] = useState(emptyCharacter)
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [retry, setRetry] = useState(false)
  const [status, setStatus] = useState('Checking your session...')
  const [error, setError] = useState('')
  const [focus, setFocus] = useState(null)

  const requestPending = useRef(false)

  const nameRef = useRef(null)
  const submitRef = useRef(null)
  const errorRef = useRef(null)

  useEffect(() => {
    if (!busy && focus) {
      const refs = { name: nameRef, submit: submitRef, error: errorRef }

      refs[focus].current?.focus()

      setFocus(null)
    }
  }, [busy, focus])

  function begin(message) {
    if (requestPending.current) return false

    requestPending.current = true

    setBusy(true)

    setError('')

    setStatus(message)

    return true
  }

  function finish() {
    requestPending.current = false

    setBusy(false)
  }

  function showError(message) {
    setError(message)

    setStatus('')

    setFocus('error')
  }

  async function initialize() {
    if (!begin('Checking your session...')) return

    setRetry(false)

    try {
      const session = await api.get('/auth/me')

      setUser(session.user)

      setStatus('Loading your party...')

      setCharacters(await api.get('/data'))

      setItems(await api.get('/items'))
      setEnemies(await api.get('/enemies'))
      if (campaignPage) setCampaigns(await api.get('/campaigns'))
      if (encounters) setEncounters(await api.get('/campaigns/encounters'))
      setLoaded(true)

      setStatus(
        campaignPage
          ? 'Your campaigns are up to date.'
          : 'Your party is up to date.'
      )
    } catch (failure) {
      if (failure.status !== 401) {
        showError(failure.message)

        setRetry(true)
      }
    } finally {
      finish()
    }
  }

  useEffect(() => {
    initialize()

    const onPageShow = (event) => {
      if (event.persisted) window.location.reload()
    }

    window.addEventListener('pageshow', onPageShow)

    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  function resetEditor() {
    setEditing(null)

    setDraft(emptyCharacter())
  }

  async function equipItem(itemId, characterId, campaignId = null) {
    if (campaignId) {
      return mutateCampaign('/campaigns/equip', {
        campaignId,
        characterId: characterId,
        itemId: itemId || null
      })
    }

    if (character.equippedItemId !== null) {
      const equippedItem = items.filter(
        (item) => item.id === character.equippedItemId
      )[0]
      if (
        equippedItem.modifierType === 'max_hp' &&
        equippedItem.modifier !== 0
      ) {
        const newHP = Number(character.maxHp) - Number(equippedItem.modifier)
        if (Number(character.currHp) > newHP) {
          await mutate(
            '/update',
            {
              ...character,
              equippedItemId: itemId || null,
              currHp: String(newHP),
              maxHp: String(newHP)
            },
            "Updated character's stats after unequipping."
          )
        } else {
          await mutate(
            '/update',
            {
              ...character,
              equippedItemId: itemId || null,
              maxHp: String(newHP)
            },
            "Updated character's stats after unequipping."
          )
        }
      }
    }

    if (itemId !== '') {
      const equippedItem = items.filter((item) => item.id === itemId)[0]
      if (
        equippedItem.modifierType === 'max_hp' &&
        equippedItem.modifier !== 0
      ) {
        console.log('Test ' + itemId || null)
        await mutate(
          '/update',
          {
            ...character,
            equippedItemId: itemId,
            maxHp: String(character.maxHp + equippedItem.modifier)
          },
          "Updated character's stats after equipping."
        )
      }
    }
  }

  async function mutate(endpoint, body, message, onSuccess = () => {}) {
    if (!loaded || retry || !begin('Saving changes...')) return

    try {
      const updated = await api.post(endpoint, body)

      setCharacters(updated)

      onSuccess(updated)

      setStatus(message)

      setFocus('submit')
    } catch (failure) {
      showError(failure.message)
    } finally {
      finish()
    }
  }

  function edit(character) {
    if (requestPending.current) return

    setEditing({ id: character.id, name: character.name })

    setDraft(
      Object.fromEntries(
        Object.keys(emptyCharacter()).map((key) => [
          key,
          String(character[key])
        ])
      )
    )

    setError('')

    setFocus('name')
  }

  function cancelEdit() {
    resetEditor()

    setError('')

    setStatus('Editing canceled.')

    setFocus('name')
  }

  function save(editingOverride = false) {
    mutate(
      editing ? '/update' : '/add',
      editing ? { ...draft, id: editing.id } : draft,
      editing ? 'Character updated.' : 'Character added.',
      resetEditor
    )
  }

  function remove(character) {
    mutate('/delete', { id: character.id }, 'Character deleted.', () => {
      if (editing?.id === character.id) resetEditor()
    })
  }

  async function mutateItem(endpoint, body, message) {
    if (!loaded || retry || !begin('Saving item...')) return false

    try {
      const updated = await api.post(endpoint, body)

      setItems(updated)

      setCharacters((current) =>
        current.map((character) => ({
          ...character,
          equippedItemId: updated.some(
            (item) => item.id === character.equippedItemId
          )
            ? character.equippedItemId
            : null
        }))
      )

      setStatus(message)

      return true
    } catch (failure) {
      showError(failure.message)

      return false
    } finally {
      finish()
    }
  }

  async function mutateEnemy(endpoint, body, message) {
    if (!loaded || retry || !begin('Saving enemy...')) return false
    try {
      const updated = await api.post(endpoint, body)
      setEnemies(updated)
      setStatus(message)
      return true
    } catch (failure) {
      showError(failure.message)
      return false
    } finally {
      finish()
    }
  }

  async function mutateCampaign(endpoint, body) {
    if (!loaded || retry || !begin('Saving campaign...')) return null
    try {
      const saved = await api.post(endpoint, body)
      setCampaigns((current) =>
        current.some((entry) => entry.id === saved.id)
          ? current.map((entry) => (entry.id === saved.id ? saved : entry))
          : [...current, saved]
      )
      setStatus('Campaign saved.')
      return saved
    } catch (failure) {
      showError(failure.message)
      if (failure.status === 409) {
        try {
          setCampaigns(await api.get('/campaigns'))
        } catch {
          setRetry(true)
        }
      }
      return null
    } finally {
      finish()
    }
  }

  async function spawnEnemy(id) {
    if (!loaded || retry || !begin('Spawning enemy...')) return null
    try {
      const spawned = await api.post('/enemies/spawn', { id })
      setStatus('Enemy spawned.')
      return spawned
    } catch (failure) {
      showError(failure.message)
      return null
    } finally {
      finish()
    }
  }

  async function rollEnemyDamage(id) {
    if (!loaded || retry || !begin('Rolling damage...')) return null
    try {
      const result = await api.post('/enemies/roll-damage', { id })
      setStatus('Damage rolled.')
      return result
    } catch (failure) {
      showError(failure.message)
      return null
    } finally {
      finish()
    }
  }

  function createEncounter(configuration) {
    setEncounters((current) => [
      ...current,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        ...configuration
      }
    ])
  }

  function adjustHp(character, direction) {
    if (requestPending.current) return

    const answer = window.prompt(
      `${direction > 0 ? 'Add' : 'Subtract'} how much HP for ${character.name}?`
    )

    if (answer === null) return

    const amount = Number(answer)

    if (!Number.isFinite(amount) || amount <= 0) {
      showError('Enter an HP amount greater than zero.')
      return
    }

    mutate(
      '/hp',
      { id: character.id, amount: direction * amount },
      'HP updated.',
      (updated) => {
        const saved = updated.find((item) => item.id === character.id)

        if (editing?.id === character.id && saved) {
          setDraft((current) => ({
            ...current,
            currHp: String(saved.currHp)
          }))
        }
      }
    )
  }

  async function logout() {
    if (!begin('Logging out...')) return

    try {
      await api.post('/auth/logout', {})

      setUser(null)

      window.location.replace('/login.html')
    } catch (failure) {
      showError(failure.message)
    } finally {
      finish()
    }
  }

  const disabled = busy || !loaded || retry

  return (
    <>
      <header className="mb-4">
        <h1 className="display-5 fw-bold">D&D Party Tracker</h1>
      </header>

      <Feedback
        status={status}
        error={error}
        errorRef={errorRef}
        retry={retry}
        busy={busy}
        onRetry={initialize}
      />

      {user && (
        <div id="tracker" aria-busy={busy}>
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
            <p className="mb-0">
              Signed in as <strong id="username">{user.username}</strong>
            </p>

            <button
              id="logout-button"
              className="btn btn-outline-dark"
              type="button"
              disabled={busy}
              onClick={logout}
            >
              Log out
            </button>
          </div>

          <nav aria-label="Main navigation" className="d-flex gap-3 mb-4">
            <a href="/" aria-current={!campaignPage ? 'page' : undefined}>
              Characters, items & enemies
            </a>
            <a
              href="/campaign.html"
              aria-current={campaignPage ? 'page' : undefined}
            >
              Campaigns
            </a>
          </nav>

          {campaignPage ? (
            <CampaignManager
              campaigns={campaigns}
              characters={characters}
              items={items}
              enemies={enemies}
              encounters={encounters}
              disabled={disabled}
              onChange={mutateCampaign}
              onEquip={equipItem}
              onCreateEncounter={createEncounter}
            />
          ) : (
            <>
              <CharacterForm
                draft={draft}
                editing={editing}
                disabled={disabled}
                onChange={(key, value) =>
                  setDraft((current) => ({
                    ...current,
                    [key]: value
                  }))
                }
                onSave={save}
                onCancel={cancelEdit}
                nameRef={nameRef}
                submitRef={submitRef}
              />

              <CharacterTable
                characters={characters}
                items={items}
                loaded={loaded}
                disabled={disabled}
                onEdit={edit}
                onDelete={remove}
                onAdjustHp={adjustHp}
                onEquip={(character, itemId) => equipItem(itemId, character)}
              />

              <ItemManager
                items={items}
                disabled={disabled}
                onSave={(id, draft) =>
                  mutateItem(
                    id ? '/items/update' : '/items/add',
                    {
                      ...draft,
                      ...(id ? { id } : {})
                    },
                    id ? 'Item updated.' : 'Item created.'
                  )
                }
                onDelete={(item) =>
                  mutateItem(
                    '/items/delete',
                    { id: item.id },
                    'Item deleted and unequipped.'
                  )
                }
              />

              <EnemyManager
                enemies={enemies}
                disabled={disabled}
                onSave={(id, draft) =>
                  mutateEnemy(
                    id ? '/enemies/update' : '/enemies/add',
                    { ...draft, ...(id ? { id } : {}) },
                    id ? 'Enemy updated.' : 'Enemy created.'
                  )
                }
                onDelete={(enemy) =>
                  mutateEnemy(
                    '/enemies/delete',
                    { id: enemy.id },
                    'Enemy deleted.'
                  )
                }
                onSpawn={spawnEnemy}
                onRollDamage={rollEnemyDamage}
              />
            </>
          )}
        </div>
      )}
    </>
  )
}

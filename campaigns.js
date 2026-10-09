const { ObjectId } = require('mongodb')

function registerCampaigns(app, db, requireJsonObject) {
  const campaigns = db.collection('campaigns')
  const encounters = db.collection('encounters')
  const throwRequestError = (message, status = 400) => {
    throw Object.assign(new Error(message), { status })
  }
  function parseObjectId(value) {
    if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value))
      throwRequestError('Invalid record ID.')
    return new ObjectId(value)
  }
  const toPublicCampaign = ({ _id, ownerId, ...campaign }) => ({
    id: _id.toHexString(),
    ...campaign
  })
  
  app.get('/campaigns', async (request, response) => {
    const ownedCampaigns = await campaigns
      .find({ ownerId: request.user._id })
      .sort({ _id: 1 })
      .toArray()

    response.json(ownedCampaigns.map(toPublicCampaign))
  })



  app.post('/campaigns/add', requireJsonObject, async (request, response) => {
    const name =
      typeof request.body.name === 'string' ? request.body.name.trim() : ''
    if (!name || name.length > 100)
      throwRequestError('Campaign name is required (up to 100 characters).')
    const campaign = {
      ownerId: request.user._id,
      name,
      characters: [],
      version: 0
    }
    const result = await campaigns.insertOne(campaign)
    response
      .status(201)
      .json(toPublicCampaign({ ...campaign, _id: result.insertedId }))
  })

  async function updateCampaign(request, response, applyChanges) {
    const _id = parseObjectId(request.body.campaignId)
    const campaign = await campaigns.findOne({ _id, ownerId: request.user._id })
    if (!campaign)
      return response.status(404).json({ error: 'Campaign not found.' })
    await applyChanges(campaign)
    const result = await campaigns.updateOne(
      { _id, ownerId: request.user._id, version: campaign.version },
      { $set: { characters: campaign.characters }, $inc: { version: 1 } }
    )
    if (!result.matchedCount)
      return response
        .status(409)
        .json({
          error: 'Campaign changed in another tab. Refresh and try again.'
        })
    response.json(
      toPublicCampaign({ ...campaign, version: campaign.version + 1 })
    )
  }

    app.post('/campaigns/character/hp', requireJsonObject, async (request, response) => {
        const { campaignId, characterId, currHp } = request.body;
        const campaign = await campaigns.findOne({
            _id: new ObjectId(campaignId)
        });
        characters = campaign.characters.map(character =>
            character.id === characterId ? { ...character, currHp: currHp } : character
        );
        if (campaign) {
            const res = await campaigns.replaceOne(
                { _id: new ObjectId(campaignId) },
                { ...campaign, characters: characters }
            );
        }
        response.json({
            success: true,
            message: "Character HP updated"
        });
    })

    app.post('/campaigns/join', requireJsonObject, async (request, response) =>
        updateCampaign(request, response, async (campaign) => {
            const characterId = parseObjectId(request.body.characterId).toHexString()
            if (
                campaign.characters.some(
                    (character) => character.sourceCharacterId === characterId
                )
            )
                throwRequestError('Character already joined this campaign.')
            if (campaign.characters.length >= 20)
                throwRequestError('A campaign can contain at most 20 characters.')
            const source = await db
                .collection('characters')
                .findOne({ _id: parseObjectId(characterId), ownerId: request.user._id })
            if (!source) throwRequestError('Character not found.', 404)
            const {
                name,
                class: characterClass,
                species,
                level,
                currHp,
                maxHp
            } = source
            campaign.characters.push({
                id: new ObjectId().toHexString(),
                sourceCharacterId: characterId,
                profile: { name, class: characterClass, species, level, maxHp },
                level,
                currHp,
                baseMaxHp: maxHp,
                inventory: [],
                equippedItemId: null
            })
        })
    )

    app.post('/campaigns/encounters/add', requireJsonObject, async (request, response) => {
        const { name, enemyId, lootTableItems } = request.body;

            const encounter = {
                ownerId: request.user._id,
                name,
                enemyId,
                lootTableItems
            }

            const result = await encounters.insertOne(encounter)

            response.status(201).json({
                message: 'Encounter created successfully',
                id: result.insertedId.toHexString()
            })
        }
    )

    app.get('/campaigns/encounters', async (request, response) => {
        const ownedEncounters = await encounters
            .find({ ownerId: request.user._id })
            .sort({ _id: 1 })
            .toArray()

        response.json(ownedEncounters.map(toPublicCampaign))
    })

  function findCampaignCharacter(campaign, value) {
    const campaignCharacter = campaign.characters.find(
      (entry) => entry.id === parseObjectId(value).toHexString()
    )
    if (!campaignCharacter)
      throwRequestError('Campaign character not found.', 404)
    return campaignCharacter
  }

  app.post(
    '/campaigns/inventory/add',
    requireJsonObject,
    async (request, response) =>
      updateCampaign(request, response, async (campaign) => {
        const campaignCharacter = findCampaignCharacter(
          campaign,
          request.body.characterId
        )
        if (campaignCharacter.inventory.length >= 100)
          throwRequestError('A character can carry at most 100 items.')
        const source = await db
          .collection('items')
          .findOne({
            _id: parseObjectId(request.body.itemId),
            ownerId: request.user._id
          })
        if (!source) throwRequestError('Item not found.', 404)
        campaignCharacter.inventory.push({
          id: new ObjectId().toHexString(),
          sourceItemId: source._id.toHexString(),
          name: source.name,
          description: source.description || '',
          modifierType: source.modifierType || 'none',
          modifier: Number.isFinite(source.modifier) ? source.modifier : 0
        })
      })
  )

  app.post('/campaigns/equip', requireJsonObject, async (request, response) =>
    updateCampaign(request, response, (campaign) => {
      const campaignCharacter = findCampaignCharacter(
        campaign,
        request.body.characterId
      )
      const itemId =
        request.body.itemId === null
          ? null
          : parseObjectId(request.body.itemId).toHexString()
      if (
        itemId &&
        !campaignCharacter.inventory.some((item) => item.id === itemId)
      )
        throwRequestError('Item is not in this character’s campaign inventory.')
        const currentItem =
            campaignCharacter.inventory.find(
                (item) => item.id === campaignCharacter.equippedItemId
            ) ?? null;
        const equippedItem = campaignCharacter.inventory.find(
            (item) => item.id === itemId
        ) ?? null;
        const currentExtraHp = (
            currentItem?.modifierType === 'max_hp' && Number.isFinite(currentItem.modifier)
                ? Math.max(0, currentItem.modifier) : 0);
        const extraHp = (
            equippedItem?.modifierType === 'max_hp' && Number.isFinite(equippedItem.modifier)
                ? Math.max(0, equippedItem.modifier) : 0);
        const hpDiff = extraHp-currentExtraHp;
        campaignCharacter.baseMaxHp = campaignCharacter.baseMaxHp + hpDiff;
        campaignCharacter.equippedItemId = itemId
    })
  )

  app.post(
    '/campaigns/inventory/remove',
    requireJsonObject,
    async (request, response) =>
      updateCampaign(request, response, (campaign) => {
        const campaignCharacter = findCampaignCharacter(
          campaign,
          request.body.characterId
        )
        const itemId = parseObjectId(request.body.itemId).toHexString()
        if (!campaignCharacter.inventory.some((item) => item.id === itemId))
          throwRequestError('Inventory item not found.', 404)
        campaignCharacter.inventory = campaignCharacter.inventory.filter(
          (item) => item.id !== itemId
        )
        if (campaignCharacter.equippedItemId === itemId)
          campaignCharacter.equippedItemId = null
      })
  )

  app.all(
    [
      '/campaigns',
      '/campaigns/add',
      '/campaigns/join',
      '/campaigns/inventory/add',
      '/campaigns/inventory/remove',
      '/campaigns/equip',
      '/campaigns/encounters',
      '/campaigns/encounters/add',
      '/campaigns/character/hp'
    ],
    (request, response) =>
      response.status(405).json({ error: 'Method not allowed.' })
  )
}

module.exports = { registerCampaigns }

import React from 'react';

export default class Encounter extends React.Component {
    constructor(props) {
        super(props);
        console.log(props)
        this.state = {
            // this is a list of items
            name: props.name,
            localLootTable: props.localLootTable,
            Character : props.Character,
            Enemy: props.Enemy,
            enemyHp: Math.floor((props.Enemy.maxHp - props.Enemy.minHp) * Math.random() + 1) + props.Enemy.minHp,
            addItem: props.addItem,
            isDefending: false,
            saveCharacterHpToCampaign: props.saveCharacterHpToCampaign,
            campaignId: props.campaignId,
            reset: props.reset,
        };
        this.turnInProgress = false;
    }

    attack = () => {
        return new Promise((resolve) => {
            this.setState((state) => {
                if (!state.Character || state.Character.currHp <= 0 || state.enemyHp <= 0) {
                    return { isDefending: false };
                }
                const equipped = state.Character.inventory.find((item) => {
                    return item.id === state.Character.equippedItemId;
                }) ?? null;
                const hpBonus = equipped?.modifierType === 'healing' && Number.isFinite(equipped.modifier)
                        ? Math.max(0, equipped.modifier) : 0;
                if (!state.Character.currHp <= 0 && !state.Character.currHp+hpBonus > state.Character.baseMaxHp) {
                    return { Character: {...state.Character, hp: Number(state.Character.hp)+hpBonus } };
                }
                const bonus = equipped?.modifierType === 'dmg_given' && Number.isFinite(equipped.modifier)
                        ? Math.max(0, equipped.modifier) : 0;
                const damage = Math.floor(Math.random() * 6) + 1 + bonus;
                return { enemyHp: Math.max(0, state.enemyHp - damage), isDefending: false };
            }, resolve);
        });
    }

    defend = () => {
        return new Promise((resolve) => {
            this.setState((state) => {
                    const equipped = state.Character.inventory.find((item) => {
                        return item.id === state.Character.equippedItemId;
                    }) ?? null;
                    const hpBonus = equipped?.modifierType === 'healing' && Number.isFinite(equipped.modifier)
                        ? Math.max(0, equipped.modifier) : 0;
                    if (!state.Character.currHp <= 0 && !state.Character.currHp+hpBonus > state.Character.baseMaxHp) {
                        return { Character: {...state.Character, hp: Number(state.Character.hp)+hpBonus } };
                    }
                    return {isDefending: Boolean(state.Character && state.Character.currHp > 0 && state.enemyHp > 0)};
                }, resolve);
        });
    }

    enemyDefeated = () => {
        return this.state.enemyHp <= 0;
    }

    attackFromEnemy = () => {
        return new Promise((resolve) => {
            this.setState((state) => {
                if (!state.Character || state.Character.currHp <= 0 || state.enemyHp <= 0) {
                    return { isDefending: false };
                }
                const equipped = state.Character.inventory.find((item) => {
                    return item.id === state.Character.equippedItemId;
                }) ?? null;
                const reduction =
                    equipped?.modifierType === 'dmg_reduction' &&
                    Number.isFinite(Number(equipped.modifier))
                        ? Math.max(0, Number(equipped.modifier))
                        : 0;
                const { minDamage, maxDamage } = state.Enemy;
                const roll = Math.floor(Math.random() * (maxDamage - minDamage + 1)) + minDamage;
                const damage = Math.max(0, roll - reduction);
                const receivedDamage = state.isDefending ? Math.ceil(damage / 2) : damage;
                return {
                    Character: { ...state.Character, currHp: Math.max(0, state.Character.currHp - receivedDamage) },
                    isDefending: false
                };
            }, resolve);
        });
    }

    getDrop = () => {
        const dropped = Math.random() >= 0.3;
        console.log("Loot: "+this.state.localLootTable);
        if (dropped){
            const randomItem = this.state.localLootTable[Math.floor(Math.random()*this.state.localLootTable.length)];
            this.state.addItem(randomItem, this.state.Character.id);
        }
    }

    populateCharacter = (character) => {
        this.setState({Character: character});
    }

    turnAction = async (action) => {
        if (action !== 'attack' && action !== 'defend') {
            throw new RangeError('Action must be "attack" or "defend".');
        }
        if (this.turnInProgress) {
            throw new Error('An encounter turn is already in progress.');
        }

        this.turnInProgress = true;
        try {
            await this[action]();
            if (!this.enemyDefeated()){
                await this.attackFromEnemy();
            }else{
                this.state.saveCharacterHpToCampaign(this.state.Character.currHp, this.state.Character.id);
                this.getDrop();
                this.state.reset();
            }
        } finally {
            this.turnInProgress = false;
        }
    }

    render() {
        return (<article>
            <h1>Encounter: {this.state.name}</h1>
            <article>
                <h3>Enemy: {this.state.Enemy.name}</h3>
                <p>HP: {this.state.enemyHp}</p>
            </article>
            <article>
                {console.log("Char: "+this.state.Character)}
                <h3>Character: {this.state.Character.name}</h3>
                <p>HP: {this.state.Character.currHp}/{this.state.Character.baseMaxHp}</p>
                <button
                    type="button"
                    onClick={() => {
                        this.turnAction('attack')}}
                >Attack</button>
                <button
                    type="button"
                    onClick={() => {
                        this.turnAction('defend')}}
                >Defend</button>
            </article>
        </article>)
    }
}

import React from 'react';

export default class Character extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            updateCharacterHp: props.updateCharacterHp,
            localLootTable: props.lootTable,
            Character : null,
            LocalEquippedItems : null,
            Enemy: props.enemy || null,
            enemyHp: props.enemy
                ? Math.floor(Math.random() * (props.enemy.maxHp - props.enemy.minHp + 1)) + props.enemy.minHp
                : 0,
            isDefending: false
        };
        this.turnInProgress = false;
    }

    attack = () => {
        return new Promise((resolve) => {
            this.setState((state) => {
                if (!state.Character || state.Character.currHp <= 0 || state.enemyHp <= 0) {
                    return { isDefending: false };
                }
                const equipped = state.LocalEquippedItems;
                const items = Array.isArray(equipped) ? equipped : equipped ? [equipped] : [];
                const bonus = items.reduce((total, item) => {
                    return item?.modifierType === 'dmg_given' && Number.isFinite(item.modifier)
                        ? total + Math.max(0, item.modifier) : total;
                }, 0);
                const damage = Math.floor(Math.random() * 6) + 1 + bonus;
                return { enemyHp: Math.max(0, state.enemyHp - damage), isDefending: false };
            }, resolve);
        });
    }

    defend = () => {
        return new Promise((resolve) => {
            this.setState((state) => ({
                isDefending: Boolean(state.Character && state.Character.currHp > 0 && state.enemyHp > 0)
            }), resolve);
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
                const equipped = state.LocalEquippedItems;
                const items = Array.isArray(equipped) ? equipped : equipped ? [equipped] : [];
                const reduction = items.reduce((total, item) => {
                    return item?.modifierType === 'dmg_reduction' && Number.isFinite(item.modifier)
                        ? total + Math.max(0, item.modifier) : total;
                }, 0);
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

    }

    populateCharacter = (character) => {
        if (this.characterInitialization) return this.characterInitialization;
        if (!character || typeof character !== 'object' || Array.isArray(character)) {
            throw new TypeError('A character object is required.');
        }

        const encounterCharacter = structuredClone(character);
        encounterCharacter.maxHp = encounterCharacter.maxHp ?? encounterCharacter.baseMaxHp;
        const inventory = Array.isArray(encounterCharacter.inventory) ? encounterCharacter.inventory : [];
        const equippedItem = inventory.find((item) => item.id === encounterCharacter.equippedItemId);

        this.characterInitialization = new Promise((resolve) => {
            this.setState({
                Character: encounterCharacter,
                LocalEquippedItems: equippedItem ? [equippedItem] : []
            }, resolve);
        });
        return this.characterInitialization;
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
            if (!this.enemyDefeated()) await this.attackFromEnemy();
        } finally {
            this.turnInProgress = false;
        }
    }

    returnRenderables = () => {
        const { Character, Enemy, enemyHp } = this.state;
        return {
            character: Character
                ? { currHp: Character.currHp, maxHp: Character.maxHp }
                : null,
            enemy: Enemy
                ? { currHp: enemyHp, maxHp: Enemy.maxHp }
                : null
        };
    }

    render() {
        // boilerplate from jsx example
        return (
            <div>
                <h1>My {this.state.brand}</h1>
                <p>
                    It is a {this.state.color}
                    {this.state.model}
                    from {this.state.year}.
                </p>
                <button
                    type="button"
                    onClick={this.changeColor}
                >Change color</button>
            </div>
        );
    }
}

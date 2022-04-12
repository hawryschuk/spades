import { Game } from './Game';
import { Player } from './Player';
import { Suit } from "./Suit";

export class Card {
    static Values = [2, 3, 4, 5, 6, 7, 8, 9, 10, 'Jack', 'Queen', 'King', 'Ace'].map(String);

    constructor(
        public game: Game,
        public suit: Suit,
        public value: number,
        public player: Player = null as any
    ) { }

    get key() { return `${this.suit}.${this.value}`; }
    get Value() { return Card.Values[this.value] }
    toString() { return `${this.Value} of ${this.suit}` }

    greaterThan(card: Card) {
        if (!card) return true;
        if (this.suit === card.suit) return this.value > card.value;
        if (this.suit !== card.suit && [card.suit, this.suit].includes(Suit.SPADES)) return this.suit === Suit.SPADES;
        if (this.game.book.suit && [card.suit, this.suit].includes(this.game.book.suit)) return this.suit === this.game.book.suit;
        return undefined;
    }
}

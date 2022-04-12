import { Suit } from "./Suit";
import { Card } from "./Card";
import { Player } from "./Player";

export class Book {
    cards: Card[] = [];
    get complete(): boolean { return this.cards.length === 4; }
    get suit(): Suit { return this.cards[0]?.suit; }
    get winner(): Player { return this.highest?.player; }
    get highest(): Card {
        const highest = (cards: any[]): Card => cards.sort((a, b) => a.value - b.value).slice(-1)[0];
        const spades = this.cards.filter(c => c.suit === Suit.SPADES);
        const ofsuit = this.cards.filter(c => c.suit === this.suit);
        return this.complete && (highest(spades) || highest(ofsuit)) || (null as any);
    }
}

import { Player } from "./Player";

/** Each Hand */

export class TeamHand {
    constructor(public captain: Player) { }
    get players() { return [this.captain, this.captain.partner]; }

    /** Current Hand */
    get bid() { return this.players.reduce((total, { bid = 0 }) => total + bid, 0); }
    get books() { return this.players.reduce((total, { books: { length } }) => total + length, 0); }
    get made() { return this.books >= this.bid; }
    get nils() { return this.players.filter(p => !p.bid && !p.books.length).length - this.players.filter(p => !p.bid && p.books.length).length; }
    get score() { return (this.nils * 100) + ((this.made ? 1 : -1) * (this.bid * 10)); }
    get bags() { return Math.max(0, this.books - this.bid); }

    /** Transfer the score from the current book to the score */
    markScore() {
        const { totalScore } = this.captain;
        for (const player of this.players) {
            player.score += this.score;
            player.bags += this.bags;
            while (player.bags >= 10) {
                player.bags -= 10;
                player.score -= 100;
            }
        }
    }
}

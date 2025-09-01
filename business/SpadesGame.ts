import { Util } from '@hawryschuk-common/util';

export type Suit = typeof SpadesGame.CARD_SUITS[number];
export type CardValue = typeof SpadesGame.CARD_VALUES[number];
export type Card = { suit: Suit; value: CardValue; }
export type Bid = typeof SpadesGame.BIDS[number];
export type Move = 'discard' | 'bid';
export class Team {
    players!: Player[];
    score!: number;
    bags!: number;
    get bid() { return this.players.reduce((total, p) => (p.bid || 0) + total, 0) }
    get books() { return this.players.reduce((total, p) => total + p.books.length, 0) }
    constructor(d: any) { Object.assign(this, d) }
};
export type GamePlay = {
    cards?: Card[];     // player is given cards - to player
    bid?: Bid;          // player makes a bid    - broadcast
    leads?: string;     // who leads             - start of a new hand , who leads
    discard?: Card;
    name?: string;
    books?: string;
};

export class Player {
    constructor(public game: SpadesGame, public name: string) { }
    get team() { return this.game.teams.find(t => t.players.includes(this))! }
    get partner() { return this.team.players.find(m => m !== this); }
    cards: Card[] = [];
    bid?: Bid;
    discards: Card[] = [];
    books: Card[][] = [];
    deal(cards: Card[]) {
        this.cards = [...cards];
        delete this.bid;
        this.discards.splice(0);
        this.books = [];
    }
}

export class SpadesGame {
    static CARD_VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '*'] as const;
    static CARD_SUITS = ['H', 'D', 'C', 'S'] as const;
    static BIDS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const;
    static get Deck(): Card[] { return Util.permutations({ suit: <any>this.CARD_SUITS, value: <any>this.CARD_VALUES }) as any; }

    players: Player[];
    player: Player;
    turn: Player;
    teams: Team[];
    hands = 0;
    constructor(players: string[], actions: GamePlay[] = [], player?: string) {
        this.players = players.map(name => new Player(this, name));
        this.player = this.players[players.indexOf(player!)];
        this.turn = this.players[0];
        this.teams = [0, 1].map((index) => {
            const team: Team = new Team({ score: 0, bags: 0, players: this.players.filter((p, i) => i % 2 == index) });
            return team;
        });
        this.deal();
        for (const { cards, discard, bid, name } of actions) {
            const { turn } = this;
            if ((bid || discard) && turn.name !== name) debugger;
            if (cards) this.player.deal(cards);
            if (bid! >= 0) this.bid(bid!);
            if (discard) {
                const cardAdded = !Util.findWhere(turn!.cards, discard);
                if (cardAdded) { turn!.cards.push(discard); }
                this.discard(Util.findWhere(turn!.cards, discard)!);
                if (cardAdded) { turn.cards.pop(); }
            }
        }
    }

    get validBids() {
        const { turn } = this;
        const partnerBid = Util.without(turn.team.players, [turn])[0].bid;
        const max = 13 - (partnerBid || 0);
        const choices = SpadesGame.BIDS.filter((bid: Bid) => bid <= max);
        return choices;
    }

    get validDiscards() {
        const { turn, discarded, book } = this;
        const { suit: suitLed } = book.find(Boolean)! || {};
        const brokenSpades = discarded.some(c => c.suit === 'S' || c.value === '*');
        const hasOnlySpades = turn.cards.every(c => c.suit === 'S' || c.value === '*');
        const hasNoneOfSuitLed = turn.cards.every(c => c.suit !== suitLed);
        return turn.cards.filter(c => suitLed
            ? c.suit === suitLed || hasNoneOfSuitLed                                // must follow suit , otherwise any card they wish
            : brokenSpades || (c.suit !== 'S' && c.value !== '*') || hasOnlySpades  // can lead with any any non-spade, or a spade if spades has been broken , or they have only spades
        );
    }

    get discarded() { return this.players.reduce((cards, player) => [...cards, ...player.discards], [] as Card[]); }

    bid(bid: Bid) {
        if (this.turn.bid! >= 0) { debugger; throw new Error('already-bid'); }
        if (!this.validBids.includes(bid)) { debugger; throw new Error('invalid-bid'); }
        this.turn.bid = bid;
        this.turn = this.players[(1 + this.players.indexOf(this.turn)) % this.players.length];
        return true;
    }

    /** Discard and deal */
    discard({ value, suit }: Card) {
        {
            const { turn } = this;
            const card = Util.findWhere(turn.cards, { value, suit })!;
            if (!card) throw new Error('player-does-not-have-card');
            if (this.move !== 'discard') throw new Error('cannot-discard');

            Util.removeElements(turn!.cards, card);
            turn.discards.push(card);
            this.turn = this.players[(1 + this.players.indexOf(turn)) % this.players.length];
        }

        const { book } = this;
        const leadingCard = book.at(-1) || book.find(Boolean)!;
        const leader = this.players.find(p => Util.findWhere(p.discards, leadingCard))!;

        /** Book end : Decide who won the book -> Make it their turn next : If all cards have been played -> Update the score */
        if (book.filter(Boolean).length === this.players.length) {
            const leadingCard = leader.discards.at(-1)!;
            const highestCard = SpadesGame.highest(book as Card[], leadingCard.suit);
            const winner = this.turn = this.players.find(p => p.discards.includes(highestCard))!;
            winner.books.push(book as Card[]);

            /** No moves left : Update score */
            if (this.turn.cards.length === 0) {
                /** Nil : +- 100 */
                for (const player of this.players) {
                    if (player.bid === 0 && player.books.length == 0) player.team.score += 100;
                    if (player.bid === 0 && player.books.length >= 1) player.team.score -= 100;
                }
                /** +-10 points per book , 1 point per bag , -100 points for 10 bags */
                for (const team of this.teams) {
                    const totalBid = team.players.reduce((total, player) => total + player.bid!, 0);
                    const totalBooks = team.players.reduce((total, player) => total + player.books.length, 0);
                    const bags = totalBooks - totalBid;
                    if (totalBooks >= totalBid) team.score += totalBid * 10;
                    if (totalBooks < totalBid) team.score -= totalBid * 10;
                    if (bags > 0) team.bags += bags, team.score += bags;
                    while (team.bags >= 10) {
                        team.bags -= 10;
                        team.score -= 100;
                    }
                }
                /** Deal another hand */
                if (!this.finished) {
                    this.deal();
                }
            }

            return winner;
        }
        return undefined;
    }

    deal() {
        const cards: Card[] = Util.shuffle([...SpadesGame.Deck]);
        this.players.forEach(player => player.deal(cards.splice(0, 13)));
    }

    static highest(cards: Card[], suitLed: Suit): Card {
        return [...cards].sort((a, b) => {
            if (a.suit === b.suit)
                return SpadesGame.CARD_VALUES.indexOf(a.value) > SpadesGame.CARD_VALUES.indexOf(b.value) ? 1 : -1;
            else if (a.suit === 'S')
                return 1;
            else if (b.suit === 'S')
                return -1;
            else if (a.suit === suitLed)
                return 1;
            else if (b.suit === suitLed)
                return -1;
            else
                return 0;
        }).pop()!;
    }

    get move(): Move | undefined {
        if (!this.players.every(p => p.bid! >= 0)) {
            return 'bid';
        } else if (this.turn.cards.length) {
            return 'discard';
        } else {
            return undefined;
        }
    }

    get book(): Array<Card | undefined> {
        const max = Math.max(...this.players.map(p => p.discards.length));
        return this.players.map(p => p.discards[max - 1]);
    }


    get winner(): Team | undefined {
        const teams = [...this.teams].sort((a, b) => b.score - a.score);
        return this.hands >= 13 && teams[0].score > teams[1].score ? teams[0] : undefined;
    }

    get loser(): Team | undefined {
        const { winner } = this;
        return winner
            ? Util.without(this.teams, [winner])[0]
            : undefined;
    }

    get finished() { return !!this.winner; }
}

import { Util } from '@hawryschuk-common/util';

export type Suit = typeof SpadesGame.CARD_SUITS[number];
export type CardValue = typeof SpadesGame.CARD_VALUES[number];
export type ICard = { suit: any; value: any; }
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
        this.bid = undefined;
        this.discards = [];
        this.books = [];
    }
}

export class SpadesGame {
    static WILD_CARDS = ['2', '*'];
    static CARD_VALUES = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'] as const;
    static CARD_SUITS = ['H', 'D', 'C', 'S'] as const;
    static BIDS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const;
    static get BOOKS() { return this.Deck.length / 4; }
    static get Deck(): Card[] { return Util.shuffle([...Util.permutations({ suit: <any>this.CARD_SUITS, value: <any>this.CARD_VALUES }) as any]); }
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

    players: Player[];
    player: Player;
    turn: Player;
    teams: Team[];
    hands = 0;
    actions: GamePlay[] = [];
    tookBook?: Player;
    reconstruction?: boolean;

    constructor(players: string[], actions: GamePlay[] = [], player?: string) {
        this.players = players.map(name => new Player(this, name));
        this.player = this.players[players.indexOf(player!)];
        this.turn = this.players[0];
        this.teams = [0, 1].map((index) => new Team({ score: 0, bags: 0, players: this.players.filter((p, i) => i % 2 == index) }));
        this.deal();
        this.reconstruction = actions.length > 0;
        for (const action of actions) this.push(action);
    }

    /** Mutate the game here : bid, discard
     * -- Reconstructing the game from another users GamePlay knowledge
     * -- ...which lacks knowledge of the cards dealt to the other players
    */
    push(action: GamePlay) {
        const { cards, books, discard, bid, name } = action;
        const { turn } = this;
        this.actions.push(action);

        if ((globalThis as any).debugForAction === this.actions.length)
            debugger;

        if ((bid || discard) && turn.name !== name)
            debugger;

        if (books) {
            this.turn = Util.findWhere(this.players, { name: books })!;
        }
        if (cards) {
            const deck = SpadesGame.Deck;
            const otherPlayers = Util.without(this.players, [this.player]);
            const perPlayer = deck.length / this.players.length;
            for (const card of cards) Util.removeElements(deck, Util.findWhere(deck, card)!);
            for (const player of otherPlayers) player.deal(deck.splice(0, perPlayer));
            this.player.deal(cards);
        }
        if (bid! >= 0) {
            this.bid(bid!);
        }
        if (discard) {
            if (!Util.findWhere(turn!.cards, discard)) {
                if (this.reconstruction) {
                    const whoHasIt = this.players.find(p => Util.findWhere(p.cards, discard))!;
                    if (!whoHasIt) debugger;
                    const theirCard = Util.findWhere(whoHasIt.cards, discard)!;
                    Util.removeElements(whoHasIt.cards, theirCard);
                    whoHasIt.cards.push(turn.cards.pop()!);
                    turn!.cards.push(theirCard);
                } else {
                    debugger;
                }
            }
            this.discard(Util.findWhere(turn!.cards, discard)!);
        }
        return action;
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
        const brokenSpades = discarded.some(c => c.suit === 'S' || SpadesGame.WILD_CARDS.includes(c.value));
        const hasOnlySpades = turn.cards.every(c => c.suit === 'S' || SpadesGame.WILD_CARDS.includes(c.value));
        const hasNoneOfSuitLed = turn.cards.every(c => c.suit !== suitLed);
        return turn.cards.filter(c => suitLed
            ? c.suit === suitLed || hasNoneOfSuitLed                                // must follow suit , otherwise any card they wish
            : brokenSpades || (c.suit !== 'S' && !SpadesGame.WILD_CARDS.includes(c.value)) || hasOnlySpades  // can lead with any any non-spade, or a spade if spades has been broken , or they have only spades
        );
    }

    static SORT(cards: Card[]) { const str = (c: Card) => `${c.suit}${c.value}`; return cards.sort((a, b) => str(a).localeCompare(str(b))) }
    get discarded() { return SpadesGame.SORT(this.players.reduce((cards, player) => [...cards, ...player.discards], [] as Card[])); }
    get unplayed() { return SpadesGame.SORT(this.players.reduce((cards, player) => [...cards, ...player.cards], [] as Card[])); }
    whoholds(card: Card) { return this.players.find(p => p.cards.includes(card)) }
    whoplayed(card: Card) { return this.players.find(p => p.discards.includes(card)) }
    whosis(card: Card) { return this.players.find(p => [...p.cards, ...p.discards].includes(card)) }

    private bid(bid: Bid) {
        if (this.turn.bid! >= 0) { debugger; throw new Error('already-bid'); }
        if (!this.validBids.includes(bid)) { debugger; throw new Error('invalid-bid'); }
        this.turn.bid = bid;
        this.turn = this.next;
        return true;
    }

    after(player: Player) { return this.players[(1 + this.players.indexOf(player)) % this.players.length]; }

    get next() { return this.after(this.turn); }

    get lead() {
        const { book } = this;
        const card = book.at(-1) || book.find(Boolean)!;
        const player = this.players.find(p => Util.findWhere(p.discards, card))!;
        return { player, card, book };
    }

    /** Discard and deal */
    private discard({ value, suit }: Card) {
        {   /** Perform the discard */
            const { cards, discards } = this.turn;
            const card = Util.findWhere(cards, { value, suit })!;
            if (!card) { debugger; throw new Error('player-does-not-have-card'); }
            if (this.move !== 'discard') { debugger; throw new Error('cannot-discard'); }
            Util.removeElements(cards, card);

            const w = Util.where(cards, { value, suit }); if (w.length) debugger;

            discards.push(card);
            this.turn = this.next;
        }

        /** Check  */
        const { book } = this;
        const leadingCard = book.at(-1) || book.find(Boolean)!;
        const leader = this.players.find(p => Util.findWhere(p.discards, leadingCard))!;

        /** Book end : 
         * 1) Decide who won the book -> Make it their turn next
         * 2) Give the book-winner the book
         * 2) Check if Hand is over
         *      - Update the score 
         *      - Record number of hands played */
        if (book.filter(Boolean).length === this.players.length) {
            const leadingCard = leader.discards.at(-1)!;
            const highestCard = SpadesGame.highest(book as Card[], leadingCard.suit);
            const winner = this.tookBook = this.turn = this.players.find(p => p.discards.includes(highestCard))!;
            const handOver = this.players.every(p => p.cards.length === 0);
            winner.books.push(book as Card[]);

            if (!handOver && (
                this.discarded.length === SpadesGame.Deck.length
                ||
                this.unplayed.length === 0
            )) {
                debugger;
            }

            if (handOver) {
                /** Indicate the number of hands played */
                this.hands++;

                /** +- 100 for bidding nil */
                for (const player of this.players) {
                    if (player.bid === 0 && player.books.length == 0) player.team.score += 100;
                    if (player.bid === 0 && player.books.length >= 1) player.team.score -= 100;
                }

                /** +-10 points per book 
                 * 1 point per bag
                 * -100 points for 10 bags */
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
        } else {
            this.tookBook = undefined;
        }
    }

    private deal() {
        const cards: Card[] = SpadesGame.Deck;
        const perPlayer = cards.length / this.players.length;
        this.players.forEach(player => player.deal(cards.splice(0, perPlayer)));
        this.turn = this.players[this.hands % 4];
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
        return this.teams[0].score > 50 && teams[0].score > teams[1].score ? teams[0] : undefined;
    }

    get loser(): Team | undefined {
        const { winner } = this;
        return winner ? Util.without(this.teams, [winner])[0] : undefined;
    }

    get finished() { return !!this.winner; }
}

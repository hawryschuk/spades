import { Game } from './Game';
import { TeamHand } from './TeamHand';
import { Suit } from "./Suit";
import { Card } from "./Card";
import { Util } from '@hawryschuk/common';
import { TerminalActivity, Terminal, WebTerminal } from '../../@hawryschuk-terminal-restapi';
// import { TerminalActivity, Terminal, WebTerminal } from '@hawryschuk/terminals';     // Uncaught TypeError: Class extends value undefined is not a constructor or null

export class VacantTerminal extends Terminal {
    constructor({
        history = [] as TerminalActivity[],
    } = {}) {
        super({ history });
    }
}

export class RobotTerminal extends Terminal {
    get player() { return (this as any)[Symbol.for('player')] }
    constructor({ player } = {} as { player: Player }) {
        super();
        (this as any)[Symbol.for('player')] = player;
        this.subscribe({
            handler: async (last = this.last) => {
                if (last?.type === 'prompt' && !('resolved' in (last.options || {}))) {
                    const { options: { message } } = last as any;
                    if (/What is your name\?$/.test(message)) {
                        this.respond('Player');
                    } else if (/how many books do you bid\?$/.test(message)) {
                        this.respond(this.player.estimatedBooks);
                    } else if (/which card would you like to play\?$/.test(message)) {
                        this.respond(this.player.chooseCardSimple.toString());
                    } else if (/Would you like to play again\?$/.test(message)) {
                        this.respond(true);
                    } else {
                        debugger;
                        this.respond(null);
                    }
                }
            }
        });
    }
}

const TerminalTypes = { Terminal, WebTerminal, RobotTerminal, VacantTerminal };

// When the server restarts, the service is aborted, and a new service is generated reusing the same terminals from before
// A) The new service resets                : The service doesn't have enough information from the WebTerminals to fully construct itself (and resume), so it doesnt
// B) The new service resumes               : The service has enough information from the WebTerminal histories and does so
// C) The new service resumes on consensus  : The service knows it can fairly resume the previous service by estimating the unknown data through fair random scenario selection

export class Player {
    name!: string;
    game!: Game;
    cards!: Card[];
    terminal!: Terminal;
    score!: number;
    bags!: number;

    constructor({
        game, cards = [], name, terminal, score = 0, bags = 0
    } = {} as {
        name: string;
        game: Game;
        cards?: Card[];
        terminal?: Terminal;
        score?: number;
        bags?: number;
    }) {
        Object.assign(this, { game, cards, name, terminal: terminal || new RobotTerminal({ player: this }), score, bags });
    }

    hasSuit(suit: Suit) { return this.cards.filter(c => c.suit === suit).length; }
    cardsOfSuit(suit: Suit) { return this.cards.filter(c => c.suit === suit); }

    get isRobot() { return this.terminal instanceof RobotTerminal }
    get type() { return Object.keys(TerminalTypes).find(k => this.terminal.constructor.name == (TerminalTypes as any)[k].name); }
    get index() { return this.game.players.indexOf(this); }
    get nextPlayer() { return this.game.players[(this.index + 1) % 4]; }
    get partner() { return this.nextPlayer.nextPlayer; }
    get hasSpades() { return this.cards.some(c => c.suit === Suit.SPADES); }
    get hasNonSpades() { return this.cards.some(c => c.suit !== Suit.SPADES); }
    get books() { return this.game.books.filter(book => book.winner === this); }
    get bid(): number { return (this.game.bids.find(bid => bid.player === this) || {}).books as any; }
    get team() { return new TeamHand(this); }
    get totalScore() { return this.score + this.bags; }
    set totalScore(totalScore: number) {
        this.bags = totalScore % 10;
        this.score = totalScore - this.bags;
    }
    get estimatedBooks() {
        const extraSpades: number = Math.max(0, this.cards.filter(c => c.suit === Suit.SPADES).length - 3);
        const aces: number = Object.values(Suit).filter(suit => Util.findWhere(this.cards, { suit, value: 12 })).length;
        const kings: number = Math.floor(
            (
                Util.findWhere(this.cards, { suit: Suit.SPADES, value: 11 }) && this.hasSuit(Suit.SPADES) >= 3
                    ? 0.5
                    : 0
            )
            + (
                Object.values(Suit)
                    .filter(suit => Util.findWhere(this.cards, { suit, value: 11 }) && (suit === Suit.SPADES || (this.hasSuit(suit) >= 2 && this.hasSuit(suit) <= 4)))
                    .length
                / 2
            )
        );
        const queens: number = Math.floor(
            (
                Util.findWhere(this.cards, { suit: Suit.SPADES, value: 10 }) && this.hasSuit(Suit.SPADES) >= 4
                    ? 0.67
                    : 0
            )
            + (
                Object
                    .values(Suit)
                    .filter(suit => Util.findWhere(this.cards, { suit, value: 10 }) && (this.hasSuit(suit) === 3 || suit === Suit.SPADES))
                    .length
                / 3
            )
        );
        const canNill = !extraSpades && Object.values(Suit).every(suit => {
            const cards = Util.where(this.cards, { suit });
            return (suit !== Suit.SPADES || cards.every((card: Card) => card.value <= 10))  // no ace or king of spades
                && (!Util.findWhere(cards, { value: 12 }) || cards.length >= 4)      // no ace unless 4+ cards
                && (!Util.findWhere(cards, { value: 11 }) || cards.length >= 3)      // no king unless 3+ cards
                && (!Util.findWhere(cards, { value: 10 }) || cards.length >= 2);     // no queen unless 2+ cards
        });
        // console.log({ aces, kings, queens, extraSpades })
        return canNill ? 0 : Math.max(1, aces + kings + queens + extraSpades - 1);
    }

    get cardPlayed() { return Util.findWhere(this.game.book.cards, { player: this }) }

    get chooseCardSimple() {
        const { game } = this;
        const highestCard = (a: any[]) => a.sort((a, b) => a.value - b.value)[0];
        const lowestCard = (a: any[]) => a.sort((a, b) => a.value - b.value).slice(-1)[0];
        const ofSuitLed = Util.where(game.currentPlayer.cards, { suit: game.book.suit });
        const mySpades = Util.where(game.currentPlayer.cards, { suit: Suit.SPADES });
        const myNonSpades = game.currentPlayer.cards.filter(c => c.suit !== Suit.SPADES);
        const cardsToSelectFrom = ofSuitLed.length ? ofSuitLed : this.game.spadesBroken && mySpades.length ? mySpades : myNonSpades;
        const unplayedCardsGreaterThanMyHighest = this.game.cards
            .filter(card => !this.game.cardsPlayed.includes(card))                  // unplayed
            .filter(card => !game.currentPlayer.cards.includes(card))                        // not mine
            .filter(card => !game.book.cards.includes(card))                        // not played in the book
            .filter(card => card.greaterThan(highestCard(cardsToSelectFrom)))       // bigger than my best
            .length;
        const canBeBeaten = unplayedCardsGreaterThanMyHighest && game.book.cards.length < 3;
        const cantBeatHighest = this.game.book.highest && this.game.book.highest.greaterThan(highestCard(cardsToSelectFrom));
        const choice = ((canBeBeaten || cantBeatHighest) ? lowestCard(cardsToSelectFrom) : highestCard(cardsToSelectFrom))
            || game.currentPlayer.cards[0];
        return choice;
    }
}

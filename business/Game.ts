import { Terminal, TerminalActivity, BaseService, Table } from '@hawryschuk/terminals';
import { Util } from '@hawryschuk/common';
import { Book } from './Book';
import { Suit } from "./Suit";
import { Card } from "./Card";
import { Player } from "./Player";

export class Game extends BaseService {
    players: Player[];
    currentPlayer: Player;
    perspective: number = 0;
    books: Book[] = [new Book()]; // Card[]
    bids: { player: Player; books: number; }[] = [];
    cards: Card[] = Object.values(Suit).reduce((cards, suit) => cards.concat(new Array(13).fill(0).map((_, index) => new Card(this, suit, index))), [] as Card[]);

    constructor({
        id,
        table = null as any,
        terminals = [],
        history = [],
    } = {} as {
        id?: string;
        table?: Table;
        terminals?: Terminal[];
        history?: TerminalActivity[];
    }) {
        super({ id, table });
        this.players = new Array(4).fill(0).map((_, index) => new Player({
            game: this,
            cards: [],
            terminal: terminals[index],
            name: terminals[index]?.input?.name || `Robot ${index + 1}`
        }))
        this.currentPlayer = null as any;
        this.history = history;
        if (!history.length) this.deal();
    }

    set Terminals(terminals: Terminal[]) {
        terminals.forEach((t, i) => {
            // if ([VacantTerminal, RobotTerminal].every(k => !(t instanceof k))) {
            if (t) {
                this.players[i].terminal = t;
                this.players[i].name = t.input.name;
            }
        });
    }

    async broadcast(message: any) {
        await Promise.all(this.players.map(async player => {
            await player.terminal.send(message);
        }))
    }

    /** Generate a game state from an audit-log */
    get history() { return this.myPlayer.terminal.history }
    set history(lines: TerminalActivity[]) {
        lines ||= [];
        this.reset();
        for (const line of lines) {
            const { type, message = '', options } = line;
            const index = lines.indexOf(line);
            const playerBids = /^(.+) \(#(\d+)\) bids (\d+)$/;
            if (type === 'stdout' && playerBids.test(message)) {
                const [, name, playerNumber, books] = playerBids.exec(message) as string[];
                this.currentPlayer = this.players[parseInt(playerNumber) - 1];
                this.currentPlayer.name = name;
                this.bid(parseInt(books)); // auto-updates currentPlayer
                if (this.bids.length === 4) {
                    if (this.perspective != undefined && (this.perspective % 2) != (0 % 2) && this.perspective) {
                        const scores = this.players.slice(0, 2).map(p => p.totalScore);
                        this.teams.forEach((team, index) => team.players.forEach(player => player.totalScore = scores[(index + 1) % 2]))
                    }
                }
            }

            const myCards = /^(.+) \(#(.+)\), here are your cards: (.+)$/;
            if (type === 'stdout' && myCards.test(message)) {
                const myCards2 = /(\S+)\((.+?)\)/g;
                const [, name, playerNumber, cards] = myCards.exec(message) as string[];
                this.currentPlayer = this.players[parseInt(playerNumber) - 1];
                this.currentPlayer.name = name;
                const player = Object.assign(this.currentPlayer, { name });
                const cardsBySuit = cards.match(myCards2) as string[];
                this.players.forEach(p => p.cards = []);
                this.cards.forEach(c => c.player = undefined as any);
                this.perspective = parseInt(playerNumber) - 1;
                for (const group of cardsBySuit) {
                    myCards2.lastIndex = 0;
                    let [, suit, values] = [...myCards2.exec(group) as any];
                    for (const card of (values as any)
                        .split(/[, ]+/)
                        .map((val: string) => this.getCard(suit as Suit, val))
                    ) {
                        card.player = player;
                        player.cards.push(card);
                    }
                }
            }

            const playsCard = /^(.+) plays the (.+) of (.+)$/;
            if (type === 'stdout' && playsCard.test(message)) {
                const [, name, value, suit] = playsCard.exec(message) as string[];
                if (this.currentPlayer.name !== name) { debugger; throw new Error('invalid log -- wrong players turn'); }
                const card = this.getCard(suit as Suit, value);
                card.player = this.currentPlayer;
                !this.currentPlayer.cards.includes(card) && this.currentPlayer.cards.push(card);
                this.play(card);    // auto updates the currentPlayer
            }

            if (type === 'stdout' && /^(.+) wins the trick$/.test(message)) {
                if (this.books.length === 1) {
                    this.players.forEach(p => p.cards = []);
                }
            }
        }
    }

    set names(names: string[]) { this.players.forEach((player, index) => player.name = names[index] || `Player ${index + 1}`) }

    get book() { return this.books[this.books.length - 1]; }

    get cardsPlayed() { return this.books.reduce((cards, book) => [...cards, ...book.cards], [] as Card[]); }

    get spadesBroken() { return this.cardsPlayed.some(c => c.suit === Suit.SPADES); }

    get handComplete() { return this.books.length === 13 && this.book.complete; }

    get winner() { return this.players.slice(0, 2).sort((a, b) => a.score - b.score).slice(-1)[0]; }

    get finished() { return (this.winner.totalScore >= 1) && !this.players.every(({ totalScore }) => totalScore !== this.players[0].totalScore) }

    get teams() { return [this.myPlayer, this.myPlayer.nextPlayer].map(p => p.team) }

    get myPlayer() { return this.players[this.perspective] }

    get isItMyTurn() { return this.currentPlayer === this.myPlayer }

    get bidding() { return this.bids.length < 4 }

    get status() { return this.bidding && (this.isItMyTurn ? 'Make your bid' : `${this.currentPlayer.name} bids`) || (this.isItMyTurn ? 'Your turn' : `${this.currentPlayer.name}'s turn`) || '' }

    get playersInPerspective() {
        const arr = [...this.players, ...this.players].slice(this.perspective % this.players.length, this.perspective + this.players.length);
        if (arr.length !== 4) debugger;
        return arr;
    }

    get ourteam() { return this.myPlayer.team }

    get opponents() { return this.myPlayer.nextPlayer.team }

    get overlap() { return Math.max(0, this.ourteam.bid + this.opponents.bid - 13); }

    get bags() { return Math.max(0, 13 - this.ourteam.bid - this.opponents.bid); }

    get unplayed() { return 13 - this.ourteam.books - this.opponents.books; }

    get bid_as_string() {
        return [
            Game.str(this.ourteam.bid - this.overlap, 'G'),
            Game.str(this.overlap, 'X'),
            Game.str(this.bags, '_'),
            Game.str(this.opponents.bid - this.overlap, 'R'),
        ].join('').split('')
    }

    get bid_as_string2() {
        return [
            Game.str(this.bags, '_'),
            Game.str(this.ourteam.bid - this.overlap, 'G'),
            Game.str(this.overlap, 'X'),
            Game.str(this.opponents.bid - this.overlap, 'R'),
        ].join('').split('')
    }

    get progress_as_string() {
        return [
            Game.str(this.ourteam.books, 'G'),
            Game.str(this.unplayed, '_'),
            Game.str(this.opponents.books, 'R'),
        ].join('').split('');
    }

    reset() {
        this.players.forEach(p => Object.assign(p, { score: 0, bags: 0 }))
        this.currentPlayer = Util.shuffle([...this.players])[0];
        this.deal();
        return this;
    }

    deal() {
        const cards: Card[] = Util.shuffle(this.cards);
        this.players.forEach((player, index) => {
            player.cards = this.finished
                ? []
                : cards.slice(index * 13, (index + 1) * 13).sort((a, b) => {
                    const val = (card: Card) => (Object.values(Suit).indexOf(card.suit) * 100) + card.value;
                    const canplay = this.canPlay(a) !== this.canPlay(b) ? (this.canPlay(b) ? 1 : -1) : 0;
                    return canplay || -(val(a) - val(b));
                });
            for (const card of player.cards)
                Object.assign(card, { player });
        });
        this.books = [new Book];
        this.bids = [];
        return this;
    }

    bid(amount: number) {
        this.bids.push({ player: this.currentPlayer, books: amount });
        this.currentPlayer = this.currentPlayer.nextPlayer;
        return this.bids[this.bids.length - 1];
    }

    /** @example getCard('8 of Spades'), getCard(Suit.Spades,8) */
    getCard(suit: Suit, value?: number | string): Card {
        const card = this.cards.find(c => c.toString() === suit); if (card) return card;
        if (typeof value === 'string') value = Card.Values.indexOf(value);
        return Util.findWhere(this.cards, { suit, value }) as any;
    }

    canPlay(card: Card | string) {
        if (typeof card === 'string') card = this.cards.find(c => c.toString() === card) as any;
        return !this.cantPlay(card as Card);
    }

    cantPlay(card: Card) {
        const fails = Object
            .entries({
                paused: this.paused,
                wrongsuit: this.book.suit && this.currentPlayer.hasSuit(this.book.suit) && card.suit !== this.book.suit,
                notmycard: !this.currentPlayer?.cards.includes(card),
                bidding: this.bidding,
                spadelead: card.suit === Suit.SPADES && this.book.cards.length === 0 && !this.spadesBroken && this.currentPlayer?.hasNonSpades,
            })
            .filter(([key, value]) => !!value)
            .map(([key, value]) => key)
            .join(' ');
        return fails;
    }

    play(card: Card) {
        if (!this.canPlay(card)) { debugger; throw new Error(this.cantPlay(card)); }
        Util.removeElements(this.currentPlayer.cards, card);
        this.book.cards.push(card);
        // console.log(`${this.currentPlayer.name} played ${card.toString()}`)
        this.currentPlayer = this.currentPlayer.nextPlayer;
        // console.log(`${this.currentPlayer.name} turn now`)
        if (this.book.complete) {
            if (this.handComplete) {
                for (const { team } of this.players.slice(0, 2)) {
                    team.markScore();
                }
                if (!this.finished)
                    this.deal();
            } else {
                this.currentPlayer = this.book.winner;
                this.books.push(new Book);
            }
        }
    }

    static str = (count = 0, char = ' ') => {
        const str = Util.safely(() => new Array(count).fill(char).join(''));
        if (str === undefined) debugger;
        return str;
    }


    /** Auto :: Performs the single step action in the service loop */
    async auto(game = this): Promise<any> {
        if (game.finished) {
            throw new Error('Game Finished: Nothing to auto');
        } else if (game.bidding) {
            if (!game.currentPlayer.terminal) {
                console.error(this.currentPlayer);
                throw new Error('current player has no terminal ');
            }
            // console.log('AUTO1.2: ', { finished: game.finished, bidding: game.bidding, cpt: !!game.currentPlayer.terminal })
            const message = `${game.currentPlayer.name} (#${game.players.indexOf(game.currentPlayer) + 1}), here are your cards: ${Object
                .values(Suit)
                .map(suit => ({ suit, cards: game.currentPlayer.cardsOfSuit(suit) }))
                .filter(({ cards }) => cards.length)
                .map(({ suit, cards }) => `${suit}(${(cards).map((card: Card) => card.Value).join(', ')})`)
                .join(', ')
                }`;

            // console.log('AUTO1.3', { message, s: game.currentPlayer?.terminal });
            await game.currentPlayer.terminal.send(message);

            // console.log('AUTO2: ', { finished: game.finished, bidding: game.bidding, cp: !!game.currentPlayer, cpt: !!game.currentPlayer?.terminal, prompts: Object.keys(game.currentPlayer?.terminal?.prompts || {}) })
            const { player, books } = game.bid(
                (await game.currentPlayer.terminal.prompt({
                    message: `${game.currentPlayer.name}, how many books do you bid?`,
                    type: 'number',
                    name: 'bid',
                    min: 0,
                    max: 13,
                    initial: game.currentPlayer.estimatedBooks
                }))
            );
            // console.log('AUTO3: ', { finished: game.finished, bidding: game.bidding })
            await game.broadcast(`${player.name} (#${game.players.indexOf(player) + 1}) bids ${books}`);
            // console.log('AUTO4: ', { finished: game.finished, bidding: game.bidding })
            await game.pause(1000);
            // console.log('AUTO5: ', { finished: game.finished, bidding: game.bidding })
            if (!game.bidding) await game.broadcast('Bid    : ' + game.bid_as_string)
            // console.log('AUTO6: ', { finished: game.finished, bidding: game.bidding })
        } else if (!game.bidding) {            // PLAY CARDS           WRITE(BID, ACTUAL), READ(CARD), WRITE(CARD), WRITE(BOOK_WINNER), WRITE(GAME_WINNER)
            const { book } = game;
            const choices = game
                .currentPlayer.cards
                .map((card, index) => ({
                    title: card.toString(),
                    value: card.toString(),
                    disabled: !game.canPlay(card),
                }))
                .sort((a, b): number => {
                    const cardA: Card = game.currentPlayer.cards.find(c => c.toString() === a.value) as any;
                    const cardB: Card = game.currentPlayer.cards.find(c => c.toString() === b.value) as any;
                    return -(
                        game.canPlay(cardA) === game.canPlay(cardB)
                            ? 0
                            : (game.canPlay(cardA) ? 1 : -1)
                    ) || - (cardA.greaterThan(cardB) ? 1 : -1)
                });
            const options = {
                type: 'select',
                name: 'card',
                message: `${game.currentPlayer.name}, which card would you like to play?`,
                choices,
                initial: game.currentPlayer.chooseCardSimple.toString(),
            };

            while (game.currentPlayer.terminal.prompts.card) {
                console.error('wiping existing prompt for card');
                await game.currentPlayer.terminal.answer({ card: null });
            }

            // while (!options.choices.find(c => !c.disabled && c.value === game.currentPlayer.terminal.input.card))
            await game.currentPlayer.terminal.prompt(options);

            const card: Card = game.currentPlayer.cards.find(c => c.toString() == game.currentPlayer.terminal.input.card) as any;

            if (!card) {
                await game.currentPlayer.terminal.send('error: invalid-card-played');
                console.error('terminal sent invalid value: invalid-card-played'); // throw new Error(Util.safeStringify({ message: 'invalid-card-played', CP: game.currentPlayer.name, cardName, GAMECard: game.getCard(cardName) })) }
            } else {
                await game.broadcast(`${game.currentPlayer.name} plays the ${card && card.toString()}`);
                game.play(card);
                if (book.complete) await game.broadcast(`${book.winner.name} wins the trick`);
                if (book !== game.book && game.books.length === 1) {    // the hand completed
                    await game.broadcast(`Score: ${game.myPlayer.totalScore} vs ${game.myPlayer.nextPlayer.totalScore} `);
                    await Promise.all(game.players.filter(p => !p.isRobot).map(p => p.terminal.prompt({ type: 'text', name: 'ack_hand', message: 'press ok to continue' })))
                }
                if (game.finished) {
                    // console.log('/AUTO...')
                    await game.broadcast(`${this.winner.team.players.map(p => p.name).join(' and ')} wins the game`);
                    await Promise.all(game.players.filter(p => !p.isRobot).map(p => p.terminal.prompt({ type: 'text', name: 'ack_game', message: 'press ok to continue' })))
                    const results = {    // will cause BaseService.run() to stop calling BaseService/Game.auto() -- will GC this, the serviceInstance
                        winners: this.winner.team.players.filter(p => !p.isRobot).map(p => p.name),
                        losers: this.winner.nextPlayer.team.players.filter(p => !p.isRobot).map(p => p.name),
                    };
                    return results.losers.length && results.winners.length
                        ? results                           // 1+ winner, and 1+ loser
                        : { winners: [], losers: [] }       // was a game against robots
                }
            }
        }
        // console.log('/AUTO')
    }
}

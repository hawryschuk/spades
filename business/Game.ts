import { Book } from './Book';
import { Util } from '@hawryschuk/common';
import { DAO } from '@hawryschuk/dao';
import { Suit } from "./Suit";
import { Card } from "./Card";
import { Player } from "./Player";
import { Prompt, Terminal, TerminalActivity, TerminalRestApiClient, WebTerminal } from '../../@hawryschuk-terminal-restapi';

export class Game {
    id = new Date().getTime().toString();
    players: Player[];
    currentPlayer: Player;
    perspective: number = 0;
    books: Book[] = [new Book()];
    bids: { player: Player; books: number; }[] = [];
    constructor({
        terminals = [] as Terminal[],
        history = [] as TerminalActivity[],
        dao = new DAO({ Terminal })// Terminal : id, instance, service -- created, finished -- alive
    } = {}) {
        this.players = new Array(4).fill(0)
            .map((_, index) => new Player(this, [], `Player ${index + 1}`))
            .map((player, index) => Object.assign(player, { terminal: terminals[index] || player.terminal }))
        this.currentPlayer = null as any;
        this.history = history;
        if (!history.length) this.deal();
    }

    cards: Card[] = Object
        .values(Suit)
        .reduce((cards, suit) => cards
            .concat(new Array(13).fill(0).map((_, index) =>
                new Card(this, suit, index))), [] as Card[]);

    set terminals(terminals: Terminal[]) { this.players.forEach((p, i) => p.terminal = terminals[i]) }

    get terminals() { return this.players.map(t => t.terminal) }

    /** @example getCard('8 of Spades')
     * @example getCard('Spades','8')
     * @example getCard('Spades',6)         getCard(Suit.Spades, )
     */
    getCard(suit: Suit, value?: number | string): Card {
        const card = this.cards.find(c => c.toString() === suit); if (card) return card;
        if (typeof value === 'string') value = Card.Values.indexOf(value);
        return Util.findWhere(this.cards, { suit, value }) as any;
    }

    /** Generate a game state from an audit-log */
    get history() { return this.myPlayer.terminal.history }
    set history(lines: TerminalActivity[]) {
        lines ||= [];
        this.reset();
        const terminals = this.players.map(p => p.terminal);
        this.players.forEach(p => (p.cards = []) && (p.terminal = new Terminal));

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

        this.players.forEach((p, i) => p.terminal = terminals[i])
        this.myPlayer.terminal.history = lines;
        console.groupEnd();
    }

    reset() {
        this.players.forEach(p => Object.assign(p, { score: 0, bags: 0 }))
        this.currentPlayer = Util.shuffle([...this.players])[0];
        this.deal();
        return this;
    }


    set names(names: string[]) { this.players.forEach((player, index) => player.name = names[index] || `Player ${index + 1}`) }

    get book() { return this.books[this.books.length - 1]; }

    get cardsPlayed() { return this.books.reduce((cards, book) => [...cards, ...book.cards], [] as Card[]); }

    get spadesBroken() { return this.cardsPlayed.some(c => c.suit === Suit.SPADES); }

    get handComplete() { return this.books.length === 13 && this.book.complete; }

    get winner() { return this.players.slice(0, 2).sort((a, b) => a.score - b.score).slice(-1)[0]; }

    get finished() { return this.winner.totalScore >= 500 }

    get teams() { return [this.myPlayer, this.myPlayer.nextPlayer].map(p => p.team) }

    get myPlayer() { return this.players[this.perspective] }

    get isItMyTurn() { return this.currentPlayer === this.myPlayer }

    get bidding() { return this.bids.length < 4 }

    get status() {
        return this.bidding && (this.isItMyTurn ? 'Make your bid' : `${this.currentPlayer.name} bids`)
            || (this.isItMyTurn ? 'Your turn' : `${this.currentPlayer.name}'s turn`)
            || ''
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

    get playersInPerspective() {
        const arr = [...this.players, ...this.players].slice(this.perspective % this.players.length, this.perspective + this.players.length);
        if (arr.length !== 4) debugger;
        return arr;
    }

    play(card: Card) {
        if (!this.canPlay(card)) throw new Error(this.cantPlay(card));
        Util.removeElements(this.currentPlayer.cards, card);
        this.book.cards.push(card);
        this.currentPlayer = this.currentPlayer.nextPlayer;
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

    //#region asynchronous interactivity
    paused: boolean = false;
    speed = 20;
    async pause(ms: number) {
        this.paused = true;
        await Util.pause((ms || 1) / this.speed);
        this.paused = false;
    }

    async broadcast(message: any) {
        console.log('BROADCAST: ', message, 'p1-', TerminalRestApiClient.httpClient, this.players[1]);
        await Promise.all(this.players.map((p, i) => {
            console.log(`begin ${i}`);
            return p
                .terminal.send(message)
                .then(() => console.log(`done ${i}`));
        }));
        console.log('/BROADCAST')
    }

    async promptAllPlayers(options: Prompt) {
        return Promise.all(this.players.map(p => p.terminal.prompt(options)))
    }

    // 1) STDOUT: Welcome 2) PROMPT{CHOICES:[offline,online]} 3) HAS-EXISTING? 4.1) YES: PROMPT{JOIN-EXISTING,CREATE-NEW} 4.2) NO: CREATE-NEW 5) PLAY GAME 6) GOTO 1
    static async run({
        terminal,
        names = ['alex', 'clinton', 'liujing', 'alana'],
        baseuri,
        wsuri,
    } = {} as { terminal: Terminal; wsuri: string; baseuri: string; names?: string[] }) {
        terminal.send('Welcome');
        const gameType = await terminal.prompt({
            type: 'select',
            name: 'game-type',
            message: 'choose',
            initial: 'online',
            choices: ['offline', 'online'].map(c => ({ title: c, value: c })) as { title: string; value: string }[]
        });
        if (gameType === 'offline') {
            await Game.play({ names, terminals: [terminal] });
        } else if (gameType === 'online') {
            const name = names[0] || await terminal.prompt({ type: 'text', message: 'what is your name?', name: 'name' });
            const freeTerminal = Util.findWhere(await TerminalRestApiClient.freeTerminals, { service: 'Game' });
            if (freeTerminal && (await terminal.prompt({
                message: `There is an existing game (${freeTerminal.terminal}). What would you like to do?`,
                type: 'select',
                name: 'game-type',
                initial: 'join-it',
                choices: ['join-it', 'create-new-game'].map(c => ({ title: c, value: c }))
            })) === 'join-it') {
                const _terminal = await WebTerminal.retrieve({
                    wsuri,
                    baseuri,
                    service: freeTerminal?.service,
                    instance: freeTerminal.instance,
                    id: freeTerminal.terminal,
                });
                await TerminalRestApiClient.getTerminalOwnership(_terminal.service, _terminal.instance, _terminal.id, { name });
                for (const item of Util.where(_terminal.history, { type: 'stdout' })) await terminal.send(item.message);
                const handler = async (last = _terminal.last) => {
                    if (last.type === 'prompt' && last.options && !('resolved' in last.options)) {
                        await _terminal.respond(await terminal.prompt(last.options));
                    }
                    else if (last.type === 'stdout') await terminal.send(last.message);
                    else console.debug(last)
                }
                _terminal.subscribe({ handler });
                if (_terminal.prompted) await handler();
                await Util.waitUntil(() => _terminal.finished);              // allow the remote-game to interact with this game through the remote-terminal (which is shared)
            } else { // create-new-game
                // create-new-game for playing online -- initially 3 vacant seats -- invite robots and online-playhers
                const terminals = [terminal];
                for (let i = 2; i <= 4; i++) {
                    console.log(`i = ${i}`)
                    const playerType = await terminal.prompt({
                        type: 'select',
                        name: 'playerType',
                        message: `Player ${i} type: `, // robot or online
                        initial: i == 2 ? 'online' : 'robot',
                        choices: [
                            { title: 'robot', value: 'robot', },
                            { title: 'online', value: 'online', },
                        ]
                    });
                    const instance = Util.UUID;
                    const service = 'Game';
                    const terminalId = `${Util.UUID}-player${i}`;
                    const playerTerminal: Terminal = playerType === 'online' && (await WebTerminal.createTerminal({ wsuri, baseuri, service, instance, terminal: terminalId }, null as any))
                        || (null as any);
                    playerTerminal && console.log(playerTerminal.id);
                    terminals.push(playerTerminal);
                }
                await Game.play({ terminals });
                Util.waitUntil(() => Game.instance).then(console.log)
            }
        }
    }

    /** Play this game interactively using asynchronous input and output */
    static instance: Game;
    static async play({
        names = ['alex', 'clinton', 'liujing', 'alana'] as string[],
        terminals = [] as Terminal[],
    }) {
        const game = Game.instance = new Game();
        terminals.forEach((t, i) => t && (game.players[i].terminal = t));
        names.forEach((t, i) => game.players[i].name = t);
        for (let i = 0; i < 4; i++)
            game.players[i].name ||= (await game.players[i].terminal.prompt({
                type: 'text',
                name: 'name',
                message: `What is your name?`,
                initial: `Player ${i + 1}`,
            }));

        // Start and finish a game, and then confirm to repeat
        do {
            game.reset();

            const displayScore = () => game.broadcast(`Score: ${game.myPlayer.totalScore} vs ${game.myPlayer.nextPlayer.totalScore} `);

            while (!game.finished) {
                if (game.bidding) {             // GET BIDS             WRITE(CARDS), READ(PLAYER BID), WRITE(BID)
                    await game.currentPlayer.terminal.send(`${game.currentPlayer.name} (#${game.players.indexOf(game.currentPlayer) + 1}), here are your cards: ${Object
                        .values(Suit)
                        .map(suit => ({ suit, cards: game.currentPlayer.cardsOfSuit(suit) }))
                        .filter(({ cards }) => cards.length)
                        .map(({ suit, cards }) => `${suit}(${(cards).map((card: Card) => card.Value).join(', ')})`)
                        .join(', ')
                        }`);
                    console.log('prompting current player to bid...')
                    game.bid(
                        (await game.currentPlayer.terminal.prompt({
                            message: `${game.currentPlayer.name}, how many books do you bid?`,
                            type: 'number',
                            name: 'bid',
                            min: 0,
                            max: 13,
                            initial: game.currentPlayer.estimatedBooks
                        }))
                    );
                    console.log('/prompting current player to bid...')

                    {
                        const { player, books } = game.bids.slice(-1)[0];
                        await game.broadcast(`${player.name} (#${game.players.indexOf(player) + 1}) bids ${books}`);
                        console.log('-- done broadcast')
                        await game.pause(1000);
                    }
                    if (!game.bidding) await game.broadcast('Bid    : ' + game.bid_as_string)
                }

                else if (!game.bidding) {       // PLAY CARDS           WRITE(BID, ACTUAL), READ(CARD), WRITE(CARD), WRITE(BOOK_WINNER), WRITE(GAME_WINNER)
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
                        name: 'index',
                        message: `${game.currentPlayer.name}, which card would you like to play?`,
                        choices,
                        initial: game.currentPlayer.chooseCardSimple.toString(),
                    };
                    console.log('GAME: prompting user for the card to play', options);
                    const cardName = await game.currentPlayer.terminal.prompt(options);
                    console.log('/GAME: prompting user for the card to play', options, cardName);
                    const card: Card = game.currentPlayer.cards.find(c => c.toString() == cardName) as any;
                    if (!card) { console.log({ CP: game.currentPlayer.name, cardName, GAMECard: game.getCard(cardName) }); debugger; }
                    await game.broadcast(`${game.currentPlayer.name} plays the ${card.toString()}`);
                    console.log('broadcast over');
                    {
                        Util.removeElements(game.currentPlayer.cards, card); game.book.cards.push(card); await game.pause(1000); game.currentPlayer.cards.push(card); game.book.cards.pop();
                        game.play(card);
                        await game.pause(1000);
                    }
                    if (book.complete) await game.broadcast(`${book.winner.name} wins the trick`);
                    if (book !== game.book && game.books.length === 1) { await displayScore(); await game.pause(1000); }
                    if (game.finished) await game.broadcast(`Game Over: You ${game.winner} `);
                    console.log('next in loop')
                }
            }
        } while (await game
            .promptAllPlayers({
                message: 'Would you like to play again?',
                type: 'toggle',
                name: 'playAgain'
            })
            .then(val => val.every(v => v.playAgain))
        );
    }

}

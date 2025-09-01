import { expect } from 'chai';
import { Card, SpadesGame } from "./SpadesGame";
import { Terminal } from "@hawryschuk-terminal-restapi";

describe('Spades Game', () => {
    let game: SpadesGame;
    const players = new Array(4).fill(undefined).map((p, i) => `Player ${i}`);

    beforeEach(() => game = new SpadesGame(players));

    it('Contains four players', () => { expect(game.players.length).to.equal(4) });

    describe('Game Player', () => {
        it('knows the current turn', () => { expect(game.turn) })
        it('knows the partner', () => { expect(game.turn.partner === game.players[2]) })
        it('has 13 cards', () => { expect(game.players[0].cards.length).to.equal(13) });
    });

    describe('Game Book', () => {
        it('the player with the highest of the led suit wins', () => {
            const book: Card[] = [
                { suit: 'C', value: '4' },
                { suit: 'C', value: '10' },
                { suit: 'C', value: '3' },
                { suit: 'C', value: 'Q' },
            ];
            expect(SpadesGame.highest(book, 'C')).to.equal(book[3]);
        })
        it('the player with the highest spade wins', () => {
            const book: Card[] = [
                { suit: 'C', value: '4' },
                { suit: 'C', value: '10' },
                { suit: 'S', value: '3' },
                { suit: 'C', value: 'Q' },
            ];
            expect(SpadesGame.highest(book, 'C')).to.equal(book[2]);
        })
    });

    it('Requires a bid before playing a card', () => {
        expect(game.turn.bid).to.equal(undefined);
    });

    it('Can play a card', () => {
        const { turn: turn } = game;
        game.players.forEach(() => game.bid(3));
        game.discard(turn.cards.find(c => c.suit !== 'S')!);
        expect(game.turn).to.not.equal(turn);
        expect(game.turn).to.equal(players[1]);
    });

    it('Will not let the player play spades if they have spades', () => {
        for (let i = 0; i < 4; i++) game.bid(3);    // ARRANGE: a bid of 3 by each person        
        while (!game.turn.cards.some(c => c.suit === 'S')) game.turn = game.players[(game.players.indexOf(game.turn) + 1) % 4];
        const card: Card = game.turn.cards.find(c => c.suit == 'S')!;
        expect(() => game.discard(card)).to.throw;
    });

    it('plays a book', () => {
        // for (let i = 0; i < 4; i++) game.bid(3);    // ARRANGE: a bid of 3 by each person        
        // for (let i = 0; i < 4; i++) {
        //     const card: Card = game.turn.cards.find(c => c.suit == game.book.suit)  // same suit
        //         || game.turn.cards.find(c => c.suit !== Suit.SPADES)                // non spades
        //         || game.turn.cards[0];                                              // first card
        //     game.play(card);
        // }
    });

    it('completes a hand', () => {
        // while (game.bidding) game.bid(3);
        // while (!game.players[0].totalScore) {
        //     const card: Card = game.turn.cards.find(c => c.suit == game.book.suit)
        //         || game.turn.cards.find(c => c.suit !== Suit.SPADES)
        //         || game.turn.cards[0];
        //     game.play(card);
        // }
        // expect(game.players[0].totalScore).to.be.ok;
    });

    it('completes a game', async () => {
        // let plays = 0;
        // const game = new SpadesGame({ terminals: new Array(4).fill(0).map(() => new Terminal) }).deal();
        // while (!game.finished && plays++ < 100) {
        //     if (game.bidding) game.bid(game.turn.estimatedBooks);
        //     else game.play(game.turn.chooseCardSimple);
        // }
    });

});

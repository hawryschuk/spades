import { expect } from 'chai';
import { Suit } from "./Suit";
import { Card } from "./Card";
import { Game } from "./Game";
import { Book } from "./Book";
import { Terminal } from "@hawryschuk/terminals";

describe('Spades Game', () => {
    let game: Game;

    beforeEach(() => game = new Game().deal());

    it('Contains four players', () => { expect(game.players.length).to.equal(4) });

    describe('Game Player', () => {
        it('knows the next player', () => { expect(game.currentPlayer.nextPlayer === game.players[1]) })
        it('knows the partner', () => { expect(game.currentPlayer.partner === game.players[2]) })
        it('has 13 cards', () => { expect(game.players[0].cards.length).to.equal(13) });
    });

    describe('Game Book', () => {
        it('the player with the highest of the led suit wins', () => {
            const book = new Book();
            Object.assign(book, {
                cards: [
                    game.getCard(Suit.CLUBS, 4),
                    game.getCard(Suit.CLUBS, 10),
                    game.getCard(Suit.CLUBS, 3),
                    game.getCard(Suit.CLUBS, 12),
                ]
            });
            book.cards.forEach((card, index) => card.player = game.players[index]);
            expect(book.winner).to.equal(book.cards[3].player)
        })
        it('the player with the highest spade wins', () => {
            const book = new Book();
            Object.assign(book, {
                cards: [
                    game.getCard(Suit.SPADES, 4),
                    game.getCard(Suit.CLUBS, 10),
                    game.getCard(Suit.CLUBS, 3),
                    game.getCard(Suit.CLUBS, 12),
                ]
            });
            book.cards.forEach((card, index) => card.player = game.players[index]);
            expect(book.highest).to.equal(book.cards[0]);
            expect(book.winner).to.equal(book.cards[0].player)
        })
    });

    it('Requires a bid before playing a card', () => {
        const game = new Game({ terminals: [new Terminal] }).deal();
        expect(() => game.play(game.currentPlayer.cards[0])).to.throw('bidding');
    });

    it('Can play a card', () => {
        while (game.bidding) game.bid(3);
        const { currentPlayer: turn } = game;
        const card: Card = game.currentPlayer.cards.find(c => c.suit !== Suit.SPADES) || game.currentPlayer.cards[0];
        game.play(card);
        expect(game.currentPlayer).to.not.equal(turn);
        expect(game.currentPlayer).to.equal(turn.nextPlayer);
    });

    it('Will not let the player play spades if they have spades', () => {
        for (let i = 0; i < 4; i++) game.bid(3);    // ARRANGE: a bid of 3 by each person        
        while (!game.currentPlayer.hasSpades) game.currentPlayer = game.currentPlayer.nextPlayer;
        const card: Card = game.currentPlayer.cards.find(c => c.suit == Suit.SPADES) as any;
        expect(() => game.play(card)).to.throw('spadelead');
    });

    it('plays a book', () => {
        for (let i = 0; i < 4; i++) game.bid(3);    // ARRANGE: a bid of 3 by each person        
        for (let i = 0; i < 4; i++) {
            const card: Card = game.currentPlayer.cards.find(c => c.suit == game.book.suit)  // same suit
                || game.currentPlayer.cards.find(c => c.suit !== Suit.SPADES)                // non spades
                || game.currentPlayer.cards[0];                                              // first card
            game.play(card);
        }
    });

    it('completes a hand', () => {
        while (game.bidding) game.bid(3);
        while (!game.players[0].totalScore) {
            const card: Card = game.currentPlayer.cards.find(c => c.suit == game.book.suit)
                || game.currentPlayer.cards.find(c => c.suit !== Suit.SPADES)
                || game.currentPlayer.cards[0];
            game.play(card);
        }
        expect(game.players[0].totalScore).to.be.ok;
    });

    it('completes a game', async () => {
        let plays = 0;
        const game = new Game({ terminals: new Array(4).fill(0).map(() => new Terminal) }).deal();
        while (!game.finished && plays++ < 100) {
            if (game.bidding) game.bid(game.currentPlayer.estimatedBooks);
            else game.play(game.currentPlayer.chooseCardSimple);
        }
    });

});

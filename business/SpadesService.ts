import { Util } from "@hawryschuk-common/util";
import { BaseService } from "@hawryschuk-terminal-restapi";
import { GamePlay, SpadesGame } from "./SpadesGame";
import { SpadesRobot } from "./SpadesRobot";

/** Stock-Ticker : spot prices, player assets */
export class SpadesService<T = any> extends BaseService {
    static override USERS = 4;
    static override NAME = 'Spades';
    static override ROBOT = SpadesRobot;

    async start() {
        const game = new SpadesGame(this.table.sitting.map(t => t.input.Name));
        Object.assign(window, { service: this, game })
        while (!game.finished) {
            const { turn, move, players } = game;
            const { name } = turn;
            const index = players.indexOf(turn);
            const terminal = this.table.sitting[index];
            const onError = (e: Error) => { console.error(e); debugger; return terminal.send({ type: 'error', message: e.message }); };
            if (!move) debugger;
            if (move === 'bid') {
                /** Send all players their cards */
                if (players.every(player => !(player.bid! >= 0)))
                    await Promise.all(players.map(player => this.send<GamePlay>({
                        name: player.name,
                        cards: [...player.cards],
                    }, [player.name])));
                await Util.retry({
                    onError,
                    pause: 500,
                    block: async () => {
                        const action: GamePlay = {
                            name,
                            bid: await terminal.prompt({
                                clobber: true,
                                name: 'bid',
                                type: 'select',
                                choices: game.validBids.map(c => ({ title: `${c}`, value: c })),
                            })
                        };
                        await this.broadcast(game.push(action));
                    }
                });
            } else if (move === 'discard') {
                const leads = game.book.filter(Boolean).length == 0;
                if (leads) {
                    const action: GamePlay = { leads: turn.name };
                    await this.broadcast(game.push(action));
                }

                await Util.retry({
                    onError,
                    pause: 500,
                    block: async () => {
                        const action: GamePlay = {
                            name,
                            discard: await terminal.prompt({
                                clobber: true,
                                name: 'discard',
                                type: 'select',
                                choices: game.validDiscards.map(card => ({ value: card, title: `${card.suit}${card.value}` }))
                            })
                        };
                        await this.broadcast(game.push(action));
                    }
                });

                if (game.tookBook)
                    await this.broadcast(game.push({ books: game.tookBook.name }));
            }
        }
        console.log('gameoooover!!')
        const { winner, loser } = game;
        const winners = winner!.players.map(({ name }) => this.terminals.find(t => t.input.Name === name)!);
        const losers = loser!.players.map(({ name }) => this.terminals.find(t => t.input.Name === name)!);
        return { winners, losers };
    }
}

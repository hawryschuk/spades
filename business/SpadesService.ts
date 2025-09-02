import { Util } from "@hawryschuk-common/util";
import { BaseService, Prompt, Terminal } from "@hawryschuk-terminal-restapi";
import { ServiceRobot } from "@hawryschuk-terminal-restapi/ServiceRobot";
import { GamePlay, SpadesGame } from "./SpadesGame";

export class SpadesRobot extends ServiceRobot {
    constructor(terminal: Terminal) { super(terminal); }
    async handlePrompts(prompts: Record<string, Prompt[]>): Promise<void> {
        // const game = new SpadesGame(this.client.Table!.sitting, this.client.Service!.Instance?.messages!, this.client.UserName!);
        const random = (name: string) => this.terminal.answer({ [name]: Util.randomElement(prompts[name][0]!.choices!.map(c => c.value)) });
        if (prompts.bid) await this.terminal.answer({ bid: 2 }); //await random('bid');
        if (prompts.discard) await random('discard');
    }
}


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
                    for (const player of players) {
                        const terminal = this.table.sitting[players.indexOf(player)];
                        await this.send<GamePlay>({ cards: [...player.cards], name: player.name }, terminal);
                    }
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

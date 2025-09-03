import { Util } from "@hawryschuk-common/util";
import { ServiceRobot, Terminal, Prompt } from "@hawryschuk-terminal-restapi";

export class SpadesRobot extends ServiceRobot {
    constructor(terminal: Terminal) { super(terminal); }
    async handlePrompts(prompts: Record<string, Prompt[]>): Promise<void> {
        // const game = new SpadesGame(this.client.Table!.sitting, this.client.Service!.Instance?.messages!, this.client.UserName!);
        const random = (name: string) => this.terminal.answer({ [name]: Util.randomElement(prompts[name][0]!.choices!.map(c => c.value)) });
        if (prompts.bid) await this.terminal.answer({ bid: 2 }); //await random('bid');
        if (prompts.discard) await random('discard');
    }
}

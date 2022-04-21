import { Component, OnInit } from '@angular/core';
import { Util } from '@hawryschuk/common';
import { Terminal, WebTerminal } from '@hawryschuk/terminals';
import { Game } from '../../../../business';

@Component({
  selector: 'app-game3',
  templateUrl: './game3.component.html',
  styleUrls: ['./game3.component.scss']
})
export class Game3Component {
  baseURL = 'http://localhost:8001';
  onlineGame3!: Game;         // game 3 - local-app, local-terminal-1, remote-terminal-2
  onlineGame4!: Game;         // game 3 - remote-app, remote-terminal-2
  game$ = (async () => {
    const service = 'my-spades';
    const instance = new Date().getTime().toString();
    const opponent = await WebTerminal.createTerminal({ baseuri: this.baseURL, service, instance, terminal: `opponent` });

    // GAME 3 : VIEW 7 : Remote application, player 2
    opponent.subscribe({
      handler: () => {
        // debugger;
        this.onlineGame4 = (window as any).onlineGame4 = new Game({ history: [...opponent.history], terminals: [, opponent] })
      }
    })

    // GAME 3 : VIEW 6 : Local application synched online : Player 1 - Local Human, Player 2 - Remote Human
    this.onlineGame3 = (window as any).onlineGame3 = new Game({ terminals: [new Terminal, opponent] });
    opponent.notify();

  })();
}

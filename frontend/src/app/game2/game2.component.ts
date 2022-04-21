import { Component, OnInit } from '@angular/core';
import { Util } from '@hawryschuk/common';
import { WebTerminal, TerminalRestApiClient } from '@hawryschuk/terminals';
import { Game } from '../../../../business';

@Component({
  selector: 'app-game2',
  templateUrl: './game2.component.html',
  styleUrls: ['./game2.component.scss']
})
export class Game2Component {
  baseURL = 'http://localhost:8001';
  onlineGame!: Game;          // game 2 : online-server-side : player1
  onlineGame2!: Game;         // game 2 : online-server-side : player2 
  game$ = (async () => {
    {// GAME 2 : VIEW 4, VIEW 5
      const service = '@hawryschuk-spades';
      const { instance } = await Util.waitUntil(async () => Util.findWhere(await TerminalRestApiClient.freeTerminals, { service }));
      const alex = new WebTerminal({ baseuri: this.baseURL, service, instance, id: 't1', owner: { name: 'alex-web' } });
      const clinton = new WebTerminal({ baseuri: this.baseURL, service, instance, id: 't2', owner: { name: 'clinton-web' } });
      alex.subscribe({ handler: () => this.onlineGame = (window as any).onlineGame = new Game({ history: alex.history, terminals: [alex] }) })
      clinton.subscribe({ handler: () => this.onlineGame2 = (window as any).onlineGame2 = new Game({ history: clinton.history, terminals: [null as any, clinton] }) })
    }
  })();
}

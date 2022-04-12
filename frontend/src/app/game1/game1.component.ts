import { Component, OnInit } from '@angular/core';
import { Util } from '@hawryschuk/common/util';
import { BaseService } from '../../../../../@hawryschuk-terminal-restapi';
import { Terminal } from '../../../../../@hawryschuk-terminal-restapi/Terminal';
import { Game } from '../../../../business';

@Component({
  selector: 'app-game1',
  templateUrl: './game1.component.html',
  styleUrls: ['./game1.component.scss']
})
export class Game1Component implements OnInit {
  constructor() { }
  ngOnInit(): void { }

  game = new Game({ terminals: [new Terminal, null as any, new Terminal] });                // game 1 : local-app       : view 1(player 1-human), view 2(player 3-human)
  mirrorGame!: Game;          // game 1 : local-app-clone : view 3(player 2-log) 
  game$ = (async () => {
    (window as any).game1 = this.game;
    this.game.terminals[1].subscribe({
      handler: () =>
        this.mirrorGame = (window as any).mirrorGame = new Game({ history: this.game.terminals[1].history })
    });
  })();
}

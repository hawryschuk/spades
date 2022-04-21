import { Component, OnInit } from '@angular/core';
import { Util } from '@hawryschuk/common';
import { interval } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseService, Terminal, TerminalRestApiClient, WebTerminal } from '@hawryschuk/terminals';
import { Game, Player, RobotTerminal, VacantTerminal } from '../../../../business';
import { ApiService } from '../api.service';

@Component({
  selector: 'app-application1',
  templateUrl: './application1.component.html',
  styleUrls: ['./application1.component.scss']
})
export class Application1Component {
  game: Game = (window as any).game = new Game({ terminals: [new Terminal] });
  reset() { this.game.reset() }
  newGame() { this.game.reset() }

  constructor(public api: ApiService) { }

  //#region online
  get baseuri() { return this.api.features.baseuri; }// 'https://96fh0ga37c.execute-api.us-east-1.amazonaws.com/prod'; // 'http://localhost:8001'
  service = 'Game';
  instance = new Date().getTime().toString();
  get players(): Player[] { return this.game?.players || [] }
  get vacancies(): boolean { return this.players.some(p => p.terminal instanceof VacantTerminal) }
  get remotePlayers(): Player[] { return this.players.filter(p => p.terminal instanceof WebTerminal) }
  get robotPlayers(): Player[] { return this.players.filter(p => p.terminal instanceof RobotTerminal) }
  get remotePlayersOnline(): Player[] { return this.remotePlayers.filter(p => p.terminal.owner) }
  get started() { return this.remotePlayersOnline.length + this.robotPlayers.length === 3 }
  async playOnline() {
    this.reset();

    // join an existing game
    const terminals = await TerminalRestApiClient.terminals;
    const { instance, terminal } = (await Util.findWhere([...terminals].reverse(), { service: this.service, available: true })) || {} as any;
    console.log({ EXISTING_GAMES_TO_JOIN: { instance, terminal } })
    if (instance && confirm('Would you like to join this existing game')) {
      const _terminal = await WebTerminal.retrieve({ baseuri: this.baseuri, service: this.service, instance, id: terminal, owner: { name: 'web-app' } });
      _terminal.subscribe({
        handler: () => {
          this.game = (window as any).game = new Game({ history: _terminal.history });
          this.game.players[this.game.perspective].terminal = _terminal;
        }
      });
      _terminal.notify();
    }

    // create a new game
    else {
      console.log('you are a local-instance operator')
      this.game = (window as any).game = new Game({ terminals: [new Terminal({ id: 'player1' }), new VacantTerminal, new VacantTerminal, new VacantTerminal] })
    }
  }

}

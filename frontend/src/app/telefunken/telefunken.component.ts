import { Component, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Game, Card, Player, RobotTerminal, VacantTerminal, Meld } from '../../../../../Telefunken/business';
import { Terminal, TerminalActivity, TerminalRestApiClient, WebTerminal } from '@hawryschuk/terminals';
import { Util } from '@hawryschuk/common';
import { ApiService } from '../api.service';
import { BehaviorSubject, interval, of, Subject } from 'rxjs';
import { concatMap, debounce, debounceTime, delay, filter, map, reduce, takeUntil, takeWhile } from 'rxjs/operators';
import { BaseComponent } from '../spades/spades.component';


@Component({
  selector: 'app-telefunken',
  templateUrl: './telefunken.component.html',
  styleUrls: ['./telefunken.component.scss']
})
export class TelefunkenComponent extends BaseComponent implements OnInit {
  constructor(public api: ApiService) {
    super();
  }

  @Input() baseuri = 'http://localhost:8001';
  @Input() game: Game = new Game({ terminals: [new Terminal] });
  @Input() perspective = 0;
  @Input() tableService = false;

  Number = Number;

  buy() {
    this.terminal.prompts.buy && this.terminal.respond(true);
  }
  draw() {
    this.terminal.prompts.buy && this.terminal.respond(false);
  }

  get cards() { return [...this.game.players[this.perspective].cards].sort((a, b) => a.value - b.value) }

  activity$ = new BehaviorSubject('');
  error$ = new BehaviorSubject('')
  message$ = this.activity$.pipe(concatMap(message => of(message).pipe(delay(750))));

  get melds() { return this.game.melds }

  ngOnInit() {
    this.game.run();
    (window as any).game = this.game;
    this.terminal.subscribe({
      handler: (activity: TerminalActivity) => {
        const message = activity.message || activity.options.message || JSON.stringify(activity);
        if (/^error: /.test(message)) {
          this.error$.next(message.replace(/^error: /, ''));
        } else if (!(
          /^Here are your cards/.test(message)
          || activity.type === 'prompt' && 'resolved' in activity.options
        )) {
          this.activity$.next(message);
          if (activity.type === 'stdout') this.error$.next('')
        }
      }
    });
    this.terminal.subscribers[0].handler(this.terminal.history.slice(-1)[0])
  }

  scoreWidth(totalScore: number) {
    return Math.max(0, 122 * totalScore / 500)
  }

  async bid(amount: number) {
    if (this.terminal.prompts.bid)
      await this.api.load({
        title: 'bid',
        block: () => this.terminal.answer({ bid: amount }),
      });
  }

  ack_hand() {
    if (this.terminal.prompts.ack_hand && !this.api.loading)
      this.api.load({
        title: 'ack_hand',
        block: () => this.terminal.answer({ ack_hand: new Date().getTime() }),
      })
  }

  ack_game() {
    if (this.terminal.prompts.ack_game && !this.api.loading)
      this.api.load({
        title: 'ack_game',
        block: () => this.terminal.answer({ ack_game: new Date().getTime() }),
      })
  }

  async inviteOnline(player: Player) {
    if (player.terminal instanceof VacantTerminal) {
      const terminal = await WebTerminal.createTerminal({
        baseuri: this.baseuri,
        service: 'Game',
        instance: this.game.id,
        terminal: Util.UUID,
        history: player.terminal.history
      });
      player.terminal = terminal;
      await player.terminal.notify();
    }
  }

  inviteRobot(player: Player) {
    // for (const player of this.players.slice(1))
    //   if (player.terminal instanceof VacantTerminal) {
    //     player.terminal = Object.assign(new RobotTerminal(player), { history: player.terminal.history });
    //     player.terminal.notify();
    //   }
  }

  boot(player: Player) {
    const { terminal } = player;
    if (!(terminal instanceof VacantTerminal)) {
      terminal.finished = new Date;
      if (terminal instanceof WebTerminal) TerminalRestApiClient.deleteTerminal('Game', this.game.id, terminal.id);
      player.terminal = new VacantTerminal({ history: terminal.history });
    }
  }

  get terminal() { return this.players[0].terminal }
  get Perspective() { return (this.perspective + this.game.perspective) % 4; }
  set Perspective(p: number) { this.perspective = (this.perspective + p) % 4; }
  get players() {
    return (
      [
        ...this.game.playersInPerspective,
        ...this.game.playersInPerspective
      ])
      .slice(this.perspective % 4, this.perspective + 4);
  }
  get status() {
    return this.perspective
      ? Object.assign(new Game(), this.game, { players: this.players }).status
      : this.game.status;
  }

  meld() {
    this.terminal.answer({ meld: [this.selected.map(card => this.game.players[0].cards.indexOf(card))] });
    this.selected = [];
  }

  discard() {
    this.terminal.answer({ meld: [[]], discard: this.selected[0].name });
    this.selected = [];
  }

  selected = [];
  isSelected(card: Card) {
    return this.selected.includes(card) && 'selected'
  }

  async onClick(card: Card) {
    this.selected.includes(card)
      ? Util.removeElements(this.selected, card)
      : this.selected.push(card)
  }


}

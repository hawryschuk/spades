import { Component, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Game, Card, Player, RobotTerminal, VacantTerminal } from '../../../../business';
import { Terminal, TerminalRestApiClient, WebTerminal } from '../../../../../@hawryschuk-terminal-restapi';
import { Util } from '@hawryschuk/common';
import { ApiService } from '../api.service';
import { BehaviorSubject, interval, Subject } from 'rxjs';
import { reduce, takeUntil, takeWhile } from 'rxjs/operators';

@Component({ selector: 'app-base-component', template: '', styles: [''] })
export class BaseComponent implements OnDestroy {
  readonly destroyed$ = new Subject();
  ngOnDestroy() { this.destroyed$.complete() }
}

@Component({
  selector: 'app-spades',
  templateUrl: './spades.component.html',
  styleUrls: ['./spades.component.scss']
})
export class SpadesComponent extends BaseComponent implements OnInit {
  constructor(public api: ApiService) {
    super();
  }

  @Input() baseuri = 'http://localhost:8001';
  @Input() game: Game;
  @Input() perspective = 0;
  @Input() tableService = false;

  Number = Number;

  ngOnInit() {// autoplay
    interval(200)
      .pipe(takeUntil(this.destroyed$))
      .pipe(reduce((acc) => {
        let { last, time, responding } = acc;
        const [activityItem] = this.terminal.promptedActivity.filter(i => 'initial' in i.options);
        const age = new Date().getTime() - time;
        if (activityItem !== last) {
          last = activityItem;
          time += age;
        }
        if (age > 750 && this.api.features.autoplay && activityItem && !responding) {
          console.log('auto responding!')
          responding = true;
          this
            .terminal
            .respond(activityItem.options.initial, undefined, this.terminal.history.indexOf(activityItem))
            .then(() => acc.responding = false)
        }
        return Object.assign(acc, { last, time, responding });
      }, { responding: false, last: null, time: new Date().getTime() }))
      .subscribe();
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

  async onClick(card: Card) {
    if (this.terminal.prompts.card && !this.api.loading && this.game.canPlay(card))
      await this.api.load({
        block: () => this.terminal.answer({ card: card.toString() }),
        title: 'play card'
      });
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
}

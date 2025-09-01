// https://magisterrex.files.wordpress.com/2014/07/stocktickerrules.pdf

import { Component, computed, effect, input, Input, model, OnDestroy, OnInit, Signal, signal } from '@angular/core';
import { Util } from '@hawryschuk-common/util';
import { ServiceCenterClient, Terminal } from '@hawryschuk-terminal-restapi';
import { GamePlay, SpadesGame } from '../../../../business/SpadesGame';
import { FormsModule, NgForm } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { onTerminalUpdated } from '@hawryschuk-terminal-restapi/frontend/src/app/terminal/onTerminalUpdated';
import { CardComponent } from '../card/card.component';


const str = (count = 0, char = ' ') => {
  const str = Util.safely(() => new Array(count).fill(char).join(''));
  if (str === undefined) debugger;
  return str;
};

@Component({
  imports: [CommonModule, FormsModule, CardComponent],
  selector: 'app-spades',
  templateUrl: './spades.component.html',
  styleUrls: ['./spades.component.scss'],
  standalone: true,
})
export class SpadesComponent {
  SpadesGame = SpadesGame;
  terminal = input.required<Terminal>();
  private updated$ = signal(new Date);

  get client() { return ServiceCenterClient.getInstance<GamePlay>(this.terminal()); }
  get game() { return this.game$() }; private game$ = computed(() => {
    const { users, messages } = this.updated$() && this.client.Service!.Instance!;
    const game = new SpadesGame(users, messages, this.client.UserName);
    return game;
  });

  get discardables() { return this.discardables$(); }; discardables$ = computed(() => {
    const choices = this.updated$() ? this.terminal().prompts.discard?.[0].choices : undefined;
    return choices ? choices.map(c => Util.findWhere(this.game.player.cards, c.value)!) : undefined;
  });

  get discardables2() {
    const choices = this.terminal().prompts.discard?.[0].choices;
    const d = choices ? choices.map(c => Util.findWhere(this.game.player.cards, c.value)!) : undefined;
    debugger;
    return d;
  }

  get directions() { return this.directions$(); }; directions$ = computed(() => {
    if (this.game) {
      const index = this.game.players.indexOf(this.game.player);
      return {
        south: index,
        west: (index + 1) % 4,
        north: (index + 2) % 4,
        east: (index + 3) % 4,
      };
    } else {
      return undefined;
    }
  });

  get players() { return this.players$(); }; players$ = computed(() => {
    if (this.game && this.directions) {
      return {
        south: this.game.players[this.directions.south],
        west: this.game.players[this.directions.west],
        north: this.game.players[this.directions.north],
        east: this.game.players[this.directions.east],
      };
    } else
      return undefined;
  });

  constructor() {
    Object.assign(window, { spades: this });
    onTerminalUpdated({ component: this, handler: () => { this.updated$.set(new Date); }, terminal: this.terminal });
  }

  scoreWidth(totalScore: number) { return Math.max(0, 122 * totalScore / 500) }

  books = 1;

  get ourteam() { return this.game!.teams[0] }
  get opponents() { return this.game!.teams[1] }
  get overlap() { return Math.max(0, this.ourteam.bid + this.opponents.bid - 13) }
  get bags() { return Math.max(0, 13 - this.ourteam.bid - this.opponents.bid); }
  get unplayed() { return 13 - this.ourteam.books - this.opponents.books; }
  get bid_as_string() {
    return [
      str(this.game!.teams[0].bid - this.overlap, 'G'),
      str(this.overlap, 'X'),
      str(this.bags, '_'),
      str(this.opponents.bid - this.overlap, 'R'),
    ].join('').split('')
  }
  get bid_as_string2() {
    return [
      str(this.bags, '_'),
      str(this.ourteam.bid - this.overlap, 'G'),
      str(this.overlap, 'X'),
      str(this.opponents.bid - this.overlap, 'R'),
    ].join('').split('')
  }
  get progress_as_string() {
    return [
      str(this.ourteam.books, 'G'),
      str(this.unplayed, '_'),
      str(this.opponents.books, 'R'),
    ].join('').split('');
  }

}
import { Component, OnInit } from '@angular/core';
import { Terminal, ServiceCenterClient, ServiceCenter } from '@hawryschuk-terminal-restapi';
import { ServiceCenterComponent } from '@hawryschuk-terminal-restapi/frontend/src/app/service-center/service-center.component';
import { SpadesService } from "../../../business/SpadesService";
import { CommonModule } from '@angular/common';
import { Util } from '@hawryschuk-common/util';
import { SpadesComponent } from './spades/spades.component';
import { SpadesGame } from 'business/SpadesGame';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ServiceCenterComponent, SpadesComponent],
  providers: [],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  terminal = new Terminal;
  terminals = [this.terminal];

  serviceCenter = new ServiceCenter().register(SpadesService);
  get client() { return ServiceCenterClient.getInstance(this.terminal); }

  pauseTime = 20;

  get game() { return (window as any).game as SpadesGame }

  async ngOnInit() {
    Object.assign(window, { app: this, Util });


    /** User: Alex : Started a 1 person game of stock ticker */
    await this.serviceCenter.join(this.terminal);
    await this.terminal.answer({
      name: 'alex',
      service: 'Spades',
      menu: [
        'Create Table',
        'Invite Robot',
        'Sit',
        'Invite Robot',
        'Invite Robot',
        'Ready',
      ],
    });

    return;
    await Util.waitUntil(() => this.game);
    while (!this.game.finished) {
      await Util.waitUntil(() => this.game.finished || this.terminal.prompts.discard || this.terminal.prompts.bid, { pause: 50 });
      if (this.terminal.prompts.bid) await this.terminal.answer({ bid: 2 });
      if (this.terminal.prompts.discard) await this.terminal.answer({ discard: this.terminal.prompts.discard[0].choices![0].value });
      await Util.pause(this.pauseTime);
    }
    debugger;
    return;
    // return;
    /** Player: Liujing : Joins Alex's table mid-way through his game */
    // await Util.pause(1000);
    this.terminals.push(this.terminal = new Terminal);
    await this.serviceCenter.join(this.terminal);
    const table = await Util.waitUntil(() => this.client.Tables[0]);
    await this.terminal.answer({
      name: 'michael',
      service: 'Stock Ticker',
      menu: 'Join Table',
      table: table.id
    });

    // return;

    /** New Player : Starts a 2 person game of stock ticker with the robot 
     * - and sends a message to alex
    */
    this.terminals.push(this.terminal = new Terminal);
    await this.serviceCenter.join(this.terminal);
    await this.terminal.answer({
      name: 'paula',
      service: 'Stock Ticker',
      menu: [
        'Create Table',
        'Sit',
        'Invite Robot',
        // 'Ready',
        // 'Direct Message',
        // 'Direct Message'
      ],
      seats: 2,
      // to: ['alex', 'michael'],
      // message: ['hi alex', 'hi michael']
      // trades: new Array(10).fill(JSON.stringify([{ type: 'buy', stock: 'silver', shares: 2 }]))
    });

  }
}

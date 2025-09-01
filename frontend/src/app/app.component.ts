import { Component, OnInit } from '@angular/core';
import { Terminal, ServiceCenterClient, ServiceCenter } from '@hawryschuk-terminal-restapi';
import { ServiceCenterComponent } from '@hawryschuk-terminal-restapi/frontend/src/app/service-center/service-center.component';
import { SpadesService } from "../../../business/SpadesService";
import { CommonModule } from '@angular/common';
import { Util } from '@hawryschuk-common/util';
import { SpadesComponent } from './spades/spades.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ServiceCenterComponent,SpadesComponent],
  providers: [],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  terminal = new Terminal;
  terminals = [this.terminal];

  serviceCenter = new ServiceCenter().register(SpadesService);
  get client() { return ServiceCenterClient.getInstance(this.terminal); }

  async ngOnInit() {
    Object.assign(window, { app: this });


    /** User: Alex : Startsd a 1 person game of stock ticker */
    await this.serviceCenter.join(this.terminal);
    await this.terminal.answer({
      name: 'alex',
      service: 'Spades',
      menu: [
        'Create Table',
        'Sit',
        'Ready',
        'Invite Robot',
        'Invite Robot',
        'Invite Robot',
      ],
      bid: 3,
    });

    return;
    for (let i = 1; i <= 13; i++) {
      const [{ choices }] = await Util.waitUntil(() => this.terminal.prompts.discard);
      await this.terminal.answer({ discard: choices![0].value });
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

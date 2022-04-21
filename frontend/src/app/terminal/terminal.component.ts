import { ChangeDetectorRef, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { Util } from '@hawryschuk/common';
import { BehaviorSubject } from 'rxjs';
import { Terminal } from '@hawryschuk/terminals';
@Component({
  selector: 'app-terminal',
  templateUrl: './terminal.component.html',
  styleUrls: ['./terminal.component.scss']
})
export class TerminalComponent implements OnInit {
  constructor(public cd: ChangeDetectorRef) { }
  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;
  @Input() terminal!: Terminal;
  Number = Number;
  respond(value: any) { this.terminal.respond(value) }

  scrollTop$ = new BehaviorSubject<number>(null);
  scrollToBottom() {
    this.scrollTop$.next(this.myScrollContainer.nativeElement.scrollHeight);
    this.cd.markForCheck();
    this.cd.detectChanges();
  }

  ngOnInit(): void {
    this.terminal.subscribe({
      handler: async () => {
        Util.safely(() => this.scrollToBottom());
        if (document.querySelector('#prompt input[disabled]'))
          await Util
            .waitUntil(() => document.querySelector('#prompt input:not([disabled])'))
            .then((input: any) => {
              input.focus();
              input.checked = true;
            });
      }
    });
  }


}

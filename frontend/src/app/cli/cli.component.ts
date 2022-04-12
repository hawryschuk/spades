import { Component, OnDestroy } from '@angular/core';
import { combineLatest, from, interval } from 'rxjs';
import { map, switchMap, takeUntil } from 'rxjs/operators';
import { Util } from '../../../../../@hawryschuk-common/dist';
import { ApiService } from '../api.service';
import { BaseComponent } from '../spades/spades.component';

@Component({
  selector: 'app-cli',
  templateUrl: './cli.component.html',
  styleUrls: ['./cli.component.scss']
})
export class CliComponent extends BaseComponent implements OnDestroy {
  ngOnDestroy() { super.ngOnDestroy(); this.api.features.autoconnect = true; }
  constructor(public api: ApiService) { super(); this.api.features.autoconnect = false; }

  autorefresh = interval(5000)
    .pipe(takeUntil(this.destroyed$))
    .pipe(switchMap(async () => { this.api.refresh$.next(new Date); }))
    .subscribe();

  services$ = this.api.terminals$.pipe(map(terminals => Util.unique(terminals.map(terminal => terminal.service))))
  instances$ = combineLatest([this.api.terminals$, this.api.service$]).pipe(map(([terminals, service]) => Util.unique(Util.where(terminals, { service }).map(t => t.instance))))
  terminals$ = combineLatest([this.api.terminals$, this.api.service$, this.api.instance$]).pipe(map(([terminals, service, instance]) => { return Util.where(terminals, { service, instance }); }));

}

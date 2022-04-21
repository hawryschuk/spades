import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CardComponent } from './card/card.component';
import { TerminalComponent } from './terminal/terminal.component';
import { SpadesComponent } from './spades/spades.component';
import { HttpClientModule } from '@angular/common/http';
import { DocumentationComponent } from './documentation/documentation.component';
import { CliComponent } from './cli/cli.component';
import { Game1Component } from './game1/game1.component';
import { Game2Component } from './game2/game2.component';
import { Game3Component } from './game3/game3.component';
import { Application1Component } from './application1/application1.component';
import { ApiService } from './api.service';
import { LocationStrategy, HashLocationStrategy } from '@angular/common';
import { TableServiceComponent } from './table-service/table-service.component';
import { StockTickerComponent } from './stock-ticker/stock-ticker.component';
import { TelefunkenComponent } from './telefunken/telefunken.component';

@NgModule({
  declarations: [
    AppComponent,
    CardComponent,
    TerminalComponent,
    SpadesComponent,
    DocumentationComponent,
    CliComponent,
    Game1Component,
    Game2Component,
    Game3Component,
    Application1Component,
    TableServiceComponent,
    StockTickerComponent,
    TelefunkenComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
  ],
  providers: [
    ApiService,
    {
      provide: LocationStrategy,
      useClass: HashLocationStrategy
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
  constructor(private api: ApiService) { } // load-immediately instead of lazy load
}

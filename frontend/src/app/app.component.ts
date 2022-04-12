import { Component } from '@angular/core';
import { ApiService } from './api.service';
import { routes } from './app-routing.module';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  routes = routes;
  constructor(public api: ApiService) { }
}

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Component } from '@angular/core';

import { CliComponent } from './cli/cli.component';
import { TableServiceComponent } from './table-service/table-service.component';
import { TelefunkenComponent } from './telefunken/telefunken.component';

@Component({ selector: 'empty-component', template: '', })
export class EmptyComponent { }

export const routes: Routes = [

  {
    path: 'telefunken', component: TelefunkenComponent,    
  },

  {
    path: 'cli', component: CliComponent,
    children: [
      { path: '0.6.1-', component: EmptyComponent },
      { path: '0.6.2-', component: EmptyComponent },
    ]
  },

  {
    path: 'tableservice', component: TableServiceComponent,
    children: [
      { path: '0.7.1-', component: EmptyComponent },
      { path: '0.1.2-', component: EmptyComponent },
    ]
  },

  { path: '**', redirectTo: 'tableservice' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

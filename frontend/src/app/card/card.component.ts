import { Component, Input, OnInit } from '@angular/core';
import { Card } from '../../../../business/Card';

@Component({
  selector: 'app-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss']
})
export class CardComponent implements OnInit {

  constructor() { }

  ngOnInit(): void { }
  @Input() noclick!: string;
  @Input() card!: Card;
  @Input() name!: string;
  
}

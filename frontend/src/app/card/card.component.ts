import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss']
})
export class CardComponent implements OnInit {

  constructor() { }

  ngOnInit(): void { }
  @Input() noclick!: string;
  @Input() card!: { suit: string; value: number; };
  @Input() name!: string;

}

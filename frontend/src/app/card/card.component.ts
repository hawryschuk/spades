import { Component, input, Input, OnInit, output } from '@angular/core';
import { Card } from 'business/SpadesGame';

@Component({
  selector: 'app-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
  standalone: true
})
export class CardComponent {
  card = input.required<Card>();
  clickable = input<boolean>();
  name = input.required<string>();
  click = output();
}

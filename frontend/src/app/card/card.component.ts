import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class CardComponent {
  card = input.required<{ suit: any; value: any; }>();
  clickable = input<boolean>();
  name = input.required<string>();
  click = output();
}

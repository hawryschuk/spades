import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SpadesComponent } from './spades.component';

describe('SpadesComponent', () => {
  let component: SpadesComponent;
  let fixture: ComponentFixture<SpadesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SpadesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SpadesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

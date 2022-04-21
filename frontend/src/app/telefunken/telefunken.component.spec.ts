import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TelefunkenComponent } from './telefunken.component';

describe('SpadesComponent', () => {
  let component: TelefunkenComponent;
  let fixture: ComponentFixture<TelefunkenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TelefunkenComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TelefunkenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

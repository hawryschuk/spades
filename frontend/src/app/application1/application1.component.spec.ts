import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Application1Component } from './application1.component';

describe('Application1Component', () => {
  let component: Application1Component;
  let fixture: ComponentFixture<Application1Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ Application1Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(Application1Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

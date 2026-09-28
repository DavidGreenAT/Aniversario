import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Puzzle4 } from './puzzle4';

describe('Puzzle4', () => {
  let component: Puzzle4;
  let fixture: ComponentFixture<Puzzle4>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Puzzle4],
    }).compileComponents();

    fixture = TestBed.createComponent(Puzzle4);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

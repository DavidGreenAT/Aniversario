import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Puzzle1 } from './puzzle1';

describe('Puzzle1', () => {
  let component: Puzzle1;
  let fixture: ComponentFixture<Puzzle1>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Puzzle1],
    }).compileComponents();

    fixture = TestBed.createComponent(Puzzle1);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

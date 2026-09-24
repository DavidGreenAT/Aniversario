import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Puzzle2 } from './puzzle2';

describe('Puzzle2', () => {
  let component: Puzzle2;
  let fixture: ComponentFixture<Puzzle2>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Puzzle2],
    }).compileComponents();

    fixture = TestBed.createComponent(Puzzle2);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

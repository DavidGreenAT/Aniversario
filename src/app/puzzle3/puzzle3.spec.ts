import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Puzzle3 } from './puzzle3';

describe('Puzzle3', () => {
  let component: Puzzle3;
  let fixture: ComponentFixture<Puzzle3>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Puzzle3],
    }).compileComponents();

    fixture = TestBed.createComponent(Puzzle3);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

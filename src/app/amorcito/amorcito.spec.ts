import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Amorcito } from './amorcito';

describe('Amorcito', () => {
  let component: Amorcito;
  let fixture: ComponentFixture<Amorcito>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Amorcito],
    }).compileComponents();

    fixture = TestBed.createComponent(Amorcito);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

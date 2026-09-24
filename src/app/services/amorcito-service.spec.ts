import { TestBed } from '@angular/core/testing';
import { AmorcitoService } from './amorcito-service';

describe('AmorcitoService', () => {
  let service: AmorcitoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AmorcitoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

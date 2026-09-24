import {
  Injectable,
  inject
} from '@angular/core';

import {
  HttpClient
} from '@angular/common/http';

import {
  Observable
} from 'rxjs';


export type CategoriaPrenda =
  | 'blusas'
  | 'pantalones'
  | 'zapatos'
  | 'accesorios';


interface OutfitResponse {
  ok: boolean;
  imagenes: string[];
}

export interface OutfitHistorial {

  id: string;

  archivo: string;

  imagen: string;

  fecha: string;

}


interface HistorialResponse {

  ok: boolean;

  outfits: OutfitHistorial[];

}


@Injectable({
  providedIn: 'root'
})
export class OutfitService {

  private http =
    inject(HttpClient);

  private readonly apiUrl =
    'https://aniversario-mb40.onrender.com';


  generarOutfits(
    prendas: Record<
      CategoriaPrenda,
      File[]
    >
  ): Observable<OutfitResponse> {

    const formData =
      new FormData();


    Object.entries(prendas)
      .forEach(
        ([categoria, archivos]) => {

          archivos.forEach(
            archivo => {

              formData.append(
                categoria,
                archivo,
                archivo.name
              );

            }
          );

        }
      );


    return this.http.post<OutfitResponse>(
      `${this.apiUrl}/api/outfits`,
      formData
    );
  }

  obtenerHistorial():
  Observable<HistorialResponse> {

  return this.http
    .get<HistorialResponse>(
      `${this.apiUrl}/api/outfits/historial`
    );
}


obtenerUrlDescarga(
  archivo: string
): string {

  return (
    `${this.apiUrl}/api/outfits/descargar` +
    `?archivo=${encodeURIComponent(archivo)}`
  );

}
}

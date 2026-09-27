import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export type Lugar = 'parque' | 'mirador' | 'libreria';
type Obstaculo = { x: number; z: number; w: number; d: number };

/** Mundo procedural: no requiere modelos, imágenes ni assets externos. */
export class Mundo3D {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(48, 1, 0.1, 180);
  private readonly escenario = new THREE.Group();
  private readonly personaje = new THREE.Group();
  private readonly piernaI = new THREE.Group();
  private readonly piernaD = new THREE.Group();
  private readonly brazoI = new THREE.Group();
  private readonly brazoD = new THREE.Group();
  private readonly objetivo = new THREE.Vector3();
  private readonly destinoCamara = new THREE.Vector3();
  private readonly mirada = new THREE.Vector3();
  private readonly teclas = new Set<string>();
  private readonly resizeObserver: ResizeObserver;
  private obstaculos: Obstaculo[] = [];
  private esfera?: THREE.Mesh;
  private halo?: THREE.Mesh;
  private lago?: THREE.Mesh;
  private peces: THREE.Group[] = [];
  private lugar: Lugar = 'parque';
  private pausado = false;
  private recogida = false;
  private cercaAnterior = false;
  private anterior = 0;
  private tiempo = 0;
  private destruido = false;
  private tactil = { x: 0, z: 0 };
  private readonly reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor(
    private readonly host: HTMLElement,
    private readonly alAcercarse: (cerca: boolean) => void,
    private readonly alInteractuar: () => void,
    private readonly alPerderContexto: () => void
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute('aria-label', 'Escenario 3D. Camina con las flechas o W A S D. Pulsa E junto a la esfera.');
    this.renderer.domElement.tabIndex = 0;
    host.appendChild(this.renderer.domElement);
    this.scene.add(this.escenario, this.personaje);
    this.crearPersonaje();
    this.cambiarLugar('parque', false);
    this.resizeObserver = new ResizeObserver(() => this.redimensionar());
    this.resizeObserver.observe(host);
    this.redimensionar();
    window.addEventListener('keydown', this.keyDown);
    window.addEventListener('keyup', this.keyUp);
    window.addEventListener('blur', this.soltar);
    document.addEventListener('visibilitychange', this.visibilidad);
    this.renderer.domElement.addEventListener('webglcontextlost', this.contextoPerdido);
    this.renderer.setAnimationLoop(this.frame);
  }

  enfocar(): void { this.renderer.domElement.focus({ preventScroll: true }); }

  pausar(valor: boolean): void {
    this.pausado = valor;
    this.soltar();
  }

  moverTactil(x: number, z: number): void { this.tactil = { x, z }; }

  recoger(): void {
    this.recogida = true;
    if (this.esfera) this.esfera.visible = false;
    if (this.halo) this.halo.visible = false;
    this.actualizarCercania(false);
  }

  cambiarLugar(lugar: Lugar, recogida: boolean): void {
    this.liberar(this.escenario);
    this.escenario.clear();
    this.obstaculos = [];
    this.peces = [];
    this.esfera = undefined;
    this.halo = undefined;
    this.lago = undefined;
    this.lugar = lugar;
    this.recogida = recogida;
    this.soltar();
    this.actualizarCercania(false);
    this.personaje.position.set(0, 0, 12);
    this.personaje.rotation.y = Math.PI;
    this.camera.position.set(0, 13, 28);
    this.scene.background = new THREE.Color(lugar === 'libreria' ? '#191226' : '#0b1331');
    this.scene.fog = new THREE.Fog(lugar === 'libreria' ? '#191226' : '#0b1331', 42, 115);
    this.escenario.add(new THREE.HemisphereLight('#b5c8ff', '#352041', 2));
    const luna = new THREE.DirectionalLight('#d7e3ff', 2.2);
    luna.position.set(-12, 23, 10);
    luna.castShadow = true;
    luna.shadow.mapSize.set(1024, 1024);
    Object.assign(luna.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25, far: 90 });
    luna.shadow.bias = -0.001;
    this.escenario.add(luna);
    this.estrellas();
    if (lugar === 'parque') this.crearParque();
    if (lugar === 'mirador') this.crearMirador();
    if (lugar === 'libreria') this.crearLibreria();
    this.optimizarEstaticos();
    this.crearEsfera();
  }

  private material(color: THREE.ColorRepresentation, brillo = false): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.82,
      emissive: brillo ? color : '#000000', emissiveIntensity: brillo ? 1.4 : 0 });
  }

  private mesh(g: THREE.BufferGeometry, color: THREE.ColorRepresentation,
    x: number, y: number, z: number, parent: THREE.Object3D = this.escenario, brillo = false): THREE.Mesh {
    const m = new THREE.Mesh(g, this.material(color, brillo));
    m.position.set(x, y, z);
    m.castShadow = !brillo;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  private caja(x: number, y: number, z: number, w: number, h: number, d: number,
    color: THREE.ColorRepresentation, parent: THREE.Object3D = this.escenario): THREE.Mesh {
    return this.mesh(new THREE.BoxGeometry(w, h, d), color, x, y, z, parent);
  }

  private bola(x: number, y: number, z: number, radio: number,
    color: THREE.ColorRepresentation, parent: THREE.Object3D = this.escenario, brillo = false): THREE.Mesh {
    return this.mesh(new THREE.SphereGeometry(radio, 14, 10), color, x, y, z, parent, brillo);
  }

  private cilindro(x: number, y: number, z: number, arriba: number, abajo: number, h: number,
    color: THREE.ColorRepresentation, parent: THREE.Object3D = this.escenario): THREE.Mesh {
    return this.mesh(new THREE.CylinderGeometry(arriba, abajo, h, 12), color, x, y, z, parent);
  }

  private bloquear(x: number, z: number, w: number, d: number): void {
    this.obstaculos.push({ x, z, w, d });
  }

  private suelo(color: string): void {
    this.caja(0, -0.3, 0, 42, 0.6, 42, color);
    this.caja(0, -1.4, 0, 42.3, 2, 42.3, '#242238');
  }

  private farol(x: number, z: number): void {
    this.cilindro(x, 1.8, z, 0.09, 0.14, 3.6, '#302e49');
    this.bola(x, 3.7, z, 0.34, '#ffdf91', this.escenario, true);
    this.cilindro(x, 4.05, z, 0, 0.55, 0.35, '#3e3551');
    const luz = new THREE.PointLight('#ffcd79', 5, 9, 2);
    luz.position.set(x, 3.4, z);
    this.escenario.add(luz);
  }

  private arbol(x: number, z: number, escala = 1): void {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.scale.setScalar(escala);
    this.escenario.add(g);
    this.cilindro(0, 1.6, 0, 0.24, 0.38, 3.2, '#493751', g);
    this.bola(0, 3.8, 0, 1.5, '#246c63', g);
    this.bola(-0.8, 3.3, 0.2, 1.15, '#315f6b', g);
    this.bola(0.8, 3.5, -0.2, 1.15, '#497e65', g);
    this.bloquear(x, z, 1.2 * escala, 1.2 * escala);
  }

  private banco(x: number, z: number, rotacion = 0): void {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rotacion;
    this.escenario.add(g);
    this.caja(0, 0.9, 0, 3.2, 0.2, 1, '#ae8056', g);
    this.caja(0, 1.7, -0.5, 3.2, 1.1, 0.15, '#986543', g);
    for (const x of [-1.2, 1.2]) this.caja(x, 0.45, 0, 0.15, 0.9, 0.7, '#393444', g);
    this.bloquear(x, z, 3.5, 1.4);
  }

  private letrero(texto: string, x: number, y: number, z: number, ancho = 5): void {
    const canvas = document.createElement('canvas');
    canvas.width = 768; canvas.height = 160;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#221f35'; ctx.fillRect(0, 0, 768, 160);
    ctx.strokeStyle = '#dbbd76'; ctx.lineWidth = 8; ctx.strokeRect(8, 8, 752, 144);
    ctx.fillStyle = '#ffe9b2'; ctx.font = '40px Georgia'; ctx.textAlign = 'center';
    ctx.textBaseline = 'middle'; ctx.fillText(texto, 384, 80, 700);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(ancho, ancho / 4.8),
      new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
    mesh.position.set(x, y, z);
    this.escenario.add(mesh);
  }

  private crearParque(): void {
    this.suelo('#294c48');
    this.caja(0, 0.015, 4, 4, 0.04, 32, '#8f826d');
    this.caja(-6, 0.02, -12, 16, 0.04, 3, '#8f826d');
    const agua = new THREE.Mesh(new THREE.CircleGeometry(1, 64),
      new THREE.MeshStandardMaterial({ color: '#328ba9', metalness: 0.35, roughness: 0.2,
        transparent: true, opacity: 0.85 }));
    agua.rotation.x = -Math.PI / 2;
    agua.scale.set(6.5, 4.5, 1);
    agua.position.set(-7, 0.055, -3.5);
    this.escenario.add(agua); this.lago = agua;
    // Colisión elíptica del agua en puedeCaminar().
    for (let i = 0; i < 30; i++) {
      const a = i / 30 * Math.PI * 2;
      const piedra = this.bola(-7 + Math.cos(a) * 6.7, 0.17, -3.5 + Math.sin(a) * 4.7, 0.4, '#768791');
      piedra.scale.set(1.25, 0.7, 1);
    }
    for (let i = 0; i < 3; i++) {
      const pato = new THREE.Group();
      this.bola(0, 0.13, 0, 0.25, '#f5e8c2', pato).scale.set(1, 0.8, 1.5);
      this.bola(0, 0.4, 0.24, 0.15, '#f5e8c2', pato);
      this.caja(0, 0.38, 0.43, 0.15, 0.07, 0.2, '#eda748', pato);
      this.escenario.add(pato); this.peces.push(pato);
    }
    [[-17,-14],[-16,6],[-13,15],[7,-15],[16,-9],[16,4],[11,15],[5,3]].forEach(
      ([x,z],i) => this.arbol(x,z, 0.9 + (i % 3) * 0.15));
    this.banco(6, -4); this.banco(-15, 4);
    this.farol(3.2, 8); this.farol(-12, -10);
    for (let i = 0; i < 35; i++) {
      const x = 7 + Math.sin(i * 13.1) * 2.2, z = 5 + Math.cos(i * 7.3) * 3;
      this.cilindro(x, 0.22, z, 0.035, 0.035, 0.45, '#5f9254');
      this.bola(x, 0.5, z, 0.14, ['#f6d15b','#e3a8d5','#98cee3'][i % 3]);
    }
    this.letrero('El lago de lo que no dijimos', -8, 3.5, -15, 8);
    this.objetivo.set(-11, 1.1, -12);
  }

  private crearMirador(): void {
    this.suelo('#524d68');
    for (let i = -4; i <= 4; i++) this.caja(i * 4.5, 0.02, 0, 0.045, 0.04, 40, '#81758f');
    for (let i = -4; i <= 4; i++) this.caja(0, 0.021, i * 4.5, 40, 0.04, 0.045, '#81758f');
    // Barandal al borde de la terraza; la ciudad es escenografía inaccesible.
    for (let x = -20; x <= 20; x += 2) this.caja(x, 1, -19, 0.12, 2, 0.12, '#b4a4c6');
    this.caja(0, 2, -19, 40, 0.15, 0.2, '#c7b7d5');
    this.bloquear(0, -19, 42, 0.6);
    for (let i = 0; i < 54; i++) {
      const x = (i % 18 - 8.5) * 4.5;
      const z = -32 - Math.floor(i / 18) * 13;
      const h = 3 + ((i * 17) % 11);
      this.caja(x, h / 2 - 9, z, 3.2, h, 4, ['#273754','#414164','#303d5b'][i % 3]);
      for (let row = 0; row < Math.floor(h / 1.3); row++) {
        for (let col = -1; col <= 1; col++) {
          if ((i + row + col) % 3 === 0) continue;
          const ventana = this.caja(x + col * 0.8, -8.3 + row * 1.3, z + 2.02, 0.35, 0.55, 0.04, '#ffe6a1');
          (ventana.material as THREE.MeshStandardMaterial).emissive.set('#ffce7c');
          (ventana.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.4;
        }
      }
    }
    this.bola(-16, 23, -57, 3, '#e3d9fb', this.escenario, true);
    this.banco(-7, -12, Math.PI); this.banco(5, 5);
    this.farol(-15, -12); this.farol(15, 5);
    this.cilindro(10, 1, -15, 0.12, 0.12, 2, '#aaa8c1');
    const telescopio = this.cilindro(10, 2.2, -15, 0.24, 0.32, 1.5, '#d1a953');
    telescopio.rotation.x = Math.PI / 2.5;
    this.bloquear(10, -15, 1, 1.5);
    this.letrero('Un futuro con todas sus luces', 0, 3.7, -17, 9);
    this.objetivo.set(10, 1.1, -11);
  }

  private estante(x: number, z: number, rotacion = 0): void {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotacion;
    this.escenario.add(g);
    this.caja(0, 2, -0.5, 5, 4, 0.12, '#4b2d45', g);
    this.caja(-2.5, 2, 0, 0.18, 4.2, 1.2, '#794b54', g);
    this.caja(2.5, 2, 0, 0.18, 4.2, 1.2, '#794b54', g);
    for (let r = 0; r <= 4; r++) this.caja(0, r, 0, 5, 0.13, 1.2, '#91614d', g);
    const colores = ['#a3b887','#bf6f86','#d9b661','#739eae','#9b8daf'];
    for (let r = 0; r < 4; r++) {
      for (let j = 0; j < 12; j++) {
        const h = 0.5 + (j % 3) * 0.1;
        this.caja(-2.2 + j * 0.39, r + 0.12 + h / 2, 0.1, 0.28, h, 0.65, colores[(j + r) % 5], g);
        this.caja(-2.2 + j * 0.39, r + 0.25, 0.434, 0.18, 0.04, 0.02, '#ffe0a0', g);
      }
    }
    this.bloquear(x, z, rotacion ? 1.5 : 5.4, rotacion ? 5.4 : 1.5);
  }

  private crearLibreria(): void {
    this.suelo('#75534f');
    for (let i = -20; i <= 20; i++) this.caja(0, 0.02, i, 42, 0.025, 0.035, '#503a43');
    this.caja(0, 4, -20, 42, 8, 0.6, '#3b2c51');
    this.caja(-20, 3, 0, 0.6, 6, 40, '#352742');
    this.caja(20, 3, 0, 0.6, 6, 40, '#352742');
    for (const x of [-14,-7,7,14]) this.estante(x, -17);
    for (const z of [-9,0,9]) { this.estante(-17,z,Math.PI / 2); this.estante(17,z,-Math.PI / 2); }
    this.estante(-8,-5); this.estante(8,-5);
    this.caja(0, 0.04, 0, 7, 0.04, 25, '#54335f');
    this.caja(0, 0.065, 0, 6.5, 0.02, 24.5, '#61456d');
    this.caja(0, 1.05, -14, 4.5, 0.25, 2, '#ae8056');
    for (const x of [-1.8,1.8]) this.caja(x, 0.5, -14, 0.2, 1, 1.4, '#64413f');
    this.bloquear(0, -14, 4.7, 2.2);
    const libro = this.caja(0, 1.25, -14, 1.3, 0.18, 0.9, '#f2d690'); libro.rotation.y = 0.2;
    this.caja(0, 1.35, -14, 1.15, 0.04, 0.75, '#fff1ce');
    this.letrero('Librería · Historias por vivir', 0, 5.5, -19.5, 11);
    this.farol(-4, -11); this.farol(4, 8);
    const luz = new THREE.PointLight('#ffb970', 20, 32, 2); luz.position.set(0, 6, -8); this.escenario.add(luz);
    this.objetivo.set(0, 1.1, -11);
  }

  private optimizarEstaticos(): void {
    const grupos = new Map<string, { material: THREE.MeshStandardMaterial; meshes: THREE.Mesh[] }>();
    this.escenario.updateMatrixWorld(true);
    this.escenario.traverse(obj => {
      if (!(obj instanceof THREE.Mesh) || !(obj.material instanceof THREE.MeshStandardMaterial) || obj.material.transparent) return;
      let padre: THREE.Object3D | null = obj;
      while (padre) { if (this.peces.includes(padre as THREE.Group)) return; padre = padre.parent; }
      const mat = obj.material;
      const key = `${mat.color.getHex()}:${mat.emissive.getHex()}:${mat.emissiveIntensity}`;
      const g = grupos.get(key) ?? { material: mat, meshes: [] };
      g.meshes.push(obj); grupos.set(key,g);
    });
    for (const grupo of grupos.values()) {
      const copias = grupo.meshes.map(m => m.geometry.clone().applyMatrix4(m.matrixWorld));
      const unida = mergeGeometries(copias, false);
      copias.forEach(g => g.dispose());
      if (!unida) continue;
      const mat = grupo.material.clone();
      grupo.meshes.forEach(m => { m.removeFromParent(); m.geometry.dispose(); (m.material as THREE.Material).dispose(); });
      const mesh = new THREE.Mesh(unida,mat);
      mesh.castShadow = true; mesh.receiveShadow = true;
      this.escenario.add(mesh);
    }
  }

  private crearEsfera(): void {
    this.esfera = this.bola(this.objetivo.x, this.objetivo.y, this.objetivo.z,
      0.45, '#a3efff', this.escenario, true);
    this.halo = this.mesh(new THREE.TorusGeometry(0.78, 0.045, 8, 40), '#f6d173',
      this.objetivo.x, this.objetivo.y, this.objetivo.z, this.escenario, true);
    this.esfera.visible = this.halo.visible = !this.recogida;
    this.cilindro(this.objetivo.x, 0.18, this.objetivo.z, 0.9, 1, 0.35, '#80748f');
  }

  private crearPersonaje(): void {
    // Coraline estilizada: cabello azul, impermeable amarillo, botas y ojos naturales.
    this.cilindro(0, 1.25, 0, 0.36, 0.58, 1.15, '#f4c443', this.personaje);
    this.bola(0, 2.18, 0, 0.43, '#efc5b2', this.personaje);
    const pelo = this.bola(0, 2.3, -0.08, 0.48, '#2859b3', this.personaje); pelo.scale.set(1.05, 0.82, 1);
    this.bola(-0.39, 2.08, -0.04, 0.22, '#2352a3', this.personaje).scale.set(0.7, 1.6, 1);
    this.bola(0.39, 2.08, -0.04, 0.22, '#2352a3', this.personaje).scale.set(0.7, 1.6, 1);
    this.bola(-0.31, 2.42, 0.25, 0.2, '#3168c7', this.personaje).scale.set(1.5, 0.5, 1);
    for (const x of [-0.14, 0.14]) {
      this.bola(x, 2.15, 0.374, 0.095, '#fcf4e5', this.personaje);
      this.bola(x, 2.15, 0.452, 0.045, '#1a233a', this.personaje);
    }
    this.bola(0, 2.03, 0.42, 0.065, '#e4b299', this.personaje);
    this.caja(0, 1.3, 0.43, 0.035, 0.9, 0.05, '#9e7421', this.personaje);
    for (let y = 1; y < 1.7; y += 0.23) this.bola(0.13,y,0.44,0.038,'#fce89e',this.personaje);
    this.piernaI.position.set(-0.22, 0.78, 0);
    this.piernaD.position.set(0.22, 0.78, 0);
    for (const p of [this.piernaI,this.piernaD]) {
      this.cilindro(0,-0.3,0,0.13,0.12,0.6,'#374367',p);
      this.caja(0,-0.65,0.09,0.3,0.28,0.48,'#edd150',p);
      this.personaje.add(p);
    }
    this.brazoI.position.set(-0.45, 1.68, 0);
    this.brazoD.position.set(0.45, 1.68, 0);
    for (const b of [this.brazoI,this.brazoD]) {
      this.cilindro(0,-0.32,0,0.13,0.12,0.65,'#e9b52e',b);
      this.bola(0,-0.7,0,0.12,'#efc5b2',b);
      this.personaje.add(b);
    }
  }

  private estrellas(): void {
    const pos = new Float32Array(240 * 3);
    for (let i = 0; i < 240; i++) {
      pos[i * 3] = Math.sin(i * 127.1) * 75;
      pos[i * 3 + 1] = 12 + (Math.sin(i * 43.7) + 1) * 22;
      pos[i * 3 + 2] = Math.cos(i * 79.1) * 65;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.escenario.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#d6d5ff', size: 0.14 })));
  }

  private puedeCaminar(x: number, z: number): boolean {
    if (Math.abs(x) > 18.7 || Math.abs(z) > 18.2) return false;
    if (this.lugar === 'parque' && ((x + 7) / 6.95) ** 2 + ((z + 3.5) / 5.0) ** 2 < 1) return false;
    return !this.obstaculos.some(o => Math.abs(x - o.x) < o.w / 2 + 0.45 && Math.abs(z - o.z) < o.d / 2 + 0.45);
  }

  private actualizarCercania(cerca: boolean): void {
    if (cerca === this.cercaAnterior) return;
    this.cercaAnterior = cerca;
    this.alAcercarse(cerca);
  }

  private frame = (ahora: number): void => {
    if (this.destruido) return;
    const dt = Math.min((ahora - (this.anterior || ahora)) / 1000, 0.05);
    this.anterior = ahora;
    if (document.hidden) return;
    this.tiempo += dt;
    let x = 0, z = 0;
    if (!this.pausado) {
      x = Number(this.teclas.has('d') || this.teclas.has('arrowright')) - Number(this.teclas.has('a') || this.teclas.has('arrowleft')) + this.tactil.x;
      z = Number(this.teclas.has('s') || this.teclas.has('arrowdown')) - Number(this.teclas.has('w') || this.teclas.has('arrowup')) + this.tactil.z;
    }
    const longitud = Math.hypot(x,z);
    if (longitud > 0) {
      x /= longitud; z /= longitud;
      const p = this.personaje.position;
      const nuevoX = p.x + x * dt * 5.5, nuevoZ = p.z + z * dt * 5.5;
      if (this.puedeCaminar(nuevoX,p.z)) p.x = nuevoX;
      if (this.puedeCaminar(p.x,nuevoZ)) p.z = nuevoZ;
      this.personaje.rotation.y = Math.atan2(x,z);
    }
    const paso = longitud > 0 && !this.reducirMovimiento ? Math.sin(this.tiempo * 11) * 0.48 : 0;
    this.piernaI.rotation.x = this.brazoD.rotation.x = paso;
    this.piernaD.rotation.x = this.brazoI.rotation.x = -paso;
    const p = this.personaje.position;
    this.destinoCamara.set(p.x * 0.75, 13, p.z + 17);
    this.camera.position.lerp(this.destinoCamara, this.reducirMovimiento ? 1 : 1 - Math.exp(-dt * 5));
    this.mirada.set(p.x, 0.8, p.z - 3.5);
    this.camera.lookAt(this.mirada);
    if (this.esfera && this.halo && !this.reducirMovimiento) {
      this.esfera.position.y = this.halo.position.y = 1.2 + Math.sin(this.tiempo * 2) * 0.18;
      this.halo.rotation.y = this.tiempo;
    }
    this.peces.forEach((pato,i) => {
      const a = (this.reducirMovimiento ? 0 : this.tiempo * 0.15) + i * 2;
      pato.position.set(-7 + Math.cos(a) * 2.5, 0.1, -3.5 + Math.sin(a) * 1.5);
      pato.rotation.y = -a;
    });
    this.actualizarCercania(!this.recogida && Math.hypot(p.x - this.objetivo.x, p.z - this.objetivo.z) < 2.4);
    this.renderer.render(this.scene, this.camera);
  };

  private keyDown = (e: KeyboardEvent): void => {
    const target = e.target as HTMLElement | null;
    if (target?.closest('input,textarea,select,[contenteditable="true"]') || this.pausado) return;
    // No secuestra las flechas cuando el foco está fuera del juego.
    if (!this.host.contains(document.activeElement)) return;
    const k = e.key.toLowerCase();
    if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)) {
      e.preventDefault(); this.teclas.add(k);
    }
    if (k === 'e' && !e.repeat && this.cercaAnterior) { e.preventDefault(); this.alInteractuar(); }
  };
  private keyUp = (e: KeyboardEvent): void => { this.teclas.delete(e.key.toLowerCase()); };
  private soltar = (): void => { this.teclas.clear(); this.tactil = { x: 0, z: 0 }; };
  private visibilidad = (): void => { this.soltar(); this.anterior = 0; };
  private contextoPerdido = (e: Event): void => { e.preventDefault(); this.pausar(true); this.alPerderContexto(); };

  private redimensionar(): void {
    const { width, height } = this.host.getBoundingClientRect();
    this.renderer.setSize(Math.max(1,width), Math.max(1,height));
    this.camera.aspect = Math.max(1,width) / Math.max(1,height);
    this.camera.updateProjectionMatrix();
  }

  private liberar(root: THREE.Object3D): void {
    const geometrias = new Set<THREE.BufferGeometry>();
    const materiales = new Set<THREE.Material>();
    const texturas = new Set<THREE.Texture>();
    root.traverse(obj => {
      const m = obj as THREE.Mesh;
      if (m.geometry) geometrias.add(m.geometry);
      if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach(mat => {
        materiales.add(mat);
        const map = (mat as THREE.MeshBasicMaterial).map;
        if (map) texturas.add(map);
      });
      if (obj instanceof THREE.Light) obj.dispose();
    });
    texturas.forEach(t => t.dispose());
    geometrias.forEach(g => g.dispose());
    materiales.forEach(m => m.dispose());
  }

  destruir(): void {
    if (this.destruido) return;
    this.destruido = true;
    this.renderer.setAnimationLoop(null);
    this.resizeObserver.disconnect();
    window.removeEventListener('keydown',this.keyDown);
    window.removeEventListener('keyup',this.keyUp);
    window.removeEventListener('blur',this.soltar);
    document.removeEventListener('visibilitychange',this.visibilidad);
    this.renderer.domElement.removeEventListener('webglcontextlost',this.contextoPerdido);
    this.liberar(this.scene);
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}

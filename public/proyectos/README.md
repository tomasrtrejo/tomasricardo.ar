# 📁 Organización de Proyectos por Carpetas (Tomás Ricardo - DFM)

Cada proyecto o recuadro de la web está contenido en **su propia carpeta** dentro de su sección.

## 📂 Árbol de carpetas

```text
public/proyectos/
├── 01-bitacora/
│   ├── btr-01a/
│   │   ├── info.json          <-- Datos técnicos, título y descripción
│   │   └── (imágenes/planos)  <-- Tus fotos aquí
│   ├── btr-02b/
│   │   └── info.json
│   └── btr-03c/
│       └── info.json
│
├── 02-artefactos/
│   ├── art-01/
│   ├── art-02/
│   └── art-03/
│
├── 03-colaborativa/
│   ├── col-01/
│   ├── col-02/
│   └── col-03/
│
└── 04-industrial/
    ├── ind-01/
    ├── ind-02/
    └── ind-03/
```

---

## 🚀 Cómo agregar un nuevo proyecto en 3 pasos:

1. **Copia y renombra una carpeta existente**:
   Por ejemplo, copia `public/proyectos/01-bitacora/btr-01a/` y renómbrala como `btr-04d`.

2. **Edita el archivo `info.json`**:
   Cambia el código (`BTR-04D`), el título, la descripción y los materiales o tolerancias.
   Puedes escribir textos simples en español o en varios idiomas.

3. **Carga tus imágenes**:
   Pon tus fotos o planos dentro de la misma carpeta `btr-04d/` y referéncialas en `"images": ["mi-plano.svg", "foto-1.jpg"]`.

4. **¡Listo!**
   El nuevo recuadro se dibuja automáticamente en la web con su modal técnico correspondiente.

import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';

function createDefaultInfo(dirName: string, cat: { id: string; folder: string; name: string }) {
  const isCommercial = cat.id === 'p2' || cat.id === 'p3';
  return {
    code: dirName,
    folderName: dirName,
    year: String(new Date().getFullYear()),
    category: {
      es: cat.name.toUpperCase(),
      en: cat.name.toUpperCase(),
      pt: cat.name.toUpperCase()
    },
    badge: {
      es: 'REGISTRO DE TALLER',
      en: 'WORKSHOP LOG',
      pt: 'REGISTRO DE OFICINA'
    },
    title: {
      es: dirName.toUpperCase(),
      en: dirName.toUpperCase(),
      pt: dirName.toUpperCase()
    },
    subtitle: {
      es: 'Proyecto en proceso de documentación',
      en: 'Project documentation in progress',
      pt: 'Projeto em processo de documentação'
    },
    specs: [],
    report: {
      es: 'Documentación en proceso.',
      en: 'Documentation in progress.',
      pt: 'Documentação em andamento.'
    },
    commercial: isCommercial
      ? {
          type: 'direct',
          price: 50,
          currency: 'USD',
          isFromPrice: true,
          badge: { es: 'VENTA DIRECTA', en: 'DIRECT SALE', pt: 'VENDA DIRETA' },
          caption: { es: 'Producción a pedido // Envíos a coordinar', en: 'Made to order // Shipping arranged directly', pt: 'Produção sob encomenda // Frete a combinar' },
          buttonText: { es: 'ENCARGAR PIEZA', en: 'ORDER PIECE', pt: 'ENCOMENDAR PEÇA' }
        }
      : {
          type: 'rfq',
          badge: { es: 'CONSULTA', en: 'INQUIRY', pt: 'CONSULTA' },
          caption: { es: 'Consulta directa por desarrollo o proyecto', en: 'Direct inquiry for development or project', pt: 'Consulta direta para desenvolvimento ou projeto' },
          buttonText: { es: 'CONSULTA', en: 'INQUIRY', pt: 'CONSULTA' }
        }
  };
}

function getLiveProjects() {
  const baseDir = path.resolve(process.cwd(), 'public/proyectos');
  const catMap = [
    { id: 'p1', folder: '01-bitacora', name: '01 // La Bitácora' },
    { id: 'p2', folder: '02-artefactos', name: '02 // Lo Artesanal' },
    { id: 'p3', folder: '03-colaborativa', name: '03 // Manufactura Colaborativa' },
    { id: 'p4', folder: '04-industrial', name: '04 // Escalabilidad Industrial' }
  ];

  const imgExts = ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif'];

  const manifest: {
    categories: typeof catMap;
    projects: Record<string, any[]>;
  } = {
    categories: catMap,
    projects: { p1: [], p2: [], p3: [], p4: [] }
  };

  const fullData: Record<string, any[]> = { p1: [], p2: [], p3: [], p4: [] };
  const validCodes = new Set<string>();

  let viewsConfig: Record<string, number> = {};
  const viewsPath = path.join(baseDir, 'vistas.json');
  if (fs.existsSync(viewsPath)) {
    try {
      viewsConfig = JSON.parse(fs.readFileSync(viewsPath, 'utf-8'));
    } catch (e) {
      viewsConfig = {};
    }
  }

  let viewsUpdated = false;

  for (const cat of catMap) {
    const catPath = path.join(baseDir, cat.folder);
    if (!fs.existsSync(catPath)) continue;
    const entries = fs.readdirSync(catPath, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    for (const dirName of entries) {
      validCodes.add(dirName);
      const projPath = path.join(catPath, dirName);
      const files = fs.readdirSync(projPath);
      const images = files.filter(f => {
        const ext = path.extname(f).toLowerCase();
        return imgExts.includes(ext) && f !== 'info.json' && f.toLowerCase() !== 'cover.svg';
      }).sort((a, b) => {
        const numA = parseInt(a, 10);
        const numB = parseInt(b, 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
      });

      const defaultInfo = createDefaultInfo(dirName, cat);
      let info: any = {};
      const infoPath = path.join(projPath, 'info.json');
      if (fs.existsSync(infoPath)) {
        try {
          info = JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
        } catch (e) {
          info = {};
        }
      } else {
        // Automatically generate a starter info.json when a new folder is created
        info = { ...defaultInfo };
        try {
          fs.writeFileSync(infoPath, JSON.stringify(info, null, 2), 'utf-8');
        } catch (_e) {}
      }

      info._folder = `${cat.folder}/${dirName}`;
      info.folderName = dirName;
      info.code = dirName;

      if (typeof viewsConfig[dirName] !== 'number') {
        viewsConfig[dirName] = 0;
        viewsUpdated = true;
      }
      info.views = viewsConfig[dirName];

      if (!info.title) info.title = defaultInfo.title;
      if (!info.category) info.category = defaultInfo.category;
      if (!info.badge) info.badge = defaultInfo.badge;
      if (!info.subtitle) info.subtitle = defaultInfo.subtitle;
      if (!info.specs) info.specs = defaultInfo.specs;
      if (!info.report) info.report = defaultInfo.report;
      if (!info.commercial) info.commercial = defaultInfo.commercial;
      info.images = images.length > 0 ? images : (info.images || []);

      fullData[cat.id].push(info);
      manifest.projects[cat.id].push({
        folder: `${cat.folder}/${dirName}`,
        autoImages: images,
        views: info.views
      });
    }

    // Sort projects dynamically by views descending, ties by code
    fullData[cat.id].sort((a, b) => {
      const viewsA = typeof a.views === 'number' ? a.views : 0;
      const viewsB = typeof b.views === 'number' ? b.views : 0;
      if (viewsB !== viewsA) return viewsB - viewsA;
      return a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' });
    });
  }

  try {
    if (viewsUpdated) {
      fs.writeFileSync(viewsPath, JSON.stringify(viewsConfig, null, 2), 'utf-8');
    }
    fs.writeFileSync(path.join(baseDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');
  } catch (_e) {}

  return { manifest, fullData, validCodes };
}

// In-memory rate limiter for view counts to prevent abuse
const viewRateLimit = new Map<string, number>();

async function startServer() {
  const app = express();
  const port = process.env.PORT || 3000;

  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));

  // Security headers & block sensitive source/config files
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    const lowerPath = req.path.toLowerCase();
    if (
      lowerPath.includes('..') ||
      lowerPath.startsWith('/.env') ||
      lowerPath.startsWith('/.git') ||
      lowerPath === '/server.ts' ||
      lowerPath === '/package.json' ||
      lowerPath === '/tsconfig.json' ||
      lowerPath === '/vite.config.ts'
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  });

  // Read-only Manifest endpoint
  app.get('/manifest.json', (_req, res) => {
    try {
      const { manifest } = getLiveProjects();
      res.json(manifest);
    } catch (_err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Read-only Dynamic projects scanner endpoint
  app.get('/api/projects', (_req, res) => {
    try {
      const { manifest, fullData } = getLiveProjects();
      res.json({ manifest, fullData });
    } catch (_err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Validated & rate-limited view counter increment
  app.post('/api/projects/:code/view', (req, res) => {
    try {
      const code = String(req.params.code || '').trim();
      if (!/^[a-z0-9-]+$/i.test(code) || code.length > 40) {
        return res.status(400).json({ error: 'Invalid project code' });
      }

      const { validCodes } = getLiveProjects();
      if (!validCodes.has(code)) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const clientIp = req.ip || req.socket.remoteAddress || 'anon';
      const rateKey = `${clientIp}:${code}`;
      const now = Date.now();
      const lastView = viewRateLimit.get(rateKey) || 0;

      const baseDir = path.resolve(process.cwd(), 'public/proyectos');
      const viewsPath = path.join(baseDir, 'vistas.json');
      let views: Record<string, number> = {};
      if (fs.existsSync(viewsPath)) {
        try { views = JSON.parse(fs.readFileSync(viewsPath, 'utf-8')); } catch (_e) {}
      }

      if (now - lastView > 30000) {
        viewRateLimit.set(rateKey, now);
        views[code] = (views[code] || 0) + 1;
        fs.writeFileSync(viewsPath, JSON.stringify(views, null, 2));
      }

      res.json({ success: true, code, views: views[code] || 0 });
    } catch (_err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);

  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

startServer();

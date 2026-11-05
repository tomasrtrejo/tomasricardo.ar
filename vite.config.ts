import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

function getArgentinaDateFormatted(date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).formatToParts(date);
    const day = parts.find(p => p.type === 'day')?.value || String(date.getDate()).padStart(2, '0');
    const month = parts.find(p => p.type === 'month')?.value || String(date.getMonth() + 1).padStart(2, '0');
    const year = parts.find(p => p.type === 'year')?.value || String(date.getFullYear());
    return `${day}.${month}.${year}`;
  } catch (_e) {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}.${m}.${y}`;
  }
}

function autoProjectsManifestPlugin() {
  const updateManifest = () => {
    try {
      const proyectosDir = path.resolve(__dirname, 'public/proyectos');
      if (!fs.existsSync(proyectosDir)) return;

      const categoryMap = [
        { id: 'p1', folder: '01-bitacora', name: '01 // La Bitácora' },
        { id: 'p2', folder: '02-artefactos', name: '02 // Lo Artesanal' },
        { id: 'p3', folder: '03-colaborativa', name: '03 // Manufactura Colaborativa' },
        { id: 'p4', folder: '04-industrial', name: '04 // Escalabilidad Industrial' }
      ];

      const now = new Date();
      const manifest: {
        lastUpdated: string;
        lastUpdatedFormatted: string;
        categories: typeof categoryMap;
        projects: Record<string, any[]>;
      } = {
        lastUpdated: now.toISOString(),
        lastUpdatedFormatted: getArgentinaDateFormatted(now),
        categories: categoryMap,
        projects: { p1: [], p2: [], p3: [], p4: [] }
      };

      let viewsConfig: Record<string, number> = {};
      const viewsPath = path.join(proyectosDir, 'vistas.json');
      if (fs.existsSync(viewsPath)) {
        try {
          viewsConfig = JSON.parse(fs.readFileSync(viewsPath, 'utf-8'));
        } catch (_e) {
          viewsConfig = {};
        }
      }

      const imageExts = ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif'];

      for (const cat of categoryMap) {
        const catPath = path.join(proyectosDir, cat.folder);
        if (fs.existsSync(catPath)) {
          const subdirs = fs.readdirSync(catPath, { withFileTypes: true })
            .filter(d => d.isDirectory())
            .map(d => d.name)
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

          for (const dirName of subdirs) {
            const projectDir = path.join(catPath, dirName);
            const infoPath = path.join(projectDir, 'info.json');
            if (!fs.existsSync(infoPath)) {
              const isCommercial = cat.id === 'p2' || cat.id === 'p3';
              const starterInfo: Record<string, any> = {
                code: dirName,
                folderName: dirName,
                year: String(new Date().getFullYear()),
                title: dirName.toUpperCase(),
                subtitle: 'Proyecto en proceso de documentación',
                report: 'Documentación en proceso.'
              };
              if (isCommercial) {
                starterInfo.commercial = {
                  type: 'direct',
                  price: 50,
                  currency: 'USD',
                  isFromPrice: true
                };
              }
              try {
                fs.writeFileSync(infoPath, JSON.stringify(starterInfo, null, 2), 'utf-8');
              } catch (_e) {}
            }

            const files = fs.readdirSync(projectDir);
            const autoImages = files
              .filter(f => {
                const ext = path.extname(f).toLowerCase();
                return imageExts.includes(ext) && f !== 'info.json' && f.toLowerCase() !== 'cover.svg';
              })
              .sort((a, b) => {
                const numA = parseInt(a, 10);
                const numB = parseInt(b, 10);
                if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
              });

            manifest.projects[cat.id].push({
              folder: `${cat.folder}/${dirName}`,
              autoImages,
              views: typeof viewsConfig[dirName] === 'number' ? viewsConfig[dirName] : 0
            });
          }
        }
      }

      fs.writeFileSync(path.join(proyectosDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');
    } catch (_e) {
      // Safe catch
    }
  };

  return {
    name: 'auto-projects-manifest',
    buildStart() {
      updateManifest();
    },
    transformIndexHtml(html: string) {
      const formatted = getArgentinaDateFormatted();
      return html.replace(
        /(<span id="last-updated-date"[^>]*>)([^<]*)(<\/span>)/,
        `$1${formatted}$3`
      );
    },
    configureServer(server: any) {
      updateManifest();
      server.watcher.on('add', (filePath: string) => {
        if (filePath.includes('public/proyectos')) {
          updateManifest();
        }
      });
      server.watcher.on('unlink', (filePath: string) => {
        if (filePath.includes('public/proyectos')) {
          updateManifest();
        }
      });
      server.watcher.on('addDir', (dirPath: string) => {
        if (dirPath.includes('public/proyectos')) {
          updateManifest();
        }
      });
      server.watcher.on('unlinkDir', (dirPath: string) => {
        if (dirPath.includes('public/proyectos')) {
          updateManifest();
        }
      });
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), autoProjectsManifestPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

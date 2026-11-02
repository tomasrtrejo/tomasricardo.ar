import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

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

      const manifest: {
        categories: typeof categoryMap;
        projects: Record<string, any[]>;
      } = {
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
              const starterInfo = {
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

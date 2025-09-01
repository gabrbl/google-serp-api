
const puppeteer = require('puppeteer');

async function scrapeGoogle(query, location, language) {
  let browser;
  
  try {
    // Configurar Puppeteer con técnicas anti-detección básicas
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
  '--disable-blink-features=AutomationControlled',
  '--disable-plugins',
        '--window-size=1366,768'
      ],
      ignoreDefaultArgs: ['--enable-automation'],
      ignoreHTTPSErrors: true
    });

    const page = await browser.newPage();

    // Configurar User-Agent realista
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Configurar headers adicionales
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    });

    // Script anti-detección básico
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });

    // Configurar viewport
    await page.setViewport({ width: 1366, height: 768 });

    // Construir URL de Google
    const googleUrl = buildGoogleUrl(query, location, language);

    // Navegar a Google
    await page.goto(googleUrl, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    // Esperar a que cargue el contenido
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Extraer datos
    const scrapingResult = await page.evaluate(() => {
      const result = {
        organicResults: [],
        knowledgeGraph: null,
        images: [],
        totalResults: 0
      };

      // Extraer total de resultados con selectores actualizados
      const statsSelectors = [
        '#result-stats',
        '.LHJvCe', 
        '[id*="result"]',
        '.sb_count',
        '.med'
      ];
      
      let statsElement = null;
      for (const selector of statsSelectors) {
        statsElement = document.querySelector(selector);
        if (statsElement) {
          break;
        }
      }
      
      if (statsElement) {
        const statsText = statsElement.textContent;
        const match = statsText.match(/[\d,\.]+/);
        if (match) {
          result.totalResults = parseInt(match[0].replace(/[,\.]/g, ''));
        }
      }

      // Selectores orgánicos actualizados para 2025 - usando XPath-like approach con CSS
      const organicSelectors = [
        // Selectores más específicos y actuales
        'div[data-ved] h3',
        'div.g h3',
        'div.tF2Cxc h3',
        'div.yuRUbf h3', 
        'div.MjjYud h3',
        'h3.LC20lb',
        'h3.DKV0Md',
        // Con enlaces
        'div[data-ved] h3 a',
        'div.g h3 a',
        'div.tF2Cxc h3 a',
        'div.yuRUbf h3 a',
        'div.MjjYud h3 a',
        // Fallbacks más generales
        'h3 a[href*="/url?q="]',
        'h3 a[href^="http"]',
        'a h3'
      ];
      
      let organicElements = [];
      let usedSelector = null;
      
      for (const selector of organicSelectors) {
        organicElements = document.querySelectorAll(selector);
        if (organicElements.length > 0) {
          usedSelector = selector;
          break;
        }
      }

      // Procesar resultados orgánicos
      Array.from(organicElements).forEach((element, index) => {
        if (index >= 10) return; // Limitar a 10 resultados

        try {
          let titleElement, linkElement;
          
          // Determinar si el elemento es un enlace o contiene un enlace
          if (element.tagName === 'A') {
            linkElement = element;
            titleElement = element.querySelector('h3') || element;
          } else if (element.tagName === 'H3') {
            titleElement = element;
            linkElement = element.closest('a') || element.querySelector('a') || element.parentElement.querySelector('a');
          } else {
            titleElement = element;
            linkElement = element.closest('a') || element.querySelector('a');
          }

          if (titleElement && linkElement) {
            const title = titleElement.textContent.trim();
            let link = linkElement.href;
            
            // Limpiar URLs de Google redirect
            if (link && link.includes('/url?q=')) {
              try {
                const urlParams = new URLSearchParams(link.split('?')[1]);
                const cleanUrl = urlParams.get('q');
                if (cleanUrl) {
                  link = decodeURIComponent(cleanUrl);
                }
              } catch (e) {
                console.log('Error limpiando URL:', e);
              }
            }
            
            // Buscar container del resultado
            const containerSelectors = [
              'div.g', 'div[data-ved]', '.rc', 'div.tF2Cxc', 'div.yuRUbf', 'div.kvH3mc', 'div.MjjYud'
            ];
            
            let containerElement = null;
            for (const containerSelector of containerSelectors) {
              containerElement = titleElement.closest(containerSelector);
              if (containerElement) break;
            }
            
            // Buscar snippet con selectores actualizados
            let snippet = '';
            if (containerElement) {
              const snippetSelectors = [
                '.VwiC3b',
                '.s3v9rd',
                '.st',
                'span[data-ved]',
                '.IsZvec',
                '.lEBKkf',
                'div[data-sncf]',
                '.hgKElc',
                '.Uroaid',
                '.yXK7lf'
              ];
              
              for (const snippetSelector of snippetSelectors) {
                const snippetEl = containerElement.querySelector(snippetSelector);
                if (snippetEl && snippetEl.textContent.trim().length > 15) {
                  snippet = snippetEl.textContent.trim();
                  break;
                }
              }
            }

            // Validar que tenemos datos mínimos válidos
            if (title && link && title.length > 3 && link.startsWith('http')) {
              result.organicResults.push({
                position: index + 1,
                title: title,
                link: link,
                snippet: snippet || null
              });
            }
          }
        } catch (e) {
          // Error procesando resultado
        }
      });

      // Extraer Knowledge Graph con múltiples selectores
      const kgSelectors = [
        '.kp-wholepage',
        '.knowledge-panel',
        '[data-attrid]',
        '.kp-header',
        '.mod'
      ];
      
      let kgElement = null;
      for (const selector of kgSelectors) {
        kgElement = document.querySelector(selector);
        if (kgElement) break;
      }
      
      if (kgElement) {
        const titleSelectors = ['h2', 'h3', '[data-attrid="title"]', '.qrShPb', '.SPZz6b'];
        const descSelectors = ['[data-attrid="description"]', '.kno-rdesc span', '.LrzXr'];
        
        let kgTitle = null;
        let kgDescription = null;
        
        for (const selector of titleSelectors) {
          kgTitle = kgElement.querySelector(selector);
          if (kgTitle && kgTitle.textContent.trim()) break;
        }
        
        for (const selector of descSelectors) {
          kgDescription = kgElement.querySelector(selector);
          if (kgDescription && kgDescription.textContent.trim()) break;
        }
        
        const kgImage = kgElement.querySelector('img[src*="gstatic"], img[src*="googleusercontent"], img[src*="wikimedia"]');
        const kgWebsite = kgElement.querySelector('a[href^="http"]');

        if (kgTitle && kgTitle.textContent.trim()) {
          const knowledgeGraph = {
            title: kgTitle.textContent.trim(),
            type: 'Knowledge Panel',
            description: kgDescription ? kgDescription.textContent.trim() : null,
            image: kgImage ? kgImage.src : null,
            website: kgWebsite ? kgWebsite.href : null,
            attributes: {}
          };

          // Extraer atributos adicionales
          const attributeElements = kgElement.querySelectorAll('[data-attrid]');
          attributeElements.forEach(attr => {
            const key = attr.getAttribute('data-attrid');
            const value = attr.textContent.trim();
            if (key && value && key !== 'title' && key !== 'description' && value.length < 200) {
              knowledgeGraph.attributes[key] = value;
            }
          });

          result.knowledgeGraph = knowledgeGraph;
        }
      }

      // Extraer imágenes (de la pestaña de imágenes si está disponible)
      const imageElements = document.querySelectorAll('img[src*="gstatic"], img[src*="googleusercontent"], img[data-src]');
      let imageCount = 0;
      imageElements.forEach((img, index) => {
        if (imageCount >= 10) return; // Limitar a 10 imágenes
        
        const src = img.src || img.getAttribute('data-src');
        if (src && src.includes('http') && !src.includes('logo') && !src.includes('icon')) {
          const parentLink = img.closest('a');
          let linkHref = parentLink ? parentLink.getAttribute('href') || parentLink.href : null;
          // Normalizar href relativo o vacío
          if (linkHref && linkHref.startsWith('/')) {
            linkHref = `https://www.google.com${linkHref}`;
          }
          // Validar que sea una URL absoluta http(s)
          const isHttp = linkHref && /^https?:\/\//i.test(linkHref);
          let hostname = 'google.com';
          if (isHttp) {
            try {
              hostname = new URL(linkHref).hostname;
            } catch (e) {
              hostname = 'google.com';
              linkHref = null;
            }
          } else {
            linkHref = null; // descartamos URLs no válidas (javascript:, mailto:, etc.)
          }

          result.images.push({
            position: imageCount + 1,
            title: (img.alt && img.alt.trim()) || `Imagen ${imageCount + 1}`,
            imageUrl: src,
            thumbnailUrl: src,
            source: hostname,
            link: linkHref || src
          });
          imageCount++;
        }
      });

      return result;
    });

    return scrapingResult;

  } catch (error) {
    console.error('Error en scraping:', error);
    
    // Si es un error de CAPTCHA o bloqueo
    if (error.message.includes('blocked') || error.message.includes('captcha')) {
      throw new Error('Google ha bloqueado la solicitud. Intente más tarde.');
    }
    
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

function buildGoogleUrl(query, location, language) {
  const baseUrl = 'https://www.google.com/search';
  const params = new URLSearchParams();
  params.append('q', query);
  params.append('hl', language || 'es');
  if (location) {
    params.append('near', location);
  }
  params.append('num', '10');
  params.append('start', '0');
  return `${baseUrl}?${params.toString()}`;
}

module.exports = { scrapeGoogle };

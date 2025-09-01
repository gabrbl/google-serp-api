const puppeteer = require('puppeteer');
const fs = require('fs');

async function debugScrapeGoogle(query, location, language) {
  let browser;
  
  try {
    console.log('Iniciando debug scraper...');
    
    // Configurar Puppeteer con más opciones de debugging
    browser = await puppeteer.launch({
      headless: 'new', // Cambiaremos a false si es necesario
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
  '--disable-extensions',
        '--disable-plugins',
        '--disable-images', // Para cargar más rápido
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ]
    });

    const page = await browser.newPage();

    // Configurar User-Agent más realista
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Configurar headers adicionales
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    });

    // Configurar viewport
    await page.setViewport({ width: 1366, height: 768 });

    // Construir URL de Google
    const googleUrl = buildGoogleUrl(query, location, language);

    // Navegar a Google con logging detallado
    const response = await page.goto(googleUrl, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Esperar más tiempo para que cargue completamente
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Capturar screenshot para debugging
    await page.screenshot({ path: '/tmp/google_debug.png', fullPage: true });

    // Capturar HTML completo
    const htmlContent = await page.content();
    fs.writeFileSync('/tmp/google_debug.html', htmlContent);

    // Verificar si hay elementos de bloqueo/CAPTCHA
    const captchaCheck = await page.evaluate(() => {
      const indicators = {
        hasCaptcha: !!document.querySelector('#recaptcha, [id*="captcha"], [class*="captcha"]'),
        hasBlocked: !!document.querySelector('*').textContent.includes('Our systems have detected'),
        hasRobotCheck: !!document.querySelector('*').textContent.includes('unusual traffic'),
        title: document.title,
        bodyText: document.body ? document.body.textContent.substring(0, 500) : 'No body'
      };
      return indicators;
    });
    
    // Debugging detallado de selectores
    const selectorDebug = await page.evaluate(() => {
      const debug = {
        organicSelectors: {},
        knowledgeSelectors: {},
        imageSelectors: {},
        generalElements: {}
      };

      // Probar selectores orgánicos
      const organicSelectors = [
        'div.g h3',
        'div[data-ved] h3', 
        '.rc h3',
        'h3.LC20lb',
        'h3[class*="LC20lb"]',
        'div.g',
        '.rc',
        'div[data-ved]',
        'h3',
        'a h3'
      ];
      
      organicSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        debug.organicSelectors[selector] = {
          count: elements.length,
          firstText: elements[0] ? elements[0].textContent.substring(0, 100) : null
        };
      });

      // Probar selectores de knowledge graph
      const kgSelectors = [
        '.kp-wholepage',
        '.knowledge-panel', 
        '[data-attrid]',
        '.kp-header',
        '.mod',
        '.kno-ecr-pt',
        '.kno-rdesc'
      ];
      
      kgSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        debug.knowledgeSelectors[selector] = {
          count: elements.length,
          firstText: elements[0] ? elements[0].textContent.substring(0, 100) : null
        };
      });

      // Elementos generales para debugging
      debug.generalElements = {
        totalDivs: document.querySelectorAll('div').length,
        totalLinks: document.querySelectorAll('a').length,
        totalH3s: document.querySelectorAll('h3').length,
        hasResultStats: !!document.querySelector('#result-stats'),
        resultStatsText: document.querySelector('#result-stats') ? document.querySelector('#result-stats').textContent : null
      };

      return debug;
    });

    // Intentar extraer con selectores actualizados
    const scrapingResult = await extractDataWithNewSelectors(page);

    return {
      debugInfo: {
        url: page.url(),
        status: response.status(),
        captchaCheck,
        selectorDebug
      },
      scrapingResult
    };

  } catch (error) {
    console.error('Error en debug scraping:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function extractDataWithNewSelectors(page) {
  return await page.evaluate(() => {
    const result = {
      organicResults: [],
      knowledgeGraph: null,
      images: [],
      totalResults: 0
    };

    console.log('Iniciando extracción de datos...');

    // Extraer total de resultados con múltiples selectores
    const statsSelectors = ['#result-stats', '.LHJvCe', '[id*="result"]'];
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

    // Selectores orgánicos actualizados para 2025
    const organicSelectors = [
      // Nuevos selectores más específicos
      'div[data-ved] h3 a',
      'div.g h3 a', 
      'div.tF2Cxc h3 a',
      'div.yuRUbf h3 a',
      'h3.LC20lb a',
      // Fallbacks
      'h3 a[href*="/url?q="]',
      'h3 a[href^="http"]',
      'a h3',
      // Selectores más generales
      'div[data-ved] a[href^="http"]',
      'div.g a[href^="http"]'
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
      if (index >= 10) return;

      let titleElement, linkElement;
      
      if (element.tagName === 'A') {
        linkElement = element;
        titleElement = element.querySelector('h3') || element;
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
            link = decodeURIComponent(urlParams.get('q') || link);
          } catch (e) {
            console.log('Error limpiando URL:', e);
          }
        }
        
        // Buscar container del resultado
        const containerElement = titleElement.closest('div.g, div[data-ved], .rc, div.tF2Cxc, div.yuRUbf');
        
        // Buscar snippet
        let snippet = '';
        if (containerElement) {
          const snippetSelectors = [
            '.VwiC3b',
            '.s3v9rd', 
            '.st',
            'span[data-ved]',
            '.IsZvec',
            '.lEBKkf',
            'div[data-sncf]'
          ];
          
          for (const snippetSelector of snippetSelectors) {
            const snippetEl = containerElement.querySelector(snippetSelector);
            if (snippetEl && snippetEl.textContent.trim().length > 10) {
              snippet = snippetEl.textContent.trim();
              break;
            }
          }
        }

        if (title && link && title.length > 3) {
          result.organicResults.push({
            position: index + 1,
            title: title,
            link: link,
            snippet: snippet || null
          });
        }
      }
    });

    return result;
  });
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

module.exports = { debugScrapeGoogle };

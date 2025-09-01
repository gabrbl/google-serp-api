
const express = require('express');
const cors = require('cors');
// Actualizado: scrapers movidos a /scrapers
const { scrapeGoogle } = require('./scrapers/scraper');
const { generateMetadata, handleError } = require('./utils');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Endpoint principal de búsqueda
app.get('/search', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Validar parámetros
    const { q, location, hl = 'es' } = req.query;
    
    if (!q) {
      return res.status(400).json({
        error: {
          code: 400,
          message: 'Parámetro "q" (query) es requerido'
        }
      });
    }

    // Realizar scraping
    const scrapingResult = await scrapeGoogle(q, location, hl);
    
    const endTime = Date.now();
    const timeTaken = (endTime - startTime) / 1000;

    // Construir respuesta en formato SerpApi
    const response = {
      search_metadata: generateMetadata(q, location, hl, timeTaken),
      search_parameters: {
        engine: 'google',
        q: q,
        location: location || null,
        hl: hl
      },
      search_information: {
        total_results: scrapingResult.totalResults,
        query_displayed: q,
        time_taken: timeTaken
      },
      organic_results: scrapingResult.organicResults,
      knowledge_graph: scrapingResult.knowledgeGraph,
      images: scrapingResult.images
    };

    res.json(response);

  } catch (error) {
    console.error('Error en /search:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json(handleError(error));
  }
});

// Endpoint POST alternativo
app.post('/search', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { q, location, hl = 'es' } = req.body;
    
    if (!q) {
      return res.status(400).json({
        error: {
          code: 400,
          message: 'Parámetro "q" (query) es requerido'
        }
      });
    }

    const scrapingResult = await scrapeGoogle(q, location, hl);
    
    const endTime = Date.now();
    const timeTaken = (endTime - startTime) / 1000;

    const response = {
      search_metadata: generateMetadata(q, location, hl, timeTaken),
      search_parameters: {
        engine: 'google',
        q: q,
        location: location || null,
        hl: hl
      },
      search_information: {
        total_results: scrapingResult.totalResults,
        query_displayed: q,
        time_taken: timeTaken
      },
      organic_results: scrapingResult.organicResults.filter((_, index) => index < 5),
      knowledge_graph: scrapingResult.knowledgeGraph,
      images: scrapingResult.images
    };

    res.json(response);

  } catch (error) {
    console.error('Error en /search POST:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json(handleError(error));
  }
});

// Endpoint de debugging
app.get('/debug', async (req, res) => {
  const { q = 'test query', location, hl = 'es' } = req.query;
  
  try {
    console.log('Iniciando debug scraping...');
    
    // Importar el debug scraper
  const { debugScrapeGoogle } = require('./scrapers/debug_scraper');
    
    const debugResult = await debugScrapeGoogle(q, location, hl);
    
    res.json({
      message: 'Debug scraping completado',
      query: q,
      location: location || null,
      language: hl,
      debug_info: debugResult.debugInfo,
      scraping_result: debugResult.scrapingResult,
      files_generated: [
        '/tmp/google_debug.html',
        '/tmp/google_debug.png'
      ],
      recommendations: [
        'Revisar el HTML capturado para ver qué página está cargando Google',
        'Verificar el screenshot para confirmar si hay CAPTCHA o bloqueo',
        'Analizar los selectores que están fallando',
        'Considerar usar proxies o cambiar estrategia de scraping'
      ]
    });
    
  } catch (error) {
    console.error('Error en debug:', error.message);
    res.status(500).json({
      error: 'Error en debug scraping',
      message: error.message,
      recommendations: [
        'Google puede estar bloqueando todas las requests',
        'Considerar usar un servicio de proxy',
        'Implementar delays más largos entre requests',
        'Usar un User-Agent diferente'
      ]
    });
  }
});

// Endpoint para servir archivos de debug
app.get('/debug/html', (req, res) => {
  const fs = require('fs');
  const path = '/tmp/google_debug.html';
  
  if (fs.existsSync(path)) {
    const html = fs.readFileSync(path, 'utf8');
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } else {
    res.status(404).json({ error: 'Archivo HTML de debug no encontrado. Ejecuta /debug primero.' });
  }
});

// Endpoint de salud
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Endpoint raíz con documentación básica
app.get('/', (req, res) => {
  res.json({
    message: 'Google SERP API - Clon de SerpApi',
    version: '1.0.0',
    status: 'En desarrollo - Problemas de detección de bot por Google',
    endpoints: {
      'GET /search': 'Buscar en Google con parámetros: q (requerido), location, hl',
      'POST /search': 'Buscar en Google enviando parámetros en el body',
      'GET /debug': 'Debugging avanzado con captura de HTML y screenshots',
      'GET /debug/html': 'Ver el HTML capturado en la última sesión de debug',
      'GET /health': 'Estado de la API'
    },
    examples: {
      search: 'GET /search?q=nodejs&hl=es&location=Spain',
      debug: 'GET /debug?q=test&hl=en&location=usa'
    },
    current_issues: [
      'Google está detectando y bloqueando el bot con CAPTCHA',
      'Se están implementando técnicas anti-detección avanzadas',
      'Usar /debug para diagnosticar problemas específicos'
    ],
    recommendations: [
      'Usar el endpoint /debug para diagnosticar problemas',
      'Considerar implementar proxies rotativos',
      'Evaluar servicios comerciales como alternativa'
    ]
  });
});

app.listen(PORT, () => {
  console.log(`Google SERP API ejecutándose en http://localhost:${PORT}`);
  console.log(`Documentación disponible en http://localhost:${PORT}`);
});


# Google SERP API - Clon ligero de SerpApi

API REST minimalista para obtener resultados de Google Search en JSON, inspirada en SerpApi. 

## Características

- **Scraping de Google Search** con Puppeteer
- **Formato JSON idéntico** a SerpApi
- **Extracción completa** de:
  - Resultados orgánicos
  - Knowledge Graph (panel de conocimiento)
  - Imágenes
  - Metadatos de búsqueda
- **Soporte multiidioma** y geolocalización
- **Manejo robusto de errores**

## Instalación

```bash
git clone https://github.com/tu-usuario/google-serp-api.git
cd google-serp-api
npm install
cp .env.example .env
npm run dev
```

Servidor por defecto: http://localhost:3000 (usa PORT en .env para cambiarlo)

## Uso

### Endpoint GET

```bash
# Búsqueda básica
curl "http://localhost:3000/search?q=nodejs"

# Búsqueda con idioma y ubicación
curl "http://localhost:3000/search?q=restaurantes&hl=es&location=spain"

# Búsqueda en inglés desde USA
curl "http://localhost:3000/search?q=best+pizza&hl=en&location=usa"
```

### Endpoint POST

```bash
curl -X POST http://localhost:3000/search \
  -H "Content-Type: application/json" \
  -d '{
    "q": "inteligencia artificial",
    "hl": "es",
    "location": "mexico"
  }'
```

### Parámetros

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `q` | string | Sí | Query de búsqueda |
| `hl` | string | No | Idioma (default: 'es') |
| `location` | string | No | Ubicación geográfica |


## Formato de respuesta

La API devuelve un JSON con la siguiente estructura:

```json
{
  "search_metadata": {
    "id": "uuid-único",
    "status": "Success",
    "google_url": "https://www.google.com/search?q=...",
    "created_at": "2024-01-01T12:00:00.000Z",
    "processed_at": "2024-01-01T12:00:00.000Z",
    "time_taken": 2.5
  },
  "search_parameters": {
    "engine": "google",
    "q": "nodejs",
    "location": "spain",
    "hl": "es"
  },
  "search_information": {
    "total_results": 1500000,
    "query_displayed": "nodejs",
    "time_taken": 2.5
  },
  "organic_results": [
    {
      "position": 1,
      "title": "Node.js — Run JavaScript Everywhere",
      "link": "https://nodejs.org/",
      "snippet": "Node.js® is a JavaScript runtime built on Chrome's V8...",
      "sitelinks": [
        {
          "title": "Download",
          "link": "https://nodejs.org/en/download/"
        }
      ]
    }
  ],
  "knowledge_graph": {
    "title": "Node.js",
    "type": "Knowledge Panel",
    "description": "Node.js is a cross-platform, open-source server environment...",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Node.js_logo.svg/1200px-Node.js_logo.svg.png",
    "website": "https://nodejs.org",
    "attributes": {
      "developer": "Ryan Dahl",
      "initial_release": "May 27, 2009"
    }
  },
  "images": [
    {
      "position": 1,
      "title": "Node.js Logo",
      "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Node.js_logo.svg/1280px-Node.js_logo.svg.png",
      "thumbnailUrl": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Node.js_logo.svg/2560px-Node.js_logo.svg.png",
      "source": "nodejs.org",
      "link": "https://nodejs.org"
    }
  ]
}
```

## Endpoints adicionales

### Estado de la API
```bash
curl http://localhost:3000/health
```

### Documentación
```bash
curl http://localhost:3000/
```

## Manejo de errores

La API maneja varios tipos de errores:

- **400**: Parámetros inválidos
- **408**: Timeout de conexión
- **429**: Rate limit (Google bloqueó las peticiones)
- **500**: Error interno del servidor
- **503**: Error de red

Ejemplo de respuesta de error:
```json
{
  "error": {
    "code": 429,
    "message": "Demasiadas solicitudes. Google ha bloqueado temporalmente las peticiones.",
    "type": "rate_limit_exceeded"
  }
}
```

## Configuración

### Variables de entorno (.env)

```bash
# Puerto del servidor (default: 3000)
PORT=3000

# Modo de desarrollo (muestra detalles de errores)
NODE_ENV=development
```

### Personalización

Puedes modificar los siguientes archivos:

- `scrapers/scraper.js`: Lógica central
- `scrapers/debug_scraper.js`: Scraper de diagnóstico
- `utils.js`: Utilidades compartidas (metadata, errores)
- `index.js`: Servidor Express

## Limitaciones y consideraciones

1. **Rate Limiting**: Google puede bloquear peticiones excesivas
2. **Detección de bots**: Usa User-Agent realista y headers apropiados
3. **Cambios en Google**: Los selectores CSS pueden cambiar
4. **Rendimiento**: Puppeteer consume recursos significativos
5. **Legal**: Respeta los términos de servicio de Google

## Testing

```bash
# Prueba básica
curl "http://localhost:3000/search?q=test"

# Prueba con Postman
# GET http://localhost:3000/search?q=nodejs&hl=es&location=spain


```

## Notas técnicas

- **Puppeteer**: Navegador headless para scraping
- **Express.js**: Framework web para la API REST
- **CORS**: Habilitado para peticiones cross-origin
- **UUID**: Generación de IDs únicos para cada búsqueda
- **Error handling**: Manejo robusto de errores de red y scraping

## Ejemplos adicionales

### Node.js (fetch)
```javascript
const res = await fetch('http://localhost:3000/search?q=nodejs&hl=es');
const data = await res.json();
console.log(data.organic_results?.length);
```

### Node.js (axios)
```javascript
const axios = require('axios');
const { data } = await axios.get('http://localhost:3000/search', { params: { q: 'nodejs', hl: 'es', location: 'spain' }});
console.log(data.search_information);
```


### Respuesta de ejemplo completa
```json
{
  "search_metadata": {
    "id": "a9e76184-b949-4e15-ac06-80a9ab62fc9a",
    "status": "Success",
    "google_url": "https://www.google.com/search?q=nodejs&hl=es",
    "created_at": "2025-09-01T06:30:36.882Z",
    "processed_at": "2025-09-01T06:30:36.882Z",
    "time_taken": 4.309
  },
  "search_parameters": {
    "engine": "google",
    "q": "nodejs",
    "location": null,
    "hl": "es"
  },
  "search_information": {
    "total_results": 1500000,
    "query_displayed": "nodejs",
    "time_taken": 4.309
  },
  "organic_results": [
    {
      "position": 1,
      "title": "Node.js — Run JavaScript Everywhere",
      "link": "https://nodejs.org/",
      "snippet": "Node.js® is a JavaScript runtime built on Chrome's V8..."
    }
  ],
  "knowledge_graph": {
    "title": "Node.js",
    "type": "Knowledge Panel",
    "description": "Node.js is a cross-platform, open-source server environment...",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Node.js_logo.svg/1200px-Node.js_logo.svg.png",
    "website": "https://nodejs.org",
    "attributes": {
      "developer": "Ryan Dahl",
      "initial_release": "May 27, 2009"
    }
  },
  "images": [
    {
      "position": 1,
      "title": "Node.js Logo",
      "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Node.js_logo.svg/1280px-Node.js_logo.svg.png",
      "thumbnailUrl": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Node.js_logo.svg/2560px-Node.js_logo.svg.png",
      "source": "nodejs.org",
      "link": "https://nodejs.org"
    }
  ]
}
```

### Manejo de errores

#### Error 400 - Parámetro faltante
```bash
curl "http://localhost:3000/search"
```
```json
{
  "error": {
    "code": 400,
    "message": "Parámetro \"q\" (query) es requerido"
  }
}
```

#### Error 429 - Rate limit
```json
{
  "error": {
    "code": 429,
    "message": "Demasiadas solicitudes. Google ha bloqueado temporalmente las peticiones.",
    "type": "rate_limit_exceeded"
  }
}
```

## 🤝 Contribuciones

Para mejorar la API:

1. Optimizar selectores CSS para mejor extracción
2. Añadir más tipos de resultados (videos, noticias, etc.)
3. Implementar caché para reducir peticiones
4. Mejorar el manejo de CAPTCHAs

---

**Disclaimer**: Uso educativo. Respeta TOS de Google.

---


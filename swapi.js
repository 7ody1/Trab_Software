const http = require('http');
const https = require('https');

// const
const TIMEOUT_DEFAULT = 5000;
const STARSHIP_LIMIT = 3;
const MINIMUM_POPULATION = 1000000000;
const MINIMUM_DIAMETER = 10000;


const appState = {
  cache: {},
  debugMode: !process.argv.includes('--no-debug'),
  errorCount: 0,
  fetchCount: 0,
  totalDataSize: 0,
  lastCharacterId: 1,
  timeout: getTimeoutFromArgs() || TIMEOUT_DEFAULT
};

// functions de Ajuda
function getTimeoutFromArgs() {
  const timeoutArgIndex = process.argv.indexOf('--timeout');
  if (timeoutArgIndex !== -1 && timeoutArgIndex < process.argv.length - 1) {
    return parseInt(process.argv[timeoutArgIndex + 1]) || TIMEOUT_DEFAULT;
  }
  return TIMEOUT_DEFAULT;
}

function logDebug(...messages) {
  if (appState.debugMode) {
    console.log(...messages);
  }
}

// API
async function fetchFromSwapi(endpoint) {
  if (appState.cache[endpoint]) {
    logDebug(`Using cached data for ${endpoint}`);
    return appState.cache[endpoint];
  }

  return new Promise((resolve, reject) => {
    const request = https.get(`https://swapi.dev/api/${endpoint}`, { rejectUnauthorized: false }, response => {
      if (response.statusCode >= 400) {
        handleError(new Error(`Request failed with status ${response.statusCode}`), reject);
        return;
      }

      let responseData = '';
      response.on('data', chunk => responseData += chunk);
      response.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          appState.cache[endpoint] = parsedData;
          logDebug(`Successfully fetched data for ${endpoint}`);
          resolve(parsedData);
        } catch (error) {
          handleError(error, reject);
        }
      });
    });

    request.on('error', error => handleError(error, reject));
    request.setTimeout(appState.timeout, () => {
      request.abort();
      handleError(new Error(`Request timeout for ${endpoint}`), reject);
    });
  });
}

function handleError(error, reject) {
  appState.errorCount++;
  logDebug(`Error: ${error.message}`);
  reject(error);
}

// Data Functions
async function displayCharacter(characterId) {
  try {
    const personagem = await fetchFromSwapi(`people/${characterId}`);
    appState.totalDataSize += JSON.stringify(personagem).length;
    
    console.log('Character:', personagem.name);
    console.log('Height:', personagem.height);
    console.log('Mass:', personagem.mass);
    console.log('Birth year:', personagem.birth_year);
    
    if (personagem.films?.length > 0) {
      console.log('Appears in', personagem.films.length, 'films');
    }
  } catch (error) {
    handleError(error);
  }
}

async function displayStarships() {
  try {
    const starshipsData = await fetchFromSwapi('starships/?page=1');
    appState.totalDataSize += JSON.stringify(starshipsData).length;
    
    console.log('\nTotal Starships:', starshipsData.count);
    
    starshipsData.results.slice(0, STARSHIP_LIMIT).forEach((starship, index) => {
      console.log(`\nStarship ${index + 1}:`);
      console.log('Name:', starship.name);
      console.log('Model:', starship.model);
      console.log('Manufacturer:', starship.manufacturer);
      console.log('Cost:', starship.cost_in_credits !== 'unknown' ? `${starship.cost_in_credits} credits` : 'unknown');
      console.log('Speed:', starship.max_atmosphering_speed);
      console.log('Hyperdrive Rating:', starship.hyperdrive_rating);
      
      if (starship.pilots?.length > 0) {
        console.log('Pilots:', starship.pilots.length);
      }
    });
  } catch (error) {
    handleError(error);
  }
}

async function displayLargePlanets() {
  try {
    const planetsData = await fetchFromSwapi('planets/?page=1');
    appState.totalDataSize += JSON.stringify(planetsData).length;
    
    console.log('\nLarge populated planets:');
    planetsData.results.forEach(planets => {
      const population = parseInt(planets.population);
      const diameter = parseInt(planets.diameter);
      
      if (!isNaN(population) && population > MINIMUM_POPULATION &&
          !isNaN(diameter) && diameter > MINIMUM_DIAMETER) {
        console.log(`${planets.name} - Population: ${planets.population} - Diameter: ${planets.diameter} - Climate: ${planets.climate}`);
        
        if (planets.films?.length > 0) {
          console.log(`  Appears in ${planets.films.length} films`);
        }
      }
    });
  } catch (error) {
    handleError(error);
  }
}

async function displayFilmsByReleaseDate() {
  try {
    const filmsData = await fetchFromSwapi('films/');
    appState.totalDataSize += JSON.stringify(filmsData).length;
    
    console.log('\nStar Wars Films in chronological order:');
    filmsData.results
      .sort((a, b) => new Date(a.release_date) - new Date(b.release_date))
      .forEach((film, index) => {
        console.log(`${index + 1}. ${film.title} (${film.release_date})`);
        console.log(`   Director: ${film.director}`);
        console.log(`   Producer: ${film.producer}`);
        console.log(`   Characters: ${film.characters.length}`);
        console.log(`   Planets: ${film.planets.length}`);
      });
  } catch (error) {
    handleError(error);
  }
}

async function displayVehicle(vehicleId) {
  try {
    const vehicle = await fetchFromSwapi(`vehicles/${vehicleId}`);
    appState.totalDataSize += JSON.stringify(vehicle).length;
    
    console.log('\nFeatured Vehicle:');
    console.log('Name:', vehicle.name);
    console.log('Model:', vehicle.model);
    console.log('Manufacturer:', vehicle.manufacturer);
    console.log('Cost:', vehicle.cost_in_credits, 'credits');
    console.log('Length:', vehicle.length);
    console.log('Crew Required:', vehicle.crew);
    console.log('Passengers:', vehicle.passengers);
  } catch (error) {
    handleError(error);
  }
}

function displayStatistics() {
  logDebug('\nStatistics:');
  logDebug('API Calls:', appState.fetchCount);
  logDebug('Cache Size:', Object.keys(appState.cache).length);
  logDebug('Total Data Size:', appState.totalDataSize, 'bytes');
  logDebug('Error Count:', appState.errorCount);
}

// function Princ
async function fetchAndDisplayStarWarsData() {
  logDebug('Starting data fetch...');
  appState.fetchCount++;
  
  try {
    await displayCharacter(appState.lastCharacterId);
    await displayStarships();
    await displayLargePlanets();
    await displayFilmsByReleaseDate();
    
    if (appState.lastCharacterId <= 4) {
      await displayVehicle(appState.lastCharacterId);
      appState.lastCharacterId++;
    }
    
    displayStatistics();
  } catch (error) {
    handleError(error);
  }
}

// Servidor

const server = http.createServer((request, response) => {
  if (request.url === '/' || request.url === '/index.html') {
    serveHomePage(response);
  } else if (request.url === '/api') {
    fetchAndDisplayStarWarsData();
    response.writeHead(200, { 'Content-Type': 'text/plain' });
    response.end('Check server console for results');
  } else if (request.url === '/stats') {
    serveStatistics(response);
  } else {
    response.writeHead(404, { 'Content-Type': 'text/plain' });
    response.end('Not Found');
  }
});

function serveHomePage(response) {
  response.writeHead(200, { 'Content-Type': 'text/html' });
  response.end(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Star Wars API Demo</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #FFE81F; background-color: #000; padding: 10px; }
          button { background-color: #FFE81F; border: none; padding: 10px 20px; cursor: pointer; }
          .footer { margin-top: 50px; font-size: 12px; color: #666; }
          pre { background: #f4f4f4; padding: 10px; border-radius: 5px; }
        </style>
      </head>
      <body>
        <h1>Star Wars API Demo</h1>
        <p>This page demonstrates fetching data from the Star Wars API.</p>
        <p>Check your console for the API results.</p>
        <button onclick="fetchData()">Fetch Star Wars Data</button>
        <div id="results"></div>
        <script>
          function fetchData() {
            document.getElementById('results').innerHTML = '<p>Loading data...</p>';
            fetch('/api')
              .then(res => res.text())
              .then(text => {
                alert('API request made! Check server console.');
                document.getElementById('results').innerHTML = '<p>Data fetched! Check server console.</p>';
              })
              .catch(err => {
                document.getElementById('results').innerHTML = '<p>Error: ' + err.message + '</p>';
              });
          }
        </script>
        <div class="footer">
          <p>API calls: ${appState.fetchCount} | Cache entries: ${Object.keys(appState.cache).length} | Errors: ${appState.errorCount}</p>
          <pre>Debug mode: ${appState.debugMode ? 'ON' : 'OFF'} | Timeout: ${appState.timeout}ms</pre>
        </div>
      </body>
    </html>
  `);
}

function serveStatistics(response) {
  response.writeHead(200, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify({
    api_calls: appState.fetchCount,
    cache_size: Object.keys(appState.cache).length,
    data_size: appState.totalDataSize,
    errors: appState.errorCount,
    debug: appState.debugMode,
    timeout: appState.timeout
  }));
}

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  logDebug('Debug mode: ON');
  logDebug('Timeout:', appState.timeout, 'ms');
});
// Exporte o server para controle nos testes
module.exports = {
  fetchFromSwapi,
  displayCharacter,
  displayStarships,
  displayLargePlanets,
  displayFilmsByReleaseDate,
  displayVehicle,
  appState,
  server, // Exporte o server
  // Garanta que o servidor só inicia se não for teste
  startServer: () => {
    if (process.env.NODE_ENV !== 'test') {
      server.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}/`);
        logDebug('Debug mode: ON');
        logDebug('Timeout:', appState.timeout, 'ms');
      });
    }
  }
};

// Inicie o servidor apenas se executado diretamente
if (require.main === module) {
  module.exports.startServer();
}
const { 
  fetchFromSwapi,
  appState,
  server,
  startServer
} = require('./swapi');

jest.mock('https');

describe('Testes da SWAPI Refatorada', () => {
  beforeAll(() => {
    // Inicializa appState se não estiver definido
    if (!appState) {
      global.appState = {
        cache: {},
        debugMode: false,
        errorCount: 0,
        fetchCount: 0,
        totalDataSize: 0,
        lastCharacterId: 1,
        timeout: 5000
      };
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    appState.cache = {};
    appState.errorCount = 0;
  });

  afterAll(async () => {
    await new Promise(resolve => server.close(resolve));
  });

  test('fetchFromSwapi usa cache', async () => {
    const testData = { name: "Test" };
    appState.cache['people/1'] = testData;
    
    await expect(fetchFromSwapi('people/1')).resolves.toEqual(testData);
  });

  test('fetchFromSwapi faz chamada HTTP', async () => {
    const mockData = { name: "Luke" };
    
    require('https').get.mockImplementation((url, cb) => {
      const mockResponse = {
        statusCode: 200,
        on: (event, handler) => {
          if (event === 'data') handler(JSON.stringify(mockData));
          if (event === 'end') handler();
        }
      };
      cb(mockResponse);
      return { on: jest.fn(), setTimeout: jest.fn() };
    });

    await expect(fetchFromSwapi('people/1')).resolves.toEqual(mockData);
  });
});

const https = require('https');

jest.mock('https', () => ({
  get: jest.fn((url, callback) => {
    const EventEmitter = require('events');
    const res = new EventEmitter();

    // Simula a resposta do `https.get`
    callback(res); // <- aqui cb é chamado corretamente como função

    // Dispara os eventos como se fosse uma resposta real
    process.nextTick(() => {
      res.emit('data', JSON.stringify({ name: 'Luke Skywalker' }));
      res.emit('end');
    });

    return { on: jest.fn() }; // Simula a função `on` de um request
  })
}));

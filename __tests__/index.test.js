const redis = require("redis");
const { promisify } = require("util");
const timeout = 30000;
const cookieKey = "PUPPETEER_LOGIN_COOKIE";

let page;
let redisClient;

beforeAll(async () => {
  jest.setTimeout(timeout);

  page = await global.__BROWSER__.newPage();

  redisClient = redis.createClient(6379, "localhost");

  redisClient.on("connect", () => {
    console.info("Connected to Redis server.");
  });

  redisClient.on("error", err => {
    console.error(`Something went wrong. ${err}`);
  });

  const getAsync = promisify(redisClient.get).bind(redisClient);

  try {
    let result = await getAsync(cookieKey);
    if (result == null) {
      await page.goto("https://eksisozluk.com/giris");

      await page.waitForSelector("#username");
      await page.type("#username", "username");

      await page.waitForSelector("#password");
      await page.type("#password", "password");

      await page.$eval("#login-form-container form", form => form.submit());

      await page.waitForSelector(".messages", { visible: true, timeout: 0 });

      cookies = await page.cookies();
      let cookieData = JSON.stringify(cookies);
      redisClient.set(cookieKey, cookieData);
    } else {
      let cookies = JSON.parse(result);
      await page.setCookie(...cookies);
    }
  } catch (err) {
    console.log(err);
    throw err;
  }
});

afterAll(() => {
  if (redisClient !== undefined) {
    redisClient.quit();
  }
});

describe("Login Test", () => {
  test(
    "Home page title",
    async () => {
      await page.goto("https://eksisozluk.com", {
        waitUntil: "domcontentloaded"
      });

      const expectedTitle = "ekşi sözlük - kutsal bilgi kaynağı";
      const title = await page.title();
      expect(title).toBe(expectedTitle);
    },
    timeout
  );
});

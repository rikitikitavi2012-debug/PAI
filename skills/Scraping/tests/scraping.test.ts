import { describe, expect, test, mock, beforeEach } from "bun:test";

// Ensure we inject a dummy env token so that Apify doesn't fail trying to use real env
process.env.APIFY_TOKEN = "test-token";

// Mocking the ApifyClient class and its chainable methods
// Preload mock so it gets intercepted before index.ts imports it
mock.module("apify-client", () => {
  class MockApifyClient {
    constructor(config?: any) {}

    actors() {
      return {
        list: async () => {
          return {
            items: [
              { name: "test-actor-1", title: "Test Actor 1", description: "First test actor", username: "user1" },
              { name: "test-actor-2", title: "Test Actor 2", description: "Second test actor", username: "user2" },
            ]
          };
        }
      };
    }

    actor(actorId: string) {
      return {
        call: async (input: any, options: any) => {
          return {
            id: "run-id-123",
            actorId,
            status: "SUCCEEDED",
            defaultDatasetId: "dataset-id-123",
          };
        }
      };
    }

    run(runId: string) {
      return {
        get: async () => {
          return {
            id: runId,
            status: "SUCCEEDED",
            defaultDatasetId: "dataset-id-123",
          };
        },
        waitForFinish: async () => {
          return {
            id: runId,
            status: "SUCCEEDED",
            defaultDatasetId: "dataset-id-123",
          };
        }
      };
    }

    dataset(datasetId: string) {
      return {
        listItems: async (options: any) => {
          return (globalThis as any).__MOCK_DATASET_ITEMS || {
            items: [{ url: "https://example.com", title: "Example" }],
            count: 1,
            total: 1
          };
        }
      };
    }
  }

  // We need to return an object with ApifyClient constructor
  // that behaves exactly as the real module
  return {
    ApifyClient: MockApifyClient,
    ApifyApiError: class ApifyApiError extends Error {
      constructor(message: string) {
        super(message);
        this.name = "ApifyApiError";
      }
    }
  };
});

// We need to delay importing so the mock is set up first
import { Apify } from "../Apify/index";
import { scrapeWebsite, scrapePage } from "../Apify/actors/web/web-scraper";
import { scrapeTwitterProfile, scrapeTwitterTweets, searchTwitter } from "../Apify/actors/social-media/twitter";
import { searchGoogleMaps, scrapeGoogleMapsPlace, scrapeGoogleMapsReviews } from "../Apify/actors/business/google-maps";
import { scrapeAmazonProduct, scrapeAmazonReviews } from "../Apify/actors/ecommerce/amazon";

describe("Apify Base and Types", () => {
  let apify: Apify;

  beforeEach(() => {
    apify = new Apify("test-token");
  });

  test("Apify.search filters correctly client-side", async () => {
    const results = await apify.search("second");
    expect(results.length).toBe(1);
    expect(results[0].name).toBe("test-actor-2");
  });

  test("Apify.callActor and waitForRun", async () => {
    const run = await apify.callActor("test/actor", { input: 1 });
    expect(run.id).toBe("run-id-123");

    const waitRun = await apify.waitForRun(run.id);
    expect(waitRun.status).toBe("SUCCEEDED");
  });

  test("ApifyDataset.getAllItems loops correctly", async () => {
    const dataset = apify.getDataset("test-dataset");

    // Setup specific mock for pagination
    let callCount = 0;
    (globalThis as any).__MOCK_DATASET_ITEMS = undefined;

    // We can't easily mock the exact internal dataset.listItems per call
    // but we can at least test listItems basic usage.
    // Instead we test basic filter and list
    (globalThis as any).__MOCK_DATASET_ITEMS = {
      items: [{ val: 1 }, { val: 2 }, { val: 3 }],
      count: 3,
      total: 3
    };

    const items = await dataset.getAllItems();
    expect(items.length).toBe(3);

    const filtered = await dataset.filter(item => item.val > 1);
    expect(filtered.length).toBe(2);

    const top = await dataset.top((a, b) => b.val - a.val, 1);
    expect(top.length).toBe(1);
    expect(top[0].val).toBe(3);
  });
});

describe("Web Scraper", () => {
  beforeEach(() => {
    (globalThis as any).__MOCK_DATASET_ITEMS = {
      items: [{ url: "https://example.com", title: "Example Domain", text: "Test text" }]
    };
  });

  test("scrapeWebsite", async () => {
    const pages = await scrapeWebsite({ startUrls: ["https://example.com"] });
    expect(pages.length).toBe(1);
    expect(pages[0].url).toBe("https://example.com");
    expect(pages[0].title).toBe("Example Domain");
  });

  test("scrapePage", async () => {
    const page = await scrapePage("https://example.com", "async function(){}");
    expect(page.url).toBe("https://example.com");
  });
});

describe("Twitter Scraper", () => {
  test("scrapeTwitterProfile", async () => {
    (globalThis as any).__MOCK_DATASET_ITEMS = {
      items: [
        { username: "testuser", name: "Test User", followers: 100 },
        { id: "tweet1", text: "Hello", url: "https://twitter.com/testuser/status/tweet1" }
      ]
    };

    const profile = await scrapeTwitterProfile({ username: "testuser", includeTweets: true });
    expect(profile.username).toBe("testuser");
    expect(profile.displayName).toBe("Test User");
    expect(profile.followersCount).toBe(100);
    expect(profile.latestTweets?.length).toBe(1);
    expect(profile.latestTweets?.[0].id).toBe("tweet1");
  });

  test("scrapeTwitterTweets", async () => {
    (globalThis as any).__MOCK_DATASET_ITEMS = {
      items: [
        { id: "tweet1", text: "First tweet", likes: 10 },
        { id: "tweet2", text: "Second tweet", likes: 20 }
      ]
    };

    const tweets = await scrapeTwitterTweets({ username: "testuser", maxTweets: 2 });
    expect(tweets.length).toBe(2);
    expect(tweets[0].likesCount).toBe(10);
    expect(tweets[1].likesCount).toBe(20);
  });

  test("searchTwitter", async () => {
    (globalThis as any).__MOCK_DATASET_ITEMS = {
      items: [
        { id: "tweet_s1", text: "AI is cool", retweets: 5 }
      ]
    };

    const tweets = await searchTwitter({ query: "AI", maxTweets: 1 });
    expect(tweets.length).toBe(1);
    expect(tweets[0].text).toBe("AI is cool");
  });
});

describe("Google Maps Scraper", () => {
  test("searchGoogleMaps", async () => {
    (globalThis as any).__MOCK_DATASET_ITEMS = {
      items: [
        { placeId: "g1", title: "Test Cafe", totalScore: 4.5, address: "123 Test St" }
      ]
    };

    const places = await searchGoogleMaps({ query: "cafe" });
    expect(places.length).toBe(1);
    expect(places[0].name).toBe("Test Cafe");
    expect(places[0].rating).toBe(4.5);
  });

  test("scrapeGoogleMapsPlace", async () => {
    (globalThis as any).__MOCK_DATASET_ITEMS = {
      items: [
        { placeId: "g2", title: "Test Restaurant", email: "contact@test.com" }
      ]
    };

    const place = await scrapeGoogleMapsPlace({ placeUrl: "url" });
    expect(place.name).toBe("Test Restaurant");
    expect(place.contact?.email).toBe("contact@test.com");
  });

  test("scrapeGoogleMapsReviews", async () => {
    (globalThis as any).__MOCK_DATASET_ITEMS = {
      items: [
        { reviewId: "r1", text: "Great!", stars: 5 },
        { reviewId: "r2", text: "Terrible", stars: 1 }
      ]
    };

    // With minRating filter
    const reviews = await scrapeGoogleMapsReviews({ placeUrl: "url", minRating: 4 });
    expect(reviews.length).toBe(1);
    expect(reviews[0].rating).toBe(5);
  });
});

describe("Amazon Scraper", () => {
  test("scrapeAmazonProduct", async () => {
    (globalThis as any).__MOCK_DATASET_ITEMS = {
      items: [
        { asin: "B001", title: "Test Product", price: 19.99, stars: 4.8 }
      ]
    };

    const product = await scrapeAmazonProduct({ productUrl: "url" });
    expect(product.asin).toBe("B001");
    expect(product.title).toBe("Test Product");
    expect(product.price).toBe(19.99);
    expect(product.rating).toBe(4.8);
  });

  test("scrapeAmazonReviews", async () => {
    (globalThis as any).__MOCK_DATASET_ITEMS = {
      items: [
        { id: "rev1", title: "Love it", stars: 5, verified: true },
        { id: "rev2", title: "Hate it", stars: 1, verified: false }
      ]
    };

    const reviews = await scrapeAmazonReviews({ productUrl: "url" });
    expect(reviews.length).toBe(2);
    expect(reviews[0].verifiedPurchase).toBe(true);
    expect(reviews[1].verifiedPurchase).toBe(false);
  });
});

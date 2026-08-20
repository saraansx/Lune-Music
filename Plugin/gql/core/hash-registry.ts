const GIST_URL =
  "https://gist.githubusercontent.com/saraansx/c50367808cbbf6ea7352920e4b556ac3/raw/spotify_hashes.json";

const CACHE_TTL_MS = 30 * 60 * 1000;

interface HashStore {
  [category: string]: {
    [operation: string]: string;
  };
}

const FALLBACK_HASHES: HashStore = {
  Album: {
    queryWhatsNewFeed: "d889c8c936ab192af8ced595427f5ba2acdf63478fdc0a181c8d477f8322630e",
    getAlbum: "b9bfabef66ed756e5e13f68a942deb60bd4125ec1f1be8cc42769dc0259b4b10",
  },
  Artist: {
    queryArtistOverview: "ae0e2958a4ab645b35ca19ac04d0495ae12d9c5d7b7286217674801a9aab281a",
  },
  Browse: {
    home: "5366cbf1f73f8c813dd0f1addc6934950f0dd529cec907107c85851e645c2d16",
  },
  Library: {
    addToLibrary: "7c5a69420e2bfae3da5cc4e14cbc8bb3f6090f80afc00ffc179177f19be3f33d",
    fetchLibraryTracks: "087278b20b743578a6262c2b0b4bcd20d879c503cc359a2285baf083ef944240",
    libraryV3: "973e511ca44261fda7eebac8b653155e7caee3675abb4fb110cc1b8c78b091c3",
    isCurated: "e4ed1f91a2cc5415befedb85acf8671dc1a4bf3ca1a5b945a6386101a22e28a6",
    areEntitiesInLibrary: "134337999233cc6fdd6b1e6dbf94841409f04a946c5c7b744b09ba0dfe5a85ed",
  },
  Playlist: {
    fetchPlaylist: "a65e12194ed5fc443a1cdebed5fabe33ca5b07b987185d63c72483867ad13cb4",
    addToPlaylist: "47b2a1234b17748d332dd0431534f22450e9ecbb3d5ddcdacbd83368636a0990",
    removeFromPlaylist: "47b2a1234b17748d332dd0431534f22450e9ecbb3d5ddcdacbd83368636a0990",
  },
  Search: {
    searchDesktop: "eff59fa0a3d026b88b56fddbcf4bdfa16a186b8175a5c1a358c072e053c2e5b0",
    searchAlbums: "64ae1fe6df380b038c0a65a2606d3361bc270de6870b2fdc99cf0848b1efa6d3",
    searchArtists: "270905851ba5c7faca81cfe053c2dbd8ceb4f156a0e0ef4b385af75ab69ffd13",
    searchPlaylists: "af1730623dc1248b75a61a18bad1f47f1fc7eff802fb0676683de88815c958d8",
    searchTracks: "59ee4a659c32e9ad894a71308207594a65ba67bb6b632b183abe97303a51fa55",
  },
  Track: {
    getTrack: "612585ae06ba435ad26369870deaae23b5c8800a256cd8a57e08eddc25a37294",
    canvas: "575138ab27cd5c1b3e54da54d0a7cc8d85485402de26340c2145f0f6bb5e7a9f",
    queryTrackCreditsModal: "e2ca40d46cf1fde36562261ccec754f23fb31b561877252e9fe0d6834aabb84b",
    trackPreview: "fc26ffc7a1a4f93bd4c2d705649f7dba1de34005b3dc2915549847a9959405d8",
  },
  User: {
    profileAttributes: "b197b5adb4b761690f76ad9d9fb278c14c14e7331f357c04a56e7001af7106e0",
    accountAttributes: "8ea75f2a2e357219328570ef35ec2d9c4db6089076908f59c6eb62348b225b55",
  },
};

let cachedHashes: HashStore = FALLBACK_HASHES;
let lastFetchedAt = 0;
let fetchPromise: Promise<HashStore> | null = null;

async function fetchRemoteHashes(): Promise<HashStore> {
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      console.log("[HashRegistry] Fetching remote hashes from gist...");
      const res = await fetch(GIST_URL, {
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }

      const data: HashStore = await res.json();
      cachedHashes = data;
      lastFetchedAt = Date.now();
      console.log("[HashRegistry] Remote hashes loaded successfully");
      return data;
    } catch (err) {
      console.warn("[HashRegistry] Remote hashes fetch failed, using fallback:", err);
      return cachedHashes || FALLBACK_HASHES;
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

async function getHashes(): Promise<HashStore> {
  const now = Date.now();
  if (cachedHashes && now - lastFetchedAt < CACHE_TTL_MS) {
    return cachedHashes;
  }
  return fetchRemoteHashes();
}

async function getHash(category: string, operation: string): Promise<string> {
  const hashes = await getHashes();
  const hash = hashes?.[category]?.[operation] || FALLBACK_HASHES?.[category]?.[operation];
  if (!hash) {
    throw new Error(
      `[HashRegistry] No hash found for ${category}.${operation}. ` +
        `Available categories: ${Object.keys(hashes).join(", ")}`,
    );
  }
  return hash;
}

async function preloadHashes(): Promise<void> {
  try {
    await getHashes();
  } catch {}
}

function invalidateHashCache(): void {
  lastFetchedAt = 0;
  console.log("[HashRegistry] Cache invalidated — will re-fetch on next call");
}

export { getHash, getHashes, preloadHashes, invalidateHashCache };
export type { HashStore };

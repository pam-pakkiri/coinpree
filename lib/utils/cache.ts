import fs from "fs";
import path from "path";

type CacheItem<T> = {
    data: T;
    expiry: number;
};

const cache = new Map<string, CacheItem<any>>();
const CACHE_DIR = path.join(process.cwd(), ".cache");

if (!fs.existsSync(CACHE_DIR)) {
    try {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
    } catch (e) {
        console.warn("Could not create cache directory", e);
    }
}

function getCachePath(key: string) {
    return path.join(CACHE_DIR, `${key.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`);
}

/**
 * Simple in-memory cache with TTL and optional persistence
 */
export async function withCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 60000,
    persist: boolean = false
): Promise<T> {
    const now = Date.now();

    // 1. Check Memory Cache
    const cached = cache.get(key);
    if (cached && cached.expiry > now) {
        return cached.data;
    }

    // 2. Check File Cache (if persist)
    if (persist) {
        const filePath = getCachePath(key);
        if (fs.existsSync(filePath)) {
            try {
                const fileData = fs.readFileSync(filePath, "utf-8");
                const item: CacheItem<T> = JSON.parse(fileData);
                if (item.expiry > now) {
                    // Update memory cache and return
                    cache.set(key, item);
                    return item.data;
                }
            } catch (e) {
                console.warn(`Error reading cache file for ${key}`, e);
            }
        }
    }

    // 3. Fetch Fresh Data
    const data = await fetcher();
    const item = {
        data,
        expiry: now + ttl
    };

    // 4. Update Memory
    cache.set(key, item);

    // 5. Update File (if persist)
    if (persist) {
        try {
            fs.writeFileSync(getCachePath(key), JSON.stringify(item), "utf-8");
        } catch (e) {
            console.warn(`Error writing cache file for ${key}`, e);
        }
    }

    return data;
}

export function clearCache(key?: string) {
    if (key) {
        cache.delete(key);
        const filePath = getCachePath(key);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } else {
        cache.clear();
        if (fs.existsSync(CACHE_DIR)) {
            fs.readdirSync(CACHE_DIR).forEach(file => {
                fs.unlinkSync(path.join(CACHE_DIR, file));
            });
        }
    }
}

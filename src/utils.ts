import fs from 'fs';

interface CachePathOptions {
    subDir?: string;
    fileName?: string;
}

export function getCachePath(options: CachePathOptions): string {
    const rootCacheDir = process.env['CACHE_DIR'] || './cache';
    const cacheDir = `${rootCacheDir}/${options.subDir || ''}`;

    if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
    }

    if (options.fileName) {
        return `${cacheDir}/${options.fileName}`;
    }

    return cacheDir;
}


export function log(level: string, message: any) {
    if (typeof message != 'string')
        message = JSON.stringify(message, null, 2)

    console.log(`${level}: ${message}`);
}

class FileCache<T> {
    timestampWritten: number;
    private data_: T;
    private ttl_minutes: number;

    constructor(data: T, ttl_minutes: number = 60) {
        this.data_ = data;
        this.ttl_minutes = ttl_minutes;
        this.timestampWritten = Date.now();
    }

    get data(): T {
        return this.data_;
    }

    expired(): boolean {
        return Date.now() > this.timestampWritten + this.ttl_minutes * 60 * 1000;
    }

    static load<T>(file: string): FileCache<T> | null {
        if (!fs.existsSync(file)) {
            log('info', `Cache file ${file} not found`);
            return null;
        }
        try {
            const raw_cache = JSON.parse(fs.readFileSync(file, 'utf8'));
            if (!raw_cache) {
                log('info', `cache file has invalid json ${file}`);
                return null;
            }

            const cache = new FileCache<T>(raw_cache.data, raw_cache.ttl_minutes);
            cache.timestampWritten = raw_cache.timestampWritten;

            if (!cache.data || !cache.timestampWritten || !cache.ttl_minutes) {
                log('info', `Invalid cache file ${file}`);
                return null;
            }

            if (cache.expired()) {
                log('info', `Cache file ${file} expired`);
                return null;
            }
            return cache;
        } catch (error) {
            log('error', `Error reading cache file ${file}: ${error.message}`);
            return null;
        }
    }

    save(file: string): void {
        try {
            fs.writeFileSync(file, JSON.stringify(this, null, 2));
        } catch (error) {
            log('error', `Error saving cache file ${file}: ${error.message}`);
        }
    }
}

export async function cached<T>(file: string, fn: () => Promise<T>): Promise<T> {
    const cache = FileCache.load<T>(file);
    if (cache) {
        return cache.data;
    }

    try {
        const data = await fn();
        const newCache = new FileCache(data);
        newCache.save(file);
        return data;
    } catch (error) {
        log('error', `Error executing function for cache ${file}: ${error.message}`);
        throw error;
    }
}

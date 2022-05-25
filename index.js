import fs from 'fs'
import OSS from 'ali-oss'
import crypto from 'crypto'
import chalk from 'chalk'

export const KNOWN_ASSET_TYPES = [
  // images
  'png',
  'jpe?g',
  'gif',
  'svg',
  'ico',
  'webp',
  'avif',

  // media
  'mp4',
  'webm',
  'ogg',
  'mp3',
  'wav',
  'flac',
  'aac',

  // fonts
  'woff2?',
  'eot',
  'ttf',
  'otf',

  // other
  'wasm',
  'webmanifest',
  'pdf',
  'txt',
]

export const DEFAULT_ASSETS_RE = new RegExp(
  `\\.(` + KNOWN_ASSET_TYPES.join('|') + `)$`
)

export default function ossAssets(options = {}) {
  const cache = new Map()

  return {
    name: 'vite:oss-asset',

    enforce: options.enforce || 'pre',

    async load(id) {
      const match = DEFAULT_ASSETS_RE.exec(id)
      if (match) {
        if (cache.has(id)) {
          return cache.get(id).mod
        }

        if (fs.existsSync(id)) {
          const buf = await fs.promises.readFile(id)
          const md5 = crypto.createHash('md5')
          const hash = md5.update(buf).digest('hex')
          const path = `${options.pathPrefix}/${hash}${match[0]}`
          const url = `${options.cdnHost}/${path}`
          const mod = `export default ${JSON.stringify(url)}`
          cache.set(id, {
            url,
            mod,
            path,
          })
          return mod
        }

        return null
      }

      return null
    },

    async buildEnd() {
      const client = new OSS({
        region: options.region,
        accessKeyId: options.accessKeyId,
        accessKeySecret: options.accessKeySecret,
        bucket: options.bucket,
      })

      if (cache.size === 0) {
        console.log(`\nno assets for uploading. skip upload assets to oss\n`)
        return
      }

      console.log(`\nstart upload assets to oss\n`)

      for (const [originPath, { path }] of cache.entries()) {
        await client.put(path, originPath)
        console.log(`upload ${chalk.green(originPath)} to ${chalk.green(path)}`)
      }

      console.log(`\nupload success\n`)
    },
  }
}

#!/usr/bin/env node
/**
 * 将 release/ 下当前版本的分平台产物上传到 GitHub Release（需已安装 gh 并已登录）。
 * 匹配: ChayuanWPS-<version>-macos-*.pkg | linux-*.deb | windows-*.exe
 * 以及旧版 ChayuanWPS-<version>-macos.pkg（无架构后缀）
 *
 * 用法:
 *   node scripts/gh-release-upload.mjs              # tag=v<package.json version>
 *   node scripts/gh-release-upload.mjs --tag v1.0.1
 *   node scripts/gh-release-upload.mjs --current-only  # 只上传本机构建的那一份
 *   node scripts/gh-release-upload.mjs --dry-run
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { currentReleaseTriple } from './lib/release-platform.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function readVersion() {
	const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
	return String(pkg.version || '0.0.0')
}

function parseArgs(argv) {
	let tag = ''
	let dryRun = false
	let currentOnly = false
	for (let i = 2; i < argv.length; i++) {
		if (argv[i] === '--tag' && argv[i + 1]) {
			tag = argv[++i]
		} else if (argv[i] === '--dry-run') {
			dryRun = true
		} else if (argv[i] === '--current-only') {
			currentOnly = true
		}
	}
	return { tag, dryRun, currentOnly }
}

function ghExists() {
	try {
		execFileSync('gh', ['--version'], { stdio: 'ignore' })
		return true
	} catch {
		return false
	}
}

function listReleaseAssets(version, currentOnly) {
	const releaseDir = path.join(root, 'release')
	if (!fs.existsSync(releaseDir)) {
		console.error('release/ directory missing.')
		process.exit(1)
	}
	const names = fs.readdirSync(releaseDir)
	const prefix = `ChayuanWPS-${version}-`
	const exts = new Set(['.pkg', '.deb', '.exe'])
	const { suffix: needSuffix } = currentOnly ? currentReleaseTriple() : { suffix: '' }
	const files = []
	for (const name of names) {
		if (!name.startsWith(prefix)) continue
		const ext = path.extname(name).toLowerCase()
		if (!exts.has(ext)) continue
		const mid = name.slice(prefix.length, -ext.length)
		if (!/^(macos|linux|windows)(-[a-z0-9]+)*$/i.test(mid)) continue
		if (currentOnly && mid.toLowerCase() !== needSuffix) continue
		files.push(path.join(releaseDir, name))
	}
	return files.sort()
}

const version = readVersion()
const { tag: tagArg, dryRun, currentOnly } = parseArgs(process.argv)
const tag = tagArg || `v${version}`

const assets = listReleaseAssets(version, currentOnly)
if (assets.length === 0) {
	const triple = currentReleaseTriple()
	const hint = currentOnly
		? ` (--current-only: 本机为 ${triple.suffix}，需存在 ChayuanWPS-${version}-${triple.suffix}.*)`
		: ''
	console.error(
		`No release assets found under release/ for version ${version} (expected ChayuanWPS-${version}-*.{pkg,deb,exe}).${hint}`,
	)
	process.exit(1)
}

console.log(`Tag: ${tag}`)
console.log('Assets:')
for (const f of assets) console.log(`  ${path.relative(root, f)}`)

if (dryRun) {
	console.log('[dry-run] skipping gh (install gh for real upload)')
	process.exit(0)
}

if (!ghExists()) {
	console.error('gh CLI not found. Install: https://cli.github.com/')
	process.exit(1)
}

let releaseExists = false
try {
	execFileSync('gh', ['release', 'view', tag, '--json', 'tagName'], { cwd: root, stdio: 'pipe' })
	releaseExists = true
} catch {
	releaseExists = false
}

const title = `ChayuanWPS ${version}`
const notes = `分平台安装包见下方 Assets（按操作系统与 CPU 架构选择）。\n\n版本: ${version}`

if (!releaseExists) {
	execFileSync(
		'gh',
		['release', 'create', tag, '--title', title, '--notes', notes, ...assets],
		{ cwd: root, stdio: 'inherit' },
	)
} else {
	execFileSync('gh', ['release', 'upload', tag, ...assets, '--clobber'], { cwd: root, stdio: 'inherit' })
}

console.log('Done.')

/**
 * Canonical OS/arch IDs for release filenames and manifests.
 * Web 资源各平台相同；文件名区分架构用于 Release 资产与用户选型。
 */
import os from 'node:os'

/** @param {string} machine */
export function normalizeArchFromUname(machine) {
	const m = String(machine || '').toLowerCase()
	if (m === 'arm64' || m === 'aarch64') return 'arm64'
	if (m === 'x86_64' || m === 'amd64') return 'x64'
	if (m === 'i386' || m === 'i686') return 'ia32'
	return m || 'unknown'
}

export function platformFamily() {
	if (process.platform === 'darwin') return 'macos'
	if (process.platform === 'linux') return 'linux'
	if (process.platform === 'win32') return 'windows'
	return process.platform
}

/** Node-style arch → canonical (win/linux/mac consistent) */
export function normalizeNodeArch(arch = process.arch) {
	const a = String(arch || '').toLowerCase()
	if (a === 'arm64') return 'arm64'
	if (a === 'x64') return 'x64'
	if (a === 'ia32') return 'ia32'
	if (a === 'arm') return 'arm'
	return a || 'unknown'
}

export function currentReleaseTriple() {
	const family = platformFamily()
	const arch =
		family === 'windows' ? normalizeNodeArch() : normalizeArchFromUname(os.machine())
	return { platform: family, arch, suffix: `${family}-${arch}` }
}

/**
 * 安装包文件名：{name}-{version}-{platform}-{arch}{ext}
 * platform/arch 与 {@link currentReleaseTriple} 一致（由当前构建机决定）。
 * @param {string} ext 含点，如 ".deb"
 */
export function releaseArtifactFilename(pkgName, version, platform, arch, ext) {
	const dot = ext.startsWith('.') ? ext : `.${ext}`
	return `${pkgName}-${version}-${platform}-${arch}${dot}`
}

const INSTALL_HINTS = {
	'macos-arm64': 'macOS Apple Silicon (arm64)：双击 .pkg；未签名时可能需右键 → 打开。',
	'macos-x64': 'macOS Intel (x64)：双击 .pkg；未签名时可能需右键 → 打开。',
	'linux-arm64': 'Linux arm64：sudo dpkg -i *.deb 后重启 WPS。',
	'linux-x64': 'Linux x64 (amd64)：sudo dpkg -i *.deb 后重启 WPS。',
	'windows-arm64': 'Windows ARM64：双击 .exe 自解压到本机 WPS jsaddons。',
	'windows-x64': 'Windows x64：双击 .exe 自解压到本机 WPS jsaddons。',
}

export function installHint(platform, arch) {
	const key = `${platform}-${arch}`
	return INSTALL_HINTS[key] || `${platform} ${arch}：按对应平台说明安装。`
}

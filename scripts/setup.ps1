# EditorBro setup for Windows (PowerShell 5.1+).
#   powershell -ExecutionPolicy Bypass -File scripts/setup.ps1 [-SkipSkills]
# Installs the Python and Node dependencies, then the third-party skills from their authors' own repos (pinned commits),
# so their licences stay with them. Needs git, Node 22+, Python 3.12 and ffmpeg on PATH. Bun is optional (for app/).
param([switch]$SkipSkills)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host '1/4 Python packages'
python -m pip install --user -r requirements.txt

Write-Host '2/4 Node packages'
foreach ($d in 'tools/motion-studio', 'projects/editorbro', 'projects/editorbro/web') {
  Push-Location $d; npm install --no-audit --no-fund; Pop-Location
}
if (Get-Command bun -ErrorAction SilentlyContinue) { Push-Location app; bun install; Pop-Location }
else { Write-Host '   (bun not found: skipping app/, the pdoom engine)' }

if (-not (Test-Path .env)) { Copy-Item .env.example .env; Write-Host '   wrote .env from .env.example (fill your own keys)' }
if ($SkipSkills) { Write-Host 'done (skills skipped)'; exit 0 }

Write-Host '3/4 Third-party skills (cloned from their authors, pinned)'
$vendor = Join-Path $root '.claude/skills/_vendor'
New-Item -ItemType Directory -Force $vendor | Out-Null
function Install-SkillPack([string]$url, [string]$commit, [string]$name) {
  $dir = Join-Path $vendor $name
  if (-not (Test-Path $dir)) { git clone -q $url $dir }
  git -C $dir checkout -q $commit
  Get-ChildItem $dir -Recurse -Filter SKILL.md | ForEach-Object {
    $skill = $_.Directory
    if ($skill.FullName -eq (Resolve-Path $dir).Path) { return }
    $dst = Join-Path $root ".claude/skills/$($skill.Name)"
    if (-not (Test-Path $dst)) { Copy-Item $skill.FullName $dst -Recurse; Write-Host "   + $($skill.Name)" }
  }
}
Install-SkillPack 'https://github.com/higgsfield-ai/skills' 'f83af0b' 'higgsfield-ai'
Install-SkillPack 'https://github.com/AKCodez/higgsfield-claude-skills' 'f6698ab' 'akcodez'
if (-not (Test-Path .claude/skills/motionmaxxing)) {
  git clone -q https://github.com/Tejashmakwana/motionmaxxing .claude/skills/motionmaxxing
  Write-Host '   + motionmaxxing (Apache-2.0)'
}

Write-Host '4/4 HyperFrames skills (HeyGen); follow its prompts'
npx skills add heygen-com/hyperframes --all

Write-Host 'done. Run: python .claude/skills/motion-studio/scripts/check_tools.py'

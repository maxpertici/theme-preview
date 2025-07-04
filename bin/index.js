#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const args = process.argv.slice(2);
const openIndex = args.indexOf('--open');
const openFlag = openIndex !== -1;
if (openFlag) args.splice(openIndex, 1);

const themePath = args[0];
const outputPathArg = args[1];

if (!themePath || !fs.existsSync(themePath)) {
  console.error('❌ Usage : theme-preview ./theme.json [chemin/de/sortie.html] [--open]');
  process.exit(1);
}

const theme = JSON.parse(fs.readFileSync(themePath, 'utf-8'));

function clampToPx(clampStr) {
  if (!clampStr || typeof clampStr !== 'string') return '';

  const match = clampStr.match(/clamp\(([^,]+),\s*([^,]+),\s*([^)]+)\)/i);
  if (!match) return '';

  function parseValue(v) {
    v = v.trim();
    if (v.endsWith('rem')) return parseFloat(v) * 16;
    if (v.endsWith('px')) return parseFloat(v);
    if (v.endsWith('vw')) return parseFloat(v) * 1920 / 100;
    return parseFloat(v) || 0;
  }

  const min = parseValue(match[1]);
  const mid = parseValue(match[2]);
  const max = parseValue(match[3]);

  return Math.round((min + mid + max) / 3);
}

function renderCopyableVariable(variableName) {
  if (!variableName) return '';
  return `<code class="copyable" title="Copier la variable CSS" onclick="copyToClipboard('${variableName}')">${variableName}</code>`;
}

function renderColorSwatches(colors = []) {
  return colors.map(color => {
    const varName = color.slug ? `var(--wp--preset--color--${color.slug})` : '';
    return `
      <div class="color-swatch">
        <div class="color-box" style="background:${color.color}"></div>
        <div class="color-info">
          <div><strong>${color.name}</strong></div>
          <div>${renderCopyableVariable(varName)}</div>
          <div>${color.color}</div>
        </div>
      </div>`;
  }).join('');
}

function renderFontFamilies(fonts = []) {
  return fonts.map(f => {
    const fontWeight = f.fontWeight || 'normal';
    return `
      <div class="font-sample" style="font-family:${f.fontFamily}; font-weight:${fontWeight}">
        <div><strong>${f.name}</strong> — poids: ${fontWeight}</div>
        <div class="sample-text">Le vif renard brun saute par-dessus le chien paresseux.</div>
      </div>
    `;
  }).join('');
}

function renderFontSizes(fontSizes = []) {
  return fontSizes.map(fz => {
    const varName = fz.slug ? `var(--wp--preset--font-size--${fz.slug})` : '';
    const pxValue = clampToPx(fz.size);
    return `
      <div class="font-size-sample">
        <div><strong>${fz.name}</strong> — taille CSS: ${fz.size} — ~${pxValue}px — ${renderCopyableVariable(varName)}</div>
        <div style="font-size:${fz.size}; border:1px solid #ddd; padding:4px; margin-top:4px;">
          Le vif renard brun saute par-dessus le chien paresseux.
        </div>
      </div>
    `;
  }).join('');
}

function renderSpacing(spacing = {}) {
  return Object.entries(spacing).map(([key, val]) => {
    const varName = `var(--wp--preset--spacing--${key})`;
    const pxValue = clampToPx(val);
    return `
      <div class="spacing-sample">
        <div><strong>${key}</strong> — valeur CSS: ${val} — ~${pxValue}px — ${renderCopyableVariable(varName)}</div>
        <div style="background:#eee; width:${pxValue}px; height:20px; margin-top:4px; border:1px solid #ccc;"></div>
      </div>
    `;
  }).join('');
}

const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<title>Preview theme.json</title>
<style>
  body { font-family: sans-serif; padding: 2rem; max-width: 900px; margin: auto; }
  h1 { text-align: center; }
  h2 { margin-top: 3rem; border-bottom: 2px solid #ccc; padding-bottom: .5rem; }
  .copyable {
    cursor: pointer;
    user-select: all;
    background: #f0f0f0;
    padding: 2px 4px;
    border-radius: 3px;
    display: inline-block;
  }
  .copyable:hover {
    background: #ddd;
  }
  .color-swatch {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
  }
  .color-box {
    width: 40px; height: 40px; border-radius: 4px; margin-right: 10px; border: 1px solid #ccc;
  }
  .color-info > div {
    margin: 2px 0;
  }
  .font-sample {
    margin-bottom: 20px;
  }
  .sample-text {
    margin-top: 5px;
    border: 1px solid #ddd;
    padding: 5px;
    background: #fafafa;
  }
  .font-size-sample, .spacing-sample {
    margin-bottom: 20px;
  }
</style>
<script>
  function copyToClipboard(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        alert('Copié dans le presse-papiers : ' + text);
      });
    } else {
      alert('Impossible de copier (fonction non supportée)');
    }
  }
</script>
</head>
<body>
  <h1>Preview du theme.json</h1>

  ${theme.settings?.typography?.fontFamilies ? `<h2>Typographies</h2>${renderFontFamilies(theme.settings.typography.fontFamilies)}` : ''}

  ${theme.settings?.typography?.fontSizes ? `<h2>Tailles de police</h2>${renderFontSizes(theme.settings.typography.fontSizes)}` : ''}

  ${theme.settings?.spacing ? `<h2>Espacements</h2>${renderSpacing(theme.settings.spacing)}` : ''}

  ${theme.settings?.color?.palette ? `<h2>Palette de couleurs</h2>${renderColorSwatches(theme.settings.color.palette)}` : ''}

</body>
</html>
`;

const outputPath = path.resolve(outputPathArg || './preview-theme.html');
const outputDir = path.dirname(outputPath);
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, html, 'utf-8');

console.log(`✅ Fichier généré : ${outputPath}`);

if (openFlag) {
  const openCommand =
    process.platform === 'darwin' ? 'open' :
    process.platform === 'win32' ? 'start' :
    'xdg-open';

  spawn(openCommand, [outputPath], { stdio: 'ignore', detached: true }).unref();
  console.log('🌐 Ouverture dans le navigateur...');
}
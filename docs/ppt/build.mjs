#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, readdirSync, watch } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const SHELL = join(DIR, 'index.html');
const SLIDES_DIR = join(DIR, 'slides');
const OUTPUT = join(DIR, 'nuvovet_deck.html');
const TOTAL_SLIDES = 18;
const MARKER_START = '<!-- SLIDES WILL BE INJECTED HERE BY CONTENT SCRIPTS -->';

function slidePath(index) {
  return join(SLIDES_DIR, `s${String(index).padStart(2, '0')}.html`);
}

function build() {
  const shell = readFileSync(SHELL, 'utf8');
  const fragments = [];
  const existing = [];
  const missing = [];

  for (let index = 1; index <= TOTAL_SLIDES; index += 1) {
    const path = slidePath(index);
    if (existsSync(path)) {
      fragments.push(readFileSync(path, 'utf8'));
      existing.push(`s${String(index).padStart(2, '0')}`);
    } else {
      fragments.push(
        `<section class="slide" id="s${index}"><div class="center h-full"><p class="label label-dim">Slide ${index} - pending</p></div><span class="slide-num">${String(index).padStart(2, '0')}/18</span></section>`
      );
      missing.push(`s${String(index).padStart(2, '0')}`);
    }
  }

  const vpStart = shell.indexOf(MARKER_START);
  if (vpStart === -1) {
    throw new Error('Slide injection marker not found in index.html');
  }

  const vpEnd = shell.indexOf('</div>', vpStart);
  if (vpEnd === -1) {
    throw new Error('Presentation viewport closing tag not found in index.html');
  }

  const output = `${shell.slice(0, vpStart)}${fragments.join('\n\n')}\n\n${shell.slice(vpEnd)}`;
  writeFileSync(OUTPUT, output, 'utf8');

  console.log(`Built ${OUTPUT}`);
  console.log(`  Slides present: ${existing.length}/${TOTAL_SLIDES} - ${existing.join(', ')}`);
  if (missing.length > 0) {
    console.log(`  Missing (placeholder): ${missing.join(', ')}`);
  }
}

function watchAndBuild() {
  let timer;
  const scheduleBuild = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        build();
      } catch (error) {
        console.error(error instanceof Error ? error.message : error);
      }
    }, 100);
  };

  build();
  console.log('Watching index.html and slides/*.html for changes...');

  watch(SHELL, scheduleBuild);
  watch(SLIDES_DIR, (eventType, filename) => {
    if (typeof filename === 'string' && filename.endsWith('.html')) {
      scheduleBuild();
    }
  });
}

if (process.argv.includes('--watch')) {
  watchAndBuild();
} else {
  build();
}
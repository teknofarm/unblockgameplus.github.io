/**
 * Keyword Index Engine
 * Uses new rfSlug-style URLs: /{f1}/{f2}/{prefix}{code}{slug}
 */

const fs = require('fs');
const path = require('path');
const config = require('../config');
const { buildArticleUrl } = require('./slug-utils');

let folderIndex = new Map();
let searchIndex = [];
let folderList = [];
let lastBuild = 0;
let building = false;
let totalArticles = 0;

async function buildIndex() {
  if (building) return;
  building = true;
  const startTime = Date.now();
  const newFolderIndex = new Map();
  const newSearchIndex = [];
  const newFolderList = [];
  let count = 0;
  const keywDir = path.resolve(config.keywDir);

  try {
    const level1Folders = fs.readdirSync(keywDir, { withFileTypes: true })
      .filter(d => d.isDirectory()).map(d => d.name);

    for (const f1 of level1Folders) {
      const f1Path = path.join(keywDir, f1);
      const level2Items = fs.readdirSync(f1Path, { withFileTypes: true });

      for (const item of level2Items) {
        if (item.isDirectory()) continue;
        const f2 = item.name;
        const filePath = path.join(f1Path, f2);

        let content;
        try { content = fs.readFileSync(filePath, 'utf-8'); } catch (e) { continue; }

        const lines = content.split('\n').filter(l => l.trim());
        const folderEntries = [];

        for (const line of lines) {
          const spaceIdx = line.indexOf(' ');
          if (spaceIdx === -1) continue;
          const code = line.substring(0, spaceIdx).trim();
          const keyword = line.substring(spaceIdx + 1).trim();
          if (!code || !keyword) continue;

          const url = buildArticleUrl(f1, f2, code, keyword);
          const entry = { code, f1, f2, keyword, url };
          folderEntries.push(entry);
          newSearchIndex.push(entry);
          count++;
        }
        newFolderIndex.set(`${f1}/${f2}`, folderEntries);
        newFolderList.push({ f1, f2, count: folderEntries.length });
      }
    }

    folderIndex = newFolderIndex;
    searchIndex = newSearchIndex;
    folderList = newFolderList;
    totalArticles = count;
    lastBuild = Date.now();
    console.log(`[Index] Built: ${count} articles, ${newFolderIndex.size} folders in ${Date.now() - startTime}ms`);
  } catch (err) {
    console.error('[Index] Build error:', err.message);
  } finally {
    building = false;
  }
}

async function ensureIndex() {
  if (totalArticles === 0 || (Date.now() - lastBuild > config.cache.keywordIndexTTL)) {
    await buildIndex();
  }
}

async function getFolder(f1, f2, page, perPage) {
  page = page || 1; perPage = perPage || 50;
  await ensureIndex();
  const entries = folderIndex.get(`${f1}/${f2}`) || [];
  const start = (page - 1) * perPage;
  return { items: entries.slice(start, start + perPage), total: entries.length, page, totalPages: Math.ceil(entries.length / perPage) };
}

async function getSubfolders(f1) {
  await ensureIndex();
  return folderList.filter(f => f.f1 === f1);
}

async function getLevel1Folders() {
  await ensureIndex();
  const l1 = new Map();
  for (const f of folderList) {
    if (!l1.has(f.f1)) l1.set(f.f1, { f1: f.f1, subfolders: 0, totalArticles: 0 });
    const e = l1.get(f.f1);
    e.subfolders++;
    e.totalArticles += f.count;
  }
  return Array.from(l1.values());
}

async function getAllFolders() { await ensureIndex(); return folderList; }

async function getFolderRaw(f1, f2) { await ensureIndex(); return folderIndex.get(`${f1}/${f2}`) || []; }

async function getF1Raw(f1) {
  await ensureIndex();
  const results = [];
  for (const [key, entries] of folderIndex.entries()) {
    if (key.startsWith(`${f1}/`)) {
      results.push(...entries);
    }
  }
  return results;
}

async function searchKeywords(query, page, perPage) {
  page = page || 1; perPage = perPage || 30;
  await ensureIndex();
  const q = query.toLowerCase().trim();
  if (!q) return { items: [], total: 0, page: 1, totalPages: 0 };
  const qWords = q.split(/\s+/);
  const results = [];
  for (const entry of searchIndex) {
    const kw = entry.keyword.toLowerCase();
    if (qWords.every(w => kw.includes(w))) {
      results.push(entry);
      if (results.length >= 500) break;
    }
  }
  const start = (page - 1) * perPage;
  return { items: results.slice(start, start + perPage), total: results.length, page, totalPages: Math.ceil(results.length / perPage) };
}

async function getRandomArticles(count) {
  count = count || 30;
  await ensureIndex();
  if (searchIndex.length === 0) return [];
  const selected = [];
  const used = new Set();
  const max = Math.min(count, searchIndex.length);
  while (selected.length < max) {
    const idx = Math.floor(Math.random() * searchIndex.length);
    if (!used.has(idx)) { used.add(idx); selected.push(searchIndex[idx]); }
  }
  return selected;
}

async function getAllArticles(page, perPage) {
  page = page || 1; perPage = perPage || 30;
  await ensureIndex();
  const start = (page - 1) * perPage;
  const items = searchIndex.slice(start, start + perPage);
  return { items, total: searchIndex.length, page, totalPages: Math.ceil(searchIndex.length / perPage) };
}

async function findRelated(relatedKeywords, currentCode, limit) {
  limit = limit || 8;
  await ensureIndex();
  const results = [];
  for (const kw of relatedKeywords) {
    const kwLower = kw.toLowerCase().trim();
    const qWords = kwLower.split(/\s+/);
    for (const entry of searchIndex) {
      if (entry.code === currentCode) continue;
      if (qWords.every(w => entry.keyword.toLowerCase().includes(w))) {
        results.push(entry);
        break;
      }
    }
    if (results.length >= limit) break;
  }
  return results;
}

async function getTotalCount() { await ensureIndex(); return totalArticles; }

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

module.exports = { buildIndex, ensureIndex, getFolder, getSubfolders, getLevel1Folders, getAllFolders, getFolderRaw, getF1Raw, searchKeywords, getRandomArticles, findRelated, getTotalCount, getAllArticles, shuffleArray };

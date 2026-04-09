<?php
set_time_limit(0);

$root = "apalah/";
$keywRoot = "keyw/";
$maxIndexFolders = 9;
$minPerFolder = 1000;
$maxPerFolder = 1200;

if (!is_dir($root)) {
    die("Folder apalah tidak ditemukan.");
}

/* =========================
   CLEAR OLD KEYW FILES
========================= */

function deleteDir($dir)
{
    if (!is_dir($dir)) return;

    $files = scandir($dir);

    foreach ($files as $file) {
        if ($file == '.' || $file == '..') continue;

        $path = $dir . '/' . $file;

        if (is_dir($path)) {
            deleteDir($path);
        } else {
            unlink($path);
        }
    }

    rmdir($dir);
}

if (is_dir($keywRoot)) {
    deleteDir($keywRoot);
}

mkdir($keywRoot, 0777, true);

/* =========================
   RANDOM FUNCTIONS
========================= */

function randomAlphaNum($length = 6)
{
    $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    $max   = strlen($chars) - 1;
    $result = '';
    for ($i = 0; $i < $length; $i++) {
        $result .= $chars[random_int(0, $max)];
    }
    return $result;
}

function randomAlphaNum3()
{
    return randomAlphaNum(3);
}

function randomDigits3()
{
    return str_pad(random_int(0, 999), 3, '0', STR_PAD_LEFT);
}

/* =========================
   SCAN FILES (REKURSIF)
========================= */

echo "Scanning files...\n";

$jsonFiles = [];

function scanAllFiles($dir, &$result)
{
    $items = scandir($dir);

    foreach ($items as $item) {
        if ($item == '.' || $item == '..') continue;

        $path = $dir . '/' . $item;

        if (is_file($path)) {
            $result[] = $path;
        } elseif (is_dir($path)) {
            scanAllFiles($path, $result);
        }
    }
}

scanAllFiles(rtrim($root, '/'), $jsonFiles);

$totalFiles = count($jsonFiles);

if ($totalFiles == 0) {
    die("Tidak ada file ditemukan\n");
}

echo "Total file ditemukan: $totalFiles\n";

shuffle($jsonFiles);

/* =========================
   GENERATE INDEX FOLDERS
========================= */

$indexFolders = [];

for ($i = 0; $i < $maxIndexFolders; $i++) {
    $indexFolders[] = randomAlphaNum3();
}

$fileCounter   = 0;
$currentCount  = 0;
$currentLimit  = random_int($minPerFolder, $maxPerFolder);
$folderCounter = 0;

$level1 = "";
$level2 = "";

/* =========================
   DISTRIBUTE FILES
========================= */

foreach ($jsonFiles as $sourcePath) {

    if ($currentCount == 0) {

        $level1 = $indexFolders[$folderCounter % $maxIndexFolders];
        $level2 = randomDigits3();

        $targetDir = $root . $level1 . "/" . $level2 . "/";

        if (!is_dir($targetDir)) {
            mkdir($targetDir, 0777, true);
        }

        $folderCounter++;
        $currentLimit = random_int($minPerFolder, $maxPerFolder);
    }

    /* ambil nama file TANPA ekstensi */
    $baseName = pathinfo($sourcePath, PATHINFO_FILENAME);

    /* hapus kode unik lama */
    $baseName = preg_replace('/^([A-Za-z0-9]{6}\s+)+/', '', $baseName);

    /* hapus kata json jika masih ada */
    $baseName = preg_replace('/json$/i', '', $baseName);

    $baseName = str_replace(['-', '_'], ' ', $baseName);
    $baseName = preg_replace('/[^a-zA-Z0-9 ]/', '', $baseName);
    $baseName = preg_replace('/\s+/', ' ', $baseName);
    $baseName = trim($baseName);

    $baseName = substr($baseName, 0, 180);

    $uniqueCode = randomAlphaNum(6);
    $newName    = $uniqueCode . " " . $baseName;
    $destPath   = $root . $level1 . "/" . $level2 . "/" . $newName;

    while (file_exists($destPath)) {
        $uniqueCode = randomAlphaNum(6);
        $destPath   = $root . $level1 . "/" . $level2 . "/" . $uniqueCode . " " . $baseName;
    }

    if (!@rename($sourcePath, $destPath)) {
        echo "Rename gagal: $sourcePath\n";
        continue;
    }

    $fileCounter++;
    $currentCount++;

    if ($currentCount >= $currentLimit) {
        $currentCount = 0;
    }
}

echo "Distribusi selesai: $fileCounter file\n";

/* =========================
   GENERATE KEYWORD FILES
========================= */

echo "Generate keyword files...\n";

$level1Folders = scandir($root);

foreach ($level1Folders as $level1) {

    if ($level1 == '.' || $level1 == '..') continue;

    $level1Path = $root . $level1;

    if (!is_dir($level1Path)) continue;

    $level2Folders = scandir($level1Path);

    foreach ($level2Folders as $level2) {

        if ($level2 == '.' || $level2 == '..') continue;

        $level2Path = $level1Path . "/" . $level2;

        if (!is_dir($level2Path)) continue;

        $files    = scandir($level2Path);
        $keywords = [];

        foreach ($files as $file) {

            if ($file == '.' || $file == '..') continue;

            if (is_file($level2Path . "/" . $file)) {
                $keywords[] = $file;
            }
        }

        if (empty($keywords)) continue;

        $keywLevel1Path = $keywRoot . $level1 . "/";

        if (!is_dir($keywLevel1Path)) {
            mkdir($keywLevel1Path, 0777, true);
        }

        $outputPath = $keywLevel1Path . $level2;

        file_put_contents($outputPath, implode(PHP_EOL, $keywords));
    }
}

echo "Semua proses selesai\n";

/* =========================
   DELETE EMPTY FOLDERS
========================= */

echo "Membersihkan folder kosong...\n";

function deleteEmptyDirs($dir)
{
    if (!is_dir($dir)) return;

    $items = scandir($dir);

    foreach ($items as $item) {

        if ($item == '.' || $item == '..') continue;

        $path = $dir . '/' . $item;

        if (is_dir($path)) {
            deleteEmptyDirs($path);

            if (count(scandir($path)) == 2) {
                rmdir($path);
            }
        }
    }
}

deleteEmptyDirs($root);

echo "Folder kosong dibersihkan\n";

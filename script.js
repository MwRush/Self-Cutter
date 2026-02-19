const translations = {
    fr: {
        title: 'Image Cutter',
        upload: 'Choisir une image',
        width: 'Largeur (px)',
        height: 'Hauteur (px)',
        keepEmpty: 'Garder les images vides',
        overlap: 'Mode chevauchement (50%)',
        cut: 'Découper',
        results: 'Résultats',
        downloadAll: 'Télécharger tout (ZIP)',
        newImage: 'Nouvelle image',
        images: 'images',
        image: 'image'
    },
    en: {
        title: 'Image Cutter',
        upload: 'Choose an image',
        width: 'Width (px)',
        height: 'Height (px)',
        keepEmpty: 'Keep empty images',
        overlap: 'Overlap mode (50%)',
        cut: 'Cut',
        results: 'Results',
        downloadAll: 'Download all (ZIP)',
        newImage: 'New image',
        images: 'images',
        image: 'image'
    }
};

let currentLang = localStorage.getItem('lang') || 'fr';
let currentTheme = localStorage.getItem('theme') || 'light';

const fileInput = document.getElementById('fileInput');
const settingsSection = document.getElementById('settingsSection');
const resultsSection = document.getElementById('resultsSection');
const previewCanvas = document.getElementById('previewCanvas');
const widthInput = document.getElementById('widthInput');
const heightInput = document.getElementById('heightInput');
const keepEmptyCheckbox = document.getElementById('keepEmpty');
const overlapModeCheckbox = document.getElementById('overlapMode');
const cutBtn = document.getElementById('cutBtn');
const resultsGrid = document.getElementById('resultsGrid');
const imageCount = document.getElementById('imageCount');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const resetBtn = document.getElementById('resetBtn');
const themeToggle = document.getElementById('themeToggle');
const langToggle = document.getElementById('langToggle');

let originalImage = null;
let cutImages = [];

function init() {
    setTheme(currentTheme);
    setLang(currentLang);
    settingsSection.style.display = 'none';
    resultsSection.style.display = 'none';
}

function setTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
}

function setLang(lang) {
    currentLang = lang;
    langToggle.textContent = lang === 'fr' ? 'EN' : 'FR';
    document.documentElement.lang = lang;

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang][key]) {
            el.textContent = translations[lang][key];
        }
    });
}

themeToggle.addEventListener('click', () => {
    setTheme(currentTheme === 'light' ? 'dark' : 'light');
});

langToggle.addEventListener('click', () => {
    setLang(currentLang === 'fr' ? 'en' : 'fr');
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                originalImage = img;
                drawPreview();
                settingsSection.style.display = 'block';
                resultsSection.style.display = 'none';
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});

function drawPreview() {
    if (!originalImage) return;

    const maxWidth = Math.min(800, window.innerWidth - 80);
    const scale = Math.min(1, maxWidth / originalImage.width);
    previewCanvas.width = originalImage.width * scale;
    previewCanvas.height = originalImage.height * scale;

    const ctx = previewCanvas.getContext('2d');
    ctx.drawImage(originalImage, 0, 0, previewCanvas.width, previewCanvas.height);
}

cutBtn.addEventListener('click', () => {
    if (!originalImage) return;

    const tileWidth = parseInt(widthInput.value) || 512;
    const tileHeight = parseInt(heightInput.value) || 512;
    const keepEmpty = keepEmptyCheckbox.checked;
    const overlap = overlapModeCheckbox.checked;

    cutImages = [];
    resultsGrid.innerHTML = '';

    const stepX = overlap ? Math.ceil(tileWidth / 2) : tileWidth;
    const stepY = overlap ? Math.ceil(tileHeight / 2) : tileHeight;

    for (let y = 0; y < originalImage.height; y += stepY) {
        for (let x = 0; x < originalImage.width; x += stepX) {
            const canvas = document.createElement('canvas');
            canvas.width = tileWidth;
            canvas.height = tileHeight;
            const ctx = canvas.getContext('2d');

            ctx.drawImage(
                originalImage,
                x, y, tileWidth, tileHeight,
                0, 0, tileWidth, tileHeight
            );

            const imageData = ctx.getImageData(0, 0, tileWidth, tileHeight);
            const hasContent = hasNonTransparentPixels(imageData);

            if (hasContent || keepEmpty) {
                const item = document.createElement('div');
                item.className = 'result-item' + (!hasContent ? ' empty' : '');

                const preview = document.createElement('canvas');
                preview.width = tileWidth;
                preview.height = tileHeight;
                preview.getContext('2d').putImageData(imageData, 0, 0);
                item.appendChild(preview);

                const downloadBtn = document.createElement('button');
                downloadBtn.className = 'download-btn';
                downloadBtn.textContent = '↓';
                downloadBtn.onclick = () => downloadImage(canvas, x, y);
                item.appendChild(downloadBtn);

                resultsGrid.appendChild(item);

                cutImages.push({
                    canvas: canvas,
                    x: x,
                    y: y,
                    isEmpty: !hasContent
                });
            }
        }
    }

    const count = cutImages.length;
    imageCount.textContent = `${count} ${count > 1 ? translations[currentLang].images : translations[currentLang].image}`;
    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth' });
});

function hasNonTransparentPixels(imageData) {
    const data = imageData.data;
    for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0) return true;
    }
    return false;
}

function downloadImage(canvas, x, y) {
    const link = document.createElement('a');
    link.download = `cut_${x}_${y}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

downloadAllBtn.addEventListener('click', () => {
    if (cutImages.length === 0) return;

    const zip = new JSZip();

    cutImages.forEach((item) => {
        const dataUrl = item.canvas.toDataURL('image/png');
        const base64Data = dataUrl.split(',')[1];
        zip.file(`cut_${item.x}_${item.y}.png`, base64Data, { base64: true });
    });

    zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
    }).then((blob) => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'cut_images.zip';

        link.setAttribute('download', 'cut_images.zip');
        link.click();

        setTimeout(() => URL.revokeObjectURL(link.href), 100);
    });
});

resetBtn.addEventListener('click', () => {
    originalImage = null;
    cutImages = [];
    fileInput.value = '';
    settingsSection.style.display = 'none';
    resultsSection.style.display = 'none';
    resultsGrid.innerHTML = '';
});

window.addEventListener('resize', () => {
    if (originalImage) {
        drawPreview();
    }
});

init();

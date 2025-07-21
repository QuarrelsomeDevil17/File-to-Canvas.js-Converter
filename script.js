// Global variables
let canvas;
let fabricCanvas;
let currentFile = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeCanvas();
    setupEventListeners();
});

function initializeCanvas() {
    // Initialize Fabric.js canvas
    fabricCanvas = new fabric.Canvas('canvas', {
        width: 800,
        height: 600,
        backgroundColor: '#ffffff'
    });
}

function setupEventListeners() {
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadArea = document.getElementById('uploadArea');
    const copyCode = document.getElementById('copyCode');
    const downloadCanvas = document.getElementById('downloadCanvas');
    const resetCanvas = document.getElementById('resetCanvas');

    // Upload button click
    uploadBtn.addEventListener('click', () => {
        fileInput.click();
    });

    // Upload area click
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });

    // File input change
    fileInput.addEventListener('change', handleFileSelect);

    // Drag and drop events
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleFileDrop);

    // Copy code button
    copyCode.addEventListener('click', copyCodeToClipboard);

    // Download canvas
    downloadCanvas.addEventListener('click', downloadCanvasImage);

    // Reset canvas
    resetCanvas.addEventListener('click', resetCanvasContent);

    // Prevent default drag behaviors
    document.addEventListener('dragover', (e) => e.preventDefault());
    document.addEventListener('drop', (e) => e.preventDefault());
}

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('dragover');
}

function handleFileDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        processFile(file);
    }
}

function processFile(file) {
    currentFile = file;
    showMessage('Processing file...', 'info');
    
    // Update file info
    updateFileInfo(file);
    
    // Show sections
    showSection('infoSection');
    showSection('previewSection');
    showSection('codeSection');
    
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();
    
    if (fileType.includes('image/png') || fileType.includes('image/jpeg') || fileType.includes('image/jpg')) {
        processImageFile(file);
    } else if (fileType.includes('pdf') || fileName.endsWith('.pdf')) {
        processPDFFile(file);
    } else if (fileName.endsWith('.fig') || fileType.includes('figma')) {
        processFigmaFile(file);
    } else {
        showMessage('Unsupported file type. Please upload PNG, JPEG, PDF, or Figma files.', 'error');
    }
}

function processImageFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            // Clear canvas
            fabricCanvas.clear();
            
            // Calculate dimensions to fit canvas
            const canvasWidth = fabricCanvas.width;
            const canvasHeight = fabricCanvas.height;
            const imgAspectRatio = img.width / img.height;
            const canvasAspectRatio = canvasWidth / canvasHeight;
            
            let scaledWidth, scaledHeight;
            
            if (imgAspectRatio > canvasAspectRatio) {
                scaledWidth = canvasWidth;
                scaledHeight = canvasWidth / imgAspectRatio;
            } else {
                scaledHeight = canvasHeight;
                scaledWidth = canvasHeight * imgAspectRatio;
            }
            
            // Create fabric image object
            const fabricImg = new fabric.Image(img, {
                left: (canvasWidth - scaledWidth) / 2,
                top: (canvasHeight - scaledHeight) / 2,
                scaleX: scaledWidth / img.width,
                scaleY: scaledHeight / img.height,
                selectable: true,
                moveable: true
            });
            
            fabricCanvas.add(fabricImg);
            fabricCanvas.renderAll();
            
            // Generate Canvas.js code
            generateCanvasCode();
            showMessage('Image processed successfully!', 'success');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function processPDFFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const typedarray = new Uint8Array(e.target.result);
        
        pdfjsLib.getDocument(typedarray).promise.then(function(pdf) {
            // Get first page
            pdf.getPage(1).then(function(page) {
                const scale = 1.5;
                const viewport = page.getViewport({ scale: scale });
                
                // Create canvas element for PDF rendering
                const pdfCanvas = document.createElement('canvas');
                const context = pdfCanvas.getContext('2d');
                pdfCanvas.height = viewport.height;
                pdfCanvas.width = viewport.width;
                
                const renderContext = {
                    canvasContext: context,
                    viewport: viewport
                };
                
                page.render(renderContext).promise.then(function() {
                    // Convert canvas to image and add to fabric canvas
                    const imgData = pdfCanvas.toDataURL();
                    const img = new Image();
                    img.onload = function() {
                        fabricCanvas.clear();
                        
                        // Scale to fit canvas
                        const canvasWidth = fabricCanvas.width;
                        const canvasHeight = fabricCanvas.height;
                        const imgAspectRatio = img.width / img.height;
                        const canvasAspectRatio = canvasWidth / canvasHeight;
                        
                        let scaledWidth, scaledHeight;
                        
                        if (imgAspectRatio > canvasAspectRatio) {
                            scaledWidth = canvasWidth;
                            scaledHeight = canvasWidth / imgAspectRatio;
                        } else {
                            scaledHeight = canvasHeight;
                            scaledWidth = canvasHeight * imgAspectRatio;
                        }
                        
                        const fabricImg = new fabric.Image(img, {
                            left: (canvasWidth - scaledWidth) / 2,
                            top: (canvasHeight - scaledHeight) / 2,
                            scaleX: scaledWidth / img.width,
                            scaleY: scaledHeight / img.height,
                            selectable: true,
                            moveable: true
                        });
                        
                        fabricCanvas.add(fabricImg);
                        fabricCanvas.renderAll();
                        
                        generateCanvasCode();
                        showMessage('PDF processed successfully!', 'success');
                    };
                    img.src = imgData;
                });
            });
        }).catch(function(error) {
            console.error('Error loading PDF:', error);
            showMessage('Error processing PDF file.', 'error');
        });
    };
    reader.readAsArrayBuffer(file);
}

function processFigmaFile(file) {
    // For Figma files, we'll treat them as JSON and try to extract design information
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const figmaData = JSON.parse(e.target.result);
            
            // Clear canvas
            fabricCanvas.clear();
            
            // Create a placeholder for Figma content
            const text = new fabric.Text('Figma Design Imported', {
                left: fabricCanvas.width / 2,
                top: fabricCanvas.height / 2,
                originX: 'center',
                originY: 'center',
                fontSize: 24,
                fill: '#667eea',
                fontFamily: 'Arial'
            });
            
            // Add background rectangle
            const rect = new fabric.Rect({
                left: 50,
                top: 50,
                width: fabricCanvas.width - 100,
                height: fabricCanvas.height - 100,
                fill: '#f7fafc',
                stroke: '#e2e8f0',
                strokeWidth: 2
            });
            
            fabricCanvas.add(rect);
            fabricCanvas.add(text);
            fabricCanvas.renderAll();
            
            generateCanvasCode();
            showMessage('Figma file processed! (Note: Full Figma import requires Figma API)', 'info');
            
        } catch (error) {
            console.error('Error processing Figma file:', error);
            showMessage('Error processing Figma file. Please ensure it\'s a valid Figma export.', 'error');
        }
    };
    reader.readAsText(file);
}

function generateCanvasCode() {
    const canvasJSON = fabricCanvas.toJSON();
    
    const code = `// Generated Canvas.js Code
// Canvas initialization
const canvas = new fabric.Canvas('canvas', {
    width: ${fabricCanvas.width},
    height: ${fabricCanvas.height},
    backgroundColor: '${fabricCanvas.backgroundColor}'
});

// Canvas objects data
const canvasData = ${JSON.stringify(canvasJSON, null, 2)};

// Load canvas from JSON
canvas.loadFromJSON(canvasData, function() {
    canvas.renderAll();
    console.log('Canvas loaded successfully!');
});

// Alternative: Manual object creation
${generateManualObjectCode()}

// Canvas manipulation functions
function addText(text, x = 100, y = 100) {
    const textObj = new fabric.Text(text, {
        left: x,
        top: y,
        fontSize: 20,
        fill: '#333333'
    });
    canvas.add(textObj);
    canvas.renderAll();
}

function addRectangle(x = 50, y = 50, width = 100, height = 100) {
    const rect = new fabric.Rect({
        left: x,
        top: y,
        width: width,
        height: height,
        fill: '#ff0000',
        stroke: '#000000',
        strokeWidth: 1
    });
    canvas.add(rect);
    canvas.renderAll();
}

function addCircle(x = 100, y = 100, radius = 50) {
    const circle = new fabric.Circle({
        left: x,
        top: y,
        radius: radius,
        fill: '#00ff00',
        stroke: '#000000',
        strokeWidth: 1
    });
    canvas.add(circle);
    canvas.renderAll();
}

// Event listeners
canvas.on('object:selected', function(e) {
    console.log('Object selected:', e.target);
});

canvas.on('object:modified', function(e) {
    console.log('Object modified:', e.target);
});`;

    document.getElementById('codeOutput').value = code;
}

function generateManualObjectCode() {
    const objects = fabricCanvas.getObjects();
    let code = '// Manual object creation:\n';
    
    objects.forEach((obj, index) => {
        if (obj.type === 'image') {
            code += `
// Image object ${index + 1}
fabric.Image.fromURL('${obj.getSrc()}', function(img) {
    img.set({
        left: ${obj.left},
        top: ${obj.top},
        scaleX: ${obj.scaleX},
        scaleY: ${obj.scaleY}
    });
    canvas.add(img);
    canvas.renderAll();
});`;
        } else if (obj.type === 'text') {
            code += `
// Text object ${index + 1}
const text${index + 1} = new fabric.Text('${obj.text}', {
    left: ${obj.left},
    top: ${obj.top},
    fontSize: ${obj.fontSize},
    fill: '${obj.fill}',
    fontFamily: '${obj.fontFamily}'
});
canvas.add(text${index + 1});`;
        } else if (obj.type === 'rect') {
            code += `
// Rectangle object ${index + 1}
const rect${index + 1} = new fabric.Rect({
    left: ${obj.left},
    top: ${obj.top},
    width: ${obj.width},
    height: ${obj.height},
    fill: '${obj.fill}',
    stroke: '${obj.stroke}',
    strokeWidth: ${obj.strokeWidth}
});
canvas.add(rect${index + 1});`;
        }
    });
    
    return code;
}

function updateFileInfo(file) {
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = formatFileSize(file.size);
    document.getElementById('fileType').textContent = file.type || 'Unknown';
    
    // For images, we'll get dimensions after loading
    if (file.type.includes('image/')) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                document.getElementById('fileDimensions').textContent = `${img.width} × ${img.height} pixels`;
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    } else {
        document.getElementById('fileDimensions').textContent = 'N/A';
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showSection(sectionId) {
    const section = document.getElementById(sectionId);
    section.classList.add('visible');
}

function hideSection(sectionId) {
    const section = document.getElementById(sectionId);
    section.classList.remove('visible');
}

function showMessage(message, type = 'info') {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());
    
    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    // Insert after header
    const header = document.querySelector('header');
    header.insertAdjacentElement('afterend', messageDiv);
    
    // Auto-remove success messages after 5 seconds
    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }
}

function copyCodeToClipboard() {
    const codeOutput = document.getElementById('codeOutput');
    codeOutput.select();
    codeOutput.setSelectionRange(0, 99999); // For mobile devices
    
    try {
        document.execCommand('copy');
        showMessage('Code copied to clipboard!', 'success');
    } catch (err) {
        console.error('Failed to copy code: ', err);
        showMessage('Failed to copy code. Please select and copy manually.', 'error');
    }
}

function downloadCanvasImage() {
    const dataURL = fabricCanvas.toDataURL({
        format: 'png',
        quality: 1.0
    });
    
    const link = document.createElement('a');
    link.download = `canvas-export-${Date.now()}.png`;
    link.href = dataURL;
    link.click();
    
    showMessage('Canvas image downloaded!', 'success');
}

function resetCanvasContent() {
    if (confirm('Are you sure you want to reset the canvas? This will remove all objects.')) {
        fabricCanvas.clear();
        fabricCanvas.backgroundColor = '#ffffff';
        fabricCanvas.renderAll();
        
        document.getElementById('codeOutput').value = '';
        
        hideSection('previewSection');
        hideSection('codeSection');
        hideSection('infoSection');
        
        currentFile = null;
        document.getElementById('fileInput').value = '';
        
        showMessage('Canvas reset successfully!', 'info');
    }
}

// Add some utility functions for canvas manipulation
function addSampleObjects() {
    // Add sample text
    const text = new fabric.Text('Sample Text', {
        left: 100,
        top: 100,
        fontSize: 24,
        fill: '#333333'
    });
    
    // Add sample rectangle
    const rect = new fabric.Rect({
        left: 200,
        top: 200,
        width: 100,
        height: 80,
        fill: '#ff6b6b',
        stroke: '#333',
        strokeWidth: 2
    });
    
    // Add sample circle
    const circle = new fabric.Circle({
        left: 350,
        top: 150,
        radius: 40,
        fill: '#4ecdc4',
        stroke: '#333',
        strokeWidth: 2
    });
    
    fabricCanvas.add(text, rect, circle);
    fabricCanvas.renderAll();
    
    generateCanvasCode();
}

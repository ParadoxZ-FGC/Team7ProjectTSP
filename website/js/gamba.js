document.addEventListener('DOMContentLoaded', function() {
// =============================================
// DEVELOPER CUSTOMIZATION SECTION
// =============================================
// Easily update these values to change the wheel behavior

// Define your wheel configuration here
const WEDGE_CONFIG = [
    { points: 10, probability: 25 },  // 25% chance
    { points: 20, probability: 20 },  // 20% chance
    { points: 30, probability: 15 },  // 15% chance
    { points: 40, probability: 12 },  // 12% chance
    { points: 50, probability: 10 },  // 10% chance
    { points: 60, probability: 8 },   // 8% chance
    { points: 70, probability: 6 },   // 6% chance
    { points: 80, probability: 4 }    // 4% chance
];

// Define colors for wedges
const WEDGE_COLORS = [
    '#e74c3c', '#3498db', '#2ecc71', '#f39c12',
    '#9b59b6', '#1abc9c', '#d35400', '#34495e'
];

// Spin duration settings (in milliseconds)
const MIN_SPIN_TIME = 6000; // 6 seconds
const MAX_SPIN_TIME = 10000; // 10 seconds

// Number of full rotations before stopping
const FULL_ROTATIONS = 8;

// =============================================
// END OF CUSTOMIZATION SECTION
// =============================================

const wheel = document.getElementById('wheel');
const spinButton = document.getElementById('spin-button');
const resultDisplay = document.getElementById('result');

let isSpinning = false;
let animationId = null;

// Normalize probabilities to sum to 100
function normalizeProbabilities() {
    let total = WEDGE_CONFIG.reduce((sum, wedge) => sum + wedge.probability, 0);
    WEDGE_CONFIG.forEach(wedge => {
        wedge.normalizedProbability = wedge.probability / total;
    });
}

// Create wedges with equal size using clip-path
function createWedges() {
    wheel.innerHTML = '';
    const wedgeCount = WEDGE_CONFIG.length;
    const wedgeAngle = 360 / wedgeCount;
    
    for (let i = 0; i < wedgeCount; i++) {
        const wedge = document.createElement('div');
        wedge.className = 'wedge';
        
        // Calculate clip-path for equal wedges
        const startAngle = i * wedgeAngle;
        const endAngle = (i + 1) * wedgeAngle;
        
        // Convert angles to radians
        const startRad = (startAngle - 90) * Math.PI / 180;
        const endRad = (endAngle - 90) * Math.PI / 180;
        
        // Calculate points for clip-path (triangle from center to two points on circumference)
        const x1 = 50 + 50 * Math.cos(startRad);
        const y1 = 50 + 50 * Math.sin(startRad);
        const x2 = 50 + 50 * Math.cos(endRad);
        const y2 = 50 + 50 * Math.sin(endRad);
        
        wedge.style.clipPath = `polygon(50% 50%, ${x1}% ${y1}%, ${x2}% ${y2}%)`;
        
        // Assign color
        wedge.style.backgroundColor = WEDGE_COLORS[i];
        
        // Create content for wedge
        const wedgeContent = document.createElement('div');
        wedgeContent.className = 'wedge-content';
        
        // Position text in the middle of the wedge
        const textAngle = (startAngle + endAngle) / 2;
        const textRad = (textAngle - 90) * Math.PI / 180;
        const textX = 50 + 30 * Math.cos(textRad);
        const textY = 50 + 30 * Math.sin(textRad);
        
        wedgeContent.style.left = `${textX - 25}%`;
        wedgeContent.style.top = `${textY - 10}%`;
        wedgeContent.style.transform = `rotate(${textAngle}deg)`;
        
        const pointsElement = document.createElement('div');
        pointsElement.className = 'wedge-points';
        pointsElement.textContent = `${WEDGE_CONFIG[i].points}`;
        
        wedgeContent.appendChild(pointsElement);
        wedge.appendChild(wedgeContent);
        wheel.appendChild(wedge);
    }
}

// Get a weighted random result based on probabilities
function getWeightedRandomResult() {
    const random = Math.random();
    let cumulativeProbability = 0;
    
    for (let i = 0; i < WEDGE_CONFIG.length; i++) {
        cumulativeProbability += WEDGE_CONFIG[i].normalizedProbability;
        if (random <= cumulativeProbability) {
            return i;
        }
    }
    
    // Fallback - should rarely happen
    return Math.floor(Math.random() * WEDGE_CONFIG.length);
}

// Smooth spinning animation using requestAnimationFrame
function spinWheel() {
    if (isSpinning) return;
    
    isSpinning = true;
    spinButton.disabled = true;
    resultDisplay.textContent = '';
    
    // Get a weighted random result
    const resultIndex = getWeightedRandomResult();
    
    // Calculate the final rotation angle
    const wedgeCount = WEDGE_CONFIG.length;
    const wedgeAngle = 360 / wedgeCount;
    
    // We want the target wedge to end up at the pointer (top position)
    // The pointer is at 0 degrees, so we need to calculate the rotation
    // that brings the target wedge to the pointer
    const targetWedgeCenter = resultIndex * wedgeAngle + wedgeAngle/2;
    const finalRotation = 360 * FULL_ROTATIONS + (360 - targetWedgeCenter);
    
    // Get current rotation
    const computedStyle = window.getComputedStyle(wheel);
    const matrix = computedStyle.transform;
    let startRotation = 0;
    
    if (matrix !== 'none') {
        const values = matrix.split('(')[1].split(')')[0].split(',');
        const a = values[0];
        const b = values[1];
        startRotation = Math.round(Math.atan2(b, a) * (180/Math.PI));
    }
    
    // Animation parameters
    const startTime = Date.now();
    const duration = MIN_SPIN_TIME + Math.random() * (MAX_SPIN_TIME - MIN_SPIN_TIME);
    
    // Easing function for smooth deceleration
    function easeOut(t) {
        return 1 - Math.pow(1 - t, 4); // More gradual slowdown
    }
    
    function animate() {
        const now = Date.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Apply easing for smooth deceleration
        const easedProgress = easeOut(progress);
        
        // Calculate current rotation
        const currentRotation = startRotation + (finalRotation - startRotation) * easedProgress;
        wheel.style.transform = `rotate(${currentRotation}deg)`;
        
        if (progress < 1) {
            animationId = requestAnimationFrame(animate);
        } else {
            // Animation complete
            resultDisplay.textContent = 
                `You won: ${WEDGE_CONFIG[resultIndex].points} points!`;
            isSpinning = false;
            spinButton.disabled = false;
            animationId = null;
        }
    }
    
    // Start the animation
    animationId = requestAnimationFrame(animate);
}

// Initialize the wheel
normalizeProbabilities();
createWedges();

// Add event listener to spin button
spinButton.addEventListener('click', spinWheel);
});
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
    let currentRotation = 0;
    
    // Normalize probabilities to sum to 100
    function normalizeProbabilities() {
        let total = WEDGE_CONFIG.reduce((sum, wedge) => sum + wedge.probability, 0);
        WEDGE_CONFIG.forEach(wedge => {
            wedge.normalizedProbability = wedge.probability / total;
        });
    }
    
    // Create wedges with SVG for perfect equal sizes
    function createWedges() {
        wheel.innerHTML = '';
        const wedgeCount = WEDGE_CONFIG.length;
        const wedgeAngle = 360 / wedgeCount;
        const radius = 150;
        const centerX = 175;
        const centerY = 175;
        
        for (let i = 0; i < wedgeCount; i++) {
            // Calculate start and end angles in radians
            const startAngle = (i * wedgeAngle) * Math.PI / 180;
            const endAngle = ((i + 1) * wedgeAngle) * Math.PI / 180;
            
            // Calculate points for the wedge path
            const x1 = centerX + radius * Math.sin(startAngle);
            const y1 = centerY - radius * Math.cos(startAngle);
            const x2 = centerX + radius * Math.sin(endAngle);
            const y2 = centerY - radius * Math.cos(endAngle);
            
            // Create large arc flag (1 for angles > 180, 0 otherwise)
            const largeArcFlag = wedgeAngle > 180 ? 1 : 0;
            
            // Create the path for the wedge
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            const d = `M ${centerX},${centerY} L ${x1},${y1} A ${radius},${radius} 0 ${largeArcFlag},1 ${x2},${y2} Z`;
            path.setAttribute("d", d);
            path.setAttribute("fill", WEDGE_COLORS[i]);
            path.setAttribute("class", "wedge");
            wheel.appendChild(path);
            
            // Calculate position for text (middle of the wedge)
            const textAngle = (i * wedgeAngle + wedgeAngle / 2) * Math.PI / 180;
            const textRadius = radius * 0.7;
            const textX = centerX + textRadius * Math.sin(textAngle);
            const textY = centerY - textRadius * Math.cos(textAngle);
            
            // Create text element
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", textX);
            text.setAttribute("y", textY);
            text.setAttribute("class", "wedge-text");
            text.textContent = WEDGE_CONFIG[i].points;
            wheel.appendChild(text);
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
    
    // Get the current rotation of the wheel
    function getCurrentRotation() {
        const computedStyle = window.getComputedStyle(wheel);
        const matrix = computedStyle.transform;
        
        if (matrix === 'none') return 0;
        
        const values = matrix.split('(')[1].split(')')[0].split(',');
        const a = values[0];
        const b = values[1];
        let angle = Math.round(Math.atan2(b, a) * (180/Math.PI));
        
        // Normalize angle to 0-360 range
        return (angle < 0) ? angle + 360 : angle;
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
        
        // Get current rotation and normalize it
        currentRotation = getCurrentRotation() % 360;
        
        // Calculate how much we need to rotate to reach the target
        // We want to spin multiple full rotations plus the remaining angle to the target
        const remainingToTarget = (360 - targetWedgeCenter) - currentRotation;
        const finalRotation = currentRotation + 360 * FULL_ROTATIONS + remainingToTarget;
        
        // Animation parameters
        const startTime = Date.now();
        const duration = MIN_SPIN_TIME + Math.random() * (MAX_SPIN_TIME - MIN_SPIN_TIME);
        const startRotation = currentRotation;
        
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
            const rotation = startRotation + (finalRotation - startRotation) * easedProgress;
            wheel.style.transform = `rotate(${rotation}deg)`;
            
            if (progress < 1) {
                animationId = requestAnimationFrame(animate);
            } else {
                // Animation complete
                resultDisplay.textContent = 
                    `You won: ${WEDGE_CONFIG[resultIndex].points} points!`;
                isSpinning = false;
                spinButton.disabled = false;
                animationId = null;
                
                // Update current rotation for the next spin
                currentRotation = finalRotation % 360;
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
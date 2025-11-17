document.addEventListener('DOMContentLoaded', function() {
    const WEDGE_CONFIG = [
        { points: 10, probability: 15 },
        { points: 30, probability: 6 },
        { points: 10, probability: 15 },
        { points: 20, probability: 8 },
        { points: 40, probability: 4 },
        { points: 10, probability: 15 },
        { points: 30, probability: 6 },
        { points: 20, probability: 8 },
        { points: 10, probability: 15 },
        { points: 20, probability: 8 },
    ];

    const WEDGE_COLORS = [
        '#adadad', '#4dfa81', '#adadad', '#6288e3', '#ff9c2b',
        '#adadad', '#4dfa81', '#6288e3', '#adadad', '#6288e3'
    ];

    // Spin duration settings (in milliseconds)
    const MIN_SPIN_TIME = 5000;
    const MAX_SPIN_TIME = 10000;
    
    const FULL_ROTATIONS = 10;  // Number of full rotations before stopping


    const wheel = document.getElementById('wheel-1');
    const spinButton = document.getElementById('spin-button-1');
    const resultDisplay = document.getElementById('result-1');

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
            const textX = 50 + 40 * Math.cos(textRad);
            const textY = 50 + 40 * Math.sin(textRad);

            wedgeContent.style.left = `${textX}%`;
            wedgeContent.style.top = `${textY}%`;
            wedgeContent.style.transform = `translate(-50%, -50%) rotate(${textAngle}deg)`;


            
            
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



document.addEventListener('DOMContentLoaded', function() {
    const WEDGE_CONFIG = [
        { points: 30, probability: 15 },
        { points: 40, probability: 6 },
        { points: 30, probability: 15 },
        { points: 20, probability: 8 },
        { points: 80, probability: 4 },
        { points: 30, probability: 15 },
        { points: 40, probability: 6 },
        { points: 20, probability: 8 },
        { points: 30, probability: 15 },
        { points: 20, probability: 8 },
    ];

    const WEDGE_COLORS = [
        '#4dfa81', '#ff9c2b', '#4dfa81', '#6288e3', '#ab1da8',
        '#4dfa81', '#ff9c2b', '#6288e3', '#4dfa81', '#6288e3'
    ];

    // Spin duration settings (in milliseconds)
    const MIN_SPIN_TIME = 5000;
    const MAX_SPIN_TIME = 10000;
    
    const FULL_ROTATIONS = 10;  // Number of full rotations before stopping


    const wheel = document.getElementById('wheel-2');
    const spinButton = document.getElementById('spin-button-2');
    const resultDisplay = document.getElementById('result-2');

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
            const textX = 50 + 40 * Math.cos(textRad);
            const textY = 50 + 40 * Math.sin(textRad);

            wedgeContent.style.left = `${textX}%`;
            wedgeContent.style.top = `${textY}%`;
            wedgeContent.style.transform = `translate(-50%, -50%) rotate(${textAngle}deg)`;


            
            
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

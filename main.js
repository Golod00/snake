class SnakeGame {
    constructor(mode) {
        const screenWidth = Math.min(window.innerWidth, 400);
        const screenHeight = screenWidth; // Keeping it square

        this.app = new PIXI.Application({
            width: screenWidth,
            height: screenHeight,
            backgroundColor: 0x000000,
        });
        document.getElementById('game').appendChild(this.app.view);

        this.gridSize = 20; // Fixed grid size of 20x20
        this.cellSize = screenWidth / this.gridSize; // Cell size based on screen size
        this.snake = [{ x: Math.floor(this.gridSize / 2), y: Math.floor(this.gridSize / 2) }];
        this.direction = 'right';
        this.food = [];
        this.walls = [];
        this.score = 0;
        this.bestScore = this.loadBestScore(); // Load the best score from localStorage
        this.isGameOver = false;
        this.mode = mode;
        this.speed = 200;

        this.snakeGraphics = new PIXI.Graphics();
        this.foodGraphics = new PIXI.Graphics();
        this.wallGraphics = new PIXI.Graphics();
        this.app.stage.addChild(this.snakeGraphics);
        this.app.stage.addChild(this.foodGraphics);
        if (this.mode === 'walls') this.app.stage.addChild(this.wallGraphics);

        this.setupKeyListeners();
        this.setupGameMode();
        this.startGameLoop();
        this.updateBestScoreDisplay();
    }

    setupKeyListeners() {
        window.addEventListener('keydown', (event) => {
            const key = event.code;
            if (key === 'ArrowUp' && this.direction !== 'down') this.direction = 'up';
            else if (key === 'ArrowDown' && this.direction !== 'up') this.direction = 'down';
            else if (key === 'ArrowLeft' && this.direction !== 'right') this.direction = 'left';
            else if (key === 'ArrowRight' && this.direction !== 'left') this.direction = 'right';
        });
    }

    setupGameMode() {
        if (this.mode === 'portal') {
            this.addFood();
            this.addFood(); // Add second food
        } else if (this.mode === 'walls') {
            this.addFood();
            this.addWall();
        } else {
            this.food = [this.generateFood()];
        }
    }

    generateFood(occupiedPositions = []) {
        let food;
        do {
            food = {
                x: Math.floor(Math.random() * this.gridSize),
                y: Math.floor(Math.random() * this.gridSize)
            };
        } while (occupiedPositions.some(pos => pos.x === food.x && pos.y === food.y));
        return food;
    }

    addFood() {
        const occupiedPositions = [...this.snake, ...this.walls];
        this.food.push(this.generateFood(occupiedPositions));
    }

    addWall() {
        const occupiedPositions = [...this.snake, ...this.walls];
        this.walls.push(this.generateFood(occupiedPositions));
    }

    drawSnake() {
        this.snakeGraphics.clear();
        this.snake.forEach((segment) => {
            this.snakeGraphics.beginFill(0x00ff00);
            this.snakeGraphics.drawRect(segment.x * this.cellSize, segment.y * this.cellSize, this.cellSize, this.cellSize);
            this.snakeGraphics.endFill();
        });
    }

    drawFood() {
        this.foodGraphics.clear();
        this.food.forEach((foodItem) => {
            this.foodGraphics.beginFill(0xff0000);
            this.foodGraphics.drawRect(foodItem.x * this.cellSize, foodItem.y * this.cellSize, this.cellSize, this.cellSize);
            this.foodGraphics.endFill();
        });
    }

    drawWalls() {
        this.wallGraphics.clear();
        this.walls.forEach((wallItem) => {
            this.wallGraphics.beginFill(0x555555);
            this.wallGraphics.drawRect(wallItem.x * this.cellSize, wallItem.y * this.cellSize, this.cellSize, this.cellSize);
            this.wallGraphics.endFill();
        });
    }

    updateSnakePosition() {
        const head = { ...this.snake[0] };

        switch (this.direction) {
            case 'up': head.y -= 1; break;
            case 'down': head.y += 1; break;
            case 'left': head.x -= 1; break;
            case 'right': head.x += 1; break;
        }

        // Check for collision with walls or boundaries
        if (head.x < 0 || head.x >= this.gridSize || head.y < 0 || head.y >= this.gridSize) {
            if (this.mode === 'no-die') {
                head.x = (head.x + this.gridSize) % this.gridSize;
                head.y = (head.y + this.gridSize) % this.gridSize;
            } else {
                this.endGame();
                return;
            }
        }

        if (this.walls.some(wall => wall.x === head.x && wall.y === head.y)) {
            this.endGame();
            return;
        }

        // Check for collision with itself
        if (this.snake.slice(1).some(segment => segment.x === head.x && segment.y === head.y)) {
            this.endGame();
            return;
        }

        this.snake.unshift(head);

        // Check if the snake has eaten any food
        const foodIndex = this.food.findIndex(foodItem => foodItem.x === head.x && foodItem.y === head.y);
        if (foodIndex !== -1) {
            this.score += 10;
            document.getElementById('current-score').innerText = this.score;
            this.food.splice(foodIndex, 1); // Remove the eaten food from the array

            if (this.food.length === 0) { // If all food is eaten, add new food
                this.addFood();
            }

            if (this.mode === 'speed') {
                this.speed *= 0.9; // Increase the speed
                this.addFood(); // Add a new food item
            } else if (this.mode === 'walls') {
                this.addWall(); // Add a new wall
            } else if (this.mode === 'portal') {
                this.teleport(); // Move snake to second food
            }
        } else {
            this.snake.pop();
        }
    }

    teleport() {
        const secondFood = this.food[1];
        if (secondFood) {
            this.snake[0] = { ...secondFood };
            this.food.splice(1, 1); // Remove the second food
            this.addFood(); // Add new second food
        }
    }

    startGameLoop() {
        const gameLoop = () => {
            if (!this.isGameOver) {
                this.updateSnakePosition();
                this.drawSnake();
                this.drawFood();
                if (this.mode === 'walls') this.drawWalls();
                setTimeout(gameLoop, this.speed);
            }
        };
        gameLoop();
    }

    endGame() {
        this.isGameOver = true;

        // Clear all graphics
        this.snakeGraphics.clear();
        this.foodGraphics.clear();
        if (this.mode === 'walls') this.wallGraphics.clear();

        // Create a Game Over text
        const gameOverText = new PIXI.Text(`Game Over!\nYour score: ${this.score}`, {
            fontSize: 36,
            fill: 0xffffff,
            align: 'center',
        });
        gameOverText.anchor.set(0.5);
        gameOverText.x = this.app.screen.width / 2;
        gameOverText.y = this.app.screen.height / 2;

        this.app.stage.addChild(gameOverText);

        // Save and display the best score
        this.saveBestScore();
        this.updateBestScoreDisplay(); // Ensure best score is updated here as well
    }

    saveBestScore() {
        const currentBestScore = localStorage.getItem('bestScore') || 0;
        if (this.score > currentBestScore) {
            localStorage.setItem('bestScore', this.score);
        }
    }

    loadBestScore() {
        return localStorage.getItem('bestScore') || 0;
    }

    updateBestScoreDisplay() {
        const bestScore = localStorage.getItem('bestScore') || 0;
        document.getElementById('best-score').innerText = bestScore;
    }
}

function startGame() {
    const mode = document.querySelector('input[name="mode"]:checked').value;
    new SnakeGame(mode);
}

document.getElementById('play-btn').addEventListener('click', () => {
    document.getElementById('mode-selection').classList.add('hidden');
    document.getElementById('play-btn').classList.add('hidden');
    document.getElementById('menu-btn').classList.remove('hidden');
    document.getElementById('exit-btn').classList.remove('hidden');
    startGame();
});

document.getElementById('menu-btn').addEventListener('click', () => window.location.reload());
document.getElementById('exit-btn').addEventListener('click', () => window.location.reload());